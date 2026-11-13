import test from "node:test";
import assert from "node:assert/strict";
import {createSyntheticLedgerClient,syntheticLedgerAvailable} from
 "../app/business/syntheticLedgerClient.mjs";
const origin="http://127.0.0.1:3000",base=origin+"/api";
const snapshot=(company_id=1)=>({
 company_id,demo_only:true,real_posting_enabled:false,version:0,state:"draft",
 inventory:{sku:"SYNTH-SKU-001",on_hand:12,reserved:0,dispatched:0,order_quantity:3},
 invoice:{net_cents:10000,vat_cents:2200,gross_cents:12200,currency:"EUR"},
 events:[],replayed:false
});
const response=(status,data)=>({ok:status>=200&&status<300,status,
 json:async()=>({data})});

test("only same-origin loopback local development is able to reach scenario API",()=>{
 assert.equal(syntheticLedgerAvailable("",origin),false);
 assert.equal(syntheticLedgerAvailable(base,origin),true);
 assert.equal(syntheticLedgerAvailable("https://e-integrator.si/api","https://e-integrator.si"),false);
 assert.equal(syntheticLedgerAvailable(base,"https://e-integrator.si"),false);
 assert.equal(syntheticLedgerAvailable("http://localhost:3001/api","http://localhost:3000"),false);
 assert.equal(syntheticLedgerAvailable(origin+"/other",origin),false);
 assert.throws(()=>createSyntheticLedgerClient({
  base:"https://e-integrator.si/api",origin:"https://e-integrator.si"
 }),/samo v lokalnem/);
});
test("GET reads only, manual POST requires same-origin CSRF and UUID",async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,init});
  return url.endsWith("/sanctum/csrf-cookie")?response(204,null):response(200,snapshot());
 };
 const client=createSyntheticLedgerClient({
  base,origin,fetcher,cookie:()=>"XSRF-TOKEN=demo%3Dtoken"
 });
 assert.equal((await client.read(1)).version,0);
 assert.equal(calls.length,1);assert.equal(calls[0].init.method,"GET");
 const uuid="1069a8cb-93c6-4a6f-8a8c-5fb138f7a801";
 await client.advance(1,{action:"reserve",eventId:uuid,expectedVersion:0});
 assert.equal(calls.length,3);
 assert.match(calls[1].url,/sanctum\/csrf-cookie$/);
 const post=calls[2];
 assert.equal(post.init.credentials,"include");
 assert.equal(post.init.headers["X-XSRF-TOKEN"],"demo=token");
 assert.equal(post.init.method,"POST");
 assert.deepEqual(JSON.parse(post.init.body),{
  demo_only:true,action:"reserve",event_id:uuid,expected_version:0
 });
 assert.throws(()=>client.advance(1,{action:"invalid",eventId:uuid,expectedVersion:0}),/Neveljaven/);
 assert.throws(()=>client.advance(1,{action:"reserve",eventId:"fake",expectedVersion:0}),/Neveljaven/);
 assert.throws(()=>client.read(0),/Neveljavno/);
});
test("foreign-company or real-posting responses fail closed",async()=>{
 for(const invalid of [snapshot(2),{...snapshot(),demo_only:false},
  {...snapshot(),real_posting_enabled:true},{...snapshot(),inventory:{
    ...snapshot().inventory,on_hand:999
  }}]){
  const client=createSyntheticLedgerClient({
   base,origin,fetcher:async()=>response(200,invalid)
  });
  await assert.rejects(client.read(1),/neveljavno sintetično stanje/);
 }
});
test("401/403/409 remain visible and never auto-retry",async()=>{
 const requests=[];
 const client=createSyntheticLedgerClient({
  base,origin,fetcher:async(url,init)=>{
   requests.push(init.method);
   return response(409,null);
  }
 });
 await assert.rejects(client.read(1),
  error=>error.status===409&&/konfliktu/.test(error.message));
 assert.deepEqual(requests,["GET"]);
 const denied=createSyntheticLedgerClient({
  base,origin,fetcher:async()=>response(403,null)
 });
 await assert.rejects(denied.read(1),error=>error.status===403);
 const missingCsrf=createSyntheticLedgerClient({
  base,origin,fetcher:async()=>response(204,null),cookie:()=>"",
 });
 await assert.rejects(missingCsrf.advance(1,{
  action:"reserve",eventId:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",expectedVersion:0
 }),/CSRF/);
});
