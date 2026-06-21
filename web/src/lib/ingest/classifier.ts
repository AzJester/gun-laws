// Classifier — the "CLASSIFY & DIFF" step of the update pipeline (docs/PLAN.md §6).
//
// classifyChange() turns a NormalizedChange (one ingested bill / docket event)
// into a ClassifiedChange: a plain-language draft summary, a best-guess policy
// key + category, a proposed provision status and/or citation, plus a confidence
// (0..1) and the method used ("llm" | "rules").
//
// Two paths, in order:
//   1. LLM draft  — the official Anthropic SDK (@anthropic-ai/sdk). Used when
//      ANTHROPIC_API_KEY is set. Asks for structured JSON and parses defensively.
//   2. Rules draft — a deterministic keyword classifier. Used when no key is set
//      OR the LLM call fails for ANY reason (incl. egress 403 host_not_allowed,
//      network errors, malformed JSON). NEVER throws.
//
// The classifier PROPOSES; an editor disposes (the review queue). Nothing here
// publishes, and nothing connects to a DB. The Anthropic SDK is required lazily
// so the module graph never pulls it in at build time on the no-key path.

import { getEnv } from "../env";
import type { ChangeKind, ProvisionStatus } from "../types";
import type { NormalizedChange } from "./types";

export type ClassifyMethod = "llm" | "rules";

/** A NormalizedChange enriched with a draft classification for editorial review. */
export interface ClassifiedChange extends NormalizedChange {
  /** Plain-language one-line summary of what the change does. */
  summary: string;
  /**
   * Best-guess affected policy key (one of the tracked POLICY_KEYS) or null if
   * the change doesn't map cleanly to a tracked policy.
   */
  policyKey: string | null;
  /** Best-guess provision category (human label, e.g. "Waiting periods"). */
  category: string | null;
  /**
   * Proposed provision status when the change implies one (e.g. a court
   * injunction → "enjoined"). null = no status change proposed.
   */
  proposedStatus: ProvisionStatus | null;
  /** Proposed citation for the published version (e.g. court cite), if any. */
  proposedCitation: string | null;
  /** 0..1 confidence in the classification. */
  confidence: number;
  /** Which path produced this classification. */
  method: ClassifyMethod;
}

// ---------------------------------------------------------------------------
// Rules classifier (deterministic fallback)
// ---------------------------------------------------------------------------

interface PolicyRule {
  policyKey: string;
  category: string;
  // Words that, if present in the bill text, indicate this policy.
  keywords: RegExp;
}

// Ordered most-specific first. Categories mirror the codebook category titles.
const POLICY_RULES: PolicyRule[] = [
  {
    policyKey: "permitless_carry",
    category: "Concealed & open carry",
    keywords:
      /(permitless carry|constitutional carry|without a permit|permit to carry|concealed carry|open carry)/i,
  },
  {
    policyKey: "universal_bg_check",
    category: "Background checks",
    keywords:
      /(universal background|background check|private (sale|transfer)|point of contact|permit[- ]to[- ]purchase)/i,
  },
  {
    policyKey: "red_flag",
    category: "Extreme risk (red flag)",
    keywords: /(red[- ]flag|extreme risk|ERPO|protection order|gun violence restraining)/i,
  },
  {
    policyKey: "assault_weapon_ban",
    category: "Assault weapons & magazines",
    keywords: /(assault weapon|assault[- ]style|semi-?automatic rifle|AR-?15)/i,
  },
  {
    policyKey: "magazine_limit",
    category: "Assault weapons & magazines",
    keywords: /(magazine|large[- ]capacity|round limit|\b10[- ]round|high[- ]capacity)/i,
  },
  {
    policyKey: "waiting_period",
    category: "Waiting periods",
    keywords: /(waiting period|\b\d+[- ](hour|day)\b.*(wait|purchase)|cooling[- ]off)/i,
  },
];

