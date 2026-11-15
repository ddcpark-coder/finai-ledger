import test from "node:test";
import assert from "node:assert/strict";
import {
 createSyntheticCrmClient,syntheticCrmAvailable
} from "../app/next11/syntheticCrmClient.mjs";

const origin="http://127.0.0.1:3000",base=origin+"/api";
const deal={id:"SYN-CRM-101",companyId:1,unitId:"PE-01",
 stage:"Kvalifikacija",valueCents:1250000,version:1};
const backend=(stage="qualification",version=1,company_id=1)=>({
 demo_only:true,company_id,deal_id:"SYN-CRM-101",unit_code:"PE-01",
 stage,value_cents:1250000,version
});
const response=(status,data)=>({
 ok:status>=200&&status<300,status,
 json:async()=>({demo_only:true,data})
});

test("no public, non-loopback, cross-origin, or malformed API address is accepted",()=>{
 assert.equal(syntheticCrmAvailable(base,origin),true);
 for(const [api,page] of [
  ["",origin],
  ["https://e-integrator.si/api","https://e-integrator.si"],
  [base,"https://e-integrator.si"],
  ["http://127.0.0.1:3001/api",origin],
  [origin+"/api/anything",origin],
  [base+"?token=bad",origin],
 ])assert.equal(syntheticCrmAvailable(api,page),false);
 assert.throws(()=>createSyntheticCrmClient({
  base:"https://e-integrator.si/api",origin:"https://e-integrator.si"
 }),/samo v lokalnem/);
});

test("read validates tenant, rows and non-personal synthetic format",async()=>{
 const client=createSyntheticCrmClient({
  base,origin,fetcher:async()=>response(200,[backend()])
 });
 assert.deepEqual(await client.read(1),[deal]);
 for(const invalid of [
  backend("qualification",1,2),
  {...backend(),demo_only:false},
  {...backend(),deal_id:"REAL-PERSON-1"},
  {...backend(),stage:"unexpected"},
  {...backend(),value_cents:12.50},
  {...backend(),version:0},
 ]){
  const bad=createSyntheticCrmClient({
   base,origin,fetcher:async()=>response(200,[invalid])
  });
  await assert.rejects(bad.read(1),/neveljavno sintetično stanje/);
 }
 const duplicate=createSyntheticCrmClient({
  base,origin,fetcher:async()=>response(200,[backend(),backend()])
 });
 await assert.rejects(duplicate.read(1),/Podvojene/);
});

test("manual register and advance include CSRF, cookies and exact synthetic keys",async()=>{
 const calls=[];
 const client=createSyntheticCrmClient({
  base,origin,cookie:()=>"a=b; XSRF-TOKEN=demo%3Dtoken",
  fetcher:async(url,init)=>{
   calls.push({url,init});
   if(url.endsWith("/sanctum/csrf-cookie"))return response(204,null);
   if(url.endsWith("/advance"))return response(200,backend("discovery",2));
   return response(201,backend());
  }
 });
 assert.deepEqual(await client.register(1,deal),deal);
 assert.deepEqual(await client.advance(1,deal,"Odkrivanje"),
  {...deal,stage:"Odkrivanje",version:2});
 assert.equal(calls.length,4);
 assert.equal(calls[1].init.credentials,"include");
 assert.equal(calls[1].init.headers["X-XSRF-TOKEN"],"demo=token");
 assert.deepEqual(JSON.parse(calls[1].init.body),{
  demoOnly:true,dealId:"SYN-CRM-101",unitCode:"PE-01",
  initialStage:"qualification",valueCents:1250000,
 });
 assert.deepEqual(JSON.parse(calls[3].init.body),{
  demo_only:true,expected_version:1,next_stage:"discovery"
 });
 assert.equal(calls[3].init.redirect,"error");
});

test("invalid client events and permissions fail closed without automatic retries",async()=>{
 let calls=0;
 const denied=createSyntheticCrmClient({
  base,origin,fetcher:async()=>{
   calls++;return response(403,null);
  }
 });
 await assert.rejects(denied.read(1),e=>e.status===403);
 assert.equal(calls,1);
 assert.throws(()=>denied.register(1,{...deal,id:"REAL-101"}),/Neveljavni/);
 assert.throws(()=>denied.advance(1,{...deal,companyId:2},"Odkrivanje"),/Neveljaven/);
 assert.equal(calls,1);
 const missingCsrf=createSyntheticCrmClient({
  base,origin,cookie:()=>"",fetcher:async()=>response(204,null)
 });
 await assert.rejects(missingCsrf.register(1,deal),/CSRF/);
 const conflict=createSyntheticCrmClient({
  base,origin,cookie:()=>"XSRF-TOKEN=demo",
  fetcher:async url=>url.endsWith("/sanctum/csrf-cookie")?
   response(204,null):response(409,null)
 });
 await assert.rejects(conflict.advance(1,deal,"Odkrivanje"),
  e=>e.status===409&&/konfliktu/.test(e.message));
});
