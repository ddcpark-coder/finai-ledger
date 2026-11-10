// Browser-only synthetic invoice helpers. No persistence, FURS, email or ledger writes.
const EUR = new Intl.NumberFormat("sl-SI", {style:"currency",currency:"EUR"});
const VAT_TENTHS = {"0":0,"9.5":95,"22":220};

export function centsFromInput(value){
  const raw=String(value??"").trim().replace(",",".");
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw))throw new Error("Vnesi veljaven neto znesek (največ dve decimalki).");
  const [whole,decimal=""]=raw.split(".");
  const cents=Number(whole)*100+Number(decimal.padEnd(2,"0"));
  if(!Number.isSafeInteger(cents)||cents<=0||cents>99_999_999)throw new Error("Znesek mora biti med 0,01 € in 999.999,99 €.");
  return cents;
}

export function euro(cents){
  if(!Number.isSafeInteger(cents))throw new Error("Neveljaven znesek.");
  return EUR.format(cents/100);
}

export function makeDraft(form, records){
  const partner=String(form.partner??"").trim();
  const description=String(form.description??"").trim();
  if(partner.length<2||partner.length>120)throw new Error("Vnesi naziv kupca (2–120 znakov).");
  if(description.length<3||description.length>180)throw new Error("Vnesi opis postavke (3–180 znakov).");
  const netCents=centsFromInput(form.net);
  const key=String(form.vatRate);
  if(!Object.hasOwn(VAT_TENTHS,key))throw new Error("Izberi prikazno stopnjo DDV.");
  const days=Number(form.dueDays);
  if(![8,15,30].includes(days))throw new Error("Izberi plačilni rok.");
  const taxCents=Math.round(netCents*VAT_TENTHS[key]/1000);
  const nextId=1+records.reduce((max,invoice)=>{
    const match=String(invoice.id).match(/^IR-DEMO-(\d{4})$/);
    return match?Math.max(max,Number(match[1])):max;
  },0);
  return {
    id:"IR-DEMO-"+String(nextId).padStart(4,"0"),
    number:"—", partner, description,
    net:euro(netCents),tax:euro(taxCents),gross:euro(netCents+taxCents),
    netCents,taxCents,grossCents:netCents+taxCents,
    vatRate:key,dueDays:days,
    issue:"—",due:"—",status:"Osnutek",delivery:"—",sent:false,paid:false,
    demo:true
  };
}

export function localDate(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))throw new Error("Neveljaven datum.");
  const n=value=>String(value).padStart(2,"0");
  return [n(date.getDate()),n(date.getMonth()+1),date.getFullYear()].join(". ")+"";
}

export function issueDraft(invoice,records,now=new Date()){
  if(!invoice||invoice.status!=="Osnutek")throw new Error("Izdati je mogoče samo osnutek.");
  if(!(now instanceof Date)||Number.isNaN(now.getTime()))throw new Error("Neveljaven datum.");
  const year=now.getFullYear();
  let highest=0;
  for(const row of records){
    const match=String(row.number).match(/^(?:DEMO-)?(\d{4})-(\d{4})$/);
    if(match&&Number(match[1])===year)highest=Math.max(highest,Number(match[2]));
  }
  if(highest>=9999)throw new Error("Preveč demonstracijskih računov za isto leto.");
  const dueDays=invoice.dueDays||15;
  const dueDate=new Date(year,now.getMonth(),now.getDate()+dueDays);
  return {...invoice, number:"DEMO-"+year+"-"+String(highest+1).padStart(4,"0"),
    issue:localDate(now),due:localDate(dueDate),status:"Izdano",demo:true};
}

export function simulateSending(invoice){
  if(!invoice||invoice.status!=="Izdano")throw new Error("Simulirano pošiljanje je mogoče samo za izdan račun.");
  return {...invoice,status:"Poslano",sent:true,delivery:"Simulacija · brez pošiljanja",demo:true};
}
