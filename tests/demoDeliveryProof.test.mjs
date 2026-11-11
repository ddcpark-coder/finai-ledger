import test from "node:test";
import assert from "node:assert/strict";
import {deliverySample,finalizeDemoDelivery,verifyDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
const image="data:image/png;base64,"+"A".repeat(128);
const options={document:deliverySample(1),companyId:1,signer:"Vzorčni podpisnik",
 signature:image,accepted:true,signedAt:new Date("2026-11-11T10:00:00Z")};
test("creates verifiable company-scoped evidence with hashes, consent and timestamp",async()=>{
 const result=await finalizeDemoDelivery(options);
 assert.equal(result.format,"finai-synthetic-delivery-evidence-v1");
 assert.equal(result.companyId,1);
 assert.match(result.documentSha256,/^[a-f0-9]{64}$/);
 assert.match(result.signatureSha256,/^[a-f0-9]{64}$/);
 assert.match(result.evidenceSha256,/^[a-f0-9]{64}$/);
 assert.equal(result.signedAt,"2026-11-11T10:00:00.000Z");
 assert.equal(result.qualification,"uncertified-screen-drawing");
 assert.equal(await verifyDemoDelivery(result,1),true);
 assert.equal(await verifyDemoDelivery(result,2),false);
});
test("detects any after-signing change to signer, document or signature",async()=>{
 const p=await finalizeDemoDelivery(options);
 assert.equal(await verifyDemoDelivery({...p,signer:"Modified"},1),false);
 assert.equal(await verifyDemoDelivery({...p,signatureDataUrl:image+"A"},1),false);
 assert.equal(await verifyDemoDelivery({...p,document:{...p.document,recipient:"Another"}},1),false);
 assert.equal(await verifyDemoDelivery({...p,documentId:"SYNTH-DOB-OTHER"},1),false);
});
test("rejects cross-company documents, missing consent, blank signer and fake signatures",async()=>{
 await assert.rejects(finalizeDemoDelivery({...options,companyId:2}),/podjetju/);
 await assert.rejects(finalizeDemoDelivery({...options,accepted:false}),/potrdi/);
 await assert.rejects(finalizeDemoDelivery({...options,signer:""}),/ime/);
 await assert.rejects(finalizeDemoDelivery({...options,signature:"fake"}),/podpis/);
 await assert.rejects(finalizeDemoDelivery({...options,signedAt:new Date("invalid")}),/čas/);
 assert.notEqual(deliverySample(1).id,deliverySample(2).id);
});
test("receipt snapshot is returned by value and has isolated synthetic line items",()=>{
 const original=deliverySample(1);
 original.lines[0].quantity=999;
 assert.equal(deliverySample(1).lines[0].quantity,2);
 assert.throws(()=>deliverySample(0));
 assert.throws(()=>deliverySample("1"));
});
