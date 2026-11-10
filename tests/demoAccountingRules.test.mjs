import test from "node:test";
import assert from "node:assert/strict";
import {getDemoAccountSuggestion,recordDemoRuleChoice} from "../app/incoming/demoAccountingRules.mjs";

const invoice={companyId:1,id:"PR-2026-0188",partner:"Merkur d.o.o."};
test("returns deterministic, human-readable and explicitly non-AI rule for one tenant",()=>{
 const item=getDemoAccountSuggestion(invoice,1);
 assert.equal(item.account,"4100");
 assert.equal(item.costCenter,"PROD");
 assert.equal(item.isAiGenerated,false);
 assert.equal(item.hasBeenPosted,false);
 assert.match(item.explanation,/pooblaščena oseba/);
});
test("never suggests across company boundaries or unsupported suppliers",()=>{
 assert.equal(getDemoAccountSuggestion(invoice,2),null);
 assert.equal(getDemoAccountSuggestion({...invoice,partner:"Unknown"},1),null);
 assert.equal(getDemoAccountSuggestion(null,1),null);
 assert.equal(getDemoAccountSuggestion({companyId:2,id:"2",partner:"Merkur d.o.o."},2),null);
 assert.equal(getDemoAccountSuggestion({companyId:2,id:"2",partner:"Testni dobavitelj B"},2).account,"4100");
});
test("explicit feedback never posts, persists, or trains a model",()=>{
 const suggestion=getDemoAccountSuggestion(invoice,1);
 for(const action of ["accepted","rejected"]){
  const feedback=recordDemoRuleChoice(suggestion,action,1);
  assert.equal(feedback.action,action);
  assert.equal(feedback.posted,false);
  assert.equal(feedback.persisted,false);
  assert.equal(feedback.aiTraining,false);
 }
 assert.throws(()=>recordDemoRuleChoice(suggestion,"accepted",2),/podjetju/);
 assert.throws(()=>recordDemoRuleChoice(suggestion,"modified",1),/Neveljavna/);
 for(const id of [0,NaN,"1"])assert.throws(()=>getDemoAccountSuggestion(invoice,id));
});
