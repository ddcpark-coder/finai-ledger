// Synthetic, session-only incoming invoice workflow; no OCR, file storage or ledger writes.
import {centsFromInput,euro,localDate} from "../issued/demoInvoice.mjs";

export function makeIncomingDemo(form,records,now=new Date()){
  const partner=String(form.partner??"").trim();
  const number=String(form.number??"").trim();
  if(partner.length<2||partner.length>120)throw new Error("Vnesi dobavitelja (2–120 znakov).");
  if(number.length<2||number.length>60)throw new Error("Vnesi številko računa (2–60 znakov).");
  if(records.some(r=>r.partner.trim().toLocaleLowerCase("sl-SI")===partner.toLocaleLowerCase("sl-SI")&&
    r.number.trim().toLocaleLowerCase("sl-SI")===number.toLocaleLowerCase("sl-SI")))
    throw new Error("Račun tega dobavitelja s to številko že obstaja v demonstraciji.");
  let cents;
  try{cents=centsFromInput(form.gross)}catch{throw new Error("Vnesi veljaven bruto znesek (0,01–999.999,99 €).");}
  const vat=String(form.vatRate);
  if(!["0","9.5","22"].includes(vat))throw new Error("Izberi prikazno stopnjo DDV.");
  const dueDays=Number(form.dueDays);
  if(![8,15,30].includes(dueDays))throw new Error("Izberi plačilni rok.");
  if(!(now instanceof Date)||Number.isNaN(now.getTime()))throw new Error("Neveljaven datum.");
  const nextId=records.reduce((max,row)=>{
    const hit=String(row.id).match(/^PR-DEMO-(\d{4})$/);
    return hit?Math.max(max,Number(hit[1])):max;
  },0)+1;
  if(nextId>9999)throw new Error("Dosežena je omejitev demonstracijskih računov.");
  const due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+dueDays);
  return {
    id:"PR-DEMO-"+String(nextId).padStart(4,"0"),partner,number,
    gross:euro(cents),grossCents:cents,
    date:localDate(now),due:localDate(due),
    status:"Pregled",ocr:0,ai:0,vat:vat.replace(".",",")+" %",account:"—",cost:"—",
    demo:true,source:"manual",approved:false
  };
}

export function approveIncomingDemo(invoice){
  if(!invoice?.demo||invoice.status!=="Pregled")
    throw new Error("Odobriti je mogoče samo neodobren demonstracijski račun.");
  return {...invoice,status:"Odobreno",approved:true};
}
