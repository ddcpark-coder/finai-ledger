import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEMO_INVOICE_JOURNAL_LINES,reviewDemoInvoiceJournal} from "../app/next11/syntheticJournalDemo.mjs";

test("synthetic demo review is balanced, frozen and never posts",()=>{
  const result=reviewDemoInvoiceJournal(1);
  assert.equal(result.mode,"synthetic-preview-only");
  assert.equal(result.reference,"SYN-INV-12");
  assert.equal(result.companyId,1);
  assert.equal(result.totalDebitCents,67100);
  assert.equal(result.totalCreditCents,67100);
  assert.equal(result.postingAllowed,false);
  assert.equal(result.lines.length,3);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.lines));
  assert.ok(Object.isFrozen(DEMO_INVOICE_JOURNAL_LINES));
  assert.ok(DEMO_INVOICE_JOURNAL_LINES.every(Object.isFrozen));
  assert.ok(result.lines.every(line=>!Object.hasOwn(line,"label")));
});

test("review fails closed on invalid company IDs",()=>{
  for(const id of [0,-1,"1",null,undefined,1.5,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>reviewDemoInvoiceJournal(id));
  }
  assert.equal(reviewDemoInvoiceJournal(2).companyId,2);
});

test("bookkeeping UI connects a real review action, not a fake posted state",()=>{
  const page=readFileSync(new URL("../app/page.jsx",import.meta.url),"utf8");
  assert.match(page,/AccountingCorePanel context={activeContext} companyId={company}/);
  assert.match(page,/reviewDemoInvoiceJournal\(companyId\)/);
  assert.match(page,/Preveri demo osnutek/);
  assert.match(page,/Knjiženje ni dovoljeno; podatki niso shranjeni/);
  assert.doesNotMatch(page,/setPosted\(/);
  assert.doesNotMatch(page,/>Knjiži temeljnico</);
  assert.match(page,/Revizijska sled · v pripravi/);
});
