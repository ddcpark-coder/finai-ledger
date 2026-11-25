import test from "node:test";
import assert from "node:assert/strict";
import {demoPartnerId,createDemoPartner,updateDemoPartner,validateDemoPartner} from "../app/partners/demoPartners.mjs";

test("partner demo identifiers and input validation",()=>{
  assert.equal(demoPartnerId(2,1),"SYN-PART-2-001");
  assert.deepEqual(validateDemoPartner({name:"  Primer  ",email:" demo@example.test "}),
    {name:"Primer",email:"demo@example.test"});
  assert.throws(()=>validateDemoPartner({name:"X",email:"n/a"}),/Naziv/);
  assert.throws(()=>validateDemoPartner({name:"Primer",email:"n/a"}),/e-naslov/);
});

test("creation and edit remain scoped to the selected synthetic company",()=>{
  const first=createDemoPartner([],2,{name:"Demo Partner",email:"first@example.test"});
  assert.equal(first.partner.companyId,2);
  assert.equal(first.partner.tax,"SYN-PART-2-001");
  assert.equal(first.records.length,1);
  const updated=updateDemoPartner(first.records,2,first.partner.tax,
    {name:"Spremenjen demo",email:""});
  assert.equal(updated[0].name,"Spremenjen demo");
  assert.equal(first.records[0].name,"Demo Partner");
  assert.throws(()=>updateDemoPartner(first.records,1,first.partner.tax,{name:"Tuji partner"}),/izbranem/);
  assert.throws(()=>createDemoPartner(first.records,1,{name:"Tuji partner"}),/drugih podjetij/);
});
