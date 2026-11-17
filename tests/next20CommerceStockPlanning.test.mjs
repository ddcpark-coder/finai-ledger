import test from "node:test";
import assert from "node:assert/strict";
import {
 demoNetworkState,networkStockTotals,stageDemoShopOrder,
 decideDemoShopOrder,demoShopSample,transferDemoStock
} from "../app/next11/demoOperations.mjs";
import {
 buildDemoCommerceScenario,forecastDemoCommerceStock,demoEuroPriceCents
} from "../app/next11/syntheticCommercePlanning.mjs";

const option=(overrides={})=>({
 provider:"woocommerce",warehouseId:"SYN-WH-01",
 sku:"TAB-10070",quantity:11,unitPriceCents:12500,...overrides
});

test("instant commerce forecast detects warehouse shortages but never mutates stock",()=>{
 const original=demoNetworkState(1);
 const copy=structuredClone(original);
 const proposal=buildDemoCommerceScenario(original,1,option());
 assert.equal(proposal.totalCents,137500);
 assert.equal(proposal.lines[0].quantity,11);
 const result=forecastDemoCommerceStock(original,1,proposal);
 const central=result.rows.find(x=>x.warehouseId==="SYN-WH-01"&&x.sku==="TAB-10070");
 assert.equal(central.onHand,12);
 assert.equal(central.reserved,2);
 assert.equal(central.available,10);
 assert.equal(central.preview,11);
 assert.equal(central.requested,0);
 assert.equal(central.forecastAvailable,-1);
 assert.equal(central.shortage,1);
 assert.equal(result.shortageUnits,1);
 assert.deepEqual(result.recommendations,[{
  fromWarehouseId:"SYN-WH-02",toWarehouseId:"SYN-WH-01",
  sku:"TAB-10070",quantity:1,informationalOnly:true
 }]);
 assert.equal(result.inventoryReserved,false);
 assert.equal(result.posting,false);
 assert.deepEqual(original,copy);
 assert.deepEqual(networkStockTotals(original,1),{
  onHand:110,reserved:12,available:98
 });
});

test("staged orders forecast demand; review is not booking and hold excludes demand",()=>{
 let state=demoNetworkState(1);
 const prior=networkStockTotals(state,1);
 const woo=buildDemoCommerceScenario(state,1,option({quantity:7}));
 state=stageDemoShopOrder(state,1,woo,state.version);
 const shop=buildDemoCommerceScenario(state,1,option({
  provider:"shopify",quantity:6
 }));
 state=stageDemoShopOrder(state,1,shop,state.version);
 const forecast=forecastDemoCommerceStock(state,1);
 const row=forecast.rows.find(x=>x.warehouseId==="SYN-WH-01"&&x.sku==="TAB-10070");
 assert.equal(forecast.orderCount,2);
 assert.equal(row.requested,13);
 assert.equal(row.reviewed,0);
 assert.equal(row.shortage,3);
 assert.equal(forecast.shortageUnits,3);
 assert.equal(forecast.activeCents,13*12500);
 assert.equal(forecast.heldCents,0);
 state=decideDemoShopOrder(state,1,woo.eventId,"reviewed");
 assert.equal(forecastDemoCommerceStock(state,1).rows
  .find(x=>x.warehouseId==="SYN-WH-01"&&x.sku==="TAB-10070").reviewed,7);
 assert.deepEqual(networkStockTotals(state,1),prior); // no real reservation
 state=decideDemoShopOrder(state,1,shop.eventId,"hold");
 const after=forecastDemoCommerceStock(state,1);
 const current=after.rows.find(x=>x.warehouseId==="SYN-WH-01"&&x.sku==="TAB-10070");
 assert.equal(current.requested,7);
 assert.equal(current.held,6);
 assert.equal(current.shortage,0);
 assert.equal(after.activeCents,7*12500);
 assert.equal(after.heldCents,6*12500);
 assert.equal(state.events.length,0);
 assert.deepEqual(networkStockTotals(state,1),prior);
});

