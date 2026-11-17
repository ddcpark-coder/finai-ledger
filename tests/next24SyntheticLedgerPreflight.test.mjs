import test from "node:test";
import assert from "node:assert/strict";
import { preflightSyntheticJournal } from "../app/next11/syntheticLedgerPreflight.mjs";

const base = () => ({
  companyId: 1, currency: "EUR", reference: "SYN-INV-12",
  lines: [
    {accountId:"SYN-ACC-120",debitCents:12530,creditCents:0},
    {accountId:"SYN-ACC-760",debitCents:0,creditCents:12530}
  ]
});

test("balanced EUR cents preview has no posting capability and is immutable",()=>{
  const source=base(), before=structuredClone(source);
  const result=preflightSyntheticJournal(1,source);
  assert.equal(result.totalDebitCents,12530);
  assert.equal(result.totalCreditCents,12530);
  assert.equal(result.postingAllowed,false);
  assert.equal(result.mode,"synthetic-preview-only");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.lines));
  assert.ok(Object.isFrozen(result.lines[0]));
  assert.deepEqual(source,before);
});

test("reject tenant mismatch, non-demo references, currency and missing lines",()=>{
  for(const candidate of [
    {...base(),companyId:2}, {...base(),currency:"USD"},
    {...base(),reference:"SI-REAL-123"},
    {...base(),lines:[]},{...base(),lines:[base().lines[0]]}
  ])assert.throws(()=>preflightSyntheticJournal(1,candidate));
});

test("fail closed on unbalanced, negative, fractional, ambiguous and oversized cents",()=>{
  for(const line of [
    {accountId:"SYN-ACC-120",debitCents:12531,creditCents:0},
    {accountId:"SYN-ACC-120",debitCents:12.5,creditCents:0},
    {accountId:"SYN-ACC-120",debitCents:-1,creditCents:0},
    {accountId:"SYN-ACC-120",debitCents:1,creditCents:1},
    {accountId:"SYN-ACC-120",debitCents:0,creditCents:0},
    {accountId:"SYN-ACC-120",debitCents:1_000_000_000_001,creditCents:0},
    {accountId:"REAL-120",debitCents:12530,creditCents:0}
  ])assert.throws(()=>preflightSyntheticJournal(1,{...base(),lines:[line,base().lines[1]]}));
});

test("multiple balanced journal lines require integer cents and safe totals",()=>{
  const source=base();
  source.lines=[
    {accountId:"SYN-ACC-120",debitCents:12530,creditCents:0},
    {accountId:"SYN-ACC-760",debitCents:0,creditCents:10000},
    {accountId:"SYN-ACC-260",debitCents:0,creditCents:2530}
  ];
  const outcome=preflightSyntheticJournal(1,source);
  assert.equal(outcome.lines.length,3);
  assert.equal(outcome.totalDebitCents,12530);
});

test("extra PII fields cannot escape into validated preflight projection",()=>{
  const source=base();
  source.customerName="Do not export";
  source.lines[0].iban="SI56-PRIVATE";
  const outcome=preflightSyntheticJournal(1,source);
  assert.equal(JSON.stringify(outcome).includes("Do not export"),false);
  assert.equal(JSON.stringify(outcome).includes("PRIVATE"),false);
});

test("reject zero-value and excessive line-count journals",()=>{
  const zero=base();zero.lines=[
    {accountId:"SYN-ACC-120",debitCents:0,creditCents:0},
    {accountId:"SYN-ACC-760",debitCents:0,creditCents:0}
  ];
  assert.throws(()=>preflightSyntheticJournal(1,zero));
  const huge=base();huge.lines=Array.from({length:101},(_,i)=>({
    accountId:"SYN-ACC-120",debitCents:i%2===0?1:0,creditCents:i%2===1?1:0
  }));
  assert.throws(()=>preflightSyntheticJournal(1,huge));
});
