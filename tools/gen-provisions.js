/* Enrich data/sample-states.json: add categorized `provisions` to every state.
   Flagship states get hand-written, citation-backed detail; all others get
   provisions derived consistently from their policy flags. Illustrative only. */
const fs = require('fs');
const path = 'data/sample-states.json';
const j = JSON.parse(fs.readFileSync(path, 'utf8'));

const FLAGSHIP = {
  AZ: [
    {category:"Carry", items:[{text:"Permitless (“constitutional”) carry; optional permit offered for reciprocity.",citation:"ARS §13-3112"}]},
    {category:"Purchase & background checks", items:[{text:"No state universal background check — federal NICS at licensed dealers only.",citation:null},{text:"No state waiting period.",citation:null}]},
    {category:"Prohibited weapons", items:[{text:"No state assault-weapon ban or magazine limit.",citation:null}]},
    {category:"Storage & safety", items:[{text:"No statewide safe-storage mandate.",citation:null}]},
    {category:"Extreme risk (red flag)", items:[{text:"No statewide red-flag / ERPO law.",citation:null}]},
    {category:"Local authority", items:[{text:"Strong state preemption of local firearm regulation.",citation:"ARS §13-3108"}]}
  ],
  CA: [
    {category:"Carry", items:[{text:"Shall-issue CCW permit required for public carry (post-Bruen framework).",citation:"Penal Code §26150"},{text:"“Sensitive places” carry restrictions in effect.",citation:"SB 2 (2023)"}]},
    {category:"Purchase & background checks", items:[{text:"Universal background checks on all sales/transfers via licensed dealer.",citation:"Pen. Code §28050"},{text:"10-day waiting period.",citation:"Pen. Code §26815"},{text:"Firearm Safety Certificate required.",citation:"Pen. Code §31610"}]},
    {category:"Prohibited weapons", items:[{text:"Assault-weapon ban + registration of pre-ban arms.",citation:"Pen. Code §30605"},{text:"Large-capacity magazines (>10 rds) prohibited.",citation:"Pen. Code §32310"}]},
    {category:"Storage & safety", items:[{text:"Safe-storage / child-access prevention requirements.",citation:"Pen. Code §25100"},{text:"Roster of approved handguns.",citation:"Pen. Code §31900"}]},
    {category:"Extreme risk (red flag)", items:[{text:"Gun Violence Restraining Orders available to family, police, employers, teachers.",citation:"Pen. Code §18100"}]},
    {category:"Local authority", items:[{text:"Localities may enact firearm rules stricter than state law in many areas.",citation:null}]}
  ],
  TX: [
    {category:"Carry", items:[{text:"Permitless (“constitutional”) carry for those 21+ legally allowed to possess.",citation:"Govt. Code §411.0205 / HB 1927 (2021)"},{text:"License to Carry still offered for reciprocity.",citation:"Govt. Code §411.177"}]},
    {category:"Purchase & background checks", items:[{text:"No state universal background check — federal NICS at licensed dealers only.",citation:null},{text:"No state waiting period.",citation:null}]},
    {category:"Prohibited weapons", items:[{text:"No state assault-weapon ban or magazine limit.",citation:null}]},
    {category:"Storage & safety", items:[{text:"No general safe-storage mandate; criminal liability if a child gains access to an unsecured gun.",citation:"Penal Code §46.13"}]},
    {category:"Extreme risk (red flag)", items:[{text:"No statewide red-flag / ERPO law.",citation:null}]},
    {category:"Local authority", items:[{text:"Broad state preemption of local firearm regulation.",citation:"Local Govt. Code §229.001"}]}
  ],
  NY: [
    {category:"Carry", items:[{text:"License required to carry; “good moral character” + sensitive-location limits (CCIA 2022).",citation:"Penal Law §400.00"}]},
    {category:"Purchase & background checks", items:[{text:"Universal background checks; state-run check supplements NICS.",citation:"Gen. Bus. Law §898"},{text:"Permit/registration for handguns; semi-auto rifle license (age 21+).",citation:"Penal Law §265.00"}]},
    {category:"Prohibited weapons", items:[{text:"SAFE Act assault-weapon ban; registration of pre-ban arms.",citation:"Penal Law §265.00(22)"},{text:"Magazines limited to 10 rounds.",citation:"Penal Law §265.36"}]},
    {category:"Storage & safety", items:[{text:"Safe-storage requirements where minors or prohibited persons are present.",citation:"Penal Law §265.45"}]},
    {category:"Extreme risk (red flag)", items:[{text:"ERPO available; certain officials required to file when warranted.",citation:"CPLR Art. 63-A"}]},
    {category:"Local authority", items:[{text:"NYC and other localities impose additional firearm rules.",citation:null}]}
  ],
  FL: [
    {category:"Carry", items:[{text:"Permitless concealed carry of handguns for those 21+ eligible (2023).",citation:"§790.01, HB 543"},{text:"Open carry generally prohibited.",citation:"§790.053"}]},
    {category:"Purchase & background checks", items:[{text:"3-business-day waiting period on handgun purchases.",citation:"Art. I §8, Fla. Const."},{text:"Long-gun purchase age raised to 21 after Parkland.",citation:"§790.065(13)"}]},
    {category:"Prohibited weapons", items:[{text:"No assault-weapon ban or magazine limit.",citation:null}]},
    {category:"Storage & safety", items:[{text:"Safe-storage duty when minors may access firearms.",citation:"§790.174"}]},
    {category:"Extreme risk (red flag)", items:[{text:"Risk Protection Orders available to law enforcement (2018).",citation:"§790.401"}]},
    {category:"Local authority", items:[{text:"Strong state preemption; penalties for local officials who over-regulate.",citation:"§790.33"}]}
  ],
  CO: [
    {category:"Carry", items:[{text:"Shall-issue concealed-carry permit required.",citation:"CRS §18-12-203"},{text:"Local sensitive-place restrictions permitted.",citation:"SB 23-256"}]},
    {category:"Purchase & background checks", items:[{text:"Universal background checks on transfers.",citation:"CRS §18-12-112"},{text:"3-day waiting period.",citation:"CRS §18-12-115 (2023)"},{text:"Purchase age 21 for most firearms (2023).",citation:"SB 23-169"}]},
    {category:"Prohibited weapons", items:[{text:"Large-capacity magazines (>15 rds) prohibited.",citation:"CRS §18-12-302"}]},
    {category:"Storage & safety", items:[{text:"Safe-storage + lost/stolen reporting.",citation:"CRS §18-12-114"}]},
    {category:"Extreme risk (red flag)", items:[{text:"ERPO available; expanded petitioners (2023).",citation:"CRS §13-14.5-103"}]},
    {category:"Local authority", items:[{text:"Localities may enact rules stricter than state law (2021).",citation:"SB 21-256"}]}
  ]
};

