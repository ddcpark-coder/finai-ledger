import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {encryptDemoProof} from "../app/documents/mobileProofVault.mjs";
import {createDemoPending,SYNC_STATE} from "../app/documents/demoReceiptOutbox.mjs";
import {packPortableDemoOutbox,unpackPortableDemoOutbox}
 from "../app/documents/demoOutboxPortable.mjs";

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
const phrase="synthetic-mobile-portable-not-real-2026";
async function sample(){
 const proof=await finalizeDemoDelivery({
  companyId:1,document:deliverySample(1),signer:"Sintetični prevzemnik",
  signature,accepted:true,signedAt:new Date("2026-11-11T12:00:00Z")
 });
 const envelope=await encryptDemoProof(proof,1,phrase);
 return createDemoPending(envelope,1,{
  uuid:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",
  createdAt:"2026-11-16T10:00:00.000Z",expectedVersion:3
 });
}
test("v2 authenticates original queued event UUID, revision and AES-GCM evidence",async()=>{
 const original=await sample();
 const packet=await packPortableDemoOutbox(original,1,phrase);
 const imported=await unpackPortableDemoOutbox(packet,1,phrase);
 assert.deepEqual(imported,original);
 assert.equal(imported.clientEventId,original.clientEventId);
 assert.equal(imported.expectedVersion,3);
 assert.equal(imported.state,SYNC_STATE.queued);
 assert.equal(JSON.parse(packet).format,"finai-portable-synthetic-outbox-v2");
 assert.ok(!packet.includes("Sintetični prevzemnik"));
 assert.ok(!packet.includes("signatureDataUrl"));
 assert.ok(!packet.includes(phrase));
});
test("wrong phrase and tampering with UUID/revision/ciphertext/salt/MAC fail closed",async()=>{
 const original=await sample();
 const originalPacket=JSON.parse(await packPortableDemoOutbox(original,1,phrase));
 await assert.rejects(unpackPortableDemoOutbox(JSON.stringify(originalPacket),1,
   "different-synthetic-phrase-2026"),/fraza|HMAC|podpisani/i);
 const changes=[
  x=>{const record=JSON.parse(x.payload);record.clientEventId="2069a8cb-93c6-4a6f-8a8c-5fb138f7a801";x.payload=JSON.stringify(record)},
  x=>{const record=JSON.parse(x.payload);record.expectedVersion=4;x.payload=JSON.stringify(record)},
  x=>{const record=JSON.parse(x.payload);record.envelope.ciphertext=record.envelope.ciphertext.slice(0,-5)+"AAAAA";x.payload=JSON.stringify(record)},
  x=>{x.salt="AQIDBAUGBwgJCgsMDQ4PEA=="},
  x=>{x.mac="AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA="},
 ];
 for(const mutate of changes){
  const changed=structuredClone(originalPacket);
  mutate(changed);
  await assert.rejects(
   unpackPortableDemoOutbox(JSON.stringify(changed),1,phrase));
 }
 await assert.rejects(unpackPortableDemoOutbox(
  JSON.stringify({...originalPacket,companyId:2}),1,phrase),/podjetju|shemo/);
});
test("portable v1 checksum is NOT trusted and cannot downgrade v2",async()=>{
 const original=await sample();
 const legacy=JSON.stringify({format:"finai-portable-synthetic-outbox-v1",
  companyId:1,checksum:"0".repeat(64),payload:JSON.stringify(original)});
 await assert.rejects(unpackPortableDemoOutbox(legacy,1,phrase),/Stari paket v1/);
});
test("terminal states, PII, malformed timestamps and invalid credentials never export",async()=>{
 const record=await sample();
 await assert.rejects(packPortableDemoOutbox(
  {...record,state:SYNC_STATE.conflict,serverVersion:4},1,phrase));
 await assert.rejects(packPortableDemoOutbox(
  {...record,state:SYNC_STATE.acknowledged,serverVersion:4},1,phrase));
 await assert.rejects(packPortableDemoOutbox({...record,plaintext:"PRIVATE"},1,phrase));
 await assert.rejects(packPortableDemoOutbox({...record,createdAt:"today"},1,phrase));
 await assert.rejects(packPortableDemoOutbox({...record,clientEventId:"invalid"},1,phrase));
 await assert.rejects(packPortableDemoOutbox({...record,expectedVersion:-1},1,phrase));
 await assert.rejects(packPortableDemoOutbox(record,2,phrase));
 await assert.rejects(packPortableDemoOutbox(record,1,"too-short"));
});
test("structural changes and oversized inputs reject before any staging",async()=>{
 const record=await sample();
 const packet=JSON.parse(await packPortableDemoOutbox(record,1,phrase));
 for(const change of [
  {...packet,unexpected:"token"},
  {...packet,format:"unsupported"},
  {...packet,iterations:1},
  {...packet,payload:"{invalid-json"},
 ]){
  await assert.rejects(unpackPortableDemoOutbox(JSON.stringify(change),1,phrase));
 }
 await assert.rejects(unpackPortableDemoOutbox("x".repeat(350000),1,phrase));
});
