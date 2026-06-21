// Shared types for the ingestion layer.

import type { ChangeKind } from "../types";

export type SourceKind = "legiscan" | "openstates" | "courtlistener";

/**
 * Provider-agnostic normalized record. One per firearm-related bill found.
 * Mapped into a ChangeEvent row by the orchestrator (src/lib/ingest/index.ts).
 */
export interface NormalizedChange {
  /** Two-letter state/jurisdiction code, uppercase (e.g. "CA"). */
  state: string;
  /** Stable external id used for dedupe/upsert (e.g. LegiScan bill_id). */
  externalRef: string;
  /** Mapped ChangeEvent.kind. */
  kind: ChangeKind;
  /** Short human-readable summary (bill number + title, trimmed). */
  headline: string;
  /** Date of the latest relevant action (ISO yyyy-mm-dd). */
  eventDate: string;
  /** Link to the bill on the provider/legislature site (if available). */
  url: string | null;
  /** Which provider produced this record. */
  sourceKind: SourceKind;
}

/** Per-provider fetch result. */
export interface ProviderResult {
  source: SourceKind;
  /** True when the provider key was missing — nothing was attempted. */
  skipped: boolean;
  /** Reason when skipped, or a fatal error message. */
  reason?: string;
  changes: NormalizedChange[];
  /** Non-fatal, per-state errors (e.g. one state's request failed). */
  warnings: string[];
}

/** US state/territory codes that LegiScan + Open States understand. */
export const ALL_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export type StateCode = (typeof ALL_STATE_CODES)[number];
