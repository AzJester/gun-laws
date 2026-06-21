import { NextResponse } from "next/server";

import { getPublishedChanges } from "@/lib/data";

// Public changelog feed. Dynamic; reads at request time, never at build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/changelog — recently published changes, newest first.
 * Optional `?state=CA` filters to one state. Optional `?limit=N` (default 50).
 *
 * On the DB path this returns published ChangeEvents (reviewStatus=published).
 * Without a database it falls back to the curated sample changes so the feed is
 * never empty in the demo.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

  const changes = await getPublishedChanges({
    state: state ?? undefined,
    limit,
  });

  return NextResponse.json({ count: changes.length, changes });
}
