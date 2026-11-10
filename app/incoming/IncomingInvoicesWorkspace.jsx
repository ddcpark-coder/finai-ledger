"use client";
import {useEffect,useMemo,useState} from "react";
import DemoIncomingCreator from "./DemoIncomingCreator";
import {approveIncomingDemo,companyIncomingRecords,makeIncomingDemoEvent} from "./demoIncoming.mjs";
import {getDemoAccountSuggestion,recordDemoRuleChoice} from "./demoAccountingRules.mjs";

const invoices=[
 {companyId:1,id:"PR-2026-0188",partner:"Merkur d.o.o.",number:"MER-2026-04562",gross:"1.240,00 €",date:"02. 11. 2026",due:"17. 11. 2026",status:"Pregled",ocr:94,ai:92,vat:"22 %",account:"4100",cost:"PROD"},
 {companyId:1,id:"PR-2026-0187",partner:"Petrol d.d.",number:"P-2026-88021",gross:"320,00 €",date:"01. 11. 2026",due:"16. 11. 2026",status:"Odobreno",ocr:98,ai:96,vat:"22 %",account:"4070",cost:"UPRAVA"},
 {companyId:1,id:"PR-2026-0186",partner:"Telekom Slovenije",number:"TS-2026-33421",gross:"185,00 €",date:"31. 10. 2026",due:"15. 11. 2026",status:"Obdelava",ocr:90,ai:0,vat:"22 %",account:"—",cost:"—"},
 {companyId:1,id:"PR-2026-0185",partner:"Lidl Slovenija",number:"LIDL-2026-7788",gross:"214,50 €",date:"30. 10. 2026",due:"14. 11. 2026",status:"Napaka",ocr:0,ai:0,vat:"—",account:"—",cost:"—"}
  ,{companyId:2,id:"PR-2026-B001",partner:"Testni dobavitelj B",number:"TEST-B-001",gross:"85,00 €",date:"04. 11. 2026",due:"19. 11. 2026",status:"Pregled",ocr:0,ai:0,vat:"22 %",account:"—",cost:"—"}
  ,{companyId:3,id:"PR-2026-C001",partner:"Vzorčni dobavitelj C",number:"TEST-C-001",gross:"150,00 €",date:"05. 11. 2026",due:"20. 11. 2026",status:"Pregled",ocr:0,ai:0,vat:"22 %",account:"—",cost:"—"}
];

