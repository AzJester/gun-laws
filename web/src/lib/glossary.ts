// Plain-language glossary + per-category explainers.
//
// The dense, citation-backed provision lists on each state page are accurate but
// jargon-heavy. This module makes them legible to a general reader:
//   - CATEGORY_EXPLAINERS: a one–two sentence explainer for every provision
//     category title used in the data.
//   - GLOSSARY: definitions of the key terms a non-specialist needs.
//
// Pure content — no fs, no DB, no network. Safe to import from server or client
// components. Informational only, not legal advice.

// Canonical provision-category titles. These MUST exactly match the `categories`
// array in tools/sfl-codebook.js (the second element of each pair). They are the
// titles emitted into the data and rendered as section headers in the state
// detail. "Note" is an extra, data-only category used for jurisdictions like DC.
//
// KEEP IN SYNC with tools/sfl-codebook.js — if a category title changes there,
// change it here too (the content.test.ts test asserts every codebook title has
// an explainer entry).
export const CATEGORY_TITLES = [
  "Concealed & open carry",
  "Background checks",
  "Waiting periods",
  "Buyer regulations & permits",
  "Minimum age requirements",
  "Prohibited people (high-risk)",
  "Domestic violence",
  "Extreme risk (red flag)",
  "Assault weapons & magazines",
  "Dealer regulations",
  "Ammunition",
  "Safe storage & child access",
  "Trafficking & straw purchases",
  "Possession & location limits",
  "Other sales restrictions",
  "Liability & immunity",
  "Preemption (local authority)",
] as const;

/**
 * One–two sentence plain-language explainer for every provision category title.
 * Includes "Note" so data-only categories (e.g. DC) render gracefully.
 */
export const CATEGORY_EXPLAINERS: Record<string, string> = {
  "Concealed & open carry":
    "Rules for carrying a firearm in public — whether you need a permit, how it " +
    "is issued, and whether guns can be carried openly or only concealed.",
  "Background checks":
    "When a buyer must be screened against criminal and other disqualifying " +
    "records before a sale, including whether checks reach private and gun-show " +
    "sales, not just licensed dealers.",
  "Waiting periods":
    "A mandatory delay between buying a firearm and taking possession of it, " +
    "often used as a cooling-off period.",
  "Buyer regulations & permits":
    "Steps a buyer must complete to acquire or own a firearm, such as obtaining " +
    "a purchase permit or license, fingerprinting, safety training, or " +
    "registration.",
  "Minimum age requirements":
    "The youngest age at which a person may buy or possess a firearm, which can " +
    "differ for handguns versus long guns and for dealer versus private sales.",
  "Prohibited people (high-risk)":
    "Categories of people barred from having firearms because of an elevated " +
    "risk — for example certain convictions, mental-health adjudications, or " +
    "substance-abuse history — sometimes beyond the federal baseline.",
  "Domestic violence":
    "Laws that take firearms away from, or block purchases by, people convicted " +
    "of domestic violence or subject to a domestic-violence protective order, " +
    "including surrender and removal requirements.",
  "Extreme risk (red flag)":
    "'Red flag' laws that let a court temporarily order the removal of firearms " +
    "from someone found to pose a danger to themselves or others (an Extreme " +
    "Risk Protection Order, or ERPO).",
  "Assault weapons & magazines":
    "Restrictions or bans on certain semi-automatic firearms classed as 'assault " +
    "weapons' and on large-capacity magazines that hold more than a set number " +
    "of rounds.",
  "Dealer regulations":
    "Requirements on licensed sellers beyond federal rules — such as state " +
    "licensing, record-keeping, sales reporting, security, and inspections.",
  "Ammunition":
    "Controls on the sale and purchase of ammunition, including licensing, " +
    "record-keeping, permits, background checks, age limits, or type restrictions.",
  "Safe storage & child access":
    "Rules for how firearms must be stored and laws that hold owners liable when " +
    "a child gains access to an unsecured gun (child-access-prevention, or CAP).",
  "Trafficking & straw purchases":
    "Laws targeting illegal gun supply — buying a firearm for someone who can't " +
    "legally have one (a straw purchase) and trafficking firearms.",
  "Possession & location limits":
    "Where firearms may not be carried or possessed (such as schools or college " +
    "campuses) and related self-defense rules like the absence of a " +
    "'Stand Your Ground' law.",
  "Other sales restrictions":
    "Miscellaneous purchase and design limits, such as one-gun-a-month caps, " +
    "microstamping, bans on cheap 'junk guns', or approved-handgun rosters.",
  "Liability & immunity":
    "Whether the gun industry can be sued in state court, or is shielded from " +
    "certain civil lawsuits by immunity provisions.",
  "Preemption (local authority)":
    "Whether the state reserves firearm regulation to itself and bars cities and " +
    "counties from passing their own gun laws, or leaves them some authority.",
  // Data-only category used for jurisdictions like DC.
  Note:
    "Editorial context about this jurisdiction's data — clarifications or caveats " +
    "that don't fit a specific provision category.",
};

