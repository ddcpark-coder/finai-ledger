// Versioned, synthetic-only PDF rendition: embeds readable Slovenian glyphs.
// The image of a handwritten mark is NOT a cryptographic PDF signature.
import {PDFDocument,rgb} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {verifyDemoDelivery} from "./demoDeliveryProof.mjs";

export const DELIVERY_PDF_TEMPLATE_VERSION=2;
const cleanText=value=>String(value??"").normalize("NFC")
 .replace(/[\x00-\x1f\x7f]/g," ")
 .replace(/[^\u0020-\u024F\u2000-\u206F\u20AC]/gu,"?").slice(0,180);

function pngData(dataUrl){
 if(typeof dataUrl!=="string"||!dataUrl.startsWith("data:image/png;base64,"))
  throw new Error("Podpis ni ustrezna PNG slika.");
 const binary=atob(dataUrl.slice("data:image/png;base64,".length));
 return Uint8Array.from(binary,ch=>ch.charCodeAt(0));
}
async function localFont(subset){
 if(typeof window==="undefined")
  throw new Error("Testno okolje potrebuje lokalni vir licenčne Unicode pisave.");
 const path=subset==="extended"?"finai-noto-latin-ext.woff":"finai-noto-latin.woff";
 const response=await fetch("/fonts/"+path,{credentials:"same-origin",cache:"force-cache"});
 if(!response.ok)throw new Error("Paket ne vsebuje zahtevanih slovenskih PDF pisav.");
 return new Uint8Array(await response.arrayBuffer());
}
function drawUnicode(page,latin,extended,content,y,{x=48,size=11,heavy=false,color=rgb(.1,.16,.29)}={}){
 const text=cleanText(content);
 let cursor=x;
 let run="",runningFont=null;
 const flush=()=>{
  if(!run)return;
  const font=runningFont==="extended"?extended:latin;
  const width=font.widthOfTextAtSize(run,size);
  if(cursor+width>560)
   throw new Error("Besedilo presega dovoljeno širino demonstracijske dobavnice.");
  page.drawText(run,{x:cursor,y,size,font,color});
  if(heavy)page.drawText(run,{x:cursor+.25,y,size,font,color});
  cursor+=width;run="";
 };
 for(const char of text){
  const chosen=/[\u0100-\u024F]/u.test(char)?"extended":"latin";
  if(chosen!==runningFont){flush();runningFont=chosen;}
  run+=char;
 }
 flush();
}
export async function createDemoDeliveryPdf(evidence,companyId,{fontLoader=localFont}={}){
 if(!await verifyDemoDelivery(evidence,companyId))
  throw new Error("Dokazilo je spremenjeno ali ne pripada izbranemu podjetju.");
 const pdf=await PDFDocument.create();
 pdf.registerFontkit(fontkit);
 const [latinBytes,extBytes]=await Promise.all([fontLoader("latin"),fontLoader("extended")]);
 const latin=await pdf.embedFont(latinBytes,{subset:true});
 const extended=await pdf.embedFont(extBytes,{subset:true});
 pdf.setTitle("FinAI vzorčna dobavnica - "+evidence.documentId);
 pdf.setAuthor("FinAI demo (unsigned)");
 pdf.setSubject("Synthetic sample with visible signature image, NOT a digitally signed PDF");
 pdf.setProducer("FinAI synthetic PDF template v"+DELIVERY_PDF_TEMPLATE_VERSION);
 pdf.setKeywords(["finai-demo","template=v"+DELIVERY_PDF_TEMPLATE_VERSION,
  "proof="+evidence.evidenceSha256]);
 pdf.setCreationDate(new Date(evidence.signedAt));
 const page=pdf.addPage([595.28,841.89]);
 const dark=rgb(.1,.16,.29),mute=rgb(.34,.40,.51);
 const line=(text,y,options)=>drawUnicode(page,latin,extended,text,y,options);
 page.drawRectangle({x:0,y:804,width:595.28,height:38,color:rgb(.08,.14,.29)});
 line("FinAI / DEMONSTRACIJA – BREZ PRAVNEGA PODPISA",819,
  {x:47,size:11,heavy:true,color:rgb(1,1,1)});
 line("DOBAVNICA – lokalni vzorec",773,{size:21,heavy:true});
 line("Različica predloge: "+DELIVERY_PDF_TEMPLATE_VERSION,747,{size:9,color:mute});
 line("Dokument: "+evidence.documentId,729,{heavy:true});
 line("Prejemnik: "+evidence.document.recipient,710);
 line("Podjetje (vzorčni ID): "+companyId,689);
 line("Podpisnik: "+evidence.signer,667);
 line("Datum in čas (UTC): "+evidence.signedAt,647);
 line("Prevzete postavke",610,{size:13,heavy:true});
 let y=582;
 for(const item of evidence.document.lines){
  if(y<460)throw new Error("Preveč postavk za demonstracijski enostranski PDF.");
  line(item.description,y,{size:10});
  line(item.quantity+" "+item.unit,y,{x:440,size:10});
  y-=25;
 }
 line("Ročno narisan podpis (slika, ne digitalni PDF podpis):",424,{size:10,heavy:true});
 const image=await pdf.embedPng(pngData(evidence.signatureDataUrl));
 const dims=image.scaleToFit(240,105);
 page.drawRectangle({x:48,y:298,width:280,height:116,
  borderColor:rgb(.72,.76,.84),borderWidth:1});
 page.drawImage(image,{x:55,y:303+(105-dims.height)/2,width:dims.width,height:dims.height});
 line("SHA-256 zamrznjenega dokumenta:",268,{size:10,heavy:true});
 line(evidence.documentSha256,249,{size:8});
 line("SHA-256 dokaznega zapisa:",224,{size:10,heavy:true});
 line(evidence.evidenceSha256,205,{size:8});
 line("OPOZORILO: to je sintetičen PDF, ne kvalificiran e-podpis.",150,
  {size:10,heavy:true,color:rgb(.69,.19,.18)});
 line("Brez preverjene identitete, zaupanja vrednega časovnega žiga ali revizije.",129,{size:9,color:mute});
 line("Ni dovoljeno uporabljati za resnične poslovne transakcije.",111,{size:9,color:mute});
 const bytes=await pdf.save();
 if(!bytes?.length||String.fromCharCode(...bytes.slice(0,5))!=="%PDF-")
  throw new Error("Nastanek PDF dokumenta ni uspel.");
 return bytes;
}
