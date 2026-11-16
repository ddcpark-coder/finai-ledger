// NEXT13A: pure offline planning over synthetic-only warehouse and KPI fixtures.
// Never reads/writes a server, a local database, company credentials or actual stock.
import {compactDemoBusinessBrief} from "../next11/compactBusinessBrief.mjs";
import {demoNetworkState} from "../next11/demoOperations.mjs";

function scopedStock(companyId,unitId){
 const brief=compactDemoBusinessBrief(companyId,unitId); // validates tenant/unit
 const state=demoNetworkState(companyId);
 const grouped=new Map();
 for(const warehouse of state.warehouses){
  if(unitId!=="all"&&warehouse.unitId!==unitId)continue;
  for(const item of warehouse.items){
   if(!Number.isSafeInteger(item.onHand)||!Number.isSafeInteger(item.reserved)
      ||item.onHand<item.reserved)
    throw new Error("Neskladna sintetična zaloga.");
   const prev=grouped.get(item.sku)??{sku:item.sku,onHand:0,reserved:0,available:0};
   grouped.set(item.sku,{
    sku:item.sku,onHand:prev.onHand+item.onHand,
    reserved:prev.reserved+item.reserved,
    available:prev.available+item.onHand-item.reserved
   });
  }
 }
 return {brief,items:[...grouped.values()].sort((a,b)=>a.sku.localeCompare(b.sku))};
}

export function offlineScenarioSkuOptions(companyId,unitId="all"){
 return scopedStock(companyId,unitId).items.map(item=>({...item}));
}

export function projectOfflineOrder(companyId,unitId="all",{
 sku,quantity,unitPriceCents,unitCostCents
}={}){
 const {brief,items}=scopedStock(companyId,unitId);
 if(!Number.isSafeInteger(quantity)||quantity<0||quantity>200
   ||!Number.isSafeInteger(unitPriceCents)||unitPriceCents<1||unitPriceCents>10000000
   ||!Number.isSafeInteger(unitCostCents)||unitCostCents<0||unitCostCents>10000000){
  throw new RangeError("Neveljavna sintetična količina ali cena v centih.");
 }
 const selected=items.find(item=>item.sku===sku);
 if(!selected)throw new RangeError("Artikla ni v izbranem podjetju in poslovni enoti.");

 const fulfilled=Math.min(selected.available,quantity);
 const shortage=quantity-fulfilled;
 const additionalRevenueCents=fulfilled*unitPriceCents;
 const additionalCostCents=fulfilled*unitCostCents;
 const projectedRevenueCents=brief.revenueCents+additionalRevenueCents;
 const projectedCostCents=brief.costCents+additionalCostCents;
 const projectedProfitCents=projectedRevenueCents-projectedCostCents;
 if(![additionalRevenueCents,additionalCostCents,projectedRevenueCents,
   projectedCostCents,projectedProfitCents].every(Number.isSafeInteger))
  throw new RangeError("Presežena natančnost sintetičnega izračuna.");
 return {
  demoOnly:true,posting:false,companyId,unitId,sku,
  quantity,availableBefore:selected.available,fulfilled,shortage,
  availableAfter:selected.available-fulfilled,
  baselineRevenueCents:brief.revenueCents,
  baselineCostCents:brief.costCents,
  baselineProfitCents:brief.profitCents,
  additionalRevenueCents,additionalCostCents,
  projectedRevenueCents,projectedCostCents,projectedProfitCents,
  // Revenue from the unfulfilled units is explicitly NOT counted as delivered.
  unfulfilledPotentialCents:shortage*unitPriceCents
 };
}
