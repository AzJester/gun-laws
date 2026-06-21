import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import StateDetailView from "@/components/StateDetailView";
import { getState, getStates } from "@/lib/data";
import { displayGrade, DESC, GRADES } from "@/lib/grading";
import { DISCLAIMER } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";

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
  const safetyGrade = displayGrade(state.grade, "safety");

  // schema.org structured data describing this state's firearm-law summary as a
  // Dataset, with the primary source attribution.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${state.name} firearm laws summary`,
    description:
      `Summary of ${state.name} state firearm laws: Grade ${state.grade} ` +
      `(${state.lawCount === null ? "law count pending" : `${state.lawCount} of 134 tracked laws`}) ` +
      `in the gun-rights orientation (A = fewest restrictions), or Grade ${safetyGrade} in the gun-safety orientation. ` +
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
    <main className="mx-auto max-w-[860px] px-6 py-8 text-[var(--text)]">
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
        <nav className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]">
          <Link href="/methodology" className="hover:text-[var(--accent)] hover:underline">
            Methodology
          </Link>
          <Link href="/about" className="hover:text-[var(--accent)] hover:underline">
            About
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
      </div>

      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <StateDetailView detail={state} orient="rights" />
      </section>

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[#e3b341]">⚠ Not legal advice.</strong> {DISCLAIMER}{" "}
        <Link href="/methodology" className="text-[var(--accent)] hover:underline">
          Read the methodology
        </Link>
        .
      </p>
    </main>
  );
}
