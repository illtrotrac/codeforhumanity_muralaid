import type { DatabaseSync } from "node:sqlite";
import type { Mural } from "@/lib/types";
import { SEED_MURALS } from "./seed-murals";
import { transaction } from "./transaction";

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

// Add any seed mural whose slug isn't in the database yet. Murals that
// already exist are left alone, so pledges and edits survive restarts.
export function seedMissingMurals(db: DatabaseSync) {
  const existing = new Set(
    (db.prepare("SELECT slug FROM murals").all() as Array<{ slug: string }>).map((r) => r.slug),
  );
  const missing = SEED_MURALS.filter((m) => !existing.has(m.slug));
  if (missing.length === 0) return;

  transaction(db, () => {
    for (const mural of missing) insertMural(db, mural);
  });
}

// Demo helper: put one mural back exactly as it was seeded.
export function reseedMural(db: DatabaseSync, slug: string): boolean {
  const seed = SEED_MURALS.find((m) => m.slug === slug);
  if (!seed) return false;
  transaction(db, () => {
    // ON DELETE CASCADE removes its tiles and pledges too.
    db.prepare("DELETE FROM murals WHERE slug = ?").run(slug);
    insertMural(db, seed);
  });
  return true;
}
