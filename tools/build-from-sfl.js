/* Build data/sample-states.json from the State Firearm Laws Database (2020 baseline)
   + tools/updates-2021-2025.js (current changes) + tools/sfl-codebook.js.
   Grade = fewer laws → higher grade (from recomputed lawtotal). */
const fs=require('fs');
const XLSX=require('/tmp/usmap/node_modules/xlsx');
const cb=require('./sfl-codebook.js');
const UPDATES=require('./updates-2021-2025.js');

const ABBR={Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY"};

const GRADES=["A","A-","B","C","D","D-","F"];
const gradeFromLawtotal=n=> n<=9?"A":n<=19?"A-":n<=29?"B":n<=44?"C":n<=59?"D":n<=79?"D-":"F";
const varKeys=Object.keys(cb.vars);
const catTitle=Object.fromEntries(cb.categories.map(c=>[c[0],c[1]]));
const catOrder=cb.categories.map(c=>c[0]);

const wb=XLSX.readFile('data/sources/State_laws.xlsx');
const rows=XLSX.utils.sheet_to_json(wb.Sheets["DATABASE"]).filter(r=>r.year===2020);

// vars per state (copy of 2020 row, restricted to the 134 coded provisions)
const V={};
for(const row of rows){ const code=ABBR[row.state]; if(!code) continue; const o={}; for(const k of varKeys) o[k]=row[k]||0; V[code]={name:row.state, v:o, updates:[]}; }

// apply 2021–2025 overlay (record only changes that actually flip a value)
let applied=0;
for(const u of UPDATES){
  const st=V[u.code]; if(!st) continue;
  let changed=false;
  for(const [k,val] of Object.entries(u.set)){ if(!(k in st.v)) continue; if(st.v[k]!==val){ st.v[k]=val; changed=true; } }
  if(changed){ st.updates.push({year:u.year,label:u.label}); applied++; }
}

const states={};
for(const code of Object.keys(V)){
  const {name,v,updates}=V[code];
  const lawCount=varKeys.reduce((a,k)=>a+(v[k]?1:0),0);
  const buckets={};
  for(const k of varKeys){ if(v[k]===1){ const [cat,label]=cb.vars[k]; (buckets[cat]=buckets[cat]||[]).push({text:label,citation:null}); } }
  const provisions=catOrder.filter(c=>buckets[c]).map(c=>({category:catTitle[c],items:buckets[c]}));
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
    detailed:true, year:2025,
    source:"State Firearm Laws Database (Siegel et al., Boston University), 2020 baseline + 2021–2025 curated updates"
  };
}
// DC — not in the 50-state database
states.DC={
  name:"District of Columbia", grade:"F", lawCount:null, restrictions:null,
  policies:{permitless_carry:false,universal_bg_check:true,red_flag:true,assault_weapon_ban:true,magazine_limit:true,waiting_period:true},
  provisions:[{category:"Note",items:[{text:"The 50-state State Firearm Laws Database excludes DC. DC is among the most heavily regulated US jurisdictions (registration, training, magazine limit, etc.); detailed provisions to be added from primary sources.",citation:null}]}],
  updates:[], detailed:false, year:2025, source:"curated note"
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
console.log("overlay changes applied:",applied);
console.log("states written:",Object.keys(states).length,"| grade distribution:",JSON.stringify(dist));
for(const c of ["AZ","TX","FL","CA","MI","MN","IL","WA","CO","NY","DE","RI"]){const s=states[c];console.log(c,"grade",s.grade,"| laws",s.lawCount,"| updates",s.updates.length);}
