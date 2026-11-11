import test from "node:test";
import assert from "node:assert/strict";
import {
 demoFlowKey,createDemoCommercialFlow,transitionDemoCommercialFlow,
 restoreDemoCommercialFlow,upcomingFlowAction
} from "../app/business/demoCommercialFlow.mjs";

const steps=["send_quote","accept_quote","create_order","confirm_delivery","prepare_invoice"];
test("complete human-acknowledged synthetic chain is sequential and reproducible",()=>{
 let f=createDemoCommercialFlow(1);
 assert.equal(f.stage,"draft");
 for(const action of steps)f=transitionDemoCommercialFlow(f,action,1);
 assert.equal(f.stage,"invoiced");
 assert.equal(f.history.length,5);
 assert.equal(upcomingFlowAction(f),null);
 assert.deepEqual(restoreDemoCommercialFlow(f,1),f);
 assert.throws(()=>transitionDemoCommercialFlow(f,"prepare_invoice",1),/Prehod/);
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
});
