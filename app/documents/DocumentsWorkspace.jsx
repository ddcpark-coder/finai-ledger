"use client";
import {useEffect,useRef,useState} from "react";

const docs=[
 {type:"Dobavnica",title:"DOB-2026-0048",link:"ABC d.o.o.",status:"Za podpis",date:"03. 11. 2026"},
 {type:"Prejeti račun",title:"PR-2026-0188",link:"Merkur d.o.o.",status:"Final",date:"02. 11. 2026"},
 {type:"Izdani račun",title:"2026-0054",link:"ABC d.o.o.",status:"Final",date:"02. 11. 2026"},
 {type:"DDV",title:"DDV-O 11/2026",link:"Davčno obdobje",status:"Osnutek",date:"03. 11. 2026"}
];

function SignaturePad({onChange}){
 const ref=useRef(null);
 const drawing=useRef(false);
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
 const down=e=>{e.preventDefault();drawing.current=true;const p=point(e);const ctx=ref.current.getContext("2d");ctx.beginPath();ctx.moveTo(p.x,p.y);ref.current.setPointerCapture?.(e.pointerId)};
 const move=e=>{if(!drawing.current)return;e.preventDefault();const p=point(e);const ctx=ref.current.getContext("2d");ctx.lineTo(p.x,p.y);ctx.stroke();onChange(ref.current.toDataURL("image/png"))};
 const up=e=>{if(!drawing.current)return;drawing.current=false;onChange(ref.current.toDataURL("image/png"));ref.current.releasePointerCapture?.(e.pointerId)};
 const clear=()=>{const canvas=ref.current;canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);onChange("")};
 return <div><canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{width:"100%",height:180,touchAction:"none",border:"1px dashed var(--line)",borderRadius:12,background:"var(--bg2)"}}/><button className="secondary" style={{marginTop:7}} onClick={clear}>Počisti podpis</button></div>
}

export default function DocumentsWorkspace(){
 const [selected,setSelected]=useState(docs[0]);
 const [signer,setSigner]=useState("Janez Novak");
 const [email,setEmail]=useState("janez@example.si");
 const [signature,setSignature]=useState("");
 const [completed,setCompleted]=useState(false);
 const [sent,setSent]=useState(false);
 const [photo,setPhoto]=useState(false);

 return <section className="docsWorkspace">
  <style>{`
  .docsWorkspace{margin-top:10px}.docsGrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:10px}.docCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.docHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.docHead h3{margin:0;font-size:12px}.docRow{display:grid;grid-template-columns:.8fr 1.2fr 1fr .8fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.docRow.head{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.docRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.docRow b{font-size:10px}.docRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.docStatus{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.docStatus.ok{color:var(--ok)}.docStatus.warn{color:var(--warn)}.delivery{padding:14px}.delivery h3{margin:8px 0 2px;font-size:17px}.delivery>small{color:var(--muted);font-size:9px}.deliveryMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.deliveryMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.deliveryMeta small,.deliveryMeta b{display:block}.deliveryMeta small{font-size:8px;color:var(--muted)}.deliveryMeta b{font-size:10px;margin-top:3px}.deliverySec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.deliverySec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.deliveryLine{display:grid;grid-template-columns:1.3fr .5fr .5fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.field{width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:9px;font-size:9px;margin-bottom:7px}.proof{border:1px solid color-mix(in srgb,var(--accent) 40%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent) 5%,var(--panel))}.proof b,.proof small{display:block}.proof small{font-size:8px;color:var(--muted);margin-top:3px}.pwaBox{margin:12px;border:1px solid color-mix(in srgb,var(--violet) 45%,var(--line));border-radius:11px;padding:11px;background:color-mix(in srgb,var(--violet) 5%,var(--panel))}.pwaBox b,.pwaBox small{display:block}.pwaBox small{font-size:8px;color:var(--muted);margin-top:3px}
  @media(max-width:1100px){.docsGrid{grid-template-columns:1fr}}@media(max-width:760px){.docRow{grid-template-columns:1fr .9fr .7fr}.docRow>*:nth-child(3){display:none}.deliveryMeta{grid-template-columns:1fr}}
  `}</style>

  <div className="docsGrid">
   <article className="docCard">
    <div className="docHead"><h3>Dokumenti</h3><button className="primary">＋ Nov dokument</button></div>
    <div className="pwaBox"><b>Mobilna dobavnica · PWA pripravljena smer</b><small>Android / iPhone / iPad · podpis s prstom ali pisalom · kamera · e-mail kopija · brez papirja.</small></div>
    <div className="docRow head"><span>Tip</span><span>Dokument</span><span>Povezava</span><span>Status</span></div>
    {docs.map(d=><button className="docRow" key={d.title} onClick={()=>{setSelected(d);setCompleted(false);setSent(false)}}>
      <span><b>{d.type}</b><small>{d.date}</small></span><span><b>{d.title}</b></span><span>{d.link}</span><span className={"docStatus "+(d.status==="Final"?"ok":"warn")}>{d.status}</span>
    </button>)}
   </article>

   <aside className="docCard delivery">
    <span className={"docStatus "+(completed?"ok":"warn")}>{completed?"Zaključena":"Za podpis"}</span>
    <h3>DOB-2026-0048</h3><small>ABC d.o.o. · 03. 11. 2026</small>
    <div className="deliveryMeta"><div><small>Prejemnik</small><b>{signer||"—"}</b></div><div><small>E-pošta</small><b>{email||"—"}</b></div><div><small>Lokacija</small><b>Opcijsko</b></div><div><small>Način podpisa</small><b>Podpis na zaslonu</b></div></div>

    <div className="deliverySec"><h4>Prevzeto blago</h4><div className="deliveryLine"><span>Reklamna tabla 100 × 70 cm</span><b>2</b><span>kos</span></div><div className="deliveryLine"><span>Samolepilna folija</span><b>5</b><span>m²</span></div></div>

    <div className="deliverySec"><h4>Podpisnik</h4><input className="field" value={signer} onChange={e=>setSigner(e.target.value)} placeholder="Ime in priimek"/><input className="field" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-pošta za kopijo"/></div>

    <div className="deliverySec"><h4>Podpis na zaslonu</h4><SignaturePad onChange={setSignature}/></div>

    <div className="deliverySec"><h4>Dokaz prevzema</h4><div className="proof"><b>{signature?"✓ Podpis zajet":"Podpis še ni zajet"}</b><small>Ob zaključku se zapišejo čas, SHA-256, naprava/IP ter po potrebi lokacija. Podpis na zaslonu ni avtomatično kvalificirani e-podpis.</small></div><button className="secondary" style={{width:"100%",marginTop:7}} onClick={()=>setPhoto(v=>!v)}>{photo?"✓ Fotografija dodana":"＋ Dodaj fotografijo dostave"}</button></div>

    <div className="deliverySec"><h4>Zaključek</h4><div style={{display:"grid",gap:7}}><button className="primary" disabled={!signature||!signer||!email||completed} onClick={()=>setCompleted(true)}>{completed?"Dobavnica zaključena":"Zaključi in ustvari PDF"}</button><button className="secondary" disabled={!completed||sent} onClick={()=>setSent(true)}>{sent?"✓ Kopija poslana":"Pošlji PDF kopijo stranki"}</button><button className="secondary">Uporabi kvalificiran SI-PASS podpis</button></div></div>
   </aside>
  </div>
 </section>
}
