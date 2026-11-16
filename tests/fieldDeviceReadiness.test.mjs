import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {diagnoseFieldDevice,validateFieldDiagnostic}
 from "../app/field/deviceReadiness.mjs";

function fakeDb(){
 const store=new Map();
 const db={
  createObjectStore(){},
  close(){},
  transaction(){
   const tx={
    objectStore(){
     return {
      put(value,key){
       queueMicrotask(()=>{store.set(key,value);tx.oncomplete?.()});
       return {};
      },
      get(key){
       const req={};
       queueMicrotask(()=>{req.result=store.get(key);req.onsuccess?.()});
       return req;
      }
     };
    }
   };
   return tx;
  }
 };
 let created=0,deleted=0;
 return {
  get created(){return created},
  get deleted(){return deleted},
  open(){
   const req={result:db};
   queueMicrotask(()=>{created++;req.onupgradeneeded?.();req.onsuccess?.()});
   return req;
  },
  deleteDatabase(){
   const req={};
   queueMicrotask(()=>{deleted++;req.onsuccess?.()});
   return req;
  }
 };
}
function fakeContext(overrides={}){
 return {
  isSecureContext:true,crypto:webcrypto,indexedDB:fakeDb(),
  navigator:{
   onLine:false,
   serviceWorker:{getRegistration:async()=>({active:true})},
   storage:{persisted:async()=>true}
  },
  caches:{keys:async()=>["finai-field-demo-test"]},
  fetch:()=>{throw Error("must not fetch")},
  ...overrides
 };
}
test("synthetic device diagnostic checks crypto+temporary IndexedDB then deletes only its own database",async()=>{
 const context=fakeContext(),report=await diagnoseFieldDevice({
  context,clock:()=> "2026-11-16T17:00:00.000Z"
 });
 assert.equal(report.outcome,"pass");
 assert.equal(report.server_contacted,false);
 assert.equal(report.real_data_allowed,false);
 assert.equal(report.production_approved,false);
 assert.equal(report.synthetic_only,true);
 assert.equal(context.indexedDB.created,1);
 assert.equal(context.indexedDB.deleted,1);
 assert.equal(report.checks.length,7);
 assert.equal(report.checks.filter(x=>x.state==="pass").length,6);
 assert.equal(report.checks.at(-1).state,"info");
 assert.equal(validateFieldDiagnostic(report),report);
 const raw=JSON.stringify(report);
 for(const fragment of ["userAgent","clientEventId","password","companyId",
  "documentId","evidenceSha256","signatureDataUrl","indexeddbName"])
  assert.ok(!raw.includes(fragment),fragment);
});
test("unsupported or insecure mobile browser fails closed without a server call",async()=>{
 const context=fakeContext({
  isSecureContext:false,crypto:null,indexedDB:null,
  navigator:{onLine:true,serviceWorker:null,storage:null},
  caches:null
 });
 const report=await diagnoseFieldDevice({
  context,clock:()=> "2026-11-16T17:00:00.000Z"
 });
 assert.equal(report.outcome,"fail");
 assert.equal(report.checks.find(x=>x.code==="secure").state,"fail");
 assert.equal(report.checks.find(x=>x.code==="crypto").state,"fail");
 assert.equal(report.checks.find(x=>x.code==="indexeddb").state,"fail");
 assert.equal(report.checks.find(x=>x.code==="offline-cache").state,"warn");
});
test("missing offline pre-cache and nonpersistent storage require manual inspection, not fake pass",async()=>{
 const context=fakeContext({
  caches:{keys:async()=>[]},
  navigator:{
   onLine:false,
   serviceWorker:{getRegistration:async()=>null},
   storage:{persisted:async()=>false}
  }
 });
 const report=await diagnoseFieldDevice({
  context,clock:()=> "2026-11-16T17:00:00.000Z"
 });
 assert.equal(report.outcome,"review");
 for(const code of ["service-worker","offline-cache","persistence"])
  assert.equal(report.checks.find(x=>x.code===code).state,"warn");
});
test("export validation rejects a forged or PII-enriched QA report",async()=>{
 const report=await diagnoseFieldDevice({
  context:fakeContext(),clock:()=> "2026-11-16T17:00:00.000Z"
 });
 for(const changed of [
  {...report,privateKey:"fake"},
  {...report,server_contacted:true},
  {...report,production_approved:true},
  {...report,real_data_allowed:true},
  {...report,timestamp:"today"},
  {...report,checks:[...report.checks,{code:"pii",label:"PII",note:"data",state:"pass"}]},
  {...report,checks:[{...report.checks[0],secret:"hidden"},...report.checks.slice(1)]}
 ])assert.throws(()=>validateFieldDiagnostic(changed));
});
