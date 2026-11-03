"use client";
import {useMemo,useState} from "react";

const projects=[
 {id:"PROJ-2026-0012",name:"Prenova označb ABC",partner:"ABC d.o.o.",status:"Aktiven",due:"15. 11. 2026",owner:"Dalibor",progress:64,revenue:12400,cost:7860,margin:4540,marginPct:36.61,order:"NAR-2026-0008"},
 {id:"PROJ-2026-0011",name:"Sejemski sistem Gamma",partner:"Gamma GmbH",status:"Aktiven",due:"10. 11. 2026",owner:"Nina",progress:82,revenue:18000,cost:14220,margin:3780,marginPct:21.0,order:"NAR-2026-0007"},
 {id:"PROJ-2026-0010",name:"Montaža Delta",partner:"Delta d.o.o.",status:"Na čakanju",due:"18. 11. 2026",owner:"Jerica",progress:38,revenue:6200,cost:4960,margin:1240,marginPct:20.0,order:"NAR-2026-0005"},
 {id:"PROJ-2026-0009",name:"Grafični paket Studio",partner:"Studio Kreativ s.p.",status:"Zaključeno",due:"31. 10. 2026",owner:"Dalibor",progress:100,revenue:4800,cost:3020,margin:1780,marginPct:37.08,order:"NAR-2026-0006"}
];

const tasks=[
 ["Izmera in priprava","Zaključeno","8,0 h","Nina"],
 ["Izdelava grafik","V delu","14,5 h","Dalibor"],
 ["Produkcija tabel","V delu","22,0 h","Boštjan"],
 ["Montaža na lokaciji","Planirano","12,0 h","Jerica"]
];

const costs=[
 ["Delo","1.920,00 €","48,0 h"],
 ["Material","3.740,00 €","skladiščna izdaja"],
 ["Kooperanti","1.200,00 €","prejeti računi"],
 ["Ostalo","1.000,00 €","storitve"]
];

