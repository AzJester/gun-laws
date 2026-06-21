import type { Metadata } from "next";
import Link from "next/link";

import SubscribeForm from "@/components/SubscribeForm";
import { getStates } from "@/lib/data";
import { POLICY_KEYS, POLICY_LABELS } from "@/lib/types";

// Reads the state list at request time (DB or JSON fallback); keep dynamic so
// `next build` never renders it without a DB.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alerts & subscriptions",
  description:
    "Get notified when tracked US firearm laws change in the states and topics you care about. Email digests (double opt-in) or an RSS feed.",
};

export default async function AlertsPage() {
  const states = await getStates();
  const stateOptions = states.map((s) => ({ code: s.code, name: s.name }));
  const policyOptions = POLICY_KEYS.map((key) => ({
    key,
    label: POLICY_LABELS[key],
  }));

  return (
    <main className="mx-auto max-w-[860px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to the map
        </Link>
        <nav className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]">
          <Link href="/compare" className="hover:text-[var(--accent)] hover:underline">
            Compare
          </Link>
          <Link href="/reciprocity" className="hover:text-[var(--accent)] hover:underline">
            Reciprocity
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
      </div>

      <h1 className="m-0 text-2xl font-bold">Alerts &amp; subscriptions</h1>
      <p className="mt-1 max-w-[640px] text-sm text-[var(--muted)]">
        Get a short email digest when published firearm-law changes match the
        states and topics you choose. Prefer no email? Follow the{" "}
        <a href="/feed.xml" className="text-[var(--accent)] hover:underline">
          RSS / Atom feed
        </a>{" "}
        instead (filter to one state with{" "}
        <code className="rounded bg-[var(--panel-2)] px-1">?state=CA</code>).
      </p>

      <section className="mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <SubscribeForm states={stateOptions} policies={policyOptions} />
      </section>

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[#e3b341]">⚠ Not legal advice.</strong> Alerts
        track changes to the same dataset shown on the map (State Firearm Laws
        Database baseline + curated updates). They are informational only —
        always verify with official state resources and an attorney.
      </p>
    </main>
  );
}
