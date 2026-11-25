"use client";
import {useMemo,useState} from "react";
import SharedDemoBusinessPulse from "../next11/SharedDemoBusinessPulse";
import {reserveDemoStock,transferDemoStock,adjustDemoStock} from "./demoInventoryActions.mjs";
import {demoRowsToCsv} from "../lib/demoUiActions.mjs";

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

export default function InventoryWorkspace({context,companyId=1}){
 const [query,setQuery]=useState("");
 const [warehouse,setWarehouse]=useState("Vsa skladišča");
 const [records,setRecords]=useState(()=>stock.map(row=>({...row,companyId})));
 const [selectedKey,setSelectedKey]=useState(stock[0].sku+"|"+stock[0].wh+"|"+stock[0].loc);
 const selected=records.find(row=>[row.sku,row.wh,row.loc].join("|")===selectedKey)??records[0];
 const [movementRows,setMovementRows]=useState(moves);
 const [action,setAction]=useState("");
 const [quantity,setQuantity]=useState("1");
 const [targetWarehouse,setTargetWarehouse]=useState("Material");
 const [notice,setNotice]=useState("");
 const [historyOpen,setHistoryOpen]=useState(false);
 const [inventories,setInventories]=useState([
   {number:"INV-2026-003",date:"31. 10. 2026",status:"Zaključene",description:"Zaključena · 2 popravka"},
   {number:"INV-2026-002",date:"30. 09. 2026",status:"Zaključene",description:"Zaključena · brez razlik"},
   {number:"INV-2026-004",date:"03. 11. 2026",status:"Osnutki",description:"Osnutek"}
 ]);
 const recordMove=(sku,amount,type,detail)=>setMovementRows(rows=>[
   [new Date().toLocaleString("sl-SI"),sku,amount,type,detail],...rows
 ]);
 const runAction=(event)=>{
   event.preventDefault();
   try{
     const current=selected,qty=Number(quantity);
     const updated=action==="reserve"?reserveDemoStock(records,companyId,current,qty):
       action==="transfer"?transferDemoStock(records,companyId,current,targetWarehouse,qty):
       adjustDemoStock(records,companyId,current,qty);
     setRecords(updated);
     if(action==="reserve"){
       recordMove(current.sku,"+"+qty,"Rezervacija","Demo rezervacija za naročilo");
       setNotice("Sintetična rezervacija "+qty+" enot ustvarjena. Zaloga na voljo je posodobljena.");
     }else if(action==="transfer"){
       recordMove(current.sku,"-"+qty,"Prenos",current.wh+" → "+targetWarehouse);
       setNotice("Prenos "+qty+" enot je simuliran med skladiščema. Dejanski premik ni bil izveden.");
     }else{
       recordMove(current.sku,(qty>0?"+":"")+qty,"Popravek","Demo sprememba zaloge");
       setNotice("Demo stanje zaloge popravljeno za "+qty+" enot. Knjižba ni ustvarjena.");
     }
     setAction("");setQuantity("1");
   }catch(error){setNotice(error.message);}
 };
 const exportMoves=()=>{
   const csv=demoRowsToCsv(["Čas","SKU","Količina","Vrsta","Opis"],movementRows);
   const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
   const link=document.createElement("a");link.href=url;
   link.download="finai-demo-premiki-podjetje-"+companyId+".csv";
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const tab=({Stanje:"Zaloga",Premiki:"Premiki",Rezervacije:"Rezervacije",Skladišča:"Skladišča",Inventura:"Inventura",Opozorila:"Opozorila"})[context?.level2]??"Zaloga";
 const subView=context?.level3??"Vsa skladišča";
 const rows=useMemo(()=>records.filter(x=>{
   const q=query.toLowerCase();
   return (!q||[x.sku,x.name,x.loc].join(" ").toLowerCase().includes(q))&&(warehouse==="Vsa skladišča"||x.wh===warehouse)
     &&(subView!=="Na poti"||x.incoming>0);
 }),[query,warehouse,subView,records]);

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

 <SharedDemoBusinessPulse companyId={companyId} mode="stock"/>
 <p style={{fontSize:10,color:"var(--muted)"}}>Podjetje {companyId} · samo sintetični skladiščni podatki. Spremembe veljajo do osvežitve te demo seje.</p>
 {notice&&<p role="status" style={{padding:10,border:"1px solid var(--line)",borderRadius:9,fontSize:11}}>{notice}</p>}
 {action&&<form onSubmit={runAction} style={{display:"flex",alignItems:"end",gap:9,flexWrap:"wrap",padding:12,marginBottom:10,border:"1px solid var(--line)",borderRadius:12}}>
   <b style={{fontSize:11}}>{action==="reserve"?"Rezervacija":action==="transfer"?"Prenos":"Popravek"} · {selected.sku}</b>
   <label style={{display:"grid",gap:4,fontSize:10}}>Količina {action==="adjust"?"(+/-)":""}
     <input required type="number" step="0.001" min={action==="adjust"?"-100000":"0.001"} max="100000" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{width:110,padding:8,background:"var(--panel)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:8}}/>
   </label>
   {action==="transfer"&&<label style={{display:"grid",gap:4,fontSize:10}}>Ciljno skladišče
     <select value={targetWarehouse} onChange={e=>setTargetWarehouse(e.target.value)} style={{padding:8,background:"var(--panel)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:8}}>
       {["Glavno","Material","Končni izdelki"].filter(x=>x!==selected.wh).map(x=><option key={x}>{x}</option>)}
     </select>
   </label>}
   <button className="primary" type="submit">Potrdi samo v demo</button>
   <button className="secondary" type="button" onClick={()=>setAction("")}>Prekliči</button>
 </form>}
 <div className="ikpi"><div className="ik"><small>Vrednost zaloge · prikazna ocena</small><b>128.400 €</b></div>
   <div className="ik"><small>Rezervirano</small><b>{records.reduce((sum,x)=>sum+x.res,0)} enot</b></div>
   <div className="ik"><small>Na poti</small><b>{records.reduce((sum,x)=>sum+x.incoming,0)} enot</b></div>
   <div className="ik"><small>Opozorila</small><b>{records.filter(x=>x.avail<x.min).length}</b></div></div>


 {tab==="Zaloga"&&<div className="igrid">
  <article className="icard"><div className="ihead"><h3>{subView==="Na poti"?"Zaloga na poti":subView==="Po lokacijah"?"Zaloga po lokacijah":"Stanje zalog"}</h3><div className="tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči artikel, SKU, lokacijo ..."/><select value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option>Vsa skladišča</option><option>Glavno</option><option>Material</option><option>Končni izdelki</option></select><button type="button" className="primary" onClick={()=>{setAction("transfer");setQuantity("1");setTargetWarehouse(selected.wh==="Material"?"Glavno":"Material");}}>＋ Demo premik</button></div></div>
  <div className="irow head"><span>SKU</span><span>Artikel</span><span>Lokacija</span><span>Na zalogi</span><span>Rezervirano</span><span>Na voljo</span></div>
  {rows.map(x=><button className="irow" key={x.sku+x.loc} onClick={()=>{setSelectedKey([x.sku,x.wh,x.loc].join("|"));setHistoryOpen(false);}}><span><b>{x.sku}</b><small>{x.wh}</small></span><span><b>{x.name}</b><small className={x.status==="OK"?"ok":x.status==="Kritično"?"bad":"warn"}>{x.status}</small></span><span>{x.loc}</span><b>{x.on}</b><b>{x.res}</b><b>{x.avail}</b></button>)}
  </article>
  <aside className="icard detail"><span className={"state "+(selected.status==="OK"?"ok":selected.status==="Kritično"?"bad":"warn")}>{selected.status}</span><h3>{selected.name}</h3><small>{selected.sku} · {selected.wh} / {selected.loc}</small>
  <div className="meta"><div><small>Na zalogi</small><b>{selected.on}</b></div><div><small>Rezervirano</small><b>{selected.res}</b></div><div><small>Na voljo</small><b>{selected.avail}</b></div><div><small>Na poti</small><b>{selected.incoming}</b></div></div>
  <div className="sec"><h4>Minimalna zaloga</h4><div className="line"><span>Minimum</span><b>{selected.min}</b></div><div className="bar"><i style={{width:Math.min(100,(selected.avail/Math.max(selected.min,1))*100)+"%"}}/></div></div>
  <div className="sec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
     <button type="button" className="primary" disabled={selected.avail<=0} onClick={()=>{setAction("reserve");setQuantity("1");}}>Rezerviraj v demo</button>
     <button type="button" className="secondary" disabled={selected.avail<=0} onClick={()=>{setAction("transfer");setQuantity("1");setTargetWarehouse(selected.wh==="Material"?"Glavno":"Material");}}>Prenos med skladišči (demo)</button>
     <button type="button" className="secondary" onClick={()=>{setAction("adjust");setQuantity("1");}}>Evidentiraj demo popravek</button>
     <button type="button" className="secondary" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(v=>!v)}>Zgodovina demo premikov</button>
   </div>{historyOpen&&<div role="status" style={{marginTop:9,fontSize:10}}>
     {movementRows.filter(x=>x[1]===selected.sku).map((x,i)=><div className="line" key={i}><span>{x[3]} · {x[0]}</span><b>{x[2]}</b></div>)}
   </div>}</div></aside>
 </div>}

 {tab==="Premiki"&&<article className="icard"><div className="ihead"><h3>Zgodovina premikov</h3><button type="button" className="secondary" onClick={exportMoves}>Izvozi demo CSV</button></div>{movementRows.filter(m=>subView==="Prevzemi"?m[3]==="Prevzem":subView==="Izdaje"?m[3]==="Izdaja":subView==="Prenosi"?m[3]==="Prenos":true).map((m,i)=><div className="move" key={i}><span>{m[0]}</span><b>{m[1]}</b><b className={m[2].startsWith("+")?"ok":"warn"}>{m[2]}</b><span>{m[3]}</span><span>{m[4]}</span></div>)}</article>}

 {tab==="Skladišča"&&subView==="Lokacije"&&<article className="icard"><div className="ihead"><h3>Lokacije skladišč</h3></div>{records.map(x=><div key={x.sku+x.wh+x.loc} className="move"><span>{x.wh}</span><b>{x.loc}</b><span>{x.sku}</span><span>Na voljo</span><b>{x.avail}</b></div>)}</article>}
 {tab==="Skladišča"&&subView==="Nastavitve"&&<article className="icard" style={{padding:14}}><h3>Nastavitve skladišč</h3><p>Privzeto prevzemno in odpremno skladišče ter pravila lokacijskega vodenja so pripravljeni v podatkovnem modelu. Urejanje nastavitev bo na voljo po priklopu zalednih obrazcev.</p></article>}
 {tab==="Skladišča"&&subView!=="Lokacije"&&subView!=="Nastavitve"&&<div className="whgrid"><article className="wh"><h3>Glavno skladišče</h3><small>Privzeti prevzem · 6 lokacij</small><div className="line"><span>Artikli</span><b>486</b></div><div className="line"><span>Vrednost</span><b>76.200 €</b></div></article><article className="wh"><h3>Material</h3><small>Surovine · 8 lokacij</small><div className="line"><span>Artikli</span><b>118</b></div><div className="line"><span>Vrednost</span><b>34.600 €</b></div></article><article className="wh"><h3>Končni izdelki</h3><small>Privzeta odprema · 4 lokacije</small><div className="line"><span>Artikli</span><b>92</b></div><div className="line"><span>Vrednost</span><b>17.600 €</b></div></article></div>}

 {tab==="Inventura"&&<article className="icard"><div className="ihead"><h3>Inventura · {subView}</h3><button type="button" className="primary" onClick={()=>{
   const item={number:"INV-SYN-"+companyId+"-"+String(inventories.length+1).padStart(3,"0"),
     date:new Date().toLocaleDateString("sl-SI"),status:"Osnutki",description:"Demo osnutek · brez knjižbe"};
   setInventories(old=>[item,...old]);setNotice("Demo inventura "+item.number+" dodana samo v trenutni seji.");
 }}>＋ Nova demo inventura</button></div><div style={{padding:12}}>{inventories.filter(x=>x.status===subView||subView==="V teku"&&x.status==="V teku").map(x=><div className="line" key={x.number}><span>{x.number} · {x.date}</span><b>{x.description}</b></div>)}</div></article>}
 {tab==="Rezervacije"&&<article className="icard"><div className="ihead"><h3>Rezervacije · {subView}</h3></div><div style={{padding:12}}>{records.filter(x=>x.res>0&&(subView!=="Pomanjkanje"||x.avail<x.min)&&(subView!=="Sproščene")).map(x=><div key={x.sku} className="line"><span>{x.name} · {x.wh}</span><b>{x.res} rezervirano</b></div>)}{subView==="Sproščene"&&<p>Trenutno ni evidentiranih sproščenih rezervacij v demonstracijskem naboru.</p>}</div></article>}
 {tab==="Opozorila"&&<article className="icard"><div className="ihead"><h3>Opozorila · {subView}</h3></div><div style={{padding:12}}>{subView==="Minimum"?records.filter(x=>x.avail<x.min).map(x=><div key={x.sku} className="line"><span>{x.name}</span><b className="warn">Na voljo {x.avail} / minimum {x.min}</b></div>):<p>V demonstracijskih podatkih za ta pregled ni odprtih opozoril.</p>}</div></article>}
 </section>
}
