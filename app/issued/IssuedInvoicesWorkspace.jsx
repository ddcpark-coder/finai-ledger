"use client";
import BusinessChainPanel from "../business/BusinessChainPanel";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {useEffect,useMemo,useState} from "react";
import DemoInvoiceCreator from "./DemoInvoiceCreator";
import {issueDraft,simulateSending} from "./demoInvoice.mjs";
import {checkEInvoiceReadiness,E_INVOICE_PROFILES} from "./eInvoiceReadiness.mjs";

const invoices=[
 {companyId:1,id:"IR-2026-0054",number:"2026-0054",partner:"ABC d.o.o.",net:"1.000,00 €",tax:"220,00 €",gross:"1.220,00 €",issue:"02. 11. 2026",due:"17. 11. 2026",status:"Plačano",delivery:"E-pošta",sent:true,paid:true},
 {companyId:1,id:"IR-2026-0053",number:"2026-0053",partner:"Gamma d.o.o.",net:"2.000,00 €",tax:"440,00 €",gross:"2.440,00 €",issue:"01. 11. 2026",due:"16. 11. 2026",status:"Poslano",delivery:"e-račun",sent:true,paid:false},
 {companyId:1,id:"IR-2026-0052",number:"—",partner:"Studio Kreativ s.p.",net:"750,00 €",tax:"165,00 €",gross:"915,00 €",issue:"—",due:"—",status:"Osnutek",delivery:"—",sent:false,paid:false},
 {companyId:1,id:"IR-2026-0051",number:"2026-0051",partner:"Delta d.o.o.",net:"1.500,00 €",tax:"330,00 €",gross:"1.830,00 €",issue:"25. 10. 2026",due:"30. 10. 2026",status:"Zapadlo",delivery:"E-pošta",sent:true,paid:false},
 {companyId:2,id:"IR-2026-B01",number:"TEST-B-0001",partner:"Vzorčni kupec B",net:"100,00 €",tax:"22,00 €",gross:"122,00 €",issue:"03. 11. 2026",due:"18. 11. 2026",status:"Izdano",delivery:"—",sent:false,paid:false},
 {companyId:3,id:"IR-2026-C01",number:"TEST-C-0001",partner:"Vzorčni kupec C",net:"150,00 €",tax:"33,00 €",gross:"183,00 €",issue:"04. 11. 2026",due:"19. 11. 2026",status:"Osnutek",delivery:"—",sent:false,paid:false}
];

