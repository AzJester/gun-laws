// Small, dependency-free fetch helper for the ingestion providers.
//
//  - timeout via AbortController
//  - retry with exponential backoff on transient failures (network / 429 / 5xx)
//  - detects this environment's egress allowlist 403 (`host_not_allowed`) and
//    surfaces it as an actionable, typed error so callers can skip gracefully.
//
// Nothing here runs at import time; callers invoke it explicitly.

/** Error kinds the ingestion layer cares about distinguishing. */
export type FetchErrorKind =
  | "host_not_allowed" // egress proxy blocked the host (403 host_not_allowed)
  | "timeout"
  | "http" // non-2xx that is not a host_not_allowed block
  | "network"; // DNS / connection / abort (non-timeout)

export class FetchError extends Error {
  readonly kind: FetchErrorKind;
  readonly status?: number;
  readonly url: string;

  constructor(
    kind: FetchErrorKind,
    message: string,
    url: string,
    status?: number,
  ) {
    super(message);
    this.name = "FetchError";
    this.kind = kind;
    this.status = status;
    this.url = url;
  }
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  /** Per-attempt timeout in ms (default 15s). */
  timeoutMs?: number;
  /** Total attempts incl. the first (default 3). */
  retries?: number;
  /** Base backoff in ms; grows exponentially (default 500ms). */
  backoffMs?: number;
  /** Injectable sleep (tests). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function looksLikeHostNotAllowed(status: number, body: string): boolean {
  // The environment's egress proxy returns HTTP 403 when a host is not on the
  // allowlist. Different proxies phrase it differently — match the documented
  // `host_not_allowed` marker as well as the human-readable "host not in
  // allowlist" / "not in allowlist" variants.
  if (status !== 403) return false;
  return /host_not_allowed|host not in allowlist|not in (the )?allowlist|egress/i.test(
    body,
  );
}

/**
 * GET a URL and parse JSON, with timeout + retry/backoff and typed errors.
 * Throws {@link FetchError} on failure (after exhausting retries).
 */
export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOptions = {},
): Promise<T> {
  const {
    headers = {},
    timeoutMs = 15_000,
    retries = 3,
    backoffMs = 500,
    sleep = defaultSleep,
  } = opts;

  let lastErr: FetchError | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", ...headers },
        signal: controller.signal,
        // Never let Next.js cache an ingestion fetch.
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (looksLikeHostNotAllowed(res.status, body)) {
          // Not retryable — the host is blocked by policy, not flaky.
          throw new FetchError(
            "host_not_allowed",
            `Egress blocked for ${hostOf(url)} (403 host_not_allowed). ` +
              `Add the host to this environment's network allowlist to run live ` +
              `(see web/README.md → "Network / egress allowlist").`,
            url,
            res.status,
          );
        }
        const retryable = res.status === 429 || res.status >= 500;
        lastErr = new FetchError(
          "http",
          `HTTP ${res.status} from ${hostOf(url)}: ${body.slice(0, 200)}`,
          url,
          res.status,
        );
        if (retryable && attempt < retries - 1) {
          await sleep(backoff(backoffMs, attempt, res));
          continue;
        }
        throw lastErr;
      }

      return (await res.json()) as T;
    } catch (err) {
      // host_not_allowed is terminal — rethrow immediately.
      if (err instanceof FetchError && err.kind === "host_not_allowed") throw err;

      const isAbort =
        (err as { name?: string })?.name === "AbortError" ||
        (err instanceof FetchError && err.kind === "timeout");
      lastErr =
        err instanceof FetchError
          ? err
          : new FetchError(
              isAbort ? "timeout" : "network",
              isAbort
                ? `Request to ${hostOf(url)} timed out after ${timeoutMs}ms`
                : `Network error contacting ${hostOf(url)}: ${
                    (err as Error)?.message ?? String(err)
                  }`,
              url,
            );
      if (attempt < retries - 1) {
        await sleep(backoff(backoffMs, attempt));
        continue;
      }
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }

  // Unreachable, but keeps the type checker happy.
  throw lastErr ?? new FetchError("network", `Failed to fetch ${url}`, url);
}

function backoff(base: number, attempt: number, res?: Response): number {
  // Honor Retry-After (seconds) when present, else exponential w/ jitter.
  const retryAfter = res?.headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs > 0) return secs * 1000;
  }
  const exp = base * 2 ** attempt;
  return exp + Math.floor(Math.random() * 200);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const sleep = defaultSleep;
