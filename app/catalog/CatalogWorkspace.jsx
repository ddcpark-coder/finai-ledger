"use client";
import {useMemo,useState} from "react";

const products=[
 {sku:"TAB-10070",name:"Reklamna tabla 100 × 70 cm",type:"Artikel",category:"Table",unit:"kos",buy:32.5,sell:58,stock:"12 kos",margin:43.97,tax:"22 %",active:true},
 {sku:"FOL-M2",name:"Samolepilna folija",type:"Artikel",category:"Folije",unit:"m²",buy:4.2,sell:8.9,stock:"86,5 m²",margin:52.81,tax:"22 %",active:true},
 {sku:"OBL-GRAF",name:"Grafično oblikovanje",type:"Storitev",category:"Storitve",unit:"ura",buy:0,sell:45,stock:"—",margin:100,tax:"22 %",active:true},
 {sku:"MONTAZA",name:"Montaža na lokaciji",type:"Storitev",category:"Storitve",unit:"ura",buy:18,sell:42,stock:"—",margin:57.14,tax:"22 %",active:true}
];

const priceLists=[
 {name:"Standard 2026",scope:"Vsi kupci",currency:"EUR",valid:"01. 01.–31. 12. 2026",priority:100},
 {name:"B2B partnerji",scope:"Izbrani partnerji",currency:"EUR",valid:"01. 01.–31. 12. 2026",priority:50},
 {name:"Količinski rabati",scope:"Količinski pragovi",currency:"EUR",valid:"stalno",priority:75}
];

