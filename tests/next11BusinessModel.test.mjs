import test from "node:test";
import assert from "node:assert/strict";
import {
 demoBusinessUnits,demoFinancialSeries,demoFinancialSummary,
 demoCrmPipeline,demoCrmSummary,advanceDemoOpportunity,buildDemoCrmActivity
} from "../app/next11/demoBusinessModel.mjs";

test("each synthetic company sees only its own business units, records and IDs",()=>{
 const first=demoBusinessUnits(1),second=demoBusinessUnits(2);
 assert.equal(first.length,2);assert.equal(second.length,1);
 assert.ok(first.every(x=>x.companyId===1&&x.id.startsWith("PE-0")));
 assert.ok(second.every(x=>x.companyId===2&&x.id.startsWith("PE-1")));
 assert.ok(demoCrmPipeline(1).every(x=>x.companyId===1));
 assert.ok(demoCrmPipeline(2).every(x=>x.companyId===2));
 assert.notEqual(demoCrmPipeline(1)[0].id,demoCrmPipeline(2)[0].id);
 assert.throws(()=>demoBusinessUnits(999),RangeError);
 assert.throws(()=>demoFinancialSeries(1,"PE-11"),RangeError);
});
test("financial chart always reconciles integers and unit sums to company totals",()=>{
 for(const id of [1,2,3]){
  const units=demoBusinessUnits(id),full=demoFinancialSeries(id,"all");
  assert.equal(full.length,6);
  for(let i=0;i<6;i++){
   const months=units.map(u=>demoFinancialSeries(id,u.id)[i]);
   assert.equal(months.reduce((s,x)=>s+x.revenueCents,0),full[i].revenueCents);
   assert.equal(months.reduce((s,x)=>s+x.costCents,0),full[i].costCents);
   assert.equal(full[i].revenueCents-full[i].costCents,full[i].profitCents);
   for(const field of ["revenueCents","costCents","profitCents"])
    assert.ok(Number.isSafeInteger(full[i][field]));
  }
  const summary=demoFinancialSummary(full);
  assert.equal(summary.revenueCents-summary.costCents,summary.profitCents);
  assert.ok(summary.marginPercent>=0&&summary.marginPercent<100);
 }
});
test("pipeline uses integer cents, probability, immutable revisions and forbids stage skipping",()=>{
 const original=demoCrmPipeline(1);
 const target=original[0];
 const before=demoCrmSummary(original,1);
 assert.equal(before.openCount,3);
 assert.equal(before.totalValueCents,4290000);
 const next=advanceDemoOpportunity(original,1,target.id,"Odkrivanje",target.version);
 assert.equal(next[0].stage,"Odkrivanje");
 assert.equal(next[0].version,target.version+1);
 assert.equal(next[0].probability,30);
 assert.equal(original[0].stage,"Kvalifikacija");
 assert.equal(demoCrmSummary(next,1).weightedValueCents,
   before.weightedValueCents+Math.round(target.valueCents*(30-10)/100));
 assert.throws(()=>advanceDemoOpportunity(next,1,target.id,"Ponudba",1),/Zastarela/);
 assert.throws(()=>advanceDemoOpportunity(original,1,target.id,"Pogajanja",1),/preskok/);
 assert.throws(()=>advanceDemoOpportunity(original,2,target.id,"Odkrivanje",1),RangeError);
 assert.throws(()=>demoCrmSummary([...original,...demoCrmPipeline(2)],1),RangeError);
});
test("closed opportunity does not count toward open pipeline and cannot be reopened",()=>{
 let state=demoCrmPipeline(2),deal=state[0];
 for(const stage of ["Ponudba","Pogajanja","Pridobljeno"]){
  state=advanceDemoOpportunity(state,2,deal.id,stage,deal.version);
  deal=state[0];
 }
 assert.equal(deal.stage,"Pridobljeno");
 assert.equal(demoCrmSummary(state,2).openCount,0);
 assert.equal(demoCrmSummary(state,2).weightedValueCents,0);
 assert.throws(()=>advanceDemoOpportunity(state,2,deal.id,"Kvalifikacija",deal.version),/preskok/);
});
test("synthetic activity cannot link a foreign opportunity or an unqualified identifier",()=>{
 const deals=demoCrmPipeline(1);
 const activity=buildDemoCrmActivity(1,deals[0].id,deals,"SYN-ACT-1");
 assert.deepEqual([activity.companyId,activity.dealId,activity.status],[1,deals[0].id,"open"]);
 assert.throws(()=>buildDemoCrmActivity(2,deals[0].id,deals,"SYN-ACT-1"),RangeError);
 assert.throws(()=>buildDemoCrmActivity(1,deals[0].id,deals,"ID-1"),RangeError);
});
test("fixtures returned to UI are copies, not a shared mutable cache",()=>{
 const a=demoCrmPipeline(1);
 a[0].partner="CORRUPTED";
 assert.notEqual(demoCrmPipeline(1)[0].partner,"CORRUPTED");
 const units=demoBusinessUnits(1);
 units[0].name="CORRUPTED";
 assert.notEqual(demoBusinessUnits(1)[0].name,"CORRUPTED");
});
