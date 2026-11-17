import test from "node:test";
import assert from "node:assert/strict";
import {
 initialDemoCompany,readDemoCompany,changeDemoCompany,
 resetDemoCompanyDomain,subscribeDemoCompany,demoCompanyPulse
} from "../app/next11/sharedDemoCompany.mjs";
import {
 demoShopSample,stageDemoShopOrder,decideDemoShopOrder,transferDemoStock,
 networkStockTotals
} from "../app/next11/demoOperations.mjs";
import {advanceDemoOpportunity,buildDemoCrmActivity}
 from "../app/next11/demoBusinessModel.mjs";

function pristine(){
 resetDemoCompanyDomain(1,"operations");
 resetDemoCompanyDomain(1,"crm");
 resetDemoCompanyDomain(2,"operations");
 resetDemoCompanyDomain(2,"crm");
}

test("company-scoped synthetic state is stable, immutable and shared between domain readers",()=>{
 pristine();
 const before=readDemoCompany(1);
 assert.equal(before,readDemoCompany(1));
 assert.deepEqual(before.operations.warehouses,
  initialDemoCompany(1).operations.warehouses);
 assert.equal(before.demoOnly,true);
 assert.ok(Number.isSafeInteger(before.revision)&&before.revision>=0);
 assert.equal(Object.isFrozen(before),true);
 assert.equal(Object.isFrozen(before.operations.warehouses[0].items[0]),true);
 assert.equal(Object.isFrozen(before.deals[0]),true);
 const separate=readDemoCompany(2);
 assert.equal(separate.companyId,2);
 assert.notEqual(before,separate);
 assert.throws(()=>before.operations.warehouses[0].items[0].onHand=200);
 assert.throws(()=>before.deals.push({companyId:2}));
});

test("integrations, stock, orders, CRM and BI share one live synthetic company snapshot",()=>{
 pristine();
 const stock=networkStockTotals(readDemoCompany(1).operations,1);
 const event=demoShopSample(1,"shopify");
 const observed=[];
 const unsubscribe=subscribeDemoCompany(()=>
  observed.push(demoCompanyPulse(readDemoCompany(1))));
 const company=changeDemoCompany(1,"operations",state=>({
  operations:stageDemoShopOrder(state.operations,1,event,state.operations.version)
 }));
 const order=company.operations.stagedOrders[0];
 assert.equal(order.provider,"shopify");
 assert.equal(demoCompanyPulse(readDemoCompany(1)).orderCount,1);
 assert.equal(demoCompanyPulse(readDemoCompany(1)).activeOrderCents,12500);
 assert.equal(demoCompanyPulse(readDemoCompany(1)).stock.available,stock.available);
 assert.equal(demoCompanyPulse(readDemoCompany(1)).stock.projectedShortage,0);
 changeDemoCompany(1,"operations",state=>({
  operations:decideDemoShopOrder(state.operations,1,event.eventId,"hold")
 }));
 const held=demoCompanyPulse(readDemoCompany(1));
 assert.equal(held.reviewCount,0);
 assert.equal(held.holdCount,1);
 assert.equal(held.activeOrderCents,0);
 assert.equal(held.heldOrderCents,12500);
 assert.equal(held.stock.available,stock.available);
 assert.equal(readDemoCompany(1).operations.events.length,0);

 const deal=readDemoCompany(1).deals[0];
 const expected=demoCompanyPulse(readDemoCompany(1)).crm.weightedValueCents;
 changeDemoCompany(1,"crm",state=>({
  deals:advanceDemoOpportunity(state.deals,1,deal.id,
   "Odkrivanje",deal.version),
  activities:state.activities
 }));
 assert.equal(readDemoCompany(1).deals[0].stage,"Odkrivanje");
 assert.equal(demoCompanyPulse(readDemoCompany(1)).crm.weightedValueCents,
  expected+Math.round(deal.valueCents*0.20));
 const activity=buildDemoCrmActivity(1,deal.id,
  readDemoCompany(1).deals,"SYN-ACT-1");
 changeDemoCompany(1,"crm",state=>({
  deals:state.deals,activities:[...state.activities,activity]
 }));
 assert.equal(readDemoCompany(1).activities.length,1);
 assert.equal(readDemoCompany(1).operations.stagedOrders[0].status,"hold");
 assert.equal(observed.length,4);
 unsubscribe();

 const result=demoCompanyPulse(readDemoCompany(1),"PE-01");
 assert.equal(result.warehouses,2);
 assert.equal(result.orderCount,1);
 assert.equal(result.crm.openCount,2);
 assert.equal(result.posting,false);
 assert.equal(result.inventoryReserved,false);
});

