import type {
  CommunityNote,
  DonorNote,
  Mural,
  MuralSummary,
  MuralTile,
  Need,
  Organisation,
  PledgeActivity,
} from "@/lib/types";
import { lineArtFor } from "@/lib/line-art";
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
  finale_shape: string | null;
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
  pledge_id: number | null; // null = nobody has pledged (yet)
  donor_name: string | null;
  message: string | null;
  delivered_at: string | null;
  delivery_note: string | null;
};

// Tiles come with their pledge, if any. LEFT JOIN keeps unfunded tiles too
// (a plain JOIN would silently drop every tile without a pledge).
const TILE_SELECT = `
  SELECT t.tile_number, t.status, t.need_title, t.need_detail, t.need_amount,
         t.delivered_at, t.delivery_note,
         p.id AS pledge_id, p.donor_name, p.message
    FROM tiles t
    LEFT JOIN pledges p ON p.mural_id = t.mural_id AND p.tile_number = t.tile_number`;

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
    note: row.pledge_id === null ? null : { donorName: row.donor_name, message: row.message },
    delivery:
      row.delivered_at && row.delivery_note ? { at: row.delivered_at, note: row.delivery_note } : null,
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
    .prepare(`${TILE_SELECT} WHERE t.mural_id = ? AND t.tile_number = ?`)
    .get(muralId, tileNumber) as TileRow | undefined;
}

// ---------- Reads ----------

// Which organisation owns a mural, for permission checks. null if no mural.
export function muralOrganisationSlug(slug: string): string | null {
  return findMural(slug)?.org_slug ?? null;
}

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
    .prepare(`${TILE_SELECT} WHERE t.mural_id = ? ORDER BY t.tile_number`)
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
    lineArtSrc: lineArtFor(mural.image_src),
    isAiSample: mural.is_ai_sample === 1,
    finaleTileId: mural.finale_tile,
    finaleShape: mural.finale_shape ? (JSON.parse(mural.finale_shape) as Mural["finaleShape"]) : null,
    organisation: toOrganisation(mural),
    tiles: tiles.map((row) => toTile(row, mural.grid_cols)),
  };
}

// The newest pledges on a mural, for the "recent kindness" ticker.
export function recentPledges(slug: string, limit = 5): PledgeActivity[] {
  const rows = getDb()
    .prepare(
      `SELECT p.tile_number, p.amount, p.created_at, p.donor_name, t.need_title
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
    donor_name: string | null;
    need_title: string;
  }>;

  return rows.map((r) => ({
    tileId: r.tile_number,
    title: r.need_title,
    amount: r.amount,
    at: toIsoUtc(r.created_at),
    donorName: r.donor_name,
  }));
}

// Donor notes for the community notes page, newest first. Pass a slug to
// see one colouring page's notes, or null for all of them.
export function listCommunityNotes(slug: string | null, limit = 60): CommunityNote[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.message, p.donor_name, p.created_at,
              t.need_title, t.delivered_at,
              m.slug, m.title, o.name AS org_name
         FROM pledges p
         JOIN tiles t ON t.mural_id = p.mural_id AND t.tile_number = p.tile_number
         JOIN murals m ON m.id = p.mural_id
         JOIN organisations o ON o.id = m.organisation_id
        WHERE p.message IS NOT NULL AND (? IS NULL OR m.slug = ?)
        ORDER BY p.id DESC
        LIMIT ?`,
    )
    .all(slug, slug, limit) as Array<{
    id: number;
    message: string;
    donor_name: string | null;
    created_at: string;
    need_title: string;
    delivered_at: string | null;
    slug: string;
    title: string;
    org_name: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    donorName: r.donor_name,
    at: toIsoUtc(r.created_at),
    needTitle: r.need_title,
    muralSlug: r.slug,
    muralTitle: r.title,
    organisationName: r.org_name,
    delivered: r.delivered_at !== null,
  }));
}

// ---------- Writes ----------

// Writes return a result object instead of throwing for expected problems,
// so the API route can turn each one into the right HTTP status.
type WriteFailure = {
  ok: false;
  reason: "not_found" | "already_funded" | "reserved" | "not_funded";
};

export type PledgeResult =
  | { ok: true; tile: MuralTile; completed: boolean; pledge: PledgeActivity }
  | WriteFailure;

const now = () => new Date().toISOString();

