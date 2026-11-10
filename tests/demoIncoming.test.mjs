import test from "node:test";
import assert from "node:assert/strict";
import {makeIncomingDemo,approveIncomingDemo,makeIncomingDemoEvent,companyIncomingRecords} from "../app/incoming/demoIncoming.mjs";

const valid={partner:"Testni dobavitelj d.o.o.",number:"DOB-123",gross:"1234,56",vatRate:"22",dueDays:"15"};
const now=new Date(2026,10,10,12);
test("creates scoped, session-only incoming invoice with safe integer cents",()=>{
  const row=makeIncomingDemo(valid,[],now,1);
  assert.equal(row.id,"PR-DEMO-1-0001");
  assert.equal(row.companyId,1);
  assert.equal(row.grossCents,123456);
  assert.equal(row.status,"Pregled");
  assert.equal(row.ocr,0);
  assert.equal(row.ai,0);
  assert.equal(row.date,"10. 11. 2026");
  assert.equal(row.due,"25. 11. 2026");
  assert.equal(row.demo,true);
});

test("duplicate supplier and number rejected only within the same company",()=>{
  const first=makeIncomingDemo(valid,[],now,1);
  assert.throws(()=>makeIncomingDemo(valid,[first],now,1),/že obstaja/);
  const second=makeIncomingDemo(valid,[first],now,2);
  assert.equal(second.id,"PR-DEMO-2-0001");
  assert.equal(companyIncomingRecords([first,second],1).length,1);
  assert.equal(companyIncomingRecords([first,second],2).length,1);
  assert.deepEqual(companyIncomingRecords([first,second],3),[]);
  const another=makeIncomingDemo({...valid,number:"DOB-124"},[first,second],now,1);
  assert.equal(another.id,"PR-DEMO-1-0002");
});

test("rejects malformed amounts, rates, dates and invalid company IDs",()=>{
  for(const gross of ["0","-5","1.234,56","4.444","1,123","abc"])
    assert.throws(()=>makeIncomingDemo({...valid,gross},[],now,1));
  assert.throws(()=>makeIncomingDemo({...valid,vatRate:"99"},[],now,1),/stopnjo DDV/);
  assert.throws(()=>makeIncomingDemo({...valid,dueDays:"365"},[],now,1),/plačilni rok/);
  assert.throws(()=>makeIncomingDemo(valid,[],new Date("invalid"),1),/Neveljaven datum/);
  for(const id of [undefined,null,0,NaN,"1",1.4])
    assert.throws(()=>makeIncomingDemo(valid,[],now,id),/podjetje/);
});

test("approval of a demo invoice is strictly company-bound and cannot repeat",()=>{
  const original=makeIncomingDemo(valid,[],now,1);
  assert.throws(()=>approveIncomingDemo(original,2),/podjetja/);
  const approved=approveIncomingDemo(original,1);
  assert.equal(approved.status,"Odobreno");
  assert.equal(original.status,"Pregled");
  assert.throws(()=>approveIncomingDemo(approved,1));
  assert.throws(()=>approveIncomingDemo({...original,demo:false},1));
});

test("separate synthetic activity events cannot reference another company",()=>{
  const a=makeIncomingDemo(valid,[],now,1);
  const b=makeIncomingDemo(valid,[],now,2);
  const events=[
    makeIncomingDemoEvent("created",1,a,now),
    makeIncomingDemoEvent("created",2,b,now),
    makeIncomingDemoEvent("approved",1,approveIncomingDemo(a,1),now),
    makeIncomingDemoEvent("reset",2,null,now),
  ];
  assert.deepEqual(events.filter(x=>x.companyId===1).map(x=>x.action),["created","approved"]);
  assert.deepEqual(events.filter(x=>x.companyId===2).map(x=>x.action),["created","reset"]);
  assert.throws(()=>makeIncomingDemoEvent("approved",1,b,now),/podjetjem/);
  assert.throws(()=>makeIncomingDemoEvent("deleted",1,a,now),/Neznana/);
  assert.throws(()=>makeIncomingDemoEvent("reset",1,a,now),/Ponastavitev/);
});
