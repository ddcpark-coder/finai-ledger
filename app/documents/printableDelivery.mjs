import {verifyDemoDelivery} from "./demoDeliveryProof.mjs";

// Browser print-ready representation, NOT a digitally signed or qualified PDF.
export async function makePrintableDelivery(evidence,companyId){
 if(!(await verifyDemoDelivery(evidence,companyId)))
  throw new Error("Dokazilo ni veljavno za izbrano podjetje ali je bilo spremenjeno.");
 const doc=evidence.document;
 const date=new Date(evidence.signedAt);
 if(Number.isNaN(date.getTime()))throw new Error("Neveljaven čas podpisa.");
 return {
  companyId,documentId:doc.id,
  title:"DOBAVNICA – DEMONSTRACIJA",
  recipient:doc.recipient,
  signer:evidence.signer,
  signedAt:evidence.signedAt,
  signatureImage:evidence.signatureDataUrl,
  documentSha256:evidence.documentSha256,
  signatureSha256:evidence.signatureSha256,
  evidenceSha256:evidence.evidenceSha256,
  lines:doc.lines.map(line=>({...line})),
  disclaimer:"Samo sintetični podatki. Podpis, narisan na zaslonu, ni kvalificiran elektronski podpis. Izpis ali PDF ne predstavlja certificirane elektronsko podpisane listine."
 };
}
