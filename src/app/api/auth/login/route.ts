import { checkCredentials, createSession, SESSION_COOKIE } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";

const ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 10 tries per 15 minutes

// POST /api/auth/login - body: { email, password }
export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientKey(request)}`, ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) {
    return Response.json(
      { error: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }, // 429 Too Many Requests
    );
  }

  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter your email and password.", 400);

  const admin = await checkCredentials(email, password);
  // Same message either way, so the form doesn't reveal which emails exist.
  if (!admin) return jsonError("That email and password don't match.", 401);

  const { token, expires } = createSession(admin.id);
  const response = Response.json({ admin });
  response.headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${token}`,
      "Path=/",
      `Expires=${expires.toUTCString()}`,
      "HttpOnly", // page scripts can't read it, so injected scripts can't steal it
      "SameSite=Lax", // not sent on cross-site form posts, which blocks CSRF
      process.env.NODE_ENV === "production" ? "Secure" : "", // HTTPS only, once deployed
    ]
      .filter(Boolean)
      .join("; "),
  );
  return response;
}
