import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/server/auth";

// POST /api/auth/logout - ends the session on the server AND in the browser.
export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token); // the token is useless from now on, even if copied
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
