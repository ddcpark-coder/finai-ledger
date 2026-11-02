"use client";
import {useMemo,useState} from "react";

const invoices=[
 {id:"PR-2026-0188",partner:"Merkur d.o.o.",number:"MER-2026-04562",gross:"1.240,00 €",date:"02. 11. 2026",due:"17. 11. 2026",status:"Pregled",ocr:94,ai:92,vat:"22 %",account:"4100",cost:"PROD"},
 {id:"PR-2026-0187",partner:"Petrol d.d.",number:"P-2026-88021",gross:"320,00 €",date:"01. 11. 2026",due:"16. 11. 2026",status:"Odobreno",ocr:98,ai:96,vat:"22 %",account:"4070",cost:"UPRAVA"},
 {id:"PR-2026-0186",partner:"Telekom Slovenije",number:"TS-2026-33421",gross:"185,00 €",date:"31. 10. 2026",due:"15. 11. 2026",status:"Obdelava",ocr:90,ai:0,vat:"22 %",account:"—",cost:"—"},
 {id:"PR-2026-0185",partner:"Lidl Slovenija",number:"LIDL-2026-7788",gross:"214,50 €",date:"30. 10. 2026",due:"14. 11. 2026",status:"Napaka",ocr:0,ai:0,vat:"—",account:"—",cost:"—"}
];

