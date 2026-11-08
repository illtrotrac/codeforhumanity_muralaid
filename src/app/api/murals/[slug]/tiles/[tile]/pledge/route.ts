import { validateNote } from "@/lib/note-validation";
import { publish } from "@/server/events";
import { jsonError, parseTileNumber, readJson, requireManager } from "@/server/http";
import { pledgeTile } from "@/server/murals";
import { paymentsEnabled } from "@/server/payments";

// POST /api/murals/:slug/tiles/:tile/pledge - fund one tile instantly, no payment.
// Optional body: { donorName, message }. No body = an anonymous pledge.
//
// With Stripe switched on, this free path is for signed-in admins only (the
// live demo). Everyone else pays through /checkout. Without that check,
// anyone could skip paying by calling this URL directly.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]/pledge">,
) {
  const { slug, tile } = await ctx.params;
  if (paymentsEnabled()) {
    const denied = await requireManager(slug);
    if (denied) return jsonError("Pledges go through checkout. Use the payment button.", 403);
  }

  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Tile must be a positive whole number.", 400);

  const body = ((await readJson(request)) ?? {}) as { donorName?: unknown; message?: unknown };
  const checked = validateNote(body);
  if (!checked.ok) return jsonError("Your note needs a small fix.", 400, { errors: checked.errors });

  const result = pledgeTile(slug, tileNumber, checked.note);
  if (!result.ok) {
    if (result.reason === "not_found") return jsonError("That mural or tile doesn't exist.", 404);
    if (result.reason === "reserved") return jsonError("Someone is paying for this section right now.", 409);
    return jsonError("Someone already funded this section.", 409); // 409 Conflict
  }

  // Tell every open browser, only AFTER the database has committed.
  const { tile: restored, completed, pledge } = result;
  publish({ type: "tile-restored", slug, tile: restored, completed, pledge });
  return Response.json({ tile: restored, completed });
}
