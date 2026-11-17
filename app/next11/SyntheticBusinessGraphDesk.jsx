"use client";
import {useEffect,useState} from "react";
import {
 createSyntheticBusinessGraphClient,syntheticBusinessGraphAvailable
} from "./syntheticBusinessGraphClient.mjs";

// Explicit manual GET from a trusted localhost frontend+Laravel same origin.
// No implicit replication of the volatile synthetic UI, no API writes.
export default function SyntheticBusinessGraphDesk({companyId}){
 const [available,setAvailable]=useState(false);
 const [busy,setBusy]=useState(false);
 const [data,setData]=useState(null);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  setAvailable(syntheticBusinessGraphAvailable());
  setData(null);setNotice("");
 },[companyId]);
 const load=async()=>{
  if(busy||!available)return;
  setBusy(true);setData(null);setNotice("");
  try{
   const graph=await createSyntheticBusinessGraphClient().snapshot(companyId);
   setData(graph);
   setNotice("Prebran je samo sintetični poslovni graf trenutnega podjetja.");
  }catch(error){
   setNotice(error?.message??"Lokalni testni API ni dosegljiv.");
  }finally{setBusy(false)}
 };
 const box={padding:12,borderRadius:12,background:"var(--panel)",
  border:"1px solid var(--line)",marginTop:11};
 const muted={fontSize:10,color:"var(--muted)",lineHeight:1.6};
 return <section aria-label="Enotni sintetični Laravel poslovni graf" style={box}>
  <h4 style={{fontSize:13,margin:"0 0 5px"}}>
   Povezani CRM, naročila, skladiščni načrti in revizija</h4>
  <p style={muted}>Razvojni vpogled v dejanske relacijske zapise izolirane
   testne baze, podjetje {companyId}. Ne usklajuje ali spreminja lokalnega
   demonstracijskega prikaza. Brez računovodskih ali zalogovnih knjižb.</p>
  <button type="button" className="secondary" onClick={load}
   disabled={!available||busy} style={{fontSize:11}}>
   {busy?"Branje …":"Preberi povezane sintetične zapise iz Laravela"}
  </button>
  {!available&&<p style={muted}>
   Zaledni dostop je izključen zunaj lokalne, istega izvora
   prijavljene seje. Javni predogled ne vzpostavlja povezave.
  </p>}
  {data&&<div role="region" aria-label="Povezani sintetični zapisi">
   <p style={{...muted,marginTop:11}}>
    CRM: <b>{data.crm.length}</b> · naročila: <b>{data.orders.length}</b>
    {" · "}načrti: <b>{data.stock_plans.length}</b>
    {" · "}revizija: <b>{data.audit.length}</b>
   </p>
   {[
    ["CRM",data.crm],["Trgovinska naročila",data.orders],
    ["Skladiščni načrti (brez izvedbe)",data.stock_plans],
    ["Revizijska sled",data.audit]
   ].map(([label,rows])=><div key={label} style={{marginTop:9}}>
    <b style={{fontSize:11}}>{label}</b>
    {rows.length===0?<p style={muted}>Ni testnih zapisov.</p>:
     <ul style={{...muted,paddingLeft:18}}>
      {rows.map(row=><li key={row.ref} style={{overflowWrap:"anywhere",marginTop:4}}>
       <strong>{row.ref}</strong>
       {row.order_ref&&<span>{" · naročilo "+row.order_ref}</span>}
       {row.crm_ref&&<span>{" · CRM "+row.crm_ref}</span>}
       {row.entity_ref&&<span>{" · zapis "+row.entity_ref}</span>}
      </li>)}
     </ul>}
   </div>)}
   <p style={muted}>Posnetek je omejen na {data.bounded_limit} zapisov
    na domeno. Ni sinhronizacije ali objave; ni osebnih podatkov
    in revizijskih metapodatkov.</p>
  </div>}
  {notice&&<p role="status" style={{...muted,marginTop:9}}>{notice}</p>}
 </section>;
}
