// FinAI NEXT19 — one-click on-device diagnostic using synthetic temporary data.
// No server calls, production credentials, PII, raw device IDs or user documents.
const FORMAT="finai-synthetic-mobile-readiness-v1";
const CACHE_PREFIX="finai-field-demo-";

function check(code,label,state,note){
 return {code,label,state,note};
}
async function probeIndexedDb(idb,cryptoAPI){
 if(!idb?.open||!idb?.deleteDatabase)throw Error("IndexedDB is unavailable");
 const random=cryptoAPI?.randomUUID?.();
 if(!random||!/^[a-f0-9-]{36}$/i.test(random))
  throw Error("Random UUID unavailable");
 const dbName="finai-synthetic-diagnostic-"+random;
 let db;
 try{
  db=await new Promise((resolve,reject)=>{
   const r=idb.open(dbName,1);
   r.onupgradeneeded=()=>r.result.createObjectStore("test");
   r.onerror=()=>reject(Error("IndexedDB open failed"));
   r.onsuccess=()=>resolve(r.result);
   r.onblocked=()=>reject(Error("IndexedDB blocked"));
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction("test","readwrite");
   tx.objectStore("test").put("synthetic","probe");
   tx.oncomplete=resolve;
   tx.onerror=()=>reject(Error("IndexedDB write failed"));
   tx.onabort=()=>reject(Error("IndexedDB transaction aborted"));
  });
  const result=await new Promise((resolve,reject)=>{
   const tx=db.transaction("test","readonly");
   const rq=tx.objectStore("test").get("probe");
   rq.onsuccess=()=>resolve(rq.result);
   rq.onerror=()=>reject(Error("IndexedDB read failed"));
  });
  if(result!=="synthetic")throw Error("IndexedDB did not roundtrip synthetic data");
 }finally{
  try{db?.close()}catch{}
  // A uniquely named database may contain only this ephemeral test value.
  // Never inspect or delete FinAI's actual synthetic proof / outbox stores.
  try{
   await new Promise(resolve=>{
    const r=idb.deleteDatabase(dbName);
    r.onsuccess=resolve;r.onerror=resolve;r.onblocked=resolve;
   });
  }catch{}
 }
}
async function probeCrypto(cryptoAPI){
 if(!cryptoAPI?.subtle||!cryptoAPI?.getRandomValues)
  throw Error("Web Crypto unavailable");
 const bytes=new Uint8Array(12),salt=new Uint8Array(16);
 cryptoAPI.getRandomValues(bytes);
 cryptoAPI.getRandomValues(salt);
 const material=await cryptoAPI.subtle.importKey("raw",
  new TextEncoder().encode("FINAI-ONLY-SYNTHETIC-CHECK"),"PBKDF2",false,["deriveKey"]);
 const key=await cryptoAPI.subtle.deriveKey({
  name:"PBKDF2",hash:"SHA-256",iterations:1000,salt
 },material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 const raw=new TextEncoder().encode("synthetic-only");
 const sealed=await cryptoAPI.subtle.encrypt({name:"AES-GCM",iv:bytes},key,raw);
 const opened=await cryptoAPI.subtle.decrypt({name:"AES-GCM",iv:bytes},key,sealed);
 if(new TextDecoder().decode(opened)!=="synthetic-only")
  throw Error("Web Crypto roundtrip mismatch");
}
/**
 * A useful local capability check, NOT a security clearance or a real
 * two-device transfer test. All returned labels are fixed, no hardware/PII.
 */
export async function diagnoseFieldDevice({
 context=globalThis,storage=context.navigator?.storage,
 clock=()=>new Date().toISOString()
}={}){
 const nav=context.navigator??{},results=[];
 const secure=Boolean(context.isSecureContext);
 results.push(check("secure","Varen kontekst",secure?"pass":"fail",
  secure?"HTTPS oziroma zaupanja vreden localhost":"Za šifrirano PWA je potreben varen kontekst"));
 try{
  await probeCrypto(context.crypto);
  results.push(check("crypto","Lokalna kriptografija","pass",
   "PBKDF2 in AES-GCM sta uspešno preverjena s sintetičnim vzorcem"));
 }catch{
  results.push(check("crypto","Lokalna kriptografija","fail",
   "Preverjanje PBKDF2/AES-GCM ni uspelo"));
 }
 try{
  await probeIndexedDb(context.indexedDB,context.crypto);
  results.push(check("indexeddb","Lokalna shramba","pass",
   "Začasni sintetični zapis je bil ustvarjen, prebran in odstranjen"));
 }catch{
  results.push(check("indexeddb","Lokalna shramba","fail",
   "Lokalno pisanje ali branje začasnega testa ni uspelo"));
 }
 try{
  const worker=nav.serviceWorker;
  if(!worker?.getRegistration)throw Error("No service worker support");
  const reg=await worker.getRegistration("/field/");
  results.push(check("service-worker","Offline storitev",
   reg?.active?"pass":"warn",
   reg?.active?"Service Worker je aktiven":"Po prvi namestitvi ponovno odpri zaslon"));
 }catch{
  results.push(check("service-worker","Offline storitev","warn",
   "Namestitev Service Workerja ni potrjena"));
 }
 try{
  const keys=await context.caches?.keys?.();
  results.push(check("offline-cache","Offline predpomnilnik",
   Array.isArray(keys)&&keys.some(k=>k.startsWith(CACHE_PREFIX))?"pass":"warn",
   Array.isArray(keys)&&keys.some(k=>k.startsWith(CACHE_PREFIX))
    ?"Predpomnilnik mobilnega vmesnika je prisoten"
    :"Odpri zaslon ob povezavi, nato ga ponovno zaženi"));
 }catch{
  results.push(check("offline-cache","Offline predpomnilnik","warn",
   "Offline predpomnilnika ni mogoče preveriti"));
 }
 try{
  const persistent=await storage?.persisted?.();
  results.push(check("persistence","Trajnost lokalne shrambe",
   persistent===true?"pass":"warn",persistent===true
    ?"Brskalnik potrjuje trajno shrambo"
    :"Brskalnik lahko odstrani lokalne podatke; ohrani prenosno kopijo"));
 }catch{
  results.push(check("persistence","Trajnost lokalne shrambe","warn",
   "Trajnosti shrambe ni mogoče potrditi"));
 }
 results.push(check("network","Stanje povezave","info",
  nav.onLine===false?"Naprava poroča brez povezave":
   "Status omrežja ni dokaz dosegljivosti strežnika"));
 const outcome=results.some(x=>x.state==="fail")?"fail":
  results.some(x=>x.state==="warn")?"review":"pass";
 return {
  format:FORMAT,synthetic_only:true,real_data_allowed:false,
  production_approved:false,server_contacted:false,
  timestamp:clock(),outcome,checks:results
 };
}
export function validateFieldDiagnostic(report){
 const expected=["secure","crypto","indexeddb","service-worker",
  "offline-cache","persistence","network"];
 if(!report||typeof report!=="object"||Array.isArray(report)||
  Object.keys(report).sort().join("|")!==
   "checks|format|outcome|production_approved|real_data_allowed|server_contacted|synthetic_only|timestamp"||
  typeof report.timestamp!=="string"||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.timestamp)||
  report?.format!==FORMAT||report.synthetic_only!==true||
  report.real_data_allowed!==false||report.production_approved!==false||
  report.server_contacted!==false||
  !["fail","review","pass"].includes(report.outcome)||
  !Array.isArray(report.checks)||
  report.checks.length!==expected.length||
  report.checks.some((x,i)=>x?.code!==expected[i]||
   !["pass","fail","warn","info"].includes(x.state)||
   typeof x.label!=="string"||typeof x.note!=="string"||
   Object.keys(x).sort().join("|")!=="code|label|note|state"))
  throw Error("Neveljavno sintetično diagnostično poročilo");
 return report;
}
