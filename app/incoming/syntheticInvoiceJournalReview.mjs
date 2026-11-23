// NEXT34 — browser-only human-reviewed SYNTHETIC incoming invoice journal.
// No API, accounting posting, persisted audit, tax reporting or inference.
// Independent from the real-schema local Laravel NEXT29 review service.
const ACCOUNTS = [
  {code:"4100",title:"Demonstracijski materialni stroški"},
  {code:"4070",title:"Demonstracijski stroški storitev"}
];
export const REVIEW_ACCOUNTS=Object.freeze(ACCOUNTS.map(row=>Object.freeze(row)));

const VAT_RATES=Object.freeze({"0 %":0,"9,5 %":95,"22 %":220});

function requireSynthetic(invoice,companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1||companyId>3||
   !invoice||invoice.demo!==true||invoice.source!=="manual"||
   invoice.companyId!==companyId||
   !new RegExp("^PR-DEMO-"+companyId+"-[0-9]{4}$").test(invoice.id)||
   invoice.status!=="Odobreno"||invoice.approved!==true)
  throw new Error("Za predogled mora biti račun najprej ročno odobren v izbranem demo podjetju.");
 if(!Number.isSafeInteger(invoice.grossCents)||
   invoice.grossCents<1||invoice.grossCents>99999999)
  throw new Error("Vneseni demonstracijski bruto znesek ni veljaven.");
 if(!Object.hasOwn(VAT_RATES,invoice.vat))
  throw new Error("Nepodprta prikazna stopnja DDV za testni predogled.");
 return VAT_RATES[invoice.vat];
}

/**
 * Strict synthetic-only example. The illustrative tax split is intentionally
 * NOT a legally validated VAT calculation; cents are balanced deterministically.
 * No "posted" status or actual journal identifier is returned.
 */
export function reviewSyntheticIncomingJournal(invoice,companyId,{account,confirmed}={}){
 const rate=requireSynthetic(invoice,companyId);
 if(confirmed!==true)
  throw new Error("Pred pregledom potrdi ročno izbiro demo konta.");
 if(!REVIEW_ACCOUNTS.some(row=>row.code===account))
  throw new Error("Izbrani sintetični stroškovni konto ni dovoljen.");

 const gross=invoice.grossCents;
 const net=Math.round(gross*1000/(1000+rate));
 const vat=gross-net;
 const lines=[
   {accountCode:account,side:"debit",debitCents:net,creditCents:0},
   ...(vat>0?[{accountCode:"2601",side:"debit",debitCents:vat,creditCents:0}]:[]),
   {accountCode:"2200",side:"credit",debitCents:0,creditCents:gross}
 ];
 const totalDebitCents=lines.reduce((sum,row)=>sum+row.debitCents,0);
 const totalCreditCents=lines.reduce((sum,row)=>sum+row.creditCents,0);
 if(totalDebitCents!==totalCreditCents||totalCreditCents!==gross)
  throw new Error("Demo temeljnica ni uravnotežena.");

 return Object.freeze({
  mode:"synthetic-browser-invoice-journal-v1",
  companyId,invoiceId:invoice.id,reference:invoice.number,
  selectedAccount:account,vatLabel:invoice.vat,
  currency:"EUR",totalDebitCents,totalCreditCents,
  lines:Object.freeze(lines.map(line=>Object.freeze(line))),
  journalSaved:false,accountingPosted:false,postingAllowed:false,
  vatIsIllustrative:true,serverVerified:false,auditPersisted:false
 });
}
