"use client";
import {useEffect,useMemo,useState} from "react";

const submissions=[
 {id:"ED-2026-0018",doc:"DDV-O 11/2026",env:"TEST",status:"Sprejeto",remote:"EDP-884201",sent:"03. 11. 2026 06:12",attempts:1},
 {id:"ED-2026-0017",doc:"RP-O 11/2026",env:"TEST",status:"Obdelava",remote:"EDP-884188",sent:"03. 11. 2026 06:08",attempts:1},
 {id:"ED-2026-0016",doc:"DDV-O 10/2026",env:"TEST",status:"Zavrnjeno",remote:"EDP-881901",sent:"31. 10. 2026 09:40",attempts:2},
 {id:"ED-2026-0015",doc:"DDV-O 09/2026",env:"PROD",status:"Sprejeto",remote:"EDP-870221",sent:"20. 10. 2026 08:11",attempts:1}
];

export default function EdavkiWorkspace({context}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Oddaje";
 const [env,setEnv]=useState("TEST");
 const [selected,setSelected]=useState(submissions[0]);
 const [query,setQuery]=useState("");
 const [validated,setValidated]=useState(true);
 const [signed,setSigned]=useState(true);
 const [submitted,setSubmitted]=useState(false);
 const activeEnv=section==="Oddaje"&&["TEST","PROD"].includes(subView)?subView:env;
 const filtered=useMemo(()=>submissions.filter(x=>{
   const q=query.toLowerCase();
   const statusMatch=section==="Statusi"?(subView==="Obdelava"?x.status==="Obdelava":subView==="Sprejeto"?x.status==="Sprejeto":x.status==="Zavrnjeno"):true;
   const focusMatch=section==="Pregled"&&subView==="Napake"?x.status==="Zavrnjeno":true;
   return x.env===activeEnv&&statusMatch&&focusMatch&&(!q||[x.id,x.doc,x.remote].join(" ").toLowerCase().includes(q));
 }),[activeEnv,query,section,subView]);

 const effectiveStatus=submitted&&selected.id==="ED-2026-0018"?"Poslano":selected.status;

 useEffect(()=>{
   if(filtered.length&&!filtered.some(row=>row.id===selected.id)){
     setSelected(filtered[0]);setSubmitted(false);
   }
 },[filtered,selected.id]);

 return <section className="edavkiWorkspace">
   <style>{`
   .edavkiWorkspace{margin-top:10px}.edTop{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
   .edKpi{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:13px;padding:11px}.edKpi small,.edKpi b{display:block}.edKpi small{font-size:8px;color:var(--muted)}.edKpi b{font-size:15px;margin-top:4px}
   .edGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 370px;gap:10px}.edCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .edHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.edHead h3{margin:0;font-size:12px}.edTools{display:flex;gap:7px;flex-wrap:wrap}.edTools input{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .envSwitch{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}.envSwitch button{border:0;background:transparent;color:var(--muted);padding:8px 10px;font-size:8px}.envSwitch button.on{background:color-mix(in srgb,var(--accent) 10%,var(--panel));color:var(--text)}
   .edRow{display:grid;grid-template-columns:1fr 1.15fr .8fr .9fr .7fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}
   .edRow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.edRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.edRow b{font-size:10px}.edRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}
   .edState{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.edState.ok{color:var(--ok)}.edState.warn{color:var(--warn)}.edState.bad{color:var(--danger)}.edState.info{color:var(--accent2)}
   .edDetail{padding:14px}.edDetail h3{margin:8px 0 2px;font-size:16px}.edDetail>small{color:var(--muted);font-size:9px}.edMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.edMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.edMeta small,.edMeta b{display:block}.edMeta small{font-size:8px;color:var(--muted)}.edMeta b{font-size:9px;margin-top:3px;overflow:hidden;text-overflow:ellipsis}
   .edSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.edSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .check{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:9px}.check span{color:var(--muted)}.check b.ok{color:var(--ok)}.check b.warn{color:var(--warn)}
   .endpoint{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2);font-size:8px;word-break:break-all;color:var(--muted)}
   .certBox{border:1px solid color-mix(in srgb,var(--accent2) 45%,var(--line));border-radius:10px;padding:9px;background:color-mix(in srgb,var(--accent2) 5%,var(--panel))}.certBox b,.certBox small{display:block}.certBox small{font-size:8px;color:var(--muted);margin-top:3px}
   .edFlow{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px}.edFlow div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.edFlow .on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
   @media(max-width:1100px){.edGrid{grid-template-columns:1fr}.edTop{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.edRow{grid-template-columns:1fr .9fr .7fr}.edRow>*:nth-child(2),.edRow>*:nth-child(4){display:none}.edMeta{grid-template-columns:1fr}.edTools input{width:100%}.edFlow{grid-template-columns:1fr 1fr 1fr}}
   `}</style>

   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Izbran pogled: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · demonstracijski podatki, brez dejanske oddaje na FURS</div>
   <div className="edTop">
     <div className="edKpi"><small>Aktivno okolje</small><b>{activeEnv}</b></div>
     <div className="edKpi"><small>Certifikat</small><b>Veljaven</b></div>
     <div className="edKpi"><small>Oddaje danes</small><b>2</b></div>
     <div className="edKpi"><small>Odprte napake</small><b>1</b></div>
   </div>

   <div className="edFlow"><div className="on">XML</div><div className={validated?"on":""}>XSD validacija</div><div className={signed?"on":""}>Podpis</div><div className={submitted?"on":""}>Oddaja</div><div>FURS status</div></div>

   {(section==="Certifikati"||section==="Audit")?
   <article className="edCard" style={{padding:14}}>
     <h3>{section} · {subView}</h3>
     {section==="Certifikati"?
       <div className="certBox" style={{marginTop:12}}><b>Konfiguracija digitalnega potrdila</b><small>Predogled nastavitve. Dejanski certifikat in zasebni ključ tukaj nista povezana ali preverjena.</small></div>
     :submissions.map(x=><div className="check" key={x.id}><span>{x.doc} · {x.env}</span><b>{x.status} · {x.attempts} poskus(i)</b></div>)}
   </article>:
   <div className="edGrid">
     <article className="edCard">
       <div className="edHead"><h3>eDavki / FURS · {section} / {subView}</h3><div className="edTools">{!(section==="Oddaje"&&["TEST","PROD"].includes(subView))&&<div className="envSwitch"><button className={activeEnv==="TEST"?"on":""} onClick={()=>setEnv("TEST")}>TEST</button><button className={activeEnv==="PROD"?"on":""} onClick={()=>setEnv("PROD")}>PROD</button></div>}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči dokument ali FURS ID ..."/><button className="primary">＋ Nova oddaja</button></div></div>
       <div className="edRow head"><span>ID</span><span>Dokument</span><span>Status</span><span>FURS ID</span><span>Poskusi</span></div>
       {!filtered.length&&<p style={{padding:12,fontSize:10,color:"var(--muted)"}}>Za ta pogled ni oddaj v demonstracijskem naboru.</p>}
       {filtered.map(x=><button className="edRow" key={x.id} onClick={()=>{setSelected(x);setSubmitted(false)}}>
         <span><b>{x.id}</b><small>{x.sent}</small></span><span><b>{x.doc}</b><small>{x.env}</small></span><span className={"edState "+(x.status==="Sprejeto"?"ok":x.status==="Zavrnjeno"?"bad":"info")}>{x.status}</span><span><b>{x.remote}</b></span><span>{x.attempts}</span>
       </button>)}
     </article>

     {filtered.length>0&&<aside className="edCard edDetail">
       <span className={"edState "+(effectiveStatus==="Sprejeto"?"ok":effectiveStatus==="Zavrnjeno"?"bad":"info")}>{effectiveStatus}</span>
       <h3>{selected.doc}</h3><small>{selected.id} · {selected.env}</small>

       <div className="edMeta"><div><small>FURS dokument ID</small><b>{selected.remote}</b></div><div><small>Poskusi</small><b>{selected.attempts}</b></div><div><small>Idempotenca</small><b>SHA-256 vezana</b></div><div><small>Retry</small><b>1m → 5m → 15m → 1h</b></div></div>

       <div className="edSec"><h4>Okolje in endpoint</h4><div className="endpoint">{selected.env==="TEST"?"https://beta.edavki.durs.si/SoapPortal/EdpSoapService.asmx":"https://edavki.durs.si/SoapPortal/EdpSoapService.asmx"}</div></div>

       <div className="edSec"><h4>Varnost</h4><div className="certBox"><b>Digitalno potrdilo · referenca na varen store</b><small>Zasebni ključ in PIN nista shranjena v aplikacijski bazi.</small></div></div>

       <div className="edSec"><h4>Preflight</h4>
         <div className="check"><span>XML shema</span><b className={validated?"ok":"warn"}>{validated?"✓ veljavna":"zahteva pregled"}</b></div>
         <div className="check"><span>XML Signature</span><b className={signed?"ok":"warn"}>{signed?"✓ podpisano":"ni podpisano"}</b></div>
         <div className="check"><span>TEST/PROD okolje</span><b className="ok">✓ ujemanje</b></div>
         <div className="check"><span>Idempotency key</span><b className="ok">✓ pripravljen</b></div>
       </div>

       {selected.status==="Zavrnjeno"&&<div className="edSec"><h4>Napaka FURS</h4><div className="certBox" style={{borderColor:"color-mix(in srgb,var(--danger) 45%,var(--line))"}}><b style={{color:"var(--danger)"}}>Dokument zahteva vsebinski popravek</b><small>Samodejni retry je blokiran do novega veljavnega artefakta.</small></div></div>}

       <div className="edSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary" disabled={!validated||!signed||selected.status==="Zavrnjeno"} onClick={()=>setSubmitted(true)}>{submitted?"Oddano":"Oddaj v "+selected.env}</button><button className="secondary">Osveži FURS status</button><button className="secondary">Prikaži XML validacijo</button><button className="secondary">Prikaži audit sled</button></div></div>
     </aside>}{filtered.length===0&&<aside className="edCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}
   </div>}
 </section>
}
