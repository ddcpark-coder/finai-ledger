"use client";

import {useEffect,useMemo,useState} from "react";
import {createSyntheticCrmClient,syntheticCrmAvailable} from "./syntheticCrmClient.mjs";
import SharedDemoBusinessPulse from "./SharedDemoBusinessPulse";
import {useSharedDemoCompany} from "./useSharedDemoCompany";
import {changeDemoCompany,resetDemoCompanyDomain,readDemoCompany} from "./sharedDemoCompany.mjs";
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
 useEffect(()=>{setLocalAvailable(syntheticCrmAvailable());},[]);
 useEffect(()=>{
  setSelectedId(null);
  setConnected(false);setNotice("");
 },[companyId]);
 const connectLocal=async()=>{
  if(busy||!localAvailable)return;
  setBusy(true);setNotice("");
  try{
   const client=createSyntheticCrmClient();
   const source=demoCrmPipeline(companyId);
   // Manual only. Replays never reset an already advanced local demo deal.
   for(const deal of source)await client.register(companyId,deal);
   const saved=await client.read(companyId);
   const byId=new Map(saved.map(deal=>[deal.id,deal]));
   if(saved.length!==source.length||source.some(original=>{
    const row=byId.get(original.id);
    return !row||row.unitId!==original.unitId||
     row.valueCents!==original.valueCents;
   }))throw new Error("Lokalna CRM baza ni skladna s sintetičnimi primeri.");
   const latest=readDemoCompany(companyId).deals;
   if(latest.some(deal=>{
     const row=byId.get(deal.id);
     return !row||row.version<deal.version;
   }))throw new Error("Starejša lokalna CRM kopija ne sme prepisati novejšega prikaza.");
   changeDemoCompany(companyId,"crm",current=>({
    deals:current.deals.map(original=>{
     const row=byId.get(original.id);
     return {...original,stage:row.stage,version:row.version,
       probability:DEMO_PIPELINE_STAGES.indexOf(row.stage)>=0?
       [10,30,60,80,100][DEMO_PIPELINE_STAGES.indexOf(row.stage)]:
       original.probability};
    }),activities:current.activities
   }));
   setConnected(true);
   setNotice("Sintetični CRM je povezan z izolirano lokalno bazo. Samo ročno sprožena dejanja.");
  }catch(error){setConnected(false);setNotice(error.message);}
  finally{setBusy(false);}
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
  if(busy||!selected||!next)return;
  setBusy(true);
  try{
   if(connected){
    const saved=await createSyntheticCrmClient().advance(companyId,selected,next);
    if(saved.id!==selected.id||saved.unitId!==selected.unitId||
       saved.valueCents!==selected.valueCents)
      throw new Error("Neskladen odgovor CRM strežnika.");
    changeDemoCompany(companyId,"crm",current=>({
     deals:current.deals.map(d=>d.id===saved.id?
      {...d,stage:saved.stage,version:saved.version,
       probability:[10,30,60,80,100][DEMO_PIPELINE_STAGES.indexOf(saved.stage)]}:d),
     activities:current.activities
    }));
   }else{
    changeDemoCompany(companyId,"crm",current=>({
     deals:advanceDemoOpportunity(
      current.deals,companyId,selected.id,next,selected.version
     ),activities:current.activities
    }));
   }
   setNotice("Sintetična priložnost je premaknjena v fazo "+next+".");
  }catch(error){setNotice(error.message);}
  finally{setBusy(false);}
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
  setConnected(false);resetDemoCompanyDomain(companyId,"crm");
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
       {selected.partner} · {selected.unitId} · verzija {selected.version}
      </p>
    </div>
    <button type="button" className="primary" onClick={progress} disabled={!next||busy}
      style={{fontSize:10}}>{next?"Premakni v: "+next:"Priložnost zaključena"}</button>
    <button type="button" className="secondary" onClick={createActivity}
      style={{fontSize:10}}>Dodaj demo opomnik</button>
  </div>}
  {activities.length>0&&<div style={{fontSize:10,marginTop:10}}>
    <b>Testne aktivnosti: {activities.length}</b>
    {activities.map(a=><p key={a.id} style={{margin:"5px 0",color:"var(--muted)"}}>
     {a.id} · {a.subject} · {a.dealId}</p>)}
  </div>}
  {notice&&<p role="status" style={{color:"var(--muted)",fontSize:10,marginTop:10}}>
   {notice}</p>}
 </section>;
}
