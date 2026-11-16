// NEXT13H — synthetic-only, locally authenticated portable mobile outbox.
// v1 used an unkeyed SHA-256 checksum: it detected accidents, NOT a forged
// clientEventId/expectedVersion. v2 binds the whole record with PBKDF2/HMAC
// and ALSO decrypts/validates the enclosed AES-GCM proof BEFORE local staging.
// Not an identity signature, production transport or certified document.
import {SYNC_STATE,assertDemoPending} from "./demoReceiptOutbox.mjs";
import {decryptDemoProof} from "./mobileProofVault.mjs";

const FORMAT="finai-portable-synthetic-outbox-v2";
const LEGACY="finai-portable-synthetic-outbox-v1";
const ROUNDS=250000;
const MAX_LENGTH=300000;
const FIELDS=["clientEventId","companyId","createdAt","documentId","envelope",
 "expectedVersion","id","serverVersion","state"];
const enc=new TextEncoder();

function exactKeys(value,keys){
 return !!value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).sort().join("|")===keys.slice().sort().join("|");
}
function validate(record,companyId){
 if(!exactKeys(record,FIELDS)||record.state!==SYNC_STATE.queued||
  record.serverVersion!==null||
  typeof record.createdAt!=="string"||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.createdAt)||
  Number.isNaN(Date.parse(record.createdAt))||
  !Number.isSafeInteger(record.expectedVersion)||record.expectedVersion<0)
  throw new Error("Prenos omogoča samo izvirni čakajoči šifrirani demo dogodek.");
 assertDemoPending(record,companyId);
 return record;
}
function strongPhrase(phrase){
 if(typeof phrase!=="string"||phrase.length<12||phrase.length>128)
  throw new Error("Za varen prenos je zahtevana lokalna testna fraza (12–128 znakov).");
 return phrase;
}
function asBase64(bytes){
 let binary="";
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary);
}
function fromBase64(value,exactBytes){
 if(typeof value!=="string"||value.length!==Math.ceil(exactBytes/3)*4||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
  throw new Error("Prenosni kriptografski podatki niso veljavni.");
 let bytes;
 try{bytes=Uint8Array.from(atob(value),x=>x.charCodeAt(0))}
 catch{throw new Error("Prenosni kriptografski podatki niso veljavni.");}
 if(bytes.length!==exactBytes||asBase64(bytes)!==value)
  throw new Error("Neveljavna kodirana vrednost prenosnega paketa.");
 return bytes;
}
async function macKey(phrase,salt){
 const input=enc.encode("finai.outbox.portable.v2|"+strongPhrase(phrase));
 const key=await crypto.subtle.importKey("raw",input,"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({
  name:"PBKDF2",salt,iterations:ROUNDS,hash:"SHA-256"
 },key,{name:"HMAC",hash:"SHA-256",length:256},false,["sign","verify"]);
}
function authenticatedPayload(companyId,payload){
 return enc.encode(FORMAT+"|"+companyId+"|"+payload);
}
export async function packPortableDemoOutbox(record,companyId,phrase){
 const safe=validate(record,companyId);
 strongPhrase(phrase);
 // A valid local checksum or ciphertext string is not sufficient; the AES-GCM
 // proof and its exact synthetic document must decrypt with this same phrase.
 await decryptDemoProof(safe.envelope,companyId,phrase);
 const payload=JSON.stringify(safe);
 if(payload.length>MAX_LENGTH)
  throw new Error("Šifrirani dogodek presega dovoljeno velikost.");
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await macKey(phrase,salt);
 const mac=await crypto.subtle.sign("HMAC",key,authenticatedPayload(companyId,payload));
 return JSON.stringify({
  format:FORMAT,companyId,iterations:ROUNDS,
  salt:asBase64(salt),mac:asBase64(new Uint8Array(mac)),payload
 });
}
export async function unpackPortableDemoOutbox(text,companyId,phrase){
 strongPhrase(phrase);
 if(typeof text!=="string"||text.length>MAX_LENGTH+768||
  !Number.isSafeInteger(companyId))
  throw new Error("Neveljaven prenosni sintetični paket.");
 let packet;
 try{packet=JSON.parse(text)}
 catch{throw new Error("Poškodovan prenosni paket.");}
 if(packet?.format===LEGACY)
  throw new Error("Stari paket v1 ni overjen. Izvozi novega v2 z izvirne naprave.");
 if(!exactKeys(packet,["format","companyId","iterations","salt","mac","payload"])||
  packet.format!==FORMAT||packet.companyId!==companyId||
  packet.iterations!==ROUNDS||typeof packet.payload!=="string"||
  packet.payload.length>MAX_LENGTH)
  throw new Error("Paket ne pripada izbranemu podjetju ali ima napačno shemo.");
 const salt=fromBase64(packet.salt,16),mac=fromBase64(packet.mac,32);
 const key=await macKey(phrase,salt);
 if(!await crypto.subtle.verify("HMAC",key,mac,
   authenticatedPayload(companyId,packet.payload)))
  throw new Error("Napačna fraza ali spremenjen podpisani demo dogodek.");
 let record;
 try{record=JSON.parse(packet.payload)}
 catch{throw new Error("Prenosni zapis ni veljaven.");}
 const safe=validate(record,companyId);
 await decryptDemoProof(safe.envelope,companyId,phrase);
 return safe;
}
