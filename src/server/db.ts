import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedIfEmpty } from "./seed";
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
  seedIfEmpty(db);
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
