"use client";

import Link from "next/link";

import StateDetailView from "./StateDetailView";

import type { Orientation } from "@/lib/grading";
import type { StateDetail as StateDetailType } from "@/lib/types";

interface StateDetailProps {
  detail: StateDetailType | null;
  loading: boolean;
  orient?: Orientation;
}

export default function StateDetail({
  detail,
  loading,
  orient = "rights",
}: StateDetailProps) {
  if (loading && !detail) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }
  if (!detail) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Select a state on the map to see its laws.
      </p>
    );
  }

  return (
    <div>
      <StateDetailView detail={detail} orient={orient} />
      <div className="mt-3 border-t border-[var(--border)] pt-2.5">
        <Link
          href={`/state/${detail.code.toLowerCase()}`}
          className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
        >
          Open full page →
        </Link>
      </div>
    </div>
  );
}
