import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import {
  createPendingSubscription,
  isValidEmail,
  type SubscribeChannel,
} from "@/lib/subscriptions";

// Dynamic + nodejs: touches the DB at request time, never at build/import.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SubscribeBody {
  email?: string;
  states?: string[];
  policies?: string[];
  channel?: SubscribeChannel;
}

function siteUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Fall back to the request origin so links work in any deployment.
  try {
    return new URL(req.url).origin;
  } catch {
    return "https://gunlawmap.example";
  }
}

function confirmEmail(base: string, confirmToken: string, unsubToken: string) {
  const confirmUrl = `${base}/api/subscribe/confirm?token=${encodeURIComponent(confirmToken)}`;
  const unsubUrl = `${base}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const html = `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#1a2530;line-height:1.5">
  <h2 style="margin:0 0 8px">Confirm your GunLawMap alerts</h2>
  <p>You (or someone using this address) asked to receive firearm-law change alerts.
  Confirm to start receiving them:</p>
  <p><a href="${confirmUrl}" style="display:inline-block;background:#2a7a74;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm subscription</a></p>
  <p style="font-size:13px;color:#566">If the button doesn't work, paste this link:<br>${confirmUrl}</p>
  <hr style="border:none;border-top:1px solid #e3e8ee;margin:18px 0">
  <p style="font-size:12px;color:#778">Didn't request this? Ignore this email — you won't be subscribed.
  You can <a href="${unsubUrl}">unsubscribe</a> at any time. Informational only, not legal advice.</p>
  </body></html>`;
  const text = [
    "Confirm your GunLawMap alerts",
    "",
    "Confirm to start receiving firearm-law change alerts:",
    confirmUrl,
    "",
    "Didn't request this? Ignore this email. Unsubscribe: " + unsubUrl,
    "Informational only, not legal advice.",
  ].join("\n");
  return { subject: "Confirm your GunLawMap alerts", html, text };
}

/**
 * POST /api/subscribe
 * Body: { email, states?: string[], policies?: string[], channel?: "email"|"rss" }
 *
 * Creates a PENDING subscription with a random confirm token and sends a
 * double-opt-in confirmation email. Minimal PII. Graceful, non-crashing
 * responses for: invalid email (400), no database (503), email-provider not
 * configured (still 200 — the subscription exists, but tells the caller the
 * confirmation could not be delivered).
 */
export async function POST(req: Request) {
  let body: SubscribeBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  const result = await createPendingSubscription({
    email: body.email,
    states: body.states,
    policies: body.policies,
    channel: body.channel,
  });

  if (!result.ok) {
    if (result.reason === "no_database") {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error:
            "Subscriptions are not configured on this deployment (no database). " +
            "You can still follow the RSS feed at /feed.xml.",
        },
        { status: 503 },
      );
    }
    if (result.reason === "invalid_email") {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not create subscription." },
      { status: 500 },
    );
  }

  const sub = result.subscription!;
  const base = siteUrl(req);
  const mail = confirmEmail(base, sub.confirmToken, sub.unsubToken);
  const delivery = await sendEmail({ to: sub.email, ...mail });

  return NextResponse.json({
    ok: true,
    pending: true,
    // Don't echo the email back beyond what the caller already sent.
    delivered: delivery.delivered,
    // Distinguish "we couldn't email you" from "subscription failed".
    emailConfigured: !delivery.skipped || delivery.reason === "test_mode",
    message: delivery.delivered
      ? "Check your email to confirm your subscription."
      : "Subscription created, but the confirmation email could not be sent " +
        "(email provider not configured). Ask the operator to set RESEND_API_KEY.",
  });
}
