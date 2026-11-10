// Deterministic EXAMPLE rules; not AI inference, production policy, or account validation.
const RULES={
  1:{
    "merkur d.o.o.":{account:"4100",costCenter:"PROD",reason:"Demonstracijsko pravilo za dobavitelja Merkur v podjetju 1."},
    "petrol d.d.":{account:"4070",costCenter:"UPRAVA",reason:"Demonstracijsko pravilo za dobavitelja Petrol v podjetju 1."}
  },
  2:{
    "testni dobavitelj b":{account:"4100",costCenter:"TEST",reason:"Demonstracijsko pravilo podjetja 2."}
  },
  3:{
    "vzorčni dobavitelj c":{account:"4100",costCenter:"TEST",reason:"Demonstracijsko pravilo podjetja 3."}
  }
};
function safeCompany(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1)throw new Error("Neveljavno podjetje.");
}
export function getDemoAccountSuggestion(invoice,companyId){
 safeCompany(companyId);
 if(!invoice||invoice.companyId!==companyId)return null;
 const partner=String(invoice.partner??"").trim().toLocaleLowerCase("sl-SI");
 const rule=RULES[companyId]?.[partner];
 if(!rule)return null;
 return {
   ...rule,companyId,invoiceId:invoice.id,source:"fixed-synthetic-rule",
   isAiGenerated:false,hasBeenPosted:false,
   explanation:rule.reason+" Predlog ni davčno ali računovodsko preverjen; pred uporabo v poslovanju ga mora pregledati pooblaščena oseba."
 };
}
export function recordDemoRuleChoice(suggestion,action,companyId){
 safeCompany(companyId);
 if(!suggestion||suggestion.companyId!==companyId||suggestion.source!=="fixed-synthetic-rule")
   throw new Error("Predlog ne pripada izbranemu podjetju.");
 if(!["accepted","rejected"].includes(action))
   throw new Error("Neveljavna izbira.");
 return {companyId,invoiceId:suggestion.invoiceId,action,posted:false,persisted:false,aiTraining:false};
}
