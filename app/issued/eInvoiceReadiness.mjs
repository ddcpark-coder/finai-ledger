// Educational metadata preflight only. NOT eSLOG/EN16931/PEPPOL schema validation,
// e-invoicing certification, transmission or fiscal reporting.
export const E_INVOICE_PROFILES=Object.freeze({
  eslog:"eSLOG – priprava metapodatkov",
  en16931:"EN 16931 / PEPPOL – priprava metapodatkov"
});

const dateLike=value=>typeof value==="string"&&(
  /^\d{4}-\d{2}-\d{2}$/.test(value)||
  /^\d{2}\.\s*\d{2}\.\s*\d{4}$/.test(value)
);

export function checkEInvoiceReadiness(invoice,supplier,profile="eslog"){
 if(!Object.hasOwn(E_INVOICE_PROFILES,profile))
   throw new Error("Neznan profil priprave e-računa.");
 const blockers=[];
 const requireField=(condition,message)=>{if(!condition)blockers.push(message);};
 requireField(typeof supplier?.name==="string"&&supplier.name.trim().length>1,
   "Manjka naziv izdajatelja.");
 requireField(typeof supplier?.taxNumber==="string"&&supplier.taxNumber.trim().length>=8,
   "Manjka preverjena davčna številka izdajatelja.");
 requireField(typeof invoice?.partner==="string"&&invoice.partner.trim().length>1,
   "Manjka naziv kupca.");
 requireField(typeof invoice?.partnerTaxNumber==="string"&&invoice.partnerTaxNumber.trim().length>=8,
   "Manjka davčna ali ustrezna identifikacija kupca.");
 requireField(typeof invoice?.number==="string"&&invoice.number!=="—"&&!/^DEMO-/i.test(invoice.number),
   "Manjka dejanska številka računa; DEMO številka ni primerna.");
 requireField(dateLike(invoice?.issue),"Manjka veljaven datum izdaje.");
 requireField(dateLike(invoice?.due),"Manjka datum zapadlosti.");
 requireField(typeof invoice?.description==="string"&&invoice.description.trim().length>=3,
   "Manjka strukturirana postavka.");
 requireField(invoice?.currency==="EUR","Valuta ni potrjena kot ISO EUR.");
 const n=invoice?.netCents,t=invoice?.taxCents,g=invoice?.grossCents;
 requireField([n,t,g].every(Number.isSafeInteger)&&n>=0&&t>=0&&g>0&&n+t===g,
   "Zneski postavk in DDV niso preverjeni v centih.");
 return {
   profile,label:E_INVOICE_PROFILES[profile],metadataComplete:blockers.length===0,
   blockers,
   productionReady:false,
   explanation:"Preverjene so le osnovne podatkovne zahteve, ne pa eSLOG/EN 16931 shema, davčna pravila, e-podpis ali dostava."
 };
}
