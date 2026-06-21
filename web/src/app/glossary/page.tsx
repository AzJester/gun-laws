import type { Metadata } from "next";
import Link from "next/link";

import {
  CATEGORY_EXPLAINERS,
  CATEGORY_TITLES,
  GLOSSARY,
} from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Glossary & explainers",
  description:
    "Plain-language definitions of key firearm-law terms (NICS, FFL, " +
    "permitless carry, may-issue vs. shall-issue, ERPO/red-flag, assault weapon, " +
    "large-capacity magazine, NFA, suppressor, preemption, straw purchase, and " +
    "more) plus an explainer for every provision category on the map.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  return (
    <main id="main" className="mx-auto max-w-[820px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-bold">Glossary &amp; explainers</h1>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <Link href="/" className="hover:text-[var(--accent)] hover:underline">
            ← Map
          </Link>
          <Link
            href="/federal"
            className="hover:text-[var(--accent)] hover:underline"
          >
            Federal law
          </Link>
          <Link
            href="/methodology"
            className="hover:text-[var(--accent)] hover:underline"
          >
            Methodology
          </Link>
        </nav>
      </div>

      <p className="text-[14px] leading-relaxed text-[var(--muted)]">
        The map and each state&rsquo;s provision list use a lot of specialized
        terms. This page defines the key ones in plain language, and explains
        what every provision category covers. Definitions are informational only,
        not legal advice.
      </p>

      <section className="mt-7">
        <h2 className="m-0 mb-3 text-lg font-semibold">Key terms</h2>
        <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GLOSSARY.map((t) => (
            <div
              key={t.id}
              id={t.id}
              className="scroll-mt-20 rounded-[10px] border border-[var(--border)] bg-[var(--panel)] p-3.5"
            >
              <dt className="m-0 text-[14px] font-semibold text-[var(--text)]">
                {t.term}
              </dt>
              <dd className="m-0 mt-1 text-[13px] leading-relaxed text-[var(--text-2)]">
                {t.definition}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="m-0 mb-1 text-lg font-semibold">
          Provision categories explained
        </h2>
        <p className="m-0 mb-3 text-[13px] text-[var(--muted)]">
          Each state&rsquo;s laws are grouped into these categories on its detail
          page.
        </p>
        <dl className="m-0">
          {CATEGORY_TITLES.map((title) => (
            <div
              key={title}
              className="border-t border-[var(--border)] py-2.5 first:border-t-0"
            >
              <dt className="m-0 text-[14px] font-semibold text-[var(--text)]">
                {title}
              </dt>
              <dd className="m-0 mt-0.5 text-[13px] leading-relaxed text-[var(--text-2)]">
                {CATEGORY_EXPLAINERS[title]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong>{" "}
        These definitions are simplified for a general reader and may omit
        exceptions. Always verify against official state statutes and federal law.
      </p>
    </main>
  );
}
