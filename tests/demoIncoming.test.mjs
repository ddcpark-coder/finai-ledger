import test from "node:test";
import assert from "node:assert/strict";
import {makeIncomingDemo,approveIncomingDemo} from "../app/incoming/demoIncoming.mjs";

const data={partner:"Testni dobavitelj d.o.o.",number:"DOB-123",gross:"1.234,56",vatRate:"22",dueDays:"15"};
// UI accepts comma or dot as decimal separator, but no thousands separators.
const valid={...data,gross:"1234,56"};
const now=new Date(2026,10,10,12);
test("creates a session-only synthetic incoming invoice",()=>{
  const row=makeIncomingDemo(valid,[],now);
  assert.equal(row.id,"PR-DEMO-0001");
  assert.equal(row.grossCents,123456);
  assert.equal(row.status,"Pregled");
  assert.equal(row.ocr,0);
  assert.equal(row.ai,0);
  assert.equal(row.date,"10. 11. 2026");
  assert.equal(row.due,"25. 11. 2026");
  assert.equal(row.demo,true);
});
test("ID increments and duplicate partner+invoice number is rejected",()=>{
  const first=makeIncomingDemo(valid,[],now);
  assert.throws(()=>makeIncomingDemo(valid,[first],now),/že obstaja/);
  const second=makeIncomingDemo({...valid,number:"DOB-124"},[first],now);
  assert.equal(second.id,"PR-DEMO-0002");
});
test("rejects malformed amounts, invalid VAT and invalid dates",()=>{
  for(const gross of ["0","-5","1.234,56","4.444","1,123","abc"])
    assert.throws(()=>makeIncomingDemo({...valid,gross},[],now));
  assert.throws(()=>makeIncomingDemo({...valid,vatRate:"99"},[],now),/stopnjo DDV/);
  assert.throws(()=>makeIncomingDemo({...valid,dueDays:"365"},[],now),/plačilni rok/);
  assert.throws(()=>makeIncomingDemo(valid,[],new Date("invalid")),/Neveljaven datum/);
});
test("approval updates a demo record, never a fixture or twice",()=>{
  const original=makeIncomingDemo(valid,[],now);
  const approved=approveIncomingDemo(original);
  assert.equal(approved.status,"Odobreno");
  assert.equal(original.status,"Pregled");
  assert.throws(()=>approveIncomingDemo(approved));
  assert.throws(()=>approveIncomingDemo({...original,demo:false}));
});
