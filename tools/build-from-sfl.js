/* Build data/sample-states.json from the State Firearm Laws Database (2020)
   + tools/sfl-codebook.js. Grade = fewer laws → higher grade (from lawtotal). */
const fs=require('fs');
const XLSX=require('/tmp/sfl/node_modules/xlsx');
const cb=require('./sfl-codebook.js');

const ABBR={Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY"};

const GRADES=["A","A-","B","C","D","D-","F"];
const gradeFromLawtotal=n=> n<=9?"A":n<=19?"A-":n<=29?"B":n<=44?"C":n<=59?"D":n<=79?"D-":"F";

const wb=XLSX.readFile('data/sources/State_laws.xlsx');
const data=XLSX.utils.sheet_to_json(wb.Sheets["DATABASE"]);
const y2020=data.filter(r=>r.year===2020);

const catTitle=Object.fromEntries(cb.categories.map(c=>[c[0],c[1]]));
const catOrder=cb.categories.map(c=>c[0]);

const states={};
for(const row of y2020){
  const code=ABBR[row.state]; if(!code) continue;
  // group provisions in effect (==1) by category
  const buckets={};
  for(const [v,meta] of Object.entries(cb.vars)){
    if(row[v]===1){ const [cat,label]=meta; (buckets[cat]=buckets[cat]||[]).push({text:label,citation:null}); }
  }
  const provisions=catOrder.filter(c=>buckets[c]).map(c=>({category:catTitle[c],items:buckets[c]}));
  const lawCount=row.lawtotal;
  states[code]={
    name:row.state,
    grade:gradeFromLawtotal(lawCount),
    lawCount,
    restrictions:lawCount,
    policies:{
      permitless_carry: row.permitconcealed===0,
      universal_bg_check: row.universal===1 || row.universalh===1,
      red_flag: row.gvro===1,
      assault_weapon_ban: row.assault===1,
      magazine_limit: row.magazine===1,
      waiting_period: row.waiting===1 || row.waitingh===1
    },
    provisions, detailed:true, year:2020,
    source:"State Firearm Laws Database (Siegel et al., Boston University)"
  };
}
// DC: not in the 50-state database — curated summary only
states.DC={
  name:"District of Columbia", grade:"F", lawCount:null, restrictions:null,
  policies:{permitless_carry:false,universal_bg_check:true,red_flag:true,assault_weapon_ban:true,magazine_limit:true,waiting_period:true},
  provisions:[{category:"Note",items:[{text:"The 50-state State Firearm Laws Database excludes DC. DC is among the most heavily regulated US jurisdictions (registration, training, magazine limit, etc.); detailed provisions to be added from primary sources.",citation:null}]}],
  detailed:false, year:2020, source:"curated note"
};

const out={
  _meta:{
    description:"Per-state firearm-law data for the GunLawMap mockup/app. Provision values are from the State Firearm Laws Database (latest year 2020); labels are simplified renderings of its codebook for display. NOT legal advice and not guaranteed current — many states changed laws after 2020.",
    source:"State Firearm Laws Database — Siegel et al., Boston University (statefirearmlaws.org); mirror: dynamicalsystemslaboratory/Firearm-database",
    vintage:"2020",
    grading:"Grade reflects how FEW laws/restrictions a state imposes (fewer = higher). Derived from lawtotal (count of the 134 tracked provisions in effect): 0-9=A, 10-19=A-, 20-29=B, 30-44=C, 45-59=D, 60-79=D-, 80+=F. Opposite orientation from gun-safety scorecards.",
    grades:GRADES,
    coverage:"50 states from the database + a curated DC summary = 51 jurisdictions.",
    disclaimer:"Illustrative; verify against official state statutes and counsel."
  },
  states
};
fs.writeFileSync('data/sample-states.json', JSON.stringify(out,null,2)+"\n");

// summary
const dist={}; Object.values(states).forEach(s=>{dist[s.grade]=(dist[s.grade]||0)+1;});
console.log("states written:",Object.keys(states).length);
console.log("grade distribution:",JSON.stringify(dist));
for(const c of ["AZ","CA","TX","NY","FL","VT","HI"]){const s=states[c];console.log(c,"grade",s.grade,"| laws",s.lawCount,"| provision categories",s.provisions.length,"| total items",s.provisions.reduce((a,p)=>a+p.items.length,0));}