/** Map free-text to a proposed legal status, if the text clearly implies one. */
function statusFromText(text: string): { status: ProvisionStatus | null; conf: number } {
  const t = text.toLowerCase();
  // Court actions first — they change a provision's status, not its existence.
  if (/(struck down|unconstitutional|invalidat|permanently enjoin|vacat)/.test(t)) {
    return { status: "struck", conf: 0.6 };
  }
  if (/(enjoin|injunction|temporary restraining order|tro|stay(ed)? enforcement|blocked by)/.test(t)) {
    return { status: "enjoined", conf: 0.6 };
  }
  if (/(repeal)/.test(t)) return { status: "repealed", conf: 0.55 };
  if (/(takes effect|effective date|shall take effect|becomes effective)/.test(t)) {
    return { status: "in_effect", conf: 0.5 };
  }
  if (/(signed|enacted|chaptered|approved by governor)/.test(t)) {
    // Enacted but the text often notes a future effective date.
    if (/(effective .*20\d\d|takes effect|beginning|on or after)/.test(t)) {
      return { status: "enacted_not_yet_effective", conf: 0.5 };
    }
    return { status: "in_effect", conf: 0.45 };
  }
  return { status: null, conf: 0 };
}

/** A short plain-language summary derived from headline + kind. */
function rulesSummary(change: NormalizedChange, policyLabel: string | null): string {
  const kindPhrase: Record<ChangeKind, string> = {
    enacted: "was enacted",
    effective: "took effect",
    court_ruling: "was the subject of a court ruling",
    introduced: "was introduced",
    amended: "was amended",
    repealed: "was repealed",
  };
  const subject = policyLabel ? `${policyLabel} measure` : "Firearm bill";
  const bill = change.headline.split(":")[0]?.trim() || "Measure";
  return `${subject} (${bill}) ${kindPhrase[change.kind]} in ${change.state}.`;
}

export function classifyWithRules(change: NormalizedChange): ClassifiedChange {
  const text = `${change.headline}`;
  let matched: PolicyRule | null = null;
  for (const rule of POLICY_RULES) {
    if (rule.keywords.test(text)) {
      matched = rule;
      break;
    }
  }

  const { status, conf: statusConf } = statusFromText(text);
  // Court rulings without explicit injunction language still imply a court event.
  const proposedStatus =
    status ?? (change.kind === "court_ruling" ? "enjoined" : null);

  const policyLabel = matched
    ? POLICY_RULES_LABEL[matched.policyKey] ?? matched.policyKey
    : null;

  // Confidence: base on whether we matched a policy + status signal.
  let confidence = 0.3;
  if (matched) confidence += 0.25;
  if (status) confidence = Math.max(confidence, statusConf);
  confidence = Math.min(0.85, Number(confidence.toFixed(2)));

  return {
    ...change,
    summary: rulesSummary(change, policyLabel),
    policyKey: matched?.policyKey ?? null,
    category: matched?.category ?? null,
    proposedStatus,
    proposedCitation: null,
    confidence,
    method: "rules",
  };
}

const POLICY_RULES_LABEL: Record<string, string> = {
  permitless_carry: "Permitless carry",
  universal_bg_check: "Universal background check",
  red_flag: "Red-flag (ERPO)",
  assault_weapon_ban: "Assault-weapon",
  magazine_limit: "Magazine-limit",
  waiting_period: "Waiting-period",
};

// ---------------------------------------------------------------------------
// LLM classifier (Anthropic SDK)
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "claude-sonnet-4-6";

export function hasAnthropicKey(): boolean {
  return Boolean(getEnv(process.env).ANTHROPIC_API_KEY);
}

const VALID_STATUSES: ProvisionStatus[] = [
  "in_effect",
  "enacted_not_yet_effective",
  "enjoined",
  "struck",
  "repealed",
];

const VALID_POLICY_KEYS = new Set([
  "permitless_carry",
  "universal_bg_check",
  "red_flag",
  "assault_weapon_ban",
  "magazine_limit",
  "waiting_period",
]);

