// Federal firearm-law context layer.
//
// A permissive state is NOT a "no rules" zone — federal law applies in every
// state, on top of (and sometimes stricter than) state law. This module is a
// typed, plain-language summary of the key federal statutes a general reader
// needs to understand alongside the state-by-state data.
//
// Pure content — no fs, no DB, no network. Safe to import from server or client
// components. The summaries are SIMPLIFIED and ILLUSTRATIVE renderings of the
// statutes, not verbatim statutory text, and are NOT legal advice.

export interface FederalLawItem {
  /** Short, stable anchor id (used for /federal#<id> deep links). */
  id: string;
  /** Plain-language title of the rule. */
  title: string;
  /** One–two sentence plain-language summary. */
  summary: string;
  /** Statutory / regulatory citation, e.g. "18 U.S.C. §922(t)". */
  citation: string;
  /** Optional link to the governing authority. */
  url?: string;
}

/** One-line disclaimer reused across the federal page + callout. */
export const FEDERAL_DISCLAIMER =
  "Federal law applies in every state, on top of state law. These summaries are " +
  "simplified and illustrative, not verbatim statute, and are not legal advice. " +
  "State and local law may be stricter. Always verify against the U.S. Code and " +
  "consult a licensed attorney.";

/**
 * Key federal firearm-law provisions. Each item is intentionally concise and
 * carries a citation so the page and the state-detail callout can attribute it.
 */
export const FEDERAL_LAWS: FederalLawItem[] = [
  {
    id: "background-checks",
    title: "Background checks at licensed dealers (NICS)",
    summary:
      "Any sale by a federally licensed dealer (FFL) requires a background check " +
      "through the FBI's National Instant Criminal Background Check System (NICS) " +
      "before the firearm can be transferred. This applies in all 50 states even " +
      "where state law adds nothing further.",
    citation: "18 U.S.C. §922(t)",
    url: "https://www.law.cornell.edu/uscode/text/18/922",
  },
  {
    id: "prohibited-persons",
    title: "Federally prohibited persons",
    summary:
      "Federal law bars certain people from possessing firearms or ammunition — " +
      "including anyone convicted of a felony, fugitives, unlawful users of " +
      "controlled substances, people adjudicated mentally defective or committed " +
      "to a mental institution, those subject to qualifying domestic-violence " +
      "restraining orders, and anyone convicted of a misdemeanor crime of " +
      "domestic violence (the Lautenberg Amendment).",
    citation: "18 U.S.C. §922(g)",
    url: "https://www.law.cornell.edu/uscode/text/18/922",
  },
  {
    id: "minimum-age",
    title: "Minimum purchase age from a dealer",
    summary:
      "A licensed dealer may not sell a long gun (rifle or shotgun) to anyone " +
      "under 18, or a handgun to anyone under 21. States and dealers may set " +
      "higher minimum ages, but not lower for FFL sales.",
    citation: "18 U.S.C. §922(b)",
    url: "https://www.law.cornell.edu/uscode/text/18/922",
  },
  {
    id: "straw-purchase",
    title: "Straw purchases & lying on Form 4473",
    summary:
      "It is a federal crime to buy a firearm on behalf of someone else who is " +
      "prohibited or to avoid a background check (a 'straw purchase'), and to " +
      "knowingly make a false statement on the ATF Form 4473 used at the point " +
      "of sale.",
    citation: "18 U.S.C. §922(a)(6)",
    url: "https://www.law.cornell.edu/uscode/text/18/922",
  },
  {
    id: "nfa",
    title: "National Firearms Act (NFA) items",
    summary:
      "Machine guns, suppressors (silencers), short-barreled rifles and " +
      "shotguns, 'any other weapons' (AOWs), and destructive devices are tightly " +
      "regulated under the NFA: they must be registered with the ATF and a " +
      "transfer tax paid before transfer, regardless of state law.",
    citation: "26 U.S.C. ch. 53",
    url: "https://www.law.cornell.edu/uscode/text/26/subtitle-E/chapter-53",
  },
  {
    id: "interstate-transport",
    title: "Interstate transport (FOPA safe passage)",
    summary:
      "Under the Firearm Owners' Protection Act, a person who may legally possess " +
      "a firearm where their trip begins and ends is generally protected when " +
      "transporting it through other states, provided it is unloaded and stored " +
      "out of reach (e.g. in the trunk). Conditions are strict and disputed in " +
      "some jurisdictions.",
    citation: "18 U.S.C. §926A",
    url: "https://www.law.cornell.edu/uscode/text/18/926A",
  },
  {
    id: "gca",
    title: "Gun Control Act basics & licensing",
    summary:
      "The Gun Control Act of 1968 is the backbone of federal firearm law: it " +
      "requires anyone 'engaged in the business' of dealing firearms to hold a " +
      "Federal Firearms License (FFL), restricts interstate sales (handguns " +
      "generally must go through an FFL in the buyer's home state), and bars " +
      "transfers to prohibited persons.",
    citation: "18 U.S.C. ch. 44",
    url: "https://www.law.cornell.edu/uscode/text/18/part-I/chapter-44",
  },
];

/**
 * Very short summary used in the compact "Federal law also applies" callout
 * shown on each state's detail. Kept to a single sentence.
 */
export const FEDERAL_CALLOUT_SUMMARY =
  "No matter how permissive a state is, federal law still applies on top of it: " +
  "background checks at licensed dealers (NICS), federal prohibited-person bans, " +
  "minimum purchase ages, the straw-purchase ban, and NFA rules for items like " +
  "machine guns and suppressors.";
