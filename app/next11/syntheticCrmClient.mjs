// NEXT12: explicit/manual local-only synthetic CRM API bridge.
// No automatic network traffic; no production CRM write or offline synchronization.
export const SYNTHETIC_CRM_API_BASE =
 (process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_CRM_API_BASE ?? "").trim();

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const STAGES = Object.freeze({
  Kvalifikacija:"qualification",
  Odkrivanje:"discovery",
  Ponudba:"proposal",
  Pogajanja:"negotiation",
  Pridobljeno:"won",
});
const REVERSE = Object.freeze(Object.fromEntries(
  Object.entries(STAGES).map(([label,stage])=>[stage,label])
));
const DEAL = /^SYN-CRM-[A-Z0-9-]{2,40}$/;
const UNIT = /^[A-Z0-9-]{2,24}$/;

export function syntheticCrmAvailable(
 base=SYNTHETIC_CRM_API_BASE,
 origin=typeof location==="undefined"?"":location.origin
){
 try {
  const page=new URL(origin),api=new URL(base);
  return LOOPBACK.has(page.hostname)&&LOOPBACK.has(api.hostname)&&
   api.origin===page.origin&&api.pathname.replace(/\/$/,"")==="/api"&&
   !api.search&&!api.hash;
 }catch{return false;}
}

function checkCompany(companyId){
 if(!Number.isSafeInteger(companyId)||companyId<1)
  throw new Error("Neveljavno izbrano podjetje.");
}
function checkRecord(row,companyId){
 if(!row||row.demo_only!==true||row.company_id!==companyId||
  !DEAL.test(row.deal_id??"")||!UNIT.test(row.unit_code??"")||
  !Object.hasOwn(REVERSE,row.stage)||
  !Number.isSafeInteger(row.value_cents)||row.value_cents<1||
  !Number.isSafeInteger(row.version)||row.version<1)
  throw new Error("Lokalni CRM strežnik je vrnil neveljavno sintetično stanje.");
 return {
  id:row.deal_id,companyId,unitId:row.unit_code,
  stage:REVERSE[row.stage],valueCents:row.value_cents,
  version:row.version
 };
}
function csrfToken(cookie){
 const item=String(cookie??"").split(";").map(x=>x.trim())
  .find(x=>x.startsWith("XSRF-TOKEN="));
 return item?decodeURIComponent(item.slice(11)):null;
}

export function createSyntheticCrmClient({
 base=SYNTHETIC_CRM_API_BASE,
 origin=typeof location==="undefined"?"":location.origin,
 fetcher=globalThis.fetch,
 cookie=()=>typeof document==="undefined"?"":document.cookie,
}={}){
 if(!syntheticCrmAvailable(base,origin))
  throw new Error("Sintetični CRM API je dovoljen samo v lokalnem okolju.");
 const req=async(companyId,method,suffix="",body=null)=>{
  checkCompany(companyId);
  if(!syntheticCrmAvailable(base,origin))
   throw new Error("Lokalni CRM API je nedovoljen.");
  const headers={"Accept":"application/json","X-Requested-With":"XMLHttpRequest"};
  if(method==="POST"){
   const csrf=await fetcher(origin+"/sanctum/csrf-cookie",{
    method:"GET",credentials:"include",cache:"no-store",redirect:"error",
    headers:{"Accept":"application/json"},
   });
   if(!csrf.ok)throw Object.assign(new Error("Testna seja ni potrjena."),
    {status:csrf.status});
   const token=csrfToken(cookie());
   if(!token)throw new Error("Manjka CSRF zaščita testne seje.");
   headers["X-XSRF-TOKEN"]=token;
   headers["Content-Type"]="application/json";
  }
  const url=base.replace(/\/$/,"")+"/companies/"+companyId+
   "/demo/crm/opportunities"+suffix;
  const response=await fetcher(url,{
   method,credentials:"include",cache:"no-store",redirect:"error",headers,
   ...(method==="POST"?{body:JSON.stringify(body)}:{}),
  });
  if(!response.ok){
   const status=response.status;
   const message=status===409?"CRM zapis je spremenjen ali v konfliktu; osveži stanje.":
    [401,403,404].includes(status)?"Dostop do lokalne CRM testne baze ni dovoljen.":
    "Lokalni CRM strežnik ni dosegljiv ("+status+").";
   throw Object.assign(new Error(message),{status});
  }
  const envelope=await response.json();
  if(envelope?.demo_only!==true)
   throw new Error("Lokalni CRM strežnik ni potrdil sintetičnega načina.");
  return envelope.data;
 };
 return {
  async read(companyId){
   const rows=await req(companyId,"GET");
   if(!Array.isArray(rows)||rows.length>100)
    throw new Error("Neveljaven seznam sintetičnih CRM priložnosti.");
   const mapped=rows.map(row=>checkRecord(row,companyId));
   if(new Set(mapped.map(x=>x.id)).size!==mapped.length)
    throw new Error("Podvojene CRM priložnosti v lokalnem odzivu.");
   return mapped;
  },
  async register(companyId,deal){
   checkCompany(companyId);
   if(!deal||deal.companyId!==companyId||!DEAL.test(deal.id??"")||
    !UNIT.test(deal.unitId??"")||!Object.hasOwn(STAGES,deal.stage)||
    !Number.isSafeInteger(deal.valueCents)||deal.valueCents<=0)
    throw new Error("Neveljavni sintetični CRM podatki.");
   const row=await req(companyId,"POST","",{
    demoOnly:true,dealId:deal.id,unitCode:deal.unitId,
    initialStage:STAGES[deal.stage],valueCents:deal.valueCents,
   });
   return checkRecord(row,companyId);
  },
  async advance(companyId,deal,nextStage){
   checkCompany(companyId);
   if(!deal||deal.companyId!==companyId||!DEAL.test(deal.id??"")||
    !Number.isSafeInteger(deal.version)||deal.version<1||
    !Object.hasOwn(STAGES,nextStage))
    throw new Error("Neveljaven sintetični CRM prehod.");
   const row=await req(companyId,"POST","/"+deal.id+"/advance",{
    demo_only:true,expected_version:deal.version,next_stage:STAGES[nextStage],
   });
   return checkRecord(row,companyId);
  }
 };
}
