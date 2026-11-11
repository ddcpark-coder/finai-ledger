// Offline-capable synthetic receipt evidence. Not a QES/eIDAS signature,
// not a certified audit log, not a legally validated delivery note or PDF.
const SAMPLE_DOCUMENTS=new Map([
  [1,{companyId:1,id:"SYNTH-DOB-2026-0048",recipient:"Sintetični kupec Alfa",lines:[
    {description:"Reklamna tabla 100 × 70 cm",quantity:2,unit:"kos"},
    {description:"Samolepilna folija",quantity:5,unit:"m²"}]}],
  [2,{companyId:2,id:"SYNTH-DOB-2026-B001",recipient:"Sintetični kupec Beta",lines:[
    {description:"Vzorčni izdelek",quantity:1,unit:"kos"}]}],
  [3,{companyId:3,id:"SYNTH-DOB-2026-C001",recipient:"Sintetični kupec Gama",lines:[
    {description:"Demonstracijska storitev",quantity:2,unit:"kos"}]}]
]);
export function deliverySample(companyId){
 if(!Number.isSafeInteger(companyId)||!SAMPLE_DOCUMENTS.has(companyId))
  throw new Error("Neveljavno demonstracijsko podjetje.");
 return structuredClone(SAMPLE_DOCUMENTS.get(companyId));
}
function canonicalDocument(doc,companyId){
 const expected=deliverySample(companyId);
 if(!doc||doc.companyId!==companyId||JSON.stringify(doc)!==JSON.stringify(expected))
  throw new Error("Dokument ne pripada izbranemu podjetju ali je bil spremenjen.");
 return expected;
}
async function digest(value){
 if(!globalThis.crypto?.subtle)throw new Error("Varni izračun SHA-256 ni na voljo v tem brskalniku.");
 const bytes=new TextEncoder().encode(value);
 const hash=await globalThis.crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,"0")).join("");
}
function validateSignature(signature){
 if(typeof signature!=="string"||signature.length<120||signature.length>650000||
  !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature))
  throw new Error("Zajemi veljaven demonstracijski podpis na zaslonu.");
}
export async function finalizeDemoDelivery({document,companyId,signer,signature,accepted,signedAt=new Date()}){
 const doc=canonicalDocument(document,companyId);
 const name=String(signer??"").trim().replace(/\s+/g," ");
 if(name.length<2||name.length>120)throw new Error("Vnesi ime in priimek podpisnika.");
 if(accepted!==true)throw new Error("Pred zaključkom potrdi besedilo prevzema.");
 validateSignature(signature);
 if(!(signedAt instanceof Date)||Number.isNaN(signedAt.getTime()))
  throw new Error("Neveljaven čas podpisovanja.");
 const documentSha256=await digest(JSON.stringify(doc));
 const signatureSha256=await digest(signature);
 const metadata={
  format:"finai-synthetic-delivery-evidence-v1",
  companyId,documentId:doc.id,documentSha256,
  signer:name,signedAt:signedAt.toISOString(),accepted:true,
  signatureSha256,qualification:"uncertified-screen-drawing"
 };
 const evidenceSha256=await digest(JSON.stringify(metadata));
 return {...metadata,evidenceSha256,document:doc,signatureDataUrl:signature,demoOnly:true};
}
export async function verifyDemoDelivery(evidence,companyId){
 if(!evidence||evidence.companyId!==companyId||evidence.demoOnly!==true)return false;
 try{
  canonicalDocument(evidence.document,companyId);
  validateSignature(evidence.signatureDataUrl);
  const {document,signatureDataUrl,demoOnly,evidenceSha256,...metadata}=evidence;
  if(metadata.format!=="finai-synthetic-delivery-evidence-v1"||
    metadata.qualification!=="uncertified-screen-drawing"||metadata.accepted!==true)return false;
  return (await digest(JSON.stringify(document)))===metadata.documentSha256
    &&(await digest(signatureDataUrl))===metadata.signatureSha256
    &&(await digest(JSON.stringify(metadata)))===evidenceSha256;
 }catch{return false}
}
