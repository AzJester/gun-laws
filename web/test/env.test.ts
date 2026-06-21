import { describe, it, expect } from "vitest";

import { getEnv, safeGetEnv, envSchema } from "@/lib/env";

// These tests pass an explicit source object to getEnv() so they never touch (or
// depend on) the real process.env, and the per-call parse bypasses the memo.

describe("env: getEnv() with explicit source", () => {
  it("parses an empty object — every var is optional, no throw", () => {
    const env = getEnv({});
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.LEGISCAN_API_KEY).toBeUndefined();
    expect(env.ADMIN_TOKEN).toBeUndefined();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it("accepts a full, valid configuration", () => {
    const env = getEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      LEGISCAN_API_KEY: "ls-key",
      OPENSTATES_API_KEY: "os-key",
      COURTLISTENER_API_TOKEN: "cl-token",
      ANTHROPIC_API_KEY: "sk-ant-xxx",
      ANTHROPIC_MODEL: "claude-sonnet-4-6",
      RESEND_API_KEY: "re_xxx",
      EMAIL_FROM: "Alerts <a@example.com>",
      ADMIN_TOKEN: "admin-tok",
      INGEST_TOKEN: "ingest-tok",
      NEXT_PUBLIC_SITE_URL: "https://gunlawmap.example",
    });
    expect(env.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/db");
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-6");
    expect(env.ADMIN_TOKEN).toBe("admin-tok");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://gunlawmap.example");
  });

  it("ignores unknown keys (extra process.env entries don't break parsing)", () => {
    const env = getEnv({ SOMETHING_ELSE: "x", PATH: "/usr/bin" });
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("throws when a PRESENT value is malformed (DATABASE_URL not a URL)", () => {
    expect(() => getEnv({ DATABASE_URL: "not-a-url" })).toThrow();
  });

  it("throws when NEXT_PUBLIC_SITE_URL is malformed", () => {
    expect(() => getEnv({ NEXT_PUBLIC_SITE_URL: "://bad" })).toThrow();
  });

  it("treats a whitespace-only token as invalid (min length after trim)", () => {
    // optionalNonEmpty trims then requires min(1): a space-only string fails.
    expect(() => getEnv({ ADMIN_TOKEN: "   " })).toThrow();
  });
});

describe("env: safeGetEnv()", () => {
  it("returns success:true for a valid source", () => {
    const r = safeGetEnv({ RESEND_API_KEY: "re_xxx" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.RESEND_API_KEY).toBe("re_xxx");
  });

  it("returns success:false (no throw) for an invalid source", () => {
    const r = safeGetEnv({ DATABASE_URL: "nope" });
    expect(r.success).toBe(false);
  });
});

describe("env: schema shape", () => {
  it("exposes all expected keys as optional", () => {
    // A bare parse of {} must succeed for every documented var.
    const r = envSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
