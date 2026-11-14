// NEXT11B — synthetic organization, warehouses and shop event staging only.
// No HTTP/webhooks, stock posting, fiscalization or real orders. All IDs are fake.
import {demoBusinessUnits} from "./demoBusinessModel.mjs";

const WAREHOUSES = {
  1:[
    {id:"SYN-WH-01",unitId:"PE-01",name:"Centralno demo skladišče",
      items:[{sku:"TAB-10070",onHand:12,reserved:2},{sku:"PM-200",onHand:18,reserved:3}]},
    {id:"SYN-WH-02",unitId:"PE-02",name:"Regionalno demo skladišče",
      items:[{sku:"TAB-10070",onHand:4,reserved:1},{sku:"PM-200",onHand:8,reserved:0}]},
    {id:"SYN-WH-03",unitId:"PE-01",name:"Demo skladišče materiala",
      items:[{sku:"FOL-M2",onHand:68,reserved:6}]},
  ],
  2:[{id:"SYN-WH-11",unitId:"PE-11",name:"Demo skladišče Vzhod",
    items:[{sku:"PM-200",onHand:9,reserved:1}]}],
  3:[{id:"SYN-WH-21",unitId:"PE-21",name:"Demo skladišče Zahod",
    items:[{sku:"KC-100",onHand:22,reserved:4}]}],
};
const SHOP_PROVIDERS = new Set(["woocommerce","shopify"]);
const IDS = /^SYN-[A-Z0-9-]{3,70}$/;
const MAX_EVENTS = 100;
const clone=value=>JSON.parse(JSON.stringify(value));
function warehousesFor(companyId){
  demoBusinessUnits(companyId);
  return WAREHOUSES[companyId];
}
function assertState(state,companyId){
  const units=new Set(demoBusinessUnits(companyId).map(u=>u.id));
  if(!state||state.companyId!==companyId||state.demoOnly!==true
   ||!Number.isSafeInteger(state.version)||state.version<0
   ||!Array.isArray(state.warehouses)||!Array.isArray(state.events)
   ||!Array.isArray(state.stagedOrders)||state.events.length>MAX_EVENTS
   ||state.stagedOrders.length>MAX_EVENTS){
    throw new RangeError("Nedovoljen sintetični skladiščni kontekst.");
  }
  for(const warehouse of state.warehouses){
    if(!units.has(warehouse.unitId)||warehouse.companyId!==companyId
     ||!WAREHOUSES[companyId].some(x=>x.id===warehouse.id)
     ||!Array.isArray(warehouse.items))throw new RangeError("Skladišče drugega podjetja.");
    for(const item of warehouse.items)if(!Number.isSafeInteger(item.onHand)
      ||!Number.isSafeInteger(item.reserved)||item.onHand<0||item.reserved<0
      ||item.reserved>item.onHand)throw new RangeError("Neskladna sintetična zaloga.");
  }
}
export function demoNetworkState(companyId){
  return {
    companyId,demoOnly:true,version:0,
    businessUnits:demoBusinessUnits(companyId),
    warehouses:warehousesFor(companyId).map(w=>({...clone(w),companyId})),
    events:[],stagedOrders:[],
  };
}
export function networkStockTotals(state,companyId,sku=null){
  assertState(state,companyId);
  const items=state.warehouses.flatMap(w=>w.items)
    .filter(i=>sku===null||i.sku===sku);
  return items.reduce((sum,item)=>({
    onHand:sum.onHand+item.onHand,
    reserved:sum.reserved+item.reserved,
    available:sum.available+item.onHand-item.reserved,
  }),{onHand:0,reserved:0,available:0});
}
export function transferDemoStock(state,companyId,{
  fromWarehouseId,toWarehouseId,sku,quantity,eventId,expectedVersion
}){
  assertState(state,companyId);
  const previous=state.events.find(e=>e.eventId===eventId);
  const payload={fromWarehouseId,toWarehouseId,sku,quantity};
  if(previous){
    if(previous.kind!=="transfer"||JSON.stringify(previous.payload)!==JSON.stringify(payload)
      ||previous.expectedVersion!==expectedVersion)
      throw new Error("Isti ID prenosa ima drugačno vsebino.");
    return {...clone(state),replayed:true};
  }
  if(state.version!==expectedVersion)throw new Error("Zastarela različica zaloge.");
  if(!IDS.test(eventId??"")||!Number.isSafeInteger(quantity)||quantity<=0
   ||quantity>1000||!sku||fromWarehouseId===toWarehouseId
   ||state.events.length>=MAX_EVENTS)throw new RangeError("Neveljaven sintetični prenos.");
  const next=clone(state),source=next.warehouses.find(w=>w.id===fromWarehouseId),
    target=next.warehouses.find(w=>w.id===toWarehouseId);
  if(!source||!target)throw new RangeError("Izvorno ali ciljno skladišče ni v podjetju.");
  const src=source.items.find(i=>i.sku===sku),dst=target.items.find(i=>i.sku===sku);
  if(!src||!dst||src.onHand-src.reserved<quantity)
    throw new Error("Prenos ne sme preseči razpoložljive zaloge.");
  const totalBefore=networkStockTotals(state,companyId,sku);
  src.onHand-=quantity;dst.onHand+=quantity;
  const totalAfter=networkStockTotals(next,companyId,sku);
  if(totalBefore.onHand!==totalAfter.onHand
    ||totalBefore.reserved!==totalAfter.reserved)
    throw new Error("Prenos ni ohranil količine zaloge.");
  next.version++;
  next.events.push({kind:"transfer",eventId,payload,expectedVersion,
    companyId,version:next.version});
  return {...next,replayed:false};
}
export function demoShopSample(companyId,provider){
  if(!SHOP_PROVIDERS.has(provider))throw new RangeError("Nepodprta demonstracijska trgovina.");
  const warehouse=warehousesFor(companyId)[0],sku=warehouse.items[0].sku;
  const type=provider==="woocommerce"?"WOO":"SHOP";
  return {
    demoOnly:true,companyId,provider,warehouseId:warehouse.id,
    externalOrderId:"SYN-"+type+"-ORDER-"+companyId,
    eventId:"SYN-"+type+"-EVENT-"+companyId,
    currency:"EUR",lines:[{sku,quantity:1,unitPriceCents:12500}],
    totalCents:12500,
  };
}
export function normalizeDemoShopOrder(companyId,state,event){
  assertState(state,companyId);
  if(!event||event.companyId!==companyId||event.demoOnly!==true
   ||!SHOP_PROVIDERS.has(event.provider)||!IDS.test(event.eventId??"")
   ||!IDS.test(event.externalOrderId??"")||event.currency!=="EUR"
   ||!Number.isSafeInteger(event.totalCents)||event.totalCents<1
   ||!Array.isArray(event.lines)||event.lines.length===0||event.lines.length>10)
    throw new RangeError("Neveljavna sintetična trgovinska naročila.");
  const warehouse=state.warehouses.find(w=>w.id===event.warehouseId);
  if(!warehouse)throw new RangeError("Trgovina uporablja skladišče drugega podjetja.");
  let sum=0;
  const lines=event.lines.map(row=>{
    if(!row||!warehouse.items.some(i=>i.sku===row.sku)
     ||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>100
     ||!Number.isSafeInteger(row.unitPriceCents)||row.unitPriceCents<1
     ||row.unitPriceCents>100000000)throw new RangeError("Neveljavna SKU, količina ali cena.");
    sum+=row.quantity*row.unitPriceCents;
    if(!Number.isSafeInteger(sum))throw new RangeError("Presežena denarna meja.");
    return {sku:row.sku,quantity:row.quantity,unitPriceCents:row.unitPriceCents};
  });
  if(sum!==event.totalCents)throw new Error("Bruto testni znesek se ne ujema s postavkami.");
  return {
    companyId,provider:event.provider,warehouseId:event.warehouseId,
    externalOrderId:event.externalOrderId,eventId:event.eventId,
    currency:"EUR",totalCents:sum,lines,demoOnly:true,
    status:"review",posting:false,
  };
}
export function stageDemoShopOrder(state,companyId,event,expectedVersion){
  assertState(state,companyId);
  const normalized=normalizeDemoShopOrder(companyId,state,event);
  const previous=state.stagedOrders.find(o=>o.eventId===normalized.eventId);
  if(previous){
    const {version:oldVersion,...old}=previous;
    if(JSON.stringify(old)!==JSON.stringify(normalized))
      throw new Error("Konflikt dogodka: isti ID, druga vsebina.");
    return {...clone(state),replayed:true};
  }
  if(state.version!==expectedVersion)throw new Error("Zastarela različica vrste naročil.");
  if(state.stagedOrders.length>=MAX_EVENTS
    ||state.stagedOrders.some(o=>o.provider===normalized.provider
     &&o.externalOrderId===normalized.externalOrderId))
    throw new Error("Naročilo te trgovine je že pripravljeno za pregled.");
  const next=clone(state);
  next.version++;
  next.stagedOrders.push({...normalized,version:next.version});
  // No stock movement or financial posting from a staged e-commerce event.
  return {...next,replayed:false};
}
