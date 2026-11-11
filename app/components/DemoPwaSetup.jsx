"use client";

import {useEffect,useState} from "react";

const demoEnabled=process.env.NEXT_PUBLIC_FINAI_DEMO_PWA_ENABLED==="true";

// A standalone optional SYNTHETIC UI only. Worker never caches business APIs.
export default function DemoPwaSetup(){
 const [ready,setReady]=useState(false);
 const [deferred,setDeferred]=useState(null);
 const [installed,setInstalled]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  if(!demoEnabled)return;
  if(!("serviceWorker" in navigator)){
   setMessage("Ta brskalnik ne podpira namestitve demonstracijskega offline prikaza.");
   return;
  }
  let active=true;
  navigator.serviceWorker.register("/sw-finai-demo.js",{scope:"/"}).then(()=>{
    if(active)setReady(true);
  }).catch(()=>{if(active)setMessage("Namestitev demo aplikacije ni na voljo; uporabljaj spletni prikaz.")});
  const onPrompt=event=>{event.preventDefault();setDeferred(event)};
  const onInstalled=()=>{setInstalled(true);setDeferred(null)};
  window.addEventListener("beforeinstallprompt",onPrompt);
  window.addEventListener("appinstalled",onInstalled);
  return ()=>{
   active=false;
   window.removeEventListener("beforeinstallprompt",onPrompt);
   window.removeEventListener("appinstalled",onInstalled);
  };
 },[]);
 const install=async()=>{
  if(!deferred)return;
  await deferred.prompt();
  setDeferred(null);
 };
 if(!demoEnabled)return null;
 return <aside aria-label="Namestitev sintetičnega FinAI demo prikaza"
   style={{margin:"10px auto",maxWidth:880,padding:"10px 14px",border:"1px solid var(--line,#cbd5e1)",borderRadius:10,color:"var(--text,inherit)",background:"var(--panel,transparent)",fontSize:11,lineHeight:1.5}}>
   <b>FinAI Demo – namestitev na napravo</b>
   <p style={{margin:"4px 0"}}>Preizkus za mobilni in namizni zaslon. Omejeni offline predogled uporablja samo
     statično demonstracijsko lupino; brez prijavljenih računov, e-pošte, bančnih povezav, podatkovne baze in trajne offline dokumentne shrambe.</p>
   {deferred&&<button type="button" onClick={install} style={{padding:"7px 12px",borderRadius:7}}>Namesti demo prikaz</button>}
   {installed&&<p role="status">Demonstracijski prikaz je nameščen.</p>}
   {!deferred&&<p role="status" style={{margin:"3px 0"}}>{message||
     (installed?"Demo nameščen":
       ready?"Za namestitev uporabi meni brskalnika → Namesti aplikacijo / Dodaj na začetni zaslon.":"Pripravljam namestljivi demo prikaz ...")}</p>}
 </aside>;
}