test("multiwarehouse planning uses only available donor stock, never reservations",()=>{
 let state=demoNetworkState(1);
 const order=buildDemoCommerceScenario(state,1,option({quantity:15}));
 state=stageDemoShopOrder(state,1,order,0);
 const result=forecastDemoCommerceStock(state,1);
 const row=result.rows.find(x=>x.warehouseId==="SYN-WH-01"&&x.sku==="TAB-10070");
 assert.equal(row.shortage,5);
 assert.deepEqual(result.recommendations,[{
  fromWarehouseId:"SYN-WH-02",toWarehouseId:"SYN-WH-01",
  sku:"TAB-10070",quantity:3,informationalOnly:true
 }]);
 assert.equal(result.shortageUnits,5);
 const withoutCompany=forecastDemoCommerceStock(demoNetworkState(2),2);
 assert.equal(withoutCompany.recommendations.length,0);
 assert.equal(withoutCompany.rows.length,1);
 assert.ok(withoutCompany.rows.every(x=>x.warehouseId==="SYN-WH-11"));
});

test("invalid company, SKU, source, total or provider cannot create forecast or event",()=>{
 const state=demoNetworkState(1),frozen=structuredClone(state);
 for(const override of [
  {warehouseId:"SYN-WH-11"},{sku:"NOT-VALID"},
  {quantity:0},{quantity:101},{quantity:2.5},
  {unitPriceCents:0},{unitPriceCents:10.5},
  {provider:"unsupported"},{quantity:-1},
 ])assert.throws(()=>buildDemoCommerceScenario(state,1,option(override)));
 assert.throws(()=>buildDemoCommerceScenario(state,2,option()));
 assert.throws(()=>forecastDemoCommerceStock(state,2));
 const proposal=buildDemoCommerceScenario(state,1,option({quantity:1}));
 const wrongCompany={...proposal,companyId:2};
 assert.throws(()=>forecastDemoCommerceStock(state,1,wrongCompany));
 const posted={...proposal,posting:true};
 assert.throws(()=>forecastDemoCommerceStock(state,1,posted));
 assert.deepEqual(state,frozen);
});

test("no dedup bypass; tampered persisted state and repeat scenario are rejected",()=>{
 let state=demoNetworkState(1);
 const event=buildDemoCommerceScenario(state,1,option({quantity:3}));
 state=stageDemoShopOrder(state,1,event,0);
 assert.throws(()=>forecastDemoCommerceStock(state,1,event),/podvaja/);
 const broken=structuredClone(state);
 broken.stagedOrders[0].posting=true;
 assert.throws(()=>forecastDemoCommerceStock(broken,1));
 const altered=structuredClone(state);
 altered.stagedOrders[0].totalCents=2;
 assert.throws(()=>forecastDemoCommerceStock(altered,1));
 const source=state.warehouses[0].items.find(x=>x.sku==="TAB-10070");
 const handBefore=source.onHand;
 const estimate=forecastDemoCommerceStock(state,1);
 assert.equal(source.onHand,handBefore);
 assert.equal(estimate.rows[0].requested,3);
});

test("inter-warehouse transfer alters the next scenario forecast without posting orders",()=>{
 let state=demoNetworkState(1);
 const event=buildDemoCommerceScenario(state,1,option({quantity:11}));
 let forecast=forecastDemoCommerceStock(state,1,event);
 assert.equal(forecast.shortageUnits,1);
 const before=networkStockTotals(state,1,"TAB-10070");
 state=transferDemoStock(state,1,{
  fromWarehouseId:"SYN-WH-02",toWarehouseId:"SYN-WH-01",
  sku:"TAB-10070",quantity:1,
  eventId:"SYN-TEST-XFER-001",expectedVersion:0
 });
 forecast=forecastDemoCommerceStock(state,1,event);
 assert.equal(forecast.shortageUnits,0);
 assert.deepEqual(networkStockTotals(state,1,"TAB-10070"),before);
 assert.equal(state.stagedOrders.length,0);
 assert.equal(state.events.length,1);
});

test("instant EUR input converts exactly to integer cents without floating-point drift",()=>{
 assert.equal(demoEuroPriceCents("125,00"),12500);
 assert.equal(demoEuroPriceCents("125.05"),12505);
 assert.equal(demoEuroPriceCents("0,01"),1);
 assert.equal(demoEuroPriceCents("1"),100);
 assert.equal(demoEuroPriceCents("999999,99"),99999999);
 for(const invalid of ["", "0","-1","12.345","1e5","abc","1 500,00",
  "1000000","0,00","NaN"])
  assert.throws(()=>demoEuroPriceCents(invalid));
});
