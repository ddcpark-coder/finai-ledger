"use client";
import {useMemo,useState} from "react";

const invoices=[
 {id:"IR-2026-0054",number:"2026-0054",partner:"ABC d.o.o.",net:"1.000,00 €",tax:"220,00 €",gross:"1.220,00 €",issue:"02. 11. 2026",due:"17. 11. 2026",status:"Plačano",delivery:"E-pošta",sent:true,paid:true},
 {id:"IR-2026-0053",number:"2026-0053",partner:"Gamma d.o.o.",net:"2.000,00 €",tax:"440,00 €",gross:"2.440,00 €",issue:"01. 11. 2026",due:"16. 11. 2026",status:"Poslano",delivery:"e-račun",sent:true,paid:false},
 {id:"IR-2026-0052",number:"—",partner:"Studio Kreativ s.p.",net:"750,00 €",tax:"165,00 €",gross:"915,00 €",issue:"—",due:"—",status:"Osnutek",delivery:"—",sent:false,paid:false},
 {id:"IR-2026-0051",number:"2026-0051",partner:"Delta d.o.o.",net:"1.500,00 €",tax:"330,00 €",gross:"1.830,00 €",issue:"25. 10. 2026",due:"30. 10. 2026",status:"Zapadlo",delivery:"E-pošta",sent:true,paid:false}
];

export default function IssuedInvoicesWorkspace(){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(invoices[0]);
 const [issued,setIssued]=useState(false);
 const [sent,setSent]=useState(false);
 const list=useMemo(()=>invoices.filter(x=>{
   const q=query.toLowerCase();
   return (!q||[x.partner,x.number,x.id].join(" ").toLowerCase().includes(q))&&(filter==="Vsi"||x.status===filter);
 }),[query,filter]);

 const effectiveStatus=issued&&selected.status==="Osnutek"?(sent?"Poslano":"Izdano"):selected.status;
 const effectiveNumber=issued&&selected.status==="Osnutek"?"2026-0055":selected.number;

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
   @media(max-width:1100px){.issuedGrid{grid-template-columns:1fr}}@media(max-width:760px){.invoiceRow2{grid-template-columns:1.2fr .8fr .7fr}.invoiceRow2>*:nth-child(2),.invoiceRow2>*:nth-child(4){display:none}.invoiceMeta{grid-template-columns:1fr}.flow{grid-template-columns:1fr 1fr 1fr}.issuedTools input{width:100%}.line2{grid-template-columns:1.3fr .7fr .7fr}.line2>*:nth-child(2){display:none}}
   `}</style>

   <div className="issuedGrid">
     <article className="issuedCard">
       <div className="issuedHead"><h3>Izdani računi</h3><div className="issuedTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči kupca ali račun ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Osnutek</option><option>Poslano</option><option>Plačano</option><option>Zapadlo</option></select><button className="primary">＋ Nov račun</button></div></div>
       <div className="flow"><div className="on">Osnutek</div><div className="on">Izdano</div><div className="on">Poslano</div><div>Plačilo</div><div>Zaključeno</div></div>
       <div className="invoiceRow2 head"><span>Račun</span><span>Partner</span><span>Znesek</span><span>Rok</span><span>Status</span></div>
       {list.map(x=><button className="invoiceRow2" key={x.id} onClick={()=>{setSelected(x);setIssued(false);setSent(false)}}>
         <span><b>{x.number}</b><small>{x.id}</small></span>
         <span><b>{x.partner}</b><small>{x.delivery}</small></span>
         <b className="amount">{x.gross}</b>
         <span><b>{x.due}</b><small>izdano {x.issue}</small></span>
         <span className={"status2 "+(x.status==="Plačano"?"ok":x.status==="Zapadlo"?"danger":x.status==="Poslano"?"info":"draft")}>{x.status}</span>
       </button>)}
     </article>

     <aside className="issuedCard invoicePreview">
       <span className={"status2 "+(effectiveStatus==="Plačano"?"ok":effectiveStatus==="Zapadlo"?"danger":effectiveStatus==="Poslano"||effectiveStatus==="Izdano"?"info":"draft")}>{effectiveStatus}</span>
       <h3>{effectiveNumber}</h3><small>{selected.partner} · {selected.id}</small>

       <div className="invoiceMeta">
         <div><small>Datum izdaje</small><b>{issued&&selected.status==="Osnutek"?"02. 11. 2026":selected.issue}</b></div>
         <div><small>Rok plačila</small><b>{issued&&selected.status==="Osnutek"?"17. 11. 2026":selected.due}</b></div>
         <div><small>Način dostave</small><b>{sent?"E-pošta":selected.delivery}</b></div>
         <div><small>Valuta</small><b>EUR</b></div>
       </div>

       <div className="invoiceSection2"><h4>Postavke</h4>
         <div className="line2"><span>Storitev / projekt</span><span>1 ×</span><b>{selected.net}</b><span>22 % DDV</span></div>
         <div className="totals"><div><span>Neto</span><b>{selected.net}</b></div><div><span>DDV</span><b>{selected.tax}</b></div><div><span>Skupaj</span><b>{selected.gross}</b></div></div>
       </div>

       <div className="invoiceSection2"><h4>Terjatev in knjiženje</h4>
         <div className="receivableBox"><b>1200 · Terjatve do kupcev</b><small>Ob izdaji se pripravi uravnotežena temeljnica in odprta postavka z rokom plačila.</small></div>
       </div>

       <div className="invoiceSection2"><h4>Artefakti</h4>
         <div className="line2"><span>PDF račun</span><span></span><b>{effectiveStatus==="Osnutek"?"Ni ustvarjen":"Pripravljen"}</b><span>SHA-256</span></div>
         <div className="line2"><span>e-račun XML</span><span></span><b>{effectiveStatus==="Osnutek"?"Ni ustvarjen":"Pripravljen"}</b><span>strukturiran</span></div>
       </div>

       <div className="invoiceSection2"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         {selected.status==="Osnutek"&&!issued&&<button className="primary" onClick={()=>setIssued(true)}>Izdaj račun in dodeli številko</button>}
         {selected.status==="Osnutek"&&issued&&!sent&&<button className="primary" onClick={()=>setSent(true)}>Pošlji račun</button>}
         <button className="secondary">Predogled PDF</button>
         <button className="secondary">Prikaži temeljnico</button>
         {effectiveStatus==="Zapadlo"&&<button className="secondary">Pripravi opomin</button>}
       </div></div>
     </aside>
   </div>
 </section>
}
