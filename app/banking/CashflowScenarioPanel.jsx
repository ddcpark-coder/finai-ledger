"use client";
import {useState} from "react";
import {euro} from "../issued/demoInvoice.mjs";
import {calculateCashflowScenario,CASHFLOW_SCENARIOS} from "./cashFlowScenario.mjs";

export default function CashflowScenarioPanel({companyId}){
 const [scenario,setScenario]=useState("baseline");
 const [days,setDays]=useState(30);
 const result=calculateCashflowScenario(companyId,days,scenario);
 const selected=CASHFLOW_SCENARIOS[scenario];
 return <article className="bankCard" aria-label="Demonstracijska napoved likvidnosti" style={{padding:14,marginBottom:10}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:10,flexWrap:"wrap"}}>
     <div><h3 style={{margin:"0 0 5px",fontSize:14}}>Likvidnost – napoved denarnega toka</h3>
       <p style={{margin:0,fontSize:10,color:"var(--muted)"}}>Povsem sintetični scenariji. Ne prikazujejo pravega stanja banke ali zagotovljenih prilivov.</p>
     </div>
     <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
       <label style={{display:"grid",gap:3,fontSize:10}}>Scenarij
         <select aria-label="Scenarij likvidnosti" value={scenario} onChange={e=>setScenario(e.target.value)}
           style={{padding:8,background:"var(--bg2)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:8}}>
           {Object.entries(CASHFLOW_SCENARIOS).map(([key,val])=><option key={key} value={key}>{val.name}</option>)}
         </select>
       </label>
       <label style={{display:"grid",gap:3,fontSize:10}}>Obdobje
         <select aria-label="Obdobje napovedi" value={days} onChange={e=>setDays(Number(e.target.value))}
           style={{padding:8,background:"var(--bg2)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:8}}>
           <option value={14}>14 dni</option><option value={30}>30 dni</option>
         </select>
       </label>
     </div>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8,marginTop:12}}>
     {[
       ["Začetno sintetično stanje",result.openingCents],
       ["Pričakovani prilivi",result.expectedReceiptsCents],
       ["Predvideni odlivi",result.duePayablesCents],
       ["Ocenjeno končno stanje",result.closingCents]
     ].map(([label,cents])=><div key={label} style={{border:"1px solid var(--line)",padding:10,borderRadius:9,background:"var(--bg2)"}}>
       <small style={{display:"block",color:"var(--muted)",fontSize:10}}>{label}</small>
       <strong style={{fontSize:15,fontVariantNumeric:"tabular-nums"}}>{euro(cents)}</strong>
     </div>)}
   </div>
   <p style={{fontSize:11,lineHeight:1.5,color:"var(--muted)",margin:"10px 0 0"}}>
     Model predpostavlja plačilo <b>{selected.collectionPercent} %</b> sintetičnih terjatev znotraj {days} dni.
     Vsi sintetični zapadli odhodki so vključeni. To ni bančni podatek, izračun DDV ali računovodska napoved za resnično odločanje.
   </p>
 </article>;
}
