// Lightweight, dependency-free, provider-agnostic observability.
//
// WHY HAND-ROLLED (no @sentry/nextjs or other SDK): this app is DUAL-MODE — a
// normal server build AND a static `output: "export"` for GitHub Pages — and
// must build with NO env / secrets / DB / network. Heavy SDKs wire webpack +
// instrumentation hooks that tend to break `output: export` and reach the
// network at build time. So everything here is:
//
//   - dependency-free (only the standard `fetch` + console),
//   - a complete NO-OP unless explicitly configured (SENTRY_DSN),
//   - graceful: never throws, never blocks rendering, no network at build,
//   - isomorphic: safe to import from server code AND client components.
//
// The two primitives:
//   - `log.info/warn/error(msg, fields?)` — single-line structured JSON to
//     stdout/stderr, with secret-ish fields redacted.
//   - `reportError(error, context?)` — always logs (structured); ALSO POSTs a
//     minimal Sentry-compatible envelope IFF SENTRY_DSN is set. Best-effort.

import { getEnv } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "warn" | "error";

/** Arbitrary structured context attached to a log line. */
export type Fields = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

// Keys whose VALUES are masked before they ever hit a log sink. Matched
// case-insensitively as a substring of the key, so `apiKey`, `AUTHORIZATION`,
// `user_email`, `accessToken`, `dbSecret`, etc. are all caught.
const SECRET_KEY_PATTERN = /(token|key|secret|authorization|password|email|dsn)/i;

const MASK = "[redacted]";

/**
 * Recursively copy `fields`, masking the value of any key that looks secret-ish
 * (contains token/key/secret/authorization/password/email/dsn). Cycles are
 * handled (a repeated reference becomes "[circular]"). Pure; never throws.
 *
 * Note: only the VALUE is masked, the key name is preserved so a log line still
 * shows *that* a secret was present without leaking it.
 */
export function redact<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== "object") return value;

  if (seen.has(value as object)) {
    return "[circular]" as unknown as T;
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      // Preserve null/undefined so callers can still tell "absent" from "set".
      out[k] = v == null ? v : MASK;
    } else {
      out[k] = redact(v, seen);
    }
  }
  return out as unknown as T;
}

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function emit(level: LogLevel, msg: string, fields?: Fields): void {
  // Build the record: fixed shape first, then the (redacted) caller fields.
  // Caller fields can override neither level/ts/msg (those are spread first).
  const record: Record<string, unknown> = {
    level,
    ts: nowIso(),
    msg,
    ...(fields ? (redact(fields) as Fields) : {}),
  };

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    // Extremely defensive: a non-serializable field (e.g. a BigInt) must not
    // crash the caller. Fall back to a minimal, always-serializable record.
    line = JSON.stringify({ level, ts: record.ts, msg });
  }

  // Route to the matching console method (stderr for warn/error). Wrapped so a
  // patched/throwing console can never take down the request.
  try {
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    /* swallow — logging must never throw */
  }
}

/** Structured logger. Each call emits one line of JSON. Never throws. */
export const log = {
  info(msg: string, fields?: Fields): void {
    emit("info", msg, fields);
  },
  warn(msg: string, fields?: Fields): void {
    emit("warn", msg, fields);
  },
  error(msg: string, fields?: Fields): void {
    emit("error", msg, fields);
  },
};

// ---------------------------------------------------------------------------
// Sentry-compatible DSN + envelope (no SDK)
// ---------------------------------------------------------------------------

/** Read SENTRY_DSN from the validated env. Returns undefined when unset/empty. */
function sentryDsn(): string | undefined {
  try {
    return getEnv().SENTRY_DSN;
  } catch {
    // getEnv() can only throw on a *malformed present* value; never let that
    // break error reporting — treat as "no DSN".
    return undefined;
  }
}

interface ParsedDsn {
  /** Full POST target for the envelope endpoint. */
  envelopeUrl: string;
  /** Public key (used in the X-Sentry-Auth header). */
  publicKey: string;
  /** Numeric project id. */
  projectId: string;
}

/**
 * Parse a Sentry DSN into the envelope endpoint + auth pieces.
 *
 *   https://<publicKey>@<host>/<projectId>
 *   → https://<host>/api/<projectId>/envelope/
 *
 * Returns null for anything that doesn't look like a DSN. Pure; never throws.
 */
