"use client";
import BusinessChainPanel from "../business/BusinessChainPanel";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {useEffect,useRef,useState} from "react";
import {deliverySample,finalizeDemoDelivery,verifyDemoDelivery} from "./demoDeliveryProof.mjs";
import {createDemoDeliveryPdf} from "./demoDeliveryPdf.mjs";
import {
 encryptDemoProof,decryptDemoProof,storeEncryptedDemoProof,
 readEncryptedDemoProof,deleteEncryptedDemoProof
} from "./mobileProofVault.mjs";

const docs=[
 {companyId:1,type:"Dobavnica",title:"DOB-2026-0048",link:"ABC d.o.o.",status:"Za podpis",date:"03. 11. 2026"},
 {companyId:1,type:"Prejeti račun",title:"PR-2026-0188",link:"Merkur d.o.o.",status:"Final",date:"02. 11. 2026"},
 {companyId:1,type:"Izdani račun",title:"2026-0054",link:"ABC d.o.o.",status:"Final",date:"02. 11. 2026"},
 {companyId:1,type:"DDV",title:"DDV-O 11/2026",link:"Davčno obdobje",status:"Osnutek",date:"03. 11. 2026"},
 {companyId:2,type:"Dobavnica",title:"SYNTH-DOB-B001",link:"Sintetični kupec Beta",status:"Za podpis",date:"11. 11. 2026"},
 {companyId:3,type:"Dobavnica",title:"SYNTH-DOB-C001",link:"Sintetični kupec Gama",status:"Za podpis",date:"11. 11. 2026"}
];

function SignaturePad({onChange,disabled=false}){
 const ref=useRef(null);
 const drawing=useRef(false);
 const hasInk=useRef(false);
 useEffect(()=>{
   const canvas=ref.current;
   const ctx=canvas.getContext("2d");
   const fit=()=>{
     const rect=canvas.getBoundingClientRect();
     const ratio=window.devicePixelRatio||1;
     canvas.width=Math.max(1,Math.floor(rect.width*ratio));
     canvas.height=Math.max(1,Math.floor(180*ratio));
     ctx.setTransform(ratio,0,0,ratio,0,0);
     ctx.lineWidth=2.2;
     ctx.lineCap="round";
     ctx.lineJoin="round";
     ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--text")||"#fff";
   };
   fit();
   window.addEventListener("resize",fit);
   return()=>window.removeEventListener("resize",fit);
 },[]);
 const point=e=>{
   const rect=ref.current.getBoundingClientRect();
   return {x:e.clientX-rect.left,y:e.clientY-rect.top};
 };
 const down=e=>{if(disabled)return;e.preventDefault();drawing.current=true;hasInk.current=false;const p=point(e);const ctx=ref.current.getContext("2d");ctx.beginPath();ctx.moveTo(p.x,p.y);ref.current.setPointerCapture?.(e.pointerId)};
 const move=e=>{if(!drawing.current||disabled)return;hasInk.current=true;e.preventDefault();const p=point(e);const ctx=ref.current.getContext("2d");ctx.lineTo(p.x,p.y);ctx.stroke();onChange(ref.current.toDataURL("image/png"))};
 const up=e=>{if(!drawing.current)return;drawing.current=false;if(hasInk.current&&!disabled)onChange(ref.current.toDataURL("image/png"));ref.current.releasePointerCapture?.(e.pointerId)};
 const clear=()=>{if(disabled)return;const canvas=ref.current;canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);hasInk.current=false;onChange("")};
 return <div><canvas ref={ref} aria-label="Površina za risanje demonstracijskega podpisa" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{width:"100%",height:180,touchAction:"none",border:"1px dashed var(--line)",borderRadius:12,background:"var(--bg2)"}}/><button type="button" className="secondary" disabled={disabled} style={{marginTop:7}} onClick={clear}>Počisti podpis</button></div>
}

