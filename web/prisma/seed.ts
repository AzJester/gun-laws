// Idempotent seed: reads ../data/sample-states.json and populates the versioned,
// provenance-first schema. Re-running upserts rather than duplicating.
//
// Run with: npx prisma db seed  (configured via package.json "prisma.seed").

import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// ---- canonical policy catalog (drives map color modes + flag chips) ----------
const POLICY_TYPES = [
  {
    key: "permitless_carry",
    label: "Permitless carry",
    category: "Carry",
    direction: "freedom",
    sortOrder: 1,
  },
  {
    key: "universal_bg_check",
    label: "Universal background checks",
    category: "Purchase & background checks",
    direction: "restriction",
    sortOrder: 2,
  },
  {
    key: "red_flag",
    label: "Red-flag (ERPO) law",
    category: "Extreme risk",
    direction: "restriction",
    sortOrder: 3,
  },
  {
    key: "assault_weapon_ban",
    label: "Assault-weapon restriction",
    category: "Prohibited weapons",
    direction: "restriction",
    sortOrder: 4,
  },
  {
    key: "magazine_limit",
    label: "Magazine limit",
    category: "Prohibited weapons",
    direction: "restriction",
    sortOrder: 5,
  },
  {
    key: "waiting_period",
    label: "Waiting period",
    category: "Purchase & background checks",
    direction: "restriction",
    sortOrder: 6,
  },
] as const;

type PolicyKey = (typeof POLICY_TYPES)[number]["key"];

interface RawState {
  name: string;
  grade: string;
  lawCount: number | null;
  restrictions: number | null;
  policies: Record<PolicyKey, boolean>;
  provisions: {
    category: string;
    items: {
      text: string;
      citation: string | null;
      status?:
        | "in_effect"
        | "enacted_not_yet_effective"
        | "enjoined"
        | "struck"
        | "repealed";
    }[];
  }[];
  detailed: boolean;
  year?: number | null;
  source?: string | null;
}

interface RawDataset {
  states: Record<string, RawState>;
}

// ---- recent-changes seed (mirrors src/lib/changes.ts) ------------------------
const CHANGES: {
  iso: string;
  stateCode: string;
  kind: "enacted" | "effective" | "court_ruling" | "introduced" | "amended" | "repealed";
  headline: string;
}[] = [
  { iso: "2026-06-15", stateCode: "LA", kind: "effective", headline: "Permitless carry implementation guidance issued to sheriffs." },
  { iso: "2026-05-02", stateCode: "CO", kind: "effective", headline: "6.5% firearms & ammunition excise tax takes effect." },
  { iso: "2026-04-18", stateCode: "ME", kind: "court_ruling", headline: "72-hour purchase waiting period upheld on appeal." },
  { iso: "2026-03-10", stateCode: "NM", kind: "enacted", headline: "7-day waiting period expanded to all transfers." },
  { iso: "2026-02-21", stateCode: "MI", kind: "effective", headline: "Safe-storage enforcement & penalties begin." },
  { iso: "2026-01-12", stateCode: "WA", kind: "introduced", headline: "Permit-to-purchase bill introduced (HB 1163) — tracking." },
  { iso: "2025-11-30", stateCode: "FL", kind: "court_ruling", headline: "Court reviews under-21 long-gun purchase restriction." },
  { iso: "2025-10-04", stateCode: "TX", kind: "introduced", headline: "Bill to add ERPO referred to committee — failed to advance." },
];

const DATASET_SOURCE = {
  kind: "dataset" as const,
  url: "https://www.statefirearmlaws.org/",
  label:
    "State Firearm Laws Database — Siegel et al., Boston University (2020)",
};

async function main() {
  const file = path.join(process.cwd(), "..", "data", "sample-states.json");
  const ds = JSON.parse(await fs.readFile(file, "utf8")) as RawDataset;
  const now = new Date();

  // 1) Policy catalog -----------------------------------------------------------
  for (const pt of POLICY_TYPES) {
    await prisma.policyType.upsert({
      where: { key: pt.key },
      create: pt,
      update: { label: pt.label, category: pt.category, direction: pt.direction, sortOrder: pt.sortOrder },
    });
  }

  // 2) States + policies + provisions ------------------------------------------
  for (const [code, s] of Object.entries(ds.states)) {
    const lawCount = s.lawCount ?? s.restrictions ?? null;
    const stateData = {
      name: s.name,
      overallGrade: s.grade,
      lawCount,
      // `restrictions` is a non-null mirror column; default to 0 when unknown.
      restrictions: lawCount ?? 0,
      year: s.year ?? null,
      source: s.source ?? null,
    };
    await prisma.state.upsert({
      where: { code },
      create: { code, ...stateData },
      update: stateData,
    });

    // at-a-glance policy values
    for (const pt of POLICY_TYPES) {
      const value = s.policies[pt.key] ? "true" : "false";
      await prisma.statePolicy.upsert({
        where: { stateCode_policyKey: { stateCode: code, policyKey: pt.key } },
        create: { stateCode: code, policyKey: pt.key, value },
        update: { value },
      });
    }

    // provisions + an initial version each. Idempotent: keyed on (state, title).
    for (const cat of s.provisions) {
      for (const item of cat.items) {
        const title = item.text.slice(0, 200);

        const existing = await prisma.provision.findFirst({
          where: { stateCode: code, category: cat.category, title },
          include: { currentVersion: true },
        });

        let provisionId: number;
        if (existing) {
          provisionId = existing.id;
        } else {
          const created = await prisma.provision.create({
            data: { stateCode: code, category: cat.category, title },
          });
          provisionId = created.id;
        }

        // Append an initial version if none exists yet (append-only model).
        const hasVersion = await prisma.provisionVersion.findFirst({
          where: { provisionId },
        });
        if (!hasVersion) {
          const version = await prisma.provisionVersion.create({
            data: {
              provisionId,
              summary: item.text,
              citation: item.citation,
              // Carry the court-status overlay through to the DB so the DB read
              // path surfaces enjoined/struck the same as the JSON fallback.
              status: item.status ?? "in_effect",
              verifiedAt: now,
              verifiedBy: "seed",
              confidence: "confirmed",
              sources: { create: [DATASET_SOURCE] },
            },
          });
          // point the provision at its current/live version
          await prisma.provision.update({
            where: { id: provisionId },
            data: { currentVersionId: version.id },
          });
        }
      }
    }
  }

  // 3) Change events (recent-changes feed) -------------------------------------
  for (const c of CHANGES) {
    const eventDate = new Date(c.iso);
    const existing = await prisma.changeEvent.findFirst({
      where: { stateCode: c.stateCode, eventDate, headline: c.headline },
    });
    if (!existing) {
      await prisma.changeEvent.create({
        data: {
          stateCode: c.stateCode,
          kind: c.kind,
          headline: c.headline,
          eventDate,
          reviewStatus: "published",
        },
      });
    }
  }

  const stateCount = await prisma.state.count();
  const provCount = await prisma.provision.count();
  const eventCount = await prisma.changeEvent.count();
  console.log(
    `Seed complete: ${stateCount} states, ${provCount} provisions, ${eventCount} change events.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
