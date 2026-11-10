import test from "node:test";
import assert from "node:assert/strict";
import {makeDraft,issueDraft,simulateSending} from "../app/issued/demoInvoice.mjs";

const input={partner:"Sintetični kupec",description:"Testna storitev",net:"100,00",vatRate:"22",dueDays:"15"};
const now=new Date(2026,10,11,12);
test("draft numbers are namespaced and remain unique in each company",()=>{
 const a=makeDraft(input,[],1);
 const b=makeDraft(input,[a],2);
 const a2=makeDraft(input,[a,b],1);
 assert.equal(a.id,"IR-DEMO-1-0001");
 assert.equal(b.id,"IR-DEMO-2-0001");
 assert.equal(a2.id,"IR-DEMO-1-0002");
 assert.equal(a.companyId,1);
 assert.equal(b.companyId,2);
});
test("demo invoice lifecycle rejects every cross-company command",()=>{
 const a=makeDraft(input,[],1);
 const b=makeDraft(input,[],2);
 assert.throws(()=>issueDraft(a,[a,b],now,2),/podjetja/);
 assert.throws(()=>simulateSending({...a,status:"Izdano"},2),/podjetja/);
 const issued=issueDraft(a,[a,b,{companyId:2,number:"2026-0099"}],now,1);
 assert.equal(issued.number,"DEMO-2026-0001");
 assert.equal(issued.companyId,1);
 const sent=simulateSending(issued,1);
 assert.equal(sent.status,"Poslano");
});
test("invalid company IDs cannot create records",()=>{
 for(const id of [0,-1,null,"1",1.2,NaN])assert.throws(()=>makeDraft(input,[],id));
});
