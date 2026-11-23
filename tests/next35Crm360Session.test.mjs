import test from "node:test";
import assert from "node:assert/strict";
import {readDemoCompany,changeDemoCompany} from "../app/next11/sharedDemoCompany.mjs";
import {advanceDemoOpportunity} from "../app/next11/demoBusinessModel.mjs";
import {
 initialCrm360,readCrm360,crm360Customers,applyCrm360,
 performCrm360,resetCrm360,subscribeCrm360
} from "../app/crm/crm360Session.mjs";

const company=1;
const dealId="SYN-CRM-101";
const contactId="SYN-C360-CON-1-001";
const apply=(action)=>performCrm360(company,action);

test("CRM360 seed is deeply immutable, uses same original deals, and separates tenants",()=>{
 resetCrm360(1);resetCrm360(2);resetCrm360(3);
 const a=readCrm360(1),b=readCrm360(2),c=readCrm360(3);
 assert.equal(a.demoOnly,true);
 assert.equal(a.contacts.length,readDemoCompany(1).deals.length);
 assert.equal(b.contacts.length,1);assert.equal(c.contacts.length,1);
 assert.equal(a.contacts[0].dealId,readDemoCompany(1).deals[0].id);
 assert.equal(crm360Customers(1)[0].name,readDemoCompany(1).deals[0].partner);
 assert.equal(a.contacts[0].email.endsWith("@example.test"),true);
 assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.contacts)&&
  Object.isFrozen(a.contacts[0]));
 assert.throws(()=>a.contacts.push({}),TypeError);
 assert.notEqual(initialCrm360(1),initialCrm360(2));
 assert.throws(()=>initialCrm360("1"));
 assert.throws(()=>initialCrm360(4));
});

test("add/edit contact with explicit version, activity timeline and stale rejection",()=>{
 resetCrm360(1);
 const first=readCrm360(1);
 const notifications=[];
 const unsub=subscribeCrm360(()=>notifications.push(readCrm360(1).revision));
 const added=apply({
  type:"contact.add",dealId,name:"Sintetični novi poslovni kontakt",
  role:"Nabava",email:"demo-nabava@example.test"
 });
 assert.equal(added.contacts.length,first.contacts.length+1);
 const record=added.contacts.at(-1);
 assert.equal(record.companyId,1);
 assert.equal(record.dealId,dealId);
 assert.equal(record.version,1);
 const updated=apply({
  type:"contact.edit",contactId:record.id,expectedVersion:1,
  name:"Sintetični popravljeni kontakt",role:"Vodja projekta",
  email:"projekt@example.test"
 });
 assert.equal(updated.contacts.at(-1).version,2);
 assert.equal(updated.contacts.at(-1).role,"Vodja projekta");
 assert.throws(()=>apply({
  type:"contact.edit",contactId:record.id,expectedVersion:1,
  name:"Sintetični popravljeni kontakt",role:"Prodaja",
  email:"projekt@example.test"
 }),/spremenjen/);
 const activity=apply({
  type:"activity.add",dealId,contactId:record.id,
  subject:"Sintetični preveri ponudbo",kind:"Klic"
 });
 assert.equal(activity.activities[0].contactId,record.id);
 assert.equal(activity.activities[0].status,"open");
 assert.equal(activity.events.length,3);
 assert.equal(notifications.length,3);
 unsub();
 assert.equal(readCrm360(2).contacts.length,1);
 assert.equal(readCrm360(3).activities.length,0);
 assert.equal(first.activities.length,0);
});

