/* Codebook for the State Firearm Laws Database (Siegel / Boston University).
   Maps each provision variable to a category + a plain-language label.
   Labels are simplified renderings of the official codebook for display; the
   underlying 0/1 values are from the database (latest year 2020). See:
   https://www.statefirearmlaws.org  ·  data mirror: dynamicalsystemslaboratory/Firearm-database */

const categories = [
  ["carry",      "Concealed & open carry"],
  ["bg",         "Background checks"],
  ["wait",       "Waiting periods"],
  ["buyer",      "Buyer regulations & permits"],
  ["age",        "Minimum age requirements"],
  ["prohibited", "Prohibited people (high-risk)"],
  ["dv",         "Domestic violence"],
  ["redflag",    "Extreme risk (red flag)"],
  ["aw",         "Assault weapons & magazines"],
  ["dealer",     "Dealer regulations"],
  ["amm",        "Ammunition"],
  ["storage",    "Safe storage & child access"],
  ["traffic",    "Trafficking & straw purchases"],
  ["possess",    "Possession & location limits"],
  ["other",      "Other sales restrictions"],
  ["liability",  "Liability & immunity"],
  ["preempt",    "Preemption (local authority)"]
];

const vars = {
  // ---- Prohibited people (high-risk) ----
  felony:           ["prohibited","Possession prohibited for people convicted of a felony (beyond federal law)."],
  invcommitment:    ["prohibited","Possession prohibited for people involuntarily committed to a mental institution."],
  invoutpatient:    ["prohibited","Possession prohibited for people under involuntary outpatient mental-health treatment."],
  danger:           ["prohibited","Firearms may be denied/removed from a person found to be a danger to self or others."],
  drugmisdemeanor:  ["prohibited","Possession prohibited for people with a drug-misdemeanor conviction."],
  alctreatment:     ["prohibited","Possession prohibited for people committed for alcohol treatment."],
  alcoholism:       ["prohibited","Possession prohibited for people with a history of alcohol abuse."],
  relinquishment:   ["prohibited","Newly-prohibited people must surrender firearms they already own."],
  violent:          ["prohibited","Possession prohibited for people convicted of a violent misdemeanor."],
  violenth:         ["prohibited","Handgun possession prohibited for people convicted of a violent misdemeanor."],
  violentpartial:   ["prohibited","Possession prohibited for some (not all) violent misdemeanants."],

  // ---- Dealer regulations ----
  dealer:           ["dealer","State license required to sell firearms."],
  dealerh:          ["dealer","State license required to sell handguns."],
  recordsall:       ["dealer","Sellers must keep records of all firearm sales."],
  recordsallh:      ["dealer","Sellers must keep records of all handgun sales."],
  recordsdealer:    ["dealer","Licensed dealers must keep records of firearm sales."],
  recordsdealerh:   ["dealer","Licensed dealers must keep records of handgun sales."],
  reportall:        ["dealer","All firearm sales must be reported to authorities."],
  reportallh:       ["dealer","All handgun sales must be reported to authorities."],
  reportdealer:     ["dealer","Dealers must report firearm sales to state/local police."],
  reportdealerh:    ["dealer","Dealers must report handgun sales to state/local police."],
  purge:            ["dealer","Background-check/sales records must be purged (anti-registry)."],
  residential:      ["dealer","Restrictions on dealers operating from residential premises."],
  theft:            ["dealer","Dealers must report lost or stolen inventory firearms."],
  security:         ["dealer","Dealers must meet premises security/storage requirements."],
  inspection:       ["dealer","State may inspect licensed firearms dealers."],

  // ---- Ammunition ----
  ammlicense:       ["amm","License required to sell ammunition."],
  ammrecords:       ["amm","Ammunition sellers must keep records of sales."],
  ammpermit:        ["amm","Permit required to purchase ammunition."],
  ammrestrict:      ["amm","Restrictions on certain types of ammunition."],
  ammbackground:    ["amm","Background check required to purchase ammunition."],
  amm18:            ["amm","Minimum age 18 to purchase long-gun ammunition."],
  amm21h:           ["amm","Minimum age 21 to purchase handgun ammunition."],

  // ---- Buyer regulations & permits ----
  permit:           ["buyer","Permit/license required to purchase a firearm."],
  permith:          ["buyer","Permit/license required to purchase a handgun."],
  fingerprint:      ["buyer","Fingerprinting required to purchase/own a firearm."],
  training:         ["buyer","Safety training required to purchase/own a firearm."],
  permitlaw:        ["buyer","Purchase permit issued at law-enforcement discretion."],
  registration:     ["buyer","Firearm registration required."],
  registrationh:    ["buyer","Handgun registration required."],
  defactoreg:       ["buyer","De-facto registration (state retains firearm-purchase records)."],
  defactoregh:      ["buyer","De-facto handgun registration (state retains records)."],

  // ---- Minimum age ----
  age21handgunsale:    ["age","Minimum age 21 to buy a handgun from a dealer."],
  age18longgunsale:    ["age","Minimum age 18 to buy a long gun from a dealer."],
  age21longgunsaled:   ["age","Minimum age 21 to buy a long gun from a dealer."],
  age21longgunsale:    ["age","Minimum age 21 to buy a long gun (all sellers)."],
  age21handgunpossess: ["age","Minimum age 21 to possess a handgun."],
  age18longgunpossess: ["age","Minimum age 18 to possess a long gun."],
  age21longgunpossess: ["age","Minimum age 21 to possess a long gun."],

  // ---- Background checks ----
  loststolen:       ["possess","Owners must report lost or stolen firearms."],
  universal:        ["bg","Universal background checks for all firearm sales (incl. private)."],
  universalh:       ["bg","Universal background checks for all handgun sales."],
  gunshow:          ["bg","Background checks required at gun shows (all firearms)."],
  gunshowh:         ["bg","Background checks required at gun shows (handguns)."],
  universalpermit:  ["bg","Universal check enforced via a permit-to-purchase requirement (all firearms)."],
  universalpermith: ["bg","Universal check enforced via a permit requirement (handguns)."],
  backgroundpurge:  ["bg","Completed background-check records are purged after a set time."],
  ammbackground_dup:["bg",""], // placeholder (ammbackground mapped above)
  threedaylimit:    ["bg","Closes the federal 'default proceed' gap — no sale until the check clears."],
  mentalhealth:     ["bg","State reports mental-health records to the federal NICS system."],
  statechecks:      ["bg","State (not just FBI) runs background checks on firearm sales."],
  statechecksh:     ["bg","State runs background checks on handgun sales."],

  // ---- Waiting periods ----
  waiting:          ["wait","Waiting period before taking possession of any firearm."],
  waitingh:         ["wait","Waiting period before taking possession of a handgun."],

  // ---- Assault weapons & magazines ----
  assault:          ["aw","Assault-weapon restriction or ban."],
  onefeature:       ["aw","Assault-weapon law uses a stricter one-feature test."],
  assaultlist:      ["aw","Assault-weapon ban names specific listed models."],
  assaultregister:  ["aw","Grandfathered assault weapons must be registered."],
  assaulttransfer:  ["aw","Transfer of grandfathered assault weapons is restricted."],
  magazine:         ["aw","Large-capacity magazine restriction."],
  tenroundlimit:    ["aw","Magazine capacity limited to 10 rounds."],
  magazinepreowned: ["aw","Magazine limit applies to previously-owned magazines too."],

  // ---- Other sales restrictions ----
  onepermonth:      ["other","One-handgun-per-month purchase limit."],
  microstamp:       ["other","Microstamping required for semi-automatic handguns."],
  junkgun:          ["other","Ban on cheap 'junk guns' / Saturday-night-specials."],
  personalized:     ["other","Design/safety standards for handguns (e.g., approved-handgun roster)."],

  // ---- Trafficking & straw purchases ----
  traffickingbackground:  ["traffic","Anti-trafficking law targets background-check evasion."],
  traffickingprohibited:  ["traffic","Gun trafficking explicitly prohibited (all firearms)."],
  traffickingprohibitedh: ["traffic","Handgun trafficking explicitly prohibited."],
  strawpurchase:    ["traffic","Straw purchases prohibited (all firearms)."],
  strawpurchaseh:   ["traffic","Straw purchases of handguns prohibited."],

  // ---- Extreme risk (red flag) ----
  gvro:             ["redflag","Extreme Risk Protection Order ('red flag') law."],
  gvrolawenforcement:["redflag","Red-flag petitions limited to law enforcement."],

  // ---- Possession & location limits ----
  college:          ["possess","Firearms restricted on college/university campuses."],
  collegeconcealed: ["possess","Concealed carry restricted on college campuses."],
  elementary:       ["possess","Firearms restricted at K-12 schools."],
  nosyg:            ["possess","No 'Stand Your Ground' law (duty to retreat in public)."],

  // ---- Open carry (carry category) ----
  opencarryh:       ["carry","Open carry of handguns regulated or prohibited."],
  opencarryl:       ["carry","Open carry of long guns regulated or prohibited."],
  opencarrypermith: ["carry","Permit required to openly carry a handgun."],
  opencarrypermitl: ["carry","Permit required to openly carry a long gun."],

  // ---- Concealed carry permitting ----
  permitconcealed:  ["carry","Permit required to carry a concealed firearm."],
  mayissue:         ["carry","'May issue' permitting — issuing authority has discretion."],
  showing:          ["carry","Concealed-carry permit requires showing good cause / justifiable need."],
  ccbackground:     ["carry","Background check required for a concealed-carry permit."],
  ccbackgroundnics: ["carry","Concealed-carry permit process includes a NICS check."],
  ccrenewbackground:["carry","Background check required to renew a concealed-carry permit."],
  ccrevoke:         ["carry","Concealed-carry permits revoked for disqualifying conduct."],

  // ---- Safe storage & child access ----
  lockd:            ["storage","Locking device must be sold with handguns (dealers)."],
  lockp:            ["storage","Locking-device requirement on handgun purchase."],
  locked:           ["storage","Firearms must be stored locked in certain circumstances."],
  lockstandards:    ["storage","Safety standards required for gun locks."],
  capliability:     ["storage","Child-access-prevention liability for negligent storage."],
  capaccess:        ["storage","CAP liability when a child gains access to a firearm."],
  capuses:          ["storage","CAP liability when a child uses/handles a firearm."],
  capunloaded:      ["storage","Child-access-prevention applies even to unloaded firearms."],
  cap18:            ["storage","Child-access-prevention covers minors under 18."],
  cap16:            ["storage","Child-access-prevention covers minors under 16."],
  cap14:            ["storage","Child-access-prevention covers minors under 14."],

  // ---- Liability & immunity ----
  liability:        ["liability","Gun industry can be held civilly liable (no special immunity)."],
  immunity:         ["liability","Gun industry granted immunity from certain civil lawsuits."],

  // ---- Preemption ----
  preemption:       ["preempt","State preempts local firearm regulation."],
  preemptionnarrow: ["preempt","Narrow preemption — localities keep some authority."],
  preemptionbroad:  ["preempt","Broad preemption of local firearm laws."],

  // ---- Domestic violence ----
  mcdv:             ["dv","Possession barred for misdemeanor domestic-violence convictions."],
  mcdvdating:       ["dv","DV firearm prohibition extends to dating partners."],
  mcdvsurrender:    ["dv","Convicted domestic abusers must surrender firearms."],
  mcdvsurrendernoconditions:["dv","Domestic abusers must surrender firearms with no exceptions."],
  mcdvsurrenderdating:["dv","Surrender requirement extends to dating-partner abusers."],
  mcdvremovalallowed:["dv","Police may remove firearms at a domestic-violence incident."],
  mcdvremovalrequired:["dv","Police must remove firearms at a domestic-violence incident."],
  incidentremoval:  ["dv","Firearms may be removed at a domestic-violence incident scene."],
  incidentall:      ["dv","All firearms removed at a domestic-violence incident scene."],
  dvro:             ["dv","Possession barred for subjects of a domestic-violence restraining order."],
  dvrodating:       ["dv","DVRO firearm prohibition extends to dating partners."],
  exparte:          ["dv","Possession barred under an emergency (ex-parte) DV order."],
  expartedating:    ["dv","Ex-parte DVRO prohibition extends to dating partners."],
  dvrosurrender:    ["dv","DVRO subjects must surrender firearms."],
  dvrosurrendernoconditions:["dv","DVRO surrender required with no exceptions."],
  dvrosurrenderdating:["dv","DVRO surrender requirement extends to dating partners."],
  expartesurrender: ["dv","Ex-parte DVRO subjects must surrender firearms."],
  expartesurrendernoconditions:["dv","Ex-parte DVRO surrender required with no exceptions."],
  expartesurrenderdating:["dv","Ex-parte DVRO surrender extends to dating partners."],
  dvroremoval:      ["dv","Firearms removed from DVRO subjects."],
  stalking:         ["dv","Possession barred for people convicted of stalking."]
};
delete vars.ammbackground_dup;

module.exports = { categories, vars };