export interface GlossaryTerm {
  /** Stable anchor id (used for /glossary#<id> deep links). */
  id: string;
  /** The term being defined. */
  term: string;
  /** Plain-language definition. */
  definition: string;
}

/**
 * Key terms a general reader needs to make sense of the map and provision lists.
 * Sorted alphabetically by term.
 */
export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "assault-weapon",
    term: "Assault weapon",
    definition:
      "A legal (not technical) label for certain semi-automatic firearms that a " +
      "ban defines by features (like a detachable magazine plus a pistol grip) " +
      "or by a list of specific models. Definitions vary by state.",
  },
  {
    id: "cap",
    term: "Child-access prevention (CAP)",
    definition:
      "Laws that hold a gun owner responsible if a child gains access to an " +
      "unsecured firearm, encouraging safe storage. Some apply only after a " +
      "child uses the gun; others apply to mere access.",
  },
  {
    id: "permitless-carry",
    term: "Constitutional / permitless carry",
    definition:
      "A policy that lets eligible adults carry a concealed firearm without first " +
      "obtaining a permit. Also called 'constitutional carry.'",
  },
  {
    id: "erpo",
    term: "ERPO / red-flag law",
    definition:
      "An Extreme Risk Protection Order lets a court temporarily remove firearms " +
      "from a person found to pose a danger to themselves or others, usually on " +
      "petition by police or family.",
  },
  {
    id: "ffl",
    term: "FFL (Federal Firearms Licensee)",
    definition:
      "A dealer, manufacturer, or importer licensed by the ATF to sell firearms. " +
      "Sales by an FFL require a background check; many private sales do not " +
      "unless state law requires it.",
  },
  {
    id: "ghost-gun",
    term: "Ghost gun",
    definition:
      "A firearm assembled from parts or kits (or made on a 3D printer or mill) " +
      "without a serial number, making it hard to trace. Some states regulate " +
      "the unfinished frames and receivers used to build them.",
  },
  {
    id: "lcm",
    term: "Large-capacity magazine (LCM)",
    definition:
      "A detachable magazine that holds more than a set number of rounds (often " +
      "10 or 15, depending on the state). Some states restrict or ban them.",
  },
  {
    id: "lautenberg",
    term: "Lautenberg Amendment",
    definition:
      "A federal provision barring anyone convicted of a misdemeanor crime of " +
      "domestic violence from possessing firearms (18 U.S.C. §922(g)(9)).",
  },
  {
    id: "may-issue",
    term: "May-issue vs. shall-issue",
    definition:
      "Two permitting systems. Under shall-issue, the authority must grant a " +
      "carry permit to any qualifying applicant. Under may-issue, it has " +
      "discretion and may require 'good cause' — a model narrowed by the 2022 " +
      "Bruen decision.",
  },
  {
    id: "nfa",
    term: "NFA (National Firearms Act)",
    definition:
      "A 1934 federal law that tightly regulates machine guns, suppressors, " +
      "short-barreled rifles and shotguns, and destructive devices through " +
      "registration and a transfer tax.",
  },
  {
    id: "nics",
    term: "NICS",
    definition:
      "The FBI's National Instant Criminal Background Check System, which " +
      "licensed dealers query to confirm a buyer is not a prohibited person " +
      "before transferring a firearm.",
  },
  {
    id: "preemption",
    term: "Preemption",
    definition:
      "When state law overrides and bars local (city or county) firearm " +
      "regulation, so the rules are uniform statewide. Preemption can be broad " +
      "or narrow.",
  },
  {
    id: "prohibited-person",
    term: "Prohibited person",
    definition:
      "Someone legally barred from possessing firearms — under federal law this " +
      "includes felons, fugitives, unlawful drug users, certain people with " +
      "mental-health adjudications, and qualifying domestic abusers. States may " +
      "add categories.",
  },
  {
    id: "sbr",
    term: "Short-barreled rifle (SBR/SBS)",
    definition:
      "A rifle with a barrel under 16 inches (or a shotgun under 18 inches), or " +
      "an overall length under 26 inches. These are NFA-regulated items " +
      "requiring registration and a tax stamp.",
  },
  {
    id: "straw-purchase",
    term: "Straw purchase",
    definition:
      "Buying a firearm on behalf of someone who is prohibited or who wants to " +
      "avoid a background check. It is a federal crime.",
  },
  {
    id: "suppressor",
    term: "Suppressor (silencer)",
    definition:
      "A muffler-like device that reduces a firearm's muzzle report. It is an " +
      "NFA-regulated item federally and is banned outright in some states.",
  },
  {
    id: "universal-background-check",
    term: "Universal background check",
    definition:
      "A requirement that nearly all firearm sales — including private and " +
      "gun-show sales, not just dealer sales — go through a background check, " +
      "often by routing them through a licensed dealer.",
  },
  {
    id: "waiting-period",
    term: "Waiting period",
    definition:
      "A mandatory delay between purchasing a firearm and being able to take it " +
      "home, intended as a cooling-off period and to allow checks to complete.",
  },
];
