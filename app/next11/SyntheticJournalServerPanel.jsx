"use client";

import {useEffect,useRef,useState} from "react";
import {createSyntheticJournalPreviewClient,
 syntheticJournalPreviewAvailable} from "./syntheticJournalPreviewClient.mjs";

const euro=cents=>(cents/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR"
});

export default function SyntheticJournalServerPanel({companyId}) {
 const enabled=syntheticJournalPreviewAvailable();
 const [journalId,setJournalId]=useState("");
 const [result,setResult]=useState(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const request=useRef(0);
 useEffect(()=>{
  request.current++;
  setJournalId("");setResult(null);setError("");setLoading(false);
  return()=>{request.current++};
 },[companyId]);
 if(!enabled)return null;

 const review=async()=>{
  const id=Number(journalId);
  if(!/^[1-9][0-9]*$/.test(journalId)||!Number.isSafeInteger(id)){
   setError("Vnesi pozitiven identifikator sintetičnega osnutka.");
   setResult(null);return;
  }
  const generation=++request.current;
  setLoading(true);setResult(null);setError("");
  try{
   const next=await createSyntheticJournalPreviewClient().read(companyId,id);
   if(generation===request.current)setResult(next);
  }catch(e){
   if(generation===request.current)setError(e.message);
  }finally{
   if(generation===request.current)setLoading(false);
  }
 };
 return <section aria-label="Lokalni bralni predpregled računovodskega jedra"
  className="accCard" style={{marginTop:14}}>
  <div className="accHead"><h3>Preveri sintetični osnutek v lokalnem Laravelu</h3>
   <span className="periodState open">Samo razvoj</span></div>
  <div className="accBody">
   <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>
    Uporabi ID izmišljene temeljnice v izolirani testni bazi.
    Preverijo se pravice, odprto obdobje, konti, postavke in ravnotežje.
    Ne ustvarja knjižbe in ne pošilja podatkov na javni strežnik.
   </p>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
    <label style={{fontSize:11}}>ID demo temeljnice
     <input type="text" inputMode="numeric" value={journalId}
      onChange={e=>{request.current++;setJournalId(e.target.value);setResult(null);setError("");setLoading(false)}}
      style={{display:"block",maxWidth:220,padding:9,marginTop:4}}
      autoComplete="off" aria-label="Identifikator sintetične temeljnice"/>
    </label>
    <button type="button" className="primary" disabled={loading}
     onClick={review}>{loading?"Preverjanje …":"Preveri lokalni osnutek"}</button>
   </div>
   {result&&<p role="status" style={{fontSize:11,color:"var(--ok)"}}>
    Podjetje {result.companyId} · {result.reference} · {result.lines.length} postavke.
    Breme {euro(result.totalDebitCents)} · dobro {euro(result.totalCreditCents)}.
    Knjiženje ni omogočeno.
   </p>}
   {error&&<p role="alert" style={{fontSize:11,color:"var(--danger)"}}>{error}</p>}
  </div>
 </section>;
}
