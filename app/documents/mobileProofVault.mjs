// Browser-only, synthetic evidence encryption. NOT cloud sync or certified archiving.
// No credentials, passwords, encryption keys or plaintext are written into IndexedDB.
import {deliverySample,verifyDemoDelivery} from "./demoDeliveryProof.mjs";

const FORMAT="finai-mobile-synthetic-vault-v1";
const ITERATIONS=250000;
const MAX_BYTES=900000;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const base64=bytes=>{
 let result="";
 for(let i=0;i<bytes.length;i+=8192)
   result+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(result);
};
const unbase64=(value,maxChars)=>{
 if(typeof value!=="string"||value.length<1||value.length>maxChars||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
   throw new Error("Neveljavno šifrirano dokazilo.");
 return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
};
const assertCompany=id=>{
 if(!Number.isSafeInteger(id)||![1,2,3].includes(id))
   throw new Error("Neveljavno sintetično podjetje.");
 return deliverySample(id);
};
const password=text=>{
 if(typeof text!=="string"||text.length<12||text.length>128)
   throw new Error("Lokalno geslo mora vsebovati 12–128 znakov.");
 return text;
};
async function derive(passphrase,salt){
 const material=await crypto.subtle.importKey("raw",encoder.encode(password(passphrase)),
  "PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",iterations:ITERATIONS,salt},
  material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
function aad(companyId,documentId){
 return encoder.encode(FORMAT+"|"+companyId+"|"+documentId);
}
export async function encryptDemoProof(proof,companyId,passphrase){
 const doc=assertCompany(companyId);
 if(!await verifyDemoDelivery(proof,companyId)||proof.documentId!==doc.id)
   throw new Error("Dokazilo ni preverjeno ali ne pripada podjetju.");
 const raw=encoder.encode(JSON.stringify(proof));
 if(raw.length<1||raw.length>MAX_BYTES)throw new Error("Demo dokazilo presega dovoljeno velikost.");
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(passphrase,salt);
 const cipher=await crypto.subtle.encrypt({
  name:"AES-GCM",iv,additionalData:aad(companyId,doc.id),tagLength:128
 },key,raw);
 return {format:FORMAT,companyId,documentId:doc.id,version:1,
  iterations:ITERATIONS,salt:base64(salt),iv:base64(iv),
  ciphertext:base64(new Uint8Array(cipher))};
}
export async function decryptDemoProof(envelope,companyId,passphrase){
 const doc=assertCompany(companyId);
 if(!envelope||envelope.format!==FORMAT||envelope.companyId!==companyId||
   envelope.documentId!==doc.id||envelope.version!==1||
   envelope.iterations!==ITERATIONS)
   throw new Error("Dokazilo ni namenjeno izbranemu podjetju.");
 try{
   const salt=unbase64(envelope.salt,32),iv=unbase64(envelope.iv,24);
   const ciphertext=unbase64(envelope.ciphertext,1300000);
   if(salt.length!==16||iv.length!==12||ciphertext.length<16)
     throw new Error("Bad encrypted payload");
   const key=await derive(passphrase,salt);
   const plain=await crypto.subtle.decrypt({
     name:"AES-GCM",iv,additionalData:aad(companyId,doc.id),tagLength:128
   },key,ciphertext);
   const proof=JSON.parse(decoder.decode(plain));
   if(!await verifyDemoDelivery(proof,companyId))
     throw new Error("Evidence verification failed");
   return proof;
 }catch{
   throw new Error("Obnova ni uspela: napačno geslo ali spremenjeno dokazilo.");
 }
}
const DB="finai-synthetic-proof-vault-v1",STORE="proofs";
const keyFor=companyId=>companyId+":"+assertCompany(companyId).id;
function openDb(){
 if(typeof indexedDB==="undefined")throw new Error("Lokalna šifrirana hramba v tem brskalniku ni na voljo.");
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains(STORE))
      request.result.createObjectStore(STORE,{keyPath:"id"});
  };
  request.onerror=()=>reject(new Error("Lokalne baze ni mogoče odpreti."));
  request.onsuccess=()=>resolve(request.result);
 });
}
async function dbOperation(companyId,mode,apply){
 const id=keyFor(companyId);
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  const request=apply(tx.objectStore(STORE),id);
  let value;
  request.onsuccess=()=>{value=request.result};
  request.onerror=()=>reject(new Error("Operacija lokalne hrambe ni uspela."));
  tx.oncomplete=()=>{db.close();resolve(value)};
  tx.onerror=()=>{db.close();reject(new Error("Lokalna baza je zavrnila operacijo."))};
  tx.onabort=()=>{db.close();reject(new Error("Lokalna operacija je bila preklicana."))};
 });
}
export async function storeEncryptedDemoProof(envelope,companyId){
 if(!envelope||envelope.companyId!==companyId||
   envelope.documentId!==assertCompany(companyId).id||envelope.format!==FORMAT)
   throw new Error("Neveljavno lokalno dokazilo.");
 await dbOperation(companyId,"readwrite",(store,id)=>
   store.put({id,envelope}));
}
export async function readEncryptedDemoProof(companyId){
 const row=await dbOperation(companyId,"readonly",(store,id)=>store.get(id));
 return row?.envelope??null;
}
export async function deleteEncryptedDemoProof(companyId){
 await dbOperation(companyId,"readwrite",(store,id)=>store.delete(id));
}
