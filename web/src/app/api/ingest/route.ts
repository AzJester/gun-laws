import { NextResponse } from "next/server";
import { z } from "zod";

import { runIngestion } from "@/lib/ingest";
import { reportError } from "@/lib/observability";
import { intFromEnv, rateLimitOrResponse } from "@/lib/rate-limit";

// Always run at request time; never execute ingestion during `next build`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Validate the request body before it reaches the ingestion engine. Without
// this, arbitrary `states` / `source` / `query` values would flow straight into
// the provider calls. `.strict()` rejects unknown keys; states must be 2-letter
// codes; source must be a known provider; query is length-capped.
const IngestBodySchema = z
  .object({
    states: z
      .array(z.string().trim().regex(/^[A-Za-z]{2}$/))
      .max(51)
      .optional(),
    source: z.enum(["legiscan", "openstates", "courtlistener"]).optional(),
    dryRun: z.boolean().optional(),
    query: z.string().trim().max(200).optional(),
  })
  .strict();

type IngestBody = z.infer<typeof IngestBodySchema>;

/**
 * POST /api/ingest — run firearm-legislation ingestion on demand.
 *
 * Auth model:
 *  - If INGEST_TOKEN is set, a write run (dryRun=false) requires
 *    `Authorization: Bearer <INGEST_TOKEN>` (or `x-ingest-token`).
 *  - If INGEST_TOKEN is unset, only dry runs are permitted (no DB writes),
 *    so an unguarded deployment can never trigger writes or burn API quota
 *    for arbitrary callers beyond a read-only preview.
 */
export async function POST(req: Request) {
  // Rate limit: ingestion can burn provider API quota + write rows. Keep it
  // generous (default 20 / hour per client) but cap runaway calls; env-tunable.
  const limited = rateLimitOrResponse(req, "ingest", {
    limit: intFromEnv(process.env.RATE_LIMIT_INGEST, 20),
    windowMs: intFromEnv(process.env.RATE_LIMIT_INGEST_WINDOW_MS, 3_600_000),
  });
  if (limited) return limited;

  let body: IngestBody = {};
  try {
    const text = await req.text();
    if (text) {
      const parsed = IngestBodySchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", detail: parsed.error.issues },
          { status: 400 },
        );
      }
      body = parsed.data;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = process.env.INGEST_TOKEN;
  const provided =
    req.headers.get("x-ingest-token") ??
    (req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null);

  let dryRun = Boolean(body.dryRun);

  if (token) {
    const authorized = provided != null && provided === token;
    if (!authorized) {
      // Without a valid token, force dry-run (read-only preview) rather than
      // rejecting outright — never writes, never reveals data beyond a count.
      dryRun = true;
    }
  } else {
    // No token configured anywhere → only dry runs allowed.
    if (!dryRun) {
      return NextResponse.json(
        {
          error:
            "INGEST_TOKEN is not configured; only dryRun runs are allowed. " +
            "Set INGEST_TOKEN and send it as a Bearer token to enable writes.",
        },
        { status: 403 },
      );
    }
  }

  try {
    const summary = await runIngestion({
      states: body.states,
      source: body.source,
      dryRun,
      query: body.query,
    });
    return NextResponse.json(summary);
  } catch (err) {
    // Report (log + optional Sentry) but keep the existing graceful 500 + shape.
    reportError(err, { route: "POST /api/ingest", dryRun });
    return NextResponse.json(
      {
        error: "Ingestion failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
