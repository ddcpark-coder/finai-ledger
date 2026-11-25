"use client";
import {useMemo,useState} from "react";
import {createDemoProject,addDemoProjectTask,logDemoProjectTime,demoProjectFinance} from "./demoProjects.mjs";

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

export default function ProjectsWorkspace({context,companyId=1,onNavigate}){
 const [query,setQuery]=useState("");
 const [records,setRecords]=useState(()=>projects.map(p=>({...p,companyId})));
 const [selectedId,setSelectedId]=useState(projects[0].id);
 const selected=records.find(p=>p.id===selectedId)??records[0];
 const [demoTasks,setDemoTasks]=useState([]);
 const [timeEntries,setTimeEntries]=useState([]);
 const [audit,setAudit]=useState([]);
 const [auditOpen,setAuditOpen]=useState(false);
 const [action,setAction]=useState("");
 const [formName,setFormName]=useState("");
 const [formPartner,setFormPartner]=useState("");
 const [formRevenue,setFormRevenue]=useState("0");
 const [formHours,setFormHours]=useState("1");
 const [notice,setNotice]=useState("");
 const addAudit=(projectId,detail)=>setAudit(events=>[...events,{
   projectId,detail,time:new Date().toLocaleTimeString("sl-SI")
 }]);
 const submitDemo=(event)=>{
   event.preventDefault();
   try{
     if(action==="create"){
       const result=createDemoProject(records,companyId,{
         name:formName,partner:formPartner,revenue:formRevenue
       });
       setRecords(result.rows);setSelectedId(result.project.id);
       setQuery("");addAudit(result.project.id,"Ustvarjen demonstracijski projekt");
       setNotice("Nov sintetični projekt "+result.project.id+" ustvarjen v trenutni seji.");
     }else if(action==="task"){
       const result=addDemoProjectTask(demoTasks,records,companyId,selected.id,formName);
       setDemoTasks(result.tasks);addAudit(selected.id,"Dodana demo naloga: "+result.task.title);
       setNotice("Naloga je dodana samo v demo sejo projekta "+selected.id+".");
     }else if(action==="time"){
       const result=logDemoProjectTime(records,companyId,selected.id,formHours);
       setRecords(result.rows);setTimeEntries(entries=>[result.event,...entries]);
       addAudit(selected.id,"Evidentirano "+result.event.hours+" h demo dela");
       setNotice("Sintetični strošek "+result.event.cost.toFixed(2)+" € je prištet oceni projekta.");
     }
     setAction("");setFormName("");setFormPartner("");setFormRevenue("0");setFormHours("1");
   }catch(error){setNotice(error.message);}
 };
 const tab=({Pregled:"Projekti",Naloge:"Naloge","Delovni nalogi":"Delovni nalogi",Čas:"Čas",Material:"Material",Finance:"Finance",Dokumenti:"Dokumenti"})[context?.level2]??"Projekti";
 const subView=context?.level3??"Aktivni";
 const rows=useMemo(()=>records.filter(p=>{
   const q=query.toLowerCase();
   const state=({"Aktivni":"Aktiven","Na čakanju":"Na čakanju","Zaključeni":"Zaključeno"})[subView];
   return (!q||[p.id,p.name,p.partner,p.order].join(" ").toLowerCase().includes(q))&&(!state||p.status===state);
 }),[query,subView,records]);

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

  <p style={{fontSize:10,color:"var(--muted)"}}>Podjetje {companyId} · samo sintetični projekti in lokalni izračuni. Brez realnih nalogov, računov ali knjiženja.</p>
  {notice&&<p role="status" style={{padding:10,marginBottom:9,border:"1px solid var(--line)",borderRadius:9,fontSize:11}}>{notice}</p>}
  {action&&<form onSubmit={submitDemo} style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:8,border:"1px solid var(--line)",borderRadius:12,padding:12,marginBottom:10}}>
    <b style={{fontSize:11}}>{action==="create"?"Nov demo projekt":action==="task"?"Nova demo naloga · "+selected.id:"Evidenca demo časa · "+selected.id}</b>
    {action!=="time"&&<label style={{display:"grid",gap:4,fontSize:10}}>{action==="create"?"Naziv projekta":"Naziv naloge"}
      <input type="text" required minLength={2} maxLength={120} value={formName} onChange={e=>setFormName(e.target.value)} style={{padding:8,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:8,color:"var(--text)"}}/>
    </label>}
    {action==="create"&&<><label style={{display:"grid",gap:4,fontSize:10}}>Sintetični partner
      <input type="text" required minLength={2} maxLength={120} value={formPartner} onChange={e=>setFormPartner(e.target.value)} style={{padding:8,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:8,color:"var(--text)"}}/>
    </label>
    <label style={{display:"grid",gap:4,fontSize:10}}>Ocenjen demo prihodek (€)
      <input type="number" min="0" max="10000000" step="0.01" required value={formRevenue} onChange={e=>setFormRevenue(e.target.value)} style={{padding:8,width:125,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:8,color:"var(--text)"}}/>
    </label></>}
    {action==="time"&&<label style={{display:"grid",gap:4,fontSize:10}}>Demo ure (40 €/h)
      <input type="number" min="0.01" max="24" step="0.01" required value={formHours} onChange={e=>setFormHours(e.target.value)} style={{padding:8,width:100,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:8,color:"var(--text)"}}/>
    </label>}
    <button type="submit" className="primary">Shrani demo spremembo</button>
    <button type="button" className="secondary" onClick={()=>setAction("")}>Prekliči</button>
  </form>}
  <div className="pkpi">
    <div className="pk"><small>Aktivni demo projekti</small><b>{records.filter(p=>p.status==="Aktiven").length}</b></div>
    <div className="pk"><small>Ocenjeni prihodki</small><b>{records.reduce((sum,p)=>sum+p.revenue,0).toLocaleString("sl-SI",{style:"currency",currency:"EUR"})}</b></div>
    <div className="pk"><small>Sintetični stroški</small><b>{records.reduce((sum,p)=>sum+p.cost,0).toLocaleString("sl-SI",{style:"currency",currency:"EUR"})}</b></div>
    <div className="pk"><small>Ocenjena marža</small><b>{(()=>{
      const revenue=records.reduce((sum,p)=>sum+p.revenue,0),cost=records.reduce((sum,p)=>sum+p.cost,0);
      return revenue?((revenue-cost)/revenue*100).toFixed(1)+" %":"0 %";
    })()}</b></div>
  </div>


  {tab==="Projekti"&&<div className="pgrid">
   <article className="pcard"><div className="phead"><h3>Projekti · {subView}</h3><div className="tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči projekt, partnerja, naročilo ..."/><button type="button" className="primary" onClick={()=>setAction("create")}>＋ Nov demo projekt</button></div></div>
   <div className="prow head"><span>Projekt</span><span>Naziv</span><span>Rok</span><span>Napredek</span><span>Marža</span><span>Status</span></div>
   {rows.map(p=><button className="prow" key={p.id} onClick={()=>{setSelectedId(p.id);setAuditOpen(false);}}><span><b>{p.id}</b><small>{p.order}</small></span><span><b>{p.name}</b><small>{p.partner} · {p.owner}</small></span><span>{p.due}</span><span><b>{p.progress} %</b></span><span><b className={p.marginPct>=30?"ok":p.marginPct>=20?"warn":"info"}>{p.marginPct.toFixed(1)} %</b></span><span className={"state "+(p.status==="Zaključeno"?"ok":p.status==="Na čakanju"?"warn":"info")}>{p.status}</span></button>)}
   </article>
   <aside className="pcard detail"><span className="state info">{selected.status}</span><h3>{selected.name}</h3><small>{selected.id} · {selected.partner} · {selected.order}</small>
   <div className="meta"><div><small>Prihodki</small><b>{selected.revenue.toFixed(2)} €</b></div><div><small>Stroški</small><b>{selected.cost.toFixed(2)} €</b></div><div><small>Napredek</small><b>{selected.progress} %</b></div><div><small>Rok</small><b>{selected.due}</b></div></div>
   <div className="sec"><h4>Sintetična donosnost</h4><div className="profit"><strong>{selected.margin.toFixed(2)} €</strong><small>Marža {selected.marginPct.toFixed(2)} % · sintetična ocena; dejanska glavna knjiga ni povezana.</small><div className="bar"><i style={{width:Math.min(100,Math.max(0,selected.marginPct*2))+"%"}}/></div></div></div>
   <div className="sec"><h4>Stroški po viru</h4>{costs.map((c,i)=><div className="line" key={i}><span>{c[0]} · {c[2]}</span><b>{c[1]}</b></div>)}</div>
   <div className="sec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
    <button type="button" className="primary" onClick={()=>{setAction("task");setFormName("");}}>Dodaj demo delovni nalog</button>
    <button type="button" className="secondary" onClick={()=>setAction("time")}>Evidentiraj demo čas</button>
    <button type="button" className="secondary" onClick={()=>onNavigate?.("Zaloge")}>Odpri Zaloge</button>
    <button type="button" className="secondary" onClick={()=>{const next=demoProjectFinance(selected);setRecords(old=>old.map(p=>p.id===selected.id?next:p));setNotice("Sintetična donosnost znova izračunana iz ocenjenih prihodkov in stroškov.");}}>Osveži demo donosnost</button>
    <button type="button" className="secondary" aria-expanded={auditOpen} onClick={()=>setAuditOpen(v=>!v)}>Prikaži demo revizijsko sled</button>
  </div>{auditOpen&&<div role="status" style={{fontSize:10,marginTop:8}}>
    {audit.filter(x=>x.projectId===selected.id).length?
      audit.filter(x=>x.projectId===selected.id).map((x,i)=><div className="line" key={i}><span>{x.detail}</span><b>{x.time}</b></div>):
      <p>Za ta projekt še ni novih demo dogodkov.</p>}
  </div>}</div>
   </aside>
  </div>}

  {tab==="Naloge"&&<article className="pcard"><div className="phead"><h3>Naloge · {selected.name}</h3><button type="button" className="primary" onClick={()=>{setAction("task");setFormName("");}}>＋ Nova demo naloga</button></div>{tasks.filter(t=>subView==="V delu"?t[1]==="V delu":subView==="Zamujene"?false:true).map((t,i)=><div className="taskrow" key={i}><b>{t[0]}</b><span className="state info">{t[1]}</span><span>{t[2]}</span><span>{t[3]}</span></div>)}
  {demoTasks.filter(t=>t.projectId===selected.id&&(subView!=="V delu"&&subView!=="Zamujene")).map(t=><div className="taskrow" key={t.id}><b>{t.title}</b><span className="state info">{t.status}</span><span>{t.hours} h</span><span>{t.owner}</span></div>)}</article>}

  {tab==="Delovni nalogi"&&<div className="woGrid">{[
    {id:"DN-2026-0048",title:"Produkcija",project:"PROJ-2026-0012",person:"Boštjan",status:"V delu",date:"03.–05. 11."},
    {id:"DN-2026-0049",title:"Montaža",project:"PROJ-2026-0012",person:"Jerica",status:"Planirano",date:"07. 11."},
    {id:"DN-2026-0050",title:"Kontrola",project:"PROJ-2026-0011",person:"Nina",status:"Planirano",date:"06. 11."}
   ].filter(w=>w.status===subView).map(w=><article className="wo" key={w.id}><h3>{w.id} · {w.title}</h3><small>{w.project} · {w.person}</small><div className="line"><span>Status</span><b>{w.status}</b></div><div className="line"><span>Termin</span><b>{w.date}</b></div></article>)}</div>}

  {tab==="Čas"&&<article className="pcard"><div className="phead"><h3>Evidenca časa · {subView}</h3><button type="button" className="primary" onClick={()=>setAction("time")}>＋ Dodaj demo ure</button></div><div style={{padding:12}}><div className="line"><span>03. 11. · Dalibor · Izdelava grafik</span><b>6,5 h · 260,00 €</b></div><div className="line"><span>03. 11. · Boštjan · Produkcija</span><b>8,0 h · 224,00 €</b></div>{timeEntries.filter(x=>x.projectId===selected.id).map((x,i)=><div className="line" key={i}><span>Demo vnos · {selected.id} · {x.hours} h</span><b>{x.cost.toFixed(2)} €</b></div>)}
    {subView!=="Danes"&&<><div className="line"><span>02. 11. · Nina · Priprava</span><b>4,0 h · 144,00 €</b></div><div className="line"><span>02. 11. · Jerica · Koordinacija</span><b>2,5 h · 90,00 €</b></div></>}</div></article>}
  {tab==="Material"&&<article className="pcard"><div className="phead"><h3>Projektni material · {subView}</h3></div><div style={{padding:12}}>
     {(subView==="Rezervirano"?
       [["Pogonski modul PM-200","12 kos rezervirano"],["Krmilnik KC-100","20 kos rezervirano"]]:
       subView==="Porabljeno"?
       [["Material iz skladišča","3.740,00 €"],["Montažni material","1.120,00 €"]]:
       [["Nabava za projekt","PO-2026-0045"],["Dobavni rok","08. 11. 2026"]]
     ).map(([name,value])=><div className="line" key={name}><span>{name}</span><b>{value}</b></div>)}
   </div></article>}
  {tab==="Finance"&&<article className="pcard"><div className="phead"><h3>Finance projekta · {subView} · {selected.id}</h3></div><div style={{padding:12}}>
      {subView==="Prihodki"&&<div className="line"><span>Izdani računi projekta</span><b>{selected.revenue.toFixed(2)} €</b></div>}
      {subView==="Stroški"&&costs.map(c=><div className="line" key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}
      {subView==="Marža"&&<div className="profit"><strong>{selected.margin.toFixed(2)} €</strong><small>Sintetična marža {selected.marginPct.toFixed(2)} %</small></div>}
   </div></article>}
  {tab==="Dokumenti"&&<article className="pcard"><div className="phead"><h3>Projektni dokumenti · {subView}</h3></div><div style={{padding:12}}>
     {subView==="Dobavnice"&&<div className="line"><span>DOB-2026-0048 · podpisan prevzem</span><b>Dokument</b></div>}
     {subView==="Računi"&&<div className="line"><span>IR-2026-0054 · projektni račun</span><b>Račun</b></div>}
     {subView==="Priloge"&&<p>V prikaznem naboru za projekt ni dodatnih prilog.</p>}
   </div></article>}

 </section>
}
