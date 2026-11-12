// Synthetic-only sync transport. No production path and NEVER automatic upload.
// Explicit localhost + build flag + session CSRF guard. Production can't call it,
// even if the build flag is accidentally enabled.
import {deliverySample} from "./demoDeliveryProof.mjs";

export const SYNC_DEMO_API_BASE=(process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_SYNC_API_BASE??"").trim();
const LOOPBACK=new Set(["localhost","127.0.0.1","[::1]"]);
export function syntheticSyncAvailable(base=SYNC_DEMO_API_BASE,origin=
  typeof location==="undefined"?"":location.origin){
 try{
  const browser=new URL(origin),target=new URL(base);
  return LOOPBACK.has(browser.hostname)&&LOOPBACK.has(target.hostname)
    &&browser.origin===target.origin&&target.pathname.replace(/\/$/,"")==="/api";
 }catch{return false}
}
function assertSession(base,origin){
 if(!syntheticSyncAvailable(base,origin))
  throw new Error("Testna sinhronizacija je na voljo samo v lokalnem FinAI razvojnem okolju.");
}
function urlFor(base,companyId){
 const doc=deliverySample(companyId);
 return base.replace(/\/$/,"")+"/companies/"+companyId+
  "/demo/sync-receipts/"+encodeURIComponent(doc.id);
}
function csrfToken(cookie){
 const field=String(cookie??"").split("; ").find(item=>item.startsWith("XSRF-TOKEN="));
 return field?decodeURIComponent(field.slice("XSRF-TOKEN=".length)):null;
}
export function createSyntheticSyncClient({
 base=SYNC_DEMO_API_BASE,origin=typeof location==="undefined"?"":location.origin,
 fetcher=globalThis.fetch,cookie=()=>typeof document==="undefined"?"":document.cookie
}={}){
 assertSession(base,origin);
 const request=async (method,path,body)=>{
  assertSession(base,origin);
  let xsrf;
  if(method==="POST"){
   const init=await fetcher(origin+"/sanctum/csrf-cookie",{
    method:"GET",credentials:"include",cache:"no-store",headers:{"Accept":"application/json"}
   });
   if(!init.ok)throw Object.assign(new Error("Preverjanje lokalne seje ni uspelo."),{status:init.status});
   xsrf=csrfToken(cookie());
   if(!xsrf)throw new Error("Manjka CSRF zaščita lokalne testne seje.");
  }
  const response=await fetcher(path,{
   method,credentials:"include",cache:"no-store",
   headers:{
    "Accept":"application/json","X-Requested-With":"XMLHttpRequest",
    ...(method==="POST"?{"Content-Type":"application/json","X-XSRF-TOKEN":xsrf}:{})
   },
   ...(method==="POST"?{body:JSON.stringify(body)}:{})
  });
  if(!response.ok){
   const message=response.status===409
    ?"Konflikt različic: lokalni zapis ni bil prepisan."
    :response.status===401||response.status===403
      ?"Dostop do testne sinhronizacije ni dovoljen."
      :"Testni strežnik ni dosegljiv ("+response.status+").";
   throw Object.assign(new Error(message),{status:response.status});
  }
  const data=(await response.json()).data;
  if(data?.demo_only!==true||data?.real_sync_enabled!==false)
   throw new Error("Nepričakovan odgovor testnega sinhronizacijskega API-ja.");
  return data;
 };
 return {
  status(companyId){return request("GET",urlFor(base,companyId))},
  latest(companyId){return request("GET",urlFor(base,companyId)+"/latest")},
  upload(companyId,{eventId,expectedVersion,envelope}){
   if(typeof eventId!=="string"||!Number.isInteger(expectedVersion)||
     expectedVersion<0||!envelope||envelope.companyId!==companyId||
     envelope.documentId!==deliverySample(companyId).id)
    throw new Error("Neveljaven lokalni sintetični dogodek.");
   return request("POST",urlFor(base,companyId),{
    client_event_id:eventId,expected_version:expectedVersion,envelope
   });
  }
 };
}

// The upload plan is pure/testable. A second device must NOT overwrite a
// newer remote version without explicit human conflict review.
export function planSyntheticUpload({remoteVersion,ackVersion,localEnvelope,remoteEnvelope}){
 if(!Number.isInteger(remoteVersion)||remoteVersion<0)
  throw new Error("Neveljavna strežniška različica.");
 if(!localEnvelope) return {state:"no-local-proof"};
 if(remoteVersion>0&&ackVersion!==remoteVersion)
  return {state:"conflict",remoteVersion};
 if(remoteEnvelope&&JSON.stringify(localEnvelope)===JSON.stringify(remoteEnvelope))
  return {state:"already-synced",remoteVersion};
 return {state:"ready",expectedVersion:remoteVersion};
}
