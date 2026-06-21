// Pre-build step: write the state summary list + per-state detail as static JSON
// under web/public/data/, so the map (and any static export) needs no API at
// runtime.
//
//   public/data/states.json          → summary list ({ disclaimer, states })
//   public/data/states/<code>.json   → full detail (the StateDetail object), one
//                                       per state, lowercase code.
//   public/data/time-series.json     → copy of the repo-root time-series data
//                                       (per-state grade/count/flags 1991–2025),
//                                       which powers the historical year slider.
//
// It uses the existing read layer (src/lib/data.ts). With DATABASE_URL unset
// (the default for a static/Pages build) this reads ../data/sample-states.json
// — no database required. Wired as the npm "prebuild" script so it runs before
// every `next build` (both the normal server build and the PAGES_EXPORT build).
//
// Run manually with:  npx tsx scripts/gen-static-data.ts
//
// The output is generated, so public/data/ is gitignored.

import { promises as fs } from "node:fs";
import path from "node:path";

import { getState, getStates } from "../src/lib/data";
import { DISCLAIMER } from "../src/lib/types";

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", "data");
  const statesDir = path.join(outDir, "states");
  await fs.mkdir(statesDir, { recursive: true });

  const states = await getStates();

  // Summary list — mirrors GET /api/states ({ disclaimer, states }).
  await fs.writeFile(
    path.join(outDir, "states.json"),
    JSON.stringify({ disclaimer: DISCLAIMER, states }, null, 0),
    "utf8",
  );

  // Per-state detail — the StateDetail object itself (not wrapped), so the map
  // can fetch it directly as a static asset. Lowercase filename.
  let written = 0;
  for (const s of states) {
    const detail = await getState(s.code);
    if (!detail) continue;
    await fs.writeFile(
      path.join(statesDir, `${s.code.toLowerCase()}.json`),
      JSON.stringify(detail, null, 0),
      "utf8",
    );
    written += 1;
  }

  // Time series — copy data/time-series.json (repo root) verbatim so the client
  // year slider can fetch it as a static asset in both build modes. data/ is a
  // sibling of web/ (process.cwd() is web/ for the prebuild step).
  const tsSrc = path.join(process.cwd(), "..", "data", "time-series.json");
  let tsNote = "skipped time-series.json (source not found)";
  try {
    const tsRaw = await fs.readFile(tsSrc, "utf8");
    await fs.writeFile(path.join(outDir, "time-series.json"), tsRaw, "utf8");
    tsNote = "wrote time-series.json";
  } catch (err) {
    console.warn(`[gen-static-data] ${tsNote}:`, err);
  }

  console.log(
    `[gen-static-data] wrote states.json (${states.length}) + ${written} detail file(s) + ${tsNote} to public/data/`,
  );
}

main().catch((err) => {
  console.error("[gen-static-data] failed:", err);
  process.exitCode = 1;
});
