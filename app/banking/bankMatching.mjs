// Deterministic, synthetic, company-scoped matching suggestions.
// No bank connection, real SEPA import, accounting posting or automatic confirmation.
export function assertBankCompany(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1)throw new Error("Neveljavno podjetje.");
}
export function referenceKey(text){
 return String(text??"").normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g,"");
}
function amount(tx){
 if(!Number.isSafeInteger(tx?.amountCents)||tx.amountCents===0)
   throw new Error("Transakcija nima veljavnega zneska.");
 return Math.abs(tx.amountCents);
}
function direction(tx){return tx.amountCents>0?"credit":"debit";}
export function suggestBankMatches(tx,openItems,confirmed,companyId){
 assertBankCompany(companyId);
 if(tx?.companyId!==companyId)throw new Error("Transakcija ni iz izbranega podjetja.");
 if(confirmed.some(x=>x.companyId===companyId&&x.transactionId===tx.id))return [];
 const sumCents=amount(tx);
 const bankRef=referenceKey(tx.reference);
 if(!bankRef||tx.currency!=="EUR")return [];
 return openItems.filter(item=>{
   if(item.companyId!==companyId||item.currency!==tx.currency||
      item.direction!==direction(tx))return false;
   const reference=referenceKey(item.reference);
   if(reference.length<5||!bankRef.includes(reference))return false;
   const used=confirmed.filter(row=>row.companyId===companyId&&row.itemId===item.id)
     .reduce((total,row)=>total+row.appliedCents,0);
   if(!Number.isSafeInteger(item.openCents)||item.openCents<1||used>=item.openCents)return false;
   const remaining=item.openCents-used;
   return sumCents<=remaining;
 }).map(item=>{
   const used=confirmed.filter(row=>row.companyId===companyId&&row.itemId===item.id)
     .reduce((total,row)=>total+row.appliedCents,0);
   const remaining=item.openCents-used;
   return {
     itemId:item.id,reference:item.reference,partner:item.partner,
     remainingCents:remaining,appliedCents:sumCents,
     kind:sumCents===remaining?"full":"partial",
     explanation:sumCents===remaining
       ?"Ujema se sklic, valuta, smer in znesek."
       :"Ujema se sklic, valuta in smer; znesek je nižji od odprte postavke.",
     needsHumanConfirmation:true
   };
 });
}
export function confirmBankMatch(tx,itemId,openItems,confirmed,companyId){
 const candidates=suggestBankMatches(tx,openItems,confirmed,companyId)
   .filter(x=>x.itemId===itemId);
 if(candidates.length!==1)
   throw new Error("Ujemanja ni mogoče potrditi: manjka varen in enoličen predlog.");
 const candidate=candidates[0];
 return [...confirmed,{
   companyId,transactionId:tx.id,itemId,appliedCents:candidate.appliedCents,
   partial:candidate.kind==="partial",status:"demo-confirmed"
 }];
}
export function resetCompanyBankMatches(confirmed,companyId){
 assertBankCompany(companyId);
 return confirmed.filter(x=>x.companyId!==companyId);
}
