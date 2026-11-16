// FinAI NEXT13G: manually export/import ONLY an already encrypted
// synthetic mobile event. SHA-256 is a corruption check, NOT authenticity;
// AES-GCM envelope remains the actual cryptographic protection.
import {SYNC_STATE,assertDemoPending} from "./demoReceiptOutbox.mjs";

const FORMAT="finai-portable-synthetic-outbox-v1";
const MAX_LENGTH=300000;
const FIELDS=["clientEventId","companyId","createdAt","documentId","envelope",
 "expectedVersion","id","serverVersion","state"];

function exactKeys(value,keys){
 return !!value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).sort().join("|")===keys.slice().sort().join("|");
}
function hex(bytes){
 return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
async function digest(value){
 const data=new TextEncoder().encode(value);
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",data)));
}
function validate(record,companyId){
 if(!exactKeys(record,FIELDS)||record.state!==SYNC_STATE.queued||
  record.serverVersion!==null ||
  typeof record.createdAt!=="string"||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.createdAt)||
  Number.isNaN(Date.parse(record.createdAt)))
  throw new Error("Prenos omogoča samo izvirni šifrirani čakajoči demo dogodek.");
 assertDemoPending(record,companyId);
 return record;
}
export async function packPortableDemoOutbox(record,companyId){
 const safe=validate(record,companyId);
 const payload=JSON.stringify(safe);
 if(payload.length>MAX_LENGTH)throw new Error("Šifrirani dogodek presega dovoljeno velikost.");
 const checksum=await digest(FORMAT+"|"+companyId+"|"+payload);
 return JSON.stringify({format:FORMAT,companyId,checksum,payload});
}
export async function unpackPortableDemoOutbox(text,companyId){
 if(typeof text!=="string"||text.length>MAX_LENGTH+512||
  !Number.isSafeInteger(companyId))
  throw new Error("Neveljaven prenosni sintetični paket.");
 let packet;
 try{packet=JSON.parse(text)}catch{throw new Error("Poškodovan prenosni paket.");}
 if(!exactKeys(packet,["format","companyId","checksum","payload"])||
  packet.format!==FORMAT||packet.companyId!==companyId||
  typeof packet.payload!=="string"||packet.payload.length>MAX_LENGTH||
  typeof packet.checksum!=="string"||!/^[0-9a-f]{64}$/.test(packet.checksum))
  throw new Error("Paket ne pripada izbranemu sintetičnemu podjetju.");
 const checksum=await digest(FORMAT+"|"+companyId+"|"+packet.payload);
 if(checksum!==packet.checksum)
  throw new Error("Šifrirani prenosni paket je spremenjen.");
 let record;
 try{record=JSON.parse(packet.payload)}catch{
  throw new Error("Prenosni zapis ni veljaven.");
 }
 return validate(record,companyId);
}
