import type {
  Mural,
  MuralSummary,
  MuralTile,
  Need,
  Organisation,
  PledgeActivity,
} from "@/lib/types";
import { getDb } from "./db";
import { reseedMural } from "./seed";
import { transaction } from "./transaction";

// The repository: the only place that writes SQL for murals. Everything
// else asks it for plain Mural objects and never sees a database row.

// What a row looks like as it comes out of SQLite (snake_case, 0/1 booleans).
// Mural rows are always read joined with their organisation (org_* columns).
type MuralRow = {
  id: number;
  slug: string;
  page_order: number;
  title: string;
  location: string;
  image_src: string;
  image_alt: string;
  grid_cols: number;
  grid_rows: number;
  is_ai_sample: number;
  finale_tile: number;
  org_slug: string;
  org_name: string;
  org_sector: string;
  org_tagline: string;
  org_is_verified: number;
};

type TileRow = {
  tile_number: number;
  status: "locked" | "restored";
  need_title: string;
  need_detail: string;
  need_amount: number;
};

const TILE_COLUMNS = "tile_number, status, need_title, need_detail, need_amount";

// Every mural query starts from this, so organisation details always come along.
const MURAL_SELECT = `
  SELECT m.*,
         o.slug AS org_slug, o.name AS org_name, o.sector AS org_sector,
         o.tagline AS org_tagline, o.is_verified AS org_is_verified
    FROM murals m
    JOIN organisations o ON o.id = m.organisation_id`;

function toOrganisation(row: MuralRow): Organisation {
  return {
    slug: row.org_slug,
    name: row.org_name,
    sector: row.org_sector,
    tagline: row.org_tagline,
    isVerified: row.org_is_verified === 1,
  };
}

function toTile(row: TileRow, gridCols: number): MuralTile {
  const index = row.tile_number - 1;
  return {
    id: row.tile_number,
    row: Math.floor(index / gridCols),
    col: index % gridCols,
    status: row.status,
    need: { title: row.need_title, detail: row.need_detail, amount: row.need_amount },
  };
}

// SQLite's datetime('now') gives "2026-11-08 10:15:00" in UTC, with no zone
// marker. Turn it into a proper ISO timestamp so browsers read it as UTC.
function toIsoUtc(sqliteTime: string): string {
  return `${sqliteTime.replace(" ", "T")}Z`;
}

function findMural(slug: string) {
  // "?" placeholders: SQLite inserts the value safely, so a slug like
  // "x'; DROP TABLE murals; --" is just a string that matches nothing.
  return getDb().prepare(`${MURAL_SELECT} WHERE m.slug = ?`).get(slug) as MuralRow | undefined;
}

function findTile(muralId: number, tileNumber: number) {
  return getDb()
    .prepare(`SELECT ${TILE_COLUMNS} FROM tiles WHERE mural_id = ? AND tile_number = ?`)
    .get(muralId, tileNumber) as TileRow | undefined;
}

// ---------- Reads ----------

export function listMurals(): MuralSummary[] {
  // One query that counts tiles per mural, instead of loading every tile.
  const rows = getDb()
    .prepare(
      `SELECT base.*,
              (SELECT COUNT(*) FROM tiles t WHERE t.mural_id = base.id) AS total_tiles,
              (SELECT COUNT(*) FROM tiles t
                WHERE t.mural_id = base.id AND t.status = 'restored')    AS restored_tiles
         FROM (${MURAL_SELECT}) AS base
        ORDER BY base.page_order`,
    )
    .all() as Array<MuralRow & { total_tiles: number; restored_tiles: number }>;

  return rows.map((r) => ({
    slug: r.slug,
    pageOrder: r.page_order,
    title: r.title,
    location: r.location,
    imageSrc: r.image_src,
    organisation: toOrganisation(r),
    totalTiles: r.total_tiles,
    restoredTiles: r.restored_tiles,
  }));
}

export function getMural(slug: string): Mural | null {
  const mural = findMural(slug);
  if (!mural) return null;

  const tiles = getDb()
    .prepare(`SELECT ${TILE_COLUMNS} FROM tiles WHERE mural_id = ? ORDER BY tile_number`)
    .all(mural.id) as TileRow[];

  return {
    slug: mural.slug,
    pageOrder: mural.page_order,
    title: mural.title,
    location: mural.location,
    imageSrc: mural.image_src,
    imageAlt: mural.image_alt,
    gridCols: mural.grid_cols,
    gridRows: mural.grid_rows,
    isAiSample: mural.is_ai_sample === 1,
    finaleTileId: mural.finale_tile,
    organisation: toOrganisation(mural),
    tiles: tiles.map((row) => toTile(row, mural.grid_cols)),
  };
}

