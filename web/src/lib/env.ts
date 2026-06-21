// Centralized, lazily-validated environment configuration (zod).
//
// WHY LAZY: this app is built and tested with NO secrets and NO database
// (the JSON-fallback / graceful-degradation paths). Validating at import time
// would throw during `next build` / `tsc` / Vitest collection whenever a var is
// absent. So nothing is parsed at module load; call getEnv() at the point of use
// and the result is memoized for the process lifetime.
//
// WHY EVERYTHING IS OPTIONAL: every var here is optional by design. The app
// must keep working when they are unset — the consumers already branch on
// presence (hasDatabase(), resolveProvider(), token guards, etc.). zod's job
// here is to (a) reject malformed values when they ARE set (e.g. a non-URL
// DATABASE_URL, an empty-string token) and (b) give callers a single typed
// accessor instead of scattered `process.env.X` reads.
//
// TESTABILITY: getEnv() accepts an optional source object so tests can validate
// arbitrary inputs without mutating process.env. Passing a source also bypasses
// the memo cache (each explicit input is parsed fresh).

import { z } from "zod";

// Treat empty / whitespace-only strings as "unset". An exported-but-empty var
// (very common in CI and shells, e.g. `DATABASE_URL: ""`) must behave exactly
// like a missing one for these optional knobs — otherwise zod's .url()/.min(1)
// would reject the empty value before .optional() ever sees it. preprocess runs
// BEFORE validation, so empties become `undefined` and pass as optional.
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalNonEmpty = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

// A URL-ish string. Postgres URLs (postgresql://) are accepted by z.string().url().
const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url().optional(),
);

export const envSchema = z.object({
  // --- Data -----------------------------------------------------------------
  DATABASE_URL: optionalUrl,

  // --- Ingestion providers --------------------------------------------------
  LEGISCAN_API_KEY: optionalNonEmpty,
  OPENSTATES_API_KEY: optionalNonEmpty,
  COURTLISTENER_API_TOKEN: optionalNonEmpty,

  // --- Classifier (LLM draft step) -----------------------------------------
  ANTHROPIC_API_KEY: optionalNonEmpty,
  ANTHROPIC_MODEL: optionalNonEmpty,

  // --- Email / alerts -------------------------------------------------------
  RESEND_API_KEY: optionalNonEmpty,
  EMAIL_FROM: optionalNonEmpty,

  // --- Auth tokens ----------------------------------------------------------
  ADMIN_TOKEN: optionalNonEmpty,
  INGEST_TOKEN: optionalNonEmpty,

  // --- Public ---------------------------------------------------------------
  NEXT_PUBLIC_SITE_URL: optionalUrl,
});

/** Fully-parsed, typed environment. Every field is optional by design. */
export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Parse + validate environment configuration.
 *
 * - With no argument: reads `process.env`, memoizes the result, and returns it.
 *   Never throws for *absent* vars (all are optional); throws only when a var is
 *   present but malformed (e.g. DATABASE_URL set to a non-URL).
 * - With an explicit `source` object: parses that object fresh (no caching) so
 *   tests can exercise valid/invalid/empty inputs without touching process.env.
 *
 * @throws ZodError when a *present* value fails validation.
 */
export function getEnv(source?: Record<string, unknown>): Env {
  if (source !== undefined) {
    return envSchema.parse(source);
  }
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

/**
 * Non-throwing variant. Returns `{ success: true, data }` or
 * `{ success: false, error }` (zod's SafeParseReturnType). Handy for a
 * boot-time diagnostic that wants to report problems without crashing.
 */
export function safeGetEnv(source?: Record<string, unknown>) {
  return envSchema.safeParse(source ?? process.env);
}

/** Clear the memoized env (test-only; lets a test re-read a mutated process.env). */
export function resetEnvCache(): void {
  cached = undefined;
}
