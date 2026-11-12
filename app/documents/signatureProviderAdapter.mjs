// Explicit seam for later eIDAS trust-provider integration.
// This module only packages verifiable *unsigned* synthetic PDFs locally.
import {DELIVERY_PDF_TEMPLATE_VERSION} from "./demoDeliveryPdf.mjs";
import {PDFDocument} from "pdf-lib";
import {verifyDemoDelivery} from "./demoDeliveryProof.mjs";

export const SIGNING_STATUS=Object.freeze({
 IMAGE_ONLY:"image-only-unsigned-demo",
 PROVIDER_UNCONFIGURED:"qualified-provider-not-configured"
});
export function trustedSignatureCapability(){
 return {
   available:false,mode:"qualified",status:SIGNING_STATUS.PROVIDER_UNCONFIGURED,
   reason:"Kvalificiran podpis potrebuje preverjenega ponudnika zaupanja, identiteto podpisnika in strežniško revizijo."
 };
}
async function validSyntheticPdf(pdfBytes,evidence){
 if(!(pdfBytes instanceof Uint8Array)||pdfBytes.length<1000||
    String.fromCharCode(...pdfBytes.slice(0,5))!=="%PDF-")
   throw new Error("Neveljavni podatki PDF.");
 let parsed;
 try{parsed=await PDFDocument.load(pdfBytes,{ignoreEncryption:false})}
 catch{throw new Error("Sintetični PDF ni berljiv ali je poškodovan.");}
 if(parsed.getPageCount()!==1||
   !String(parsed.getSubject()??"").includes("NOT a digitally signed PDF")||
   !String(parsed.getKeywords()??"").includes("template=v"+DELIVERY_PDF_TEMPLATE_VERSION)||
   !String(parsed.getKeywords()??"").includes("proof="+evidence.evidenceSha256))
   throw new Error("PDF ni ustrezna izvirna sintetična različica.");
}
async function hashPdf(pdfBytes){
 const hash=await crypto.subtle.digest("SHA-256",pdfBytes);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function createUnsignedPdfManifest(evidence,pdfBytes,companyId){
 if(!await verifyDemoDelivery(evidence,companyId))
   throw new Error("Neveljavno ali spremenjeno sintetično dokazilo.");
 await validSyntheticPdf(pdfBytes,evidence);
 return {
   format:"finai-unsigned-pdf-manifest-v1",
   companyId,documentId:evidence.documentId,pdfTemplateVersion:DELIVERY_PDF_TEMPLATE_VERSION,
   pdfSha256:await hashPdf(pdfBytes),
   evidenceSha256:evidence.evidenceSha256,
   signatureStatus:SIGNING_STATUS.IMAGE_ONLY,
   signatureProvider:null,qualified:false,demoOnly:true
 };
}

export async function verifyUnsignedPdfManifest(manifest,pdfBytes,evidence,companyId){
 if(!await verifyDemoDelivery(evidence,companyId))
  throw new Error("Dokazilo je bilo spremenjeno ali pripada drugemu podjetju.");
 if(!manifest||manifest.format!=="finai-unsigned-pdf-manifest-v1"||
   manifest.companyId!==companyId||
   manifest.documentId!==evidence.documentId||
   manifest.evidenceSha256!==evidence.evidenceSha256||
   manifest.pdfTemplateVersion!==DELIVERY_PDF_TEMPLATE_VERSION||
   manifest.signatureStatus!==SIGNING_STATUS.IMAGE_ONLY||
   manifest.signatureProvider!==null||
   manifest.qualified!==false||manifest.demoOnly!==true||
   !/^[a-f0-9]{64}$/.test(manifest.pdfSha256))
   throw new Error("Manifest ni veljaven ali napačno označuje status podpisa.");
 await validSyntheticPdf(pdfBytes,evidence);
 if(await hashPdf(pdfBytes)!==manifest.pdfSha256)
   throw new Error("PDF se ne ujema z dokaznim manifestom SHA-256.");
 return {
  valid:true,companyId,documentId:evidence.documentId,
  integrity:"sha256-match",qualified:false,cryptographicPdfSignature:false,
  demoOnly:true
 };
}
