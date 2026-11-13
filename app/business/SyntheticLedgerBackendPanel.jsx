"use client";

import {useEffect,useRef,useState} from "react";
import {
 createSyntheticLedgerClient,syntheticLedgerAvailable
} from "./syntheticLedgerClient.mjs";

const NEXT = {
 draft:{action:"reserve",label:"Rezerviraj 3 demo enote"},
 reserved:{action:"deliver",label:"Potrdi demo dobavnico"},
 delivered:{action:"invoice",label:"Preveri demo dvostavno knjižbo"},
 invoiced:{action:"reverse_invoice",label:"Izvedi demo storno"},
};
const money=value=>(value/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR"
});

export default function SyntheticLedgerBackendPanel({companyId}) {
 const enabled=syntheticLedgerAvailable();
 const [state,setState]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const pending=useRef(null);

 useEffect(()=>{
  let active=true;pending.current=null;setState(null);setError("");
  if(!enabled)return;
  try{
   createSyntheticLedgerClient().read(companyId)
    .then(value=>{if(active)setState(value)})
    .catch(e=>{if(active)setError(e.message)});
  }catch(e){if(active)setError(e.message)}
  return()=>{active=false};
 },[companyId,enabled]);

 if(!enabled)return null;

 const refresh=async()=>{
  if(busy)return;
  setBusy(true);setError("");
  try{setState(await createSyntheticLedgerClient().read(companyId))}
  catch(e){setError(e.message)}
  finally{setBusy(false)}
 };
 const advance=async()=>{
  const next=state&&NEXT[state.state];
  if(!next||busy)return;
  setBusy(true);setError("");
  if(!pending.current||pending.current.action!==next.action||
    pending.current.expectedVersion!==state.version){
   pending.current={action:next.action,
    eventId:crypto.randomUUID(),expectedVersion:state.version};
  }
  try{
   const result=await createSyntheticLedgerClient().advance(companyId,pending.current);
   pending.current=null;
   setState(result);
  }catch(e){
   setError(e.message+" Dogodek ni samodejno ponovljen.");
  }finally{setBusy(false)}
 };
 const lastJournal=state?.events?.filter(e=>Array.isArray(e.journal_lines)&&
  e.journal_lines.length>0).at(-1);
 return <div aria-label="Izolirani sintetični zaledni računovodski test"
  style={{marginTop:12,padding:12,border:"1px solid var(--line)",borderRadius:11,
   background:"var(--bg2)"}}>
   <h4 style={{margin:"0 0 8px",fontSize:12}}>
    Lokalni zaledni test: rezervacija → izdaja → knjižba → storno
   </h4>
   <p style={{fontSize:10,color:"var(--muted)",lineHeight:1.5}}>
    Samo prijavljena lokalna razvojna seja in izmišljeni podatki.
    Uporabnik vsak korak sproži ročno. Brez sprememb pravih zalog, računov,
    glavne knjige, DDV ali FURS.
   </p>
   {state&&<div>
    <p style={{fontSize:11}}>
     <b>{state.state}</b> · različica {state.version} · podjetje {state.company_id}
    </p>
    <p style={{fontSize:11}}>
     Zaloga {state.inventory.on_hand} · rezervirano {state.inventory.reserved}
     · izdano {state.inventory.dispatched}
     · demo bruto {money(state.invoice.gross_cents)}
    </p>
    {lastJournal&&<p style={{fontSize:10,color:"var(--muted)"}}>
     Zadnja demo knjižba: {lastJournal.journal_lines.length} postavke;
     debet {money(lastJournal.journal_lines.reduce((n,l)=>n+l.debit_cents,0))}
     · kredit {money(lastJournal.journal_lines.reduce((n,l)=>n+l.credit_cents,0))}
    </p>}
   </div>}
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    <button type="button" className="secondary" disabled={busy}
     onClick={refresh}>Preveri lokalno zaledje</button>
    {state&&NEXT[state.state]&&<button type="button" className="primary"
     disabled={busy} onClick={advance}>{NEXT[state.state].label}</button>}
   </div>
   {error&&<p role="alert" style={{fontSize:10,color:"var(--danger)"}}>{error}</p>}
  </div>;
}
