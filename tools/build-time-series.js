/* Build data/time-series.json — per-state firearm-law grade/lawCount/flags for
   every year 1991–2025, for the historical "year slider".
     - 1991–2020: from the State Firearm Laws Database yearly rows.
     - 2021–2025: 2020 baseline + the curated overlay applied cumulatively by year.
   DC has no historical series (not in the DB) → held at its current snapshot. */
const fs = require("fs");
const cb = require("./sfl-codebook.js");
const UPDATES = require("./updates-2021-2025.js");

const ABBR = {Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY"};

const GRADES = ["A","A-","B","C","D","D-","F"];
const grade = n => n<=9?"A":n<=19?"A-":n<=29?"B":n<=44?"C":n<=59?"D":n<=79?"D-":"F";
const varKeys = Object.keys(cb.vars);
const flags = v => ({
  pc: v.permitconcealed===0 ? 1 : 0,
  ubc: (v.universal===1||v.universalh===1) ? 1 : 0,
  rf: v.gvro===1 ? 1 : 0,
  awb: v.assault===1 ? 1 : 0,
  mag: v.magazine===1 ? 1 : 0,
  wp: (v.waiting===1||v.waitingh===1) ? 1 : 0,
});
const entry = (g, n, f) => ({ g, n, ...f });

const FIRST = 1991, LAST = 2025;
const years = []; for (let y=FIRST; y<=LAST; y++) years.push(y);

const series = {}; // code -> { year -> entry }

// --- 1991–2020 from the yearly DB summary ---
const yearly = JSON.parse(fs.readFileSync("data/sources/state-laws-yearly-summary.json","utf8"));
for (const r of yearly) {
  const code = ABBR[r.state]; if (!code) continue;
  (series[code] = series[code] || {})[r.year] = entry(grade(r.lawtotal), r.lawtotal, flags(r));
}

// --- 2021–2025: full 2020 vector + cumulative overlay ---
const rows2020 = JSON.parse(fs.readFileSync("data/sources/state-laws-2020.json","utf8")).filter(r=>r.year===2020);
const base = {}; // code -> full 2020 var vector
for (const r of rows2020) {
  const code = ABBR[r.state]; if (!code) continue;
  const v = {}; for (const k of varKeys) v[k] = r[k] || 0; base[code] = v;
}
for (let y=2021; y<=LAST; y++) {
  for (const code of Object.keys(base)) {
    const v = { ...base[code] };
    for (const u of UPDATES) {
      if (u.code === code && u.year <= y) for (const [k,val] of Object.entries(u.set)) if (k in v) v[k] = val;
    }
    const n = varKeys.reduce((a,k)=>a+(v[k]?1:0),0);
    series[code][y] = entry(grade(n), n, flags(v));
  }
}

// --- DC: no historical series; hold at current snapshot for every year ---
const dc = JSON.parse(fs.readFileSync("data/sample-states.json","utf8")).states.DC;
const dcFlags = {
  pc: dc.policies.permitless_carry?1:0, ubc: dc.policies.universal_bg_check?1:0,
  rf: dc.policies.red_flag?1:0, awb: dc.policies.assault_weapon_ban?1:0,
  mag: dc.policies.magazine_limit?1:0, wp: dc.policies.waiting_period?1:0,
};
series.DC = {}; for (const y of years) series.DC[y] = entry(dc.grade, null, dcFlags);

const out = {
  _meta: {
    description: "Per-state firearm-law grade, law count, and 6 headline policy flags for every year 1991–2025, for the historical year slider.",
    source: "State Firearm Laws Database (Siegel et al., Boston University) for 1991–2020; 2021–2025 = 2020 baseline + curated overlay (tools/updates-2021-2025.js).",
    firstYear: FIRST, lastYear: LAST, years,
    fields: { g: "grade A–F (fewer laws = A)", n: "law count (null for DC)", pc: "permitless carry", ubc: "universal background checks", rf: "red-flag law", awb: "assault-weapon restriction", mag: "magazine limit", wp: "waiting period" },
    note: "DC is held at its current snapshot (not in the historical DB). 2021–2025 reflects curated headline changes, not every amendment. Not legal advice.",
  },
  states: series,
};
fs.writeFileSync("data/time-series.json", JSON.stringify(out));
console.log("time-series.json:", Math.round(fs.statSync("data/time-series.json").size/1024), "KB | years", FIRST+"–"+LAST, "| states", Object.keys(series).length);
for (const c of ["AZ","TX","FL","CA"]) {
  const s = series[c];
  console.log(c, "1991:", s[1991].g+"/"+s[1991].n, " 2010:", s[2010].g+"/"+s[2010].n, " 2020:", s[2020].g+"/"+s[2020].n, " 2025:", s[2025].g+"/"+s[2025].n, "(pc25="+s[2025].pc+")");
}
