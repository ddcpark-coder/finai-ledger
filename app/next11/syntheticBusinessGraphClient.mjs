// NEXT22: manual, strictly same-origin loopback read of Laravel's synthetic
// company business graph. Not a state hydration/sync or production endpoint.
import {
 REVIEW_TEST_API_BASE,syntheticCommerceReviewAvailable
} from "./syntheticCommerceReviewClient.mjs";

const exact=(value,keys)=>value!==null&&typeof value==="object"&&
 !Array.isArray(value)&&Object.keys(value).sort().join("|")===
 keys.slice().sort().join("|");
const reference=/^SYN:C([1-9][0-9]*):(ORDER|CRM|PLAN|AUDIT):([1-9][0-9]*)$/;
const status=new Set(["review","reviewed","hold"]);
const stage=new Set(["qualification","discovery","proposal","negotiation","won"]);
const auditType=new Set([
 "synthetic_commerce_order.staged","synthetic_commerce_order.review_decided",
 "synthetic_crm.opportunity_registered","synthetic_crm.stage_advanced",
 "synthetic_inventory.plan_recorded"
]);
function checkRef(ref,companyId,kind){
 if(typeof ref!=="string")return false;
 const match=ref.match(reference);
 return Boolean(match)&&Number(match[1])===companyId&&
  (kind===undefined||match[2]===kind);
}
const positive=n=>Number.isSafeInteger(n)&&n>0;
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
const synId=s=>typeof s==="string"&&
 /^SYN-[A-Z0-9-]{2,85}$/.test(s);

export function validateSyntheticBusinessGraph(data,companyId){
 if(!positive(companyId)||!exact(data,[
  "company_id","demo_only","read_only","posting","inventory_reserved",
  "external_sync","bounded_limit","crm","orders","stock_plans","audit"
 ])||data.company_id!==companyId||
  data.demo_only!==true||data.read_only!==true||
  data.posting!==false||data.inventory_reserved!==false||
  data.external_sync!==false||!positive(data.bounded_limit)||
  data.bounded_limit>50||
  ["crm","orders","stock_plans","audit"].some(k=>
   !Array.isArray(data[k])||data[k].length>data.bounded_limit))
  throw new Error("Strežnik ni vrnil dovoljenega sintetičnega poslovnega pregleda.");
 const used=new Set();
 const add=(ref,kind)=>{
  if(!checkRef(ref,companyId,kind)||used.has(ref))
   throw new Error("Ponovljena ali tuja sintetična referenca.");
  used.add(ref);
 };
 for(const x of data.crm){
  if(!exact(x,["ref","deal_id","unit_code","stage","version","value_cents"])||
   !synId(x.deal_id)||!stage.has(x.stage)||
   typeof x.unit_code!=="string"||
   !/^[A-Z0-9-]{2,24}$/.test(x.unit_code)||
   !positive(x.version)||!positive(x.value_cents))
   throw new Error("CRM ni omejen na sintetične zapise.");
  add(x.ref,"CRM");
 }
 for(const x of data.orders){
  if(!exact(x,["ref","external_order_id","provider","warehouse_id",
    "total_cents","status"])||
   !synId(x.external_order_id)||
   !["shopify","woocommerce"].includes(x.provider)||
   !positive(x.warehouse_id)||!positive(x.total_cents)||
   !status.has(x.status))
   throw new Error("Naročilo ni preverjen sintetični zapis.");
  add(x.ref,"ORDER");
 }
 for(const x of data.stock_plans){
  if(!exact(x,["ref","order_ref","crm_ref","event_id","sku","quantity",
    "source_warehouse_id","target_warehouse_id","demo_only",
    "posting","inventory_reserved"])||
   !checkRef(x.order_ref,companyId,"ORDER")||
   !checkRef(x.crm_ref,companyId,"CRM")||
   !synId(x.event_id)||!synId(x.sku)||
   !positive(x.quantity)||!positive(x.source_warehouse_id)||
   !positive(x.target_warehouse_id)||
   x.source_warehouse_id===x.target_warehouse_id||
   x.demo_only!==true||x.posting!==false||
   x.inventory_reserved!==false)
   throw new Error("Skladiščni načrt ni varen sintetični zapis.");
  add(x.ref,"PLAN");
 }
 for(const x of data.audit){
  if(!exact(x,["ref","entity_ref","event_type"])||
   !auditType.has(x.event_type)||
   !checkRef(x.entity_ref,companyId)||
   !used.has(x.entity_ref))
   throw new Error("Revizijska referenca je tuja ali ni del pregledanega posnetka.");
  add(x.ref,"AUDIT");
 }
 return data;
}

export function syntheticBusinessGraphAvailable(
 base=REVIEW_TEST_API_BASE,
 origin=typeof location==="undefined"?"":location.origin){
 return syntheticCommerceReviewAvailable(base,origin);
}

export function createSyntheticBusinessGraphClient({
 base=REVIEW_TEST_API_BASE,
 origin=typeof location==="undefined"?"":location.origin,
 fetcher=globalThis.fetch,
}={}){
 if(!syntheticBusinessGraphAvailable(base,origin))
  throw new Error("Poslovni graf je dovoljen samo na istem lokalnem testnem strežniku.");
 const prefix=base.replace(/\/$/,"");
 return {
  async snapshot(companyId,{limit=20}={}){
   if(!positive(companyId)||!positive(limit)||limit>50)
    throw new Error("Neveljavna lokalna zahteva.");
   const response=await fetcher(prefix+"/companies/"+companyId+
    "/demo/business-graph?limit="+limit,{
      method:"GET",credentials:"include",cache:"no-store",
      headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}
    });
   if(!response.ok){
    const text=response.status===401?"Prijava je potekla.":
     response.status===403?"Manjkajo pravice CRM, naročil ali zalog.":
     response.status===404?"Sintetični poslovni graf ni omogočen.":
     response.status===409?"Sintetični zapisi niso skladni.":
     "Lokalni API ni dosegljiv.";
    throw Object.assign(new Error(text),{status:response.status});
   }
   const payload=await response.json();
   if(!exact(payload,["data"]))
    throw new Error("Neveljavna struktura lokalnega poslovnega odziva.");
   return validateSyntheticBusinessGraph(payload.data,companyId);
  }
 };
}
