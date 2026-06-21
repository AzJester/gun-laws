// Alert dispatch (roadmap #6).
//
// For each confirmed email subscription, find published ChangeEvents newer than
// its lastNotifiedAt that match its scope (states/policies), send one digest
// email, and advance lastNotifiedAt. Idempotent: a re-run with no new changes
// sends nothing. Graceful: no DB or no email provider → skips with a reason and
// exits 0 (the caller never crashes).
//
// Server-only. Used by scripts/send-alerts.ts (npm run alerts) and could be
// wired to a cron route later.

import { getPublishedChangesDetailed, type PublishedChangeDetail } from "./data";
import { sendEmail, resolveProvider } from "./email";
import { hasDatabase } from "./prisma";
import {
  confirmedSubscriptions,
  markNotified,
  scopeMatches,
  type SubscriptionRecord,
} from "./subscriptions";

export interface AlertRunOptions {
  /** When true, compute + report but don't send mail or update lastNotifiedAt. */
  dryRun?: boolean;
  /** Override the base URL used for unsubscribe links (else NEXT_PUBLIC_SITE_URL). */
  baseUrl?: string;
  /** Cap the number of changes considered per run (newest first). */
  limit?: number;
}

export interface AlertRunResult {
  skipped: boolean;
  reason?: string;
  dryRun: boolean;
  /** Confirmed subscriptions examined. */
  subscriptions: number;
  /** Subscriptions that had ≥1 matching new change. */
  matched: number;
  /** Digest emails actually sent (delivered). */
  sent: number;
  /** Send attempts that failed at the provider (counted, not fatal). */
  failed: number;
  /** Published changes loaded this run. */
  changesConsidered: number;
  warnings: string[];
}

function baseUrl(opts: AlertRunOptions): string {
  return (opts.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example").replace(
    /\/$/,
    "",
  );
}

/** Changes for a subscription: matching scope AND newer than lastNotifiedAt. */
function changesFor(
  sub: SubscriptionRecord,
  changes: PublishedChangeDetail[],
): PublishedChangeDetail[] {
  const since = sub.lastNotifiedAt ? sub.lastNotifiedAt.getTime() : 0;
  return changes.filter((c) => {
    const t = Date.parse(c.iso);
    if (Number.isFinite(t) && t <= since) return false;
    return scopeMatches(sub.scope, c.stateCode, c.policyKey);
  });
}

function digestEmail(
  changes: PublishedChangeDetail[],
  unsubUrl: string,
): { subject: string; html: string; text: string } {
  const n = changes.length;
  const subject =
    n === 1
      ? `GunLawMap: 1 firearm-law update`
      : `GunLawMap: ${n} firearm-law updates`;

  const rows = changes
    .map(
      (c) =>
        `<tr><td style="padding:6px 10px;color:#566;white-space:nowrap">${c.display}</td>` +
        `<td style="padding:6px 10px"><b>${c.stateName}</b> — ${c.headline}` +
        `<br><span style="font-size:11px;color:#778">${c.tagLabel}</span></td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#1a2530;line-height:1.5">
  <h2 style="margin:0 0 8px">Firearm-law updates</h2>
  <p>New published changes matching your alert preferences:</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
  <hr style="border:none;border-top:1px solid #e3e8ee;margin:18px 0">
  <p style="font-size:12px;color:#778">Informational only, not legal advice. Always verify with official state resources.
  <br><a href="${unsubUrl}">Unsubscribe</a></p>
  </body></html>`;

  const text = [
    "Firearm-law updates",
    "",
    ...changes.map((c) => `- [${c.display}] ${c.stateName}: ${c.headline} (${c.tagLabel})`),
    "",
    "Informational only, not legal advice.",
    "Unsubscribe: " + unsubUrl,
  ].join("\n");

  return { subject, html, text };
}

/** Run one alert dispatch pass. Never throws. */
export async function runAlerts(opts: AlertRunOptions = {}): Promise<AlertRunResult> {
  const dryRun = Boolean(opts.dryRun);
  const result: AlertRunResult = {
    skipped: false,
    dryRun,
    subscriptions: 0,
    matched: 0,
    sent: 0,
    failed: 0,
    changesConsidered: 0,
    warnings: [],
  };

  if (!hasDatabase()) {
    result.skipped = true;
    result.reason =
      "No database configured (DATABASE_URL unset). Subscriptions live in the DB, " +
      "so there is nothing to notify. Set DATABASE_URL to enable alerts.";
    return result;
  }

  // A real send needs an email provider. On a dry run we proceed regardless.
  if (!dryRun && resolveProvider() === "none") {
    result.skipped = true;
    result.reason =
      "No email provider configured (set RESEND_API_KEY). Run with --dry-run to " +
      "preview matches without sending.";
    return result;
  }

  let subs: SubscriptionRecord[];
  let changes: PublishedChangeDetail[];
  try {
    [subs, changes] = await Promise.all([
      confirmedSubscriptions(),
      getPublishedChangesDetailed({ limit: opts.limit ?? 200 }),
    ]);
  } catch (err) {
    result.skipped = true;
    result.reason = `Failed to load subscriptions/changes: ${
      err instanceof Error ? err.message : String(err)
    }`;
    return result;
  }

  result.subscriptions = subs.length;
  result.changesConsidered = changes.length;
  const base = baseUrl(opts);
  const now = new Date();

  for (const sub of subs) {
    const matching = changesFor(sub, changes);
    if (matching.length === 0) continue;
    result.matched += 1;

    const unsubUrl = `${base}/api/unsubscribe?token=${encodeURIComponent(sub.unsubToken)}`;
    const mail = digestEmail(matching, unsubUrl);

    if (dryRun) {
      console.log(
        `[alerts] (dry-run) would email ${sub.email} — ${matching.length} change(s): ` +
          matching.map((c) => `${c.stateCode}/${c.headline}`).join("; "),
      );
      continue;
    }

    const delivery = await sendEmail({ to: sub.email, ...mail });
    if (delivery.delivered) {
      result.sent += 1;
      // Advance the high-water mark only on a successful send, so a transient
      // failure re-tries the same changes next run (idempotent + at-least-once).
      await markNotified(sub.id, now);
    } else {
      result.failed += 1;
      result.warnings.push(
        `Send to ${sub.email} failed: ${delivery.error ?? delivery.reason ?? "unknown"}`,
      );
    }
  }

  return result;
}
