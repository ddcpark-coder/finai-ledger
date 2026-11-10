import test from "node:test";
import assert from "node:assert/strict";
import {calculateCashflowScenario} from "../app/banking/cashFlowScenario.mjs";

test("30-day scenario uses integer cents with explicit assumptions",()=>{
 const baseline=calculateCashflowScenario(1,30,"baseline");
 const expectedReceipts=Math.round((122000+244000+91500)*0.75);
 assert.equal(baseline.expectedReceiptsCents,expectedReceipts);
 assert.equal(baseline.duePayablesCents,32000+18500+21450);
 assert.equal(baseline.closingCents,1245080+expectedReceipts-(32000+18500+21450));
 assert.equal(baseline.calculatedFrom,"fixed-synthetic-scenario");
});
test("increasing collections increases closing cash, longer period adds due items",()=>{
 const conservative=calculateCashflowScenario(2,30,"conservative");
 const base=calculateCashflowScenario(2,30,"baseline");
 const optimistic=calculateCashflowScenario(2,30,"optimistic");
 assert.ok(conservative.closingCents<base.closingCents);
 assert.ok(base.closingCents<optimistic.closingCents);
 assert.ok(calculateCashflowScenario(1,14).grossReceivablesCents<calculateCashflowScenario(1,30).grossReceivablesCents);
});
test("all demo companies have separated cash movements and malformed inputs fail closed",()=>{
 const a=calculateCashflowScenario(1);
 const b=calculateCashflowScenario(2);
 const c=calculateCashflowScenario(3);
 assert.notEqual(a.openingCents,b.openingCents);
 assert.notEqual(b.openingCents,c.openingCents);
 for(const id of [0,-1,4,"1",NaN])assert.throws(()=>calculateCashflowScenario(id));
 assert.throws(()=>calculateCashflowScenario(1,45));
 assert.throws(()=>calculateCashflowScenario(1,30,"guess"));
});
