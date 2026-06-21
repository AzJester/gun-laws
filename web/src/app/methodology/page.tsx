import type { Metadata } from "next";
import Link from "next/link";

import { ORIENTATION_LABEL } from "@/lib/grading";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How GunLawMap sources, scores, and verifies state firearm-law data: the State Firearm Laws Database baseline, the 134 tracked provisions, how grades are derived, the two grade orientations, and our update pipeline.",
  alternates: { canonical: "/methodology" },
};

const GRADE_BUCKETS: { grade: string; range: string }[] = [
  { grade: "A", range: "0–9 tracked laws" },
  { grade: "A-", range: "10–19" },
  { grade: "B", range: "20–29" },
  { grade: "C", range: "30–44" },
  { grade: "D", range: "45–59" },
  { grade: "D-", range: "60–79" },
  { grade: "F", range: "80+ (most laws)" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="m-0 mb-2 text-lg font-semibold">{title}</h2>
      <div className="text-[14px] leading-relaxed text-[var(--text-2)]">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main id="main" className="mx-auto max-w-[820px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold">Methodology</h1>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <Link href="/" className="hover:text-[var(--accent)] hover:underline">
            ← Map
          </Link>
          <Link href="/federal" className="hover:text-[var(--accent)] hover:underline">
            Federal law
          </Link>
          <Link href="/glossary" className="hover:text-[var(--accent)] hover:underline">
            Glossary
          </Link>
          <Link href="/about" className="hover:text-[var(--accent)] hover:underline">
            About
          </Link>
        </nav>
      </div>

      <p className="text-[14px] leading-relaxed text-[var(--muted)]">
        GunLawMap turns a peer-reviewed firearm-law dataset into an interactive
        atlas. This page documents exactly where the data comes from, how the
        grade is computed, the value choices baked into that grade, and how we
        keep it current. None of this is legal advice.
      </p>

      <Section title="Data source">
        <p className="m-0">
          The baseline is the{" "}
          <a
            className="text-[var(--accent)] hover:underline"
            href="https://www.statefirearmlaws.org/"
          >
            State Firearm Laws Database
          </a>{" "}
          (Siegel et al., Boston University), which codes the presence/absence of
          firearm-law provisions for every state and year. We use the <b>2020
          baseline</b> and layer a <b>curated 2021–2025 overlay</b> of
          legislative and court changes on top of it. Provision labels shown here
          are <b>simplified renderings of the database codebook</b> — readable
          summaries, not verbatim statutory text. Map geometry comes from{" "}
          <a
            className="text-[var(--accent)] hover:underline"
            href="https://github.com/topojson/us-atlas"
          >
            us-atlas
          </a>{" "}
          (US Census, public domain).
        </p>
      </Section>

      <Section title="What we track: 134 provisions across 14 categories">
        <p className="m-0">
          The database codes <b>134 distinct provisions</b> grouped into <b>14
          categories</b> (e.g. dealer regulations, buyer regulations, prohibited
          people, background checks, ammunition, possession, concealed carry,
          assault weapons / large-capacity magazines, child access, gun
          trafficking, domestic violence, and more). A state&rsquo;s{" "}
          <code className="rounded bg-[var(--panel-2)] px-1">lawtotal</code> is
          the count of those 134 provisions in effect.
        </p>
      </Section>

      <Section title="How the grade is derived">
        <p className="m-0 mb-3">
          The overall grade is a direct function of{" "}
          <code className="rounded bg-[var(--panel-2)] px-1">lawtotal</code>:
          fewer tracked laws &rarr; a higher letter (in the default gun-rights
          orientation). The cutoffs are:
        </p>
        <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--panel-2)] text-left text-[var(--muted)]">
                <th className="px-3 py-2 font-semibold">Grade</th>
                <th className="px-3 py-2 font-semibold">lawtotal range</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_BUCKETS.map((b) => (
                <tr key={b.grade} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-bold">{b.grade}</td>
                  <td className="px-3 py-2 text-[var(--text-2)]">{b.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="The grade, and a neutral count view">
        <p className="m-0 mb-2">
          The grade always reads one way: <b>fewer laws/restrictions earns a
          higher grade</b> (A = fewest, F = most). Arizona, with very few tracked
          restrictions, is an A; California, with many, is an F. This is the
          opposite direction from gun-safety scorecards, which is a deliberate,
          stated choice — the grade measures restriction count, not policy
          desirability. The map offers two views:
        </p>
        <ul className="m-0 list-disc pl-5">
          <li className="mb-1">
            <b>{ORIENTATION_LABEL.rights}</b> — the default. The letter grade,
            with A = fewest restrictions and F = the most.
          </li>
          <li>
            <b>{ORIENTATION_LABEL.count}</b> — a neutral view that drops the
            letter entirely and shades states purely by how many of the 134
            tracked laws are in effect, for readers who&rsquo;d rather see the raw
            number than any grade.
          </li>
        </ul>
        <p className="m-0 mt-2 text-[var(--muted)]">
          The toggle is presentation-only — it never changes the data, and your
          choice is remembered in the URL (<code>?orient=</code>) and your
          browser so a shared link reproduces the same view.
        </p>
      </Section>

      <Section title="Update pipeline">
        <p className="m-0">
          Beyond the 2020 baseline, we run a detect &rarr; classify &rarr; review
          &rarr; publish pipeline. Candidate changes are pulled from{" "}
          <b>LegiScan</b> and <b>Open States</b> (bills) and{" "}
          <b>CourtListener</b> (litigation), passed through a classifier that
          maps them to the affected provision(s), then <b>reviewed by an
          editor</b> before anything is published to the public map or{" "}
          <Link href="/changelog" className="text-[var(--accent)] hover:underline">
            changelog
          </Link>
          . Auto-detected drafts never appear publicly until approved.
        </p>
      </Section>

      <Section title="Citations, verified-through, and court handling">
        <p className="m-0">
          Each state carries a <b>verified-through</b> year indicating how
          current we believe its data is, and (in production) each provision
          links to the governing statute with a last-verified date. When a court{" "}
          <b>enjoins</b> or <b>strikes down</b> a provision, we do not silently
          delete it: the provision is flagged with its court status (e.g.{" "}
          <i>enjoined</i>, <i>struck down</i>) and surfaced in an
          &ldquo;Under litigation&rdquo; list, because an enjoined law may be
          reinstated on appeal.
        </p>
      </Section>

      <Section title="Limitations">
        <ul className="m-0 list-disc pl-5">
          <li className="mb-1">
            The baseline reflects 2020; states without a current overlay may lag
            behind very recent changes (see each state&rsquo;s verified-through
            year).
          </li>
          <li className="mb-1">
            Provision labels are simplified summaries, not statutory text, and a
            single letter grade necessarily flattens nuance.
          </li>
          <li className="mb-1">
            The map grades <i>state</i> law only; local ordinances and
            enforcement practices are out of scope. Federal law is summarized
            separately on the{" "}
            <Link
              href="/federal"
              className="text-[var(--accent)] hover:underline"
            >
              federal-law page
            </Link>{" "}
            (it applies in every state), and key terms are defined in the{" "}
            <Link
              href="/glossary"
              className="text-[var(--accent)] hover:underline"
            >
              glossary
            </Link>
            .
          </li>
          <li>
            The grade is a count of provisions, not a measure of outcomes or
            effectiveness.
          </li>
        </ul>
      </Section>

      <Section title="Not legal advice">
        <p className="m-0">
          GunLawMap is informational only and may contain errors or be out of
          date. It is <b>not legal advice</b>. Always verify against official
          state statutes and consult a licensed attorney before acting. To report
          a correction, see the{" "}
          <Link href="/about" className="text-[var(--accent)] hover:underline">
            About page
          </Link>
          .
        </p>
      </Section>
    </main>
  );
}
