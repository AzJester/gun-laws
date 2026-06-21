/* tools/court-status.js — ILLUSTRATIVE court-status overlay.
 *
 * Marks specific tracked provisions as `enjoined` or `struck` for specific
 * states, each with a court citation + url and a short note. This is the
 * mechanism the production court-tracking pipeline (CourtListener →
 * classify → review → publish) feeds; the entries below are a SMALL set of
 * well-known, defensible SAMPLE cases so the map/detail can demonstrate the
 * enjoined/struck badges end to end.
 *
 * NOT legal advice and NOT a live feed — verify against the dockets. Litigation
 * status changes frequently (stays, appeals, remands); treat these as examples.
 *
 * Shape: byState[CODE] = [
 *   { var: <siegelVarKey>, status: "enjoined"|"struck",
 *     citation, url, note }
 * ]
 * `var` matches the keys in tools/sfl-codebook.js so the builder can attach the
 * status to the corresponding provision item it already emits.
 */

const byState = {
  // California — magazine ban (Penal Code §32310) had a long injunction history
  // (Duncan v. Bonta). Shown here as an illustrative "enjoined" example.
  CA: [
    {
      var: "magazine",
      status: "enjoined",
      citation: "Duncan v. Bonta, No. 17-56081 (9th Cir.)",
      url: "https://www.courtlistener.com/?q=Duncan+v.+Bonta",
      note:
        "Large-capacity magazine restriction has been subject to injunctions in " +
        "ongoing litigation (illustrative; verify current status).",
    },
  ],

  // Illinois — PICA assault-weapon / magazine ban (2023) drew multiple
  // challenges (e.g. Barnett v. Raoul). Illustrative "enjoined" example.
  IL: [
    {
      var: "assault",
      status: "enjoined",
      citation: "Barnett v. Raoul, No. 23-1825 (7th Cir.)",
      url: "https://www.courtlistener.com/?q=Barnett+v.+Raoul",
      note:
        "Assault-weapon provisions of the Protect Illinois Communities Act have " +
        "faced preliminary injunctions in some proceedings (illustrative).",
    },
  ],

  // New York — the CCIA's "good moral character" / sensitive-places regime
  // (Antonyuk v. Chiumento) was partially enjoined. Mapped to the carry-permit
  // provision as an illustrative "enjoined" example.
  NY: [
    {
      var: "permitconcealed",
      status: "enjoined",
      citation: "Antonyuk v. Chiumento, No. 22-2908 (2d Cir.)",
      url: "https://www.courtlistener.com/?q=Antonyuk+v.+Chiumento",
      note:
        "Parts of New York's post-Bruen Concealed Carry Improvement Act were " +
        "enjoined in litigation (illustrative; scope has shifted on appeal).",
    },
  ],
};

/** Look up overlay entries for a state code (empty array if none). */
function forState(code) {
  return byState[code] || [];
}

module.exports = { byState, forState };
