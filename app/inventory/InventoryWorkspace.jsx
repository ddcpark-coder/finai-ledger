"use client";
import {useMemo,useState} from "react";

const stock=[
 {sku:"PM-200",name:"Pogonski modul PM-200",wh:"Glavno",loc:"A-01-02",on:18,res:12,avail:6,incoming:12,min:10,status:"Nizka zaloga"},
 {sku:"KC-100",name:"Krmilnik KC-100",wh:"Glavno",loc:"B-02-01",on:42,res:20,avail:22,incoming:20,min:15,status:"OK"},
 {sku:"FOL-M2",name:"Samolepilna folija",wh:"Material",loc:"F-01",on:86.5,res:25,avail:61.5,incoming:40,min:30,status:"OK"},
 {sku:"TAB-10070",name:"Reklamna tabla 100 × 70 cm",wh:"Končni izdelki",loc:"K-03",on:12,res:10,avail:2,incoming:20,min:8,status:"Kritično"}
];

const moves=[
 ["03. 11. 12:44","PM-200","+12","Prevzem","PO-2026-0045"],
 ["03. 11. 11:18","TAB-10070","-10","Izdaja","DOB-2026-0048"],
 ["03. 11. 10:22","KC-100","+20","Prevzem","PO-2026-0042"],
 ["02. 11. 16:05","FOL-M2","-5","Prenos","Glavno → Material"]
];

