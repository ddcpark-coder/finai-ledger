import test from "node:test";
import assert from "node:assert/strict";
import {
 SYNC_STATE,createDemoPending,assertDemoPending,syncRequestPayload,
 markSyncAccepted,markSyncConflict,transmitDemoOutbox,demoOutboxKey
} from "../app/documents/demoReceiptOutbox.mjs";
const envelope={
 format:"finai-mobile-synthetic-vault-v1",companyId:1,documentId:"SYNTH-DOB-2026-0048",
 version:1,iterations:250000,salt:"AQIDBAUGBwgJCgsMDQ4PEA==",iv:"AQIDBAUGBwgJCgsM",
 ciphertext:"QUJD".repeat(48)
};
const sample=()=>createDemoPending(envelope,1,{
 uuid:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",createdAt:"2026-11-13T08:00:00.000Z"
});
const ack=(version,extra={})=>({
 company_id:1,document_id:envelope.documentId,version,
 already_received:false,business_document_created:false,
 encrypted_demo_envelope_stored:true,real_sync_enabled:false,demo_only:true,...extra
});
test("queue preserves encrypted company-bound original and validates event revision",()=>{
 const p=sample();
 assert.equal(p.id,demoOutboxKey(1));
 assert.equal(p.state,SYNC_STATE.queued);
 assert.equal(p.expectedVersion,0);
 assert.equal(syncRequestPayload(p,1).client_event_id,p.clientEventId);
 assert.notEqual(p.envelope,envelope);
 assert.throws(()=>assertDemoPending(p,2),/podjetju/);
 assert.throws(()=>createDemoPending({...envelope,companyId:2},1),/podjetje/);
 assert.throws(()=>createDemoPending({...envelope,plaintext:"secret"},1),/šifrirani/i);
 assert.throws(()=>createDemoPending(envelope,1,{uuid:"invalid"}),/ID/);
 assert.throws(()=>createDemoPending(envelope,1,{expectedVersion:-1}),/verzija/);
});
test("lost acknowledgment repeats exact UUID without a prior GET",async()=>{
 const p=sample(),requests=[];
 const result=await transmitDemoOutbox(p,1,{
  upload:async(companyId,payload)=>{requests.push([companyId,payload]);return ack(1,{already_received:true})},
  latest:async()=>{throw new Error("unexpected GET")}
 });
 assert.equal(result.state,SYNC_STATE.acknowledged);
 assert.equal(result.serverVersion,1);
 assert.equal(result.clientEventId,p.clientEventId);
 assert.deepEqual(result.envelope,p.envelope);
 assert.equal(requests.length,1);
 assert.equal(requests[0][1].eventId,p.clientEventId);
 assert.equal(requests[0][1].expectedVersion,0);
 assert.throws(()=>syncRequestPayload(result,1),/Konfliktnega/);
});
test("409 becomes durable conflict, without replay or overwrite",async()=>{
 const p=sample(),requests=[];
 const result=await transmitDemoOutbox(p,1,{
  upload:async()=>{requests.push("POST");throw Object.assign(new Error("conflict"),{status:409})},
  latest:async()=>{requests.push("GET");return ack(3)}
 });
 assert.deepEqual(requests,["POST","GET"]);
 assert.equal(result.state,SYNC_STATE.conflict);
 assert.equal(result.serverVersion,3);
 assert.equal(result.clientEventId,p.clientEventId);
 assert.deepEqual(result.envelope,p.envelope);
 assert.throws(()=>syncRequestPayload(result,1),/Konfliktnega/);
});
test("offline, 401, wrong ACK and foreign company fail closed",async()=>{
 const p=sample();
 for(const error of [new Error("offline"),Object.assign(new Error("forbidden"),{status:401})]){
  await assert.rejects(transmitDemoOutbox(p,1,{upload:async()=>{throw error}}));
  assert.equal(p.state,SYNC_STATE.queued);
 }
 await assert.rejects(transmitDemoOutbox(p,1,{upload:async()=>ack(9)}),/potrditve/);
 await assert.rejects(transmitDemoOutbox(p,1,{
  upload:async()=>{throw Object.assign(new Error("conflict"),{status:409})},
  latest:async()=>ack(2,{company_id:2})
 }),/Stanja konflikta/);
 assert.throws(()=>markSyncAccepted(p,1,ack(2)),/potrditve/);
 assert.throws(()=>markSyncConflict(p,1,-1),/verziji/);
});
