"use client";
import {useEffect,useState} from "react";
import {
 createSyntheticCommerceReviewClient,syntheticCommerceReviewAvailable
} from "./syntheticCommerceReviewClient.mjs";

const panel={marginTop:14,padding:13,border:"1px solid var(--line)",background:"var(--panel)",borderRadius:13};
const itemStyle={padding:11,marginTop:8,border:"1px solid var(--line)",borderRadius:10,background:"var(--bg2)"};
const btn={border:"1px solid var(--line)",borderRadius:8,padding:"9px 11px",
 background:"var(--panel)",color:"var(--text)",fontWeight:650,fontSize:11};
const formatCents=c=>(c/100).toLocaleString("sl-SI",{style:"currency",currency:"EUR"});
const statusText=s=>s==="reviewed"?"Pregledano":s==="hold"?"Zadržano":"Čaka pregled";

export default function SyntheticCommerceReviewDesk({companyId,previewOrders,onPreviewDecision}){
 const [available,setAvailable]=useState(false);
 const [items,setItems]=useState([]);
 const [nextCursor,setNextCursor]=useState(null);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  setAvailable(syntheticCommerceReviewAvailable());
  setItems([]);setNextCursor(null);setLoaded(false);setMessage("");
 },[companyId]);

 const perform=async fn=>{
  if(busy)return;
  setBusy(true);setMessage("");
  try{await fn()}catch(e){setMessage(e?.message||"Lokalni testni API ni dosegljiv.");}
  finally{setBusy(false)}
 };
 const refresh=(more=false)=>perform(async()=>{
  if(!available)throw new Error("Povezava je izključena zunaj lokalnega testnega okolja.");
  const api=createSyntheticCommerceReviewClient();
  const page=await api.list(companyId,{afterId:more?(nextCursor??0):0});
  setItems(before=>more?[...before,...page.items]:page.items);
  setNextCursor(page.next_cursor);setLoaded(true);
  setMessage("Naloženi so samo sintetični zapisi prijavljenega podjetja.");
 });
 const decide=(id,decision)=>perform(async()=>{
  if(!available)throw new Error("Brez lokalne prijave ni spreminjanja naročil.");
  if(!window.confirm("Potrdim "+(decision==="hold"?"zadržanje":"pregled")+
   " izključno sintetičnega naročila #"+id+"?"))return;
  await createSyntheticCommerceReviewClient().decide(companyId,id,decision);
  const page=await createSyntheticCommerceReviewClient().list(companyId);
  setItems(page.items);setNextCursor(page.next_cursor);setLoaded(true);
  setMessage("Sintetična odločitev je revizijsko zabeležena. Ni knjiženja ali rezervacij.");
 });
 return <section style={panel} aria-label="Pregledna vrsta sintetičnih trgovinskih naročil">
  <h4 style={{margin:"0 0 5px",fontSize:13}}>Pregledna vrsta naročil</h4>
  <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>
   Testni pregled Shopify / WooCommerce, podjetje {companyId}. Brez pravih naročil,
   ponudniških ključev, izdaje računov ali premikov zalog.
  </p>
  <h5 style={{fontSize:12,margin:"15px 0 6px"}}>Lokalni demonstracijski predogled</h5>
  <p style={{fontSize:10,color:"var(--muted)"}}>
   Odločitve se hranijo samo v pomnilniku tega zaslona. Ponastavitev demo podatke izbriše.
  </p>
  {!previewOrders.length&&<p style={{fontSize:11}}>
   Zgornji gumb »Pripravi sintetično naročilo za pregled« doda vzorčni zapis.
  </p>}
  {previewOrders.map(order=><div key={order.eventId} style={itemStyle}>
   <b style={{fontSize:12}}>{order.provider} · {order.externalOrderId}</b>
   <p style={{fontSize:11,color:"var(--muted)",margin:"5px 0"}}>
    {formatCents(order.totalCents)} · {order.lines.length} postavka/e · {statusText(order.status)}
   </p>
   {order.status==="review"&&<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
    <button type="button" style={btn}
      onClick={()=>onPreviewDecision(order.eventId,"reviewed")}>Demo: pregledano</button>
    <button type="button" style={btn}
      onClick={()=>onPreviewDecision(order.eventId,"hold")}>Demo: zadrži</button>
   </div>}
   <small style={{display:"block",marginTop:7,color:"var(--muted)"}}>
    Samo lokalni prikaz · brez strežniške revizije
   </small>
  </div>)}

  <div style={{borderTop:"1px solid var(--line)",marginTop:18,paddingTop:14}}>
   <h5 style={{fontSize:12,margin:"0 0 6px"}}>Lokalni zaledni test FinAI (Laravel)</h5>
   <p style={{fontSize:11,color:"var(--muted)"}}>
    {available
     ?"Na voljo samo za isti localhost izvor in z izrecno prijavljeno sejo, CSRF in pravicami orders.read / orders.write."
     :"Zaledni dostop je izključen. Javni predogled ne dostopa do trgovin ali API-ja."}
   </p>
   <button type="button" disabled={!available||busy} style={btn}
    onClick={()=>refresh(false)}>Osveži lokalno pregledno vrsto</button>
   {loaded&&items.length===0&&<p style={{fontSize:11}}>V testni bazi ni sintetičnih naročil.</p>}
   {items.map(row=><div key={row.id} style={itemStyle}>
    <b style={{fontSize:12}}>{row.provider} · {row.external_order_id}</b>
    <p style={{fontSize:11,color:"var(--muted)",margin:"5px 0"}}>
     {formatCents(row.total_cents)} · {row.line_count} postavka/e ·
     skladišče #{row.warehouse_id} · {statusText(row.status)}
    </p>
    {row.status==="review"&&<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
     <button type="button" disabled={!available||busy} style={btn}
      onClick={()=>decide(row.id,"reviewed")}>Pregledano (test)</button>
     <button type="button" disabled={!available||busy} style={btn}
      onClick={()=>decide(row.id,"hold")}>Zadrži (test)</button>
    </div>}
   </div>)}
   {loaded&&nextCursor!==null&&<button type="button" disabled={busy}
     onClick={()=>refresh(true)} style={{...btn,marginTop:10}}>Naloži naslednje</button>}
   {message&&<p role="status" style={{fontSize:11,color:"var(--muted)",marginTop:10}}>
    {message}
   </p>}
  </div>
 </section>;
}
