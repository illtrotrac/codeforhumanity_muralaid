import { publish } from "@/server/events";
import { jsonError, parseTileNumber } from "@/server/http";
import { pledgeTile } from "@/server/murals";

// POST /api/murals/:slug/tiles/:tile/pledge - fund one tile.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/murals/[slug]/tiles/[tile]/pledge">,
) {
  const { slug, tile } = await ctx.params;
  const tileNumber = parseTileNumber(tile);
  if (tileNumber === null) return jsonError("Tile must be a positive whole number.", 400);

  const result = pledgeTile(slug, tileNumber);
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