export default function ProjectsWorkspace(){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(projects[0]);
 const [tab,setTab]=useState("Projekti");
 const rows=useMemo(()=>projects.filter(p=>{
   const q=query.toLowerCase();
   return (!q||[p.id,p.name,p.partner,p.order].join(" ").toLowerCase().includes(q))&&(filter==="Vsi"||p.status===filter);
 }),[query,filter]);

 return <section className="projects">
  <style>{`
  .ptabs{display:flex;gap:6px;margin-bottom:10px}.ptabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 11px;font-size:9px}.ptabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel))}
  .pkpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.pk{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:13px;padding:11px}.pk small,.pk b{display:block}.pk small{font-size:8px;color:var(--muted)}.pk b{font-size:17px;margin-top:4px}
  .pgrid{display:grid;grid-template-columns:minmax(0,1.45fr) 380px;gap:10px}.pcard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.phead{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.phead h3{margin:0;font-size:12px}.tools{display:flex;gap:7px;flex-wrap:wrap}.tools input,.tools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
  .prow{display:grid;grid-template-columns:.9fr 1.35fr .8fr .75fr .75fr .65fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.prow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.prow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.prow b{font-size:10px}.prow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.state{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.ok{color:var(--ok)}.warn{color:var(--warn)}.info{color:var(--accent2)}
  .detail{padding:14px}.detail h3{margin:8px 0 2px;font-size:17px}.detail>small{color:var(--muted);font-size:9px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.meta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.meta small,.meta b{display:block}.meta small{font-size:8px;color:var(--muted)}.meta b{font-size:10px;margin-top:3px}.sec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.sec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.line{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:7px}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2))}
  .profit{border:1px solid color-mix(in srgb,var(--ok) 35%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--ok) 5%,var(--panel))}.profit strong{font-size:20px}.profit small{display:block;color:var(--muted);font-size:8px;margin-top:3px}
  .taskrow{display:grid;grid-template-columns:1.4fr .8fr .7fr .8fr;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);font-size:9px}.woGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.wo{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:12px}.wo h3{margin:0;font-size:12px}.wo small{display:block;color:var(--muted);font-size:8px;margin-top:4px}
  @media(max-width:1100px){.pgrid{grid-template-columns:1fr}.woGrid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.pkpi{grid-template-columns:1fr 1fr}.prow{grid-template-columns:.8fr 1.3fr .7fr}.prow>*:nth-child(3),.prow>*:nth-child(4),.prow>*:nth-child(6){display:none}.meta{grid-template-columns:1fr}.taskrow{grid-template-columns:1.4fr .8fr}.taskrow>*:nth-child(3),.taskrow>*:nth-child(4){display:none}.woGrid{grid-template-columns:1fr}.tools input{width:100%}}
  `}</style>

  <div className="pkpi"><div className="pk"><small>Aktivni projekti</small><b>12</b></div><div className="pk"><small>Prihodki projektov</small><b>41.400 €</b></div><div className="pk"><small>Stroški</small><b>30.060 €</b></div><div className="pk"><small>Dejanska marža</small><b>27,4 %</b></div></div>
  <div className="ptabs"><button className={tab==="Projekti"?"on":""} onClick={()=>setTab("Projekti")}>Projekti</button><button className={tab==="Naloge"?"on":""} onClick={()=>setTab("Naloge")}>Naloge</button><button className={tab==="Delovni nalogi"?"on":""} onClick={()=>setTab("Delovni nalogi")}>Delovni nalogi</button><button className={tab==="Čas"?"on":""} onClick={()=>setTab("Čas")}>Evidenca časa</button></div>

  {tab==="Projekti"&&<div className="pgrid">
   <article className="pcard"><div className="phead"><h3>Projekti</h3><div className="tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči projekt, partnerja, naročilo ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Aktiven</option><option>Na čakanju</option><option>Zaključeno</option></select><button className="primary">＋ Nov projekt</button></div></div>
   <div className="prow head"><span>Projekt</span><span>Naziv</span><span>Rok</span><span>Napredek</span><span>Marža</span><span>Status</span></div>
   {rows.map(p=><button className="prow" key={p.id} onClick={()=>setSelected(p)}><span><b>{p.id}</b><small>{p.order}</small></span><span><b>{p.name}</b><small>{p.partner} · {p.owner}</small></span><span>{p.due}</span><span><b>{p.progress} %</b></span><span><b className={p.marginPct>=30?"ok":p.marginPct>=20?"warn":"info"}>{p.marginPct.toFixed(1)} %</b></span><span className={"state "+(p.status==="Zaključeno"?"ok":p.status==="Na čakanju"?"warn":"info")}>{p.status}</span></button>)}
   </article>
   <aside className="pcard detail"><span className="state info">{selected.status}</span><h3>{selected.name}</h3><small>{selected.id} · {selected.partner} · {selected.order}</small>
   <div className="meta"><div><small>Prihodki</small><b>{selected.revenue.toFixed(2)} €</b></div><div><small>Stroški</small><b>{selected.cost.toFixed(2)} €</b></div><div><small>Napredek</small><b>{selected.progress} %</b></div><div><small>Rok</small><b>{selected.due}</b></div></div>
   <div className="sec"><h4>Dejanska donosnost</h4><div className="profit"><strong>{selected.margin.toFixed(2)} €</strong><small>Marža {selected.marginPct.toFixed(2)} % · materializirano iz računov, časa in porabe materiala.</small><div className="bar"><i style={{width:Math.min(100,Math.max(0,selected.marginPct*2))+"%"}}/></div></div></div>
   <div className="sec"><h4>Stroški po viru</h4>{costs.map((c,i)=><div className="line" key={i}><span>{c[0]} · {c[2]}</span><b>{c[1]}</b></div>)}</div>
   <div className="sec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary">Dodaj delovni nalog</button><button className="secondary">Evidentiraj čas</button><button className="secondary">Odpri material in nabavo</button><button className="secondary">Osveži donosnost</button><button className="secondary">Prikaži audit sled</button></div></div>
   </aside>
  </div>}

  {tab==="Naloge"&&<article className="pcard"><div className="phead"><h3>Naloge · {selected.name}</h3><button className="primary">＋ Nova naloga</button></div>{tasks.map((t,i)=><div className="taskrow" key={i}><b>{t[0]}</b><span className="state info">{t[1]}</span><span>{t[2]}</span><span>{t[3]}</span></div>)}</article>}

  {tab==="Delovni nalogi"&&<div className="woGrid"><article className="wo"><h3>DN-2026-0048 · Produkcija</h3><small>PROJ-2026-0012 · Boštjan</small><div className="line"><span>Status</span><b>V delu</b></div><div className="line"><span>Termin</span><b>03.–05. 11.</b></div></article><article className="wo"><h3>DN-2026-0049 · Montaža</h3><small>PROJ-2026-0012 · Jerica</small><div className="line"><span>Status</span><b>Planirano</b></div><div className="line"><span>Termin</span><b>07. 11.</b></div></article><article className="wo"><h3>DN-2026-0050 · Kontrola</h3><small>PROJ-2026-0011 · Nina</small><div className="line"><span>Status</span><b>Planirano</b></div><div className="line"><span>Termin</span><b>06. 11.</b></div></article></div>}

  {tab==="Čas"&&<article className="pcard"><div className="phead"><h3>Evidenca časa</h3><button className="primary">＋ Dodaj ure</button></div><div style={{padding:12}}><div className="line"><span>03. 11. · Dalibor · Izdelava grafik</span><b>6,5 h · 260,00 €</b></div><div className="line"><span>03. 11. · Boštjan · Produkcija</span><b>8,0 h · 224,00 €</b></div><div className="line"><span>02. 11. · Nina · Priprava</span><b>4,0 h · 144,00 €</b></div><div className="line"><span>02. 11. · Jerica · Koordinacija</span><b>2,5 h · 90,00 €</b></div></div></article>}
 </section>
}
