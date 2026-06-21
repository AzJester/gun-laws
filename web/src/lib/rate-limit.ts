// Lightweight in-memory rate limiter (fixed-window).
//
// SCOPE / CAVEAT: this is a PER-INSTANCE limiter backed by a process-local Map.
// It is fine for a single Node instance (or a dev/demo deployment) and gives
// cheap abuse protection on write-heavy routes. In real multi-instance prod
// (multiple containers / serverless lambdas) each instance keeps its own
// counters, so the effective limit is N×limit and a determined caller can spread
// load across instances. Swap the store for a shared backend (Redis / Upstash /
// a durable object) when you scale out — keep the checkRateLimit() signature and
// only replace the Map operations.
//
// Pure + dependency-free; safe to import anywhere. Nothing here touches the DB
// or the network. Uses a fixed window: the first request in a key's window
// starts the clock; the window resets `windowMs` after that first hit.

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** True when the request is within the limit (allowed). */
  ok: boolean;
  /** Remaining requests in the current window (0 when blocked). */
  remaining: number;
  /** Configured limit, echoed for X-RateLimit-Limit. */
  limit: number;
  /** Unix-ms timestamp when the current window resets. */
  resetAt: number;
  /** Seconds until reset — use for the Retry-After header when !ok. */
  retryAfterSec: number;
}

interface WindowState {
  count: number;
  /** Unix-ms when this window resets (start + windowMs). */
  resetAt: number;
}

// Module-level store. One bucket per (namespace + key).
const store = new Map<string, WindowState>();

/**
 * Check + consume one token for `key` under the given window options.
 *
 * Time source is injectable (`now`) so tests can drive it with fake timers or an
 * explicit clock. Each call counts as one request.
 */
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const { limit, windowMs } = opts;
  const existing = store.get(key);

  // Start a fresh window when there is none, or the previous one has elapsed.
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      limit,
      resetAt,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  // Within the current window.
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      limit,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: existing.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Clear all buckets (test-only). */
export function resetRateLimitStore(): void {
  store.clear();
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort client identifier for a Request. Prefers proxy-set forwarding
 * headers (x-forwarded-for / x-real-ip), falling back to a constant so an
 * un-proxied caller still shares a (generous) global bucket rather than evading
 * the limit entirely. Never throws.
 */
export function clientKey(req: Request): string {
  // Defensive: a handler may be invoked without a Request (e.g. unit tests that
  // call GET() directly). Treat that as the shared "unknown" bucket.
  const headers = req?.headers;
  if (!headers || typeof headers.get !== "function") return "unknown";

  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    // First hop is the originating client.
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Parse a positive integer from an env value, falling back to `fallback`. */
export function intFromEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Apply a rate limit to a Request and return either null (allowed) or a 429
 * Response (blocked) with Retry-After + X-RateLimit-* headers.
 *
 * `namespace` segments buckets per-route so different routes don't share a
 * counter. Limits are env-tunable via the provided opts (callers read env with
 * safe defaults — see each route).
 */
export function rateLimitOrResponse(
  req: Request,
  namespace: string,
  opts: RateLimitOptions,
): Response | null {
  const key = `${namespace}:${clientKey(req)}`;
  const result = checkRateLimit(key, opts);
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down and try again later.",
      retryAfter: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
