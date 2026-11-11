"use client";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {useMemo,useState} from "react";

const deals=[
 {id:"OP-104",name:"Nova poslovalnica ABC",partner:"ABC d.o.o.",stage:"Ponudba",value:12400,prob:60,next:"04. 11. 2026",owner:"DD"},
 {id:"OP-103",name:"Letna pogodba Gamma",partner:"Gamma GmbH",stage:"Pogajanja",value:28600,prob:80,next:"05. 11. 2026",owner:"DD"},
 {id:"OP-102",name:"Rebranding Studio Kreativ",partner:"Studio Kreativ s.p.",stage:"Odkrivanje",value:6800,prob:30,next:"06. 11. 2026",owner:"MK"},
 {id:"OP-101",name:"Signalizacija Delta",partner:"Delta d.o.o.",stage:"Kvalifikacija",value:4200,prob:10,next:"03. 11. 2026",owner:"DD"}
];

const activities=[
 {time:"Danes 09:30",type:"Klic",subject:"ABC d.o.o. · potrditev obsega",who:"Janez Novak"},
 {time:"Danes 13:00",type:"Sestanek",subject:"Gamma GmbH · pogajanja",who:"Anna Müller"},
 {time:"Jutri 08:30",type:"Naloga",subject:"Pripravi osnutek ponudbe",who:"ABC d.o.o."}
];

const communications=[
 {channel:"E-pošta",when:"02. 11. 2026",text:"Kupec želi dve variantni ponudbi in rok izvedbe do konca meseca."},
 {channel:"Klic",when:"31. 10. 2026",text:"Potrjen okvirni obseg; pričakujejo končno kalkulacijo."},
 {channel:"Sestanek",when:"28. 10. 2026",text:"Prvi sestanek in kvalifikacija projekta."}
];

const stageOrder=["Kvalifikacija","Odkrivanje","Ponudba","Pogajanja"];

