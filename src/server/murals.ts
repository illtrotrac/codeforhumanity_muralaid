import type { Mural, MuralTile } from "@/data/sample-mural";
import { getDb } from "./db";

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

// A storybook page needs the cover details and progress, not all 64 tiles.
export type MuralSummary = {
  slug: string;
  pageOrder: number;
  title: string;
  location: string;
  imageSrc: string;
  totalTiles: number;
  restoredTiles: number;
};

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

export function listMurals(): MuralSummary[] {
  // One query that counts tiles per mural, instead of loading every tile.
  const rows = getDb()
    .prepare(
      `SELECT m.slug, m.page_order, m.title, m.location, m.image_src,
              COUNT(t.tile_number)                              AS total_tiles,
              COALESCE(SUM(t.status = 'restored'), 0)           AS restored_tiles
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
  const db = getDb();
  // "?" placeholders: SQLite inserts the value safely, so a slug like
  // "x'; DROP TABLE murals; --" is just a string that matches nothing.
  const mural = db.prepare("SELECT * FROM murals WHERE slug = ?").get(slug) as MuralRow | undefined;
  if (!mural) return null;

  const tiles = db
    .prepare(
      `SELECT tile_number, status, need_title, need_detail, need_amount, posted_by
         FROM tiles WHERE mural_id = ? ORDER BY tile_number`,
    )
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