interface LlmShape {
  summary?: unknown;
  policyKey?: unknown;
  category?: unknown;
  status?: unknown;
  citation?: unknown;
  confidence?: unknown;
}

/** Extract the first JSON object from a model text response, defensively. */
function parseJsonObject(text: string): LlmShape | null {
  const trimmed = text.trim();
  // Fast path: whole response is JSON.
  try {
    return JSON.parse(trimmed) as LlmShape;
  } catch {
    /* fall through to substring extraction */
  }
  // Tolerate code fences / prose around the JSON.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as LlmShape;
  } catch {
    return null;
  }
}

function coerceLlm(
  change: NormalizedChange,
  parsed: LlmShape,
): ClassifiedChange {
  const rawStatus = typeof parsed.status === "string" ? parsed.status : null;
  const status =
    rawStatus && VALID_STATUSES.includes(rawStatus as ProvisionStatus)
      ? (rawStatus as ProvisionStatus)
      : null;

  const rawPolicy = typeof parsed.policyKey === "string" ? parsed.policyKey : null;
  const policyKey = rawPolicy && VALID_POLICY_KEYS.has(rawPolicy) ? rawPolicy : null;

  let confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.min(1, Math.max(0, Number(confidence.toFixed(2))));

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 400)
      : rulesSummary(change, null);

  return {
    ...change,
    summary,
    policyKey,
    category: typeof parsed.category === "string" ? parsed.category : null,
    proposedStatus: status,
    proposedCitation:
      typeof parsed.citation === "string" && parsed.citation.trim()
        ? parsed.citation.trim()
        : null,
    confidence,
    method: "llm",
  };
}

const SYSTEM_PROMPT =
  "You are a legislative analyst for a US firearm-law tracker. Given one " +
  "normalized legislative or court event, classify it for an editor to review. " +
  "Reply with ONLY a JSON object (no prose, no code fences) with keys: " +
  '"summary" (one plain-language sentence), ' +
  '"policyKey" (one of: permitless_carry, universal_bg_check, red_flag, ' +
  "assault_weapon_ban, magazine_limit, waiting_period — or null if none fits), " +
  '"category" (a short human label, e.g. "Waiting periods"), ' +
  '"status" (one of: in_effect, enacted_not_yet_effective, enjoined, struck, ' +
  "repealed — or null if the event does not change a provision's legal status), " +
  '"citation" (a statute or court citation if evident, else null), and ' +
  '"confidence" (a number 0..1).';

async function classifyWithLlm(
  change: NormalizedChange,
): Promise<ClassifiedChange> {
  // Lazy require so the SDK is never pulled into the no-key build/import path.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@anthropic-ai/sdk") as typeof import("@anthropic-ai/sdk");
  const Anthropic = mod.default;
  const env = getEnv(process.env);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const userContent =
    `Event:\n` +
    `- state: ${change.state}\n` +
    `- kind: ${change.kind}\n` +
    `- headline: ${change.headline}\n` +
    `- date: ${change.eventDate}\n` +
    `- source: ${change.sourceKind}\n` +
    (change.url ? `- url: ${change.url}\n` : "") +
    `\nReturn the JSON object now.`;

  const resp = await client.messages.create({
    model,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  // Concatenate text blocks from the response content.
  const text = (resp.content ?? [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  const parsed = parseJsonObject(text);
  if (!parsed) {
    throw new Error("Anthropic response was not parseable JSON");
  }
  return coerceLlm(change, parsed);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Classify a normalized change into a draft. Tries the LLM when keyed; on ANY
 * failure (no key, egress 403, network error, bad JSON) falls back to the
 * deterministic rules classifier. Never throws.
 */
export async function classifyChange(
  change: NormalizedChange,
): Promise<ClassifiedChange> {
  if (hasAnthropicKey()) {
    try {
      return await classifyWithLlm(change);
    } catch {
      // Swallow and fall back — the rules path is always available.
    }
  }
  return classifyWithRules(change);
}
