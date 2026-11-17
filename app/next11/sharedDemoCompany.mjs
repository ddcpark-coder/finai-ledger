// NEXT21 — one coherent, per-company, browser-session-only synthetic data model.
//
// This is NOT a persistence layer, production ERP ledger, real user store,
// financial posting path or provider integration. No localStorage, IndexedDB,
// cookies, network requests or sensitive data. Reloading the page resets it.
import {
 demoBusinessUnits,demoCrmPipeline,demoCrmSummary
} from "./demoBusinessModel.mjs";
import {demoNetworkState,networkStockTotals} from "./demoOperations.mjs";
import {forecastDemoCommerceStock} from "./syntheticCommercePlanning.mjs";

const initial=new Map(),current=new Map(),listeners=new Set();
function freeze(object){
 if(object&&typeof object==="object"&&!Object.isFrozen(object)){
  for(const value of Object.values(object))freeze(value);
  Object.freeze(object);
 }
 return object;
}
export function initialDemoCompany(companyId){
 // Only these explicitly synthetic fixture companies are supported.
 demoBusinessUnits(companyId);
 if(!initial.has(companyId)){
  initial.set(companyId,freeze({
   companyId,demoOnly:true,revision:0,
   operations:demoNetworkState(companyId),
   deals:demoCrmPipeline(companyId),
   activities:[],lastAction:"initial"
  }));
 }
 return initial.get(companyId);
}
export function readDemoCompany(companyId){
 if(!current.has(companyId))
  current.set(companyId,initialDemoCompany(companyId));
 return current.get(companyId);
}
export function subscribeDemoCompany(listener){
 if(typeof listener!=="function")throw new TypeError("Listener is required");
 listeners.add(listener);
 return ()=>{listeners.delete(listener)};
}
function notify(){
 for(const listener of listeners)listener();
}
function assertSnapshot(snapshot,companyId){
 if(!snapshot||snapshot.demoOnly!==true||snapshot.companyId!==companyId||
  !Array.isArray(snapshot.deals)||!Array.isArray(snapshot.activities)||
  !snapshot.operations||snapshot.operations.companyId!==companyId||
  snapshot.operations.demoOnly!==true)
  throw new RangeError("Sintetični model ne pripada izbranemu podjetju.");
 networkStockTotals(snapshot.operations,companyId);
 forecastDemoCommerceStock(snapshot.operations,companyId);
 demoCrmSummary(snapshot.deals,companyId);
 const allowedUnits=new Set(demoBusinessUnits(companyId).map(u=>u.id));
 for(const deal of snapshot.deals){
  if(!allowedUnits.has(deal.unitId)||!/^SYN-CRM-[0-9]+$/.test(deal.id)||
    !Number.isSafeInteger(deal.version)||deal.version<1||
    !Number.isSafeInteger(deal.valueCents)||deal.valueCents<=0||
    !Number.isSafeInteger(deal.probability)||deal.probability<0||
    deal.probability>100)
   throw new RangeError("CRM zapis izven sintetičnega podjetja.");
 }
 const activityIds=new Set();
 for(const activity of snapshot.activities){
  if(activity.companyId!==companyId||!allowedUnits.has(activity.unitId)||
   !snapshot.deals.some(deal=>deal.id===activity.dealId)||
   !/^SYN-ACT-[A-Z0-9-]{1,64}$/.test(activity.id)||
   activityIds.has(activity.id))
   throw new RangeError("Sintetična CRM aktivnost izven podjetja.");
  activityIds.add(activity.id);
 }
}
export function changeDemoCompany(companyId,domain,transform){
 if(!["operations","crm"].includes(domain)||typeof transform!=="function")
  throw new RangeError("Dovoljene so samo sintetične poslovne operacije.");
 const previous=readDemoCompany(companyId);
 const patch=transform(previous);
 if(patch===null||patch===undefined)return previous;
 if(!patch||typeof patch!=="object"||Array.isArray(patch)||
  Object.keys(patch).sort().join("|")!==
  (domain==="operations"?"operations":"activities|deals"))
  throw new RangeError("Spremembe sintetičnega modela morajo biti omejene na domeno.");
 if(domain==="operations"&&patch.operations===previous.operations)return previous;
 if(domain==="crm"&&patch.deals===previous.deals&&
  patch.activities===previous.activities)return previous;
 const next={
  ...previous,...patch,revision:previous.revision+1,lastAction:domain
 };
 assertSnapshot(next,companyId);
 current.set(companyId,freeze(next));
 notify();
 return current.get(companyId);
}
export function resetDemoCompanyDomain(companyId,domain){
 if(!["operations","crm"].includes(domain))
  throw new RangeError("Domena ponastavitve ni dovoljena.");
 const seed=initialDemoCompany(companyId);
 return changeDemoCompany(companyId,domain,()=>{
  return domain==="operations"?
   {operations:seed.operations}:
   {deals:seed.deals,activities:seed.activities};
 });
}
export function demoCompanyPulse(snapshot,unitId="all"){
 const companyId=snapshot?.companyId;
 assertSnapshot(snapshot,companyId);
 const units=demoBusinessUnits(companyId);
 if(unitId!=="all"&&!units.some(u=>u.id===unitId))
  throw new RangeError("Poslovna enota ni v izbranem podjetju.");
 const warehouses=snapshot.operations.warehouses.filter(w=>
  unitId==="all"||w.unitId===unitId);
 const warehouseIds=new Set(warehouses.map(w=>w.id));
 const deals=snapshot.deals.filter(d=>unitId==="all"||d.unitId===unitId);
 const forecast=forecastDemoCommerceStock(snapshot.operations,companyId);
 const rows=forecast.rows.filter(row=>warehouseIds.has(row.warehouseId));
 const orders=snapshot.operations.stagedOrders.filter(o=>
  warehouseIds.has(o.warehouseId));
 return {
  companyId,unitId,revision:snapshot.revision,demoOnly:true,
  posting:false,inventoryReserved:false,
  warehouses:warehouses.length,
  crm:demoCrmSummary(deals,companyId),
  orderCount:orders.length,
  reviewCount:orders.filter(o=>o.status==="review").length,
  reviewedCount:orders.filter(o=>o.status==="reviewed").length,
  holdCount:orders.filter(o=>o.status==="hold").length,
  activeOrderCents:orders.filter(o=>o.status!=="hold")
   .reduce((sum,o)=>sum+o.totalCents,0),
  heldOrderCents:orders.filter(o=>o.status==="hold")
   .reduce((sum,o)=>sum+o.totalCents,0),
  stock:rows.reduce((sum,row)=>({
   onHand:sum.onHand+row.onHand,
   reserved:sum.reserved+row.reserved,
   available:sum.available+row.available,
   projectedShortage:sum.projectedShortage+row.shortage
  }),{onHand:0,reserved:0,available:0,projectedShortage:0}),
  transfers:snapshot.operations.events.filter(event=>
   event.kind==="transfer"&&
   (unitId==="all"||warehouses.some(w=>
    w.id===event.payload.fromWarehouseId||
    w.id===event.payload.toWarehouseId))).length
 };
}
