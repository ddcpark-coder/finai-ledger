"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {deliverySample,finalizeDemoDelivery,verifyDemoDelivery} from "../documents/demoDeliveryProof.mjs";
import {createDemoDeliveryPdf} from "../documents/demoDeliveryPdf.mjs";
import {
 queueEncryptedDemoProof,readDemoOutbox,discardDemoOutbox,updateDemoOutbox
} from "../documents/demoReceiptOutbox.mjs";
import {testSyncConfigured,sendDemoOutbox} from "../lib/demoReceiptSyncGateway.mjs";
import {
 encryptDemoProof,decryptDemoProof,storeEncryptedDemoProof,
 readEncryptedDemoProof,deleteEncryptedDemoProof
} from "../documents/mobileProofVault.mjs";

// A deliberately separate synthetic-only mobile route. Never cache real data,
// API responses or credentials. No network sync or certified signature.
const companyOptions=[1,2,3];
const css=`
 .fieldDemo{background:#091522;color:#ecf6ff;min-height:100dvh;font:15px/1.5 system-ui,sans-serif;padding:20px 14px 80px}
 .fieldDemo *{box-sizing:border-box}
 .fieldDemo .shell{max-width:690px;margin:0 auto}
 .fieldDemo h1{font-size:clamp(24px,5vw,35px);margin:9px 0}
 .fieldDemo h2{font-size:19px;margin:0 0 12px}
 .fieldDemo p{color:#b8cad8}
 .fieldDemo .card{border:1px solid #385065;border-radius:16px;background:#13263a;padding:18px;margin:16px 0}
 .fieldDemo label{display:block;font-weight:650;font-size:14px;margin:12px 0 6px}
 .fieldDemo select,.fieldDemo input{font:inherit;background:#0b1c2b;color:#f1f7ff;border:1px solid #68839b;border-radius:9px;padding:12px;width:100%;min-height:48px}
 .fieldDemo button{font:inherit;min-height:48px;padding:11px 14px;border-radius:10px;border:1px solid #78aaa5;background:#75e2cb;color:#08202a;font-weight:700;cursor:pointer}
 .fieldDemo button.secondary{background:#203a50;color:#f3f7ff}
 .fieldDemo button:disabled{opacity:.5;cursor:not-allowed}
 .fieldDemo button:focus-visible,.fieldDemo select:focus-visible,.fieldDemo input:focus-visible,.fieldDemo a:focus-visible{outline:3px solid #f0d873;outline-offset:3px}
 .fieldDemo .row{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
 .fieldDemo .row>*{flex:1 1 180px}
 .fieldDemo .sign{width:100%;height:175px;background:white;touch-action:none;border:2px dashed #94b0c3;border-radius:10px}
 .fieldDemo .small{font-size:13px;color:#aec5d5}
 .fieldDemo .message{font-size:13px;overflow-wrap:anywhere;white-space:pre-wrap}
 .fieldDemo .items{padding-left:20px}
 .fieldDemo a{color:#78dfcc}
 .fieldDemo .pill{display:inline-block;border:1px solid #5a8190;border-radius:30px;padding:7px 10px;font-size:12px}
 .fieldDemo .check{display:flex;gap:11px;align-items:start;font-weight:500}
 .fieldDemo .check input{width:22px;min-height:22px;height:22px;flex:none}
 @media(max-width:440px){.fieldDemo .card{padding:14px}.fieldDemo .row>*{flex-basis:100%}}
`;

function DrawSignature({onChange,locked}){
 const canvasRef=useRef(null),moving=useRef(false),moved=useRef(false);
 useEffect(()=>{
  const canvas=canvasRef.current;
  const ratio=window.devicePixelRatio||1;
  const width=canvas.getBoundingClientRect().width;
  canvas.width=Math.max(1,Math.round(width*ratio));
  canvas.height=Math.round(175*ratio);
  const ctx=canvas.getContext("2d");
  ctx.scale(ratio,ratio);ctx.strokeStyle="#142d46";ctx.lineWidth=2.4;
  ctx.lineJoin="round";ctx.lineCap="round";
 },[]);
 const xy=event=>{
  const rect=canvasRef.current.getBoundingClientRect();
  return {x:event.clientX-rect.left,y:event.clientY-rect.top};
 };
 const down=event=>{
  if(locked)return;
  moving.current=true;moved.current=false;
  const p=xy(event),ctx=canvasRef.current.getContext("2d");
  ctx.beginPath();ctx.moveTo(p.x,p.y);
  canvasRef.current.setPointerCapture?.(event.pointerId);
 };
 const move=event=>{
  if(!moving.current||locked)return;
  event.preventDefault();moved.current=true;
  const p=xy(event),ctx=canvasRef.current.getContext("2d");
  ctx.lineTo(p.x,p.y);ctx.stroke();
 };
 const up=()=>{
  if(moving.current&&moved.current&&!locked)
   onChange(canvasRef.current.toDataURL("image/png"));
  moving.current=false;
 };
 return <div>
  <canvas ref={canvasRef} className="sign" aria-label="Površina za demonstracijski podpis"
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
  <button className="secondary" type="button" disabled={locked}
   onClick={()=>{
    const canvas=canvasRef.current;
    canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    onChange("");
   }}>Počisti podpis</button>
 </div>;
}
function download(bytes,name,mime){
 const blob=new Blob([bytes],{type:mime});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),3000);
}