test("quote needs existing contact and yields exactly one manually approved order draft",()=>{
 resetCrm360(1);resetCrm360(2);
 const original=readCrm360(1);
 const q=apply({type:"quote.create",dealId,contactId});
 assert.equal(q.quotes.length,1);
 const quote=q.quotes[0];
 assert.equal(quote.valueCents,readDemoCompany(1).deals[0].valueCents);
 assert.equal(quote.status,"draft");
 assert.equal(quote.taxCalculated,false);
 assert.equal(quote.issued,false);
 assert.throws(()=>apply({type:"quote.create",dealId,contactId}),/že obstaja/);
 assert.throws(()=>apply({type:"order.create",quoteId:quote.id,confirmed:true}),
  /ročno potrjeno/);
 assert.throws(()=>apply({
  type:"quote.approve",quoteId:quote.id,expectedVersion:1,confirmed:false
 }));
 const approved=apply({
  type:"quote.approve",quoteId:quote.id,expectedVersion:1,confirmed:true
 });
 assert.equal(approved.quotes[0].status,"approved");
 assert.equal(approved.quotes[0].version,2);
 assert.throws(()=>apply({
  type:"quote.approve",quoteId:quote.id,expectedVersion:1,confirmed:true
 }));
 const withOrder=apply({type:"order.create",quoteId:quote.id,confirmed:true});
 assert.equal(withOrder.orders.length,1);
 const order=withOrder.orders[0];
 assert.equal(order.quoteId,quote.id);
 assert.equal(order.valueCents,quote.valueCents);
 assert.equal(order.companyId,1);
 assert.equal(order.stockReserved,false);
 assert.equal(order.invoiceIssued,false);
 assert.equal(order.accountingPosted,false);
 assert.equal(order.status,"draft_for_review");
 const same=apply({type:"order.create",quoteId:quote.id,confirmed:true});
 assert.equal(same,withOrder);
 assert.equal(same.orders.length,1);
 assert.equal(readCrm360(2).quotes.length,0);
 assert.equal(original.orders.length,0);
});

test("foreign-company contacts, deals and quotes, real PII and malformed actions are rejected",()=>{
 resetCrm360(1);resetCrm360(2);
 const before=readCrm360(1),b=readCrm360(2);
 const cases=[
  [1,{type:"contact.add",dealId:"SYN-CRM-201",name:"Sintetični test",role:"Prodaja",email:"x@example.test"}],
  [2,{type:"activity.add",dealId:"SYN-CRM-201",contactId,kind:"Klic",subject:"Sintetični stik"}],
  [1,{type:"contact.add",dealId,name:"Janez Novak",role:"Prodaja",email:"x@example.test"}],
  [1,{type:"contact.add",dealId,name:"Sintetični test",role:"Prodaja",email:"person@gmail.com"}],
  [1,{type:"contact.add",dealId,name:"Sintetični test",role:"Admin",email:"x@example.test"}],
  [1,{type:"activity.add",dealId,contactId,kind:"SMS",subject:"Sintetični stik"}],
  [1,{type:"activity.add",dealId,contactId,kind:"Naloga",subject:"Real person contact"}],
  [1,{type:"quote.create",dealId,contactId:"SYN-C360-CON-2-001"}],
  [2,{type:"quote.approve",quoteId:"SYN-C360-Q-1-001",expectedVersion:1,confirmed:true}],
  [1,{type:"order.create",quoteId:"SYN-C360-Q-2-001",confirmed:true}],
  [1,{type:"accounting.post"}],
 ];
 for(const [id,action] of cases)
  assert.throws(()=>performCrm360(id,action));
 assert.equal(readCrm360(1),before);
 assert.equal(readCrm360(2),b);
 const forged={
  ...before,contacts:[{...before.contacts[0],companyId:2},...before.contacts.slice(1)]
 };
 assert.throws(()=>applyCrm360(forged,1,{
  type:"quote.create",dealId,contactId
 }));
 assert.throws(()=>applyCrm360(before,2,{
  type:"activity.add",dealId,contactId,kind:"Klic",subject:"Sintetični test"
 }));
});

test("CRM360 portfolio coexists with shared CRM changes and company-only resets",()=>{
 resetCrm360(1);resetCrm360(2);
 const other=readCrm360(2);
 apply({type:"activity.add",dealId,contactId,
  kind:"Naloga",subject:"Sintetični nadaljnji korak"});
 const source=readDemoCompany(1).deals[0];
 changeDemoCompany(1,"crm",state=>({
  deals:advanceDemoOpportunity(state.deals,1,source.id,"Odkrivanje",source.version),
  activities:state.activities
 }));
 assert.equal(readCrm360(1).activities.length,1);
 assert.equal(readCrm360(1).activities[0].dealId,source.id);
 assert.equal(readCrm360(2),other);
 resetCrm360(1);
 assert.equal(readCrm360(1).activities.length,0);
 assert.equal(readCrm360(2),other);
 assert.equal(readDemoCompany(1).deals[0].stage,"Odkrivanje");
});
