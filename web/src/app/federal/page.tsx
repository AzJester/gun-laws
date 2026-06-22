import type { Metadata } from "next";
import Link from "next/link";

import ThemeToggle from "@/components/ThemeToggle";
import { FEDERAL_DISCLAIMER, FEDERAL_LAWS } from "@/lib/federal";

export const metadata: Metadata = {
  title: "Federal firearm law",
  description:
    "Key federal firearm laws that apply in every state, on top of state law: " +
    "NICS background checks, federal prohibited persons, minimum purchase ages, " +
    "the straw-purchase ban, NFA items, and interstate-transport protections. " +
    "Informational only, not legal advice.",
  alternates: { canonical: "/federal" },
};

export default function FederalPage() {
  return (
    <main id="main" className="mx-auto max-w-[820px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-bold">Federal firearm law</h1>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <ThemeToggle className="theme-toggle theme-toggle--inline" />
          <Link href="/" className="hover:text-[var(--accent)] hover:underline">
            ← Map
          </Link>
          <Link
            href="/glossary"
            className="hover:text-[var(--accent)] hover:underline"
          >
            Glossary
          </Link>
          <Link
            href="/methodology"
            className="hover:text-[var(--accent)] hover:underline"
          >
            Methodology
          </Link>
        </nav>
      </div>

      <div className="rounded-[12px] border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
        <p className="m-0 text-[14px] leading-relaxed text-[var(--info-fg)]">
          <b className="text-[var(--info-strong)]">Federal law applies in every state, on
          top of state law.</b>{" "}
          A permissive state is not a &ldquo;no rules&rdquo; zone. The map grades
          and lists <i>state</i> provisions, but the federal rules below apply
          nationwide — and state or local law may add more on top. These are the
          backbone provisions most readers should know.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {FEDERAL_LAWS.map((law) => (
          <section
            key={law.id}
            id={law.id}
            className="scroll-mt-20 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4"
          >
            <h2 className="m-0 mb-1 flex flex-wrap items-baseline gap-2 text-[16px] font-semibold">
              {law.title}
              {law.url ? (
                <a
                  href={law.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[12px] font-normal text-[var(--accent)] hover:underline"
                >
                  {law.citation}
                </a>
              ) : (
                <span className="text-[12px] font-normal text-[var(--muted)]">
                  {law.citation}
                </span>
              )}
            </h2>
            <p className="m-0 text-[14px] leading-relaxed text-[var(--text-2)]">
              {law.summary}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong>{" "}
        {FEDERAL_DISCLAIMER}{" "}
        <Link
          href="/methodology"
          className="text-[var(--accent)] hover:underline"
        >
          Read the methodology
        </Link>
        .
      </p>
    </main>
  );
}
