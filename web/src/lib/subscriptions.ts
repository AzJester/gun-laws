// Subscription helpers (roadmap #6).
//
// Thin server-only layer over the Subscription model. All DB access is lazy and
// guarded by hasDatabase() — with no DATABASE_URL these helpers return a clear
// "not configured" signal instead of throwing, so the API routes can answer 503
// gracefully and the build never needs a database.

import { randomBytes } from "node:crypto";

import { getPrisma, hasDatabase } from "./prisma";

export interface SubscriptionScope {
  states: string[]; // uppercase 2-letter codes; [] = all states
  policies: string[]; // policy keys; [] = all policies
}

export type SubscribeChannel = "email" | "rss";

export interface SubscribeInput {
  email: string;
  states?: string[];
  policies?: string[];
  channel?: SubscribeChannel;
}

export interface SubscriptionRecord {
  id: number;
  email: string;
  scope: SubscriptionScope;
  channel: SubscribeChannel;
  status: "pending" | "confirmed" | "unsubscribed";
  confirmToken: string;
  unsubToken: string;
  lastNotifiedAt: Date | null;
}

// RFC-5322-lite: good enough to reject obvious garbage without false negatives.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

export function normalizeScope(
  states?: string[],
  policies?: string[],
): SubscriptionScope {
  const cleanStates = Array.from(
    new Set(
      (states ?? [])
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => /^[A-Z]{2}$/.test(s)),
    ),
  );
  const cleanPolicies = Array.from(
    new Set(
      (policies ?? [])
        .map((p) => String(p).trim())
        .filter((p) => /^[a-z_]+$/.test(p)),
    ),
  );
  return { states: cleanStates, policies: cleanPolicies };
}

/** True when a change for (stateCode, policyKey?) matches a subscription scope. */
export function scopeMatches(
  scope: SubscriptionScope,
  stateCode: string,
  policyKey?: string | null,
): boolean {
  const stateOk =
    scope.states.length === 0 || scope.states.includes(stateCode.toUpperCase());
  if (!stateOk) return false;
  // An empty policy filter matches everything. A change with no policyKey still
  // matches a state-only subscription, but is filtered out when the subscriber
  // narrowed to specific policies (they asked only about those).
  if (scope.policies.length === 0) return true;
  if (!policyKey) return false;
  return scope.policies.includes(policyKey);
}

function token(): string {
  return randomBytes(24).toString("base64url");
}

function asScope(raw: unknown): SubscriptionScope {
  const o = (raw ?? {}) as Partial<SubscriptionScope>;
  return {
    states: Array.isArray(o.states) ? o.states.map(String) : [],
    policies: Array.isArray(o.policies) ? o.policies.map(String) : [],
  };
}

export interface CreateResult {
  ok: boolean;
  reason?: string;
  subscription?: SubscriptionRecord;
  /** True when an existing pending/confirmed sub was reused (re-sent confirm). */
  resent?: boolean;
}

/**
 * Create (or revive) a pending subscription and return its confirm/unsub tokens.
 * Idempotent on (email, scope-ish): a repeat for the same email refreshes the
 * confirm token and re-enters pending, so a lost confirmation can be re-sent.
 */
export async function createPendingSubscription(
  input: SubscribeInput,
): Promise<CreateResult> {
  if (!hasDatabase()) {
    return { ok: false, reason: "no_database" };
  }
  if (!isValidEmail(input.email)) {
    return { ok: false, reason: "invalid_email" };
  }

  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  const scope = normalizeScope(input.states, input.policies);
  const channel: SubscribeChannel = input.channel === "rss" ? "rss" : "email";

  // Reuse an existing row for this email if present (avoid duplicate sign-ups);
  // refresh its scope + confirm token and move it back to pending.
  const existing = await prisma.subscription.findFirst({ where: { email } });
  const confirmToken = token();

  if (existing) {
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        scope: scope as unknown as object,
        channel,
        status: "pending",
        confirmToken,
        confirmedAt: null,
      },
    });
    return { ok: true, resent: true, subscription: toRecord(updated) };
  }

  const created = await prisma.subscription.create({
    data: {
      email,
      scope: scope as unknown as object,
      channel,
      status: "pending",
      confirmToken,
      unsubToken: token(),
    },
  });
  return { ok: true, subscription: toRecord(created) };
}

/** Confirm a pending subscription by its confirm token. */
export async function confirmSubscription(
  confirmToken: string,
): Promise<{ ok: boolean; reason?: string; email?: string }> {
  if (!hasDatabase()) return { ok: false, reason: "no_database" };
  if (!confirmToken) return { ok: false, reason: "missing_token" };

  const prisma = getPrisma();
  const sub = await prisma.subscription.findUnique({ where: { confirmToken } });
  if (!sub) return { ok: false, reason: "not_found" };

  if (sub.status === "confirmed") return { ok: true, email: sub.email };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "confirmed", confirmedAt: new Date() },
  });
  return { ok: true, email: sub.email };
}

/** Deactivate a subscription by its unsubscribe token. */
export async function unsubscribe(
  unsubToken: string,
): Promise<{ ok: boolean; reason?: string; email?: string }> {
  if (!hasDatabase()) return { ok: false, reason: "no_database" };
  if (!unsubToken) return { ok: false, reason: "missing_token" };

  const prisma = getPrisma();
  const sub = await prisma.subscription.findUnique({ where: { unsubToken } });
  if (!sub) return { ok: false, reason: "not_found" };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "unsubscribed" },
  });
  return { ok: true, email: sub.email };
}

/** All confirmed email subscriptions (for the alert dispatcher). */
export async function confirmedSubscriptions(): Promise<SubscriptionRecord[]> {
  if (!hasDatabase()) return [];
  const prisma = getPrisma();
  const rows = await prisma.subscription.findMany({
    where: { status: "confirmed", channel: "email" },
  });
  return rows.map(toRecord);
}

export async function markNotified(id: number, at: Date): Promise<void> {
  if (!hasDatabase()) return;
  const prisma = getPrisma();
  await prisma.subscription.update({
    where: { id },
    data: { lastNotifiedAt: at },
  });
}

function toRecord(row: {
  id: number;
  email: string;
  scope: unknown;
  channel: string;
  status: string;
  confirmToken: string;
  unsubToken: string;
  lastNotifiedAt: Date | null;
}): SubscriptionRecord {
  return {
    id: row.id,
    email: row.email,
    scope: asScope(row.scope),
    channel: row.channel === "rss" ? "rss" : "email",
    status: row.status as SubscriptionRecord["status"],
    confirmToken: row.confirmToken,
    unsubToken: row.unsubToken,
    lastNotifiedAt: row.lastNotifiedAt,
  };
}
