const apiBase=process.env.NEXT_PUBLIC_FINAI_API_BASE_URL?.trim().replace(/\/$/,"")??"";

export function authApiConfigured(){
  return /^https?:\/\//.test(apiBase);
}

const origin=authApiConfigured()?new URL(apiBase).origin:"";

function xsrfToken(){
  if(typeof document==="undefined")return null;
  const entry=document.cookie.split("; ").find(value=>value.startsWith("XSRF-TOKEN="));
  if(!entry)return null;
  try{return decodeURIComponent(entry.substring("XSRF-TOKEN=".length));}catch{return null;}
}

export async function authRequest(method,path,payload=null){
  if(!authApiConfigured())throw new Error("API ni konfiguriran.");
  if(!/^\/(api\/me|login|logout|two-factor-challenge|user\/[a-z-]+)$/.test(path)){
    throw new Error("Nepodprta prijavna pot.");
  }
  let token;
  if(method!=="GET"){
    const csrf=await fetch(origin+"/sanctum/csrf-cookie",{
      method:"GET",credentials:"include",cache:"no-store",
      headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}
    });
    if(!csrf.ok)throw new Error("CSRF zaščita ni dosegljiva.");
    token=xsrfToken();
    if(!token)throw new Error("Piškotek XSRF-TOKEN ni dosegljiv. Preveri first-party domeni.");
  }
  const response=await fetch(origin+path,{
    method,credentials:"include",cache:"no-store",
    headers:{
      "Accept":"application/json","X-Requested-With":"XMLHttpRequest",
      ...(payload?{"Content-Type":"application/json"}:{}),
      ...(token?{"X-XSRF-TOKEN":token}:{})
    },
    ...(payload?{body:JSON.stringify(payload)}:{})
  });
  let body=null;
  if(response.status!==204){
    try{body=await response.json();}catch{}
  }
  if(!response.ok){
    const error=new Error(body?.message || "Zahteva ni uspela ("+response.status+").");
    error.status=response.status;
    throw error;
  }
  return body;
}

export function fetchAuthMe(){return authRequest("GET","/api/me");}
