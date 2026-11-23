// NEXT35: isolated, strictly synthetic CRM 360 demo session.
// Every record is company-scoped; nothing is written to disk, network, FURS,
// inventory, invoice, real quote/order tables or accounting ledgers.
import {demoBusinessUnits,demoCrmPipeline} from "../next11/demoBusinessModel.mjs";

const seed=new Map(),active=new Map(),listeners=new Set();
const ROLES=new Set(["Nabava","Prodaja","Vodja projekta","Drugo"]);
const KINDS=new Set(["Klic","Sestanek","Naloga","Opomba"]);

function freeze(data){
 if(data&&typeof data==="object"&&!Object.isFrozen(data)){
  for(const value of Object.values(data))freeze(value);
  Object.freeze(data);
 }
 return data;
}
function company(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1||companyId>3)
  throw new RangeError("CRM 360 dovoljuje le tri sintetična podjetja.");
 demoBusinessUnits(companyId);
}
function fixtureDeal(companyId,dealId){
 const deal=demoCrmPipeline(companyId).find(x=>x.id===dealId);
 if(!deal)throw new RangeError("CRM priložnost ni v izbranem sintetičnem podjetju.");
 return deal;
}
function customerId(companyId,dealId){
 fixtureDeal(companyId,dealId);
 return "SYN-C360-CUST-"+companyId+"-"+dealId.slice(-3);
}
function checkText(value,max=80){
 const text=String(value??"").trim().replace(/\s+/g," ");
 if(!/^Sintetični [\p{L}0-9 ._-]{2,80}$/u.test(text)||text.length>max)
  throw new RangeError("Vnesi izključno sintetični opis s predpono »Sintetični«.");
 return text;
}
function emailForDemo(value){
 const text=String(value??"").trim().toLowerCase();
 if(text&&!/^[a-z0-9][a-z0-9._+-]{0,39}@example\.test$/.test(text))
  throw new RangeError("Dovoljeni so samo izmišljeni naslovi @example.test.");
 return text;
}
function nextId(collection,prefix){
 if(collection.length>=40)throw new RangeError("Dosežena omejitev CRM demo zapisov.");
 return prefix+String(collection.length+1).padStart(3,"0");
}
function checkRef(snapshot,dealId,contactId){
 const customer=customerId(snapshot.companyId,dealId);
 const contact=snapshot.contacts.find(x=>x.id===contactId&&x.dealId===dealId&&x.customerId===customer);
 if(!contact)throw new RangeError("Kontakt in priložnost ne pripadata istemu sintetičnemu kupcu.");
 return {customer,contact};
}
function checkState(snapshot){
 company(snapshot?.companyId);
 const cid=snapshot.companyId;
 if(snapshot.demoOnly!==true||!Number.isSafeInteger(snapshot.revision)||
  !Array.isArray(snapshot.contacts)||!Array.isArray(snapshot.activities)||
  !Array.isArray(snapshot.quotes)||!Array.isArray(snapshot.orders)||
  !Array.isArray(snapshot.events)||snapshot.contacts.length>40||
  snapshot.activities.length>40||snapshot.quotes.length>40||
  snapshot.orders.length>40||snapshot.events.length>100)
  throw new RangeError("Neveljaven sintetični CRM 360 posnetek.");
 for(const type of ["contacts","activities","quotes","orders"]){
  const ids=new Set();
  for(const record of snapshot[type]){
   if(record.companyId!==cid||ids.has(record.id))
    throw new RangeError("Podvojen ali tuj CRM 360 zapis.");
   ids.add(record.id);
   fixtureDeal(cid,record.dealId);
   if(record.customerId!==customerId(cid,record.dealId))
    throw new RangeError("CRM 360 kupec ne ustreza priložnosti.");
   if(type!=="contacts")checkRef(snapshot,record.dealId,record.contactId);
  }
 }
 for(const quote of snapshot.quotes){
  if(!["draft","approved"].includes(quote.status)||
   !Number.isSafeInteger(quote.valueCents)||quote.valueCents<1||
   quote.valueCents!==fixtureDeal(cid,quote.dealId).valueCents)
   throw new RangeError("Neveljaven testni osnutek ponudbe.");
 }
 for(const order of snapshot.orders){
  const quote=snapshot.quotes.find(x=>x.id===order.quoteId);
  if(!quote||quote.status!=="approved"||
   quote.dealId!==order.dealId||quote.contactId!==order.contactId||
   quote.valueCents!==order.valueCents||
   order.status!=="draft_for_review")
   throw new RangeError("Naročilo nima potrjene sintetične ponudbe.");
 }
 for(const event of snapshot.events){
  if(event.companyId!==cid||!["contact.add","contact.edit","activity.add",
   "quote.create","quote.approve","order.create"].includes(event.action))
   throw new RangeError("Tuj CRM 360 dogodek.");
 }
 return snapshot;
}
export function initialCrm360(companyId){
 company(companyId);
 if(!seed.has(companyId)){
  const contacts=demoCrmPipeline(companyId).map((deal,index)=>({
   id:"SYN-C360-CON-"+companyId+"-"+String(index+1).padStart(3,"0"),
   companyId,dealId:deal.id,customerId:customerId(companyId,deal.id),
   name:"Sintetični kontakt "+deal.id.slice(-3),
   role:"Prodaja",email:"crm"+deal.id.slice(-3)+"@example.test",version:1
  }));
  seed.set(companyId,freeze({
   companyId,demoOnly:true,revision:0,contacts,
   activities:[],quotes:[],orders:[],events:[]
  }));
 }
 return seed.get(companyId);
}
export function readCrm360(companyId){
 if(!active.has(companyId))active.set(companyId,initialCrm360(companyId));
 return active.get(companyId);
}
export function subscribeCrm360(listener){
 if(typeof listener!=="function")throw new TypeError("Neveljaven CRM listener.");
 listeners.add(listener);
 return ()=>listeners.delete(listener);
}
function notify(){for(const f of listeners)f()}
export function crm360Customers(companyId){
 return demoCrmPipeline(companyId).map(deal=>({
  id:customerId(companyId,deal.id),companyId,
  name:deal.partner,dealId:deal.id,unitId:deal.unitId
 }));
}

