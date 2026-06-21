// Next.js instrumentation hook (server-only).
//
// `register()` runs once when the Next server process boots (enabled via
// `experimental.instrumentationHook` in next.config.mjs). We use it only for a
// structured boot log — no SDK init, no network, no DB. `onRequestError` is the
// Next request-error hook: Next calls it for unhandled errors in Server
// Components / route handlers / middleware and we forward them to reportError().
//
// EXPORT SAFETY: a fully static `output: "export"` build has no server, so this
// file is never executed there. We additionally make every export here a hard
// no-op when running under the export build (PAGES_EXPORT=1) so that even if a
// future Next version were to evaluate it during export, nothing server-only or
// network-touching runs. Both code paths are dependency-free and never throw.

const IS_EXPORT = process.env.PAGES_EXPORT === "1";

/**
 * Called once on server startup. Inert under the static export build.
 * Must never throw (a throwing register() would abort server boot).
 */
export async function register(): Promise<void> {
  if (IS_EXPORT) return; // static export has no server runtime

  try {
    // Lazy import so the observability module (and its env read) is never pulled
    // into an export/edge bundle that doesn't need it.
    const { log } = await import("./lib/observability");
    log.info("server boot", {
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      // GIT_SHA is optional; surfaced for correlating logs to a deploy.
      commit: process.env.GIT_SHA ?? null,
    });
  } catch {
    /* boot logging must never break the server */
  }
}

// The shape Next passes to onRequestError (kept local so we don't depend on a
// Next type that may differ across 14/15).
type RequestErrorContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
};

type RequestErrorRequest = {
  path?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

/**
 * Next's request-error hook. Forwards any unhandled server error to
 * reportError() (structured log + optional Sentry envelope). Never throws.
 *
 * NOTE: this hook is invoked by Next 15+; on Next 14 it is simply never called,
 * but exporting it now is harmless and forward-compatible. The route handlers'
 * own catch blocks already call reportError() so capture works on 14 too.
 */
export async function onRequestError(
  error: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext,
): Promise<void> {
  if (IS_EXPORT) return;

  try {
    const { reportError } = await import("./lib/observability");
    reportError(error, {
      source: "onRequestError",
      method: request?.method,
      path: request?.path,
      routePath: context?.routePath,
      routeType: context?.routeType,
      routerKind: context?.routerKind,
    });
  } catch {
    /* reporting must never break request handling */
  }
}
