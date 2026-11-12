// Explicitly opted-in synthetic integration only; never enabled on public preview.
// The static production export has no test flag and cannot submit an outbox event.
import {deliverySample} from "../documents/demoDeliveryProof.mjs";
import {assertDemoPending,syncRequestPayload,markSyncConflict,markSyncAccepted} from "../documents/demoReceiptOutbox.mjs";

const TEST_API=process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_SYNC_TEST_API_BASE??"";
export function testSyncConfigured(href=typeof location!=="undefined"?location.href:""){
 try{
  const current=new URL(href);
  return TEST_API==="/api" &&
   ["localhost","127.0.0.1"].includes(current.hostname) &&
   ["http:","https:"].includes(current.protocol);
 }catch{return false}
}
export function syntheticSyncEndpoint(companyId,href=typeof location!=="undefined"?location.href:""){
 if(!testSyncConfigured(href))throw new Error("Testni strežniški prenos ni omogočen.");
 const doc=deliverySample(companyId);
 const current=new URL(href);
 return current.origin+"/api/companies/"+companyId+
  "/demo/sync-receipts/"+encodeURIComponent(doc.id);
}
function xsrfToken(cookieText){
 const token=String(cookieText).split("; ").find(part=>part.startsWith("XSRF-TOKEN="));
 return token?decodeURIComponent(token.slice("XSRF-TOKEN=".length)):null;
}
async function responseJson(response){
 let body;
 try{body=await response.json()}catch{throw new Error("Testni strežnik ni vrnil veljavnega odgovora.");}
 return body?.data??null;
}
export async function fetchDemoSyncStatus(companyId,{
 fetcher=fetch,href=location.href
}={}){
 const endpoint=syntheticSyncEndpoint(companyId,href);
 const response=await fetcher(endpoint,{
  method:"GET",credentials:"include",cache:"no-store",redirect:"error",
  headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}
 });
 if(!response.ok){const error=new Error("Stanje demo prenosa ni dosegljivo ("+response.status+").");error.status=response.status;throw error;}
 const status=await responseJson(response);
 const doc=deliverySample(companyId);
 if(status?.company_id!==companyId||status.document_id!==doc.id||
  status.demo_only!==true||status.real_sync_enabled!==false||
  !Number.isSafeInteger(status.version)||status.version<0)
  throw new Error("Testni strežnik je vrnil neustrezno stanje.");
 return status;
}
export async function sendDemoOutbox(record,companyId,{
 fetcher=fetch,href=location.href,cookie=typeof document!=="undefined"?document.cookie:""
}={}){
 assertDemoPending(record,companyId);
 const endpoint=syntheticSyncEndpoint(companyId,href);
 // POST first with the immutable UUID: Laravel can acknowledge a prior delivery
 // whose response was lost. Pre-checking versions here would break idempotent retry.
 const origin=new URL(endpoint).origin;
 const csrf=await fetcher(origin+"/sanctum/csrf-cookie",{
  method:"GET",credentials:"include",cache:"no-store",redirect:"error",
  headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}
 });
 if(!csrf.ok)throw new Error("Prijava oziroma zaščita CSRF ni na voljo.");
 const token=xsrfToken(cookie||typeof document!=="undefined"&&document.cookie||"");
 if(!token)throw new Error("Piškotek CSRF ni na voljo; prijavi se v testno okolje.");
 const response=await fetcher(endpoint,{
  method:"POST",credentials:"include",cache:"no-store",redirect:"error",
  headers:{"Accept":"application/json","Content-Type":"application/json",
   "X-Requested-With":"XMLHttpRequest","X-XSRF-TOKEN":token},
  body:JSON.stringify(syncRequestPayload(record,companyId))
 });
 if(response.status===409){
  const refreshed=await fetchDemoSyncStatus(companyId,{fetcher,href});
  return {kind:"conflict",record:markSyncConflict(record,companyId,refreshed.version)};
 }
 if(!response.ok){
  const error=new Error("Testni prenos ni uspel ("+response.status+"); kopija ostaja lokalno.");
  error.status=response.status;throw error;
 }
 const ack=await responseJson(response);
 return {kind:"acknowledged",record:markSyncAccepted(record,companyId,ack)};
}
