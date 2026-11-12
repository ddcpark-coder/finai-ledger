import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {
 createUnsignedPdfManifest,verifyUnsignedPdfManifest,
 trustedSignatureCapability,SIGNING_STATUS
} from "../app/documents/signatureProviderAdapter.mjs";

const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
const sample=async()=>finalizeDemoDelivery({
 companyId:1,document:deliverySample(1),signer:"Sintetični podpisnik",
 signature,accepted:true,signedAt:new Date("2026-11-12T09:00:00Z")
});
async function fakeDemoPdf(proof){
 const pdf=await PDFDocument.create();
 pdf.addPage([595,842]);
 pdf.setSubject("Synthetic sample with visible signature image, NOT a digitally signed PDF");
 pdf.setKeywords(["finai-demo","template=v2","proof="+proof.evidenceSha256]);
 return pdf.save();
}
test("unsigned local PDF is tenant-bound and has a truthful, valid SHA256 manifest",async()=>{
 const proof=await sample();
 const bytes=await fakeDemoPdf(proof);
 const manifest=await createUnsignedPdfManifest(proof,bytes,1);
 assert.equal(manifest.pdfTemplateVersion,2);
 assert.equal(manifest.companyId,1);
 assert.equal(manifest.evidenceSha256,proof.evidenceSha256);
 assert.match(manifest.pdfSha256,/^[a-f0-9]{64}$/);
 assert.equal(manifest.qualified,false);
 assert.equal(manifest.signatureProvider,null);
 assert.equal(manifest.signatureStatus,SIGNING_STATUS.IMAGE_ONLY);
 assert.equal(trustedSignatureCapability().available,false);
 const verification=await verifyUnsignedPdfManifest(manifest,bytes,proof,1);
 assert.deepEqual(verification,{
  valid:true,companyId:1,documentId:proof.documentId,
  integrity:"sha256-match",qualified:false,
  cryptographicPdfSignature:false,demoOnly:true
 });
});
test("changed PDF bytes, copied manifests, wrong tenants and claims of QES are rejected",async()=>{
 const proof=await sample();
 const bytes=await fakeDemoPdf(proof);
 const manifest=await createUnsignedPdfManifest(proof,bytes,1);
 await assert.rejects(createUnsignedPdfManifest(proof,bytes,2),/spremenjeno/);
 await assert.rejects(createUnsignedPdfManifest(proof,new Uint8Array([1,2,3]),1),/PDF/);
 await assert.rejects(verifyUnsignedPdfManifest(manifest,bytes,proof,2),/spremenjeno/);
 await assert.rejects(verifyUnsignedPdfManifest({...manifest,qualified:true},bytes,proof,1),/Manifest/);
 await assert.rejects(verifyUnsignedPdfManifest({...manifest,signatureProvider:"some-provider"},bytes,proof,1),/Manifest/);
 const tampered=bytes.slice();
 tampered[tampered.length-40]^=1;
 await assert.rejects(verifyUnsignedPdfManifest(manifest,tampered,proof,1),/PDF|poškodovan|ne ujema/);
 const unrelated=await PDFDocument.create();
 unrelated.addPage([595,842]);
 const other=await unrelated.save();
 await assert.rejects(verifyUnsignedPdfManifest(manifest,other,proof,1),/PDF/);
});
