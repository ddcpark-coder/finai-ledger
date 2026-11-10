import test from "node:test";
import assert from "node:assert/strict";
import {referenceKey,suggestBankMatches,confirmBankMatch,resetCompanyBankMatches} from "../app/banking/bankMatching.mjs";
const items=[
 {id:"A-1",companyId:1,reference:"2026-0054",currency:"EUR",direction:"credit",openCents:122000,partner:"ABC"},
 {id:"A-2",companyId:1,reference:"2026-0053",currency:"EUR",direction:"credit",openCents:244000,partner:"Gamma"},
 {id:"B-1",companyId:2,reference:"2026-0054",currency:"EUR",direction:"credit",openCents:122000,partner:"Other tenant"}
];
const tx=(ref,amount,companyId=1)=>({id:"TX-"+ref+companyId,companyId,reference:ref,amountCents:amount,currency:"EUR"});
test("full match compares exact reference, sign, currency and amount, without AI confidence",()=>{
 assert.equal(referenceKey("SI00 2026-0054"),"SI0020260054");
 const suggestions=suggestBankMatches(tx("SI00 2026-0054",122000),items,[],1);
 assert.equal(suggestions.length,1);
 assert.equal(suggestions[0].itemId,"A-1");
 assert.equal(suggestions[0].kind,"full");
 assert.equal(suggestions[0].needsHumanConfirmation,true);
});
test("partial match tracks remaining balance and rejects double or over-allocation",()=>{
 const first=tx("DELNO 2026-0053",100000);
 const after=confirmBankMatch(first,"A-2",items,[],1);
 assert.equal(after[0].partial,true);
 const second={...tx("DELNO 2026-0053",144000),id:"OTHER-TX"};
 const after2=confirmBankMatch(second,"A-2",items,after,1);
 assert.equal(after2.length,2);
 assert.deepEqual(suggestBankMatches({...second,id:"THIRD"},items,after2,1),[]);
 assert.throws(()=>confirmBankMatch(first,"A-2",items,after,1));
});
test("cross-company, wrong direction, wrong currency, missing ref, excess amount fail",()=>{
 assert.throws(()=>suggestBankMatches(tx("2026-0054",122000,2),items,[],1),/podjetja/);
 assert.deepEqual(suggestBankMatches(tx("2026-0054",-122000),items,[],1),[]);
 assert.deepEqual(suggestBankMatches({...tx("2026-0054",122000),currency:"USD"},items,[],1),[]);
 assert.deepEqual(suggestBankMatches(tx("brez sklica",122000),items,[],1),[]);
 assert.deepEqual(suggestBankMatches(tx("2026-0054",200000),items,[],1),[]);
 assert.throws(()=>confirmBankMatch(tx("2026-0054",122000),"B-1",items,[],1));
});
test("reset only changes the selected company's confirmations",()=>{
 const a=confirmBankMatch(tx("SI00 2026-0054",122000),"A-1",items,[],1);
 const b=confirmBankMatch(tx("SI00 2026-0054",122000,2),"B-1",items,a,2);
 assert.deepEqual(resetCompanyBankMatches(b,1),[b[1]]);
 assert.deepEqual(resetCompanyBankMatches(b,2),[b[0]]);
});
