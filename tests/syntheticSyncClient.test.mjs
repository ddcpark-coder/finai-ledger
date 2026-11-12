import test from "node:test";
import assert from "node:assert/strict";
import {syntheticSyncAvailable,createSyntheticSyncClient,planSyntheticUpload}
 from "../app/documents/syntheticSyncClient.mjs";
const origin="http://127.0.0.1:3000",base=origin+"/api";
const env={format:"finai-mobile-synthetic-vault-v1",companyId:1,
 documentId:"SYNTH-DOB-2026-0048",version:1,
 salt:"AQIDBAUGBwgJCgsMDQ4PEA==",iv:"AQIDBAUGBwgJCgsM",
 iterations:250000,ciphertext:"U0lOVEhFVElDLU9OTFk="};
test("production hosts, cross origins, missing flags and arbitrary API paths fail closed",()=>{
 assert.equal(syntheticSyncAvailable("",origin),false);
 assert.equal(syntheticSyncAvailable("https://e-integrator.si/api","https://e-integrator.si"),false);
 assert.equal(syntheticSyncAvailable(base,"https://e-integrator.si"),false);
 assert.equal(syntheticSyncAvailable("http://localhost:3001/api","http://localhost:3000"),false);
 assert.equal(syntheticSyncAvailable(origin+"/api-extra",origin),false);
 assert.equal(syntheticSyncAvailable(base,origin),true);
 assert.throws(()=>createSyntheticSyncClient({base:"https://e-integrator.si/api",origin}),/samo v lokalnem/);
});
test("client sends no remote write on GET; one explicit encrypted upload uses session CSRF",async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,init});
  if(url.endsWith("/sanctum/csrf-cookie"))return {ok:true};
  const data=url.endsWith("/latest")
   ?{company_id:1,document_id:env.documentId,version:0,envelope:null,demo_only:true,real_sync_enabled:false}
   :{company_id:1,document_id:env.documentId,version:init.method==="POST"?1:0,
     demo_only:true,real_sync_enabled:false};
  return {ok:true,json:async()=>({data})};
 };
 const client=createSyntheticSyncClient({
  base,origin,fetcher,cookie:()=>"XSRF-TOKEN=test%3Dcsrf"
 });
 assert.equal((await client.status(1)).version,0);
 assert.equal((await client.latest(1)).envelope,null);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>x.init.method==="GET"));
 const result=await client.upload(1,{
  eventId:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",expectedVersion:0,envelope:env
 });
 assert.equal(result.version,1);
 assert.equal(calls.length,4);
 assert.ok(calls[2].url.endsWith("/sanctum/csrf-cookie"));
 assert.equal(calls[3].init.credentials,"include");
 assert.equal(calls[3].init.headers["X-XSRF-TOKEN"],"test=csrf");
 const payload=JSON.parse(calls[3].init.body);
 assert.equal(payload.envelope.ciphertext,env.ciphertext);
 assert.equal(payload.expected_version,0);
 assert.throws(()=>client.upload(2,{eventId:"id",expectedVersion:0,envelope:env}),/Neveljaven/);
});
test("401/403/409 conflicts are visible and never silently retried",async()=>{
 const client=createSyntheticSyncClient({
  base,origin,fetcher:async()=>({ok:false,status:409})
 });
 await assert.rejects(client.latest(1),error=>error.status===409&&/Konflikt/.test(error.message));
 const clientDenied=createSyntheticSyncClient({
  base,origin,fetcher:async()=>({ok:false,status:403})
 });
 await assert.rejects(clientDenied.status(1),error=>error.status===403&&/ni dovoljen/.test(error.message));
});
test("two devices: stale revision cannot replace remote and no automatic merge",()=>{
 assert.deepEqual(planSyntheticUpload({remoteVersion:0,localEnvelope:env}),{
  state:"ready",expectedVersion:0
 });
 assert.deepEqual(planSyntheticUpload({remoteVersion:1,ackVersion:undefined,localEnvelope:env}),{
  state:"conflict",remoteVersion:1
 });
 assert.deepEqual(planSyntheticUpload({remoteVersion:2,ackVersion:1,localEnvelope:env}),{
  state:"conflict",remoteVersion:2
 });
 assert.deepEqual(planSyntheticUpload({remoteVersion:2,ackVersion:2,localEnvelope:env}),{
  state:"ready",expectedVersion:2
 });
 assert.deepEqual(planSyntheticUpload({remoteVersion:2,ackVersion:2,localEnvelope:env,remoteEnvelope:env}),{
  state:"already-synced",remoteVersion:2
 });
 assert.deepEqual(planSyntheticUpload({remoteVersion:0,localEnvelope:null}),{
  state:"no-local-proof"
 });
});
