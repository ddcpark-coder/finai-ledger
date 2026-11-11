// Creates only a synthetic, unsigned PDF rendition of an already-verified
// browser-only delivery receipt. Signature is a picture, NOT a PDF digital signature.
import {PDFDocument, StandardFonts, rgb} from "pdf-lib";
import {verifyDemoDelivery} from "./demoDeliveryProof.mjs";

const safeText=value=>String(value??"").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/đ/g,"d").replace(/Đ/g,"D").replace(/ł/g,"l")
  .replace(/[^\x20-\x7e]/g,"?").slice(0,180);
function pngData(dataUrl){
 if(typeof dataUrl!=="string"||!dataUrl.startsWith("data:image/png;base64,"))
  throw new Error("Podpis ni ustrezna PNG slika.");
 const binary=atob(dataUrl.slice("data:image/png;base64,".length));
 return Uint8Array.from(binary,ch=>ch.charCodeAt(0));
}
export async function createDemoDeliveryPdf(evidence,companyId){
 if(!await verifyDemoDelivery(evidence,companyId))
  throw new Error("Dokazilo je spremenjeno ali ne pripada izbranemu podjetju.");
 const pdf=await PDFDocument.create();
 pdf.setTitle("FinAI synthetic delivery receipt - "+evidence.documentId);
 pdf.setAuthor("FinAI demo (unsigned)");
 pdf.setSubject("Synthetic example - not a legally signed delivery document");
 const page=pdf.addPage([595.28,841.89]);
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const dark=rgb(0.10,0.16,0.29),mute=rgb(0.34,0.40,0.51);
 const line=(text,y,{x=48,size=11,heavy=false,color=dark}={})=>
  page.drawText(safeText(text),{x,y,size,font:heavy?bold:font,color,maxWidth:500});
 page.drawRectangle({x:0,y:804,width:595.28,height:38,color:rgb(.08,.14,.29)});
 line("FinAI  /  DEMONSTRACIJA - BREZ PRAVNEGA PODPISA",819,
  {x:47,size:12,heavy:true,color:rgb(1,1,1)});
 line("DOBAVNICA - lokalni primer",773,{size:21,heavy:true});
 line("Dokument: "+evidence.documentId,738,{heavy:true});
 line("Prejemnik: "+evidence.document.recipient,714);
 line("Podjetje (vzorcen ID): "+companyId,692);
 line("Podpisnik: "+evidence.signer,670);
 line("Datum in cas (UTC): "+evidence.signedAt,648);
 line("Prevzete postavke",610,{size:13,heavy:true});
 let y=582;
 for(const item of evidence.document.lines){
  if(y<460)throw new Error("Prevec postavk za vzorcni enostranski PDF.");
  line(item.description,y,{size:10});
  line(item.quantity+" "+item.unit,y,{x:440,size:10});
  y-=25;
 }
 line("Rocno narisan podpis (slika, ne digitalni PDF podpis):",424,{size:10,heavy:true});
 const image=await pdf.embedPng(pngData(evidence.signatureDataUrl));
 const dims=image.scaleToFit(240,105);
 page.drawRectangle({x:48,y:298,width:280,height:116,
  borderColor:rgb(.72,.76,.84),borderWidth:1});
 page.drawImage(image,{x:55,y:303+(105-dims.height)/2,width:dims.width,height:dims.height});
 line("SHA-256 zamrznjenega dokumenta:",268,{size:10,heavy:true});
 line(evidence.documentSha256,249,{size:8});
 line("SHA-256 dokaznega zapisa:",224,{size:10,heavy:true});
 line(evidence.evidenceSha256,205,{size:8});
 line("OPOZORILO: to je sinteticen PDF in ne kvalificiran e-podpis.",150,
  {size:11,heavy:true,color:rgb(.69,.19,.18)});
 line("Brez preverjene identitete, zaupanja vrednega casovnega ziga ali strezniske revizije.",129,{size:9,color:mute});
 line("Ne uporabljaj za resnicne poslovne transakcije. Dokument je ustvarjen lokalno.",111,{size:9,color:mute});
 const bytes=await pdf.save();
 if(!bytes?.length||String.fromCharCode(...bytes.slice(0,5))!=="%PDF-")
  throw new Error("Nastanek PDF dokumenta ni uspel.");
 return bytes;
}
