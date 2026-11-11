// A local, synthetic WooCommerce-like payload adapter. NO CMS credentials,
// external requests, webhook handling, payment capture, ledger or inventory writes.
function company(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1||companyId>3)
  throw new Error("Izberi demonstracijsko podjetje.");
}
function money(value){
 if(typeof value!=="string"||!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value))
  throw new Error("Neveljaven znesek CMS v evrih.");
 const [whole,decimal=""]=value.split(".");
 const cents=Number(whole)*100+Number(decimal.padEnd(2,"0"));
 if(!Number.isSafeInteger(cents)||cents<0||cents>999999999)
  throw new Error("Nedovoljen znesek CMS.");
 return cents;
}
export function normalizeSyntheticWooOrder(raw,companyId,shopId="demo-shop"){
 company(companyId);
 if(!/^[a-z0-9-]{3,32}$/.test(shopId))throw new Error("Neveljaven identifikator spletne trgovine.");
 if(raw?.demo_only!==true)throw new Error("Dovoljeni so samo sintetični CMS podatki.");
 if(!Number.isSafeInteger(raw.id)||raw.id<1)throw new Error("Neveljavna zunanja številka naročila.");
 if(raw.currency!=="EUR")throw new Error("Valuta mora biti EUR.");
 if(!["processing","on-hold","completed"].includes(raw.status))
  throw new Error("Status CMS naročila ni podprt.");
 if(!Array.isArray(raw.line_items)||raw.line_items.length<1||raw.line_items.length>20)
  throw new Error("Naročilo mora vsebovati 1–20 postavk.");
 const partner=String(raw.billing?.company??"").trim();
 if(partner.length<2||partner.length>100||!/^Sintetičn/i.test(partner))
  throw new Error("Demo kupec mora biti jasno označen kot sintetičen.");
 const lines=raw.line_items.map(item=>{
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>999)
   throw new Error("Neveljavna količina CMS postavke.");
  const name=String(item.name??"").trim();
  if(name.length<2||name.length>120)throw new Error("Neveljaven naziv postavke.");
  const netCents=money(item.total);
  const taxCents=money(item.total_tax);
  return {name,quantity:item.quantity,netCents,taxCents,grossCents:netCents+taxCents};
 });
 const grossCents=money(raw.total);
 const calculated=lines.reduce((sum,line)=>sum+line.grossCents,0);
 if(calculated!==grossCents||grossCents<=0)
  throw new Error("Skupni znesek CMS se ne ujema s postavkami. Uvoz zavrnjen.");
 const externalKey=companyId+":woocommerce:"+shopId+":"+raw.id;
 return {
  companyId,externalKey,id:"CMS-DEMO-"+companyId+"-"+raw.id,
  externalOrderId:String(raw.id),shopId,source:"WooCommerce (demo)",
  partner,status:"Za pregled",originalCmsStatus:raw.status,
  grossCents,gross:grossCents/100,currency:"EUR",
  delivery:"—",reserved:"—",lines,demo:true
 };
}
export function importSyntheticCmsOrders(existing,rawOrders,companyId,shopId="demo-shop"){
 company(companyId);
 if(!Array.isArray(existing)||!Array.isArray(rawOrders)||rawOrders.length>20)
  throw new Error("Neveljaven demonstracijski paket CMS naročil.");
 const next=[...existing];
 let added=0,duplicates=0;
 for(const raw of rawOrders){
  const incoming=normalizeSyntheticWooOrder(raw,companyId,shopId);
  const match=next.find(row=>row.externalKey===incoming.externalKey);
  if(match){
   if(match.companyId!==companyId||match.grossCents!==incoming.grossCents||
      match.partner!==incoming.partner||match.originalCmsStatus!==incoming.originalCmsStatus||
      JSON.stringify(match.lines)!==JSON.stringify(incoming.lines))
    throw new Error("CMS naročilo je bilo spremenjeno; potreben je ročni pregled.");
   duplicates++;continue;
  }
  next.push(incoming);added++;
 }
 return {orders:next,added,duplicates};
}
export const DEMO_WOO_ORDERS=Object.freeze([
 {demo_only:true,id:1001,currency:"EUR",status:"processing",
  billing:{company:"Sintetični kupec spletna trgovina A"},
  line_items:[{name:"Vzorčni tisk",quantity:2,total:"100.00",total_tax:"22.00"}],
  total:"122.00"},
 {demo_only:true,id:1002,currency:"EUR",status:"on-hold",
  billing:{company:"Sintetični kupec spletna trgovina B"},
  line_items:[{name:"Vzorčne nalepke",quantity:1,total:"50.00",total_tax:"11.00"}],
  total:"61.00"}
]);
