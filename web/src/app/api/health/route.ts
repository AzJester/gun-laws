import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/prisma";

// Health / uptime probe. Dynamic + nodejs so it reflects live process state and
// never runs at build. Lives under app/api so the static `output: "export"`
// build excludes it (like the other API routes).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// App version, read from the build-time package version. Static import is fine
// (resolveJsonModule is on) and adds no runtime cost.
import pkg from "../../../../package.json";

/**
 * GET /api/health — lightweight readiness/liveness probe for uptime checks and
 * load balancers. Returns 200 with a small JSON body. Does NOT open a DB
 * connection (it only reports whether DATABASE_URL is configured), so it stays
 * fast and never fails just because the DB is down.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      version: pkg.version,
      dbConfigured: hasDatabase(),
      // Optional deploy correlation id; omitted when unset.
      ...(process.env.GIT_SHA ? { commit: process.env.GIT_SHA } : {}),
    },
    {
      // Never cache a health probe.
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
