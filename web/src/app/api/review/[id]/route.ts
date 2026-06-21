import { NextResponse } from "next/server";

import { authorizeWrite } from "@/lib/admin";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { intFromEnv, rateLimitOrResponse } from "@/lib/rate-limit";

// Editorial review actions. Dynamic + nodejs; never touches the DB at build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Action = "approve" | "reject" | "edit";

interface ReviewBody {
  action: Action;
  // Optional editor overrides applied before publishing (action=approve|edit).
  summary?: string;
  citation?: string | null;
  status?: string | null;
  policyKey?: string | null;
  category?: string | null;
  effectiveDate?: string | null; // "yyyy-mm-dd"
  // For a new provision the change introduces (action=approve), the editor may
  // set a title; otherwise the headline is used.
  title?: string | null;
}

const VALID_STATUSES = new Set([
  "in_effect",
  "enacted_not_yet_effective",
  "enjoined",
  "struck",
  "repealed",
]);

/**
 * POST /api/review/[id] — act on a single review draft.
 *
 *  - approve → append a new immutable ProvisionVersion (summary/citation/status/
 *      effectiveDate/verifiedAt), point Provision.currentVersionId at it
 *      (creating the Provision if the change introduces a new one), and set the
 *      ChangeEvent reviewStatus → "published". This is the versioned publish.
 *  - edit    → save editor overrides onto the draft and set reviewStatus →
 *      "in_review" (does NOT publish). Lets editors refine before approving.
 *  - reject  → set reviewStatus → "rejected" (no version written).
 *
 * Writes require ADMIN_TOKEN (Bearer or x-admin-token). See src/lib/admin.ts.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  // Rate limit before auth so a token-guessing flood is throttled too.
  // Generous default of 60 / min per client (editors click through a queue).
  const limited = rateLimitOrResponse(req, "review", {
    limit: intFromEnv(process.env.RATE_LIMIT_REVIEW, 60),
    windowMs: intFromEnv(process.env.RATE_LIMIT_REVIEW_WINDOW_MS, 60_000),
  });
  if (limited) return limited;

  const auth = authorizeWrite(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL not set — review actions require a database." },
      { status: 503 },
    );
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || !["approve", "reject", "edit"].includes(body.action)) {
    return NextResponse.json(
      { error: "action must be one of: approve | reject | edit" },
      { status: 400 },
    );
  }
  if (body.status != null && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `Invalid status "${body.status}"` },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const event = await prisma.changeEvent.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (event.reviewStatus === "published") {
    return NextResponse.json(
      { error: "Draft is already published (versions are immutable)." },
      { status: 409 },
    );
  }

  // ---- reject ---------------------------------------------------------------
  if (body.action === "reject") {
    await prisma.changeEvent.update({
      where: { id },
      data: { reviewStatus: "rejected" },
    });
    return NextResponse.json({ ok: true, id, reviewStatus: "rejected" });
  }

  // ---- edit (save overrides, keep in queue) ---------------------------------
  if (body.action === "edit") {
    const updated = await prisma.changeEvent.update({
      where: { id },
      data: {
        reviewStatus: "in_review",
        ...(body.summary !== undefined ? { summary: body.summary } : {}),
        ...(body.citation !== undefined ? { citation: body.citation } : {}),
        ...(body.status !== undefined
          ? { status: body.status as never }
          : {}),
        ...(body.policyKey !== undefined ? { policyKey: body.policyKey } : {}),
      },
    });
    return NextResponse.json({
      ok: true,
      id,
      reviewStatus: updated.reviewStatus,
    });
  }

  // ---- approve → versioned publish ------------------------------------------
  const summary = body.summary ?? event.summary ?? event.headline;
  const citation = body.citation ?? event.citation ?? null;
  const status = (body.status ?? event.status ?? "in_effect") as
    | "in_effect"
    | "enacted_not_yet_effective"
    | "enjoined"
    | "struck"
    | "repealed";
  const category = body.category ?? "Recent changes";
  const title = (body.title ?? event.headline).slice(0, 200);
  const effectiveDate = parseDate(body.effectiveDate ?? null);
  const now = new Date();

  // Resolve the target provision: the one linked to the event, or a new one.
  let provisionId = event.provisionId;
  if (!provisionId) {
    const created = await prisma.provision.create({
      data: { stateCode: event.stateCode, category, title },
    });
    provisionId = created.id;
  }

  // Append a new immutable version (append-only history).
  const version = await prisma.provisionVersion.create({
    data: {
      provisionId,
      summary,
      citation,
      status,
      effectiveDate,
      verifiedAt: now,
      verifiedBy: "review:approve",
      confidence: "confirmed",
      ...(event.url
        ? {
            sources: {
              create: [
                {
                  kind: kindForSource(event.kind),
                  url: event.url,
                  label: `${event.stateCode} ${event.kind} — ${title}`.slice(0, 200),
                  retrievedAt: now,
                },
              ],
            },
          }
        : {}),
    },
  });

  // Supersede the previous current version (audit trail) and move the pointer.
  const prov = await prisma.provision.findUnique({
    where: { id: provisionId },
    select: { currentVersionId: true },
  });
  if (prov?.currentVersionId && prov.currentVersionId !== version.id) {
    await prisma.provisionVersion.update({
      where: { id: prov.currentVersionId },
      data: { supersededById: version.id },
    });
  }
  await prisma.provision.update({
    where: { id: provisionId },
    data: { currentVersionId: version.id },
  });

  // Mark the change published (it now appears in the public changelog/feed).
  await prisma.changeEvent.update({
    where: { id },
    data: {
      reviewStatus: "published",
      provisionId,
      summary,
      citation,
      status,
      publishedAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    id,
    reviewStatus: "published",
    provisionId,
    provisionVersionId: version.id,
  });
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function kindForSource(
  changeKind: string,
): "statute" | "enrolled_bill" | "court_order" | "agency_rule" | "dataset" {
  switch (changeKind) {
    case "court_ruling":
      return "court_order";
    case "enacted":
    case "amended":
    case "repealed":
      return "enrolled_bill";
    default:
      return "statute";
  }
}