export default function IncomingInvoicesWorkspace({context,companyId}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Vsi";
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("Vsi");
 const [records,setRecords]=useState(invoices);
 const [selectedId,setSelectedId]=useState(null);
 const [newId,setNewId]=useState(null);
 const [creatorOpen,setCreatorOpen]=useState(false);
 const [notice,setNotice]=useState("");
 const [aiDecision,setAiDecision]=useState(null);
 const [audit,setAudit]=useState([]);
 const companyRecords=useMemo(()=>companyIncomingRecords(records,companyId),[records,companyId]);
 const selected=companyRecords.find(row=>row.id===selectedId)??companyRecords[0];
 const demoSuggestion=getDemoAccountSuggestion(selected,companyId);
 const companyAudit=useMemo(()=>audit.filter(event=>event.companyId===companyId).slice(-8).reverse(),[audit,companyId]);
 const createDemo=row=>{
   if(row.companyId!==companyId)throw new Error("Podjetje se je med vnosom spremenilo.");
   setRecords(old=>[row,...old]);setSelectedId(row.id);setNewId(row.id);
   setAudit(old=>[...old,makeIncomingDemoEvent("created",companyId,row)]);
   setStatus("Vsi");setQuery("");setCreatorOpen(false);setAiDecision(null);
   setNotice("Demo račun dodan za izbrano podjetje. Evidentirano v sejni aktivnosti.");
 };
 const approveSelected=()=>{
   try{
     const updated=approveIncomingDemo(selected,companyId);
     setRecords(old=>old.map(row=>row.id===selected.id&&row.companyId===companyId?updated:row));
     setAudit(old=>[...old,makeIncomingDemoEvent("approved",companyId,updated)]);
     setNotice("Odobritev je le demonstracijska. Knjižba, datoteka in obvestilo niso ustvarjeni.");
   }catch(error){setNotice(error.message)}
 };
 const resetDemo=()=>{
   setRecords(old=>[...old.filter(row=>row.companyId!==companyId),...invoices.filter(row=>row.companyId===companyId)]);
   setSelectedId(null);setNewId(null);
   setAudit(old=>[...old,makeIncomingDemoEvent("reset",companyId)]);
   setStatus("Vsi");setQuery("");setCreatorOpen(false);setAiDecision(null);
   setNotice("Demonstracijski računi trenutnega podjetja so ponastavljeni; ostala podjetja so nespremenjena.");
 };
 useEffect(()=>{
   setSelectedId(null);setNewId(null);setCreatorOpen(false);setAiDecision(null);
   setQuery("");setStatus("Vsi");setNotice("");
 },[companyId]);
 const list=useMemo(()=>companyRecords.filter(x=>{
   const q=query.toLowerCase();
   const contextMatch=section==="Pregled"?(subView==="V obdelavi"?x.status==="Obdelava":subView==="Novo"?x.status==="Pregled":true)
    :section==="Za pregled"?(subView==="Napake"?x.status==="Napaka":subView==="OCR"?x.ocr>0&&x.status!=="Odobreno":x.ai>0&&x.status==="Pregled")
    :section==="Odobritve"?(subView==="Odobreno"?x.status==="Odobreno":subView==="Zavrnjeno"?false:x.status==="Pregled")
    :section==="Knjiženje"?(subView==="Predlog"?x.account!=="—":subView==="Temeljnica"?x.status==="Odobreno":x.status==="Odobreno")
    :true;
   return (!q||[x.partner,x.number,x.id].join(" ").toLowerCase().includes(q))&&(status==="Vsi"||x.status===status)&&(contextMatch||x.id===newId);
 }),[companyRecords,query,status,section,subView,newId]);

 useEffect(()=>{
   if(list.length&&!list.some(row=>row.id===selectedId)){
     setSelectedId(list[0].id);setAiDecision(null);
   }
 },[list,selectedId]);

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

   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Izbran pogled: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · prikaz samo izbranega podjetja · brez prenosa datotek ali knjiženja</div>
   {notice&&<div role="status" style={{padding:"9px 12px",marginBottom:10,border:"1px solid var(--line)",borderRadius:9,fontSize:11}}>{notice}</div>}
   <div className="incomingGrid">
     <article className="incomingCard">
       <div className="incomingHead"><h3>Prejeti računi · {section} / {subView}</h3><div className="incomingTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči partnerja ali račun ..."/><select value={status} onChange={e=>setStatus(e.target.value)}><option>Vsi</option><option>Pregled</option><option>Odobreno</option><option>Obdelava</option><option>Napaka</option></select><button type="button" className="primary" onClick={()=>setCreatorOpen(true)}>＋ Nov demo račun</button><button type="button" className="secondary" onClick={resetDemo}>Ponastavi demo</button></div></div>
       <div className="dropZone"><b>Ročni vnos demonstracijskega prejetega računa</b><small>Uvoz PDF/XML, OCR in AI obdelava še niso povezani. Vnesi samo sintetične podatke.</small></div>
       <div className="statusStrip"><div className="on">Prejeto</div><div className="on">Obdelava</div><div className="on">Pregled</div><div>Odobreno</div><div>Knjiženo</div></div>
       <div className="invoiceRow head"><span>Partner / račun</span><span>Datum / rok</span><span>Znesek</span><span>OCR / AI</span><span>Status</span></div>
       {!list.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>V demonstracijskih podatkih ni zapisov za izbrani pogled.</p>}
       {list.map(x=><button className="invoiceRow" key={x.id} aria-pressed={x.id===selectedId} onClick={()=>{setSelectedId(x.id);setNewId(null);setAiDecision(null);setNotice("");}}>
         <span><b>{x.partner}</b><small>{x.number} · {x.id}</small></span>
         <span><b>{x.date}</b><small>rok {x.due}</small></span>
         <b className="invoiceAmount">{x.gross}</b>
         <span><b>{x.ocr?x.ocr+" %":"—"}</b><small>AI {x.ai?x.ai+" %":"—"}</small></span>
         <span className={"state "+(x.status==="Pregled"?"review":x.status==="Odobreno"?"ok":x.status==="Obdelava"?"process":"error")}>{x.status}</span>
       </button>)}
     </article>

     {list.length>0&&<aside className="incomingCard invoiceDetail">
       <span className={"state "+(selected.status==="Pregled"?"review":selected.status==="Odobreno"?"ok":selected.status==="Obdelava"?"process":"error")}>{selected.status}</span>
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

       <div className="invoiceSection"><h4>Razložljiv predlog kontiranja</h4>
         <div className="aiBox">
           {demoSuggestion?<><b>Demo konto {demoSuggestion.account} · stroškovno mesto {demoSuggestion.costCenter}</b>
             <small>Vir: vnaprej določeno testno pravilo tega podjetja. To ni napoved AI ali računovodsko potrjen konto.</small>
             <div className="aiExplain"><div className="aiSignal"><span>Zakaj ta predlog?</span><b>{demoSuggestion.reason}</b></div></div>
             <p style={{fontSize:10,lineHeight:1.55,color:"var(--muted)"}}>{demoSuggestion.explanation}</p>
             <div className="aiActions" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>
               <button type="button" className={aiDecision==="accepted"?"on":""} onClick={()=>{
                 try{recordDemoRuleChoice(demoSuggestion,"accepted",companyId);setAiDecision("accepted");setNotice("Demo predlog je označen kot potrjen samo v trenutnem prikazu. Ni knjiženja ali AI učenja.");}
                 catch(error){setNotice(error.message);}
               }}>Potrdi demo predlog</button>
               <button type="button" className={aiDecision==="rejected"?"on":""} onClick={()=>{
                 try{recordDemoRuleChoice(demoSuggestion,"rejected",companyId);setAiDecision("rejected");setNotice("Demo predlog je zavrnjen samo v trenutnem prikazu. Ni knjiženja ali AI učenja.");}
                 catch(error){setNotice(error.message);}
               }}>Zavrni demo predlog</button>
             </div>
             {aiDecision&&<small style={{marginTop:7,color:"var(--accent)"}}>Izbira: {aiDecision==="accepted"?"demonstracijsko potrjeno":"demonstracijsko zavrnjeno"} · brez trajne shrambe.</small>}
           </>:<><b>Ni določenega pravila za izbranega dobavitelja</b>
             <small>Predlog kontiranja ni pripravljen. Ročna izbira konta in strokovni pregled bosta na voljo po priklopu računovodskega zaledja. Program ne ugiba konta in ničesar ne knjiži.</small></>}
         </div>
       </div>

       <div className="invoiceSection"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         <button className="primary" disabled={!selected.demo||selected.status!=="Pregled"} onClick={approveSelected}>{selected.status==="Odobreno"?"Odobreno (demo)":"Odobri demo račun"}</button>
         {selected.status==="Napaka"&&<button className="secondary" disabled title="OCR ni povezan z demonstracijo">Ponovno obdelaj (v pripravi)</button>}
         <button className="secondary" disabled title="Urejanje in shramba izvirnikov še nista povezana">Uredi podatke (v pripravi)</button>
         <button className="secondary" disabled title="Datoteke niso naložene">Odpri original (v pripravi)</button>
       </div></div>
     </aside>}{list.length===0&&<aside className="incomingCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}
   </div>
   <article className="incomingCard" aria-label="Demonstracijska revizijska aktivnost" style={{marginTop:10,padding:14}}>
     <h3 style={{fontSize:12,margin:"0 0 6px"}}>Sejna aktivnost · trenutno podjetje</h3>
     <p style={{fontSize:9,color:"var(--muted)",margin:"0 0 10px"}}>Le demonstracijska zgodovina v pomnilniku brskalnika. Ni trajna, varovana revizijska sled in ne dokazuje knjiženja.</p>
     {!companyAudit.length&&<p style={{fontSize:10,color:"var(--muted)"}}>V tej seji še ni aktivnosti za izbrano podjetje.</p>}
     {companyAudit.map((event,index)=><div key={event.at+"-"+index} style={{display:"flex",justifyContent:"space-between",gap:12,borderTop:"1px solid var(--line)",padding:"8px 0",fontSize:10}}>
       <span>{event.action==="created"?"Ustvarjen demo račun":event.action==="approved"?"Odobren demo račun":"Ponastavljen demo"} {event.number?("· "+event.number):""}</span>
       <time dateTime={event.at} style={{color:"var(--muted)",whiteSpace:"nowrap"}}>{new Date(event.at).toLocaleString("sl-SI")}</time>
     </div>)}
   </article>
   {creatorOpen&&<DemoIncomingCreator records={companyRecords} companyId={companyId} onCreate={createDemo} onCancel={()=>setCreatorOpen(false)}/>}
 </section>
}
