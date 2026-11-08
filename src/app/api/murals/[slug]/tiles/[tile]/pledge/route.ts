import { validateNote } from "@/lib/note-validation";
import { publish } from "@/server/events";
import { jsonError, parseTileNumber, readJson } from "@/server/http";
import { pledgeTile } from "@/server/murals";

// POST /api/murals/:slug/tiles/:tile/pledge - fund one tile.
// Optional body: { donorName, message }. No body = an anonymous pledge.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]/pledge">,
) {
  const { slug, tile } = await ctx.params;
  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Tile must be a positive whole number.", 400);

  const body = ((await readJson(request)) ?? {}) as { donorName?: unknown; message?: unknown };
  const checked = validateNote(body);
  if (!checked.ok) return jsonError("Your note needs a small fix.", 400, { errors: checked.errors });

  const result = pledgeTile(slug, tileNumber, checked.note);
  if (!result.ok) {
    return result.reason === "not_found"
      ? jsonError("That mural or tile doesn't exist.", 404)
      : jsonError("Someone already funded this tile.", 409); // 409 Conflict
  }

  // Tell every open browser, only AFTER the database has committed.
  const { tile: restored, completed, pledge } = result;
  publish({ type: "tile-restored", slug, tile: restored, completed, pledge });
  return Response.json({ tile: restored, completed });
}
