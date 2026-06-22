"use client";

import { usePathname } from "next/navigation";

// Global copyright footer, rendered once in the root layout so it appears on
// every page. Hidden on /embed routes — those are meant to be minimal, chromeless
// iframes for newsrooms, so a footer would intrude on the embedded widget.
//
// The year is fixed at build time (the deploy is rebuilt regularly), keeping SSR
// and the first client render identical (no hydration mismatch).
const COPYRIGHT_YEAR = 2026;

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;

  return (
    <footer className="border-t border-[var(--border)] px-6 py-5 text-center text-[12px] text-[var(--muted)]">
      © {COPYRIGHT_YEAR} Dr. Shane Turner. All rights reserved. · GunLawMap is
      informational only and not legal advice.
    </footer>
  );
}
