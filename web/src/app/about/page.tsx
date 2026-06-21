import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "What GunLawMap is, who it is for, our neutrality stance, how to report a correction, and credits.",
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

      <section className="text-[14px] leading-relaxed text-[#cdd7e1]">
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
          that lets you read the data through a gun-rights lens (fewer
          restrictions = A), a gun-safety lens (more protections = A), or a
          neutral law-count view with no grade at all. The underlying numbers
          never change. Changes are reviewed by an editor before publishing, and
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
          <strong className="text-[#e3b341]">⚠ Not legal advice.</strong>{" "}
          GunLawMap is informational only and may contain errors. Always verify
          against official state statutes and consult an attorney.
        </p>
      </section>
    </main>
  );
}
