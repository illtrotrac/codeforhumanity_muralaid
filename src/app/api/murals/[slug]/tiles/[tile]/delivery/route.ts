import { validateDeliveryNote } from "@/lib/note-validation";
import { publish } from "@/server/events";
import { jsonError, parseTileNumber, readJson, requireManager } from "@/server/http";
import { markDelivered } from "@/server/murals";

// POST /api/murals/:slug/tiles/:tile/delivery - body: { note }
// The organisation confirms a funded section's need was handed over.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]/delivery">,
) {
  const { slug, tile } = await ctx.params;
  const denied = await requireManager(slug);
  if (denied) return denied;

  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Section must be a positive whole number.", 400);

  const body = (await readJson(request)) as { note?: unknown } | null;
  const checked = validateDeliveryNote(body?.note);
  if (!checked.ok) return jsonError(checked.error, 400);

  const result = markDelivered(slug, tileNumber, checked.note);
  if (!result.ok) {
    return result.reason === "not_funded"
      ? jsonError("Only funded sections can be marked delivered.", 409)
      : jsonError("That colouring page or section doesn't exist.", 404);
  }

  // Everyone watching sees the gold seal appear.
  publish({ type: "tile-updated", slug, tile: result.tile });
  return Response.json({ tile: result.tile });
}
