/* Curated 2021–2025 changes layered on top of the 2020 State Firearm Laws Database
   baseline, so the dataset reflects current law. Each entry toggles the relevant
   coded provision(s); the build recomputes lawtotal, grade, flags, and the provision
   list from the result, and records the change in each state's `updates` list.
   Illustrative — verify against primary sources. */

module.exports = [
  // ---- Permitless ("constitutional") carry adopted after 2020 ----
  {code:"IA", year:2021, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"MT", year:2021, label:"Permitless carry expanded",           set:{permitconcealed:0}},
  {code:"TN", year:2021, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"TX", year:2021, label:"Permitless carry enacted (HB 1927)",  set:{permitconcealed:0}},
  {code:"UT", year:2021, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"AL", year:2022, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"GA", year:2022, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"IN", year:2022, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"OH", year:2022, label:"Permitless carry enacted",            set:{permitconcealed:0}},
  {code:"FL", year:2023, label:"Permitless carry enacted (HB 543)",   set:{permitconcealed:0}},
  {code:"NE", year:2023, label:"Permitless carry enacted (LB 77)",    set:{permitconcealed:0}},
  {code:"LA", year:2024, label:"Permitless carry effective",          set:{permitconcealed:0}},
  {code:"SC", year:2024, label:"Permitless & open carry enacted",     set:{permitconcealed:0, opencarryh:0}},

  // ---- States that tightened laws after 2020 ----
  // Michigan (2023, mostly effective 2024)
  {code:"MI", year:2023, label:"Universal background checks enacted", set:{universal:1, universalh:1}},
  {code:"MI", year:2023, label:"Red-flag (ERPO) law enacted",         set:{gvro:1}},
  {code:"MI", year:2023, label:"Safe-storage law enacted",            set:{locked:1, capaccess:1}},
  // Minnesota (2023–2024)
  {code:"MN", year:2023, label:"Universal background checks enacted", set:{universal:1, universalh:1}},
  {code:"MN", year:2023, label:"Red-flag (ERPO) law enacted",         set:{gvro:1}},
  {code:"MN", year:2024, label:"Safe-storage requirements",           set:{locked:1}},
  // Illinois (2023, PICA)
  {code:"IL", year:2023, label:"Assault-weapon ban + magazine limit (PICA)", set:{assault:1, assaultlist:1, assaultregister:1, magazine:1}},
  // Washington (2022–2024)
  {code:"WA", year:2022, label:"Large-capacity magazine limit (10 rds)", set:{magazine:1, tenroundlimit:1}},
  {code:"WA", year:2023, label:"Assault-weapon sales ban enacted",      set:{assault:1, assaultlist:1}},
  {code:"WA", year:2023, label:"10-day waiting period + training",      set:{waiting:1, waitingh:1, training:1}},
  // Delaware (2022, 2024)
  {code:"DE", year:2022, label:"Assault-weapon ban + magazine limit",  set:{assault:1, magazine:1}},
  {code:"DE", year:2024, label:"Permit-to-purchase enacted (eff. 2025)", set:{permit:1, permith:1}},
  // Rhode Island (2022)
  {code:"RI", year:2022, label:"Large-capacity magazine limit (10 rds)", set:{magazine:1, tenroundlimit:1}},
  // Colorado (2021, 2023)
  {code:"CO", year:2021, label:"Safe-storage + lost/stolen reporting", set:{locked:1, loststolen:1}},
  {code:"CO", year:2023, label:"3-day waiting period enacted",         set:{waiting:1, waitingh:1}},
  {code:"CO", year:2023, label:"Purchase age raised to 21",            set:{age21longgunsale:1, age21longgunsaled:1}},
  // Oregon (2021)
  {code:"OR", year:2021, label:"Safe-storage law enacted",             set:{locked:1}},
  // Vermont (2023)
  {code:"VT", year:2023, label:"72-hour waiting period enacted",       set:{waiting:1, waitingh:1}},
  // Maine (2024)
  {code:"ME", year:2024, label:"72-hour waiting period enacted",       set:{waiting:1, waitingh:1}},
  // New Mexico (2024)
  {code:"NM", year:2024, label:"7-day waiting period enacted",         set:{waiting:1, waitingh:1}}
];
