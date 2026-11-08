import type { DatabaseSync } from "node:sqlite";
import { hashPasswordSync } from "./passwords";
import { SEED_MURALS, SEED_ORGANISATIONS, type SeedMuralWithOrg } from "./seed-murals";
import { transaction } from "./transaction";

// The demo presenter, who can manage every mural.
export const PRESENTER_EMAIL = "presenter@muralaid.test";

// admin@<organisation-slug>.test (".test" is reserved, so these can never be real addresses)
export function organisationAdminEmail(organisationSlug: string) {
  return `admin@${organisationSlug}.test`;
}

function organisationId(db: DatabaseSync, slug: string): number {
  const row = db.prepare("SELECT id FROM organisations WHERE slug = ?").get(slug) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`Organisation ${slug} is missing; seed organisations first.`);
  return row.id;
}

// Insert one mural and all its tiles. Call it inside a transaction.
export function insertMural(db: DatabaseSync, mural: SeedMuralWithOrg) {
  const { lastInsertRowid: muralId } = db
    .prepare(
      `INSERT INTO murals (slug, page_order, title, location, image_src, image_alt,
                           grid_cols, grid_rows, is_ai_sample, finale_tile, organisation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      mural.slug,
      mural.pageOrder,
      mural.title,
      mural.location,
      mural.imageSrc,
      mural.imageAlt,
      mural.gridCols,
      mural.gridRows,
      mural.isAiSample ? 1 : 0,
      mural.finaleTileId,
      organisationId(db, mural.organisationSlug),
    );

  // Prepare once, run 64 times: faster than building the SQL for each tile.
  const insertTile = db.prepare(
    `INSERT INTO tiles (mural_id, tile_number, status, need_title, need_detail, need_amount)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const tile of mural.tiles) {
    insertTile.run(muralId, tile.id, tile.status, tile.need.title, tile.need.detail, tile.need.amount);
  }
}

// Make the database match the seed data without losing anyone's work:
//  - organisations are inserted, or updated if their details changed
//  - murals that existed before organisations get linked to theirs
//  - murals whose slug isn't in the database yet are added
export function seedDatabase(db: DatabaseSync) {
  transaction(db, () => {
    const upsertOrg = db.prepare(
      `INSERT INTO organisations (slug, name, sector, tagline, is_verified)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (slug) DO UPDATE SET
         name = excluded.name, sector = excluded.sector,
         tagline = excluded.tagline, is_verified = excluded.is_verified`,
    );
    for (const org of SEED_ORGANISATIONS) {
      upsertOrg.run(org.slug, org.name, org.sector, org.tagline, org.isVerified ? 1 : 0);
    }

    const existing = new Set(
      (db.prepare("SELECT slug FROM murals").all() as Array<{ slug: string }>).map((r) => r.slug),
    );
    const link = db.prepare(
      "UPDATE murals SET organisation_id = ? WHERE slug = ? AND organisation_id IS NULL",
    );
    for (const mural of SEED_MURALS) {
      if (existing.has(mural.slug)) link.run(organisationId(db, mural.organisationSlug), mural.slug);
      else insertMural(db, mural);
    }

    seedAdmins(db);
  });
}

// Demo accounts, only if a password was provided in .env.local. Existing
// accounts are left alone (INSERT OR IGNORE), so their passwords don't change.
function seedAdmins(db: DatabaseSync) {
  const password = process.env.MURALAID_ADMIN_PASSWORD;
  if (!password) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO admins (email, password_hash, role, organisation_id) VALUES (?, ?, ?, ?)`,
  );
  insert.run(PRESENTER_EMAIL, hashPasswordSync(password), "platform", null);
  for (const org of SEED_ORGANISATIONS) {
    insert.run(organisationAdminEmail(org.slug), hashPasswordSync(password), "organisation", organisationId(db, org.slug));
  }
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
