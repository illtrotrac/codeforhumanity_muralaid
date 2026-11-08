// A small "fixed window" rate limiter: allow `limit` attempts per key every
// `windowMs`, then refuse until the window resets. Used on login so nobody
// can try thousands of passwords a minute.
//
// In memory, so it resets on restart and isn't shared between servers. In
// the cloud this moves to a shared store (e.g. Redis) or the load balancer.

type Window = { count: number; resetAt: number };

const globalForLimits = globalThis as unknown as { muralaidLimits?: Map<string, Window> };
const windows = (globalForLimits.muralaidLimits ??= new Map());

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (current.count < limit) {
    current.count += 1;
    return { allowed: true };
  }
  return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
}

// Behind a proxy, the visitor's address arrives in x-forwarded-for. Locally
// there's no proxy, so everyone shares one bucket, which is fine for a demo.
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
