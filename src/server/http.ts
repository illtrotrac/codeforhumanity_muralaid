// Small helpers shared by the API routes.

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
