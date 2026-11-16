import test from "node:test";
import assert from "node:assert/strict";
import {finalizeDemoDelivery,deliverySample} from "../app/documents/demoDeliveryProof.mjs";
import {makePrintableDelivery} from "../app/documents/printableDelivery.mjs";
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
async function sample(){
 return finalizeDemoDelivery({
  document:deliverySample(1),companyId:1,signer:"Vzorčna prejemnica",
  signature:image,accepted:true,signedAt:new Date("2026-11-11T12:30:00Z")
 });
}
test("prepares complete, clearly non-qualified print view of unaltered delivery evidence",async()=>{
 const proof=await sample();
 const print=await makePrintableDelivery(proof,1);
 assert.equal(print.documentId,"SYNTH-DOB-2026-0048");
 assert.equal(print.lines.length,2);
 assert.equal(print.signer,"Vzorčna prejemnica");
 assert.equal(print.documentSha256,proof.documentSha256);
 assert.equal(print.evidenceSha256,proof.evidenceSha256);
 assert.match(print.disclaimer,/ni kvalificiran elektronski podpis/);
 assert.ok(print.signatureImage.startsWith("data:image/png;base64,"));
});
test("rejects cross-company or tampered proof before any print representation",async()=>{
 const proof=await sample();
 await assert.rejects(makePrintableDelivery(proof,2),/ni veljavno/);
 await assert.rejects(makePrintableDelivery({...proof,signer:"Spremenjen"},1),/ni veljavno/);
 await assert.rejects(makePrintableDelivery({...proof,document:{...proof.document,lines:[]}},1),/ni veljavno/);
 await assert.rejects(makePrintableDelivery({...proof,evidenceSha256:"00"},1),/ni veljavno/);
});
