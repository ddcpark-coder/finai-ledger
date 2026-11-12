import test from "node:test";
import assert from "node:assert/strict";
import {
 SYNC_STATE,createDemoPending,assertDemoPending,syncRequestPayload,
 markSyncAccepted,markSyncConflict,demoOutboxKey
} from "../app/documents/demoReceiptOutbox.mjs";

process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_SYNC_TEST_API_BASE="/api";
const {testSyncConfigured,syntheticSyncEndpoint,sendDemoOutbox,fetchDemoSyncStatus}=
 await import("../app/lib/demoReceiptSyncGateway.mjs");

const envelope={
 format:"finai-mobile-synthetic-vault-v1",companyId:1,documentId:"SYNTH-DOB-2026-0048",
 version:1,iterations:250000,salt:"AQIDBAUGBwgJCgsMDQ4PEA==",iv:"AQIDBAUGBwgJCgsM",
 ciphertext:"A".repeat(128)
};
const href="http://127.0.0.1:3000/field/";
const sample=()=>createDemoPending(envelope,1,{
 uuid:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",createdAt:"2026-11-12T10:00:00.000Z"
});
const response=(status,data)=>({
 ok:status>=200&&status<300,status,
 json:async()=>({data})
});
test("enqueued encrypted proof is company-scoped, stable, cannot be silently overwritten",()=>{
 const pending=sample();
 assert.equal(pending.id,demoOutboxKey(1));
 assert.equal(pending.expectedVersion,0);
 assert.equal(syncRequestPayload(pending,1).client_event_id,pending.clientEventId);
 assert.throws(()=>assertDemoPending(pending,2),/podjetju/);
 assert.throws(()=>createDemoPending({...envelope,companyId:2},1),/podjetje/);
 assert.throws(()=>createDemoPending(envelope,1,{uuid:"bad"}),/ID/);
 assert.throws(()=>syncRequestPayload(markSyncConflict(pending,1,1),1),/Konfliktnega/);
 assert.throws(()=>syncRequestPayload(markSyncAccepted(pending,1,{
  company_id:1,document_id:pending.documentId,version:1,
  business_document_created:false,real_sync_enabled:false,
  demo_only:true,encrypted_demo_envelope_stored:true
 }),1),/Konfliktnega/);
});
test("network transport is disabled on public or foreign origins even if compiled flag is set",()=>{
 assert.equal(testSyncConfigured("https://e-integrator.si/field/"),false);
 assert.equal(testSyncConfigured("https://127.0.0.2:3000/field/"),false);
 assert.equal(testSyncConfigured("http://127.0.0.1:3000/field/"),true);
 assert.match(syntheticSyncEndpoint(1,href),/^http:\/\/127\.0\.0\.1:3000\/api\/companies\/1/);
 assert.throws(()=>syntheticSyncEndpoint(2,"https://e-integrator.si/field/"));
});
test("manual POST retains event UUID for idempotent retry after lost acknowledgment",async()=>{
 const pending=sample();
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body?JSON.parse(options.body):null});
  if(url.endsWith("/sanctum/csrf-cookie"))return response(204,null);
  if(options.method==="POST")return response(200,{
   company_id:1,document_id:pending.documentId,version:1,
   already_received:true,business_document_created:false,
   encrypted_demo_envelope_stored:true,real_sync_enabled:false,demo_only:true
  });
  throw new Error("Do not GET before POST: must allow replay.");
 };
 const result=await sendDemoOutbox(pending,1,{fetcher,href,cookie:"XSRF-TOKEN=demo%3Dtoken"});
 assert.equal(result.kind,"acknowledged");
 assert.equal(result.record.state,SYNC_STATE.acknowledged);
 assert.equal(result.record.serverVersion,1);
 assert.equal(calls.length,2);
 assert.equal(calls[1].body.client_event_id,pending.clientEventId);
 assert.equal(calls[1].body.expected_version,0);
 assert.equal(calls[1].method,"POST");
});
test("conflict 409 reads current version but never retries a changed document",async()=>{
 const pending=sample();
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push(options.method);
  if(url.endsWith("/sanctum/csrf-cookie"))return response(204,null);
  if(options.method==="POST")return response(409,null);
  return response(200,{
   company_id:1,document_id:pending.documentId,version:3,
   demo_only:true,real_sync_enabled:false
  });
 };
 const result=await sendDemoOutbox(pending,1,{fetcher,href,cookie:"XSRF-TOKEN=synthetic"});
 assert.equal(result.kind,"conflict");
 assert.equal(result.record.state,SYNC_STATE.conflict);
 assert.equal(result.record.serverVersion,3);
 assert.equal(result.record.expectedVersion,0);
 assert.deepEqual(calls,["GET","POST","GET"]);
});
test("CSRF absent, missing login and invalid server acknowledgment fail closed",async()=>{
 const pending=sample();
 let posts=0;
 const fetcher=async(url,options)=>{
  if(url.endsWith("/sanctum/csrf-cookie"))return response(204,null);
  if(options.method==="POST"){posts++;return response(200,{version:1,demo_only:true,real_sync_enabled:true});}
  return response(401,null);
 };
 await assert.rejects(sendDemoOutbox(pending,1,{fetcher,href,cookie:""}),/CSRF/);
 assert.equal(posts,0);
 await assert.rejects(sendDemoOutbox(pending,1,{
  fetcher,href,cookie:"XSRF-TOKEN=synthetic"
 }),/preverljive/);
 assert.equal(posts,1);
 await assert.rejects(fetchDemoSyncStatus(1,{fetcher,href}),/401/);
});
