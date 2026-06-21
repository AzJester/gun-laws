// CLI wrapper for the ingestion module.
//
// Usage:
//   npm run ingest -- --dry-run
//   npm run ingest -- --source=legiscan --states=CA,TX
//   npm run ingest -- --states=WA            (live; requires keys + DB)
//
// Flags:
//   --dry-run            fetch + normalize, do not write to the DB
//   --source=NAME        legiscan | openstates (default: all with a key)
//   --states=CA,TX,...   restrict to these states (default: all 50 + DC)
//   --query=TEXT         search query (default: "firearm")
//
// Exits 0 on success, including the graceful "skipped" path (no keys / blocked).
// Exits 1 only on an unexpected crash.

import { runIngestion } from "../src/lib/ingest";
import type { SourceKind } from "../src/lib/ingest";

interface Args {
  dryRun: boolean;
  source?: SourceKind;
  states?: string[];
  query?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (const raw of argv) {
    if (raw === "--dry-run" || raw === "--dryrun") {
      args.dryRun = true;
    } else if (raw.startsWith("--source=")) {
      const v = raw.slice("--source=".length).toLowerCase();
      if (v === "legiscan" || v === "openstates") args.source = v;
      else {
        console.error(`Unknown --source "${v}" (use legiscan|openstates)`);
        process.exit(2);
      }
    } else if (raw.startsWith("--states=")) {
      args.states = raw
        .slice("--states=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (raw.startsWith("--query=")) {
      args.query = raw.slice("--query=".length);
    } else if (raw === "--help" || raw === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${raw}`);
      printHelp();
      process.exit(2);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(
    [
      "Ingest firearm-related legislation into ChangeEvents.",
      "",
      "Usage: npm run ingest -- [flags]",
      "  --dry-run            fetch + normalize, do not write to the DB",
      "  --source=NAME        legiscan | openstates (default: all with a key)",
      "  --states=CA,TX,...   restrict to these states (default: 50 + DC)",
      "  --query=TEXT         search query (default: firearm)",
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `Ingestion starting${args.dryRun ? " (dry run)" : ""}` +
      `${args.source ? ` · source=${args.source}` : ""}` +
      `${args.states ? ` · states=${args.states.join(",")}` : " · states=ALL"}`,
  );

  const summary = await runIngestion({
    states: args.states,
    source: args.source,
    dryRun: args.dryRun,
    query: args.query,
  });

  console.log("\n=== Ingestion summary ===");
  if (summary.skipped) {
    console.log(`Status:    SKIPPED`);
    console.log(`Reason:    ${summary.reason}`);
  } else {
    console.log(`Status:    OK${summary.dryRun ? " (dry run)" : ""}`);
  }
  if (summary.providersRun.length) {
    console.log(`Providers: ${summary.providersRun.join(", ")}`);
  }
  for (const p of summary.providersSkipped) {
    console.log(`Skipped:   ${p.source} — ${p.reason}`);
  }
  console.log(`Fetched:   ${summary.fetched}`);
  console.log(`Unique:    ${summary.unique}`);
  console.log(`Upserted:  ${summary.upserted}`);
  const states = Object.entries(summary.byState).sort((a, b) => b[1] - a[1]);
  if (states.length) {
    console.log(
      `By state:  ${states.map(([s, n]) => `${s}=${n}`).join(", ")}`,
    );
  }
  for (const w of summary.warnings) console.log(`Warning:   ${w}`);
  console.log("=========================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Ingestion failed:", err instanceof Error ? err.stack : err);
    process.exit(1);
  });