export default function IssuedInvoicesWorkspace({context,companyId,supplierName,supplierTaxNumber}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Vsi";
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [records,setRecords]=useState(invoices);
 const [selectedId,setSelectedId]=useState(null);
 const [creatorOpen,setCreatorOpen]=useState(false);
 const [notice,setNotice]=useState("");
 const [showPreview,setShowPreview]=useState(false);
 const [newId,setNewId]=useState(null);
 const [eInvoiceProfile,setEInvoiceProfile]=useState("eslog");
 const [showEInvoice,setShowEInvoice]=useState(false);
 const companyRecords=useMemo(()=>records.filter(row=>row.companyId===companyId),[records,companyId]);
 const selected=companyRecords.find(x=>x.id===selectedId)??companyRecords[0];
 const readiness=checkEInvoiceReadiness(selected??{},{name:supplierName,taxNumber:supplierTaxNumber},eInvoiceProfile);
 const list=useMemo(()=>companyRecords.filter(x=>{
   const q=query.toLowerCase();
   const selectedContext=section==="Pregled"?(subView==="Osnutki"?x.status==="Osnutek":subView==="Izdani"?x.status!=="Osnutek":true)
     :section==="Terjatve"?(subView==="Plačano"?x.paid:subView==="Zapadlo"?x.status==="Zapadlo":!x.paid&&x.status!=="Osnutek")
     :section==="Pošiljanje"?(subView==="E-pošta"?x.delivery==="E-pošta":subView==="e-račun"?x.delivery==="e-račun":x.sent)
     :section==="Opomini"?(subView==="Predlogi"?x.status==="Zapadlo":false)
     :section==="Knjiženje"?x.status!=="Osnutek":true;
   return (!q||[x.partner,x.number,x.id].join(" ").toLowerCase().includes(q))&&(filter==="Vsi"||x.status===filter)&&(selectedContext||x.id===newId);
 }),[companyRecords,query,filter,section,subView,newId]);

 const effectiveStatus=selected.status;
 const effectiveNumber=selected.number;
 const createDraft=draft=>{
   if(draft.companyId!==companyId)throw new Error("Račun ni iz izbranega podjetja.");
   setRecords(old=>[draft,...old]);
   setSelectedId(draft.id);setNewId(draft.id);
   setCreatorOpen(false);setFilter("Vsi");setQuery("");setShowPreview(false);
   setNotice("Demonstracijski osnutek je ustvarjen. Ni shranjen na strežnik.");
 };
 const issueSelected=()=>{
   try{
     const updated=issueDraft(selected,companyRecords,new Date(),companyId);
     setRecords(old=>old.map(row=>row.id===selectedId?updated:row));
     setNotice("Račun je samo DEMONSTRACIJSKO izdan. Ni ustvarjene uradne listine ali knjižbe.");
   }catch(error){setNotice(error.message)}
 };
 const sendSelected=()=>{
   try{
     const updated=simulateSending(selected,companyId);
     setRecords(old=>old.map(row=>row.id===selectedId?updated:row));
     setNotice("Pošiljanje je le simulirano. Nobeno e-poštno sporočilo ni bilo poslano.");
   }catch(error){setNotice(error.message)}
 };
 const resetDemo=()=>{
   setRecords(old=>[...old.filter(row=>row.companyId!==companyId),...invoices.filter(row=>row.companyId===companyId)]);
   setSelectedId(null);
   setCreatorOpen(false);setFilter("Vsi");setQuery("");setNewId(null);setShowPreview(false);setShowEInvoice(false);
   setNotice("Ponastavljeni so samo demo podatki trenutnega podjetja.");
 };
 useEffect(()=>{
   setSelectedId(null);setCreatorOpen(false);setFilter("Vsi");setQuery("");setNewId(null);
   setShowPreview(false);setShowEInvoice(false);setNotice("");
 },[companyId]);
 useEffect(()=>{
   if(list.length&&!list.some(row=>row.id===selectedId)){
     setSelectedId(list[0].id);setShowPreview(false);
   }
 },[list,selectedId]);

 return <section className="issuedWorkspace">
   <style>{`
   .issuedWorkspace{margin-top:10px}.issuedGrid{display:grid;grid-template-columns:minmax(0,1.42fr) 370px;gap:10px}
   .issuedCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .issuedHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.issuedHead h3{margin:0;font-size:12px}
   .issuedTools{display:flex;gap:7px;flex-wrap:wrap}.issuedTools input,.issuedTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .invoiceRow2{display:grid;grid-template-columns:1.15fr 1.25fr .8fr .85fr .75fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}
   .invoiceRow2.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.invoiceRow2:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}
   .invoiceRow2 b{font-size:10px}.invoiceRow2 small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.amount{text-align:right;font-variant-numeric:tabular-nums}
   .status2{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.status2.ok{color:var(--ok)}.status2.warn{color:var(--warn)}.status2.info{color:var(--accent2)}.status2.draft{color:var(--muted)}.status2.danger{color:var(--danger)}
   .invoicePreview{padding:14px}.invoicePreview h3{margin:8px 0 2px;font-size:17px}.invoicePreview>small{color:var(--muted);font-size:9px}.invoiceMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
   .invoiceMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.invoiceMeta small,.invoiceMeta b{display:block}.invoiceMeta small{font-size:8px;color:var(--muted)}.invoiceMeta b{font-size:10px;margin-top:3px}
   .invoiceSection2{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.invoiceSection2 h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .line2{display:grid;grid-template-columns:1.2fr .55fr .65fr .65fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.line2 b{text-align:right}.line2 span:last-child{text-align:right}
   .totals{margin-top:8px;display:grid;gap:5px}.totals div{display:flex;justify-content:space-between;font-size:9px}.totals div:last-child{font-size:11px;font-weight:800;padding-top:6px;border-top:1px solid var(--line)}
   .flow{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:12px}.flow div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.flow .on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
   .receivableBox{border:1px solid color-mix(in srgb,var(--accent2) 45%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent2) 5%,var(--panel))}.receivableBox b,.receivableBox small{display:block}.receivableBox small{font-size:8px;color:var(--muted);margin-top:3px}
   .demoDocumentPreview{margin-top:10px;border:1px solid var(--line);background:var(--bg2);padding:12px;border-radius:10px;font-size:10px;line-height:1.6}.demoDocumentPreview h4{margin:0 0 5px;font-size:12px}.demoDocumentPreview div{display:flex;justify-content:space-between;gap:9px}.demoDocumentPreview strong{font-variant-numeric:tabular-nums}
   @media(max-width:1100px){.issuedGrid{grid-template-columns:1fr}}@media(max-width:760px){.invoiceRow2{grid-template-columns:1.2fr .8fr .7fr}.invoiceRow2>*:nth-child(2),.invoiceRow2>*:nth-child(4){display:none}.invoiceMeta{grid-template-columns:1fr}.flow{grid-template-columns:1fr 1fr 1fr}.issuedTools input{width:100%}.line2{grid-template-columns:1.3fr .7fr .7fr}.line2>*:nth-child(2){display:none}}
   `}</style>

   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Izbran pogled: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · podjetje je ločeno · demo brez shranjevanja, knjiženja ali pošiljanja</div>
   {notice&&<div role="status" style={{padding:"9px 12px",marginBottom:10,border:"1px solid var(--line)",borderRadius:9,fontSize:11,color:"var(--text)"}}>{notice}</div>}
   <BusinessChainPanel companyId={companyId} moduleKey="issued_invoices"/>
 <AdaptivePaneGrid className="issuedGrid">
     <article className="issuedCard">
       <div className="issuedHead"><h3>Izdani računi · {section} / {subView}</h3><div className="issuedTools"><input aria-label="Išči izdane račune" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči kupca ali račun ..."/><select aria-label="Filter statusa računa" value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Osnutek</option><option>Izdano</option><option>Poslano</option><option>Plačano</option><option>Zapadlo</option></select><button type="button" className="primary" onClick={()=>setCreatorOpen(true)}>＋ Nov račun</button><button type="button" className="secondary" onClick={resetDemo}>Ponastavi demo</button></div></div>
       <div className="flow"><div className="on">Osnutek</div><div className="on">Izdano</div><div className="on">Poslano</div><div>Plačilo</div><div>Zaključeno</div></div>
       <div className="invoiceRow2 head"><span>Račun</span><span>Partner</span><span>Znesek</span><span>Rok</span><span>Status</span></div>
       {!list.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>V tem demonstracijskem pogledu ni računov.</p>}
       {list.map(x=><button className="invoiceRow2" key={x.id} aria-pressed={x.id===selectedId} onClick={()=>{setSelectedId(x.id);setNewId(null);setShowPreview(false);setShowEInvoice(false);setNotice("")}}>
         <span><b>{x.number}</b><small>{x.id}</small></span>
         <span><b>{x.partner}</b><small>{x.delivery}</small></span>
         <b className="amount">{x.gross}</b>
         <span><b>{x.due}</b><small>izdano {x.issue}</small></span>
         <span className={"status2 "+(x.status==="Plačano"?"ok":x.status==="Zapadlo"?"danger":x.status==="Poslano"?"info":"draft")}>{x.status}</span>
       </button>)}
     </article>

     {list.length>0&&<aside className="issuedCard invoicePreview">
       <span className={"status2 "+(effectiveStatus==="Plačano"?"ok":effectiveStatus==="Zapadlo"?"danger":effectiveStatus==="Poslano"||effectiveStatus==="Izdano"?"info":"draft")}>{effectiveStatus}</span>
       <h3>{effectiveNumber}</h3><small>{selected.partner} · {selected.id}</small>

       <div className="invoiceMeta">
         <div><small>Datum izdaje</small><b>{selected.issue}</b></div>
         <div><small>Rok plačila</small><b>{selected.due}</b></div>
         <div><small>Način dostave</small><b>{selected.delivery}</b></div>
         <div><small>Valuta</small><b>EUR</b></div>
       </div>

       <div className="invoiceSection2"><h4>Postavke</h4>
         <div className="line2"><span>{selected.description||"Storitev / projekt"}</span><span>1 ×</span><b>{selected.net}</b><span>{selected.vatRate?selected.vatRate.replace(".",","):"22"} % DDV</span></div>
         <div className="totals"><div><span>Neto</span><b>{selected.net}</b></div><div><span>DDV</span><b>{selected.tax}</b></div><div><span>Skupaj</span><b>{selected.gross}</b></div></div>
       </div>

       <div className="invoiceSection2"><h4>Terjatev in knjiženje</h4>
         <div className="receivableBox"><b>Simuliran prikaz terjatve</b><small>Glavna knjiga ni povezana: izdaja v tem pogledu ne ustvari temeljnice ali odprte postavke.</small></div>
       </div>

       <div className="invoiceSection2"><h4>Artefakti in pripravljenost e-računa</h4>
         <div className="line2"><span>PDF račun</span><span></span><b>Ni ustvarjen</b><span>demo</span></div>
         <div className="line2"><span>e-račun XML</span><span></span><b>Ni ustvarjen</b><span>demo</span></div>
         <button type="button" className="secondary" aria-expanded={showEInvoice} onClick={()=>setShowEInvoice(x=>!x)} style={{marginTop:8}}>
           {showEInvoice?"Skrij kontrolo e-računa":"Preveri podatke za e-račun"}
         </button>
         {showEInvoice&&<div className="demoDocumentPreview" role="region" aria-label="Kontrola pripravljenosti e-računa">
           <h4>Preverjanje metapodatkov – ni uradna validacija</h4>
           <label style={{display:"grid",gap:4,marginBottom:9}}>Predviden standard
             <select aria-label="Profil e-računa" value={eInvoiceProfile} onChange={e=>setEInvoiceProfile(e.target.value)} style={{padding:8,color:"var(--text)",background:"var(--bg2)",border:"1px solid var(--line)",borderRadius:8}}>
               {Object.entries(E_INVOICE_PROFILES).map(([key,label])=><option key={key} value={key}>{label}</option>)}
             </select>
           </label>
           <b>{readiness.metadataComplete?"Osnovni metapodatki so prisotni.":"Potrebne so dopolnitve podatkov."}</b>
           {readiness.blockers.length>0&&<ul style={{paddingLeft:16,margin:"8px 0"}}>{readiness.blockers.map((message,i)=><li key={i}>{message}</li>)}</ul>}
           <p style={{marginTop:9,color:"var(--muted)"}}>{readiness.explanation} Izvoz XML in pošiljanje nista omogočena; ne glede na rezultate ta izdaja ni primerna za pravo izmenjavo e-računov.</p>
         </div>}
       </div>

       <div className="invoiceSection2"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         {selected.status==="Osnutek"&&<button className="primary" onClick={issueSelected}>Simuliraj izdajo in dodeli DEMO številko</button>}
         {selected.status==="Izdano"&&<button className="primary" onClick={sendSelected}>Simuliraj pošiljanje (brez e-pošte)</button>}
         <button className="secondary" onClick={()=>setShowPreview(v=>!v)}>{showPreview?"Skrij HTML predogled":"Prikaži HTML predogled"}</button>
         <button className="secondary" disabled title="Knjiženje v glavno knjigo ni povezano">Temeljnica (v pripravi)</button>
         {effectiveStatus==="Zapadlo"&&<button className="secondary" disabled>Opomin (v pripravi)</button>}
       </div>
       {showPreview&&<div className="demoDocumentPreview" aria-label="HTML predogled demonstracijskega računa">
         <h4>DEMO · {selected.number==="—"?"Osnutek računa":selected.number}</h4>
         <p>{selected.partner}<br/>{selected.description||"Storitev / projekt"}<br/>Datum izdaje: {selected.issue} · Rok: {selected.due}</p>
         <div><span>Neto</span><strong>{selected.net}</strong></div>
         <div><span>DDV ({selected.vatRate?selected.vatRate.replace(".",","):"22"} %)</span><strong>{selected.tax}</strong></div>
         <div><b>Skupaj</b><strong>{selected.gross}</strong></div>
         <small>Ta predogled ni uradni račun ali PDF in ni primeren za uporabo v poslovanju.</small>
       </div>}
       </div>
     </aside>}{list.length===0&&<aside className="issuedCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}
   </AdaptivePaneGrid>
   {creatorOpen&&<DemoInvoiceCreator records={companyRecords} companyId={companyId} onCancel={()=>setCreatorOpen(false)} onCreate={createDraft}/>} 
 </section>
}
