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
 1:{name:"Sintetični kupec Alfa",grossCents:122000,sku:"TAB-10070",stock:12,quantity:3},
 2:{name:"Sintetični kupec Beta",grossCents:85000,sku:"PM-200",stock:18,quantity:2},
 3:{name:"Sintetični kupec Gama",grossCents:150000,sku:"KC-100",stock:42,quantity:4}
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
  stage:"draft",history:[],
  inventory:{sku:PARTNERS[companyId].sku,required:PARTNERS[companyId].quantity,
   starting:PARTNERS[companyId].stock,onHand:PARTNERS[companyId].stock,
   reserved:0,dispatched:0}
 };
}
export function transitionDemoCommercialFlow(flow,action,companyId){
 demoFlowKey(companyId);
 const rule=Object.hasOwn(DEMO_FLOW_ACTIONS,action)?DEMO_FLOW_ACTIONS[action]:null;
 if(!flow||flow.companyId!==companyId||!rule||flow.stage!==rule.from)
   throw new Error("Prehod ni dovoljen v izbranem podjetju ali statusu.");
 const inventory={...flow.inventory};
 if(!inventory||inventory.sku!==PARTNERS[companyId].sku||
   !Number.isSafeInteger(inventory.onHand)||inventory.onHand<0||
   !Number.isSafeInteger(inventory.reserved)||inventory.reserved<0||
   !Number.isSafeInteger(inventory.dispatched)||inventory.dispatched<0)
   throw new Error("Neveljavno sintetično stanje zalog.");
 let stockChange=null;
 if(action==="create_order"){
   if(inventory.onHand-inventory.reserved<inventory.required)
     throw new Error("Ni dovolj sintetične zaloge za naročilo.");
   inventory.reserved+=inventory.required;
   stockChange={sku:inventory.sku,type:"reservation",onHandDelta:0,
    reservedDelta:inventory.required};
 }
 if(action==="confirm_delivery"){
   if(inventory.reserved<inventory.required||inventory.onHand<inventory.required)
     throw new Error("Sintetične dobavnice brez rezervacije ni mogoče potrditi.");
   inventory.reserved-=inventory.required;
   inventory.onHand-=inventory.required;
   inventory.dispatched+=inventory.required;
   stockChange={sku:inventory.sku,type:"dispatch",onHandDelta:-inventory.required,
    reservedDelta:-inventory.required};
 }
 return {
  ...flow,stage:rule.to,inventory,
  history:[...flow.history,{action,from:rule.from,to:rule.to,stockChange}]
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

export function demoInventoryTrace(flow,companyId){
 // Reconstruct a canonical trace; never trust edited browser stock numbers.
 const canonical=restoreDemoCommercialFlow(flow,companyId);
 if(!canonical)throw new Error("Sintetični poslovni tok ni veljaven.");
 const item=canonical.inventory;
 return {
  format:"finai-synthetic-stock-trace-v1",companyId,flowId:canonical.id,
  demoOnly:true,posting:false,sku:item.sku,required:item.required,
  starting:item.starting,onHand:item.onHand,reserved:item.reserved,
  dispatched:item.dispatched,
  movements:canonical.history.filter(x=>x.stockChange!==null)
   .map(x=>({action:x.action,...x.stockChange}))
 };
}