export default function FieldDemo(){
 const [companyId,setCompanyId]=useState(1);
 const [signer,setSigner]=useState("Sintetični prejemnik");
 const [signature,setSignature]=useState("");
 const [consent,setConsent]=useState(false);
 const [proof,setProof]=useState(null);
 const [password,setPassword]=useState("");
 const [hasLocalCopy,setHasLocalCopy]=useState(false);
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 const [online,setOnline]=useState(true);
 const [install,setInstall]=useState(null);
 const [pending,setPending]=useState(null);
 const [syncMessage,setSyncMessage]=useState("");
 const [syncAvailable,setSyncAvailable]=useState(false);
 useEffect(()=>setSyncAvailable(testSyncConfigured(window.location.href)),[]);
 const document=deliverySample(companyId);

 useEffect(()=>{
  if("serviceWorker" in navigator &&
    (location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
    navigator.serviceWorker.register("/sw.js",{scope:"/field/"})
      .catch(()=>setStatus("Offline namestitev ni uspela; stran deluje le ob povezavi."));
  }
 },[]);
 useEffect(()=>{
  const update=()=>setOnline(navigator.onLine);
  update();window.addEventListener("online",update);window.addEventListener("offline",update);
  const onInstall=e=>{e.preventDefault();setInstall(e)};
  window.addEventListener("beforeinstallprompt",onInstall);
  return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);window.removeEventListener("beforeinstallprompt",onInstall)};
 },[]);
 useEffect(()=>{
  let active=true;
  readDemoOutbox(companyId).then(value=>{
   if(active)setPending(value);
  }).catch(()=>{if(active)setPending(null)});
  return()=>{active=false};
 },[companyId]);
 useEffect(()=>{
  let active=true;
  readEncryptedDemoProof(companyId).then(value=>{
   if(active)setHasLocalCopy(Boolean(value));
  }).catch(()=>{if(active)setHasLocalCopy(false)});
  return()=>{active=false};
 },[companyId]);
 const changeCompany=value=>{
  if(busy)return;
  setCompanyId(value);setSigner("Sintetični prejemnik");setSignature("");
  setConsent(false);setProof(null);setPassword("");setHasLocalCopy(false);setStatus("");
  setPending(null);setSyncMessage("");
 };
 const perform=async(fn)=>{
  if(busy)return;
  setBusy(true);setStatus("");
  try{await fn()}catch(error){setStatus(error?.message||"Operacija ni uspela.")}
  finally{setBusy(false)}
 };
 const finalize=()=>perform(async()=>{
  const result=await finalizeDemoDelivery({document,companyId,signer,signature,accepted:consent});
  if(!await verifyDemoDelivery(result,companyId))throw new Error("Dokazila ni mogoče preveriti.");
  setProof(result);setStatus("Podpis je sintetičen in povezan z zamrznjeno dobavnico. Ni pravno kvalificiran.");
 });
 const save=()=>perform(async()=>{
  if(!proof)throw new Error("Najprej zaključi demonstracijski podpis.");
  const encrypted=await encryptDemoProof(proof,companyId,password);
  await storeEncryptedDemoProof(encrypted,companyId);
  setPassword("");setHasLocalCopy(true);
  setStatus("Šifrirana kopija je shranjena na tej napravi; nič ni poslano na strežnik.");
 });
 const restore=()=>perform(async()=>{
  const envelope=await readEncryptedDemoProof(companyId);
  const restored=await decryptDemoProof(envelope,companyId,password);
  setProof(restored);setSignature(restored.signatureDataUrl);
  setSigner(restored.signer);setConsent(true);setPassword("");
  setStatus("Lokalno dokazilo je dešifrirano in preverjeno.");
 });
 const remove=()=>perform(async()=>{
  if(!window.confirm("Izbrišem samo lokalno šifrirano demo kopijo?"))return;
  await deleteEncryptedDemoProof(companyId);
  setHasLocalCopy(false);setStatus("Lokalna šifrirana kopija izbrisana.");
 });
 const pdf=()=>perform(async()=>{
  if(!proof)throw new Error("Najprej preveri dokazilo.");
  const bytes=await createDemoDeliveryPdf(proof,companyId);
  download(bytes,proof.documentId+"-sinteticno-nepodpisan.pdf","application/pdf");
  setStatus("Shranjen je lokalni DEMO PDF s sliko podpisa, brez digitalnega podpisa.");
 });
 const json=()=>perform(async()=>{
  if(!proof)throw new Error("Najprej preveri dokazilo.");
  download(JSON.stringify(proof,null,2),proof.documentId+"-demo-dokazilo.json","application/json");
 });
 const enqueue=()=>perform(async()=>{
  const encrypted=await readEncryptedDemoProof(companyId);
  if(!encrypted)throw new Error("Najprej shrani šifrirano demo dokazilo.");
  const record=await queueEncryptedDemoProof(encrypted,companyId);
  setPending(record);
  setSyncMessage("Sintetični šifrirani paket je v lokalni čakalni vrsti. Ni bil prenesen.");
 });
 const sendTest=()=>perform(async()=>{
  if(!pending||!syncAvailable)throw new Error("Testni strežnik ni na voljo.");
  const current=await readDemoOutbox(companyId);
  if(!current||current.clientEventId!==pending.clientEventId)
   throw new Error("Lokalni zahtevek se je spremenil; osveži pogled.");
  const result=await sendDemoOutbox(current,companyId);
  await updateDemoOutbox(result.record,companyId);
  setPending(result.record);
  setSyncMessage(result.kind==="conflict"
   ?"KONFLIKT: na strežniku je že verzija "+result.record.serverVersion+
    ". Lokalni šifrirani paket ni prepisan. Izvozi ga za ročni pregled ali odstrani samo zahtevek."
   :"TEST: strežnik je potrdil prejem šifriranega demo paketa, verzija "+
    result.record.serverVersion+". Ni ustvarjenega poslovnega dokumenta.");
 });
 const exportQueue=()=>{
  if(!pending)return;
  download(JSON.stringify({
   format:"finai-manual-synthetic-outbox-export-v1",...pending
  },null,2),pending.documentId+"-sifriran-demo-zahtevek.json","application/json");
 };
 const clearQueue=()=>perform(async()=>{
  if(!pending)return;
  if(!window.confirm("Odstranim samo ta lokalni zahtevek za prenos? Šifrirana dobavnica ostane shranjena."))return;
  await discardDemoOutbox(companyId,pending.clientEventId);
  setPending(null);setSyncMessage("Odstranjen je samo lokalni zahtevek, šifrirana dobavnica ostaja.");
 });
 const installApp=async()=>{
  if(!install)return;
  await install.prompt();setInstall(null);
 };
 return <main className="fieldDemo"><style>{css}</style><div className="shell">
  <div className="pill">FinAI · terenski mobilni prototip · samo sintetični podatki</div>
  <h1>Dobavnica na terenu</h1>
  <p>Podpis, šifrirana lokalna hramba in PDF brez strežniškega prenosa. Po prvi uspešni namestitvi in predpomnjenju se sintetični terenski zaslon lahko zažene tudi brez omrežja.</p>
  <p className="small">Na iPhonu lahko namestiš prek Safari → Deli → Dodaj na domači zaslon. Na Androidu uporabi možnost namestitve v brskalniku, če je na voljo.</p>
  <div className="row">
   {install&&<button type="button" onClick={installApp}>Namesti mobilno aplikacijo</button>}
   <div className="pill" role="status">Omrežje: {online?"naprava poroča povezavo":"naprava je brez povezave"}</div>
  </div>
  <section className="card">
   <h2>1. Izberi podjetje in preveri dobavnico</h2>
   <label htmlFor="field-company">Podjetje</label>
   <select id="field-company" value={companyId} disabled={busy} onChange={e=>changeCompany(Number(e.target.value))}>
    {companyOptions.map(id=><option value={id} key={id}>Sintetično podjetje {id}</option>)}
   </select>
   <p><b>{document.id}</b> · {document.recipient}</p>
   <ul className="items">{document.lines.map((line,i)=>
    <li key={i}>{line.description}: {line.quantity} {line.unit}</li>)}</ul>
  </section>
  <section className="card">
   <h2>2. Prejemnik in podpis</h2>
   <label htmlFor="field-signer">Ime podpisnika (testni podatki)</label>
   <input id="field-signer" value={signer} maxLength={120} disabled={Boolean(proof)}
    onChange={e=>setSigner(e.target.value)}/>
   {proof?<img src={proof.signatureDataUrl} alt="Slika sintetičnega podpisa"
    style={{height:175,width:"100%",objectFit:"contain",background:"#fff",borderRadius:10}}/>:
    <DrawSignature key={companyId} onChange={setSignature} locked={Boolean(proof)}/>}
   <label className="check"><input type="checkbox" checked={consent} disabled={Boolean(proof)}
    onChange={e=>setConsent(e.target.checked)}/>
    Potrjujem, da sem pregledal navedeno sintetično dobavnico.</label>
   <div className="row">
    <button type="button" onClick={finalize}
     disabled={busy||Boolean(proof)||!signature||!consent}>Zaključi demo prevzem</button>
    {proof&&<button className="secondary" type="button" onClick={()=>{
     setProof(null);setSignature("");setConsent(false);setStatus("");
    }}>Nov lokalni podpis</button>}
   </div>
   {proof&&<p className="small">SHA-256 dokazila: {proof.evidenceSha256}</p>}
  </section>
  <section className="card">
   <h2>3. Šifrirana kopija in PDF</h2>
   <p className="small">Geslo se uporablja samo za šifriranje/dešifriranje na tej napravi in se ne shranjuje. Za demonstracijsko kopijo uporabi testno geslo (12+ znakov), ne svojega običajnega gesla.</p>
   <label htmlFor="field-pass">Lokalno testno geslo</label>
   <input id="field-pass" type="password" value={password} maxLength={128}
    autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/>
   <p className="small">{hasLocalCopy?"Šifrirana kopija obstaja na tej napravi.":"Za izbrano podjetje še ni šifrirane kopije."}</p>
   <div className="row">
    <button type="button" disabled={!proof||password.length<12||busy} onClick={save}>Shrani šifrirano</button>
    <button className="secondary" type="button" disabled={!hasLocalCopy||password.length<12||busy} onClick={restore}>Obnovi z geslom</button>
    <button className="secondary" type="button" disabled={!hasLocalCopy||busy} onClick={remove}>Izbriši kopijo</button>
   </div>
   <div className="row">
    <button className="secondary" type="button" disabled={!proof||busy} onClick={pdf}>Prenesi demo PDF</button>
    <button className="secondary" type="button" disabled={!proof||busy} onClick={json}>Izvozi dokazilo JSON</button>
   </div>
   {status&&<p className="message" role="status">{status}</p>}
  </section>
  <section className="card" aria-label="Ročna čakalna vrsta testne sinhronizacije">
   <h2>4. Čakalna vrsta in konfliktnost</h2>
   <p className="small">Po shranitvi šifriranega sintetičnega dokazila lahko pripraviš zahtevek. Prenos je možen
    samo ročno, na <b>lokalnem testnem strežniku</b> z veljavno prijavo in dovoljenji. 
    Resnična sinhronizacija ni aktivna.</p>
   <div className="row">
    <button className="secondary" type="button" onClick={enqueue}
     disabled={!hasLocalCopy||busy}>Pripravi lokalni demo zahtevek</button>
   </div>
   {pending&&<div className="small">
    <p>Dogodek: <code>{pending.clientEventId}</code></p>
    <p>Stanje: <b>{pending.state==="queued"?"Pripravljen za ročno preverbo":
     pending.state==="conflict"?"KONFLIKT – ročni pregled":
     "Testno potrjen"}</b>
     {pending.serverVersion!==null?" · Verzija strežnika: "+pending.serverVersion:""}</p>
   </div>}
   <div className="row">
    <button type="button" onClick={sendTest}
     disabled={!syncAvailable||!online||!pending||pending.state!=="queued"||busy}>
     Ročno pošlji v lokalni testni API
    </button>
    <button className="secondary" type="button" disabled={!pending} onClick={exportQueue}>
     Izvozi šifriran zahtevek
    </button>
    <button className="secondary" type="button" disabled={!pending||busy} onClick={clearQueue}>
     Odstrani samo zahtevek
    </button>
   </div>
   <p className="small">{syncAvailable?"Lokalna testna integracija je konfigurirana.":
    "Strežniški prenos je izključen. Lokalna vrsta lahko deluje brez interneta."}</p>
   {syncMessage&&<p role="status" className="message">{syncMessage}</p>}
  </section>
  <p className="small">Ni dejanskega prevzema, kvalificiranega podpisa, avtomatske sinhronizacije, bančnih ali računovodskih knjižb. Brskalnik lahko lokalne podatke izbriše; to ni produkcijska hramba.</p>
  <Link href="/">Nazaj v FinAI</Link>
 </div></main>;
}
