import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {createDemoPending,SYNC_STATE} from "../app/documents/demoReceiptOutbox.mjs";
import {packPortableDemoOutbox,unpackPortableDemoOutbox} from "../app/documents/demoOutboxPortable.mjs";

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const envelope={
 format:"finai-mobile-synthetic-vault-v1",
 companyId:1,documentId:"SYNTH-DOB-2026-0048",version:1,iterations:250000,
 salt:"AQIDBAUGBwgJCgsMDQ4PEA==",iv:"AQIDBAUGBwgJCgsM",
 ciphertext:"QUJD".repeat(48)
};
const original=()=>createDemoPending(envelope,1,{
 uuid:"1069a8cb-93c6-4a6f-8a8c-5fb138f7a801",
 createdAt:"2026-11-16T10:00:00.000Z",expectedVersion:3
});
test("portable encrypted queue round trip retains company, UUID, expected revision and ciphertext",async()=>{
 const record=original();
 const text=await packPortableDemoOutbox(record,1);
 const restored=await unpackPortableDemoOutbox(text,1);
 assert.deepEqual(restored,record);
 assert.equal(restored.clientEventId,record.clientEventId);
 assert.equal(restored.expectedVersion,3);
 assert.equal(restored.state,SYNC_STATE.queued);
 assert.equal(text.includes('"signer"'),false);
 assert.equal(text.includes('"password"'),false);
});
test("portable queue reject foreign company and changed payload even when JSON remains parsable",async()=>{
 const record=original();
 const text=await packPortableDemoOutbox(record,1);
 await assert.rejects(unpackPortableDemoOutbox(text,2),/podjetju/);
 const parsed=JSON.parse(text);
 parsed.payload=parsed.payload.replace("1069a8cb","2069a8cb");
 await assert.rejects(unpackPortableDemoOutbox(JSON.stringify(parsed),1),/spremenjen/);
});
test("portable queue rejects terminal/conflict state, cleartext keys and unknown schema",async()=>{
 const record=original();
 await assert.rejects(packPortableDemoOutbox({...record,state:SYNC_STATE.acknowledged,serverVersion:4},1));
 await assert.rejects(packPortableDemoOutbox({...record,state:SYNC_STATE.conflict,serverVersion:5},1));
 await assert.rejects(packPortableDemoOutbox({...record,plaintext:"PRIVATE"},1));
 const data=JSON.parse(await packPortableDemoOutbox(record,1));
 await assert.rejects(unpackPortableDemoOutbox(JSON.stringify({...data,secret:"not-allowed"}),1));
 await assert.rejects(unpackPortableDemoOutbox(JSON.stringify({...data,format:"unknown"}),1));
 await assert.rejects(unpackPortableDemoOutbox("a".repeat(350000),1));
});
test("portable queue rejects wrong/unverified event, future invalid shapes and mixed tenant envelope",async()=>{
 const record=original();
 await assert.rejects(packPortableDemoOutbox({...record,envelope:{...envelope,companyId:2}},1));
 await assert.rejects(packPortableDemoOutbox({...record,clientEventId:"invalid"},1));
 await assert.rejects(packPortableDemoOutbox({...record,createdAt:"today"},1));
 await assert.rejects(packPortableDemoOutbox({...record,expectedVersion:-1},1));
});
