"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {createSyntheticCrmClient,syntheticCrmAvailable} from "./syntheticCrmClient.mjs";
import SharedDemoBusinessPulse from "./SharedDemoBusinessPulse";
import {useSharedDemoCompany} from "./useSharedDemoCompany";
import {changeDemoCompany,resetDemoCompanyDomain,readDemoCompany} from "./sharedDemoCompany.mjs";
import {
 planSyntheticCrmReconciliation,applySyntheticCrmAdvance
} from "./syntheticCrmReconciliation.mjs";
import {
  DEMO_PIPELINE_STAGES,advanceDemoOpportunity,buildDemoCrmActivity,
  demoBusinessUnits,demoCrmPipeline,demoCrmSummary
} from "./demoBusinessModel.mjs";

const euro=cents=>(cents/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR",maximumFractionDigits:2
});
const box={background:"var(--panel)",border:"1px solid var(--line)",
 borderRadius:13,padding:12,marginBottom:12};

export default function CrmNext11Panel({companyId}){
 const shared=useSharedDemoCompany(companyId);
 const deals=shared.deals,activities=shared.activities;
 const [selectedId,setSelectedId]=useState(null);
 const [unitId,setUnitId]=useState("all");
 const [notice,setNotice]=useState("");
 const [localAvailable,setLocalAvailable]=useState(false);
 const [connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(false);
 const [syncConflict,setSyncConflict]=useState(false);
 const activeCompany=useRef(companyId);
 const mounted=useRef(true);
 const accepted=useRef(new Map());
 activeCompany.current=companyId;
 useEffect(()=>{
  mounted.current=true;
  return ()=>{mounted.current=false};
 },[]);
 const assertActive=target=>{
  if(!mounted.current||activeCompany.current!==target)
   throw new Error("Podjetje ali CRM pogled se je med zahtevo spremenil.");
 };
 useEffect(()=>{setLocalAvailable(syntheticCrmAvailable());},[]);
 useEffect(()=>{
  setSelectedId(null);
  setConnected(false);setSyncConflict(false);setNotice("");
 },[companyId]);
 const connectLocal=async()=>{
  if(busy||!localAvailable)return;
  setBusy(true);setNotice("");setSyncConflict(false);
  try{
   const targetCompany=companyId;
   const client=createSyntheticCrmClient();
   const fixtures=demoCrmPipeline(targetCompany);
   let remote=await client.read(targetCompany);
   assertActive(targetCompany);
   if(remote.length===0){
    // Registering fixtures is a deliberate action. Never silently overwrite
    // a changed local deal when the test database is still empty.
    planSyntheticCrmReconciliation(targetCompany,
     readDemoCompany(targetCompany).deals,fixtures);
    for(const deal of fixtures){
     assertActive(targetCompany);
     await client.register(targetCompany,deal);
    }
    remote=await client.read(targetCompany);
    assertActive(targetCompany);
   }
   changeDemoCompany(targetCompany,"crm",current=>{
    const result=planSyntheticCrmReconciliation(
     targetCompany,current.deals,remote,{
      accepted:accepted.current.get(targetCompany)??null
     });
    return {deals:result.deals,activities:current.activities};
   });
   accepted.current.set(targetCompany,remote);
   setConnected(true);setSyncConflict(false);
   setNotice("Sintetična CRM baza je povezana. Strežniške faze so pregledane brez prepisovanja lokalnih konfliktov.");
  }catch(error){
   if(mounted.current&&activeCompany.current===companyId){
    setConnected(false);setSyncConflict(true);
    setNotice(error?.message??"Povezave s testno bazo ni mogoče potrditi.");
   }
  }finally{if(mounted.current&&activeCompany.current===companyId)setBusy(false)}
 };
 const refreshLocal=async()=>{
  if(busy||!connected||!localAvailable)return;
  setBusy(true);setNotice("");
  const targetCompany=companyId;
  try{
   const remote=await createSyntheticCrmClient().read(targetCompany);
   assertActive(targetCompany);
   const current=readDemoCompany(targetCompany);
   const result=planSyntheticCrmReconciliation(
    targetCompany,current.deals,remote,{
     accepted:accepted.current.get(targetCompany)??null
    });
   changeDemoCompany(targetCompany,"crm",snapshot=>{
    // Re-evaluate if another browser action modified CRM during fetch.
    const fresh=planSyntheticCrmReconciliation(
     targetCompany,snapshot.deals,remote,{
      accepted:accepted.current.get(targetCompany)??null
     });
    return {deals:fresh.deals,activities:snapshot.activities};
   });
   accepted.current.set(targetCompany,remote);
   setSyncConflict(false);
   setNotice(result.changed
    ?"Prevzete so novejše preverjene testne CRM faze iz Laravela."
    :"CRM različice so usklajene; lokalni zapisi niso bili prepisani.");
  }catch(error){
   if(mounted.current&&activeCompany.current===targetCompany){
    setSyncConflict(true);
    setNotice(error?.message??"Usklajevanje CRM ni uspelo.");
   }
  }finally{if(mounted.current&&activeCompany.current===targetCompany)setBusy(false)}
 };
 const units=useMemo(()=>demoBusinessUnits(companyId),[companyId]);
 const selected=deals.find(d=>d.id===selectedId)??deals[0];
 const effectiveUnit=units.some(u=>u.id===unitId)?unitId:"all";
 const filtered=deals.filter(d=>effectiveUnit==="all"||d.unitId===effectiveUnit);
 const summary=demoCrmSummary(filtered,companyId);
 const next=selected?DEMO_PIPELINE_STAGES[
    DEMO_PIPELINE_STAGES.indexOf(selected.stage)+1
 ]:null;
 const progress=async()=>{
  if(busy||syncConflict||!selected||!next)return;
  setBusy(true);
  const targetCompany=companyId,submitted=selected,nextStage=next;
  try{
   if(connected){
    // Server transaction uses expected_version (optimistic SQL CAS).
    const saved=await createSyntheticCrmClient().advance(
     targetCompany,submitted,nextStage);
    assertActive(targetCompany);
    // The local commit uses a SECOND CAS against the live immutable store
    // after awaiting the response, preventing lost updates from stale React.
    changeDemoCompany(targetCompany,"crm",current=>({
     deals:applySyntheticCrmAdvance(
      targetCompany,current.deals,submitted,saved,nextStage),
     activities:current.activities
    }));
    const baseline=accepted.current.get(targetCompany)??[];
    accepted.current.set(targetCompany,baseline.map(row=>
     row.id===saved.id?saved:row));
   }else{
    changeDemoCompany(targetCompany,"crm",current=>({
     deals:advanceDemoOpportunity(
      current.deals,targetCompany,submitted.id,nextStage,submitted.version
     ),activities:current.activities
    }));
   }
   setNotice("Sintetična priložnost je premaknjena v fazo "+nextStage+".");
  }catch(error){
   if(mounted.current&&activeCompany.current===targetCompany){
    if(connected)setSyncConflict(true);
    setNotice(error?.status===409
     ?"Konflikt različice na strežniku. Uporabi »Preveri spremembe CRM«; nobenega samodejnega ponavljanja ni."
     :error?.message??"Sprememba sintetičnega CRM ni uspela.");
   }
  }finally{if(mounted.current&&activeCompany.current===targetCompany)setBusy(false)}
 };
 const createActivity=()=>{
  try{
   const record=buildDemoCrmActivity(companyId,selected.id,deals,
    "SYN-ACT-"+String(activities.length+1));
   changeDemoCompany(companyId,"crm",current=>({
    deals:current.deals,activities:[...current.activities,record]
   }));
   setNotice("Dodan je testni CRM opomnik; ni sinhroniziran na strežnik.");
  }catch(error){setNotice(error.message);}
 };
 const reset=()=>{
  if(busy)return;
  setConnected(false);setSyncConflict(false);
  accepted.current.delete(companyId);
  resetDemoCompanyDomain(companyId,"crm");
  setNotice("Ponastavljen je samo prikaz v brskalniku; podatki lokalne testne baze niso izbrisani.");
  setSelectedId(null);
 };
 return <section aria-label="FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
  style={box}>
  <div style={{display:"flex",gap:9,alignItems:"center",
   justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><h3 style={{margin:0,fontSize:13}}>CRM 360 · interaktivni prodajni lijak</h3>
    <p style={{fontSize:10,color:"var(--muted)",margin:"6px 0"}}>
     {connected?"Sintetični podatki v izolirani lokalni CRM bazi; brez povezav s produkcijo.":
      "Sintetični podatki so med moduli skupni do osvežitve strani."}</p></div>
   <div style={{display:"flex",gap:8}}>
    <label style={{fontSize:10,color:"var(--muted)"}}>Poslovna enota
     <select aria-label="Filtriraj CRM po poslovni enoti" value={effectiveUnit}
      onChange={e=>setUnitId(e.target.value)}
      style={{display:"block",background:"var(--bg2)",color:"var(--text)",padding:6,
        border:"1px solid var(--line)",borderRadius:7,fontSize:10}}>
      <option value="all">Vse enote</option>
      {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
     </select>
    </label>
    {localAvailable&&<button type="button" className="secondary"
     disabled={busy||connected} onClick={connectLocal}
     style={{alignSelf:"end",fontSize:10}}>
     {busy?"Povezovanje ...":connected?"Lokalni CRM povezan":"Poveži lokalno testno CRM bazo"}
    </button>}
    {connected&&<button type="button" className="secondary"
     disabled={busy} onClick={refreshLocal}
     style={{alignSelf:"end",fontSize:10}}>
     Preveri spremembe CRM
    </button>}
    <button type="button" className="secondary" onClick={reset}
     style={{alignSelf:"end",fontSize:10}}>Ponastavi demo</button>
   </div>
  </div>
  <div style={{display:"flex",gap:14,flexWrap:"wrap",margin:"9px 0 13px",fontSize:11}}>
   <span>Odprte priložnosti: <b>{summary.openCount}</b></span>
   <span>Vrednost: <b>{euro(summary.totalValueCents)}</b></span>
   <span>Utežena vrednost: <b>{euro(summary.weightedValueCents)}</b></span>
  </div>
  <SharedDemoBusinessPulse companyId={companyId} mode="crm"/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",
    gap:7,alignItems:"stretch"}}>
   {DEMO_PIPELINE_STAGES.map(stage=><div key={stage}
     style={{border:"1px solid var(--line)",background:"var(--bg2)",
      borderRadius:10,padding:7,minHeight:110}}>
    <b style={{fontSize:10}}>{stage}</b>
    {filtered.filter(d=>d.stage===stage).map(deal=><button key={deal.id}
     type="button" onClick={()=>setSelectedId(deal.id)}
     aria-pressed={selected?.id===deal.id}
     style={{marginTop:7,display:"grid",textAlign:"left",gap:4,width:"100%",
       border:"1px solid "+(selected?.id===deal.id?"var(--accent)":"var(--line)"),
       borderRadius:9,background:"var(--panel)",padding:8,color:"var(--text)"}}>
     <strong style={{fontSize:10}}>{deal.name}</strong>
     <span style={{fontSize:9,color:"var(--muted)"}}>{deal.partner}</span>
     <span style={{fontSize:10}}>{euro(deal.valueCents)} · {deal.probability}%</span>
    </button>)}
   </div>)}
  </div>
  {selected&&<div style={{marginTop:11,padding:10,border:"1px solid var(--line)",
     borderRadius:10,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
    <div style={{flex:1,minWidth:180}}>
      <b style={{fontSize:11}}>{selected.name}</b>
      <p style={{fontSize:9,color:"var(--muted)",margin:"5px 0 0"}}>
       {selected.partner} · {selected.id} · {selected.unitId} · verzija {selected.version}
      </p>
    </div>
    <button type="button" className="primary" onClick={progress} disabled={!next||busy||syncConflict}
      style={{fontSize:10}}>{next?"Premakni v: "+next:"Priložnost zaključena"}</button>
    <button type="button" className="secondary" onClick={createActivity}
      style={{fontSize:10}}>Dodaj demo opomnik</button>
  </div>}
  {activities.length>0&&<div style={{fontSize:10,marginTop:10}}>
    <b>Testne aktivnosti: {activities.length}</b>
    {activities.map(a=><p key={a.id} style={{margin:"5px 0",color:"var(--muted)"}}>
     {a.id} · {a.subject} · {a.dealId}</p>)}
  </div>}
  {syncConflict&&<p role="alert" style={{fontSize:10,color:"var(--muted)"}}>
   Zaznan je konflikt različic; spreminjanje faz je blokirano do ročne
   preveritve strežniških zapisov ali ponastavitve lokalne predstavitve.
  </p>}
  {notice&&<p role="status" style={{color:"var(--muted)",fontSize:10,marginTop:10}}>
   {notice}</p>}
 </section>;
}
