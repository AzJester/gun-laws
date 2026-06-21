import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isErrorReportingConfigured,
  log,
  parseDsn,
  redact,
  reportError,
} from "@/lib/observability";
import { resetEnvCache } from "@/lib/env";

// These tests exercise the dependency-free observability layer with NO network:
// they stub global.fetch so we can assert it is NOT called without a DSN and IS
// attempted with one. NODE_ENV=test (set by vitest.config) keeps everything off
// the real network anyway.

describe("observability: redact()", () => {
  it("masks values of secret-ish keys (token/key/secret/authorization/email)", () => {
    const out = redact({
      apiKey: "sk-123",
      token: "t-abc",
      secret: "shh",
      authorization: "Bearer xyz",
      userEmail: "user@example.com",
      password: "hunter2",
      SENTRY_DSN: "https://k@host/1",
      normal: "kept",
      count: 7,
    });
    expect(out.apiKey).toBe("[redacted]");
    expect(out.token).toBe("[redacted]");
    expect(out.secret).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect(out.userEmail).toBe("[redacted]");
    expect(out.password).toBe("[redacted]");
    expect(out.SENTRY_DSN).toBe("[redacted]");
    // Non-secret fields pass through untouched.
    expect(out.normal).toBe("kept");
    expect(out.count).toBe(7);
  });

  it("redacts nested objects and arrays, preserving structure", () => {
    const out = redact({
      level1: { accessToken: "abc", keep: "ok", deeper: { secretValue: "x" } },
      list: [{ apiKey: "a" }, { keep: "b" }],
    }) as Record<string, any>;
    expect(out.level1.accessToken).toBe("[redacted]");
    expect(out.level1.keep).toBe("ok");
    expect(out.level1.deeper.secretValue).toBe("[redacted]");
    expect(out.list[0].apiKey).toBe("[redacted]");
    expect(out.list[1].keep).toBe("b");
  });

  it("preserves null/undefined for secret keys (absent stays distinguishable)", () => {
    const out = redact({ token: null, key: undefined }) as Record<string, any>;
    expect(out.token).toBeNull();
    expect(out.key).toBeUndefined();
  });

  it("handles circular references without throwing", () => {
    const a: any = { name: "a" };
    a.self = a;
    expect(() => redact(a)).not.toThrow();
    const out = redact(a) as Record<string, any>;
    expect(out.self).toBe("[circular]");
  });
});

describe("observability: log", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn's
  // overloaded return type is awkward to name across console methods; `any` keeps
  // the test focused on behavior, not spy typing.
  let logSpy: any;
  let errSpy: any;
  let warnSpy: any;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("emits a single-line JSON record with {level,ts,msg,...fields}", () => {
    log.info("hello", { route: "/x", n: 1 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0] as string;
    // Single line: no embedded newline.
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(typeof parsed.ts).toBe("string");
    // Valid ISO timestamp.
    expect(Number.isNaN(Date.parse(parsed.ts))).toBe(false);
    expect(parsed.route).toBe("/x");
    expect(parsed.n).toBe(1);
  });

  it("routes warn → console.warn and error → console.error", () => {
    log.warn("careful");
    log.error("boom");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warnSpy.mock.calls[0][0] as string).level).toBe("warn");
    expect(JSON.parse(errSpy.mock.calls[0][0] as string).level).toBe("error");
  });

  it("redacts secret fields in the emitted line", () => {
    log.info("with-secret", { apiKey: "sk-secret", ok: "yes" });
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.apiKey).toBe("[redacted]");
    expect(parsed.ok).toBe("yes");
  });

  it("never throws on a non-serializable field", () => {
    expect(() => log.info("bigint", { big: BigInt(10) as unknown })).not.toThrow();
  });
});

describe("observability: parseDsn()", () => {
  it("parses a standard DSN into the envelope endpoint", () => {
    const p = parseDsn("https://abc123@o123.ingest.sentry.io/456");
    expect(p).not.toBeNull();
    expect(p!.publicKey).toBe("abc123");
    expect(p!.projectId).toBe("456");
    expect(p!.envelopeUrl).toBe(
      "https://o123.ingest.sentry.io/api/456/envelope/",
    );
  });

  it("returns null for undefined / garbage", () => {
    expect(parseDsn(undefined)).toBeNull();
    expect(parseDsn("")).toBeNull();
    expect(parseDsn("not a dsn")).toBeNull();
  });
});

describe("observability: reportError()", () => {
  const savedDsn = process.env.SENTRY_DSN;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see note above.
  let fetchSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errSpy: any;

  beforeEach(() => {
    delete process.env.SENTRY_DSN;
    resetEnvCache();
    // Stub fetch so we can assert whether a network send was attempted, and so
    // no real request ever leaves the test.
    fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    errSpy.mockRestore();
    if (savedDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = savedDsn;
    resetEnvCache();
  });

  it("never throws (Error, string, or arbitrary value)", () => {
    expect(() => reportError(new Error("x"))).not.toThrow();
    expect(() => reportError("plain string")).not.toThrow();
    expect(() => reportError({ weird: true })).not.toThrow();
    expect(() => reportError(undefined)).not.toThrow();
  });

  it("logs the error (structured) on every call", () => {
    reportError(new Error("kaboom"), { route: "/api/x" });
    expect(errSpy).toHaveBeenCalled();
    const parsed = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("kaboom");
    expect(parsed.route).toBe("/api/x");
  });

  it("is a NO-OP for the network with no DSN: fetch is NOT called", async () => {
    expect(isErrorReportingConfigured()).toBe(false);
    reportError(new Error("no-dsn"));
    // Give any (incorrectly scheduled) async send a tick to fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ATTEMPTS a Sentry envelope POST when SENTRY_DSN is set", async () => {
    process.env.SENTRY_DSN = "https://pub@o1.ingest.sentry.io/42";
    resetEnvCache();
    expect(isErrorReportingConfigured()).toBe(true);

    reportError(new Error("send-me"), { extra: "ctx" });
    // The send is fire-and-forget; let the microtask/timer queue drain.
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://o1.ingest.sentry.io/api/42/envelope/");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Sentry-Auth"]).toContain("sentry_key=pub");
    // The body is a Sentry envelope (newline-delimited JSON).
    expect(typeof init.body).toBe("string");
    expect((init.body as string).split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("swallows a failing fetch (best-effort) without throwing", async () => {
    process.env.SENTRY_DSN = "https://pub@o1.ingest.sentry.io/42";
    resetEnvCache();
    fetchSpy.mockRejectedValue(new Error("network down"));
    expect(() => reportError(new Error("still-fine"))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchSpy).toHaveBeenCalled();
  });
});
