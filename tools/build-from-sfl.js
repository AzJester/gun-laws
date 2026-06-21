/* Build data/sample-states.json from the State Firearm Laws Database (2020 baseline)
   + tools/updates-2021-2025.js (current changes) + tools/sfl-codebook.js.
   Grade = fewer laws → higher grade (from recomputed lawtotal). */
const fs=require('fs');
const cb=require('./sfl-codebook.js');
const UPDATES=require('./updates-2021-2025.js');
const CITE=require('./citations.js');
const COURT=require('./court-status.js');

const ABBR={Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY"};

const GRADES=["A","A-","B","C","D","D-","F"];
const gradeFromLawtotal=n=> n<=9?"A":n<=19?"A-":n<=29?"B":n<=44?"C":n<=59?"D":n<=79?"D-":"F";
const varKeys=Object.keys(cb.vars);
const catTitle=Object.fromEntries(cb.categories.map(c=>[c[0],c[1]]));
const catOrder=cb.categories.map(c=>c[0]);

// 2020 baseline rows, pre-extracted from State_laws.xlsx (no SheetJS dependency).
const rows=JSON.parse(fs.readFileSync('data/sources/state-laws-2020.json','utf8')).filter(r=>r.year===2020);

// vars per state (copy of 2020 row, restricted to the 134 coded provisions)
const V={};
for(const row of rows){ const code=ABBR[row.state]; if(!code) continue; const o={}; for(const k of varKeys) o[k]=row[k]||0; V[code]={name:row.state, v:o, updates:[]}; }

// apply 2021–2025 overlay (record only changes that actually flip a value)
let applied=0;
for(const st of Object.values(V)) st.changedOn={}; // var -> year it was turned on
for(const u of UPDATES){
  const st=V[u.code]; if(!st) continue;
  let changed=false;
  for(const [k,val] of Object.entries(u.set)){ if(!(k in st.v)) continue; if(st.v[k]!==val){ st.v[k]=val; if(val===1) st.changedOn[k]=u.year; changed=true; } }
  if(changed){ st.updates.push({year:u.year,label:u.label}); applied++; }
}

const states={};
for(const code of Object.keys(V)){
  const {name,v,updates,changedOn}=V[code];
  const lawCount=varKeys.reduce((a,k)=>a+(v[k]?1:0),0);
  const cites=CITE.perVar[code]||{};
  // Court-status overlay (illustrative): var -> { status, citation, url, note }.
  const courtByVar={};
  for(const e of COURT.forState(code)) courtByVar[e.var]=e;

  const buckets={};
  const litigation=[];
  for(const k of varKeys){
    if(v[k]===1){
      const [cat,label]=cb.vars[k];
      const c=cites[k];
      const item={
        text:label,
        citation: c?c.cite:null,
        url: c&&c.url?c.url:null,
        status:"in_effect",
        since: changedOn[k]||null
      };
      // Apply the court-status overlay: a struck/enjoined provision keeps its row
      // but its status (and citation/url) reflect the court action.
      const co=courtByVar[k];
      if(co){
        item.status=co.status;
        item.citation=co.citation||item.citation;
        item.url=co.url||item.url;
        litigation.push({var:k,label,status:co.status,citation:co.citation,url:co.url,note:co.note});
      }
      (buckets[cat]=buckets[cat]||[]).push(item);
    }
  }
  const provisions=catOrder.filter(c=>buckets[c]).map(c=>({category:catTitle[c],items:buckets[c]}));
  const verifiedThrough = updates.length ? Math.max(2020, ...updates.map(u=>u.year)) : 2020;
  const sources=[CITE.DATASET_SOURCE]; if(CITE.stateSource[code]) sources.push(CITE.stateSource[code]);
  states[code]={
    name,
    grade:gradeFromLawtotal(lawCount),
    lawCount, restrictions:lawCount,
    policies:{
      permitless_carry: v.permitconcealed===0,
      universal_bg_check: v.universal===1 || v.universalh===1,
      red_flag: v.gvro===1,
      assault_weapon_ban: v.assault===1,
      magazine_limit: v.magazine===1,
      waiting_period: v.waiting===1 || v.waitingh===1
    },
    provisions,
    updates: updates.sort((a,b)=>a.year-b.year),
    litigation,
    verifiedThrough, sources,
    detailed:true, year:2025,
    source:"State Firearm Laws Database (Siegel et al., Boston University), 2020 baseline + 2021–2025 curated updates"
  };
}
// DC — not in the 50-state database
states.DC={
  name:"District of Columbia", grade:"F", lawCount:null, restrictions:null,
  policies:{permitless_carry:false,universal_bg_check:true,red_flag:true,assault_weapon_ban:true,magazine_limit:true,waiting_period:true},
  provisions:[{category:"Note",items:[{text:"The 50-state State Firearm Laws Database excludes DC. DC is among the most heavily regulated US jurisdictions (registration, training, magazine limit, etc.); detailed provisions to be added from primary sources.",citation:null,url:null,status:"in_effect",since:null}]}],
  updates:[], litigation:[], verifiedThrough:2025,
  sources:[CITE.DATASET_SOURCE,{label:"DC Official Code",url:"https://code.dccouncil.gov/us/dc/council/code/titles/7/chapters/25"}],
  detailed:false, year:2025, source:"curated note"
};

const out={
  _meta:{
    description:"Per-state firearm-law data for the GunLawMap mockup/app. Baseline values are from the State Firearm Laws Database (2020); 2021–2025 changes are layered on via tools/updates-2021-2025.js so the data reflects current law. Provision labels are simplified renderings of the codebook. NOT legal advice; verify against official statutes.",
    source:"State Firearm Laws Database — Siegel et al., Boston University (statefirearmlaws.org); mirror: dynamicalsystemslaboratory/Firearm-database",
    vintage:"2020 baseline + 2021–2025 curated updates",
    grading:"Grade reflects how FEW laws/restrictions a state imposes (fewer = higher). From lawtotal (count of the 134 tracked provisions in effect): 0-9=A, 10-19=A-, 20-29=B, 30-44=C, 45-59=D, 60-79=D-, 80+=F. Opposite orientation from gun-safety scorecards.",
    grades:GRADES,
    coverage:"50 states from the database (with 2021–2025 updates) + a curated DC summary = 51 jurisdictions.",
    disclaimer:"Illustrative; verify against official state statutes and counsel."
  },
  states
};
fs.writeFileSync('data/sample-states.json', JSON.stringify(out,null,2)+"\n");

const dist={}; Object.values(states).forEach(s=>{dist[s.grade]=(dist[s.grade]||0)+1;});
const litCount=Object.values(states).reduce((a,s)=>a+((s.litigation&&s.litigation.length)||0),0);
console.log("overlay changes applied:",applied,"| court-status overlay entries:",litCount);
console.log("states written:",Object.keys(states).length,"| grade distribution:",JSON.stringify(dist));
for(const c of ["AZ","TX","FL","CA","MI","MN","IL","WA","CO","NY","DE","RI"]){const s=states[c];console.log(c,"grade",s.grade,"| laws",s.lawCount,"| updates",s.updates.length);}
