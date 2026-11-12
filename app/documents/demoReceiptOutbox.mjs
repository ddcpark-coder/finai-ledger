// Synthetic-only manual outbox. No real invoices, identity, sync workers or background POSTs.
// Fixed demo company/document pairs guard against cross-company queue operations.
import {deliverySample} from "./demoDeliveryProof.mjs";

const DB_NAME="finai-demo-receipt-outbox-v1";
const STORE="pending";
export const SYNC_STATE=Object.freeze({
 queued:"queued",conflict:"conflict",acknowledged:"acknowledged"
});

export function demoOutboxKey(companyId){
 const sample=deliverySample(companyId);
 return companyId+":"+sample.id;
}
export function validateDemoEnvelope(envelope,companyId){
 const doc=deliverySample(companyId);
 if(!envelope||envelope.format!=="finai-mobile-synthetic-vault-v1"||
  envelope.companyId!==companyId||envelope.documentId!==doc.id||
  envelope.version!==1||envelope.iterations!==250000||
  typeof envelope.salt!=="string"||typeof envelope.iv!=="string"||
  typeof envelope.ciphertext!=="string"||envelope.ciphertext.length<64||
  envelope.ciphertext.length>220000)
  throw new Error("Šifrirani paket ni veljaven za izbrano sintetično podjetje.");
 return doc;
}
export function createDemoPending(envelope,companyId,{uuid=crypto.randomUUID(),createdAt=new Date().toISOString()}={}){
 const sample=validateDemoEnvelope(envelope,companyId);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid))
  throw new Error("Neveljaven ID demonstracijskega dogodka.");
 return {
  id:demoOutboxKey(companyId),companyId,documentId:sample.id,
  state:SYNC_STATE.queued,createdAt,
  clientEventId:uuid,expectedVersion:0,serverVersion:null,
  envelope:structuredClone(envelope)
 };
}
export function assertDemoPending(record,companyId){
 const sample=deliverySample(companyId);
 if(!record||record.id!==demoOutboxKey(companyId)||
  record.companyId!==companyId||record.documentId!==sample.id||
  !Object.values(SYNC_STATE).includes(record.state)||
  !Number.isSafeInteger(record.expectedVersion)||record.expectedVersion<0||
  !/^[0-9a-f-]{36}$/i.test(record.clientEventId))
  throw new Error("Zapis čakalne vrste ne pripada izbranemu podjetju.");
 validateDemoEnvelope(record.envelope,companyId);
 return record;
}
export function syncRequestPayload(record,companyId){
 const pending=assertDemoPending(record,companyId);
 if(pending.state!==SYNC_STATE.queued)
  throw new Error("Konfliktnega oziroma potrjenega zapisa ni mogoče samodejno poslati.");
 return {client_event_id:pending.clientEventId,expected_version:pending.expectedVersion,
  envelope:pending.envelope};
}
export function markSyncConflict(record,companyId,serverVersion){
 const pending=assertDemoPending(record,companyId);
 if(!Number.isSafeInteger(serverVersion)||serverVersion<0)
  throw new Error("Napačen odgovor o verziji na strežniku.");
 return {...pending,state:SYNC_STATE.conflict,serverVersion};
}
export function markSyncAccepted(record,companyId,ack){
 const pending=assertDemoPending(record,companyId);
 if(!ack||ack.company_id!==companyId||ack.document_id!==pending.documentId||
  ack.business_document_created!==false||ack.real_sync_enabled!==false||
  ack.demo_only!==true||ack.encrypted_demo_envelope_stored!==true||
  !Number.isSafeInteger(ack.version)||ack.version!==pending.expectedVersion+1)
  throw new Error("Strežnik ni vrnil preverljive sintetične potrditve.");
 return {...pending,state:SYNC_STATE.acknowledged,serverVersion:ack.version};
}
function openDb(){
 if(typeof indexedDB==="undefined")throw new Error("Lokalna čakalna vrsta ni dosegljiva.");
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE,{keyPath:"id"});
  };
  req.onerror=()=>reject(new Error("Lokalne čakalne vrste ni mogoče odpreti."));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function operation(companyId,mode,handler){
 const key=demoOutboxKey(companyId);
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  let value;
  const get=tx.objectStore(STORE).get(key);
  get.onsuccess=()=>{
   try{
    const current=get.result?.value??null;
    value=handler(tx.objectStore(STORE),key,current);
   }catch(error){tx.abort();reject(error);}
  };
  get.onerror=()=>{reject(new Error("Lokalni zapis ni dosegljiv."));};
  tx.oncomplete=()=>{db.close();resolve(value)};
  tx.onerror=()=>{db.close();reject(new Error("Lokalna transakcija ni uspela."))};
  tx.onabort=()=>{db.close()};
 });
}
export async function readDemoOutbox(companyId){
 return operation(companyId,"readonly",(_store,_key,current)=>{
  if(current)assertDemoPending(current,companyId);
  return current;
 });
}
export async function queueEncryptedDemoProof(envelope,companyId){
 const planned=createDemoPending(envelope,companyId);
 return operation(companyId,"readwrite",(store,key,current)=>{
  if(current){
   assertDemoPending(current,companyId);
   if(JSON.stringify(current.envelope)===JSON.stringify(envelope))return current;
   throw new Error("Za to podjetje že obstaja drugačen zahtevek. Najprej ga ročno razreši.");
  }
  store.put({id:key,value:planned});
  return planned;
 });
}
export async function updateDemoOutbox(record,companyId){
 assertDemoPending(record,companyId);
 return operation(companyId,"readwrite",(store,key,current)=>{
  if(!current||current.clientEventId!==record.clientEventId)
   throw new Error("Čakalna vrsta se je vmes spremenila; osveži status.");
  store.put({id:key,value:record});
  return record;
 });
}
export async function discardDemoOutbox(companyId,expectedEventId){
 return operation(companyId,"readwrite",(store,key,current)=>{
  if(!current)return false;
  if(current.clientEventId!==expectedEventId)
   throw new Error("Nov dogodkovni zahtevek ni bil izbrisan.");
  store.delete(key);
  return true;
 });
}
