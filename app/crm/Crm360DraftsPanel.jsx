"use client";
import {useEffect,useState} from "react";
import {useCrm360Session} from "./useCrm360Session";
import {performCrm360} from "./crm360Session.mjs";

const euro=cents=>(cents/100).toLocaleString("sl-SI",{style:"currency",currency:"EUR"});
export default function Crm360DraftsPanel({companyId,kind}){
 const state=useCrm360Session(companyId);
 const [confirmedId,setConfirmedId]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{setConfirmedId("");setNotice("");},[companyId]);
 if(!["quotes","orders"].includes(kind))return null;
 const rows=kind==="quotes"?state.quotes:state.orders;
 const doAction=(action)=>{
  try{
   const next=performCrm360(companyId,action);
   setConfirmedId("");
   setNotice(action.type==="quote.approve"?
    "Sintetična ponudba je ročno potrjena v trenutnem zavihku.":
    next.orders.length===state.orders.length?
    "To testno naročilo že obstaja; ni ustvarjen podvojen zapis.":
    "Ustvarjen je povezan osnutek naročila brez rezervacije zalog.");
  }catch(error){
   setConfirmedId("");
   setNotice(error.message??"Neveljavna CRM 360 povezava.");
  }
 };
 return <section aria-label={kind==="quotes"?"CRM 360 povezane demo ponudbe":"CRM 360 povezana demo naročila"}
  style={{border:"1px solid var(--line)",background:"var(--panel)",
   borderRadius:13,padding:13,marginBottom:12}}>
  <h3 style={{fontSize:13,margin:"0 0 5px"}}>
   {kind==="quotes"?"CRM 360 → ponudbe":"CRM 360 → naročila"}
  </h3>
  <p style={{fontSize:10,color:"var(--muted)",lineHeight:1.6,margin:"0 0 10px"}}>
   Samo sintetični osnutki, ustvarjeni iz kartice stranke podjetja {companyId}.
   {kind==="quotes"?
    " Pred ustvarjanjem naročila mora uporabnik ponudbo posebej potrditi.":
    " Osnutek naročila ni dobavnica ali račun in ne rezervira zalog."}
   Podatki ostanejo samo v pomnilniku tega zavihka.
  </p>
  {rows.length===0&&<p style={{fontSize:11,margin:0}}>
   Za izbrano podjetje ni povezanih demo {kind==="quotes"?"ponudb":"naročil"}.
   Najprej pripravi ponudbo v <a href="/?module=crm">CRM 360</a>.
  </p>}
  <div style={{display:"grid",gap:8}}>
   {rows.map(row=><article key={row.id} style={{
    background:"var(--bg2)",border:"1px solid var(--line)",borderRadius:10,padding:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,
     alignItems:"start",flexWrap:"wrap"}}>
     <div style={{display:"grid",gap:5,fontSize:11}}>
      <b>{row.id} · {row.partner}</b>
      <small style={{color:"var(--muted)"}}>
       Priložnost {row.dealId}
       {kind==="orders"?" · iz ponudbe "+row.quoteId:""}
      </small>
      <small>Stanje: {row.status==="draft"?"osnutek":
       row.status==="approved"?"ročno potrjena":"osnutek naročila za pregled"}</small>
     </div>
     <b style={{fontSize:12}}>{euro(row.valueCents)}</b>
    </div>
    {kind==="quotes"&&<div style={{marginTop:9,display:"grid",gap:8}}>
     {row.status==="draft"&&<label style={{display:"flex",gap:7,
       fontSize:10,alignItems:"center"}}>
      <input type="checkbox" checked={confirmedId===row.id}
       onChange={e=>setConfirmedId(e.target.checked?row.id:"")}/>
      Potrjujem samo sintetični osnutek te ponudbe; ne pošiljaj ga stranki.
     </label>}
     <button type="button" className="secondary"
      disabled={row.status!=="draft"||confirmedId!==row.id}
      onClick={()=>doAction({
       type:"quote.approve",quoteId:row.id,expectedVersion:row.version,confirmed:true
      })}>
      {row.status==="approved"?"Potrjena demo ponudba":"Ročno potrdi demo ponudbo"}
     </button>
     <button type="button" className="primary"
      disabled={row.status!=="approved"||state.orders.some(o=>o.quoteId===row.id)}
      onClick={()=>doAction({type:"order.create",quoteId:row.id,confirmed:true})}>
      {state.orders.some(o=>o.quoteId===row.id)?
       "Povezan demo osnutek naročila že obstaja":"Pripravi osnutek demo naročila"}
     </button>
    </div>}
   </article>)}
  </div>
  {notice&&<p role="status" style={{fontSize:10,margin:"9px 0 0",
   color:"var(--muted)"}}>{notice}</p>}
 </section>;
}
