import { NextResponse } from "next/server";

import { reportError } from "@/lib/observability";
import { getPrisma, hasDatabase } from "@/lib/prisma";

// Editorial review queue. Dynamic + nodejs; never touches the DB at build/import.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/review — list pending review drafts (ChangeEvents whose reviewStatus
 * is auto_detected or in_review), newest event first.
 *
 * Reads are allowed without an admin token (the queue is internal tooling and
 * exposes only headlines/summaries, no PII). Writes are guarded — see
 * POST /api/review/[id].
 *
 * With no DATABASE_URL the queue is empty (drafts only exist in the DB).
 */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({
      database: false,
      note:
        "DATABASE_URL not set — the review queue lives in the database. " +
        "Set DATABASE_URL and run ingestion to populate drafts.",
      pending: [],
    });
  }

  try {
    const prisma = getPrisma();
    const rows = await prisma.changeEvent.findMany({
      where: { reviewStatus: { in: ["auto_detected", "in_review"] } },
      orderBy: [{ eventDate: "desc" }, { id: "desc" }],
      include: { state: true },
      take: 200,
    });

    const pending = rows.map((e) => ({
      id: e.id,
      stateCode: e.stateCode,
      stateName: e.state.name,
      kind: e.kind,
      headline: e.headline,
      summary: e.summary,
      policyKey: e.policyKey,
      proposedStatus: e.status,
      citation: e.citation,
      confidence: e.confidence,
      method: e.method,
      url: e.url,
      eventDate: e.eventDate.toISOString().slice(0, 10),
      reviewStatus: e.reviewStatus,
      externalRef: e.externalRef,
    }));

    return NextResponse.json({ database: true, count: pending.length, pending });
  } catch (err) {
    reportError(err, { route: "GET /api/review" });
    return NextResponse.json(
      { error: "Could not load the review queue." },
      { status: 500 },
    );
  }
}
