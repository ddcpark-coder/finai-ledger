import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {readFile} from "node:fs/promises";
const fontLoader=async subset=>readFile(
 new URL("../node_modules/@fontsource/noto-sans/files/noto-sans-"+(subset==="extended"?"latin-ext":"latin")+"-400-normal.woff",import.meta.url)
);
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {createDemoDeliveryPdf,DELIVERY_PDF_TEMPLATE_VERSION} from "../app/documents/demoDeliveryPdf.mjs";
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
const sample=async()=>finalizeDemoDelivery({
 companyId:1,document:deliverySample(1),signer:"Sinteticni prejemnik",
 signature:image,accepted:true,signedAt:new Date("2026-11-11T12:00:00Z")
});
test("unsigned synthetic receipt PDF is a readable, single-page valid PDF",async()=>{
 const proof=await sample();
 const bytes=await createDemoDeliveryPdf(proof,1,{fontLoader});
 assert.ok(bytes.length>1000);
 assert.equal(new TextDecoder().decode(bytes.slice(0,5)),"%PDF-");
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),1);
 assert.match(pdf.getTitle(),/SYNTH-DOB-2026-0048/);
 assert.match(pdf.getSubject(),/NOT a digitally signed/);
 assert.match(pdf.getProducer(),/template v2/);
 assert.equal(DELIVERY_PDF_TEMPLATE_VERSION,2);
});
test("tampered evidence and foreign tenant cannot produce a PDF",async()=>{
 const proof=await sample();
 await assert.rejects(createDemoDeliveryPdf(proof,2,{fontLoader}),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,signer:"another signer"},1,{fontLoader}),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,document:{...proof.document,recipient:"other"}},1,{fontLoader}),/spremenjeno/);
 await assert.rejects(createDemoDeliveryPdf({...proof,signatureDataUrl:proof.signatureDataUrl+"A"},1,{fontLoader}),/spremenjeno/);
});
