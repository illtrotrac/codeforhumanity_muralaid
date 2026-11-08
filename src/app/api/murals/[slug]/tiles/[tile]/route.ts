import { validateNeed } from "@/lib/need-validation";
import { publish } from "@/server/events";
import { jsonError, parseTileNumber, readJson } from "@/server/http";
import { updateNeed } from "@/server/murals";

// PATCH /api/murals/:slug/tiles/:tile - change what a locked tile asks for.
// Body: { title, detail, amount }
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]">,
) {
  const { slug, tile } = await ctx.params;
  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Tile must be a positive whole number.", 400);

  const body = await readJson(request);
  if (typeof body !== "object" || body === null) {
    return jsonError("Send the need as a JSON object.", 400);
  }

  // The same rules the admin form checks. The browser's check is a
  // convenience; this one is the one that counts.
  const input = body as Record<string, unknown>;
  const result = validateNeed({
    title: input.title,
    detail: input.detail,
    amount: String(input.amount ?? ""),
  });
  if (!result.ok) return jsonError("Some fields need fixing.", 400, { errors: result.errors });

  const saved = updateNeed(slug, tileNumber, result.need);
  if (!saved.ok) {
    return saved.reason === "not_found"
      ? jsonError("That mural or tile doesn't exist.", 404)
      : jsonError("This tile is already funded, so its need can't change.", 409);
  }
  publish({ type: "tile-updated", slug, tile: saved.tile });
  return Response.json({ tile: saved.tile });
}
