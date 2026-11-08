import type { Mural, MuralSummary, MuralTile, Need } from "@/lib/types";
import { getDb } from "./db";
import { reseedMural } from "./seed";
import { transaction } from "./transaction";

// The repository: the only place that writes SQL for murals. Everything
// else asks it for plain Mural objects and never sees a database row.

// What a row looks like as it comes out of SQLite (snake_case, 0/1 booleans).
type MuralRow = {
  id: number;
  slug: string;
  page_order: number;
  title: string;
  location: string;
  image_src: string;
  image_alt: string;
  grid_size: number;
  is_ai_sample: number;
  finale_tile: number;
};

type TileRow = {
  tile_number: number;
  status: "locked" | "restored";
  need_title: string;
  need_detail: string;
  need_amount: number;
  posted_by: string;
};

const TILE_COLUMNS = "tile_number, status, need_title, need_detail, need_amount, posted_by";

function toTile(row: TileRow, gridSize: number): MuralTile {
  const index = row.tile_number - 1;
  return {
    id: row.tile_number,
    row: Math.floor(index / gridSize),
    col: index % gridSize,
    status: row.status,
    need: {
      title: row.need_title,
      detail: row.need_detail,
      amount: row.need_amount,
      postedBy: row.posted_by,
    },
  };
}

function findMural(slug: string) {
  // "?" placeholders: SQLite inserts the value safely, so a slug like
  // "x'; DROP TABLE murals; --" is just a string that matches nothing.
  return getDb().prepare("SELECT * FROM murals WHERE slug = ?").get(slug) as MuralRow | undefined;
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
      `SELECT m.slug, m.page_order, m.title, m.location, m.image_src,
              COUNT(t.tile_number)                    AS total_tiles,
              COALESCE(SUM(t.status = 'restored'), 0) AS restored_tiles
         FROM murals m
         LEFT JOIN tiles t ON t.mural_id = m.id
        GROUP BY m.id
        ORDER BY m.page_order`,
    )
    .all() as Array<
    Pick<MuralRow, "slug" | "page_order" | "title" | "location" | "image_src"> & {
      total_tiles: number;
      restored_tiles: number;
    }
  >;

  return rows.map((r) => ({
    slug: r.slug,
    pageOrder: r.page_order,
    title: r.title,
    location: r.location,
    imageSrc: r.image_src,
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
    gridSize: mural.grid_size,
    isAiSample: mural.is_ai_sample === 1,
    finaleTileId: mural.finale_tile,
    tiles: tiles.map((row) => toTile(row, mural.grid_size)),
  };
}

// ---------- Writes ----------

// Writes return a result object instead of throwing for expected problems,
// so the API route can turn each one into the right HTTP status.
type WriteFailure = { ok: false; reason: "not_found" | "already_funded" };

export type PledgeResult = { ok: true; tile: MuralTile; completed: boolean } | WriteFailure;

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
    db.prepare("INSERT INTO pledges (mural_id, tile_number, amount) VALUES (?, ?, ?)").run(
      mural.id,
      tileNumber,
      tile.need_amount,
    );

    const { locked } = db
      .prepare("SELECT COUNT(*) AS locked FROM tiles WHERE mural_id = ? AND status = 'locked'")
      .get(mural.id) as { locked: number };

    return { ok: true, tile: toTile(tile, mural.grid_size), completed: locked === 0 };
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
        `UPDATE tiles SET need_title = ?, need_detail = ?, need_amount = ?, posted_by = ?
          WHERE mural_id = ? AND tile_number = ? AND status = 'locked'`,
      )
      .run(need.title, need.detail, need.amount, need.postedBy, mural.id, tileNumber);

    const tile = findTile(mural.id, tileNumber);
    if (!tile) return { ok: false, reason: "not_found" };
    if (changes === 0) return { ok: false, reason: "already_funded" };
    return { ok: true, tile: toTile(tile, mural.grid_size) };
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