export function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    // Path is "/<projectId>" (optionally with a leading path prefix on
    // self-hosted instances: "/<prefix>/<projectId>").
    const segments = u.pathname.split("/").filter(Boolean);
    const projectId = segments.pop();
    if (!publicKey || !projectId) return null;
    const prefix = segments.length ? `/${segments.join("/")}` : "";
    const envelopeUrl = `${u.protocol}//${u.host}${prefix}/api/${projectId}/envelope/`;
    return { envelopeUrl, publicKey, projectId };
  } catch {
    return null;
  }
}

/** A short, random-ish 32-char hex id for the Sentry event. */
function eventId(): string {
  // crypto.randomUUID is available in Node 18+ and modern browsers; fall back
  // to Math.random so this never throws in an exotic runtime.
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    /* fall through */
  }
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/**
 * Build a minimal Sentry "event" envelope body (newline-delimited JSON). This
 * is the documented envelope format: an envelope header line, an item header
 * line, then the item payload line.
 */
function buildEnvelope(
  parsed: ParsedDsn,
  error: Error,
  context?: Fields,
): string {
  const id = eventId();
  const sentAt = nowIso();

  const envelopeHeader = JSON.stringify({
    event_id: id,
    sent_at: sentAt,
    dsn: undefined, // omitted; auth travels in the header instead
  });

  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    logger: "gunlawmap",
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message || String(error),
          stacktrace: error.stack ? { frames: framesFromStack(error.stack) } : undefined,
        },
      ],
    },
    // Redact the context before it leaves the process.
    extra: context ? (redact(context) as Fields) : undefined,
  };

  const itemHeader = JSON.stringify({ type: "event" });
  const itemPayload = JSON.stringify(event);
  return `${envelopeHeader}\n${itemHeader}\n${itemPayload}\n`;
}

/** Best-effort stack → Sentry frames (just the raw lines as `function`). */
function framesFromStack(stack: string): { function: string }[] {
  return stack
    .split("\n")
    .slice(1, 40)
    .map((l) => ({ function: l.trim() }));
}

/** X-Sentry-Auth header value for the envelope POST. */
function sentryAuthHeader(publicKey: string): string {
  return [
    "Sentry sentry_version=7",
    "sentry_client=gunlawmap-observability/1.0",
    `sentry_key=${publicKey}`,
  ].join(", ");
}

/**
 * Fire-and-forget POST of the envelope. Short timeout (via AbortController),
 * all failures swallowed. Returns a promise that always resolves (never
 * rejects) so callers can `void` it without an unhandled rejection.
 */
async function postEnvelope(parsed: ParsedDsn, body: string): Promise<void> {
  // No fetch (very old runtime) → nothing to do.
  if (typeof fetch !== "function") return;

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timer = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch {
          /* ignore */
        }
      }, 2000)
    : undefined;

  try {
    await fetch(parsed.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": sentryAuthHeader(parsed.publicKey),
      },
      body,
      signal: controller?.signal,
      // Don't let a hanging report keep a serverless function alive.
      keepalive: true,
    });
  } catch {
    /* best-effort: swallow network/timeout/abort errors */
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// reportError — the public entry point
// ---------------------------------------------------------------------------

/**
 * Normalize anything thrown into an Error (so we always have name/message/stack).
 */
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
}

/**
 * Report an error: ALWAYS logs it (structured, redacted); ADDITIONALLY sends a
 * minimal Sentry-compatible envelope IFF `SENTRY_DSN` is configured.
 *
 * Contract:
 *   - Never throws (any failure is swallowed).
 *   - With NO DSN it is a pure log — no network, no fetch attempt at all.
 *   - The DSN send is best-effort and fire-and-forget (short timeout).
 *
 * @returns void synchronously; the optional network send runs in the background.
 */
export function reportError(error: unknown, context?: Fields): void {
  const err = toError(error);

  // 1) Always log — this is the no-op-friendly default behavior.
  try {
    log.error(err.message || "Unhandled error", {
      err: { name: err.name, message: err.message, stack: err.stack },
      ...(context ?? {}),
    });
  } catch {
    /* logging must never throw */
  }

  // 2) Only attempt a network send when a DSN is configured.
  const parsed = parseDsn(sentryDsn());
  if (!parsed) return; // <-- no DSN ⇒ NO fetch is ever called

  try {
    const body = buildEnvelope(parsed, err, context);
    // Fire-and-forget; never await on the caller's path.
    void postEnvelope(parsed, body);
  } catch {
    /* swallow — reporting must never throw */
  }
}

/** True when a Sentry DSN is configured (handy for diagnostics / tests). */
export function isErrorReportingConfigured(): boolean {
  return parseDsn(sentryDsn()) !== null;
}
