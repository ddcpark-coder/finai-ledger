// NEXT17C: browser-only test transport to the local Laravel synthetic review API.
// No provider credentials, production endpoint, customer data or background fetch.
const LOOPBACK=new Set(["localhost","127.0.0.1","[::1]"]);
export const REVIEW_TEST_API_BASE=(process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_COMMERCE_API_BASE??"").trim();

export function syntheticCommerceReviewAvailable(base=REVIEW_TEST_API_BASE,
 origin=typeof location==="undefined"?"":location.origin){
 try{
  const browser=new URL(origin),target=new URL(base);
  return LOOPBACK.has(browser.hostname)&&LOOPBACK.has(target.hostname)&&
   browser.origin===target.origin&&target.pathname.replace(/\/$/,"")==="/api";
 }catch{return false}
}
const exact=(x,keys)=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).sort().join("|")===keys.slice().sort().join("|");
function assertCompany(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1)
  throw new Error("Neveljavno sintetično podjetje.");
}
export function validateReviewRow(row){
 if(!exact(row,["id","external_order_id","provider","warehouse_id",
  "total_cents","line_count","status","demo_only","posting"])||
  !Number.isSafeInteger(row.id)||row.id<1||
  typeof row.external_order_id!=="string"||
  !/^SYN-[A-Z0-9-]{3,85}$/.test(row.external_order_id)||
  !["woocommerce","shopify"].includes(row.provider)||
  !Number.isSafeInteger(row.warehouse_id)||row.warehouse_id<1||
  !Number.isSafeInteger(row.total_cents)||row.total_cents<1||
  !Number.isSafeInteger(row.line_count)||row.line_count<1||row.line_count>10||
  !["review","reviewed","hold"].includes(row.status)||
  row.demo_only!==true||row.posting!==false)
  throw new Error("Nepričakovan, nesintetičen trgovinski zapis.");
 return row;
}
export function validateReviewPage(data){
 if(!exact(data,["items","next_cursor","demo_only","real_sync_enabled"])||
  data.demo_only!==true||data.real_sync_enabled!==false||
  !Array.isArray(data.items)||data.items.length>50||
  !(data.next_cursor===null||
    Number.isSafeInteger(data.next_cursor)&&data.next_cursor>0))
  throw new Error("Strežnik ni vrnil sintetične pregledne vrste.");
 const ids=new Set();
 for(const row of data.items){
  validateReviewRow(row);
  if(ids.has(row.id))throw new Error("Podvojen sintetični rezultat.");
  ids.add(row.id);
 }
 return data;
}
export function validateReviewDecision(data,id,decision){
 if(!exact(data,["id","status","replayed","demo_only","posting",
  "inventory_reserved","invoice_created"])||
  data.id!==id||data.status!==decision||
  typeof data.replayed!=="boolean"||data.demo_only!==true||
  data.posting!==false||data.inventory_reserved!==false||
  data.invoice_created!==false)
  throw new Error("Napačna potrditev sintetičnega pregleda.");
 return data;
}
function csrf(cookie){
 const pair=String(cookie??"").split("; ").find(x=>x.startsWith("XSRF-TOKEN="));
 return pair?decodeURIComponent(pair.slice("XSRF-TOKEN=".length)):null;
}
export function createSyntheticCommerceReviewClient({
 base=REVIEW_TEST_API_BASE,
 origin=typeof location==="undefined"?"":location.origin,
 fetcher=globalThis.fetch,
 cookie=()=>typeof document==="undefined"?"":document.cookie
}={}){
 if(!syntheticCommerceReviewAvailable(base,origin))
  throw new Error("Pregledna vrsta je dosegljiva samo na prijavljenem lokalnem testnem strežniku.");
 const prefix=base.replace(/\/$/,"");
 async function request(method,url,body){
  if(!syntheticCommerceReviewAvailable(base,origin))
   throw new Error("Testni strežnik ni dovoljen.");
  let token;
  if(method==="POST"){
   const preflight=await fetcher(origin+"/sanctum/csrf-cookie",{
    method:"GET",credentials:"include",cache:"no-store",
    headers:{"Accept":"application/json"}
   });
   if(!preflight.ok)throw Object.assign(new Error("CSRF seja ni pripravljena."),
    {status:preflight.status});
   token=csrf(cookie());
   if(!token)throw new Error("Manjka CSRF testnega uporabnika.");
  }
  const response=await fetcher(url,{
   method,credentials:"include",cache:"no-store",
   headers:{
    "Accept":"application/json","X-Requested-With":"XMLHttpRequest",
    ...(method==="POST"?{"Content-Type":"application/json","X-XSRF-TOKEN":token}:{})
   },
   ...(body?{body:JSON.stringify(body)}:{})
  });
  if(!response.ok){
   const status=response.status;
   const message=status===401?"Lokalna seja ni prijavljena.":
    status===403?"Uporabnik nima pravice pregledovanja ali odločanja.":
    status===404?"Testni trgovinski modul ni omogočen.":
    status===409?"Podatki so spremenjeni ali je odločitev že zaključena.":
    "Testni API je vrnil "+status+".";
   throw Object.assign(new Error(message),{status});
  }
  return (await response.json()).data;
 }
 return {
  async list(companyId,{afterId=0,limit=20}={}){
   assertCompany(companyId);
   if(!Number.isSafeInteger(afterId)||afterId<0||
    !Number.isSafeInteger(limit)||limit<1||limit>50)
    throw new Error("Neveljavna stran sintetičnih naročil.");
   const data=await request("GET",prefix+"/companies/"+companyId+
    "/demo/commerce-review?after_id="+afterId+"&limit="+limit);
   return validateReviewPage(data);
  },
  async decide(companyId,id,decision){
   assertCompany(companyId);
   if(!Number.isSafeInteger(id)||id<1||!["reviewed","hold"].includes(decision))
    throw new Error("Nedovoljena sintetična odločitev.");
   const data=await request("POST",prefix+"/companies/"+companyId+
    "/demo/commerce-review/"+id+"/decision",{decision});
   return validateReviewDecision(data,id,decision);
  }
 };
}
