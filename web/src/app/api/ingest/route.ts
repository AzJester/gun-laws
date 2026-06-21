import { NextResponse } from "next/server";

import { runIngestion } from "@/lib/ingest";
import type { SourceKind } from "@/lib/ingest";

// Always run at request time; never execute ingestion during `next build`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IngestBody {
  states?: string[];
  source?: SourceKind;
  dryRun?: boolean;
  query?: string;
}

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
  let body: IngestBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as IngestBody;
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
    return NextResponse.json(
      {
        error: "Ingestion failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
