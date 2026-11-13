"use client";

import {useEffect,useState} from "react";
import {
 DEMO_FLOW_STAGES,createDemoCommercialFlow,demoFlowKey,
 restoreDemoCommercialFlow,transitionDemoCommercialFlow,upcomingFlowAction,demoInventoryTrace
} from "./demoCommercialFlow.mjs";
import SyntheticLedgerBackendPanel from "./SyntheticLedgerBackendPanel.jsx";

const modules={
 quotes:"Ponudbe",orders:"Naročila",documents:"Dokumenti / dobavnice",
 issued_invoices:"Izdani računi",banking:"Banka"
};
const format=cents=>new Intl.NumberFormat("sl-SI",{style:"currency",currency:"EUR"}).format(cents/100);

export default function BusinessChainPanel({companyId,moduleKey}){
 const key=demoFlowKey(companyId);
 const [flow,setFlow]=useState(null);
 const [loadedKey,setLoadedKey]=useState(null);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
   setLoadedKey(null);
   let value=null;
   try{value=restoreDemoCommercialFlow(JSON.parse(sessionStorage.getItem(key)),companyId)}catch{}
   setFlow(value);setNotice("");setLoadedKey(key);
 },[key,companyId]);
 useEffect(()=>{
   if(loadedKey!==key)return;
   try{
     if(flow===null)sessionStorage.removeItem(key);
     else sessionStorage.setItem(key,JSON.stringify(flow));
   }catch{setNotice("Sejna shramba ni na voljo; demonstracija deluje samo v tem pogledu.")}
 },[loadedKey,key,flow]);
 const next=upcomingFlowAction(flow);
 const active=loadedKey===key;
 const canAdvance=next&&next.module===moduleKey&&active;
 const advance=()=>{
   if(!canAdvance)return;
   try{
     setFlow(old=>next.action==="create"
       ?createDemoCommercialFlow(companyId)
       :transitionDemoCommercialFlow(old,next.action,companyId));
     setNotice("Demo korak je evidentiran samo v tej seji; dokumenti, zaloge, računi in e-pošta niso spremenjeni.");
   }catch(error){setNotice(error.message)}
 };
 const reset=()=>{
   if(!active)return;
   setFlow(null);setNotice("Ponastavljen je samo demonstracijski poslovni tok izbranega podjetja.");
 };
 const exportStockTrace=()=>{
   if(!active||!flow)return;
   try{
     const trace=demoInventoryTrace(flow,companyId);
     const blob=new Blob([JSON.stringify(trace,null,2)],{type:"application/json"});
     const url=URL.createObjectURL(blob),link=document.createElement("a");
     link.href=url;link.download="finai-sinteticna-zaloga-"+companyId+".json";
     document.body.appendChild(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),3000);
     setNotice("Izvožena je le sintetična sled rezervacije in izdaje. Dejanske zaloge niso spremenjene.");
   }catch(error){setNotice(error.message)}
 };
 const stages=Object.entries(DEMO_FLOW_STAGES);
 const currentIdx=flow?stages.findIndex(([code])=>code===flow.stage):-1;
 return <section aria-label="Povezani demonstracijski poslovni tok"
   style={{border:"1px solid var(--line)",background:"var(--panel)",borderRadius:13,padding:"13px 15px",margin:"12px 0"}}>
   <h3 style={{fontSize:13,margin:"0 0 6px"}}>Vodeni poslovni tok: ponudba → naročilo → dobavnica → račun → plačilo</h3>
   <p style={{fontSize:10,lineHeight:1.55,color:"var(--muted)",margin:"0 0 9px"}}>
     Enoten sintetični primer, podjetje {companyId}. Vsak korak potrdi uporabnik. Brez pravega pošiljanja,
     knjiženja, dokumentov ali davčne potrditve. Shranjeno le v seji tega brskalnika.
   </p>
   {flow&&<p style={{fontSize:11,margin:"0 0 9px"}}><b>{flow.id}</b> · {flow.partner} · {format(flow.grossCents)} · {DEMO_FLOW_STAGES[flow.stage].label}</p>}
   {flow?.inventory&&<p style={{fontSize:10,margin:"0 0 9px",color:"var(--muted)"}}>
     Demo SKU: <b>{flow.inventory.sku}</b> · za naročilo {flow.inventory.required} kos
     · na zalogi {flow.inventory.onHand} · rezervirano {flow.inventory.reserved}
     · demo izdano {flow.inventory.dispatched}. Brez vpliva na modul Zaloge.
   </p>}
   <ol aria-label="Koraki demonstracijskega poslovnega toka"
     style={{display:"flex",flexWrap:"wrap",gap:7,padding:0,margin:"0 0 11px",listStyle:"none"}}>
     {stages.map(([code,step],idx)=><li key={code}
       aria-current={flow?.stage===code?"step":undefined}
       style={{padding:"6px 8px",border:"1px solid var(--line)",borderRadius:9,fontSize:10,
         background:idx<=currentIdx?"color-mix(in srgb,var(--accent) 10%,var(--panel))":"var(--bg2)",
         color:idx<=currentIdx?"var(--text)":"var(--muted)"}}>
       {idx+1}. {step.label}
     </li>)}
   </ol>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
     {canAdvance&&<button type="button" className="primary" onClick={advance}>{next.label}</button>}
     {active&&flow&&<button type="button" className="secondary" onClick={reset}>Ponastavi poslovni demo</button>}
     {active&&flow&&<button type="button" className="secondary" onClick={exportStockTrace}>Izvozi demo sled zalog</button>}
     {active&&next&&next.module!==moduleKey&&<a
       href={"/?module="+encodeURIComponent(next.module)}
       style={{color:"var(--accent)",fontSize:11}}>
       Naslednji korak: {modules[next.module]}
     </a>}
     {active&&!next&&<span style={{fontSize:11,color:"var(--ok)"}}>Vsi demonstracijski koraki so potrjeni.</span>}
     {!active&&<span style={{fontSize:10}}>Nalagam demonstracijski poslovni tok …</span>}
   </div>
   {notice&&<p role="status" style={{fontSize:10,color:"var(--muted)",margin:"10px 0 0"}}>{notice}</p>}
   <SyntheticLedgerBackendPanel companyId={companyId}/>
 </section>;
}
