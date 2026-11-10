import test from "node:test";
import assert from "node:assert/strict";
import {checkEInvoiceReadiness,E_INVOICE_PROFILES} from "../app/issued/eInvoiceReadiness.mjs";

const supplier={name:"Sintetični izdajatelj",taxNumber:"SI12345678"};
const input={
 partner:"Sintetični kupec",partnerTaxNumber:"SI87654321",
 number:"2026-0001",issue:"2026-11-11",due:"2026-11-26",
 description:"Testne grafične storitve",currency:"EUR",
 netCents:100000,taxCents:22000,grossCents:122000
};
test("metadata preflight is never mistaken for certified e-invoice readiness",()=>{
 for(const profile of Object.keys(E_INVOICE_PROFILES)){
  const result=checkEInvoiceReadiness(input,supplier,profile);
  assert.equal(result.metadataComplete,true);
  assert.deepEqual(result.blockers,[]);
  assert.equal(result.productionReady,false);
  assert.match(result.explanation,/ne pa/);
 }
});
test("requires identifying invoice data, tax IDs and integer arithmetic",()=>{
 const result=checkEInvoiceReadiness({
  ...input,number:"DEMO-2026-0001",partnerTaxNumber:"",grossCents:122001,
  issue:"—",description:""
 },supplier);
 assert.equal(result.metadataComplete,false);
 assert.ok(result.blockers.length>=5);
 assert.ok(result.blockers.some(x=>x.includes("DEMO")));
 assert.ok(result.blockers.some(x=>x.includes("centih")));
});
test("invalid profile is rejected and plain demo fixture stays incomplete",()=>{
 assert.throws(()=>checkEInvoiceReadiness(input,supplier,"unsafe"),/profil/);
 assert.equal(checkEInvoiceReadiness({partner:"Kupec"},supplier).metadataComplete,false);
});
