import test from "node:test";
import assert from "node:assert/strict";
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {createUnsignedPdfManifest,trustedSignatureCapability,SIGNING_STATUS} from "../app/documents/signatureProviderAdapter.mjs";
const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
test("unsigned PDF manifest is bound to tenant and evidence; no qualified signature claims",async()=>{
 const proof=await finalizeDemoDelivery({
  companyId:1,document:deliverySample(1),signer:"Vzorčna oseba",
  signature,accepted:true,signedAt:new Date("2026-11-11T12:00:00Z")
 });
 const bytes=new Uint8Array(2000);bytes.set(new TextEncoder().encode("%PDF-"));
 const manifest=await createUnsignedPdfManifest(proof,bytes,1);
 assert.equal(manifest.pdfTemplateVersion,2);
 assert.equal(manifest.companyId,1);
 assert.equal(manifest.evidenceSha256,proof.evidenceSha256);
 assert.match(manifest.pdfSha256,/^[0-9a-f]{64}$/);
 assert.equal(manifest.qualified,false);
 assert.equal(manifest.signatureProvider,null);
 assert.equal(manifest.signatureStatus,SIGNING_STATUS.IMAGE_ONLY);
 assert.equal(trustedSignatureCapability().available,false);
 await assert.rejects(createUnsignedPdfManifest(proof,bytes,2),/spremenjeno/);
 await assert.rejects(createUnsignedPdfManifest(proof,new Uint8Array([1,2,3]),1),/PDF/);
});
