import { canManage, getCurrentAdmin } from "./auth";
import { muralOrganisationSlug } from "./murals";

// Small helpers shared by the API routes.

// Admin-only routes call this first. It returns an error response to send
// back, or null if the signed-in admin may manage this mural.
//   401 = we don't know who you are (sign in)
//   403 = we know who you are, and you can't do this
//   404 = no such mural
export async function requireManager(slug: string): Promise<Response | null> {
  const organisationSlug = muralOrganisationSlug(slug);
  if (!organisationSlug) return jsonError("That mural doesn't exist.", 404);
  const admin = await getCurrentAdmin();
  if (!admin) return jsonError("Sign in to manage murals.", 401);
  if (!canManage(admin, organisationSlug)) return jsonError("You can't manage this mural.", 403);
  return null;
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

// URL params are always strings. "46" becomes 46; "abc", "0" or "4.5" become null.
export function parseTileNumber(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

// Read a JSON body without crashing on empty or malformed input.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