export default function IncomingInvoicesWorkspace(){
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("Vsi");
 const [selected,setSelected]=useState(invoices[0]);
 const [approved,setApproved]=useState(false);
 const [aiDecision,setAiDecision]=useState(null);
 const list=useMemo(()=>invoices.filter(x=>{
   const q=query.toLowerCase();
   return (!q||[x.partner,x.number,x.id].join(" ").toLowerCase().includes(q))&&(status==="Vsi"||x.status===status);
 }),[query,status]);

 return <section className="incomingWorkspace">
   <style>{`
   .incomingWorkspace{margin-top:10px}.incomingGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}
   .incomingCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .incomingHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.incomingHead h3{margin:0;font-size:12px}
   .incomingTools{display:flex;gap:7px;flex-wrap:wrap}.incomingTools input,.incomingTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .dropZone{margin:12px;border:1px dashed color-mix(in srgb,var(--accent) 55%,var(--line));border-radius:12px;padding:16px;text-align:center;background:color-mix(in srgb,var(--accent) 4%,var(--panel))}
   .dropZone b,.dropZone small{display:block}.dropZone b{font-size:11px}.dropZone small{font-size:8px;color:var(--muted);margin-top:4px}
   .invoiceRow{display:grid;grid-template-columns:1.3fr 1.05fr .8fr .7fr .7fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}
   .invoiceRow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.invoiceRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}
   .invoiceRow b{font-size:10px}.invoiceRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.invoiceAmount{font-variant-numeric:tabular-nums;text-align:right}
   .state{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.state.review{color:var(--warn)}.state.ok{color:var(--ok)}.state.process{color:var(--accent2)}.state.error{color:var(--danger)}
   .invoiceDetail{padding:14px}.invoiceDetail h3{margin:8px 0 2px;font-size:16px}.invoiceDetail>small{color:var(--muted);font-size:9px}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
   .detailGrid div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.detailGrid small,.detailGrid b{display:block}.detailGrid small{font-size:8px;color:var(--muted)}.detailGrid b{font-size:10px;margin-top:3px}
   .confidenceRow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:10px}.confidenceBar{height:6px;background:var(--line);border-radius:99px;overflow:hidden}.confidenceBar i{display:block;height:100%;background:linear-gradient(90deg,var(--violet),var(--accent));border-radius:inherit}
   .invoiceSection{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.invoiceSection h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .lineItem{display:grid;grid-template-columns:1.3fr .65fr .65fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.lineItem span:last-child,.lineItem b{text-align:right}
   .aiBox{border:1px solid color-mix(in srgb,var(--violet) 45%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--violet) 6%,var(--panel))}.aiBox b,.aiBox small{display:block}.aiBox small{font-size:8px;color:var(--muted);margin-top:3px}.aiExplain{margin-top:8px;display:grid;gap:6px}.aiSignal{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--line);padding-top:6px;font-size:8px}.aiSignal span{color:var(--muted)}.aiActions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.aiActions button{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:8px;padding:7px 6px;font-size:8px}.aiActions button.on{border-color:var(--accent);color:var(--accent)}.anomaly{margin-top:8px;border:1px solid color-mix(in srgb,var(--warn) 55%,var(--line));border-radius:9px;padding:8px;background:color-mix(in srgb,var(--warn) 6%,var(--panel));font-size:8px}.anomaly b{color:var(--warn)}
   .statusStrip{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:0 12px 12px}.statusStrip div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.statusStrip .on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
   @media(max-width:1100px){.incomingGrid{grid-template-columns:1fr}}@media(max-width:760px){.invoiceRow{grid-template-columns:1.3fr .8fr .7fr}.invoiceRow>*:nth-child(2),.invoiceRow>*:nth-child(4){display:none}.detailGrid{grid-template-columns:1fr}.statusStrip{grid-template-columns:1fr 1fr 1fr}.incomingTools input{width:100%}}
   `}</style>

   <div className="incomingGrid">
     <article className="incomingCard">
       <div className="incomingHead"><h3>Prejeti računi</h3><div className="incomingTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči partnerja ali račun ..."/><select value={status} onChange={e=>setStatus(e.target.value)}><option>Vsi</option><option>Pregled</option><option>Odobreno</option><option>Obdelava</option><option>Napaka</option></select><button className="primary">＋ Naloži račun</button></div></div>
       <div className="dropZone"><b>Spusti PDF, XML ali e-račun sem</b><small>Original ostane varen; OCR/XML/AI obdelava poteka ločeno.</small></div>
       <div className="statusStrip"><div className="on">Prejeto</div><div className="on">Obdelava</div><div className="on">Pregled</div><div>Odobreno</div><div>Knjiženo</div></div>
       <div className="invoiceRow head"><span>Partner / račun</span><span>Datum / rok</span><span>Znesek</span><span>OCR / AI</span><span>Status</span></div>
       {list.map(x=><button className="invoiceRow" key={x.id} onClick={()=>{setSelected(x);setApproved(false);setAiDecision(null)}}>
         <span><b>{x.partner}</b><small>{x.number} · {x.id}</small></span>
         <span><b>{x.date}</b><small>rok {x.due}</small></span>
         <b className="invoiceAmount">{x.gross}</b>
         <span><b>{x.ocr?x.ocr+" %":"—"}</b><small>AI {x.ai?x.ai+" %":"—"}</small></span>
         <span className={"state "+(x.status==="Pregled"?"review":x.status==="Odobreno"?"ok":x.status==="Obdelava"?"process":"error")}>{approved&&x.id===selected.id?"Odobreno":x.status}</span>
       </button>)}
     </article>

     <aside className="incomingCard invoiceDetail">
       <span className={"state "+(selected.status==="Pregled"?"review":selected.status==="Odobreno"?"ok":selected.status==="Obdelava"?"process":"error")}>{approved?"Odobreno":selected.status}</span>
       <h3>{selected.partner}</h3><small>{selected.number} · {selected.id}</small>

       <div className="detailGrid">
         <div><small>Bruto</small><b>{selected.gross}</b></div>
         <div><small>DDV</small><b>{selected.vat}</b></div>
         <div><small>Datum</small><b>{selected.date}</b></div>
         <div><small>Rok plačila</small><b>{selected.due}</b></div>
       </div>

       <div className="invoiceSection"><h4>Ekstrakcija</h4>
         <div className="confidenceRow"><div><div className="confidenceBar"><i style={{width:(selected.ocr||0)+"%"}}/></div></div><b>{selected.ocr||0} %</b></div>
         <div className="lineItem"><span>Partner</span><span>prepoznan</span><b>✓</b></div>
         <div className="lineItem"><span>Številka računa</span><span>{selected.number}</span><b>✓</b></div>
         <div className="lineItem"><span>Bruto znesek</span><span>{selected.gross}</span><b>✓</b></div>
       </div>

       <div className="invoiceSection"><h4>Postavke</h4>
         <div className="lineItem"><span>Storitve / material</span><span>1 kos</span><b>{selected.gross}</b></div>
       </div>

       <div className="invoiceSection"><h4>AI predlog knjiženja</h4>
         <div className="aiBox">
           <b>{selected.account==="—"?"Predlog še ni pripravljen":selected.account+" · stroškovno mesto "+selected.cost}</b>
           <small>{selected.ai?selected.ai+" % gotovost · "+(selected.ai>=98?"kandidat za avtomatizacijo":selected.ai>=90?"visoka gotovost, pregled":"zahteva pregled"):"Čaka na uspešno ekstrakcijo dokumenta."}</small>
           {selected.ai>0&&<div className="aiExplain">
             <div className="aiSignal"><span>Pravilo partnerja</span><b>{selected.partner==="Merkur d.o.o."?"ujema se":"ni determinističnega ujemanja"}</b></div>
             <div className="aiSignal"><span>Potrjena zgodovina</span><b>{selected.partner==="Merkur d.o.o."?"18 podobnih knjižb":"6 podobnih knjižb"}</b></div>
             <div className="aiSignal"><span>Predlagan DDV</span><b>{selected.vat}</b></div>
             <div className="aiSignal"><span>Risk signal</span><b>{selected.partner==="Merkur d.o.o."?"brez":"brez"}</b></div>
           </div>}
           {selected.partner==="Merkur d.o.o."&&<div className="anomaly"><b>Kontrola anomalij: brez kritičnega odstopanja</b><div style={{marginTop:3,color:"var(--muted)"}}>Znesek in vzorec sta skladna z zgodovino partnerja.</div></div>}
           {selected.ai>0&&<div className="aiActions"><button className={aiDecision==="accepted"?"on":""} onClick={()=>setAiDecision("accepted")}>Potrdi</button><button className={aiDecision==="modified"?"on":""} onClick={()=>setAiDecision("modified")}>Spremeni</button><button className={aiDecision==="rejected"?"on":""} onClick={()=>setAiDecision("rejected")}>Zavrni</button></div>}
           {aiDecision&&<small style={{marginTop:7,color:"var(--accent)"}}>Feedback “{aiDecision==="accepted"?"potrjeno":aiDecision==="modified"?"spremenjeno":"zavrnjeno"}” bo uporabljen kot učni dogodek.</small>}
         </div>
       </div>

       <div className="invoiceSection"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         <button className="primary" disabled={selected.status!=="Pregled"||approved} onClick={()=>setApproved(true)}>{approved?"Odobreno":"Odobri račun"}</button>
         {selected.status==="Napaka"&&<button className="secondary">Ponovno obdelaj</button>}
         <button className="secondary">Uredi podatke</button>
         <button className="secondary">Odpri original</button>
       </div></div>
     </aside>
   </div>
 </section>
}
