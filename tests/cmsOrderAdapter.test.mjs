import test from "node:test";
import assert from "node:assert/strict";
import {DEMO_WOO_ORDERS,normalizeSyntheticWooOrder,importSyntheticCmsOrders} from "../app/integrations/cmsOrderAdapter.mjs";

test("normalizes synthetic WooCommerce order deterministically with integer cents",()=>{
 const row=normalizeSyntheticWooOrder(DEMO_WOO_ORDERS[0],1);
 assert.equal(row.id,"CMS-DEMO-1-1001");
 assert.equal(row.companyId,1);
 assert.equal(row.grossCents,12200);
 assert.equal(row.lines[0].grossCents,12200);
 assert.equal(row.externalKey,"1:woocommerce:demo-shop:1001");
 assert.equal(row.status,"Za pregled");
});
test("repeated import is idempotent but two tenants remain separate",()=>{
 const first=importSyntheticCmsOrders([],DEMO_WOO_ORDERS,1);
 assert.equal(first.added,2);
 const again=importSyntheticCmsOrders(first.orders,DEMO_WOO_ORDERS,1);
 assert.equal(again.added,0);assert.equal(again.duplicates,2);
 const second=importSyntheticCmsOrders(first.orders,DEMO_WOO_ORDERS,2);
 assert.equal(second.added,2);
 assert.equal(second.orders.filter(o=>o.companyId===1).length,2);
 assert.equal(second.orders.filter(o=>o.companyId===2).length,2);
});
test("never accepts unmarked real data, non-EUR, unsupported currency, incorrect totals or missing source",()=>{
 for(const change of [
  {demo_only:false},{currency:"USD"},{status:"pending"},
  {total:"999.00"},{billing:{company:"Real customer"}},
  {line_items:[]},{id:-1}
 ]){
  assert.throws(()=>normalizeSyntheticWooOrder({...DEMO_WOO_ORDERS[0],...change},1));
 }
 assert.throws(()=>normalizeSyntheticWooOrder(DEMO_WOO_ORDERS[0],0));
 assert.throws(()=>normalizeSyntheticWooOrder(DEMO_WOO_ORDERS[0],1,"bad/site"));
});
test("changed duplicate order is rejected, never silently overwritten",()=>{
 const first=importSyntheticCmsOrders([],DEMO_WOO_ORDERS.slice(0,1),1);
 const changed={...DEMO_WOO_ORDERS[0],
  billing:{company:"Sintetični drugi kupec"}};
 assert.throws(()=>importSyntheticCmsOrders(first.orders,[changed],1),/spremenjeno/);
 assert.equal(first.orders[0].partner,"Sintetični kupec spletna trgovina A");
});
