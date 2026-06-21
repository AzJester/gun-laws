// Email abstraction (roadmap #6).
//
// One function — sendEmail() — that picks a provider from the environment and
// degrades gracefully when none is configured. The default provider is Resend,
// called over its plain HTTP API with fetch (no SDK). The shape below is
// deliberately provider-agnostic so an SMTP transport can be slotted in later
// (add a branch in resolveProvider() + a send function with the same return
// type).
//
// Design rules:
//   - Never throws on a missing provider key: logs to console and returns
//     { delivered:false, skipped:true, reason } so callers/scripts exit 0.
//   - Never sends real mail under test (NODE_ENV==="test" or EMAIL_DRY_RUN=1):
//     logs and returns skipped, so unit tests can't hit the network.
//   - On a real provider error (network/egress 403, bad key, 4xx/5xx) it
//     returns { delivered:false, error } rather than throwing, so an alert
//     run can record the failure and move on.
//
// Server-only (uses fetch + env). Import from route handlers / scripts only.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Recommended for deliverability + accessibility. */
  text?: string;
  /** Override the From address for this message (defaults to EMAIL_FROM). */
  from?: string;
}

export interface EmailResult {
  /** True only when a provider accepted the message. */
  delivered: boolean;
  /** True when no provider was configured (or under test) — not an error. */
  skipped?: boolean;
  /** Provider name actually used, e.g. "resend". */
  provider?: string;
  /** Provider message id, when returned. */
  id?: string;
  /** Why the send was skipped (no provider / test mode). */
  reason?: string;
  /** Error detail when a configured provider failed. delivered is false. */
  error?: string;
}

const DEFAULT_FROM = "GunLawMap Alerts <alerts@gunlawmap.example>";

type Provider = "resend" | "none";

/** Which provider is configured. Add SMTP/Sendgrid/etc. branches here. */
export function resolveProvider(): Provider {
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

function isTestMode(): boolean {
  return process.env.NODE_ENV === "test" || process.env.EMAIL_DRY_RUN === "1";
}

function fromAddress(override?: string): string {
  return override ?? process.env.EMAIL_FROM ?? DEFAULT_FROM;
}

/**
 * Send one transactional email through the configured provider.
 *
 * Always resolves (never rejects). Inspect `.delivered` / `.skipped` / `.error`.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const provider = resolveProvider();

  // Test mode: log and skip, regardless of provider, so tests never send.
  if (isTestMode()) {
    console.log(
      `[email] test/dry-run mode — not sending. to=${msg.to} subject="${msg.subject}"`,
    );
    return { delivered: false, skipped: true, reason: "test_mode" };
  }

  if (provider === "none") {
    console.log(
      `[email] no provider configured (set RESEND_API_KEY) — logging instead. ` +
        `to=${msg.to} subject="${msg.subject}"`,
    );
    return {
      delivered: false,
      skipped: true,
      reason:
        "No email provider configured. Set RESEND_API_KEY to enable delivery.",
    };
  }

  if (provider === "resend") {
    return sendViaResend(msg);
  }

  // Unreachable, but keeps the function total.
  return { delivered: false, skipped: true, reason: "unknown_provider" };
}

/** Resend HTTP API: POST https://api.resend.com/emails (no SDK). */
async function sendViaResend(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY!;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(msg.from),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const reason =
        res.status === 403
          ? `Resend returned 403 (egress blocked or invalid key): ${detail.slice(0, 200)}`
          : `Resend error ${res.status}: ${detail.slice(0, 200)}`;
      console.error(`[email] ${reason}`);
      return { delivered: false, provider: "resend", error: reason };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { delivered: true, provider: "resend", id: data.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[email] Resend request failed: ${reason}`);
    return { delivered: false, provider: "resend", error: reason };
  }
}
