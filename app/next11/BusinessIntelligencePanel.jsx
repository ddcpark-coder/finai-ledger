"use client";

import {useMemo,useState} from "react";
import {
 demoBusinessUnits,demoFinancialSeries,demoFinancialSummary
} from "./demoBusinessModel.mjs";

const formatMoney = cents => (cents / 100).toLocaleString("sl-SI",{
  style:"currency",currency:"EUR",maximumFractionDigits:2
});
const METRICS=[
 ["revenueCents","Prihodki"],["costCents","Stroški"],["profitCents","Poslovni izid"]
];
const panel={background:"var(--panel)",border:"1px solid var(--line)",
 borderRadius:14,padding:14,marginBottom:12};
const head={fontSize:13,margin:"0 0 6px"};
const muted={color:"var(--muted)",fontSize:10};

export default function BusinessIntelligencePanel({companyId}){
 const [unitId,setUnitId]=useState("all");
 const [metric,setMetric]=useState("revenueCents");
 const [showTable,setShowTable]=useState(false);
 const units=useMemo(()=>demoBusinessUnits(companyId),[companyId]);
 const effectiveUnit=units.some(u=>u.id===unitId)?unitId:"all";
 const series=useMemo(()=>demoFinancialSeries(companyId,effectiveUnit),[companyId,effectiveUnit]);
 const summary=useMemo(()=>demoFinancialSummary(series),[series]);
 const maximum=Math.max(...series.map(d=>d[metric]),1);
 const metricLabel=METRICS.find(m=>m[0]===metric)?.[1]??"Prihodki";
 const values=series.map(d=>Math.round(d[metric]/100));
 return <section aria-label="FinAI Intelligence: sintetična poslovna analitika"
  style={panel}>
  <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <div><h3 style={head}>FinAI Intelligence · primer poslovne analitike</h3>
    <p style={{...muted,margin:"0 0 10px"}}>Samo sintetični podatki podjetja {companyId}.
     Podatki niso pridobljeni iz glavne knjige, banke ali prodaje.</p>
   </div>
   <label style={{...muted,display:"grid",gap:5}}>Poslovna enota
    <select aria-label="Filtriraj poslovno enoto" value={effectiveUnit}
     onChange={e=>setUnitId(e.target.value)}
     style={{border:"1px solid var(--line)",borderRadius:8,padding:7,
      background:"var(--bg2)",color:"var(--text)"}}>
     <option value="all">Vse enote podjetja</option>
     {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
   </label>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
   gap:9,marginBottom:14}}>
   {[["Prihodki",summary.revenueCents],
     ["Stroški",summary.costCents],
     ["Poslovni izid",summary.profitCents]].map(([label,value])=>
    <div key={label} style={{padding:11,border:"1px solid var(--line)",
      borderRadius:10,background:"var(--bg2)"}}>
     <small style={muted}>{label} · 6 mesecev</small>
     <div style={{fontSize:17,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{formatMoney(value)}</div>
    </div>)}
  </div>
  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:10}}>
   <span style={muted}>Graf:</span>
   {METRICS.map(([key,label])=><button key={key} type="button"
     onClick={()=>setMetric(key)} aria-pressed={metric===key}
     style={{border:"1px solid "+(metric===key?"var(--accent)":"var(--line)"),
      borderRadius:8,padding:"6px 9px",fontSize:10,cursor:"pointer",
      background:metric===key?"var(--bg2)":"var(--panel)",color:"var(--text)"}}>
     {label}</button>)}
   <span style={{...muted,marginLeft:"auto"}}>Marža {summary.marginPercent.toLocaleString("sl-SI")} %</span>
  </div>
  <div role="img" aria-label={metricLabel+" po mesecih: "+values.join(", ")+" evrov"}
   style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:8,
     height:155,alignItems:"end",borderBottom:"1px solid var(--line)",
     padding:"2px 4px 0"}}>
   {series.map(row=>{
     const height=Math.max(2,Math.round(Math.max(0,row[metric])/maximum*112));
     return <div key={row.month} title={row.month+": "+formatMoney(row[metric])}
      style={{display:"flex",alignItems:"center",flexDirection:"column",gap:3,
       justifyContent:"end",height:"100%"}}>
      <small style={{fontSize:9,color:"var(--muted)",whiteSpace:"nowrap"}}>
       {Math.round(row[metric]/100).toLocaleString("sl-SI")}</small>
      <div style={{height:height+"px",width:"min(48px,74%)",
       background:"var(--accent)",borderRadius:"5px 5px 0 0",opacity:0.85}}/>
      <small style={{fontSize:9,color:"var(--muted)"}}>{row.month}</small>
     </div>;
   })}
  </div>
  <button type="button" onClick={()=>setShowTable(v=>!v)}
   aria-expanded={showTable}
   style={{background:"transparent",border:"1px solid var(--line)",
    borderRadius:7,padding:"7px 10px",color:"var(--text)",fontSize:10,marginTop:12}}>
   {showTable?"Skrij tabelo":"Prikaži podatkovno tabelo"}
  </button>
  {showTable&&<div style={{overflowX:"auto",marginTop:8}}>
   <table style={{width:"100%",fontSize:10,textAlign:"right"}}>
    <thead><tr><th scope="col" style={{textAlign:"left"}}>Mesec</th>
     <th scope="col">Prihodki</th><th scope="col">Stroški</th>
     <th scope="col">Rezultat</th></tr></thead>
    <tbody>{series.map(row=><tr key={row.month}>
     <th scope="row" style={{textAlign:"left"}}>{row.month}</th>
     <td>{formatMoney(row.revenueCents)}</td>
     <td>{formatMoney(row.costCents)}</td>
     <td>{formatMoney(row.profitCents)}</td>
    </tr>)}</tbody>
   </table>
  </div>}
 </section>;
}
