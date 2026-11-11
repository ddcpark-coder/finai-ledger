import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {createDemoDeliveryPdf} from "../app/documents/demoDeliveryPdf.mjs";
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
const sample=async()=>finalizeDemoDelivery({
 companyId:1,document:deliverySample(1),signer:"Sinteticni prejemnik",
 signature:image,accepted:true,signedAt:new Date("2026-11-11T12:00:00Z")
});
test("unsigned synthetic receipt PDF is a readable, single-page valid PDF",async()=>{
 const proof=await sample();
 const bytes=await createDemoDeliveryPdf(proof,1);
 assert.ok(bytes.length>1000);
 assert.equal(new TextDecoder().decode(bytes.slice(0,5)),"%PDF-");
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),1);
 assert.match(pdf.getTitle(),/SYNTH-DOB-2026-0048/);
 assert.match(pdf.getSubject(),/not a legally signed/);
});
test("tampered evidence and foreign tenant cannot produce a PDF",async()=>{
 const proof=await sample();
 await assert.rejects(createDemoDeliveryPdf(proof,2),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,signer:"another signer"},1),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,document:{...proof.document,recipient:"other"}},1),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,signatureDataUrl:proof.signatureDataUrl+"A"},1),/spremenjeno/);
});
