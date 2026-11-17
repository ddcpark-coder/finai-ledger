// NEXT23 — explicit, conflict-safe import of the *synthetic* Laravel CRM state.
// Pure functions: no network, no cookies, no persistence, no server writes.
import {
 DEMO_PIPELINE_STAGES,demoCrmPipeline
} from "./demoBusinessModel.mjs";

const PROBABILITY=Object.freeze([10,30,60,80,100]);
const STAGES=DEMO_PIPELINE_STAGES;
function guardRecord(row,companyId){
 if(!row||row.companyId!==companyId||
  typeof row.id!=="string"||!/^SYN-CRM-[0-9]+$/.test(row.id)||
  typeof row.unitId!=="string"||
  !STAGES.includes(row.stage)||
  !Number.isSafeInteger(row.version)||row.version<1||
  !Number.isSafeInteger(row.valueCents)||row.valueCents<=0)
  throw new Error("Neveljaven ali tuj sintetični CRM zapis.");
}
function sameness(a,b){
 return a.id===b.id&&a.companyId===b.companyId&&
  a.unitId===b.unitId&&a.valueCents===b.valueCents&&
  a.stage===b.stage&&a.version===b.version;
}
const equal=rows=>(a,b)=>rows.every(k=>a[k]===b[k]);

/**
 * Reconcile an entire small, fixed company demo pipeline. Missing/extra
 * records, changed immutable fields, stale versions and local unsynced edits
 * abort the complete merge. A newer server version only fast-forwards when
 * the local record has not diverged from the last accepted server baseline
 * (or from the initial immutable demo fixtures when not yet connected).
 */
export function planSyntheticCrmReconciliation(
 companyId,localDeals,serverDeals,{accepted=null}={}
){
 const fixture=demoCrmPipeline(companyId);
 if(!Array.isArray(localDeals)||!Array.isArray(serverDeals)||
  localDeals.length!==fixture.length||serverDeals.length!==fixture.length||
  accepted!==null&&(!Array.isArray(accepted)||
   accepted.length!==fixture.length))
  throw new Error("Lokalni in strežniški CRM nabor nista popolna.");
 const expected=new Map(fixture.map(row=>[row.id,row]));
 const index=(list,label)=>{
  const map=new Map();
  for(const row of list){
   guardRecord(row,companyId);
   const base=expected.get(row.id);
   if(!base||base.unitId!==row.unitId||
    base.valueCents!==row.valueCents||map.has(row.id))
    throw new Error(label+": tuja, podvojena ali spremenjena sintetična priložnost.");
   map.set(row.id,row);
  }
  return map;
 };
 const local=index(localDeals,"Lokalni CRM");
 const remote=index(serverDeals,"Strežniški CRM");
 const prior=accepted===null?new Map(expected):index(accepted,"Predhodno potrjeni CRM");
 const next=[];
 let changed=false;
 for(const model of fixture){
  const row=local.get(model.id),server=remote.get(model.id),
   baseline=prior.get(model.id);
  if(!row||!server||!baseline)
   throw new Error("Manjkajoča sintetična CRM priložnost.");
  const matchesRemote=sameness(row,server);
  if(!sameness(row,baseline)&&!matchesRemote)
   throw new Error("Konflikt: lokalni CRM vsebuje nepotrjene spremembe.");
  if(server.version<baseline.version||server.version<row.version)
   throw new Error("Konflikt: strežnik je vrnil starejšo različico CRM.");
  const rowIndex=STAGES.indexOf(row.stage);
  const serverIndex=STAGES.indexOf(server.stage);
  if(server.version===row.version&&server.stage!==row.stage||
   server.version>row.version&&
    (serverIndex<=rowIndex||
     serverIndex-rowIndex!==server.version-row.version))
   throw new Error("Konflikt: neskladna prodajna faza ali različica CRM.");
  if(server.version===baseline.version&&server.stage!==baseline.stage)
   throw new Error("Konflikt: strežnik je spremenil fazo brez nove različice.");
  const result=matchesRemote?row:{
   ...row,stage:server.stage,version:server.version,
   probability:PROBABILITY[serverIndex]
  };
  changed||=!matchesRemote;
  next.push(result);
 }
 return {deals:changed?next:localDeals,changed};
}

/** A write acknowledged by Laravel must be CAS-applied to the *current*
 * browser snapshot, not to a stale render captured before an await.
 */
export function applySyntheticCrmAdvance(
 companyId,currentDeals,submitted,serverAck,nextStage
){
 const fixture=demoCrmPipeline(companyId);
 if(!Array.isArray(currentDeals)||currentDeals.length!==fixture.length)
  throw new Error("Konflikt: lokalni CRM je med zapisovanjem spremenjen.");
 guardRecord(submitted,companyId);
 guardRecord(serverAck,companyId);
 if(!STAGES.includes(nextStage)||serverAck.id!==submitted.id||
  serverAck.unitId!==submitted.unitId||
  serverAck.valueCents!==submitted.valueCents||
  serverAck.stage!==nextStage||
  serverAck.version!==submitted.version+1||
  STAGES.indexOf(nextStage)!==STAGES.indexOf(submitted.stage)+1)
  throw new Error("Strežnik ni potrdil natanko ene dovoljene CRM spremembe.");
 const current=currentDeals.find(row=>row.id===submitted.id);
 if(!current||!sameness(current,submitted))
  throw new Error("Konflikt: lokalni CRM se je med odgovorom strežnika spremenil.");
 const index=STAGES.indexOf(nextStage);
 return currentDeals.map(row=>row.id===submitted.id?{
  ...row,stage:nextStage,version:serverAck.version,
  probability:PROBABILITY[index]
 }:row);
}
