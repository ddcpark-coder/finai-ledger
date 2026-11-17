import test from "node:test";
import assert from "node:assert/strict";
import {
 createSyntheticBusinessGraphClient,syntheticBusinessGraphAvailable,
 validateSyntheticBusinessGraph
} from "../app/next11/syntheticBusinessGraphClient.mjs";

const origin="http://127.0.0.1:3000",base=origin+"/api";
const crm={ref:"SYN:C1:CRM:3",deal_id:"SYN-CRM-101",
 unit_code:"PE-01",stage:"qualification",version:2,value_cents:25000};
const order={ref:"SYN:C1:ORDER:5",external_order_id:"SYN-DEMO-ORDER-001",
 provider:"shopify",warehouse_id:1,total_cents:25000,status:"review"};
const plan={ref:"SYN:C1:PLAN:7",order_ref:order.ref,crm_ref:crm.ref,
 event_id:"SYN-PLAN-001",sku:"SYN-TAB-10070",quantity:2,
 source_warehouse_id:2,target_warehouse_id:1,
 demo_only:true,posting:false,inventory_reserved:false};
const audit={ref:"SYN:C1:AUDIT:9",entity_ref:plan.ref,
 event_type:"synthetic_inventory.plan_recorded"};
const graph={company_id:1,demo_only:true,read_only:true,posting:false,
 inventory_reserved:false,external_sync:false,bounded_limit:20,
 crm:[crm],orders:[order],stock_plans:[plan],audit:[audit]};

test("local business graph transport never opens a remote or cross-origin endpoint",()=>{
 assert.equal(syntheticBusinessGraphAvailable(base,origin),true);
 for(const [url,from] of [
  ["https://e-integrator.si/api","https://e-integrator.si"],
  ["https://localhost:3000/api","http://localhost:3000"],
  ["http://localhost:3000/api","http://127.0.0.1:3000"],
  ["http://192.168.1.10:3000/api","http://192.168.1.10:3000"],
  ["http://127.0.0.1:3000/service","http://127.0.0.1:3000"]
 ])assert.equal(syntheticBusinessGraphAvailable(url,from),false);
 assert.throws(()=>createSyntheticBusinessGraphClient({
  origin,base:"https://e-integrator.si/api"}),/lokalnem/);
});

test("manual company read sends exactly one authenticated GET; never a write",async()=>{
 const calls=[];
 const client=createSyntheticBusinessGraphClient({
  base,origin,fetcher:async(url,opt)=>{
   calls.push({url,opt});
   return {ok:true,json:async()=>({data:graph})};
  }
 });
 assert.deepEqual(await client.snapshot(1),graph);
 assert.equal(calls.length,1);
 assert.equal(calls[0].opt.method,"GET");
 assert.equal(calls[0].opt.credentials,"include");
 assert.equal(calls[0].opt.cache,"no-store");
 assert.equal(calls[0].url,
  base+"/companies/1/demo/business-graph?limit=20");
 await assert.rejects(client.snapshot(2),/dovoljenega/);
 await assert.rejects(client.snapshot(0),/Neveljavna/);
 await assert.rejects(client.snapshot(1,{limit:99}),/Neveljavna/);
});

test("response strict validation blocks PII, accounting, cross-tenant and fake audit",()=>{
 assert.equal(validateSyntheticBusinessGraph(graph,1),graph);
 for(const bad of [
  {...graph,posting:true},
  {...graph,inventory_reserved:true},
  {...graph,external_sync:true},
  {...graph,customerEmail:"fake@example.test"},
  {...graph,company_id:2},
  {...graph,crm:[{...crm,email:"fake@example.test"}]},
  {...graph,orders:[{...order,status:"posted"}]},
  {...graph,orders:[{...order,external_order_id:"REAL-1"}]},
  {...graph,stock_plans:[{...plan,quantity:-2}]},
  {...graph,stock_plans:[{...plan,order_ref:"SYN:C2:ORDER:5"}]},
  {...graph,stock_plans:[{...plan,posting:true}]},
  {...graph,audit:[{...audit,metadata:{token:"secret"}}]},
  {...graph,audit:[{...audit,entity_ref:"SYN:C2:PLAN:7"}]},
  {...graph,audit:[{...audit,entity_ref:"SYN:C1:PLAN:99"}]},
  {...graph,audit:[audit,audit]},
  {...graph,crm:[crm,crm]},
  {...graph,bounded_limit:0}
 ])assert.throws(()=>validateSyntheticBusinessGraph(bad,1));
});

test("disabled/denied/corrupt backend responses never populate graph",async()=>{
 for(const status of [401,403,404,409,422]){
  const client=createSyntheticBusinessGraphClient({base,origin,
   fetcher:async()=>({ok:false,status})});
  await assert.rejects(client.snapshot(1),
   error=>error.status===status);
 }
 const client=createSyntheticBusinessGraphClient({base,origin,
  fetcher:async()=>({ok:true,json:async()=>({
   data:{...graph,orders:[{...order,source:"real-system"}]}
  })})});
 await assert.rejects(client.snapshot(1));
});
