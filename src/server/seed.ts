import type { DatabaseSync } from "node:sqlite";
import { sampleMural, type Mural } from "@/data/sample-mural";
import { transaction } from "./transaction";

// The murals a fresh database starts with. One per storybook page.
export const SEED_MURALS: Mural[] = [sampleMural];

// Insert one mural and all its tiles. Call it inside a transaction.
export function insertMural(db: DatabaseSync, mural: Mural) {
  const { lastInsertRowid: muralId } = db
    .prepare(
      `INSERT INTO murals (slug, page_order, title, location, image_src, image_alt, grid_size, is_ai_sample, finale_tile)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      mural.slug,
      mural.pageOrder,
      mural.title,
      mural.location,
      mural.imageSrc,
      mural.imageAlt,
      mural.gridSize,
      mural.isAiSample ? 1 : 0,
      mural.finaleTileId,
    );

  // Prepare once, run 64 times: faster than building the SQL for each tile.
  const insertTile = db.prepare(
    `INSERT INTO tiles (mural_id, tile_number, status, need_title, need_detail, need_amount, posted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const tile of mural.tiles) {
    insertTile.run(
      muralId,
      tile.id,
      tile.status,
      tile.need.title,
      tile.need.detail,
      tile.need.amount,
      tile.need.postedBy,
    );
  }
}

export function seedIfEmpty(db: DatabaseSync) {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM murals").get() as { count: number };
  if (count > 0) return;

  transaction(db, () => {
    for (const mural of SEED_MURALS) insertMural(db, mural);
  });
}