function gen(p){
  return [
    {category:"Carry", items:[ p.permitless_carry
      ? {text:"Permitless (“constitutional”) carry allowed for eligible adults; a permit remains available for reciprocity.",citation:null}
      : {text:"A permit/license is required to carry a concealed firearm in public (shall-issue framework).",citation:null} ]},
    {category:"Purchase & background checks", items:[
      p.universal_bg_check
        ? {text:"Background checks required on all firearm sales and transfers, including private sales.",citation:null}
        : {text:"Licensed-dealer sales run through the federal NICS check; private person-to-person sales are not covered by a state universal-check law.",citation:null},
      p.waiting_period
        ? {text:"A state waiting period applies before a buyer can take possession.",citation:null}
        : {text:"No state-mandated waiting period.",citation:null} ]},
    {category:"Prohibited weapons", items:[
      p.assault_weapon_ban ? {text:"The state restricts the sale/possession of certain “assault weapons.”",citation:null}
                           : {text:"No state “assault weapon” ban.",citation:null},
      p.magazine_limit ? {text:"Large-capacity magazines are restricted.",citation:null}
                       : {text:"No state magazine-capacity limit.",citation:null} ]},
    {category:"Storage & safety", items:[ {text:"Safe-storage / child-access-prevention rules apply in some circumstances; consult the state statute for specifics.",citation:null} ]},
    {category:"Extreme risk (red flag)", items:[ p.red_flag
      ? {text:"An Extreme Risk Protection Order (“red flag”) process can temporarily remove firearms from someone found to be a danger.",citation:null}
      : {text:"No statewide red-flag / ERPO law.",citation:null} ]},
    {category:"Local authority", items:[ {text:"State firearm-preemption rules limit how localities may regulate firearms (scope varies).",citation:null} ]}
  ];
}

let detailed=0, generated=0;
for(const code of Object.keys(j.states)){
  const st=j.states[code];
  if(FLAGSHIP[code]){ st.provisions=FLAGSHIP[code]; st.detailed=true; detailed++; }
  else { st.provisions=gen(st.policies); st.detailed=false; generated++; }
}
j._meta.provisions="Every state has categorized provisions. Flagship states (AZ, CA, TX, NY, FL, CO) are hand-written with statute citations; all others are derived consistently from policy flags (no per-statute citation yet). Illustrative sample data — not legal advice.";
fs.writeFileSync(path, JSON.stringify(j,null,2)+"\n");
console.log("provisions added — flagship(detailed):",detailed," generated:",generated," total:",detailed+generated);