export default function DocumentsWorkspace({context,companyId}){
 const section=context?.level2??"Vsi dokumenti";
 const subView=context?.level3??"Nedavno";
 const [selected,setSelected]=useState(docs[0]);
 const [signer,setSigner]=useState("Sintetični prejemnik");
 const [email,setEmail]=useState("demo@example.test");
 const [signature,setSignature]=useState("");
 const [completed,setCompleted]=useState(false);
 const [sent,setSent]=useState(false);
 const [proof,setProof]=useState(null);
 const [proofBusy,setProofBusy]=useState(false);
 const [proofError,setProofError]=useState("");
 const [pdfBusy,setPdfBusy]=useState(false);
 const [pdfError,setPdfError]=useState("");
 const [accepted,setAccepted]=useState(false);
 const [vaultPassword,setVaultPassword]=useState("");
 const [vaultBusy,setVaultBusy]=useState(false);
 const [vaultExists,setVaultExists]=useState(false);
 const [vaultMessage,setVaultMessage]=useState("");
 useEffect(()=>{
   let active=true;
   readEncryptedDemoProof(companyId)
     .then(value=>{if(active)setVaultExists(Boolean(value))})
     .catch(()=>{if(active)setVaultExists(false)});
   return()=>{active=false};
 },[companyId]);
 useEffect(()=>{
   setSelected(docs.find(d=>d.companyId===companyId)??null);
   setSigner("Sintetični prejemnik");setEmail("demo@example.test");
   setSignature("");setCompleted(false);setSent(false);
   setProof(null);setProofError("");setPdfError("");setAccepted(false);
   setVaultPassword("");setVaultMessage("");
 },[companyId]);
 const finish=async()=>{
   if(proofBusy||completed)return;
   setProofBusy(true);setProofError("");
   try{
     const evidence=await finalizeDemoDelivery({
       companyId,document:deliverySample(companyId),
       signer,signature,accepted
     });
     if(!(await verifyDemoDelivery(evidence,companyId)))
       throw new Error("Celovitosti demonstracijskega dokazila ni bilo mogoče potrditi.");
     setProof(evidence);setCompleted(true);
   }catch(error){setProofError(error.message||"Zaključevanje ni uspelo.");}
   finally{setProofBusy(false);}
 };
 const saveMobileProof=async()=>{
   if(!completed||!proof||vaultBusy)return;
   setVaultBusy(true);setVaultMessage("");
   try{
     const encrypted=await encryptDemoProof(proof,companyId,vaultPassword);
     await storeEncryptedDemoProof(encrypted,companyId);
     setVaultExists(true);setVaultPassword("");
     setVaultMessage("Sintetično dokazilo je šifrirano shranjeno samo na tej napravi. Sinhronizacija ni aktivna.");
   }catch(error){setVaultMessage(error.message||"Šifrirana hramba ni uspela.");}
   finally{setVaultBusy(false);}
 };
 const restoreMobileProof=async()=>{
   if(!vaultExists||vaultBusy)return;
   setVaultBusy(true);setVaultMessage("");
   try{
     const encrypted=await readEncryptedDemoProof(companyId);
     const restored=await decryptDemoProof(encrypted,companyId,vaultPassword);
     setProof(restored);setSigner(restored.signer);
     setSignature(restored.signatureDataUrl);setAccepted(true);setCompleted(true);
     setVaultPassword("");
     setVaultMessage("Sintetično dokazilo je uspešno dešifrirano in ponovno preverjeno.");
   }catch(error){setVaultMessage(error.message||"Lokalna obnova ni uspela.");}
   finally{setVaultBusy(false);}
 };
 const removeMobileProof=async()=>{
   if(!vaultExists||vaultBusy)return;
   if(!window.confirm("Odstranim šifrirano testno dokazilo iz te naprave?"))return;
   setVaultBusy(true);
   try{
     await deleteEncryptedDemoProof(companyId);
     setVaultExists(false);setVaultPassword("");
     setVaultMessage("Odstranjena je samo lokalna šifrirana kopija tega sintetičnega podjetja.");
   }catch{setVaultMessage("Lokalne kopije ni bilo mogoče odstraniti.");}
   finally{setVaultBusy(false);}
 };
 const exportPdf=async()=>{
   if(!completed||!proof||pdfBusy)return;
   setPdfBusy(true);setPdfError("");
   try{
     const bytes=await createDemoDeliveryPdf(proof,companyId);
     const blob=new Blob([bytes],{type:"application/pdf"});
     const url=URL.createObjectURL(blob);
     const anchor=document.createElement("a");
     anchor.href=url;anchor.download=proof.documentId+"-demo-nepodpisan.pdf";
     document.body.appendChild(anchor);anchor.click();anchor.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch(error){setPdfError(error.message||"PDF ni bil ustvarjen.");}
   finally{setPdfBusy(false);}
 };
 const exportProof=()=>{
   if(!completed||!proof)return;
   const blob=new Blob([JSON.stringify(proof,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob);
   const link=document.createElement("a");
   link.href=url;link.download=proof.documentId+"-demo-podpis.json";
   document.body.appendChild(link);link.click();link.remove();
   URL.revokeObjectURL(url);
 };
 const visibleDocs=docs.filter(d=>{
   if(d.companyId!==companyId)return false;
   if(section==="Vsi dokumenti")return subView==="Arhiv"?d.status==="Final":subView==="Za pregled"?d.status!=="Final":true;
   if(section==="Računi")return subView==="Prejeti"?d.type==="Prejeti račun":subView==="Izdani"?d.type==="Izdani račun":false;
   if(section==="Dobavnice")return d.type==="Dobavnica"&&(subView==="Za podpis"?d.status==="Za podpis":false);
   if(section==="Podpisi")return subView==="Na zaslonu"&&d.type==="Dobavnica"&&d.status==="Za podpis";
   return false;
 });
 const activeSelected=visibleDocs.find(d=>d.title===selected?.title)??visibleDocs[0]??null;
 const showSignature=(section==="Dobavnice"||(section==="Podpisi"&&subView==="Na zaslonu"))&&activeSelected?.type==="Dobavnica";

 useEffect(()=>{
   if(visibleDocs.length&&!visibleDocs.some(row=>row.title===selected?.title)){
     setSelected(visibleDocs[0]);setCompleted(false);setSent(false);
     setSignature("");setProof(null);setAccepted(false);setProofError("");setPdfError("");
   }
 },[section,subView,companyId,selected?.title]);

 return <section className="docsWorkspace">
  <style>{`
  .docsWorkspace{margin-top:10px}
  .docsWorkspace :is(button,input){min-height:36px}
  .docsWorkspace button:focus-visible,.docsWorkspace input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .docsGrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:10px}.docCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.docHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.docHead h3{margin:0;font-size:12px}.docRow{display:grid;grid-template-columns:.8fr 1.2fr 1fr .8fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.docRow.head{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.docRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.docRow b{font-size:10px}.docRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.docStatus{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.docStatus.ok{color:var(--ok)}.docStatus.warn{color:var(--warn)}.delivery{padding:14px}.delivery h3{margin:8px 0 2px;font-size:17px}.delivery>small{color:var(--muted);font-size:9px}.deliveryMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.deliveryMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.deliveryMeta small,.deliveryMeta b{display:block}.deliveryMeta small{font-size:8px;color:var(--muted)}.deliveryMeta b{font-size:10px;margin-top:3px}.deliverySec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.deliverySec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.deliveryLine{display:grid;grid-template-columns:1.3fr .5fr .5fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.field{width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:9px;font-size:9px;margin-bottom:7px}.proof{border:1px solid color-mix(in srgb,var(--accent) 40%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent) 5%,var(--panel))}.proof b,.proof small{display:block}.proof small{font-size:8px;color:var(--muted);margin-top:3px}.pwaBox{margin:12px;border:1px solid color-mix(in srgb,var(--violet) 45%,var(--line));border-radius:11px;padding:11px;background:color-mix(in srgb,var(--violet) 5%,var(--panel))}.pwaBox b,.pwaBox small{display:block}.pwaBox small{font-size:8px;color:var(--muted);margin-top:3px}
  @media(max-width:1100px){.docsGrid{grid-template-columns:1fr}}
  @media(max-width:760px){.docRow{grid-template-columns:1fr .9fr .7fr}.docRow>*:nth-child(3){display:none}.deliveryMeta{grid-template-columns:1fr}
    .delivery{padding:12px}.deliverySec h4{font-size:11px}.deliveryLine{font-size:11px}.field{font-size:14px;min-height:44px}
    .deliverySec button{min-height:44px;font-size:12px}
    .deliveryMeta b{font-size:12px}.deliveryMeta small,.proof small{font-size:11px}
    .docsWorkspace{overflow-wrap:anywhere}
  }
  `}</style>

  <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Dokumenti · <b style={{color:"var(--text)"}}>{section} / {subView}</b> · demonstracijski podatki</div>
  <BusinessChainPanel companyId={companyId} moduleKey="documents"/>
 <AdaptivePaneGrid className="docsGrid">
   <article className="docCard">
    <div className="docHead"><h3>Dokumenti · {section} / {subView}</h3><button className="primary" type="button" disabled title="Prava dokumentna hramba še ni vključena">＋ Nov dokument (v pripravi)</button></div>
    <div className="pwaBox"><b>Mobilna dobavnica · demonstracija</b><small>Podpis z miško, prstom ali pisalom in lokalni SHA-256 dokazni paket. Na voljo je lokalni demonstracijski PDF s sliko podpisa; ni certificiranega elektronskega podpisa, e-pošte ali strežniške shrambe.</small></div>
    <div className="docRow head"><span>Tip</span><span>Dokument</span><span>Povezava</span><span>Status</span></div>
    {!visibleDocs.length&&<p style={{fontSize:10,color:"var(--muted)",padding:12}}>Za izbrani podpogled še ni dokumentov v demonstracijskem naboru.</p>}
    {visibleDocs.map(d=><button className="docRow" key={d.title} onClick={()=>{setSelected(d);setCompleted(false);setSent(false);setSignature("");setProof(null);setAccepted(false);setProofError("")}}>
      <span><b>{d.type}</b><small>{d.date}</small></span><span><b>{d.title}</b></span><span>{d.link}</span><span className={"docStatus "+(d.status==="Final"?"ok":"warn")}>{d.status}</span>
    </button>)}
   </article>

   {!visibleDocs.length?<aside className="docCard delivery" style={{padding:14,color:"var(--muted)"}}>Za izbrani podpogled ni ustreznega dokumenta.</aside>:showSignature?<aside className="docCard delivery">
    <span className={"docStatus "+(completed?"ok":"warn")}>{completed?"Zaključena":"Za podpis"}</span>
    <h3>{deliverySample(companyId).id}</h3><small>{deliverySample(companyId).recipient} · sintetična dobavnica</small>
    <div className="deliveryMeta"><div><small>Prejemnik</small><b>{signer||"—"}</b></div><div><small>E-pošta</small><b>{email||"—"}</b></div><div><small>Lokacija</small><b>Opcijsko</b></div><div><small>Način podpisa</small><b>Podpis na zaslonu</b></div></div>

    <div className="deliverySec"><h4>Prevzeto blago</h4>{deliverySample(companyId).lines.map((line,i)=><div className="deliveryLine" key={i}><span>{line.description}</span><b>{line.quantity}</b><span>{line.unit}</span></div>)}</div>

    <div className="deliverySec"><h4>Podpisnik</h4><input className="field" value={signer} disabled={completed} aria-label="Podpisnik dobavnice" onChange={e=>setSigner(e.target.value)} placeholder="Ime in priimek"/><input className="field" value={email} disabled={completed} type="email" aria-label="E-pošta za demonstracijo" onChange={e=>setEmail(e.target.value)} placeholder="E-pošta za kopijo"/></div>

    <div className="deliverySec"><h4>Podpis na zaslonu</h4>
      {proof&&completed
        ?<img src={proof.signatureDataUrl} alt="Preverjena slika sintetičnega podpisa (ni kvalificiran podpis)"
          style={{width:"100%",height:160,objectFit:"contain",border:"1px dashed var(--line)",borderRadius:12}}/>
        :<SignaturePad key={companyId+"-"+activeSelected.title} onChange={setSignature} disabled={completed}/>}
    </div>

    <div className="deliverySec"><h4>Preverjanje demonstracijskega prevzema</h4>
      <div className="proof"><b>{proof?"Lokalno dokazilo izračunano":signature?"Podpis zajet (še nepotrjen)":"Podpis še ni zajet"}</b>
        <small>Ob zaključku izračunamo SHA-256 dobavnice, podpisa in dokaznega zapisa ter zabeležimo čas. Ne beležimo IP ali lokacije. To ni kvalificirani e-podpis, pravno preverjeno dokazilo ali končni PDF.</small>
        {proof&&<><small>Čas: {proof.signedAt}</small><small>SHA-256 dokazila: {proof.evidenceSha256}</small></>}
      </div>
      <label style={{display:"flex",gap:8,alignItems:"start",marginTop:9,fontSize:11,lineHeight:1.4}}>
        <input type="checkbox" checked={accepted} disabled={completed} onChange={e=>setAccepted(e.target.checked)}/>
        Potrjujem, da je podpisnik v tej demonstraciji pregledal navedeno dobavnico.
      </label>
      <button type="button" className="secondary" disabled title="Pravi zajem fotografij še ni povezan" style={{width:"100%",marginTop:7}}>Dodaj fotografijo (v pripravi)</button>
    </div>

    <div className="deliverySec"><h4>Zaključek</h4><div style={{display:"grid",gap:7}}>
      <button type="button" className="primary" disabled={!signature||!signer.trim()||!accepted||completed||proofBusy} onClick={finish}>{completed?"Demo dobavnica potrjena":proofBusy?"Preverjam celovitost …":"Zaključi in preveri demo dokazilo"}</button>
      {proofError&&<p role="alert" style={{color:"var(--danger)",fontSize:11}}>{proofError}</p>}
      <button type="button" className="secondary" disabled={!completed||!proof||pdfBusy} onClick={exportPdf}>
        {pdfBusy?"Pripravljam PDF …":"Prenesi demo PDF s sliko podpisa"}
      </button>
      {pdfError&&<p role="alert" style={{color:"var(--danger)",fontSize:11}}>{pdfError}</p>}
      <button type="button" className="secondary" disabled={!completed||!proof} onClick={exportProof}>Izvozi demo dokazilo (.json)</button>
      <button type="button" className="secondary" disabled title="Dejansko pošiljanje e-pošte še ni vključeno">Pošlji kopijo (v pripravi)</button>
      <button type="button" className="secondary" disabled title="Integracija s kvalificiranim podpisom še ni na voljo">Kvalificiran podpis (v pripravi)</button>
    </div></div>
    <div className="deliverySec" aria-label="Lokalna šifrirana hramba sintetičnega dokazila">
      <h4>Šifrirana lokalna kopija (demo)</h4>
      <p style={{fontSize:11,lineHeight:1.55,color:"var(--muted)"}}>
        V brskalniku se hrani samo šifrirano dokazilo. Geslo se ne pošlje nikamor in ga FinAI ne shrani.
        Ob izgubi gesla lokalne kopije ni mogoče obnoviti. Prava sinhronizacija in offline zagon PWA še nista vključena.
      </p>
      <label style={{display:"block",fontSize:11}}>
        Lokalno geslo (12 ali več znakov)
        <input type="password" className="field" autoComplete="new-password"
          aria-label="Geslo šifriranega demo dokazila"
          minLength={12} maxLength={128} value={vaultPassword}
          onChange={event=>setVaultPassword(event.target.value)}
          placeholder="Lokalno geslo, ki ga ne shranjujemo"/>
      </label>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        <button type="button" className="secondary" onClick={saveMobileProof}
          disabled={!completed||!proof||vaultBusy||vaultPassword.length<12}>
          Shrani šifrirano demo kopijo
        </button>
        <button type="button" className="secondary" onClick={restoreMobileProof}
          disabled={!vaultExists||vaultBusy||vaultPassword.length<12}>
          Obnovi šifrirano demo kopijo
        </button>
        <button type="button" className="secondary" onClick={removeMobileProof}
          disabled={!vaultExists||vaultBusy}>Izbriši lokalno demo kopijo</button>
      </div>
      <p style={{fontSize:10,color:"var(--muted)"}}>
        {vaultExists?"Šifrirana kopija je prisotna na napravi.":"Šifrirana kopija še ni shranjena."}
      </p>
      {vaultMessage&&<p role="status" style={{fontSize:11}}>{vaultMessage}</p>}
    </div>
   </aside>:<aside className="docCard delivery"><h3>{activeSelected?.title??"—"}</h3><small>{activeSelected?.type??"Dokument"} · {activeSelected?.status??"—"}</small><div className="deliverySec"><h4>Dokumentni pogled</h4><p style={{fontSize:10,color:"var(--muted)"}}>Izbrano: {section} / {subView}. Ko je ustrezen dokument na voljo, ga izberi s seznama. Podpisovanje je dostopno samo pri dobavnicah za podpis.</p></div></aside>}
  </AdaptivePaneGrid>
 </section>
}
