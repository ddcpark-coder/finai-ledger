import {normalizeView} from "./workspacePersonalization.mjs";

// The API is deliberately absent in the static GitHub preview. Without a
// verified first-party authenticated backend, preferences stay local only.
const apiBase=process.env.NEXT_PUBLIC_FINAI_API_BASE_URL?.trim().replace(/\/$/,"")??"";

export function adaptiveApiConfigured(){
 return apiBase.length>0;
}

function endpoint(companyId,moduleKey,viewKey){
 if(!Number.isSafeInteger(companyId)||companyId<1)throw new Error("Neveljavno podjetje.");
 if(typeof moduleKey!=="string"||!/^[a-z_]{2,48}$/.test(moduleKey))
   throw new Error("Neveljaven modul.");
 if(typeof viewKey!=="string"||viewKey.length<1||viewKey.length>160)
   throw new Error("Neveljaven podpogled.");
 return apiBase+"/companies/"+encodeURIComponent(companyId)
   +"/my/adaptive-views/"+encodeURIComponent(moduleKey)
   +"?view="+encodeURIComponent(viewKey);
}

function cookieXsrf(){
 if(typeof document==="undefined")return null;
 const value=document.cookie.split("; ").find(x=>x.startsWith("XSRF-TOKEN="));
 return value?decodeURIComponent(value.slice("XSRF-TOKEN=".length)):null;
}

function decode(raw){
 const data=raw?.data??{};
 return {
   version:Number.isInteger(data.version)&&data.version>=0?data.version:0,
   settings:data.settings==null?null:normalizeView(data.settings)
 };
}

async function request(method,companyId,moduleKey,viewKey,payload,signal){
 if(!adaptiveApiConfigured())return null;
 let xsrf=null;
 if(method==="PUT"){
   const base=new URL(apiBase);
   const response=await fetch(base.origin+"/sanctum/csrf-cookie",{
     method:"GET",credentials:"include",cache:"no-store",
     headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"},
     ...(signal?{signal}:{})
   });
   if(!response.ok)throw new Error("CSRF cookie unavailable ("+response.status+")");
   xsrf=cookieXsrf();
   if(!xsrf)throw new Error("CSRF cookie is missing; use a first-party domain.");
 }
 const response=await fetch(endpoint(companyId,moduleKey,viewKey),{
   method,credentials:"include",cache:"no-store",
   headers:{
     "Accept":"application/json","X-Requested-With":"XMLHttpRequest",
     ...(method==="PUT"?{"Content-Type":"application/json","X-XSRF-TOKEN":xsrf}:{})
   },
   ...(method==="PUT"?{body:JSON.stringify(payload)}:{}),
   ...(signal?{signal}:{})
 });
 if(!response.ok){
   const error=new Error("Adaptive profile HTTP "+response.status);
   error.status=response.status;
   throw error;
 }
 return decode(await response.json());
}

export function fetchAdaptiveView(companyId,moduleKey,viewKey,signal){
 return request("GET",companyId,moduleKey,viewKey,null,signal);
}
export function saveAdaptiveView(companyId,moduleKey,viewKey,settings,expectedVersion){
 return request("PUT",companyId,moduleKey,viewKey,{
   ...normalizeView(settings),
   expected_version:expectedVersion
 });
}
