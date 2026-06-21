/* Per-statute citations + official-source links, layered onto provisions at build.
   `perVar[CODE][siegelVar] = { cite, url }` attaches a statute citation to that
   provision; `stateSource[CODE]` is the authoritative state code site. Populated for
   flagship states; all states also get the dataset source. Illustrative — verify. */

const perVar = {
  CA: {
    permitconcealed: { cite: "Cal. Penal Code §26150" },
    universal:  { cite: "Cal. Penal Code §28050" },
    universalh: { cite: "Cal. Penal Code §28050" },
    waiting:    { cite: "Cal. Penal Code §26815" },
    waitingh:   { cite: "Cal. Penal Code §26815" },
    assault:    { cite: "Cal. Penal Code §30605" },
    magazine:   { cite: "Cal. Penal Code §32310" },
    gvro:       { cite: "Cal. Penal Code §18100" },
    training:   { cite: "Cal. Penal Code §31610" },
    locked:     { cite: "Cal. Penal Code §25100" },
    onepermonth:{ cite: "Cal. Penal Code §27535" }
  },
  NY: {
    permitconcealed: { cite: "N.Y. Penal Law §400.00" },
    universal:  { cite: "N.Y. Gen. Bus. Law §898" },
    universalh: { cite: "N.Y. Gen. Bus. Law §898" },
    assault:    { cite: "N.Y. Penal Law §265.00(22)" },
    magazine:   { cite: "N.Y. Penal Law §265.36" },
    gvro:       { cite: "N.Y. CPLR Art. 63-A" }
  },
  TX: {
    strawpurchase:  { cite: "Tex. Penal Code §46.06" },
    strawpurchaseh: { cite: "Tex. Penal Code §46.06" }
  },
  FL: {
    waiting:  { cite: "Fla. Const. Art. I §8" },
    waitingh: { cite: "Fla. Const. Art. I §8" },
    gvro:     { cite: "Fla. Stat. §790.401" },
    preemption:{ cite: "Fla. Stat. §790.33" },
    preemptionbroad:{ cite: "Fla. Stat. §790.33" }
  },
  AZ: {
    preemption:      { cite: "Ariz. Rev. Stat. §13-3108" },
    preemptionbroad: { cite: "Ariz. Rev. Stat. §13-3108" }
  },
  CO: {
    universal:  { cite: "Colo. Rev. Stat. §18-12-112" },
    universalh: { cite: "Colo. Rev. Stat. §18-12-112" },
    waiting:    { cite: "Colo. Rev. Stat. §18-12-115" },
    waitingh:   { cite: "Colo. Rev. Stat. §18-12-115" },
    magazine:   { cite: "Colo. Rev. Stat. §18-12-302" },
    gvro:       { cite: "Colo. Rev. Stat. §13-14.5-103" },
    locked:     { cite: "Colo. Rev. Stat. §18-12-114" },
    age21longgunsale:  { cite: "Colo. SB 23-169" },
    age21longgunsaled: { cite: "Colo. SB 23-169" }
  }
};

const stateSource = {
  CA: { label: "California codes", url: "https://leginfo.legislature.ca.gov" },
  NY: { label: "New York laws", url: "https://www.nysenate.gov/legislation/laws" },
  TX: { label: "Texas statutes", url: "https://statutes.capitol.texas.gov" },
  FL: { label: "Florida statutes", url: "http://www.leg.state.fl.us/statutes" },
  AZ: { label: "Arizona Revised Statutes", url: "https://www.azleg.gov/ars/" },
  CO: { label: "Colorado Revised Statutes", url: "https://leg.colorado.gov/colorado-revised-statutes" }
};

const DATASET_SOURCE = { label: "State Firearm Laws Database", url: "https://www.statefirearmlaws.org" };

module.exports = { perVar, stateSource, DATASET_SOURCE };
