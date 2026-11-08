import type { DemoAction } from "@/lib/types";
import { publish } from "@/server/events";
import { jsonError, readJson, requireManager } from "@/server/http";
import { resetMural, skipToFinale } from "@/server/murals";

const ACTIONS: Record<DemoAction, (slug: string) => ReturnType<typeof resetMural>> = {
  reset: resetMural,
  "skip-to-finale": skipToFinale,
};

// POST /api/murals/:slug/demo - rehearsal controls for the pitch.
// Body: { action: "reset" | "skip-to-finale" }
export async function POST(request: Request, ctx: RouteContext<"/api/murals/[slug]/demo">) {
  const { slug } = await ctx.params;
  const denied = await requireManager(slug);
  if (denied) return denied;

  const body = (await readJson(request)) as { action?: unknown } | null;
  const action = body?.action;

  if (typeof action !== "string" || !(action in ACTIONS)) {
    return jsonError(`Action must be one of: ${Object.keys(ACTIONS).join(", ")}.`, 400);
  }

  const mural = ACTIONS[action as DemoAction](slug);
  if (!mural) return jsonError("That mural doesn't exist.", 404);
  publish({ type: "mural-replaced", slug, tiles: mural.tiles });
  return Response.json(mural);
}
