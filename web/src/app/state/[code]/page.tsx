import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import StateDetailView from "@/components/StateDetailView";
import { getState, getStates } from "@/lib/data";
import { DESC, GRADES } from "@/lib/grading";
import { embedSnippet } from "@/lib/embed";
import { honoredIn, isPermitless } from "@/lib/reciprocity";
import { DISCLAIMER } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";
// In the Pages export the site lives under a project base path (/gun-laws); in
// server mode it's at the origin root. Embed URLs in the snippet use the public
// origin + base path so the pasted iframe resolves on the deployed site.
const EMBED_BASE = `${SITE_URL}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`;

// SSG: with DATABASE_URL unset, getState() reads data/sample-states.json at build
// time, so every /state/[code] page is statically generated. No `dynamic` export.
export async function generateStaticParams(): Promise<{ code: string }[]> {
  const states = await getStates();
  return states.map((s) => ({ code: s.code.toLowerCase() }));
}

// Pre-render only the codes from generateStaticParams; never fall through to SSR.
export const dynamicParams = false;

function headlinePolicies(policies: {
  permitless_carry: boolean;
  universal_bg_check: boolean;
  red_flag: boolean;
}): string {
  const parts: string[] = [];
  parts.push(
    policies.permitless_carry
      ? "no carry permit required"
      : "a carry permit is required",
  );
  parts.push(
    policies.universal_bg_check
      ? "universal background checks"
      : "no universal background checks",
  );
  parts.push(policies.red_flag ? "a red-flag law" : "no red-flag law");
  return parts.join(", ");
}

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const state = await getState(params.code);
  if (!state) {
    return { title: "State not found" };
  }
  const lawText =
    state.lawCount === null
      ? "law data pending"
      : `${state.lawCount} of 134 tracked laws`;
  const title = `${state.name} gun laws (Grade ${state.grade})`;
  const description =
    `${state.name} earns Grade ${state.grade} on GunLawMap — ${DESC[GRADES.indexOf(state.grade)] ?? "tracked laws"} ` +
    `(${lawText}). Headline policies: ${headlinePolicies(state.policies)}. ` +
    `Grade orientation: A = fewest restrictions. Informational only, not legal advice.`;
  const url = `${SITE_URL}/state/${state.code.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical: `/state/${state.code.toLowerCase()}` },
    openGraph: {
      type: "article",
      title: `${title} — GunLawMap`,
      description,
      url,
    },
    twitter: {
      card: "summary",
      title: `${title} — GunLawMap`,
      description,
    },
  };
}

export default async function StatePage({
  params,
}: {
  params: { code: string };
}) {
  const state = await getState(params.code);
  if (!state) notFound();

  const url = `${SITE_URL}/state/${state.code.toLowerCase()}`;

  // Illustrative concealed-carry reciprocity summary (sample data; see /reciprocity).
  const recip = honoredIn(state.code);
  const recipPermitless = isPermitless(state.code);

  // schema.org structured data describing this state's firearm-law summary as a
  // Dataset, with the primary source attribution.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${state.name} firearm laws summary`,
    description:
      `Summary of ${state.name} state firearm laws: Grade ${state.grade} ` +
      `(${state.lawCount === null ? "law count pending" : `${state.lawCount} of 134 tracked laws`}), ` +
      `where A = fewest restrictions and F = the most. ` +
      `Informational only, not legal advice.`,
    url,
    isAccessibleForFree: true,
    license: "https://www.statefirearmlaws.org/",
    creator: {
      "@type": "Organization",
      name: "GunLawMap",
      url: SITE_URL,
    },
    spatialCoverage: {
      "@type": "AdministrativeArea",
      name: state.name,
    },
    temporalCoverage: state.verifiedThrough
      ? String(state.verifiedThrough)
      : "2020",
    isBasedOn: (state.sources ?? []).map((s) => ({
      "@type": "CreativeWork",
      name: s.label,
      url: s.url,
    })),
    keywords: [
      "firearm laws",
      "gun laws",
      state.name,
      `Grade ${state.grade}`,
    ],
  };

  return (
    <main id="main" className="mx-auto max-w-[860px] px-6 py-8 text-[var(--text)]">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          ← Back to the map
        </Link>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <Link
            href={`/compare?states=${state.code}`}
            className="hover:text-[var(--accent)] hover:underline"
          >
            Compare
          </Link>
          <Link href="/reciprocity" className="hover:text-[var(--accent)] hover:underline">
            Reciprocity
          </Link>
          <Link href="/alerts" className="hover:text-[var(--accent)] hover:underline">
            Alerts
          </Link>
          <Link href="/federal" className="hover:text-[var(--accent)] hover:underline">
            Federal law
          </Link>
          <Link href="/glossary" className="hover:text-[var(--accent)] hover:underline">
            Glossary
          </Link>
          <Link href="/methodology" className="hover:text-[var(--accent)] hover:underline">
            Methodology
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
      </div>

      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <StateDetailView detail={state} orient="rights" titleAs="h1" />
      </section>

      {/* Illustrative concealed-carry reciprocity summary. */}
      <section className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <h2 className="m-0 mb-1 flex items-center gap-2 text-[15px] font-semibold">
          <span aria-hidden="true">🧭</span> Concealed-carry reciprocity
          <span className="rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2 py-0.5 text-[9.5px] font-bold uppercase text-[var(--warn-strong)]">
            sample data
          </span>
        </h2>
        <p className="m-0 mb-2 text-[12.5px] text-[var(--muted)]">
          {recipPermitless ? (
            <>
              {state.name} allows <b>permitless (constitutional) carry</b>. A{" "}
              {state.name} permit is illustratively honored in{" "}
              <b>{recip.byPermit.length}</b> other state(s); a permit isn&apos;t
              required at all in <b>{recip.permitless.length}</b> permitless states.
            </>
          ) : (
            <>
              A {state.name} resident permit is illustratively honored in{" "}
              <b>{recip.byPermit.length}</b> state(s) by reciprocity, plus{" "}
              <b>{recip.permitless.length}</b> permitless states.
            </>
          )}{" "}
          <Link
            href="/reciprocity"
            className="text-[var(--accent)] hover:underline"
          >
            See the full reciprocity view →
          </Link>
        </p>
        <p className="m-0 text-[11px] text-[var(--muted)]">
          Illustrative only. Reciprocity changes frequently and depends on permit
          type/residency — verify with both states before traveling armed.
        </p>
      </section>

      {/* Embed this card on a newsroom / blog. */}
      <section className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <h2 className="m-0 mb-1 flex items-center gap-2 text-[15px] font-semibold">
          <span aria-hidden="true">🔗</span> Embed this {state.name} report card
        </h2>
        <p className="m-0 mb-2 text-[12.5px] text-[var(--muted)]">
          Paste this snippet to embed the {state.name} report card on your site. For
          the full national map, use{" "}
          <code className="rounded bg-[var(--panel-2)] px-1 py-0.5 text-[11.5px]">
            /embed
          </code>{" "}
          instead of{" "}
          <code className="rounded bg-[var(--panel-2)] px-1 py-0.5 text-[11.5px]">
            /embed/{state.code.toLowerCase()}
          </code>
          .
        </p>
        <pre className="m-0 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-3 text-[11.5px] leading-relaxed text-[var(--text-2)]">
          <code>{embedSnippet(EMBED_BASE, state.code)}</code>
        </pre>
      </section>

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong> {DISCLAIMER}{" "}
        <Link href="/methodology" className="text-[var(--accent)] hover:underline">
          Read the methodology
        </Link>
        .
      </p>
    </main>
  );
}
