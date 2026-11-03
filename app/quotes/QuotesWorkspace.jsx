"use client";
import {useEffect,useMemo,useState} from "react";

const quotes=[
 {id:"PON-2026-0042",partner:"ABC d.o.o.",version:2,status:"Poslano",net:2450,tax:539,gross:2989,valid:"15. 11. 2026",owner:"Dalibor",opportunity:"Prenova označb"},
 {id:"PON-2026-0041",partner:"Gamma GmbH",version:1,status:"Sprejeto",net:5200,tax:0,gross:5200,valid:"12. 11. 2026",owner:"Nina",opportunity:"Sejemski sistemi"},
 {id:"PON-2026-0040",partner:"Studio Kreativ s.p.",version:3,status:"Osnutek",net:980,tax:215.6,gross:1195.6,valid:"20. 11. 2026",owner:"Dalibor",opportunity:"Grafične storitve"},
 {id:"PON-2026-0039",partner:"Delta d.o.o.",version:1,status:"Zavrnjeno",net:1800,tax:396,gross:2196,valid:"05. 11. 2026",owner:"Jerica",opportunity:"Montaža"}
];

export default function QuotesWorkspace({context}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Vse";
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(quotes[0]);
 const [accepted,setAccepted]=useState(false);
 const [sent,setSent]=useState(false);
 const list=useMemo(()=>quotes.filter(q=>{
   const s=query.toLowerCase();
   const contextMatch=section==="Pregled"?(subView==="Osnutki"?q.status==="Osnutek":subView==="Poslano"?q.status==="Poslano":true)
     :section==="Sprejete"?(subView==="Zaključeno"?false:q.status==="Sprejeto")
     :section==="Zavrnjene"?(subView==="Ponovni stik"?false:q.status==="Zavrnjeno")
     :section==="Predloge"?false:true;
   return (!s||[q.id,q.partner,q.opportunity].join(" ").toLowerCase().includes(s))&&(filter==="Vsi"||q.status===filter)&&contextMatch;
 }),[query,filter,section,subView]);

 const status=accepted?"Sprejeto":sent&&selected.status==="Osnutek"?"Poslano":selected.status;

 useEffect(()=>{
   if(list.length&&!list.some(row=>row.id===selected.id)){
     setSelected(list[0]);setAccepted(false);setSent(false);
   }
 },[list,selected.id]);

 return <section className="quotesWorkspace">
 <style>{`
 .quotesGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 370px;gap:10px}.quoteCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.quoteHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.quoteHead h3{margin:0;font-size:12px}.quoteTools{display:flex;gap:7px;flex-wrap:wrap}.quoteTools input,.quoteTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
 .quoteRow{display:grid;grid-template-columns:1fr 1.2fr .75fr .8fr .85fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.quoteRow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.quoteRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.quoteRow b{font-size:10px}.quoteRow small{display:block;font-size:8px;color:var(--muted);margin-top:2px}.qstate{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.qstate.ok{color:var(--ok)}.qstate.info{color:var(--accent2)}.qstate.bad{color:var(--danger)}.qstate.draft{color:var(--muted)}
 .quoteDetail{padding:14px}.quoteDetail h3{margin:8px 0 2px;font-size:17px}.quoteDetail>small{color:var(--muted);font-size:9px}.quoteMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.quoteMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.quoteMeta small,.quoteMeta b{display:block}.quoteMeta small{font-size:8px;color:var(--muted)}.quoteMeta b{font-size:10px;margin-top:3px}.quoteSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.quoteSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.qline{display:grid;grid-template-columns:1.3fr .45fr .6fr .6fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.qline b{text-align:right}.totals{display:grid;gap:5px;margin-top:8px}.totals div{display:flex;justify-content:space-between;font-size:9px}.totals div:last-child{font-size:11px;font-weight:800;border-top:1px solid var(--line);padding-top:6px}.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:0 0 10px}.flow div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.flow .on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
 @media(max-width:1100px){.quotesGrid{grid-template-columns:1fr}}@media(max-width:760px){.quoteRow{grid-template-columns:1fr 1fr .7fr}.quoteRow>*:nth-child(3),.quoteRow>*:nth-child(4){display:none}.quoteMeta{grid-template-columns:1fr}.quoteTools input{width:100%}}
 `}</style>
 <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Ponudbe · <b style={{color:"var(--text)"}}>{section} / {subView}</b> · demonstracijski podatki</div>
 <div className="flow"><div className="on">Osnutek</div><div className="on">Poslano</div><div className={status==="Sprejeto"?"on":""}>Odločitev</div><div className={status==="Sprejeto"?"on":""}>Sprejeto</div><div>Naročilo</div></div>
 {section==="Analitika"&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
  <span className="qstate info">Vse ponudbe: {quotes.length}</span>
  <span className="qstate ok">Sprejete: {quotes.filter(q=>q.status==="Sprejeto").length}</span>
  <span className="qstate draft">Osnutki: {quotes.filter(q=>q.status==="Osnutek").length}</span>
 </div>}
 <div className="quotesGrid">
  <article className="quoteCard">
   <div className="quoteHead"><h3>Ponudbe · {section} / {subView}</h3><div className="quoteTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči ponudbo, partnerja, priložnost ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Osnutek</option><option>Poslano</option><option>Sprejeto</option><option>Zavrnjeno</option></select><button className="primary">＋ Nova ponudba</button></div></div>
   <div className="quoteRow head"><span>Ponudba</span><span>Partner</span><span>Verzija</span><span>Vrednost</span><span>Status</span></div>
   {!list.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>Za izbrani pogled še ni ponudb v demonstracijskih podatkih.</p>}
   {list.map(q=><button className="quoteRow" key={q.id} onClick={()=>{setSelected(q);setAccepted(false);setSent(false)}}>
    <span><b>{q.id}</b><small>{q.opportunity}</small></span><span><b>{q.partner}</b><small>{q.owner}</small></span><span>v{q.version}</span><b>{q.gross.toFixed(2)} €</b><span className={"qstate "+(q.status==="Sprejeto"?"ok":q.status==="Poslano"?"info":q.status==="Zavrnjeno"?"bad":"draft")}>{q.status}</span>
   </button>)}
  </article>
  {list.length>0&&<aside className="quoteCard quoteDetail">
   <span className={"qstate "+(status==="Sprejeto"?"ok":status==="Poslano"?"info":status==="Zavrnjeno"?"bad":"draft")}>{status}</span>
   <h3>{selected.id}</h3><small>{selected.partner} · verzija {selected.version}</small>
   <div className="quoteMeta"><div><small>Velja do</small><b>{selected.valid}</b></div><div><small>CRM priložnost</small><b>{selected.opportunity}</b></div><div><small>Lastnik</small><b>{selected.owner}</b></div><div><small>Valuta</small><b>EUR</b></div></div>
   <div className="quoteSec"><h4>Postavke</h4><div className="qline"><span>Reklamna tabla 100 × 70 cm</span><span>20 kos</span><b>58,00 €</b><span>-8 %</span></div><div className="qline"><span>Montaža na lokaciji</span><span>12 h</span><b>42,00 €</b><span>0 %</span></div><div className="totals"><div><span>Neto</span><b>{selected.net.toFixed(2)} €</b></div><div><span>DDV</span><b>{selected.tax.toFixed(2)} €</b></div><div><span>Skupaj</span><b>{selected.gross.toFixed(2)} €</b></div></div></div>
   <div className="quoteSec"><h4>Verzija in sledljivost</h4><div className="quoteMeta"><div><small>Trenutna verzija</small><b>v{selected.version}</b></div><div><small>Cenovni snapshot</small><b>Zaklenjen ob pošiljanju</b></div></div></div>
   <div className="quoteSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>{selected.status==="Osnutek"&&!sent&&<button className="primary" onClick={()=>setSent(true)}>Pošlji ponudbo</button>}<button className="secondary">Predogled PDF</button><button className="secondary">Ustvari novo verzijo</button>{(status==="Poslano"||status==="Sprejeto")&&<button className="secondary" onClick={()=>setAccepted(true)}>Simuliraj sprejem prek povezave</button>}{status==="Sprejeto"&&<button className="primary">Pretvori v naročilo</button>}</div></div>
  </aside>}{list.length===0&&<aside className="quoteCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}
 </div>
 </section>
}
