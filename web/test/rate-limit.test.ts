import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  checkRateLimit,
  resetRateLimitStore,
  rateLimitOrResponse,
  clientKey,
  intFromEnv,
} from "@/lib/rate-limit";

describe("rate-limit: checkRateLimit() with an injected clock", () => {
  beforeEach(() => resetRateLimitStore());

  it("allows requests up to the limit then blocks", () => {
    const opts = { limit: 3, windowMs: 1000 };
    const t0 = 1_000_000;
    expect(checkRateLimit("k", opts, t0).ok).toBe(true); // 1
    expect(checkRateLimit("k", opts, t0).ok).toBe(true); // 2
    const third = checkRateLimit("k", opts, t0);
    expect(third.ok).toBe(true); // 3
    expect(third.remaining).toBe(0);
    const fourth = checkRateLimit("k", opts, t0);
    expect(fourth.ok).toBe(false); // 4 → blocked
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 };
    const t0 = 5_000_000;
    expect(checkRateLimit("w", opts, t0).ok).toBe(true);
    expect(checkRateLimit("w", opts, t0 + 500).ok).toBe(false); // still in window
    // At/after resetAt a new window starts.
    expect(checkRateLimit("w", opts, t0 + 1000).ok).toBe(true);
    expect(checkRateLimit("w", opts, t0 + 1500).ok).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 };
    const t0 = 9_000_000;
    expect(checkRateLimit("a", opts, t0).ok).toBe(true);
    expect(checkRateLimit("b", opts, t0).ok).toBe(true); // different key, fresh
    expect(checkRateLimit("a", opts, t0).ok).toBe(false);
  });
});

describe("rate-limit: with fake timers (default Date.now clock)", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks over the limit, then allows again after the window", () => {
    const opts = { limit: 2, windowMs: 10_000 };
    expect(checkRateLimit("ft", opts).ok).toBe(true);
    expect(checkRateLimit("ft", opts).ok).toBe(true);
    expect(checkRateLimit("ft", opts).ok).toBe(false); // over limit

    vi.advanceTimersByTime(10_001); // past the window
    expect(checkRateLimit("ft", opts).ok).toBe(true); // reset
  });
});

describe("rate-limit: rateLimitOrResponse()", () => {
  beforeEach(() => resetRateLimitStore());

  function reqWithIp(ip: string): Request {
    return new Request("http://test/api/x", {
      headers: { "x-forwarded-for": ip },
    });
  }

  it("returns null while under the limit", () => {
    const res = rateLimitOrResponse(reqWithIp("1.1.1.1"), "ns", {
      limit: 2,
      windowMs: 1000,
    });
    expect(res).toBeNull();
  });

  it("returns a 429 with Retry-After once exceeded", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(rateLimitOrResponse(reqWithIp("2.2.2.2"), "ns", opts)).toBeNull();
    const blocked = rateLimitOrResponse(reqWithIp("2.2.2.2"), "ns", opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    expect(blocked!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("namespaces buckets so different routes don't share a counter", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(rateLimitOrResponse(reqWithIp("3.3.3.3"), "routeA", opts)).toBeNull();
    // Same client, different namespace → fresh bucket.
    expect(rateLimitOrResponse(reqWithIp("3.3.3.3"), "routeB", opts)).toBeNull();
    // Same client + namespace → now blocked.
    expect(
      rateLimitOrResponse(reqWithIp("3.3.3.3"), "routeA", opts),
    ).not.toBeNull();
  });
});

describe("rate-limit: helpers", () => {
  it("clientKey() reads x-forwarded-for then x-real-ip then falls back", () => {
    expect(
      clientKey(
        new Request("http://t", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }),
      ),
    ).toBe("9.9.9.9");
    expect(
      clientKey(new Request("http://t", { headers: { "x-real-ip": "8.8.8.8" } })),
    ).toBe("8.8.8.8");
    expect(clientKey(new Request("http://t"))).toBe("unknown");
  });

  it("clientKey() is defensive against a missing request", () => {
    // Simulate a handler invoked without a Request (GET() in unit tests).
    expect(clientKey(undefined as unknown as Request)).toBe("unknown");
  });

  it("intFromEnv() parses positive ints and falls back otherwise", () => {
    expect(intFromEnv("25", 10)).toBe(25);
    expect(intFromEnv(undefined, 10)).toBe(10);
    expect(intFromEnv("0", 10)).toBe(10); // not positive
    expect(intFromEnv("-5", 10)).toBe(10);
    expect(intFromEnv("abc", 10)).toBe(10);
  });
});