// The newest pledges on a mural, for the "recent kindness" ticker.
export function recentPledges(slug: string, limit = 5): PledgeActivity[] {
  const rows = getDb()
    .prepare(
      `SELECT p.tile_number, p.amount, p.created_at, t.need_title
         FROM pledges p
         JOIN murals m ON m.id = p.mural_id
         JOIN tiles t  ON t.mural_id = p.mural_id AND t.tile_number = p.tile_number
        WHERE m.slug = ?
        ORDER BY p.id DESC
        LIMIT ?`,
    )
    .all(slug, limit) as Array<{
    tile_number: number;
    amount: number;
    created_at: string;
    need_title: string;
  }>;

  return rows.map((r) => ({
    tileId: r.tile_number,
    title: r.need_title,
    amount: r.amount,
    at: toIsoUtc(r.created_at),
  }));
}

// ---------- Writes ----------

// Writes return a result object instead of throwing for expected problems,
// so the API route can turn each one into the right HTTP status.
type WriteFailure = { ok: false; reason: "not_found" | "already_funded" };

export type PledgeResult =
  | { ok: true; tile: MuralTile; completed: boolean; pledge: PledgeActivity }
  | WriteFailure;

export function pledgeTile(slug: string, tileNumber: number): PledgeResult {
  const db = getDb();
  return transaction(db, () => {
    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };

    // Compare-and-set: only flip the tile if it is STILL locked. If two
    // donors click at once, exactly one UPDATE changes a row; the other
    // sees changes === 0 and is told the tile was already funded.
    const { changes } = db
      .prepare(
        `UPDATE tiles SET status = 'restored'
          WHERE mural_id = ? AND tile_number = ? AND status = 'locked'`,
      )
      .run(mural.id, tileNumber);

    if (changes === 0) {
      return findTile(mural.id, tileNumber)
        ? { ok: false, reason: "already_funded" }
        : { ok: false, reason: "not_found" };
    }

    const tile = findTile(mural.id, tileNumber)!;
    // RETURNING hands back the row we just inserted, including its timestamp.
    const { created_at } = db
      .prepare(
        "INSERT INTO pledges (mural_id, tile_number, amount) VALUES (?, ?, ?) RETURNING created_at",
      )
      .get(mural.id, tileNumber, tile.need_amount) as { created_at: string };

    const { locked } = db
      .prepare("SELECT COUNT(*) AS locked FROM tiles WHERE mural_id = ? AND status = 'locked'")
      .get(mural.id) as { locked: number };

    return {
      ok: true,
      tile: toTile(tile, mural.grid_cols),
      completed: locked === 0,
      pledge: {
        tileId: tileNumber,
        title: tile.need_title,
        amount: tile.need_amount,
        at: toIsoUtc(created_at),
      },
    };
  });
}

export type UpdateNeedResult = { ok: true; tile: MuralTile } | WriteFailure;

export function updateNeed(slug: string, tileNumber: number, need: Need): UpdateNeedResult {
  const db = getDb();
  return transaction(db, () => {
    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };

    // A funded tile's need is history: someone paid for exactly that.
    const { changes } = db
      .prepare(
        `UPDATE tiles SET need_title = ?, need_detail = ?, need_amount = ?
          WHERE mural_id = ? AND tile_number = ? AND status = 'locked'`,
      )
      .run(need.title, need.detail, need.amount, mural.id, tileNumber);

    const tile = findTile(mural.id, tileNumber);
    if (!tile) return { ok: false, reason: "not_found" };
    if (changes === 0) return { ok: false, reason: "already_funded" };
    return { ok: true, tile: toTile(tile, mural.grid_cols) };
  });
}

// ---------- Demo controls ----------

export function resetMural(slug: string): Mural | null {
  return reseedMural(getDb(), slug) ? getMural(slug) : null;
}

// Restore every tile except the finale, so one live pledge completes it.
export function skipToFinale(slug: string): Mural | null {
  const db = getDb();
  const mural = findMural(slug);
  if (!mural) return null;

  transaction(db, () => {
    db.prepare(
      `UPDATE tiles
          SET status = CASE WHEN tile_number = ? THEN 'locked' ELSE 'restored' END
        WHERE mural_id = ?`,
    ).run(mural.finale_tile, mural.id);
    // If the finale was pledged before, clear that pledge, or the next one
    // would break the "one pledge per tile" rule.
    db.prepare("DELETE FROM pledges WHERE mural_id = ? AND tile_number = ?").run(
      mural.id,
      mural.finale_tile,
    );
  });
  return getMural(slug);
}
