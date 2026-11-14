// FinAI NEXT11 — entirely synthetic, deterministic, per-company demo fixtures.
// All figures are integer cents and all results are fresh copies. No network, DB, or real data.
const MONTHS = ["Jun", "Jul", "Avg", "Sep", "Okt", "Nov"];
const PIPELINE_STAGES = ["Kvalifikacija", "Odkrivanje", "Ponudba", "Pogajanja", "Pridobljeno"];
const FIXTURES = {
  1: {
    units: [
      {id:"PE-01",name:"Poslovna enota Sever",location:"Demo mesto A",baseRevenue:960000,baseCost:710000},
      {id:"PE-02",name:"Poslovna enota Jug",location:"Demo mesto B",baseRevenue:710000,baseCost:510000},
    ],
    deals:[
      {id:"SYN-CRM-101",name:"Projekt Alfa – oprema",partner:"Sintetični kupec A",unitId:"PE-01",stage:"Kvalifikacija",valueCents:1250000,probability:10,version:1},
      {id:"SYN-CRM-102",name:"Pogodba Beta – vzdrževanje",partner:"Sintetični kupec B",unitId:"PE-01",stage:"Ponudba",valueCents:860000,probability:60,version:1},
      {id:"SYN-CRM-103",name:"Projekt Gama – poslovalnica",partner:"Sintetični kupec C",unitId:"PE-02",stage:"Pogajanja",valueCents:2180000,probability:80,version:1},
    ],
  },
  2: {
    units:[{id:"PE-11",name:"Poslovna enota Vzhod",location:"Demo mesto C",baseRevenue:610000,baseCost:445000}],
    deals:[{id:"SYN-CRM-201",name:"Projekt Delta",partner:"Sintetični kupec D",unitId:"PE-11",stage:"Odkrivanje",valueCents:920000,probability:30,version:1}],
  },
  3: {
    units:[{id:"PE-21",name:"Poslovna enota Zahod",location:"Demo mesto D",baseRevenue:475000,baseCost:340000}],
    deals:[{id:"SYN-CRM-301",name:"Projekt Epsilon",partner:"Sintetični kupec E",unitId:"PE-21",stage:"Ponudba",valueCents:745000,probability:60,version:1}],
  },
};
export const DEMO_PIPELINE_STAGES = Object.freeze([...PIPELINE_STAGES]);
export const DEMO_MONTHS = Object.freeze([...MONTHS]);

function fixture(companyId){
  if (!Number.isSafeInteger(companyId) || !Object.hasOwn(FIXTURES,companyId)) {
    throw new RangeError("Podjetje ni vključeno v sintetični poslovni nabor.");
  }
  return FIXTURES[companyId];
}
export function demoBusinessUnits(companyId){
  return fixture(companyId).units.map(unit=>({
    id:unit.id,name:unit.name,location:unit.location,companyId,
  }));
}
export function demoFinancialSeries(companyId,unitId="all"){
  const data=fixture(companyId);
  const chosen=unitId==="all"?data.units:data.units.filter(u=>u.id===unitId);
  if(!chosen.length)throw new RangeError("Poslovna enota ne pripada izbranemu podjetju.");
  return MONTHS.map((month,index)=>{
    // Deliberately non-flat synthetic historical values; no real records.
    const multipliers=[90,106,97,112,119,125];
    const revenueCents=chosen.reduce((s,u)=>s+Math.round(u.baseRevenue*multipliers[index]/100),0);
    const costCents=chosen.reduce((s,u)=>s+Math.round(u.baseCost*([94,103,99,109,116,120][index])/100),0);
    return {month,index,revenueCents,costCents,profitCents:revenueCents-costCents,companyId};
  });
}
export function demoFinancialSummary(series){
  if(!Array.isArray(series)||!series.length)throw new RangeError("Ni podatkov za finančni pregled.");
  const result=series.reduce((a,row)=>({
    revenueCents:a.revenueCents+row.revenueCents,
    costCents:a.costCents+row.costCents,
    profitCents:a.profitCents+row.profitCents,
  }),{revenueCents:0,costCents:0,profitCents:0});
  if(result.revenueCents-result.costCents!==result.profitCents)throw new Error("Neskladje finančnega pregleda.");
  return {...result,marginPercent:result.revenueCents?
    Math.round(result.profitCents*10000/result.revenueCents)/100:0};
}
export function demoCrmPipeline(companyId){
  return fixture(companyId).deals.map(deal=>({...deal,companyId}));
}
export function demoCrmSummary(deals,companyId){
  if(!Array.isArray(deals)||deals.some(d=>d.companyId!==companyId))
    throw new RangeError("CRM izračun ne sme združiti različnih podjetij.");
  const open=deals.filter(d=>d.stage!=="Pridobljeno");
  return {
    openCount:open.length,
    totalValueCents:open.reduce((n,d)=>n+d.valueCents,0),
    weightedValueCents:open.reduce((n,d)=>n+Math.round(d.valueCents*d.probability/100),0),
  };
}
export function advanceDemoOpportunity(deals,companyId,dealId,nextStage,expectedVersion){
  if(!Array.isArray(deals))throw new TypeError("Manjkajoči CRM podatki.");
  const current=deals.find(d=>d.id===dealId&&d.companyId===companyId);
  if(!current||!fixture(companyId).units.some(u=>u.id===current.unitId))
    throw new RangeError("Priložnost ne pripada izbranemu podjetju.");
  if(current.version!==expectedVersion)throw new Error("Zastarela različica CRM priložnosti.");
  const from=PIPELINE_STAGES.indexOf(current.stage),to=PIPELINE_STAGES.indexOf(nextStage);
  if(from<0||to!==from+1)throw new Error("Nedovoljen preskok prodajne faze.");
  const probabilities=[10,30,60,80,100];
  return deals.map(d=>d.id===dealId ? {
    ...d,stage:nextStage,probability:probabilities[to],version:d.version+1
  }:{...d});
}
export function buildDemoCrmActivity(companyId,dealId,deals,activityId){
  const opportunity=deals.find(d=>d.companyId===companyId&&d.id===dealId);
  if(!opportunity||!/^SYN-ACT-[A-Z0-9-]{1,64}$/.test(activityId))
    throw new RangeError("Neveljavna sintetična CRM aktivnost.");
  return {id:activityId,companyId,dealId,unitId:opportunity.unitId,
    subject:"Sintetični nadaljnji kontakt",status:"open",type:"opomnik"};
}
