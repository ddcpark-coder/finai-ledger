import test from "node:test";
import assert from "node:assert/strict";
import {offlineScenarioSkuOptions,projectOfflineOrder}
 from "../app/next13/offlineBusinessScenario.mjs";
import {compactDemoBusinessBrief} from "../app/next11/compactBusinessBrief.mjs";

const options={sku:"TAB-10070",quantity:4,unitPriceCents:12500,unitCostCents:7500};

test("offline planning uses SKU-specific stock and exact cent arithmetic",()=>{
 const original=compactDemoBusinessBrief(1,"PE-01");
 const available=offlineScenarioSkuOptions(1,"PE-01").find(x=>x.sku==="TAB-10070");
 assert.equal(available.onHand,12);
 assert.equal(available.reserved,2);
 assert.equal(available.available,10);
 const plan=projectOfflineOrder(1,"PE-01",options);
 assert.equal(plan.companyId,1);
 assert.equal(plan.demoOnly,true);
 assert.equal(plan.posting,false);
 assert.equal(plan.availableBefore,10);
 assert.equal(plan.fulfilled,4);
 assert.equal(plan.availableAfter,6);
 assert.equal(plan.shortage,0);
 assert.equal(plan.additionalRevenueCents,50000);
 assert.equal(plan.additionalCostCents,30000);
 assert.equal(plan.projectedProfitCents,original.profitCents+20000);
 assert.equal(plan.projectedRevenueCents-plan.projectedCostCents,
  plan.projectedProfitCents);
 // No real or simulated source stock modification.
 assert.deepEqual(compactDemoBusinessBrief(1,"PE-01"),original);
 assert.deepEqual(projectOfflineOrder(1,"PE-01",options),plan);
});
test("projected revenue excludes out-of-stock units and supports zero quantity",()=>{
 const plan=projectOfflineOrder(1,"PE-01",{...options,quantity:100});
 assert.equal(plan.fulfilled,10);
 assert.equal(plan.shortage,90);
 assert.equal(plan.availableAfter,0);
 assert.equal(plan.additionalRevenueCents,125000);
 assert.equal(plan.unfulfilledPotentialCents,1125000);
 const empty=projectOfflineOrder(1,"PE-01",{...options,quantity:0});
 assert.equal(empty.fulfilled,0);
 assert.equal(empty.shortage,0);
 assert.equal(empty.additionalRevenueCents,0);
 assert.equal(empty.projectedProfitCents,empty.baselineProfitCents);
});
test("company and unit isolation is preserved in all offline views",()=>{
 for(const companyId of [1,2,3]){
  const inventory=offlineScenarioSkuOptions(companyId);
  assert.ok(inventory.length>0);
  for(const row of inventory){
   const result=projectOfflineOrder(companyId,"all",{
    sku:row.sku,quantity:1,unitPriceCents:12500,unitCostCents:7500
   });
   assert.equal(result.companyId,companyId);
   assert.equal(result.sku,row.sku);
   assert.equal(result.availableBefore,row.available);
  }
 }
 assert.throws(()=>offlineScenarioSkuOptions(1,"PE-11"),RangeError);
 assert.throws(()=>offlineScenarioSkuOptions(2,"PE-01"),RangeError);
 assert.throws(()=>projectOfflineOrder(1,"PE-01",{
  ...options,sku:"KC-100"
 }),RangeError);
 assert.throws(()=>projectOfflineOrder(999,"all",options),RangeError);
});
test("invalid money, non-integer stock and overlarge values fail closed",()=>{
 for(const bad of [
  {quantity:-1},{quantity:201},{quantity:1.3},
  {unitPriceCents:12.50},{unitPriceCents:0},
  {unitCostCents:-1},{unitCostCents:NaN},
  {unitPriceCents:Number.MAX_SAFE_INTEGER},
 ])assert.throws(()=>projectOfflineOrder(1,"PE-01",{
  ...options,...bad
 }),RangeError);
});
