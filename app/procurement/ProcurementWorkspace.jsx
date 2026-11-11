"use client";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {useMemo,useState} from "react";

const pos=[
 {id:"PO-2026-0045",supplier:"MaterialPartner d.o.o.",status:"Naročeno",gross:29280,delivery:"08. 11. 2026",match:"Čaka prevzem",sales:"NAR-2026-0008"},
 {id:"PO-2026-0044",supplier:"FolijePlus d.o.o.",status:"Delno prevzeto",gross:4860,delivery:"05. 11. 2026",match:"Količinsko odstopanje",sales:"NAR-2026-0008"},
 {id:"PO-2026-0043",supplier:"GradnjaTrade d.o.o.",status:"Prejeto",gross:2281.4,delivery:"03. 11. 2026",match:"Ujemanje OK",sales:"—"},
 {id:"PO-2026-0042",supplier:"ElektroKom d.o.o.",status:"Odstopanje",gross:47092,delivery:"02. 11. 2026",match:"Cena +640,00 €",sales:"NAR-2026-0007"}
];

const offers=[
 {supplier:"MaterialPartner d.o.o.",price:"24.000,00 €",lead:"3 dni",score:"Najboljša cena"},
 {supplier:"MetalPro d.o.o.",price:"24.650,00 €",lead:"2 dni",score:"Najhitrejša dobava"},
 {supplier:"Industria d.o.o.",price:"25.120,00 €",lead:"5 dni",score:"Alternativa"}
];

