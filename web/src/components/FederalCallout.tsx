// Compact "Federal law also applies" callout shown in the state detail.
//
// A permissive state is not a "no rules" zone — federal law applies in every
// state on top of state law. This callout is deliberately styled distinctly from
// the (teal/state) provision UI: a federal blue accent and a flag mark, so it
// reads unmistakably as a separate, federal layer.
//
// No "use client" directive, so it renders in both the client MapExplorer
// (via StateDetailView) and the server-rendered /state/[code] page.

import Link from "next/link";

import { FEDERAL_CALLOUT_SUMMARY } from "@/lib/federal";

export default function FederalCallout() {
  return (
    <div className="mb-4 rounded-[10px] border border-[var(--info-border)] bg-[var(--info-bg)] p-3.5">
      <h3 className="m-0 mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--info-strong)]">
        <span aria-hidden="true" className="text-[14px]">
          🇺🇸
        </span>
        Federal law also applies
      </h3>
      <p className="m-0 text-[12.5px] leading-snug text-[var(--info-fg)]">
        {FEDERAL_CALLOUT_SUMMARY}{" "}
        <Link
          href="/federal"
          className="font-semibold text-[var(--info-strong)] hover:underline"
        >
          See federal firearm law →
        </Link>
      </p>
    </div>
  );
}
