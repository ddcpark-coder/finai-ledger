import test from "node:test";
import assert from "node:assert/strict";
import {
 demoFlowKey,createDemoCommercialFlow,transitionDemoCommercialFlow,
 restoreDemoCommercialFlow,upcomingFlowAction,demoInventoryTrace
} from "../app/business/demoCommercialFlow.mjs";

const steps=["send_quote","accept_quote","create_order","confirm_delivery","prepare_invoice","record_payment"];
test("complete human-acknowledged synthetic chain is sequential and reproducible",()=>{
 let f=createDemoCommercialFlow(1);
 assert.equal(f.stage,"draft");
 for(const action of steps)f=transitionDemoCommercialFlow(f,action,1);
 assert.equal(f.stage,"paid");
 assert.equal(f.history.length,6);
 assert.equal(upcomingFlowAction(f),null);
 assert.deepEqual(restoreDemoCommercialFlow(f,1),f);
 assert.throws(()=>transitionDemoCommercialFlow(f,"record_payment",1),/Prehod/);
});
test("cannot skip stages, repeat actions or operate against another company",()=>{
 const a=createDemoCommercialFlow(1);
 const b=createDemoCommercialFlow(2);
 assert.throws(()=>transitionDemoCommercialFlow(a,"create_order",1));
 assert.throws(()=>transitionDemoCommercialFlow(a,"send_quote",2));
 assert.throws(()=>transitionDemoCommercialFlow(a,"unknown",1));
 assert.notEqual(demoFlowKey(1),demoFlowKey(2));
 assert.notEqual(a.partner,b.partner);
 assert.notEqual(a.grossCents,b.grossCents);
});
test("corrupt or foreign browser storage is rejected, never trusted as a business event",()=>{
 const a=createDemoCommercialFlow(1);
 assert.equal(restoreDemoCommercialFlow(a,2),null);
 assert.equal(restoreDemoCommercialFlow({...a,stage:"invoiced"},1),null);
 assert.equal(restoreDemoCommercialFlow({...a,history:[{action:"prepare_invoice",from:"delivered",to:"invoiced"}]},1),null);
 assert.equal(restoreDemoCommercialFlow({...a,history:[{action:"send_quote",from:"wrong",to:"quoted"}]},1),null);
 assert.equal(restoreDemoCommercialFlow(null,1),null);
 for(const invalid of [0,-1,4,"1",NaN])assert.throws(()=>createDemoCommercialFlow(invalid));
});
test("module ownership ensures each next step is explicit and reviewable",()=>{
 let flow=null;
 assert.deepEqual(upcomingFlowAction(flow),{action:"create",module:"quotes",label:"Ustvari demo ponudbo"});
 flow=createDemoCommercialFlow(1);
 assert.equal(upcomingFlowAction(flow).module,"quotes");
 flow=transitionDemoCommercialFlow(flow,"send_quote",1);
 assert.equal(upcomingFlowAction(flow).module,"orders");
 flow=transitionDemoCommercialFlow(flow,"accept_quote",1);
 flow=transitionDemoCommercialFlow(flow,"create_order",1);
 assert.equal(upcomingFlowAction(flow).module,"documents");
 flow=transitionDemoCommercialFlow(flow,"confirm_delivery",1);
 assert.equal(upcomingFlowAction(flow).module,"issued_invoices");
 flow=transitionDemoCommercialFlow(flow,"prepare_invoice",1);
 assert.equal(upcomingFlowAction(flow).module,"banking");
});

test("synthetic order reserves and delivery dispatches fixed per-company inventory",()=>{
 let a=createDemoCommercialFlow(1);
 assert.equal(a.inventory.onHand,12);
 assert.equal(a.inventory.reserved,0);
 a=transitionDemoCommercialFlow(a,"send_quote",1);
 a=transitionDemoCommercialFlow(a,"accept_quote",1);
 a=transitionDemoCommercialFlow(a,"create_order",1);
 assert.equal(a.inventory.onHand,12);
 assert.equal(a.inventory.reserved,3);
 assert.equal(a.inventory.dispatched,0);
 const reservedTrace=demoInventoryTrace(a,1);
 assert.deepEqual(reservedTrace.movements,[{
  action:"create_order",sku:"TAB-10070",type:"reservation",onHandDelta:0,reservedDelta:3
 }]);
 a=transitionDemoCommercialFlow(a,"confirm_delivery",1);
 assert.equal(a.inventory.onHand,9);
 assert.equal(a.inventory.reserved,0);
 assert.equal(a.inventory.dispatched,3);
 const trace=demoInventoryTrace(a,1);
 assert.equal(trace.demoOnly,true);assert.equal(trace.posting,false);
 assert.deepEqual(trace.movements[1],{
  action:"confirm_delivery",sku:"TAB-10070",type:"dispatch",
  onHandDelta:-3,reservedDelta:-3
 });
 assert.deepEqual(restoreDemoCommercialFlow(a,1),a);
 assert.equal(createDemoCommercialFlow(2).inventory.onHand,18);
 assert.throws(()=>demoInventoryTrace(a,2),/veljaven|podjetje/);
});
test("browser-tampered stock is reconstructed rather than trusted in exported demo trace",()=>{
 let a=createDemoCommercialFlow(3);
 for(const step of ["send_quote","accept_quote","create_order","confirm_delivery"]){
  a=transitionDemoCommercialFlow(a,step,3);
 }
 const tampered={...a,inventory:{...a.inventory,onHand:99999}};
 assert.equal(demoInventoryTrace(tampered,3).onHand,38);
 assert.equal(restoreDemoCommercialFlow(tampered,3).inventory.onHand,38);
 const impossible={...a,stage:"paid"};
 assert.throws(()=>demoInventoryTrace(impossible,3),/veljaven/);
 assert.throws(()=>transitionDemoCommercialFlow({
  ...createDemoCommercialFlow(1),inventory:{onHand:-1}
 },"send_quote",1),/zaloge/);
});