export default function ProcurementWorkspace({context}){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(pos[0]);
 const tab=context?.level2??"Pregled";
 const subView=context?.level3??"KPI";
 const list=useMemo(()=>pos.filter(x=>{
   const q=query.toLowerCase();
   const contextStatus=tab==="Naročilnice"?({"Naročeno":"Naročeno","Delno prevzeto":"Delno prevzeto","Osnutki":"Osnutek"})[subView]:null;
   return (!q||[x.id,x.supplier,x.sales].join(" ").toLowerCase().includes(q))
     &&(filter==="Vsi"||x.status===filter)
     &&(!contextStatus||x.status===contextStatus);
 }),[query,filter,tab,subView]);

 return <section className="proc">
  <style>{`
  .procTabs{display:flex;gap:6px;margin-bottom:10px}.procTabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 11px;font-size:9px}.procTabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel))}
  .procGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 370px;gap:10px}.pcard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.phead{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.phead h3{margin:0;font-size:12px}.tools{display:flex;gap:7px;flex-wrap:wrap}.tools input,.tools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
  .prow{display:grid;grid-template-columns:1fr 1.25fr .85fr .85fr .8fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.prow.head{font-size:8px;text-transform:uppercase;color:var(--muted);letter-spacing:.06em;background:var(--panel)}.prow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.prow b{font-size:10px}.prow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.state{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.state.ok{color:var(--ok)}.state.warn{color:var(--warn)}.state.bad{color:var(--danger)}.state.info{color:var(--accent2)}
  .detail{padding:14px}.detail h3{margin:8px 0 2px;font-size:17px}.detail>small{color:var(--muted);font-size:9px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.meta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.meta small,.meta b{display:block}.meta small{font-size:8px;color:var(--muted)}.meta b{font-size:10px;margin-top:3px}.sec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.sec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.line{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.flow{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px}.flow div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.flow .on{border-color:var(--accent);color:var(--text)}
  .offerGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.offer{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:14px;padding:12px}.offer h3{margin:0;font-size:12px}.offer small{color:var(--muted);font-size:8px;display:block;margin-top:4px}.offer strong{display:block;font-size:17px;margin-top:10px}.offer .badge{display:inline-block;margin-top:8px;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px;color:var(--accent)}
  @media(max-width:1100px){.procGrid{grid-template-columns:1fr}.offerGrid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.prow{grid-template-columns:1fr 1fr .8fr}.prow>*:nth-child(3),.prow>*:nth-child(4){display:none}.meta{grid-template-columns:1fr}.offerGrid{grid-template-columns:1fr}.flow{grid-template-columns:repeat(3,1fr)}.tools input{width:100%}}
  `}</style>



  {(tab==="Pregled"||tab==="Naročilnice")&&<>
   <div className="flow"><div className="on">Potreba</div><div className="on">Povpraševanje</div><div className="on">Naročilo</div><div>Prevzem</div><div>Račun</div><div>3-way match</div></div>
   <AdaptivePaneGrid className="procGrid">
    <article className="pcard"><div className="phead"><h3>{tab==="Naročilnice"?"Naročilnice · "+subView:"Nabava · pregled naročilnic"}</h3><div className="tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči naročilnico, dobavitelja ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Naročeno</option><option>Delno prevzeto</option><option>Prejeto</option><option>Odstopanje</option></select><button className="primary">＋ Nova naročilnica</button></div></div>
    <div className="prow head"><span>Naročilo</span><span>Dobavitelj</span><span>Dobava</span><span>Vrednost</span><span>Kontrola</span></div>
    {list.map(x=><button className="prow" key={x.id} onClick={()=>setSelected(x)}><span><b>{x.id}</b><small>{x.sales}</small></span><span><b>{x.supplier}</b><small>{x.status}</small></span><span>{x.delivery}</span><b>{x.gross.toFixed(2)} €</b><span className={"state "+(x.match==="Ujemanje OK"?"ok":x.status==="Odstopanje"?"bad":"warn")}>{x.match}</span></button>)}
    </article>
    <aside className="pcard detail"><span className={"state "+(selected.match==="Ujemanje OK"?"ok":selected.status==="Odstopanje"?"bad":"info")}>{selected.status}</span><h3>{selected.id}</h3><small>{selected.supplier} · {selected.sales}</small>
    <div className="meta"><div><small>Vrednost</small><b>{selected.gross.toFixed(2)} €</b></div><div><small>Pričakovana dobava</small><b>{selected.delivery}</b></div><div><small>Vir potrebe</small><b>{selected.sales}</b></div><div><small>3-way match</small><b>{selected.match}</b></div></div>
    <div className="sec"><h4>Postavke</h4><div className="line"><span>Pogonski modul PM-200</span><b>12 kos</b></div><div className="line"><span>Krmilnik KC-100</span><b>20 kos</b></div></div>
    <div className="sec"><h4>Kontrola naročilo / prevzem / račun</h4><div className="line"><span>Naročeno</span><b>32 kos</b></div><div className="line"><span>Prevzeto</span><b>{selected.status==="Naročeno"?"0":"30"} kos</b></div><div className="line"><span>Cenovno odstopanje</span><b>{selected.status==="Odstopanje"?"+640,00 €":"0,00 €"}</b></div></div>
    <div className="sec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary">Evidentiraj prevzem</button><button className="secondary">Primerjaj z računom</button><button className="secondary">Odpri dobavitelja</button><button className="secondary">Prikaži audit sled</button></div></div></aside>
   </AdaptivePaneGrid></>}

  {(tab==="Povpraševanja"||tab==="Ponudbe dobaviteljev")&&<div className="offerGrid">{offers.filter(o=>subView!=="Izbrano"||o.score==="Najboljša cena").map(o=><article className="offer" key={o.supplier}><h3>{o.supplier}</h3><small>Ponudba za PM-200 · 12 kos</small><strong>{o.price}</strong><small>Dobavni rok: {o.lead}</small><span className="badge">{o.score}</span><button className="secondary" style={{width:"100%",marginTop:10}}>Izberi ponudbo</button></article>)}</div>}

  {tab==="Prevzemi"&&<article className="pcard"><div className="phead"><h3>Prevzemi blaga in materiala</h3><button className="primary">＋ Nov prevzem</button></div><div style={{padding:12}}><div className="line"><span>GR-PO-2026-0044-1 · FolijePlus d.o.o.</span><b>Delni prevzem · 18/20</b></div><div className="line"><span>GR-PO-2026-0043-1 · GradnjaTrade d.o.o.</span><b>Prejeto · 100 %</b></div><div className="line"><span>GR-PO-2026-0042-1 · ElektroKom d.o.o.</span><b>Prejeto · kontrola cene</b></div></div></article>}
  {tab==="Potrebe"&&<article className="pcard"><div className="phead"><h3>Nabavne potrebe · {subView}</h3></div><div style={{padding:12}}>{[
    {ref:"POT-2026-0042",source:"NAR-2026-0008",status:"Nove",detail:"Material za naročilo kupca"},
    {ref:"POT-2026-0041",source:"Minimalna zaloga",status:"Odobrene",detail:"Dopolnitev zaloge skladišča"}
   ].filter(x=>x.status===subView).map(x=><div className="line" key={x.ref}><span>{x.ref} · {x.source}</span><b>{x.detail}</b></div>)}
   {subView==="Pretvorjene"&&<p>V demonstracijskem naboru ni pretvorjenih potreb.</p>}</div></article>}

  {tab==="3-way match"&&<article className="pcard"><div className="phead"><h3>3-way match · {subView}</h3></div><div style={{padding:12}}>{pos.filter(x=>
   subView==="Ujemanje"?x.match==="Ujemanje OK":
   subView==="Odstopanja"?x.status==="Odstopanje"||x.match==="Količinsko odstopanje":
   x.match!=="Ujemanje OK"
  ).map(x=><div className="line" key={x.id}><span>{x.id} · {x.supplier}</span><b>{x.match}</b></div>)}</div></article>}

 </section>
}
