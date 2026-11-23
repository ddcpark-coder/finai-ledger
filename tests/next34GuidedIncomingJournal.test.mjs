import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeIncomingDemo,approveIncomingDemo} from "../app/incoming/demoIncoming.mjs";
import {
 REVIEW_ACCOUNTS,reviewSyntheticIncomingJournal
} from "../app/incoming/syntheticInvoiceJournalReview.mjs";

function demo(companyId=1,gross="122.00",vatRate="22"){
 const invoice=makeIncomingDemo({
  partner:"Sintetični dobavitelj "+companyId,
  number:"SYN-TEST-"+companyId,
  gross,vatRate,dueDays:15
 },[],new Date(2026,10,23),companyId);
 return approveIncomingDemo(invoice,companyId);
}
function review(invoice,companyId=invoice.companyId,account="4100"){
 return reviewSyntheticIncomingJournal(invoice,companyId,{account,confirmed:true});
}

test("a manually approved synthetic invoice creates balanced immutable 22% example, never posts",()=>{
 const invoice=demo();
 const before=structuredClone(invoice);
 const actual=review(invoice);
 assert.equal(actual.mode,"synthetic-browser-invoice-journal-v1");
 assert.equal(actual.invoiceId,invoice.id);
 assert.equal(actual.reference,invoice.number);
 assert.equal(actual.companyId,1);
 assert.equal(actual.totalDebitCents,12200);
 assert.equal(actual.totalCreditCents,12200);
 assert.deepEqual(actual.lines.map(x=>[x.accountCode,x.debitCents,x.creditCents]),[
  ["4100",10000,0],["2601",2200,0],["2200",0,12200]
 ]);
 for(const name of ["journalSaved","accountingPosted","postingAllowed","serverVerified","auditPersisted"])
  assert.equal(actual[name],false);
 assert.equal(actual.vatIsIllustrative,true);
 assert.ok(Object.isFrozen(actual));
 assert.ok(Object.isFrozen(actual.lines));
 assert.ok(actual.lines.every(Object.isFrozen));
 assert.deepEqual(invoice,before);
 assert.equal(review(invoice),actual===review(invoice)?actual:review(invoice)); // deterministic values checked below
 assert.deepEqual(actual,review(invoice));
});

test("reduced VAT and zero VAT remain balanced for odd cents and every tenant",()=>{
 for(const [vatRate,label] of [["0","0 %"],["9.5","9,5 %"],["22","22 %"]]){
  for(const companyId of [1,2,3]){
   const invoice=demo(companyId,"123.47",vatRate);
   const result=review(invoice,companyId,"4070");
   assert.equal(result.companyId,companyId);
   assert.equal(result.vatLabel,label);
   assert.equal(result.selectedAccount,"4070");
   assert.equal(result.totalDebitCents,12347);
   assert.equal(result.totalCreditCents,12347);
   assert.equal(result.lines.reduce((sum,x)=>sum+x.debitCents,0),12347);
   assert.equal(result.lines.reduce((sum,x)=>sum+x.creditCents,0),12347);
   assert.equal(result.lines.length,vatRate==="0"?2:3);
  }
 }
 const low=review(demo(1,"0.01","22"));
 assert.equal(low.totalDebitCents,1);
 assert.equal(low.lines.at(-1).creditCents,1);
});

test("pre-approval, explicit account confirmation, wrong tenant or malformed demo fail closed",()=>{
 const valid=demo();
 const pending={...valid,status:"Pregled",approved:false};
 const failures=[
  [pending,1,{account:"4100",confirmed:true}],
  [valid,2,{account:"4100",confirmed:true}],
  [{...valid,companyId:2},1,{account:"4100",confirmed:true}],
  [{...valid,id:"PR-2026-0188"},1,{account:"4100",confirmed:true}],
  [{...valid,demo:false},1,{account:"4100",confirmed:true}],
  [{...valid,source:"remote"},1,{account:"4100",confirmed:true}],
  [{...valid,approved:false},1,{account:"4100",confirmed:true}],
  [{...valid,vat:"5 %"},1,{account:"4100",confirmed:true}],
  [{...valid,grossCents:0},1,{account:"4100",confirmed:true}],
  [{...valid,grossCents:100000000},1,{account:"4100",confirmed:true}],
  [{...valid,grossCents:1.1},1,{account:"4100",confirmed:true}],
  [valid,1,{account:"4100",confirmed:false}],
  [valid,1,{account:"9999",confirmed:true}]
 ];
 for(const [row,companyId,args] of failures)
  assert.throws(()=>reviewSyntheticIncomingJournal(row,companyId,args));
 for(const id of [0,4,"1",null,NaN])
  assert.throws(()=>reviewSyntheticIncomingJournal(valid,id,{account:"4100",confirmed:true}));
 assert.deepEqual(REVIEW_ACCOUNTS.map(x=>x.code),["4100","4070"]);
 assert.ok(Object.isFrozen(REVIEW_ACCOUNTS));
 assert.ok(REVIEW_ACCOUNTS.every(Object.isFrozen));
});

test("the actual incoming UI only exposes explicit non-posting local review and resets state on selection",()=>{
 const ui=readFileSync(new URL("../app/incoming/IncomingInvoicesWorkspace.jsx",import.meta.url),"utf8");
 assert.match(ui,/selected\.demo===true&&selected\.source==="manual"/);
 assert.match(ui,/reviewSyntheticIncomingJournal\(selected,companyId/);
 assert.match(ui,/resetReview\(\)/);
 assert.match(ui,/setJournalPreview\(null\)/);
 assert.match(ui,/Potrdi pregled/);
 assert.match(ui,/NEKNJIŽENO/);
 assert.match(ui,/DDV ni davčno preverjen/);
 assert.doesNotMatch(ui,/>Knjiži račun</);
 assert.doesNotMatch(ui,/fetch\(/);
});