test("warehouse transfer is observable by all modules without double accounting",()=>{
 pristine();
 const first=networkStockTotals(readDemoCompany(1).operations,1);
 changeDemoCompany(1,"operations",state=>({
  operations:transferDemoStock(state.operations,1,{
   fromWarehouseId:"SYN-WH-02",toWarehouseId:"SYN-WH-01",
   sku:"TAB-10070",quantity:2,
   eventId:"SYN-XFER-OBS-001",expectedVersion:state.operations.version
  })
 }));
 const changed=demoCompanyPulse(readDemoCompany(1));
 assert.equal(changed.transfers,1);
 assert.deepEqual(networkStockTotals(readDemoCompany(1).operations,1),first);
 assert.equal(changed.stock.onHand,first.onHand);
 assert.equal(changed.stock.reserved,first.reserved);
 assert.equal(demoCompanyPulse(readDemoCompany(1),"PE-02").transfers,1);
});

test("changing companies never mixes CRM deals, orders or warehouse quantities",()=>{
 pristine();
 const company1=readDemoCompany(1);
 const company2=readDemoCompany(2);
 changeDemoCompany(1,"operations",state=>({
  operations:stageDemoShopOrder(state.operations,1,demoShopSample(1,"woocommerce"),0)
 }));
 assert.equal(demoCompanyPulse(readDemoCompany(1)).orderCount,1);
 assert.equal(readDemoCompany(2),company2);
 assert.equal(demoCompanyPulse(readDemoCompany(2)).orderCount,0);
 assert.equal(demoCompanyPulse(readDemoCompany(2)).crm.openCount,1);
 assert.throws(()=>demoCompanyPulse(readDemoCompany(1),"PE-11"),RangeError);
 assert.throws(()=>changeDemoCompany(1,"crm",state=>({
  deals:[...state.deals,...company2.deals],activities:state.activities
 })),RangeError);
 assert.equal(readDemoCompany(1).deals.length,company1.deals.length);
 assert.throws(()=>changeDemoCompany(1,"operations",state=>({
  operations:company2.operations
 })),RangeError);
});

test("domain-only reset and listeners cannot erase unrelated data or trigger writes",()=>{
 pristine();
 changeDemoCompany(1,"operations",state=>({
  operations:stageDemoShopOrder(state.operations,1,demoShopSample(1,"shopify"),0)
 }));
 const deal=readDemoCompany(1).deals[0];
 changeDemoCompany(1,"crm",state=>({
  deals:advanceDemoOpportunity(state.deals,1,deal.id,"Odkrivanje",deal.version),
  activities:state.activities
 }));
 resetDemoCompanyDomain(1,"crm");
 assert.equal(readDemoCompany(1).deals[0].stage,"Kvalifikacija");
 assert.equal(demoCompanyPulse(readDemoCompany(1)).orderCount,1);
 resetDemoCompanyDomain(1,"operations");
 assert.equal(demoCompanyPulse(readDemoCompany(1)).orderCount,0);
 assert.equal(readDemoCompany(1).deals[0].stage,"Kvalifikacija");
 assert.equal(demoCompanyPulse(readDemoCompany(2)).orderCount,0);
});

test("invalid mutation domains or synthetic records are rejected without updates",()=>{
 pristine();
 const start=readDemoCompany(1);
 for(const bad of [
  ()=>changeDemoCompany(1,"finance",()=>({deals:[]})),
  ()=>changeDemoCompany(1,"crm",()=>({operations:start.operations})),
  ()=>changeDemoCompany(1,"operations",()=>({operations:{companyId:1}})),
  ()=>changeDemoCompany(1,"crm",()=>({
   deals:start.deals.map(d=>({...d,companyId:2})),
   activities:start.activities
  })),
  ()=>changeDemoCompany(1,"crm",()=>({
   deals:start.deals,activities:[{id:"SYN-ACT-BAD",
    companyId:2,unitId:"PE-01",dealId:start.deals[0].id}]
  })),
  ()=>resetDemoCompanyDomain(1,"billing"),
  ()=>initialDemoCompany(999)
 ])assert.throws(bad);
 assert.equal(readDemoCompany(1),start);
});