export default function CatalogWorkspace({context}){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(products[0]);
 const tab=({Katalog:"Katalog",Ceniki:"Ceniki",Dobavitelji:"Dobavitelji",Računovodstvo:"Računovodstvo",Zaloga:"Zaloga"})[context?.level2]??"Katalog";
 const subView=context?.level3??"Artikli";
 const filtered=useMemo(()=>products.filter(p=>{
   const q=query.toLowerCase();
   const type=subView==="Artikli"?"Artikel":subView==="Storitve"?"Storitev":null;
   return (!q||[p.sku,p.name,p.category].join(" ").toLowerCase().includes(q))&&(filter==="Vsi"||p.type===filter)&&(!type||p.type===type);
 }),[query,filter,subView]);

 return <section className="catalogWorkspace">
  <style>{`
  .catalogWorkspace{margin-top:10px}.catalogTabs{display:flex;gap:6px;margin-bottom:10px}.catalogTabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:8px 11px;font-size:9px}.catalogTabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel))}
  .catalogGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}.catalogCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.catalogHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.catalogHead h3{margin:0;font-size:12px}.catalogTools{display:flex;gap:7px;flex-wrap:wrap}.catalogTools input,.catalogTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
  .catalogRow{display:grid;grid-template-columns:.8fr 1.45fr .7fr .75fr .75fr .7fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.catalogRow.head{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel)}.catalogRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.catalogRow b{font-size:10px}.catalogRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.money{text-align:right;font-variant-numeric:tabular-nums}.typeChip{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px;color:var(--accent)}
  .catalogDetail{padding:14px}.catalogDetail h3{margin:8px 0 2px;font-size:16px}.catalogDetail>small{color:var(--muted);font-size:9px}.catalogMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.catalogMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.catalogMeta small,.catalogMeta b{display:block}.catalogMeta small{font-size:8px;color:var(--muted)}.catalogMeta b{font-size:10px;margin-top:3px}.catalogSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.catalogSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.priceBox{border:1px solid color-mix(in srgb,var(--accent) 40%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent) 5%,var(--panel))}.priceBox b,.priceBox small{display:block}.priceBox small{font-size:8px;color:var(--muted);margin-top:3px}.listLine{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.listLine span{color:var(--muted)}
  .priceListGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.priceList{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:14px;padding:12px}.priceList h3{margin:0;font-size:13px}.priceList small{display:block;color:var(--muted);font-size:8px;margin-top:4px}.priceList .meta{margin-top:10px;display:grid;gap:5px}.priceList .meta div{display:flex;justify-content:space-between;font-size:9px}
  @media(max-width:1100px){.catalogGrid{grid-template-columns:1fr}.priceListGrid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.catalogRow{grid-template-columns:.9fr 1.4fr .8fr}.catalogRow>*:nth-child(3),.catalogRow>*:nth-child(4),.catalogRow>*:nth-child(6){display:none}.catalogMeta{grid-template-columns:1fr}.catalogTools input{width:100%}.priceListGrid{grid-template-columns:1fr}}
  `}</style>



  {tab==="Katalog"&&subView!=="Kategorije"&&<div className="catalogGrid">
   <article className="catalogCard">
    <div className="catalogHead"><h3>Katalog · {subView}</h3><div className="catalogTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči SKU, naziv ali kategorijo ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Artikel</option><option>Storitev</option></select><button className="primary">＋ Nov artikel / storitev</button></div></div>
    <div className="catalogRow head"><span>SKU</span><span>Naziv</span><span>Tip</span><span>Nabavna</span><span>Prodajna</span><span>Marža</span></div>
    {filtered.map(p=><button className="catalogRow" key={p.sku} onClick={()=>setSelected(p)}><span><b>{p.sku}</b><small>{p.category}</small></span><span><b>{p.name}</b><small>{p.unit} · DDV {p.tax}</small></span><span className="typeChip">{p.type}</span><b className="money">{p.buy.toFixed(2)} €</b><b className="money">{p.sell.toFixed(2)} €</b><span><b>{p.margin.toFixed(2)} %</b></span></button>)}
   </article>

   <aside className="catalogCard catalogDetail">
    <span className="typeChip">{selected.type}</span><h3>{selected.name}</h3><small>{selected.sku} · {selected.category}</small>
    <div className="catalogMeta"><div><small>Prodajna cena</small><b>{selected.sell.toFixed(2)} €</b></div><div><small>Nabavna cena</small><b>{selected.buy.toFixed(2)} €</b></div><div><small>Bruto marža</small><b>{selected.margin.toFixed(2)} %</b></div><div><small>Enota</small><b>{selected.unit}</b></div></div>
    <div className="catalogSec"><h4>Cena za partnerja</h4><div className="priceBox"><b>{(selected.sell*0.92).toFixed(2)} € · B2B cenik</b><small>8 % rabat · partnerjev cenik ima višjo prioriteto od standardnega.</small></div></div>
    <div className="catalogSec"><h4>Zaloga</h4><div className="listLine"><span>Trenutno</span><b>{selected.stock}</b></div><div className="listLine"><span>Minimalna zaloga</span><b>{selected.type==="Artikel"?"10":"—"}</b></div></div>
    <div className="catalogSec"><h4>Računovodske povezave</h4><div className="listLine"><span>DDV</span><b>{selected.tax}</b></div><div className="listLine"><span>Prihodkovni konto</span><b>7600</b></div><div className="listLine"><span>Stroškovni konto</span><b>4100</b></div></div>
    <div className="catalogSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary">Uredi artikel</button><button className="secondary">Dodaj v ponudbo</button><button className="secondary">Preglej cenovno zgodovino</button></div></div>
   </aside>
  </div>}

  {tab==="Ceniki"&&<div className="priceListGrid">{priceLists.filter(p=>subView==="Standardni"?p.name.startsWith("Standard"):subView==="B2B"?p.name.startsWith("B2B"):subView==="Količinski"?p.name.startsWith("Količinski"):true).map(p=><article className="priceList" key={p.name}><h3>{p.name}</h3><small>{p.scope}</small><div className="meta"><div><span>Valuta</span><b>{p.currency}</b></div><div><span>Veljavnost</span><b>{p.valid}</b></div><div><span>Prioriteta</span><b>{p.priority}</b></div></div><button className="secondary" style={{width:"100%",marginTop:10}}>Odpri cenik</button></article>)}</div>}

  {tab==="Dobavitelji"&&<article className="catalogCard"><div className="catalogHead"><h3>Dobavitelji po artiklih</h3><button className="primary">＋ Poveži dobavitelja</button></div><div style={{padding:12}}><div className="listLine"><span>Reklamna tabla 100 × 70 cm · MaterialPartner d.o.o.</span><b>32,50 € · 3 dni</b></div><div className="listLine"><span>Samolepilna folija · FolijePlus d.o.o.</span><b>4,20 € · 2 dni</b></div><div className="listLine"><span>Montažni material · GradnjaTrade d.o.o.</span><b>18,70 € · 5 dni</b></div></div></article>}
  {tab==="Katalog"&&subView==="Kategorije"&&<article className="catalogCard"><div className="catalogHead"><h3>Kategorije artiklov in storitev</h3></div><div style={{padding:12}}>{[...new Set(products.map(p=>p.category))].map(cat=><div key={cat} className="listLine"><span>{cat}</span><b>{products.filter(p=>p.category===cat).length} zapisov</b></div>)}</div></article>}
  {tab==="Računovodstvo"&&<article className="catalogCard"><div className="catalogHead"><h3>Računovodske povezave · {subView}</h3></div><div style={{padding:12}}>{products.map(p=><div key={p.sku} className="listLine"><span>{p.name}</span><b>{subView==="DDV"?p.tax:subView==="Konti"?"7600 / 4100":"Standardno"}</b></div>)}</div></article>}
  {tab==="Zaloga"&&<article className="catalogCard"><div className="catalogHead"><h3>Katalog · {subView}</h3></div><div style={{padding:12}}>{products.filter(p=>p.type==="Artikel").map(p=><div key={p.sku} className="listLine"><span>{p.name}</span><b>{subView==="Minimumi"?"Minimalna zaloga: 10":subView==="Gibanje"?"Pregled premikov v modulu Zaloge":p.stock}</b></div>)}</div></article>}

 </section>
}
