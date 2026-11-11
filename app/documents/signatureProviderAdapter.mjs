// Explicit seam for later eIDAS trust-provider integration.
// This module only packages verifiable *unsigned* synthetic PDFs locally.
import {DELIVERY_PDF_TEMPLATE_VERSION} from "./demoDeliveryPdf.mjs";
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
export async function createUnsignedPdfManifest(evidence,pdfBytes,companyId){
 if(!await verifyDemoDelivery(evidence,companyId))
   throw new Error("Neveljavno ali spremenjeno sintetično dokazilo.");
 if(!(pdfBytes instanceof Uint8Array)||pdfBytes.length<1000||
    String.fromCharCode(...pdfBytes.slice(0,5))!=="%PDF-")
   throw new Error("Neveljavni podatki PDF.");
 const hash=await crypto.subtle.digest("SHA-256",pdfBytes);
 return {
   format:"finai-unsigned-pdf-manifest-v1",
   companyId,documentId:evidence.documentId,pdfTemplateVersion:DELIVERY_PDF_TEMPLATE_VERSION,
   pdfSha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join(""),
   evidenceSha256:evidence.evidenceSha256,
   signatureStatus:SIGNING_STATUS.IMAGE_ONLY,
   signatureProvider:null,qualified:false,demoOnly:true
 };
}
