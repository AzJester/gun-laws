// CLI wrapper for the alert dispatcher (roadmap #6).
//
// Usage:
//   npm run alerts -- --dry-run          preview matches; no send, no DB writes
//   npm run alerts                        send digests (needs DB + RESEND_API_KEY)
//   npm run alerts -- --base-url=https://gunlawmap.example   override link base
//
// Exits 0 on success AND on the graceful "skipped" path (no DB / no provider).
// Exits 1 only on an unexpected crash.

import { runAlerts } from "../src/lib/alerts";

interface Args {
  dryRun: boolean;
  baseUrl?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (const raw of argv) {
    if (raw === "--dry-run" || raw === "--dryrun") {
      args.dryRun = true;
    } else if (raw.startsWith("--base-url=")) {
      args.baseUrl = raw.slice("--base-url=".length);
    } else if (raw === "--help" || raw === "-h") {
      console.log(
        [
          "Send firearm-law alert digests to confirmed subscribers.",
          "",
          "Usage: npm run alerts -- [flags]",
          "  --dry-run            compute matches, do not send or update state",
          "  --base-url=URL       base for unsubscribe links (default NEXT_PUBLIC_SITE_URL)",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${raw}`);
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Alert dispatch starting${args.dryRun ? " (dry run)" : ""}`);

  const r = await runAlerts({ dryRun: args.dryRun, baseUrl: args.baseUrl });

  console.log("\n=== Alert summary ===");
  if (r.skipped) {
    console.log("Status:        SKIPPED");
    console.log(`Reason:        ${r.reason}`);
  } else {
    console.log(`Status:        OK${r.dryRun ? " (dry run)" : ""}`);
    console.log(`Subscriptions: ${r.subscriptions} confirmed`);
    console.log(`Changes:       ${r.changesConsidered} considered`);
    console.log(`Matched:       ${r.matched} subscription(s) with new changes`);
    console.log(`Sent:          ${r.sent}`);
    if (r.failed) console.log(`Failed:        ${r.failed}`);
    for (const w of r.warnings) console.log(`Warning:       ${w}`);
  }
  console.log("=====================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Alert dispatch failed:", err instanceof Error ? err.stack : err);
    process.exit(1);
  });
