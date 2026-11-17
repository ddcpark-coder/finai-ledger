// NEXT20: pure, synthetic-only stock-demand planning for staged shop orders.
// No fiscalization, inventory reservations, posting, provider API or persistence.
import {
 demoShopSample,normalizeDemoShopOrder,networkStockTotals
} from "./demoOperations.mjs";

const key=(warehouseId,sku)=>warehouseId+"|"+sku;
const inScope=order=>order.status==="review"||order.status==="reviewed";
const allKeys=[
 "companyId","currency","demoOnly","eventId","externalOrderId",
 "lines","posting","provider","status","totalCents","version","warehouseId"
].sort().join("|");

/** Locale-safe input to avoid floating-point money rounding on every edit. */
export function demoEuroPriceCents(text){
 if(typeof text!=="string"||
  !/^\d{1,6}(?:[.,]\d{1,2})?$/.test(text))
  throw new RangeError("Neveljavna cena (EUR; največ dve decimalki).");
 const [euros,cents=""]=text.replace(",",".").split(".");
 const amount=Number(euros)*100+Number(cents.padEnd(2,"0"));
 if(!Number.isSafeInteger(amount)||amount<1||amount>100000000)
  throw new RangeError("Testna cena mora biti pozitivna.");
 return amount;
}

function checkState(state,companyId){
 networkStockTotals(state,companyId); // already validates company/warehouse ownership.
 for(const order of state.stagedOrders){
  if(!order||typeof order!=="object"||Array.isArray(order)||
    Object.keys(order).sort().join("|")!==allKeys||
    order.demoOnly!==true||order.companyId!==companyId||
    order.posting!==false||
    !["review","reviewed","hold"].includes(order.status)||
    !Number.isSafeInteger(order.version)||order.version<1)
   throw new RangeError("Samo preverjena, neknjižena sintetična naročila so dovoljena.");
  // Reuse established cents/SKU/warehouse and provider normalization checks.
  const normalized=normalizeDemoShopOrder(companyId,state,order);
  if(normalized.totalCents!==order.totalCents||
     normalized.eventId!==order.eventId||
     normalized.externalOrderId!==order.externalOrderId)
   throw new RangeError("Sintetično naročilo je neskladno.");
 }
}

export function buildDemoCommerceScenario(state,companyId,{
 provider,warehouseId,sku,quantity=1,unitPriceCents=12500
}){
 checkState(state,companyId);
 const defaults=demoShopSample(companyId,provider);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100||
    !Number.isSafeInteger(unitPriceCents)||unitPriceCents<1||
    unitPriceCents>100000000||
    !state.warehouses.some(w=>w.id===warehouseId&&
      w.items.some(i=>i.sku===sku)))
  throw new RangeError("Neveljavna količina, cena, skladišče ali SKU.");
 const totalCents=quantity*unitPriceCents;
 if(!Number.isSafeInteger(totalCents))
  throw new RangeError("Presežena najvišja vrednost sintetičnega zneska.");
 const serial=state.stagedOrders.length+1;
 const suffix=String(serial).padStart(3,"0");
 const event={
  ...defaults,warehouseId,
  externalOrderId:defaults.externalOrderId+"-"+suffix,
  eventId:defaults.eventId+"-"+suffix,
  lines:[{sku,quantity,unitPriceCents}],totalCents,
 };
 normalizeDemoShopOrder(companyId,state,event);
 return event;
}

/** Read-only forecast; a status of reviewed is NOT an inventory reservation.
 * Held orders are excluded from potential consumption but shown separately.
 */
export function forecastDemoCommerceStock(state,companyId,proposed=null){
 checkState(state,companyId);
 let extra=null;
 if(proposed){
  extra=normalizeDemoShopOrder(companyId,state,proposed);
  if(state.stagedOrders.some(o=>o.eventId===extra.eventId||
    o.provider===extra.provider&&o.externalOrderId===extra.externalOrderId))
   throw new RangeError("Predlog podvaja že obstoječe testno naročilo.");
 }
 const baseline=new Map(),rows=[];
 for(const warehouse of state.warehouses){
  for(const item of warehouse.items){
   const row={
    warehouseId:warehouse.id,warehouseName:warehouse.name,
    unitId:warehouse.unitId,sku:item.sku,
    onHand:item.onHand,reserved:item.reserved,
    available:item.onHand-item.reserved,
    requested:0,reviewed:0,held:0,preview:0,
    forecastAvailable:0,shortage:0,
   };
   baseline.set(key(warehouse.id,item.sku),row);
   rows.push(row);
  }
 }
 let orderCount=0,activeCents=0,heldCents=0;
 function accumulate(order,isPreview){
  const held=order.status==="hold";
  if(!isPreview){
   orderCount++;
   if(held)heldCents+=order.totalCents;
   else activeCents+=order.totalCents;
  }
  for(const item of order.lines){
   const row=baseline.get(key(order.warehouseId,item.sku));
   if(!row)throw new RangeError("Naročilo uporablja neobstoječe skladišče ali SKU.");
   if(isPreview)row.preview+=item.quantity;
   else if(held)row.held+=item.quantity;
   else if(inScope(order)){
    row.requested+=item.quantity;
    if(order.status==="reviewed")row.reviewed+=item.quantity;
   }
  }
 }
 for(const order of state.stagedOrders)accumulate(order,false);
 if(extra)accumulate(extra,true);
 for(const row of rows){
  row.forecastAvailable=row.available-row.requested-row.preview;
  row.shortage=Math.max(0,-row.forecastAvailable);
 }
 const recommendations=[];
 // A donor's spare quantity can only be proposed ONCE across all shortages.
 const donorRemaining=new Map(rows.map(row=>[
  key(row.warehouseId,row.sku),Math.max(0,row.forecastAvailable)
 ]));
 for(const short of rows.filter(x=>x.shortage>0)){
  let remaining=short.shortage;
  for(const candidate of rows){
   if(candidate.warehouseId===short.warehouseId||
     candidate.sku!==short.sku)continue;
   // Recommendations must not consume stock that is already reserved or
   // needed for pending/reviewed orders in the donor warehouse.
   const donorKey=key(candidate.warehouseId,candidate.sku);
   const transferable=donorRemaining.get(donorKey)??0;
   const quantity=Math.min(remaining,transferable);
   if(quantity>0){
    recommendations.push({
     fromWarehouseId:candidate.warehouseId,toWarehouseId:short.warehouseId,
     sku:short.sku,quantity,informationalOnly:true
    });
    donorRemaining.set(donorKey,transferable-quantity);
    remaining-=quantity;
    if(remaining===0)break;
   }
  }
 }
 return {
  demoOnly:true,posting:false,inventoryReserved:false,
  companyId,orderCount,activeCents,heldCents,
  rows,recommendations,
  shortageUnits:rows.reduce((sum,row)=>sum+row.shortage,0),
  warning:"Informativni izračun. Brez rezervacije, knjiženja in premikov zalog."
 };
}
