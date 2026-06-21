// Shared, framework-agnostic types for the read layer + UI.
// These mirror the shapes in data/sample-states.json and the Prisma models.

export type Grade = "A" | "A-" | "B" | "C" | "D" | "D-" | "F";

export const POLICY_KEYS = [
  "permitless_carry",
  "universal_bg_check",
  "red_flag",
  "assault_weapon_ban",
  "magazine_limit",
  "waiting_period",
] as const;

export type PolicyKey = (typeof POLICY_KEYS)[number];

export type Policies = Record<PolicyKey, boolean>;

/** A curated 2021–2025 change layered on the 2020 baseline. */
export interface StateUpdate {
  year: number;
  label: string;
}

export interface ProvisionItem {
  text: string;
  citation: string | null;
}

export interface ProvisionCategory {
  category: string;
  items: ProvisionItem[];
}

/** Summary shape returned by GET /api/states (the list / map payload). */
export interface StateSummary {
  code: string;
  name: string;
  grade: Grade;
  /** Number of tracked laws in effect (0–134). Null where unknown (e.g. DC). */
  lawCount: number | null;
  /** Same value as lawCount; kept for the map legend / shading. */
  restrictions: number | null;
  policies: Policies;
  detailed: boolean;
  year: number | null;
  source: string | null;
  /** 2021–2025 changes layered on the 2020 baseline (may be empty). */
  updates: StateUpdate[];
}

/** Full detail shape returned by GET /api/states/[code]. */
export interface StateDetail extends StateSummary {
  provisions: ProvisionCategory[];
}

export type ChangeKind =
  | "enacted"
  | "effective"
  | "court_ruling"
  | "introduced"
  | "amended"
  | "repealed";

export interface ChangeEventDTO {
  stateCode: string;
  stateName: string;
  kind: ChangeKind;
  /** Display label for the tag, e.g. "Effective", "Court ruling". */
  tagLabel: string;
  headline: string;
  /** Pre-formatted date string for display, e.g. "Jun 15 '26". */
  date: string;
}

export const DISCLAIMER =
  "Informational only, not legal advice. Law data is from the State Firearm " +
  "Laws Database (Siegel et al., Boston University), with values as of 2020 — " +
  "so changes since then may not be reflected (a production pipeline keeps it " +
  "current). A state's grade reflects how FEW laws/restrictions it imposes " +
  "(A = fewest, F = most), the opposite orientation from gun-safety scorecards. " +
  "Always verify with official state resources and an attorney.";