/** Pure checked reducer: all identifiers are derived, not caller-controlled. */
export function applyCrm360(snapshot,companyId,action){
 company(companyId);
 if(!snapshot||snapshot.companyId!==companyId||snapshot.demoOnly!==true||
  !action||typeof action!=="object"||Array.isArray(action))
  throw new RangeError("CRM 360 dejanje nima veljavnega podjetja.");
 checkState(snapshot);
 const {type}=action;
 let patch=null,resource=null;
 if(type==="contact.add"){
  const deal=fixtureDeal(companyId,action.dealId);
  const name=checkText(action.name);
  const email=emailForDemo(action.email);
  if(!ROLES.has(action.role))throw new RangeError("Neveljavna testna vloga kontakta.");
  if(snapshot.contacts.some(x=>x.dealId===deal.id&&x.name===name))
   throw new RangeError("Ta sintetični kontakt že obstaja.");
  resource={
   id:nextId(snapshot.contacts,"SYN-C360-CON-"+companyId+"-"),
   companyId,dealId:deal.id,customerId:customerId(companyId,deal.id),
   name,role:action.role,email,version:1
  };
  patch={contacts:[...snapshot.contacts,resource]};
 }else if(type==="contact.edit"){
  const contact=snapshot.contacts.find(x=>x.id===action.contactId);
  if(!contact||contact.version!==action.expectedVersion||
   contact.companyId!==companyId)
   throw new RangeError("Stik je iz drugega podjetja ali je bil medtem spremenjen.");
  const name=checkText(action.name),email=emailForDemo(action.email);
  if(!ROLES.has(action.role))throw new RangeError("Neveljavna testna vloga.");
  if(snapshot.contacts.some(x=>x.id!==contact.id&&x.dealId===contact.dealId&&x.name===name))
   throw new RangeError("Podvojen sintetični kontakt.");
  if(contact.name===name&&contact.email===email&&contact.role===action.role)
   return snapshot;
  resource={...contact,name,email,role:action.role,version:contact.version+1};
  patch={contacts:snapshot.contacts.map(x=>x.id===contact.id?resource:x)};
 }else if(type==="activity.add"){
  const {customer}=checkRef(snapshot,action.dealId,action.contactId);
  if(!KINDS.has(action.kind))throw new RangeError("Neveljavna vrsta CRM aktivnosti.");
  const subject=checkText(action.subject,110);
  resource={
   id:nextId(snapshot.activities,"SYN-C360-ACT-"+companyId+"-"),
   companyId,dealId:action.dealId,customerId:customer,
   contactId:action.contactId,kind:action.kind,subject,status:"open"
  };
  patch={activities:[...snapshot.activities,resource]};
 }else if(type==="quote.create"){
  const {customer}=checkRef(snapshot,action.dealId,action.contactId);
  if(snapshot.quotes.some(x=>x.dealId===action.dealId))
   throw new RangeError("Za to priložnost že obstaja demo ponudba.");
  const deal=fixtureDeal(companyId,action.dealId);
  resource={
   id:nextId(snapshot.quotes,"SYN-C360-Q-"+companyId+"-"),
   companyId,dealId:deal.id,customerId:customer,
   contactId:action.contactId,partner:deal.partner,
   valueCents:deal.valueCents,currency:"EUR",
   status:"draft",demoOnly:true,version:1,
   taxCalculated:false,issued:false
  };
  patch={quotes:[...snapshot.quotes,resource]};
 }else if(type==="quote.approve"){
  const quote=snapshot.quotes.find(x=>x.id===action.quoteId&&x.companyId===companyId);
  if(!quote||action.confirmed!==true||quote.version!==action.expectedVersion)
   throw new RangeError("Potrebna je ročna potrditev trenutne sintetične ponudbe.");
  if(quote.status==="approved")return snapshot;
  resource={...quote,status:"approved",version:quote.version+1};
  patch={quotes:snapshot.quotes.map(x=>x.id===quote.id?resource:x)};
 }else if(type==="order.create"){
  const quote=snapshot.quotes.find(x=>x.id===action.quoteId&&x.companyId===companyId);
  if(!quote||quote.status!=="approved"||action.confirmed!==true)
   throw new RangeError("Naročilo potrebuje ročno potrjeno sintetično ponudbo.");
  if(snapshot.orders.some(x=>x.quoteId===quote.id))
   return snapshot; // exact repeated conversion cannot create a duplicate
  resource={
   id:nextId(snapshot.orders,"SYN-C360-O-"+companyId+"-"),
   companyId,dealId:quote.dealId,customerId:quote.customerId,
   contactId:quote.contactId,quoteId:quote.id,partner:quote.partner,
   valueCents:quote.valueCents,currency:"EUR",
   status:"draft_for_review",demoOnly:true,
   stockReserved:false,invoiceIssued:false,accountingPosted:false
  };
  patch={orders:[...snapshot.orders,resource]};
 }else{
  throw new RangeError("Nepodprto sintetično CRM dejanje.");
 }
 const next={
  ...snapshot,...patch,revision:snapshot.revision+1,
  events:[...snapshot.events,{
   companyId,action:type,resourceId:resource.id,revision:snapshot.revision+1
  }].slice(-100)
 };
 checkState(next);
 return freeze(next);
}
export function performCrm360(companyId,action){
 const before=readCrm360(companyId);
 const next=applyCrm360(before,companyId,action);
 if(next!==before){
  active.set(companyId,next);
  notify();
 }
 return next;
}
export function resetCrm360(companyId){
 company(companyId);
 active.set(companyId,initialCrm360(companyId));
 notify();
 return readCrm360(companyId);
}
