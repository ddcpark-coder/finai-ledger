import test from "node:test";
import assert from "node:assert/strict";
import {
 demoNetworkState,networkStockTotals,transferDemoStock,
 demoShopSample,normalizeDemoShopOrder,stageDemoShopOrder
} from "../app/next11/demoOperations.mjs";

test("company-scoped business units and warehouses never share IDs or stock",()=>{
 const a=demoNetworkState(1),b=demoNetworkState(2),c=demoNetworkState(3);
 assert.equal(a.businessUnits.length,2);
 assert.equal(a.warehouses.length,3);
 assert.equal(b.warehouses.length,1);
 assert.equal(c.warehouses.length,1);
 assert.equal(networkStockTotals(a,1).onHand,110);
 assert.equal(networkStockTotals(a,1).reserved,12);
 assert.equal(networkStockTotals(a,1).available,98);
 assert.equal(networkStockTotals(b,2).onHand,9);
 assert.ok(a.warehouses.every(w=>w.companyId===1));
 assert.equal(new Set([...a.warehouses,...b.warehouses].map(w=>w.id)).size,4);
 assert.throws(()=>networkStockTotals(b,1),RangeError);
 assert.throws(()=>demoNetworkState(999),RangeError);
});
test("transfer between units is transactional, inventory-conserving, idempotent",()=>{
 const original=demoNetworkState(1);
 const total=networkStockTotals(original,1,"TAB-10070");
 const request={
  fromWarehouseId:"SYN-WH-01",toWarehouseId:"SYN-WH-02",sku:"TAB-10070",
  quantity:3,eventId:"SYN-XFER-001",expectedVersion:0
 };
 const next=transferDemoStock(original,1,request);
 assert.equal(next.version,1);
 assert.equal(next.events.length,1);
 assert.equal(next.warehouses[0].items[0].onHand,9);
 assert.equal(next.warehouses[1].items[0].onHand,7);
 assert.equal(original.warehouses[0].items[0].onHand,12);
 assert.deepEqual(networkStockTotals(next,1,"TAB-10070"),total);
 const replay=transferDemoStock(next,1,request);
 assert.equal(replay.replayed,true);
 assert.equal(replay.version,1);
 assert.equal(replay.events.length,1);
 assert.throws(()=>transferDemoStock(next,1,{...request,quantity:2}),/ID prenosa/);
 assert.throws(()=>transferDemoStock(next,1,{...request,
  eventId:"SYN-XFER-002",expectedVersion:0}),/Zastarela/);
});
test("warehouse forbids negative available stock, cross-company and invalid lines",()=>{
 const original=demoNetworkState(1);
 const input={fromWarehouseId:"SYN-WH-01",toWarehouseId:"SYN-WH-02",
  sku:"TAB-10070",quantity:1,eventId:"SYN-XFER-001",expectedVersion:0};
 for(const change of [
  {quantity:11},{quantity:0},{quantity:-1},{quantity:1.5},
  {fromWarehouseId:"SYN-WH-11"},
  {toWarehouseId:"SYN-WH-11"},
  {toWarehouseId:"SYN-WH-01"},
  {sku:"FOL-M2"},
 ])assert.throws(()=>transferDemoStock(original,1,{...input,...change}));
 assert.equal(original.version,0);
 assert.equal(original.events.length,0);
 assert.throws(()=>transferDemoStock(original,2,input),RangeError);
});
test("WooCommerce and Shopify synthetics normalize, stage without posting or stock movement",()=>{
 for(const provider of ["woocommerce","shopify"]){
  const state=demoNetworkState(1);
  const sample=demoShopSample(1,provider);
  const normalized=normalizeDemoShopOrder(1,state,sample);
  assert.equal(normalized.posting,false);
  assert.equal(normalized.status,"review");
  assert.equal(normalized.totalCents,12500);
  const next=stageDemoShopOrder(state,1,sample,0);
  assert.equal(next.version,1);
  assert.equal(next.stagedOrders.length,1);
  assert.equal(next.events.length,0);
  assert.deepEqual(next.warehouses,state.warehouses);
  const replay=stageDemoShopOrder(next,1,sample,0);
  assert.equal(replay.replayed,true);
  assert.equal(replay.stagedOrders.length,1);
  assert.equal(replay.version,1);
  assert.throws(()=>stageDemoShopOrder(next,1,{
   ...sample,eventId:"SYN-NEW-EVENT-999"},1),/že pripravljeno/);
 }
});
test("commerce refuses cross-company warehouses, unknown SKU and mismatched totals",()=>{
 const state=demoNetworkState(1),sample=demoShopSample(1,"woocommerce");
 const bad=[
  {...sample,companyId:2},
  {...sample,warehouseId:"SYN-WH-11"},
  {...sample,provider:"unsupported"},
  {...sample,currency:"USD"},
  {...sample,demoOnly:false},
  {...sample,totalCents:12499},
  {...sample,lines:[{sku:"SKU-INJECTION",quantity:1,unitPriceCents:12500}]},
  {...sample,lines:[{sku:"TAB-10070",quantity:0,unitPriceCents:12500}]},
  {...sample,lines:[{sku:"TAB-10070",quantity:1,unitPriceCents:12.5}]},
  {...sample,externalOrderId:"REAL-ORDER"},
 ];
 for(const event of bad)assert.throws(()=>normalizeDemoShopOrder(1,state,event));
 assert.equal(state.stagedOrders.length,0);
});
test("commerce event UUID cannot be reused for a different amount and stale versions fail",()=>{
 const state=demoNetworkState(1),sample=demoShopSample(1,"shopify");
 const first=stageDemoShopOrder(state,1,sample,0);
 assert.throws(()=>stageDemoShopOrder(first,1,{
  ...sample,totalCents:13000,
  lines:[{sku:sample.lines[0].sku,quantity:1,unitPriceCents:13000}]
 },0),/Konflikt/);
 assert.throws(()=>stageDemoShopOrder(first,1,{
  ...sample,eventId:"SYN-ANOTHER-EVENT",
  externalOrderId:"SYN-ANOTHER-ORDER"
 },0),/Zastarela/);
 assert.equal(first.stagedOrders.length,1);
});