// The one place a tile becomes funded, used by demo pledges AND Stripe
// payments. Call it inside a transaction.
//   holdingSession: the Stripe session allowed to fund a reserved tile
function fundTile(
  mural: MuralRow,
  tileNumber: number,
  amount: number | null, // null = the tile's own need amount
  note: DonorNote,
  holdingSession: string | null,
): PledgeResult {
  const db = getDb();

  // Compare-and-set: only flip the tile if it is STILL locked, and nobody
  // else is mid-payment for it. If two donors click at once, exactly one
  // UPDATE changes a row; the other sees changes === 0.
  const { changes } = db
    .prepare(
      `UPDATE tiles SET status = 'restored', reserved_until = NULL, reserved_session = NULL
        WHERE mural_id = ? AND tile_number = ? AND status = 'locked'
          AND (reserved_until IS NULL OR reserved_until < ? OR reserved_session IS ?)`,
    )
    .run(mural.id, tileNumber, now(), holdingSession);

  if (changes === 0) {
    const existing = db
      .prepare("SELECT status, reserved_until FROM tiles WHERE mural_id = ? AND tile_number = ?")
      .get(mural.id, tileNumber) as { status: string; reserved_until: string | null } | undefined;
    if (!existing) return { ok: false, reason: "not_found" };
    if (existing.status === "restored") return { ok: false, reason: "already_funded" };
    return { ok: false, reason: "reserved" };
  }

  const paid = amount ?? findTile(mural.id, tileNumber)!.need_amount;
  // RETURNING hands back the row we just inserted, including its timestamp.
  const { created_at } = db
    .prepare(
      `INSERT INTO pledges (mural_id, tile_number, amount, donor_name, message, stripe_session_id)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING created_at`,
    )
    .get(mural.id, tileNumber, paid, note.donorName, note.message, holdingSession) as {
    created_at: string;
  };
  const tile = findTile(mural.id, tileNumber)!; // re-read, now with its note

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
      amount: paid,
      at: toIsoUtc(created_at),
      donorName: note.donorName,
    },
  };
}

// An instant pledge with no payment step (demo mode).
export function pledgeTile(slug: string, tileNumber: number, note: DonorNote): PledgeResult {
  return transaction(getDb(), () => {
    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };
    return fundTile(mural, tileNumber, null, note, null);
  });
}

// ---------- Stripe checkout ----------

export type Reservation =
  | { ok: true; muralTitle: string; need: Need; until: string }
  | WriteFailure;

// Hold a tile for one donor while they pay. Same compare-and-set idea:
// only succeeds if the tile is locked and not already held.
export function reserveTile(slug: string, tileNumber: number, minutes: number): Reservation {
  const db = getDb();
  return transaction(db, () => {
    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };

    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    const { changes } = db
      .prepare(
        `UPDATE tiles SET reserved_until = ?, reserved_session = NULL
          WHERE mural_id = ? AND tile_number = ? AND status = 'locked'
            AND (reserved_until IS NULL OR reserved_until < ?)`,
      )
      .run(until, mural.id, tileNumber, now());

    const tile = findTile(mural.id, tileNumber);
    if (!tile) return { ok: false, reason: "not_found" };
    if (changes === 0) return { ok: false, reason: tile.status === "restored" ? "already_funded" : "reserved" };
    return {
      ok: true,
      muralTitle: mural.title,
      need: { title: tile.need_title, detail: tile.need_detail, amount: tile.need_amount },
      until,
    };
  });
}

// Remember which Stripe session holds the tile, once Stripe has given us one.
export function attachSession(slug: string, tileNumber: number, sessionId: string) {
  getDb()
    .prepare(
      `UPDATE tiles SET reserved_session = ?
        WHERE tile_number = ? AND mural_id = (SELECT id FROM murals WHERE slug = ?)`,
    )
    .run(sessionId, tileNumber, slug);
}

// Free a tile: the donor cancelled, Stripe failed, or the session expired.
// Only releases the hold if that exact session (or no session) owns it.
export function releaseReservation(slug: string, tileNumber: number, sessionId: string | null) {
  getDb()
    .prepare(
      `UPDATE tiles SET reserved_until = NULL, reserved_session = NULL
        WHERE tile_number = ? AND mural_id = (SELECT id FROM murals WHERE slug = ?)
          AND status = 'locked' AND reserved_session IS ?`,
    )
    .run(tileNumber, slug, sessionId);
}

export type CheckoutResult =
  | (PledgeResult & { ok: true; alreadyRecorded: false })
  | { ok: true; alreadyRecorded: true }
  | WriteFailure;

// Record a payment Stripe has CONFIRMED. Safe to call more than once for
// the same session: the second call sees the pledge and does nothing.
export function completeCheckout(
  slug: string,
  tileNumber: number,
  sessionId: string,
  amountPaid: number,
  note: DonorNote,
): CheckoutResult {
  const db = getDb();
  return transaction(db, () => {
    const seen = db.prepare("SELECT 1 FROM pledges WHERE stripe_session_id = ?").get(sessionId);
    if (seen) return { ok: true, alreadyRecorded: true };

    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };
    const result = fundTile(mural, tileNumber, amountPaid, note, sessionId);
    return result.ok ? { ...result, alreadyRecorded: false } : result;
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

export type DeliveryResult = { ok: true; tile: MuralTile } | WriteFailure;

// Mark a funded section as delivered, or update its note. The first
// "delivered" time is kept (COALESCE), so editing the note later doesn't
// pretend it was delivered later.
export function markDelivered(slug: string, tileNumber: number, note: string): DeliveryResult {
  const db = getDb();
  return transaction(db, () => {
    const mural = findMural(slug);
    if (!mural) return { ok: false, reason: "not_found" };

    const { changes } = db
      .prepare(
        `UPDATE tiles SET delivered_at = COALESCE(delivered_at, ?), delivery_note = ?
          WHERE mural_id = ? AND tile_number = ? AND status = 'restored'`,
      )
      .run(new Date().toISOString(), note, mural.id, tileNumber);

    const tile = findTile(mural.id, tileNumber);
    if (!tile) return { ok: false, reason: "not_found" };
    if (changes === 0) return { ok: false, reason: "not_funded" }; // can't deliver what isn't paid for
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
