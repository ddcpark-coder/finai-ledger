// Pure, explainable synthetic workflow. No accounting, PDF, inventory, email or FURS side effects.
export const DEMO_FLOW_STAGES=Object.freeze({
 draft:{label:"Osnutek demo ponudbe",next:"send_quote"},
 quoted:{label:"Ponudba pripravljena (demo)",next:"accept_quote"},
 accepted:{label:"Ponudba sprejeta (demo)",next:"create_order"},
 ordered:{label:"Naročilo ustvarjeno (demo)",next:"confirm_delivery"},
 delivered:{label:"Dobavnica potrjena (demo)",next:"prepare_invoice"},
 invoiced:{label:"Demo račun pripravljen, plačilo še ni potrjeno",next:"record_payment"},
 paid:{label:"Demo plačilo potrjeno",next:null}
});
export const DEMO_FLOW_ACTIONS=Object.freeze({
 send_quote:{from:"draft",to:"quoted",module:"quotes",label:"Simuliraj pripravo ponudbe"},
 accept_quote:{from:"quoted",to:"accepted",module:"orders",label:"Potrdi sprejem demo ponudbe"},
 create_order:{from:"accepted",to:"ordered",module:"orders",label:"Ustvari demo naročilo"},
 confirm_delivery:{from:"ordered",to:"delivered",module:"documents",label:"Potrdi demo dobavnico"},
 prepare_invoice:{from:"delivered",to:"invoiced",module:"issued_invoices",label:"Simuliraj pripravo računa"},
 record_payment:{from:"invoiced",to:"paid",module:"banking",label:"Potrdi sintetično plačilo"}
});
const PARTNERS={
 1:{name:"Sintetični kupec Alfa",grossCents:122000},
 2:{name:"Sintetični kupec Beta",grossCents:85000},
 3:{name:"Sintetični kupec Gama",grossCents:150000}
};
export function demoFlowKey(companyId){
 if(!Number.isSafeInteger(companyId)||!Object.hasOwn(PARTNERS,companyId))
   throw new Error("Neveljavno demonstracijsko podjetje.");
 return "finai:commercial-flow:synthetic-user:company-"+companyId;
}
export function createDemoCommercialFlow(companyId){
 demoFlowKey(companyId);
 return {
  id:"SYN-CHAIN-"+companyId+"-001",companyId,partner:PARTNERS[companyId].name,
  grossCents:PARTNERS[companyId].grossCents,currency:"EUR",
  stage:"draft",history:[]
 };
}
export function transitionDemoCommercialFlow(flow,action,companyId){
 demoFlowKey(companyId);
 const rule=Object.hasOwn(DEMO_FLOW_ACTIONS,action)?DEMO_FLOW_ACTIONS[action]:null;
 if(!flow||flow.companyId!==companyId||!rule||flow.stage!==rule.from)
   throw new Error("Prehod ni dovoljen v izbranem podjetju ali statusu.");
 return {
  ...flow,stage:rule.to,
  history:[...flow.history,{action,from:rule.from,to:rule.to}]
 };
}
export function restoreDemoCommercialFlow(raw,companyId){
 demoFlowKey(companyId);
 if(raw==null)return null;
 if(raw.companyId!==companyId||raw.id!=="SYN-CHAIN-"+companyId+"-001"||
    !Array.isArray(raw.history)||raw.history.length>6)return null;
 let next=createDemoCommercialFlow(companyId);
 try{
  for(const step of raw.history){
   if(!step||!Object.hasOwn(DEMO_FLOW_ACTIONS,step.action))return null;
   const rule=DEMO_FLOW_ACTIONS[step.action];
   if(step.from!==rule.from||step.to!==rule.to)return null;
   next=transitionDemoCommercialFlow(next,step.action,companyId);
  }
 }catch{return null}
 return raw.stage===next.stage?next:null;
}
export function upcomingFlowAction(flow){
 if(!flow)return {action:"create",module:"quotes",label:"Ustvari demo ponudbo"};
 const code=DEMO_FLOW_STAGES[flow.stage]?.next;
 return code?{action:code,...DEMO_FLOW_ACTIONS[code]}:null;
}
