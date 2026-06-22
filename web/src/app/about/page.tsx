import type { Metadata } from "next";
import Link from "next/link";

import ThemeToggle from "@/components/ThemeToggle";
import { embedSnippet } from "@/lib/embed";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";
// Public origin + project base path (e.g. /gun-laws on Pages), used to build the
// copy-paste iframe snippets below.
const EMBED_BASE = `${SITE_URL}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`;

export const metadata: Metadata = {
  title: "About",
  description:
    "What GunLawMap is, who it is for, our neutrality stance, how to report a correction, how to embed it, and credits.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main id="main" className="mx-auto max-w-[760px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold">About GunLawMap</h1>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <ThemeToggle className="theme-toggle theme-toggle--inline" />
          <Link href="/" className="hover:text-[var(--accent)] hover:underline">
            ← Map
          </Link>
          <Link
            href="/methodology"
            className="hover:text-[var(--accent)] hover:underline"
          >
            Methodology
          </Link>
        </nav>
      </div>

      <section className="text-[14px] leading-relaxed text-[var(--text-2)]">
        <p className="mt-0">
          <b>GunLawMap</b> is an interactive atlas of US state firearm laws. It
          turns a peer-reviewed dataset into a clickable map so you can see, at a
          glance, which of 134 tracked provisions each state has in effect, how
          that rolls up into an overall grade, and what has changed recently.
        </p>

        <h2 className="mt-6 text-lg font-semibold">Who it&rsquo;s for</h2>
        <p>
          Journalists, researchers, students, advocates on either side of the
          debate, and anyone trying to understand the state-by-state landscape.
          It is a reference and education tool — not a substitute for primary
          statutes or legal counsel.
        </p>

        <h2 className="mt-6 text-lg font-semibold">
          Editorial standards &amp; neutrality
        </h2>
        <p>
          We aim to present the same facts to everyone. Because labeling one end
          of the scale &ldquo;A&rdquo; encodes a value judgment, the map ships a{" "}
          <Link
            href="/methodology"
            className="text-[var(--accent)] hover:underline"
          >
            neutrality toggle
          </Link>{" "}
          that lets you read the data as a letter grade (fewer restrictions = A)
          or as a neutral law-count view with no grade at all. The underlying
          numbers never change. Changes are reviewed by an editor before publishing, and
          court-affected provisions are flagged rather than removed. Full details
          are in the{" "}
          <Link
            href="/methodology"
            className="text-[var(--accent)] hover:underline"
          >
            methodology
          </Link>
          .
        </p>

        <h2 className="mt-6 text-lg font-semibold">Report a correction</h2>
        <p>
          Found an error or an out-of-date provision? Please tell us — accuracy
          depends on it. Email{" "}
          <a
            className="text-[var(--accent)] hover:underline"
            href="mailto:corrections@gunlawmap.example?subject=GunLawMap%20correction"
          >
            corrections@gunlawmap.example
          </a>{" "}
          with the state, the provision, and a citation if you have one.
          (Placeholder address for this demo.)
        </p>

        <h2 className="mt-6 text-lg font-semibold">Embed GunLawMap</h2>
        <p>
          Newsrooms and blogs can embed the map for free. The widget is a
          lightweight, framable page with no header, nav, or footer. Paste the
          national-map snippet anywhere:
        </p>
        <pre className="m-0 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-3 text-[11.5px] leading-relaxed text-[var(--text-2)]">
          <code>{embedSnippet(EMBED_BASE)}</code>
        </pre>
        <p className="mt-3">
          Or embed a single state&rsquo;s report card (Arizona shown):
        </p>
        <pre className="m-0 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-3 text-[11.5px] leading-relaxed text-[var(--text-2)]">
          <code>{embedSnippet(EMBED_BASE, "az")}</code>
        </pre>
        <p className="mt-3 text-[12.5px] text-[var(--muted)]">
          The national map accepts an optional{" "}
          <code className="rounded bg-[var(--panel-2)] px-1 py-0.5 text-[11.5px]">
            ?mode=
          </code>{" "}
          (grade, permitless_carry, universal_bg_check, red_flag) and{" "}
          <code className="rounded bg-[var(--panel-2)] px-1 py-0.5 text-[11.5px]">
            ?year=
          </code>{" "}
          query, e.g.{" "}
          <code className="rounded bg-[var(--panel-2)] px-1 py-0.5 text-[11.5px]">
            /embed?mode=red_flag&amp;year=2018
          </code>
          .
        </p>

        <h2 className="mt-6 text-lg font-semibold">Credits</h2>
        <ul className="list-disc pl-5">
          <li className="mb-1">
            Law data:{" "}
            <a
              className="text-[var(--accent)] hover:underline"
              href="https://www.statefirearmlaws.org/"
            >
              State Firearm Laws Database
            </a>{" "}
            (Siegel et al., Boston University).
          </li>
          <li className="mb-1">
            Map geometry:{" "}
            <a
              className="text-[var(--accent)] hover:underline"
              href="https://github.com/topojson/us-atlas"
            >
              us-atlas
            </a>{" "}
            (US Census Bureau cartographic boundaries, public domain).
          </li>
          <li>
            Update sources: LegiScan, Open States, and CourtListener (see the{" "}
            <Link
              href="/changelog"
              className="text-[var(--accent)] hover:underline"
            >
              changelog
            </Link>
            ).
          </li>
        </ul>

        <p className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12.5px] text-[var(--muted)]">
          <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong>{" "}
          GunLawMap is informational only and may contain errors. Always verify
          against official state statutes and consult an attorney.
        </p>
      </section>
    </main>
  );
}
