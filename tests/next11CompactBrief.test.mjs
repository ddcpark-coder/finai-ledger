import test from "node:test";
import assert from "node:assert/strict";
import {compactDemoBusinessBrief} from "../app/next11/compactBusinessBrief.mjs";
import {demoBusinessUnits} from "../app/next11/demoBusinessModel.mjs";

test("compact mobile/desktop summary uses consistent company currency and stock",()=>{
 for(const companyId of [1,2,3]){
  const brief=compactDemoBusinessBrief(companyId);
  assert.equal(brief.companyId,companyId);
  assert.equal(brief.demoOnly,true);
  assert.equal(brief.recentMonths.length,3);
  assert.ok(Number.isInteger(brief.revenueCents)&&brief.revenueCents>0);
  assert.equal(brief.revenueCents-brief.costCents,brief.profitCents);
  assert.equal(brief.stock.onHand-brief.stock.reserved,brief.stock.available);
  assert.ok(brief.sixMonthMarginPercent>0);
  assert.ok(brief.crm.openCount>0);
 }
});
test("unit-filtered mobile and desktop views reconcile to their own company's total",()=>{
 const companyId=1;
 const units=demoBusinessUnits(companyId);
 const totals=compactDemoBusinessBrief(companyId);
 const parts=units.map(u=>compactDemoBusinessBrief(companyId,u.id));
 for(const key of ["revenueCents","costCents","profitCents"])
  assert.equal(parts.reduce((sum,part)=>sum+part[key],0),totals[key]);
 for(const key of ["onHand","reserved","available"])
  assert.equal(parts.reduce((sum,part)=>sum+part.stock[key],0),totals.stock[key]);
 assert.equal(parts.reduce((sum,part)=>sum+part.crm.openCount,0),totals.crm.openCount);
 assert.throws(()=>compactDemoBusinessBrief(companyId,"PE-11"),RangeError);
 assert.throws(()=>compactDemoBusinessBrief(999),RangeError);
});
test("returned offline preview can be read without credentials, network or persistence",()=>{
 const first=compactDemoBusinessBrief(2),second=compactDemoBusinessBrief(2);
 assert.deepEqual(first,second);
 first.recentMonths[0].revenueCents=0;
 assert.ok(compactDemoBusinessBrief(2).recentMonths[0].revenueCents>0);
 assert.notDeepEqual(compactDemoBusinessBrief(1),compactDemoBusinessBrief(2));
});
