import {test} from "node:test";
import assert from "node:assert/strict";
import {centsFromInput,euro,makeDraft,issueDraft,simulateSending} from "../app/issued/demoInvoice.mjs";

const existing=[
  {id:"IR-2026-0054",number:"2026-0054",status:"Plačano"},
  {id:"IR-2026-0052",number:"—",status:"Osnutek"}
];
const input={partner:" Testni kupec d.o.o. ",description:" Grafične storitve ",net:"1000,00",vatRate:"22",dueDays:"15"};

test("calculates net, VAT, gross in integer cents and keeps synthetic marker",()=>{
  const draft=makeDraft(input,existing);
  assert.equal(draft.partner,"Testni kupec d.o.o.");
  assert.equal(draft.netCents,100000);
  assert.equal(draft.taxCents,22000);
  assert.equal(draft.grossCents,122000);
  assert.equal(draft.status,"Osnutek");
  assert.equal(draft.number,"—");
  assert.equal(draft.demo,true);
  assert.equal(draft.sent,false);
  assert.equal(draft.paid,false);
  assert.equal(draft.issue,"—");
});

test("supports 9.5 and 0 percent VAT, including cent rounding",()=>{
  const low=makeDraft({...input,net:"0,11",vatRate:"9.5"},existing);
  assert.equal(low.netCents,11);
  assert.equal(low.taxCents,1);
  assert.equal(low.grossCents,12);
  const zero=makeDraft({...input,vatRate:"0"},existing);
  assert.equal(zero.taxCents,0);
  assert.equal(zero.grossCents,100000);
});

test("rejects empty, invalid, oversized and negative values",()=>{
  for(const invalid of ["","-1","0","0,00","abc","1,234","1000000,00","99999999","1e3"]){
    assert.throws(()=>centsFromInput(invalid),Error,invalid);
  }
  for(const invalidForm of [
    {...input,partner:""},
    {...input,description:"  "},
    {...input,vatRate:"25"},
    {...input,dueDays:"365"},
  ])assert.throws(()=>makeDraft(invalidForm,existing),Error);
});

test("creates unique IDs and non-legal DEMO issue numbers",()=>{
  const first=makeDraft(input,existing);
  const second=makeDraft(input,[...existing,first]);
  assert.equal(first.id,"IR-DEMO-0001");
  assert.equal(second.id,"IR-DEMO-0002");
  const now=new Date(2026,10,10,12,0);
  const firstIssued=issueDraft(first,[...existing,first,second],now);
  assert.equal(firstIssued.status,"Izdano");
  assert.equal(firstIssued.number,"DEMO-2026-0055");
  assert.equal(firstIssued.issue,"10. 11. 2026");
  assert.equal(firstIssued.due,"25. 11. 2026");
  const nextIssued=issueDraft(second,[...existing,firstIssued,second],now);
  assert.equal(nextIssued.number,"DEMO-2026-0056");
});

test("simulated sending never calls external resources and is state restricted",()=>{
  const draft=makeDraft(input,existing);
  assert.throws(()=>simulateSending(draft),/izdan račun/);
  const issued=issueDraft(draft,[...existing,draft],new Date(2026,10,10));
  const sent=simulateSending(issued);
  assert.equal(sent.status,"Poslano");
  assert.equal(sent.sent,true);
  assert.match(sent.delivery,/brez pošiljanja/);
  assert.throws(()=>issueDraft(sent,[...existing,sent]),/osnutek/);
  assert.throws(()=>simulateSending(sent),/izdan račun/);
});

test("legacy demo draft can issue without mutating original fixtures",()=>{
  const fixture={...existing[1],partner:"Studio Kreativ s.p.",dueDays:8};
  const issued=issueDraft(fixture,existing,new Date(2026,10,10));
  assert.equal(issued.due,"18. 11. 2026");
  assert.equal(existing[1].status,"Osnutek");
  assert.match(euro(100),/1,00/); // locale formatting preserves cents
});
