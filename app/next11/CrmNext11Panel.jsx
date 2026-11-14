"use client";

import {useMemo,useState} from "react";
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
 const [deals,setDeals]=useState(()=>demoCrmPipeline(companyId));
 const [activities,setActivities]=useState([]);
 const [selectedId,setSelectedId]=useState(null);
 const [unitId,setUnitId]=useState("all");
 const [notice,setNotice]=useState("");
 const units=useMemo(()=>demoBusinessUnits(companyId),[companyId]);
 const selected=deals.find(d=>d.id===selectedId)??deals[0];
 const effectiveUnit=units.some(u=>u.id===unitId)?unitId:"all";
 const filtered=deals.filter(d=>effectiveUnit==="all"||d.unitId===effectiveUnit);
 const summary=demoCrmSummary(filtered,companyId);
 const next=selected?DEMO_PIPELINE_STAGES[
    DEMO_PIPELINE_STAGES.indexOf(selected.stage)+1
 ]:null;
 const progress=()=>{
  try{
   setDeals(current=>advanceDemoOpportunity(
    current,companyId,selected.id,next,selected.version
   ));
   setNotice("Sintetična priložnost je premaknjena v fazo "+next+".");
  }catch(error){setNotice(error.message);}
 };
 const createActivity=()=>{
  try{
   const record=buildDemoCrmActivity(companyId,selected.id,deals,
    "SYN-ACT-"+String(activities.length+1));
   setActivities(current=>[...current,record]);
   setNotice("Dodan je testni CRM opomnik; ni sinhroniziran na strežnik.");
  }catch(error){setNotice(error.message);}
 };
 const reset=()=>{
  setDeals(demoCrmPipeline(companyId));setActivities([]);
  setNotice("Sintetični CRM je ponastavljen.");setSelectedId(null);
 };
 return <section aria-label="FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
  style={box}>
  <div style={{display:"flex",gap:9,alignItems:"center",
   justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><h3 style={{margin:0,fontSize:13}}>CRM 360 · interaktivni prodajni lijak</h3>
    <p style={{fontSize:10,color:"var(--muted)",margin:"6px 0"}}>
     Sintetični podatki; spremembe veljajo samo do ponovnega odprtja tega pogleda.</p></div>
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
    <button type="button" className="secondary" onClick={reset}
     style={{alignSelf:"end",fontSize:10}}>Ponastavi demo</button>
   </div>
  </div>
  <div style={{display:"flex",gap:14,flexWrap:"wrap",margin:"9px 0 13px",fontSize:11}}>
   <span>Odprte priložnosti: <b>{summary.openCount}</b></span>
   <span>Vrednost: <b>{euro(summary.totalValueCents)}</b></span>
   <span>Utežena vrednost: <b>{euro(summary.weightedValueCents)}</b></span>
  </div>
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
    <button type="button" className="primary" onClick={progress} disabled={!next}
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
