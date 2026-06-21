// Seed data for the "recent & pending changes" feed, mirrored from the mockup.
// Used both by the JSON fallback (src/lib/data.ts) and the Prisma seed
// (prisma/seed.ts) so the two stay in sync.

import type { ChangeKind } from "./types";

export interface ChangeSeed {
  /** Display date string, e.g. "Jun 15 '26". */
  display: string;
  /** ISO date for DB storage. */
  iso: string;
  stateCode: string;
  kind: ChangeKind;
  tagLabel: string;
  headline: string;
}

export const CHANGES: ChangeSeed[] = [
  {
    display: "Jun 15 '26",
    iso: "2026-06-15",
    stateCode: "LA",
    kind: "effective",
    tagLabel: "Effective",
    headline: "Permitless carry implementation guidance issued to sheriffs.",
  },
  {
    display: "May 02 '26",
    iso: "2026-05-02",
    stateCode: "CO",
    kind: "effective",
    tagLabel: "Effective",
    headline: "6.5% firearms & ammunition excise tax takes effect.",
  },
  {
    display: "Apr 18 '26",
    iso: "2026-04-18",
    stateCode: "ME",
    kind: "court_ruling",
    tagLabel: "Court ruling",
    headline: "72-hour purchase waiting period upheld on appeal.",
  },
  {
    display: "Mar 10 '26",
    iso: "2026-03-10",
    stateCode: "NM",
    kind: "enacted",
    tagLabel: "Enacted",
    headline: "7-day waiting period expanded to all transfers.",
  },
  {
    display: "Feb 21 '26",
    iso: "2026-02-21",
    stateCode: "MI",
    kind: "effective",
    tagLabel: "Effective",
    headline: "Safe-storage enforcement & penalties begin.",
  },
  {
    display: "Jan 12 '26",
    iso: "2026-01-12",
    stateCode: "WA",
    kind: "introduced",
    tagLabel: "In committee",
    headline: "Permit-to-purchase bill introduced (HB 1163) — tracking.",
  },
  {
    display: "Nov 30 '25",
    iso: "2025-11-30",
    stateCode: "FL",
    kind: "court_ruling",
    tagLabel: "Court ruling",
    headline: "Court reviews under-21 long-gun purchase restriction.",
  },
  {
    display: "Oct 04 '25",
    iso: "2025-10-04",
    stateCode: "TX",
    kind: "introduced",
    tagLabel: "In committee",
    headline: "Bill to add ERPO referred to committee — failed to advance.",
  },
];