export default function CrmWorkspace({context}){
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState(deals[0]);
 const view=({"Pregled":"Pipeline","Lead-i":"Leadi","Priložnosti":"Pipeline","Kontakti":"Kontakti","Aktivnosti":"Aktivnosti","Napoved":"Napoved"})[context?.level2]??"Pipeline";
 const subView=context?.level3??"KPI";
 const filtered=useMemo(()=>deals.filter(d=>{
   const q=query.toLowerCase();
   const matches=!q||[d.name,d.partner,d.id].join(" ").toLowerCase().includes(q);
   return matches&&(context?.level2!=="Priložnosti"||subView==="Pipeline"||(subView==="Moje"?d.owner==="DD":false));
 }),[query,context?.level2,subView]);
 const pipelineValue=deals.reduce((s,d)=>s+d.value,0);
 const weighted=deals.reduce((s,d)=>s+d.value*d.prob/100,0);

 return <section className="crmWorkspace">
  <style>{`
  .crmWorkspace{margin-top:10px}.crmTop{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.crmKpi{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:13px;padding:11px}.crmKpi small,.crmKpi b{display:block}.crmKpi small{font-size:8px;color:var(--muted)}.crmKpi b{font-size:17px;margin-top:4px;font-variant-numeric:tabular-nums}
  .crmTabs{display:flex;gap:6px;margin-bottom:10px}.crmTabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 11px;font-size:9px}.crmTabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel))}
  .crmGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}.crmCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.crmHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.crmHead h3{margin:0;font-size:12px}.crmHead input{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
  .pipeline{display:grid;grid-template-columns:repeat(4,minmax(190px,1fr));gap:8px;padding:10px;overflow:auto}.stage{border:1px solid var(--line);border-radius:12px;background:var(--bg2);min-height:250px}.stageHead{padding:9px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px}.stageHead b{font-size:9px}.stageHead span{font-size:8px;color:var(--muted)}.deal{margin:8px;border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:9px;cursor:pointer}.deal:hover{border-color:var(--accent)}.deal b,.deal small{display:block}.deal b{font-size:9px}.deal small{font-size:8px;color:var(--muted);margin-top:3px}.dealFoot{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:8px}.prob{color:var(--accent)}
  .crmDetail{padding:14px}.crmDetail h3{margin:8px 0 2px;font-size:16px}.crmDetail>small{color:var(--muted);font-size:9px}.crmMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.crmMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.crmMeta small,.crmMeta b{display:block}.crmMeta small{font-size:8px;color:var(--muted)}.crmMeta b{font-size:10px;margin-top:3px}.crmSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.crmSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.timeline{display:grid;gap:7px}.event{border:1px solid var(--line);border-radius:9px;padding:8px;background:var(--bg2)}.event b,.event small{display:block}.event b{font-size:9px}.event small{font-size:8px;color:var(--muted);margin-top:3px}
  .listRow{display:grid;grid-template-columns:.9fr 1.4fr 1fr .75fr;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);font-size:9px}.listRow.head{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.score{color:var(--accent);font-weight:800}
  @media(max-width:1100px){.crmGrid{grid-template-columns:1fr}.crmTop{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.crmTop{grid-template-columns:1fr 1fr}.crmHead{align-items:flex-start;flex-direction:column}.crmHead input{width:100%}.crmMeta{grid-template-columns:1fr}.listRow{grid-template-columns:1fr 1fr .7fr}.listRow>*:nth-child(3){display:none}}
  `}</style>

  <div className="crmTop">
   <div className="crmKpi"><small>Pipeline</small><b>{pipelineValue.toLocaleString("sl-SI")} €</b></div>
   <div className="crmKpi"><small>Weighted pipeline</small><b>{weighted.toLocaleString("sl-SI")} €</b></div>
   <div className="crmKpi"><small>Odprte priložnosti</small><b>{deals.length}</b></div>
   <div className="crmKpi"><small>Naslednje aktivnosti</small><b>{activities.length}</b></div>
  </div>



  {view==="Pipeline"&&<AdaptivePaneGrid className="crmGrid">
   <article className="crmCard">
    <div className="crmHead"><h3>Prodajni lijak</h3><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči priložnost ali partnerja ..."/><button className="primary">＋ Nova priložnost</button></div></div>
    <div className="pipeline">{stageOrder.map(stage=><section className="stage" key={stage}><div className="stageHead"><b>{stage}</b><span>{filtered.filter(d=>d.stage===stage).length}</span></div>{filtered.filter(d=>d.stage===stage).map(d=><div className="deal" key={d.id} onClick={()=>setSelected(d)}><b>{d.name}</b><small>{d.partner}</small><div className="dealFoot"><span>{d.value.toLocaleString("sl-SI")} €</span><span className="prob">{d.prob} %</span></div></div>)}</section>)}</div>
   </article>

   <aside className="crmCard crmDetail">
    <span className="typeChip">{selected.stage}</span><h3>{selected.name}</h3><small>{selected.partner} · {selected.id}</small>
    <div className="crmMeta"><div><small>Vrednost</small><b>{selected.value.toLocaleString("sl-SI")} €</b></div><div><small>Verjetnost</small><b>{selected.prob} %</b></div><div><small>Naslednje dejanje</small><b>{selected.next}</b></div><div><small>Lastnik</small><b>{selected.owner}</b></div></div>
    <div className="crmSec"><h4>Naslednje aktivnosti</h4><div className="timeline">{activities.map((a,i)=><div className="event" key={i}><b>{a.type} · {a.subject}</b><small>{a.time} · {a.who}</small></div>)}</div></div>
    <div className="crmSec"><h4>Zgodovina komunikacije</h4><div className="timeline">{communications.map((a,i)=><div className="event" key={i}><b>{a.channel} · {a.when}</b><small>{a.text}</small></div>)}</div></div>
    <div className="crmSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary">Pripravi ponudbo</button><button className="secondary">Dodaj aktivnost</button><button className="secondary">Zapiši komunikacijo</button></div></div>
   </aside>
  </AdaptivePaneGrid>}

  {view==="Leadi"&&<article className="crmCard"><div className="crmHead"><h3>Lead-i · {subView}</h3><button className="primary">＋ Nov lead</button></div><div className="listRow head"><span>Lead</span><span>Vir</span><span>Vrednost</span><span>Score</span></div><div className="listRow"><b>Hotel Panorama</b><span>Priporočilo</span><span>8.000 €</span><span className="score">84</span></div><div className="listRow"><b>Nova trgovina Center</b><span>Splet</span><span>5.500 €</span><span className="score">72</span></div><div className="listRow"><b>Občina Projekt X</b><span>Dogodek</span><span>18.000 €</span><span className="score">91</span></div></article>}

  {view==="Aktivnosti"&&<article className="crmCard"><div className="crmHead"><h3>Aktivnosti · {subView}</h3><button className="primary">＋ Nova aktivnost</button></div>{activities.filter(a=>subView==="Klici"?a.type==="Klic":subView==="Sestanki"?a.type==="Sestanek":subView==="E-pošta"?a.type==="E-pošta":true).map((a,i)=><div className="listRow" key={i}><b>{a.time}</b><span>{a.subject}</span><span>{a.who}</span><span>{a.type}</span></div>)}</article>}
  {view==="Kontakti"&&<article className="crmCard"><div className="crmHead"><h3>Kontakti · {subView}</h3></div><div className="listRow head"><span>Ime / podjetje</span><span>Organizacija</span><span>Vloga</span><span>Stik</span></div>
     {[
       {name:"Janez Novak",company:"ABC d.o.o.",role:"Kupec",contact:"janez@example.si"},
       {name:"Anna Müller",company:"Gamma GmbH",role:"Kupec",contact:"anna@example.de"}
     ].map(p=><div className="listRow" key={p.name}><b>{p.name}</b><span>{p.company}</span><span>{p.role}</span><span>{p.contact}</span></div>)}
  </article>}
  {view==="Napoved"&&<article className="crmCard"><div className="crmHead"><h3>Prodajna napoved · {subView}</h3></div><div style={{padding:14}}>
     <div className="crmMeta"><div><small>Pipeline</small><b>{pipelineValue.toLocaleString("sl-SI")} €</b></div><div><small>Utežena vrednost</small><b>{weighted.toLocaleString("sl-SI")} €</b></div></div>
     {deals.map(d=><div className="listRow" key={d.id}><b>{d.partner}</b><span>{d.name}</span><span>{d.prob} %</span><b>{(d.value*d.prob/100).toLocaleString("sl-SI")} €</b></div>)}
  </div></article>}

 </section>
}
