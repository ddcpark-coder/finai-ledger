import {normalizeContextRoute,sanitizeFavoriteRoutes} from "../modules/contextRoute.mjs";

const apiBase=process.env.NEXT_PUBLIC_FINAI_API_BASE_URL?.trim().replace(/\/$/,"")??"";

export function workspaceApiConfigured(){
  return apiBase.length>0;
}

function endpoint(companyId){
  if(!Number.isInteger(Number(companyId))||Number(companyId)<1)throw new Error("Neveljavno podjetje");
  return apiBase+"/companies/"+encodeURIComponent(companyId)+"/my/workspace-preferences";
}

export function normalizeServerPreferences(raw){
  const body=raw?.data??raw??{};
  return {
    version:Number.isInteger(body.version)?body.version:0,
    last_route:body.last_route?normalizeContextRoute(body.last_route):null,
    favorites:sanitizeFavoriteRoutes(body.favorites??[]),
    appearance:{
      theme:body.appearance?.theme==="light"?"light":"dark",
      density:body.appearance?.density==="compact"?"compact":"comfortable"
    }
  };
}

function xsrfToken(){
  if(typeof document==="undefined")return null;
  const token=document.cookie.split("; ").find(c=>c.startsWith("XSRF-TOKEN="));
  if(!token)return null;
  return decodeURIComponent(token.substring("XSRF-TOKEN=".length));
}

async function request(method,companyId,body,signal){
  if(!workspaceApiConfigured())return null;
  let token=null;
  if(method!=="GET"){
    const url=new URL(apiBase);
    // Stateful Sanctum requires a session CSRF cookie before unsafe requests.
    const csrf=await fetch(url.origin+"/sanctum/csrf-cookie",{
      method:"GET",credentials:"include",cache:"no-store",
      headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"},
      ...(signal?{signal}:{})
    });
    if(!csrf.ok)throw new Error("Sanctum CSRF cookie is unavailable ("+csrf.status+")");
    token=xsrfToken();
    if(!token)throw new Error("XSRF-TOKEN cookie unavailable; use same-site first-party app/api domains.");
  }
  const response=await fetch(endpoint(companyId),{
    method,credentials:"include",cache:"no-store",
    headers:{
      "Accept":"application/json","X-Requested-With":"XMLHttpRequest",
      ...(method==="PUT"?{"Content-Type":"application/json","X-XSRF-TOKEN":token}:{})
    },
    ...(body?{body:JSON.stringify(body)}:{}),
    ...(signal?{signal}:{})
  });
  if(!response.ok){
    const error=new Error("Workspace preferences API status "+response.status);
    error.status=response.status;
    throw error;
  }
  return normalizeServerPreferences(await response.json());
}

export function fetchWorkspacePreferences(companyId,signal){
  return request("GET",companyId,null,signal);
}

export function saveWorkspacePreferences(companyId,payload,signal){
  return request("PUT",companyId,payload,signal);
}