export default function InventoryWorkspace(){
 const [query,setQuery]=useState("");
 const [warehouse,setWarehouse]=useState("Vsa skladišča");
 const [selected,setSelected]=useState(stock[0]);
 const [tab,setTab]=useState("Zaloga");
 const rows=useMemo(()=>stock.filter(x=>{
   const q=query.toLowerCase();
   return (!q||[x.sku,x.name,x.loc].join(" ").toLowerCase().includes(q))&&(warehouse==="Vsa skladišča"||x.wh===warehouse);
 }),[query,warehouse]);

 return <section className="inv">
 <style>{`
 .itabs{display:flex;gap:6px;margin-bottom:10px}.itabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 11px;font-size:9px}.itabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel))}
 .ikpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.ik{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:13px;padding:11px}.ik small,.ik b{display:block}.ik small{font-size:8px;color:var(--muted)}.ik b{font-size:17px;margin-top:4px}
 .igrid{display:grid;grid-template-columns:minmax(0,1.5fr) 360px;gap:10px}.icard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.ihead{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.ihead h3{margin:0;font-size:12px}.tools{display:flex;gap:7px;flex-wrap:wrap}.tools input,.tools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
 .irow{display:grid;grid-template-columns:.8fr 1.4fr .85fr .65fr .65fr .65fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.irow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.irow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.irow b{font-size:10px}.irow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.state{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--danger)}
 .detail{padding:14px}.detail h3{margin:8px 0 2px;font-size:16px}.detail>small{color:var(--muted);font-size:9px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.meta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.meta small,.meta b{display:block}.meta small{font-size:8px;color:var(--muted)}.meta b{font-size:10px;margin-top:3px}.sec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.sec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase}.line{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2))}
 .move{display:grid;grid-template-columns:.9fr .8fr .5fr .8fr 1fr;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);font-size:9px}.whgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.wh{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:12px}.wh h3{margin:0;font-size:12px}.wh small{display:block;color:var(--muted);font-size:8px;margin-top:4px}
 @media(max-width:1100px){.igrid{grid-template-columns:1fr}.whgrid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.ikpi{grid-template-columns:1fr 1fr}.irow{grid-template-columns:.8fr 1.3fr .65fr}.irow>*:nth-child(3),.irow>*:nth-child(5),.irow>*:nth-child(6){display:none}.meta{grid-template-columns:1fr}.whgrid{grid-template-columns:1fr}.move{grid-template-columns:1fr .6fr .7fr}.move>*:nth-child(4),.move>*:nth-child(5){display:none}}
 `}</style>

 <div className="ikpi"><div className="ik"><small>Vrednost zaloge</small><b>128.400 €</b></div><div className="ik"><small>Rezervirano</small><b>67 kos / enot</b></div><div className="ik"><small>Na poti</small><b>92 enot</b></div><div className="ik"><small>Opozorila</small><b>2</b></div></div>
 <div className="itabs"><button className={tab==="Zaloga"?"on":""} onClick={()=>setTab("Zaloga")}>Zaloga</button><button className={tab==="Premiki"?"on":""} onClick={()=>setTab("Premiki")}>Premiki</button><button className={tab==="Skladišča"?"on":""} onClick={()=>setTab("Skladišča")}>Skladišča</button><button className={tab==="Inventura"?"on":""} onClick={()=>setTab("Inventura")}>Inventura</button></div>

 {tab==="Zaloga"&&<div className="igrid">
  <article className="icard"><div className="ihead"><h3>Stanje zalog</h3><div className="tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči artikel, SKU, lokacijo ..."/><select value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option>Vsa skladišča</option><option>Glavno</option><option>Material</option><option>Končni izdelki</option></select><button className="primary">＋ Premik</button></div></div>
  <div className="irow head"><span>SKU</span><span>Artikel</span><span>Lokacija</span><span>Na zalogi</span><span>Rezervirano</span><span>Na voljo</span></div>
  {rows.map(x=><button className="irow" key={x.sku+x.loc} onClick={()=>setSelected(x)}><span><b>{x.sku}</b><small>{x.wh}</small></span><span><b>{x.name}</b><small className={x.status==="OK"?"ok":x.status==="Kritično"?"bad":"warn"}>{x.status}</small></span><span>{x.loc}</span><b>{x.on}</b><b>{x.res}</b><b>{x.avail}</b></button>)}
  </article>
  <aside className="icard detail"><span className={"state "+(selected.status==="OK"?"ok":selected.status==="Kritično"?"bad":"warn")}>{selected.status}</span><h3>{selected.name}</h3><small>{selected.sku} · {selected.wh} / {selected.loc}</small>
  <div className="meta"><div><small>Na zalogi</small><b>{selected.on}</b></div><div><small>Rezervirano</small><b>{selected.res}</b></div><div><small>Na voljo</small><b>{selected.avail}</b></div><div><small>Na poti</small><b>{selected.incoming}</b></div></div>
  <div className="sec"><h4>Minimalna zaloga</h4><div className="line"><span>Minimum</span><b>{selected.min}</b></div><div className="bar"><i style={{width:Math.min(100,(selected.avail/Math.max(selected.min,1))*100)+"%"}}/></div></div>
  <div className="sec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary">Rezerviraj za naročilo</button><button className="secondary">Prenos med lokacijami</button><button className="secondary">Evidentiraj popravek</button><button className="secondary">Zgodovina premikov</button></div></div></aside>
 </div>}

 {tab==="Premiki"&&<article className="icard"><div className="ihead"><h3>Zgodovina premikov</h3><button className="secondary">Izvozi</button></div>{moves.map((m,i)=><div className="move" key={i}><span>{m[0]}</span><b>{m[1]}</b><b className={m[2].startsWith("+")?"ok":"warn"}>{m[2]}</b><span>{m[3]}</span><span>{m[4]}</span></div>)}</article>}

 {tab==="Skladišča"&&<div className="whgrid"><article className="wh"><h3>Glavno skladišče</h3><small>Privzeti prevzem · 6 lokacij</small><div className="line"><span>Artikli</span><b>486</b></div><div className="line"><span>Vrednost</span><b>76.200 €</b></div></article><article className="wh"><h3>Material</h3><small>Surovine · 8 lokacij</small><div className="line"><span>Artikli</span><b>118</b></div><div className="line"><span>Vrednost</span><b>34.600 €</b></div></article><article className="wh"><h3>Končni izdelki</h3><small>Privzeta odprema · 4 lokacije</small><div className="line"><span>Artikli</span><b>92</b></div><div className="line"><span>Vrednost</span><b>17.600 €</b></div></article></div>}

 {tab==="Inventura"&&<article className="icard"><div className="ihead"><h3>Inventura · Glavno skladišče</h3><button className="primary">＋ Nova inventura</button></div><div style={{padding:12}}><div className="line"><span>INV-2026-003 · 31. 10. 2026</span><b className="ok">Zaključena · 2 popravka</b></div><div className="line"><span>INV-2026-002 · 30. 09. 2026</span><b className="ok">Zaključena · brez razlik</b></div><div className="line"><span>INV-2026-004 · priprava</span><b className="warn">Osnutek</b></div></div></article>}
 </section>
}
