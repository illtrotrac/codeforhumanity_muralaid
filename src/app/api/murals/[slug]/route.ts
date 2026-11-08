import { connection } from "next/server";
import { getMural } from "@/server/murals";

// GET /api/murals/:slug - one mural with all of its tiles.
// The [slug] folder name means this file handles any value in that spot.
export async function GET(_request: Request, ctx: RouteContext<"/api/murals/[slug]">) {
  await connection();
  const { slug } = await ctx.params;

  const mural = getMural(slug);
  if (!mural) {
    return Response.json({ error: `No mural called "${slug}".` }, { status: 404 });
  }
  return Response.json(mural);
}
