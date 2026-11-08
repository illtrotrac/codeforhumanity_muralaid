import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed";
import { transaction } from "./transaction";

// One SQLite file on disk is our whole database. It lives in /data, which
// is git-ignored: it's local state, not source code.
const DB_PATH =
  process.env.MURALAID_DB_PATH ?? path.join(process.cwd(), "data", "muralaid.db");

// Migrations: each entry upgrades the schema by one version. SQLite stores
// the current version number in "PRAGMA user_version". Never edit an entry
// that has already run; add a new one to the end instead.
const MIGRATIONS = [
  /* v1: murals, their tiles, and a log of every pledge */ `
  CREATE TABLE murals (
    id           INTEGER PRIMARY KEY,
    slug         TEXT    NOT NULL UNIQUE,
    page_order   INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    location     TEXT    NOT NULL,
    image_src    TEXT    NOT NULL,
    image_alt    TEXT    NOT NULL,
    grid_size    INTEGER NOT NULL CHECK (grid_size BETWEEN 2 AND 12),
    is_ai_sample INTEGER NOT NULL DEFAULT 0,
    finale_tile  INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE tiles (
    mural_id    INTEGER NOT NULL REFERENCES murals(id) ON DELETE CASCADE,
    tile_number INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'restored')),
    need_title  TEXT    NOT NULL,
    need_detail TEXT    NOT NULL,
    need_amount INTEGER NOT NULL CHECK (need_amount BETWEEN 1 AND 500), -- whole dollars
    posted_by   TEXT    NOT NULL,
    PRIMARY KEY (mural_id, tile_number)
  );

  -- An append-only record of who funded what. UNIQUE means a tile can only
  -- ever be funded once, even if two people click at the same moment.
  CREATE TABLE pledges (
    id          INTEGER PRIMARY KEY,
    mural_id    INTEGER NOT NULL,
    tile_number INTEGER NOT NULL,
    amount      INTEGER NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (mural_id, tile_number),
    FOREIGN KEY (mural_id, tile_number) REFERENCES tiles(mural_id, tile_number) ON DELETE CASCADE
  );
  `,

  /* v2: one organisation per mural, and non-square grids */ `
  CREATE TABLE organisations (
    id          INTEGER PRIMARY KEY,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    sector      TEXT    NOT NULL,
    tagline     TEXT    NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0
  );

  -- Existing murals get linked to their organisation by the seed step.
  ALTER TABLE murals ADD COLUMN organisation_id INTEGER REFERENCES organisations(id);

  -- grid_size (always square) becomes columns x rows. Copy the old value
  -- into both before dropping it, so existing murals keep their shape.
  ALTER TABLE murals ADD COLUMN grid_cols INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE murals ADD COLUMN grid_rows INTEGER NOT NULL DEFAULT 0;
  UPDATE murals SET grid_cols = grid_size, grid_rows = grid_size;
  ALTER TABLE murals DROP COLUMN grid_size;

  -- The requester is now the mural's organisation, not a per-tile field.
  ALTER TABLE tiles DROP COLUMN posted_by;
  `,

  /* v3: admin accounts and login sessions */ `
  CREATE TABLE admins (
    id              INTEGER PRIMARY KEY,
    email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash   TEXT    NOT NULL, -- "scrypt$<salt>$<hash>", never the password itself
    role            TEXT    NOT NULL CHECK (role IN ('organisation', 'platform')),
    -- Organisation admins manage one organisation's murals; platform admins
    -- (the demo presenter) manage all of them, so theirs is NULL.
    organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    CHECK ((role = 'platform') = (organisation_id IS NULL))
  );

  -- We store a hash of each session token, not the token itself, so a
  -- leaked database can't be used to log in as anyone.
  CREATE TABLE sessions (
    token_hash TEXT    PRIMARY KEY,
    admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT    NOT NULL
  );
  `,

  /* v4: the hand-traced finale object on each colouring page */ `
  -- JSON list of [x, y] points in tile units, e.g. [[5.7,4.6],[6.0,4.6],...].
  -- NULL means the finale tile is just an ordinary region.
  ALTER TABLE murals ADD COLUMN finale_shape TEXT;
  `,

  /* v5: an optional name and note from the donor */ `
  -- Both optional: NULL name = anonymous, NULL message = no note.
  -- The CHECKs repeat the app's limits, so bad data can't sneak in another way.
  ALTER TABLE pledges ADD COLUMN donor_name TEXT CHECK (length(donor_name) <= 40);
  ALTER TABLE pledges ADD COLUMN message    TEXT CHECK (length(message) <= 140);
  `,

  /* v6: Stripe payments */ `
  -- While someone is on Stripe's payment page, their tile is held for them,
  -- so two people can't pay for the same coat. The hold expires on its own.
  ALTER TABLE tiles ADD COLUMN reserved_until   TEXT; -- ISO time; NULL or past = free
  ALTER TABLE tiles ADD COLUMN reserved_session TEXT; -- the Stripe checkout session holding it

  -- Each Stripe payment can be recorded once only. If Stripe tells us twice
  -- (the redirect AND the webhook, or a page refresh), the second is ignored.
  ALTER TABLE pledges ADD COLUMN stripe_session_id TEXT;
  CREATE UNIQUE INDEX pledges_stripe_session ON pledges (stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;
  `,
];

function migrate(db: DatabaseSync) {
  const { user_version: current } = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  for (let version = current; version < MIGRATIONS.length; version++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

function open(): DatabaseSync {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;   -- readers don't block the writer
    PRAGMA foreign_keys = ON;    -- SQLite leaves these off unless asked
    PRAGMA busy_timeout = 5000;  -- wait up to 5s for a lock instead of failing
  `);
  migrate(db);
  seedDatabase(db);
  return db;
}

// Next's dev server re-runs modules every time you save a file. Keeping the
// connection on globalThis means we reuse one instead of opening a new one
// per save.
const globalForDb = globalThis as unknown as { muralaidDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  globalForDb.muralaidDb ??= open();
  return globalForDb.muralaidDb;
}
