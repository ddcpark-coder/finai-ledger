"use client";
import {useMemo,useState} from "react";
import {demoBusinessUnits} from "./demoBusinessModel.mjs";
import {compactDemoBusinessBrief} from "./compactBusinessBrief.mjs";

const euros=cents=>(cents/100).toLocaleString("sl-SI",{
  style:"currency",currency:"EUR",maximumFractionDigits:2
});
const ink="#e8f4fd",sub="#a9bfd0",line="#385a6b";

export default function BusinessBriefCompact({companyId,mode="mobile"}){
 const [unitId,setUnitId]=useState("all");
 const [expanded,setExpanded]=useState(false);
 const units=useMemo(()=>demoBusinessUnits(companyId),[companyId]);
 const effectiveUnit=units.some(x=>x.id===unitId)?unitId:"all";
 const data=useMemo(()=>compactDemoBusinessBrief(companyId,effectiveUnit),
   [companyId,effectiveUnit]);
 const maximum=Math.max(...data.recentMonths.map(x=>x.revenueCents),1);
 return <section aria-label="FinAI poslovni pregled s sintetičnimi podatki"
  style={{margin:"18px 0",padding:14,border:"1px solid "+line,borderRadius:15,
    background:"#122b3e",color:ink}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,
    alignItems:"start",flexWrap:"wrap"}}>
   <div>
    <h2 style={{fontSize:17,margin:"0 0 6px",color:ink}}>
     FinAI Intelligence · {mode==="windows"?"Windows":"mobilni"} pregled</h2>
    <p style={{color:sub,fontSize:11,margin:0}}>
     Sintetični podatki brez strežniške povezave. Ni prava glavna knjiga.</p>
   </div>
   <label style={{fontSize:11,color:sub}}>Poslovna enota
    <select value={effectiveUnit} aria-label="Poslovna enota poslovnega pregleda"
      onChange={e=>setUnitId(e.target.value)}
      style={{display:"block",width:"100%",marginTop:5,padding:9,minHeight:40,
       background:"#091725",color:ink,border:"1px solid "+line,borderRadius:8}}>
     <option value="all">Vse enote podjetja</option>
     {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
   </label>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
    gap:8,marginTop:12}}>
   {[
    ["Prihodki · "+data.lastMonth,euros(data.revenueCents)],
    ["Poslovni izid",euros(data.profitCents)],
    ["CRM · odprte",String(data.crm.openCount)],
    ["Zaloga na voljo",String(data.stock.available)+" enot"]
   ].map(([label,value])=><div key={label}
      style={{border:"1px solid "+line,borderRadius:9,background:"#0c2131",padding:10}}>
     <small style={{display:"block",color:sub,fontSize:10}}>{label}</small>
     <strong style={{display:"block",fontSize:16,marginTop:5}}>{value}</strong>
    </div>)}
  </div>
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}
   style={{marginTop:12,padding:"10px 13px",borderRadius:9,
    border:"1px solid #6aa6ad",background:"#1b4658",color:ink,
    fontWeight:650,fontSize:12}}>
   {expanded?"Skrij mesečno primerjavo":"Pokaži zadnje tri mesece"}
  </button>
  {expanded&&<div style={{marginTop:13}}>
    <div aria-label="Prihodki po mesecih, sintetično" role="img"
     style={{display:"flex",gap:12,alignItems:"end",height:115}}>
     {data.recentMonths.map(x=><div key={x.month}
      title={x.month+" "+euros(x.revenueCents)}
      style={{flex:1,display:"flex",flexDirection:"column",
       justifyContent:"end",alignItems:"center",height:"100%",gap:4}}>
      <span style={{fontSize:10}}>{Math.round(x.revenueCents/100)} €</span>
      <div style={{height:Math.max(3,Math.round(70*x.revenueCents/maximum)),
       width:"min(70%,55px)",borderRadius:"5px 5px 0 0",background:"#6dd9c6"}}/>
      <small style={{color:sub,fontSize:10}}>{x.month}</small>
     </div>)}
    </div>
    <p style={{fontSize:10,color:sub}}>
     Šestmesečna testna marža: {data.sixMonthMarginPercent.toLocaleString("sl-SI")} %.
     Prikazane vrednosti so generirane lokalno, brez omrežja.
    </p>
   </div>}
 </section>;
}
