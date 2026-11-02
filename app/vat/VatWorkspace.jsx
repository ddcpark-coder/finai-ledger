"use client";
import {useMemo,useState} from "react";

const rows=[
 {id:"VAT-001",doc:"PR-2026-0188",partner:"Merkur d.o.o.",dir:"Vstopni",base:"1.016,39 €",tax:"223,61 €",deduct:"223,61 €",country:"SI",tag:"DDV-O"},
 {id:"VAT-002",doc:"IR-2026-0054",partner:"ABC d.o.o.",dir:"Izhodni",base:"1.000,00 €",tax:"220,00 €",deduct:"—",country:"SI",tag:"DDV-O"},
 {id:"VAT-003",doc:"IR-2026-0053",partner:"Gamma GmbH",dir:"Izhodni",base:"2.000,00 €",tax:"0,00 €",deduct:"—",country:"DE",tag:"RP-O"},
 {id:"VAT-004",doc:"PR-2026-0187",partner:"Petrol d.d.",dir:"Vstopni",base:"262,30 €",tax:"57,70 €",deduct:"57,70 €",country:"SI",tag:"DDV-O"}
];

export default function VatWorkspace(){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [approved,setApproved]=useState(false);
 const [controls,setControls]=useState([
   {sev:"warning",title:"DDV oznaka brez poročevalnega mappinga",text:"1 oznaka zahteva pregled konfiguracije."},
   {sev:"ok",title:"RP-O brez negativnih zneskov",text:"Kontrola uspešna."},
   {sev:"ok",title:"VAT ID pri EU transakcijah",text:"Vsi potrebni VAT ID so prisotni."}
 ]);
 const filtered=useMemo(()=>rows.filter(r=>{
   const q=query.toLowerCase();
   return (!q||[r.doc,r.partner,r.tag].join(" ").toLowerCase().includes(q))&&(filter==="Vsi"||r.dir===filter);
 }),[query,filter]);

 return <section className="vatWorkspace">
   <style>{`
   .vatWorkspace{margin-top:10px}.vatTop{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
   .vatKpi{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:13px;padding:11px}.vatKpi small,.vatKpi b{display:block}.vatKpi small{font-size:8px;color:var(--muted)}.vatKpi b{font-size:17px;margin-top:4px;font-variant-numeric:tabular-nums}
   .vatGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}.vatCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .vatHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.vatHead h3{margin:0;font-size:12px}.vatTools{display:flex;gap:7px;flex-wrap:wrap}.vatTools input,.vatTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .vatRow{display:grid;grid-template-columns:1fr 1.2fr .8fr .8fr .8fr .65fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);font-size:9px}.vatRow.head{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.vatRow b{font-size:9px}.money{text-align:right;font-variant-numeric:tabular-nums}
   .tag{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px;color:var(--accent)}.control{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2);margin-bottom:7px}.control b,.control small{display:block}.control b{font-size:9px}.control small{font-size:8px;color:var(--muted);margin-top:3px}.control.warning{border-color:color-mix(in srgb,var(--warn) 45%,var(--line))}.control.warning b{color:var(--warn)}.control.ok{border-color:color-mix(in srgb,var(--ok) 35%,var(--line))}.control.ok b{color:var(--ok)}
   .returnBox{padding:14px}.returnBox h3{margin:0;font-size:15px}.returnBox>small{color:var(--muted);font-size:9px}.returnMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.returnMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.returnMeta small,.returnMeta b{display:block}.returnMeta small{font-size:8px;color:var(--muted)}.returnMeta b{font-size:10px;margin-top:3px}.vatSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.vatSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .calcLine{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.calcLine span{color:var(--muted)}.calcLine strong{font-variant-numeric:tabular-nums}.flow10{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:10px}.flow10 div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.flow10 .on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
   @media(max-width:1100px){.vatGrid{grid-template-columns:1fr}.vatTop{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.vatRow{grid-template-columns:1fr .9fr .7fr}.vatRow>*:nth-child(2),.vatRow>*:nth-child(4),.vatRow>*:nth-child(5){display:none}.returnMeta{grid-template-columns:1fr}.vatTools input{width:100%}}
   `}</style>

   <div className="vatTop">
     <div className="vatKpi"><small>Izhodni DDV</small><b>14.900,00 €</b></div>
     <div className="vatKpi"><small>Odbitni DDV</small><b>12.450,00 €</b></div>
     <div className="vatKpi"><small>Obveznost</small><b>2.450,00 €</b></div>
     <div className="vatKpi"><small>Rok</small><b>20. 12. 2026</b></div>
   </div>

   <div className="flow10"><div className="on">Evidence</div><div className="on">Kontrole</div><div className={approved?"on":""}>Odobritev</div><div>Oddaja eDavki</div></div>

   <div className="vatGrid">
     <article className="vatCard">
       <div className="vatHead"><h3>DDV evidence · 11/2026</h3><div className="vatTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči dokument ali partnerja ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Vstopni</option><option>Izhodni</option></select><button className="secondary" onClick={()=>setControls(x=>x)}>Zaženi kontrole</button></div></div>
       <div className="vatRow head"><span>Dokument</span><span>Partner</span><span>Smer</span><span>Osnova</span><span>DDV</span><span>Poročilo</span></div>
       {filtered.map(r=><div className="vatRow" key={r.id}><span><b>{r.doc}</b><small style={{display:"block",color:"var(--muted)",fontSize:8}}>{r.id}</small></span><span>{r.partner}</span><span>{r.dir}</span><b className="money">{r.base}</b><b className="money">{r.tax}</b><span className="tag">{r.tag}</span></div>)}
     </article>

     <aside className="vatCard returnBox">
       <span className="tag">{approved?"Odobreno":"Osnutek"}</span>
       <h3 style={{marginTop:9}}>DDV-O · 11/2026</h3><small>Interni izračun · verzija 1</small>
       <div className="returnMeta"><div><small>Obdobje</small><b>01.–30. 11. 2026</b></div><div><small>Rok oddaje</small><b>20. 12. 2026</b></div><div><small>RP-O</small><b>Potrebno</b></div><div><small>Status</small><b>{approved?"Odobreno":"V pripravi"}</b></div></div>

       <div className="vatSec"><h4>Izračun</h4>
         <div className="calcLine"><span>Izhodni DDV</span><strong>14.900,00 €</strong></div>
         <div className="calcLine"><span>Odbitni DDV</span><strong>12.450,00 €</strong></div>
         <div className="calcLine"><span>Obveznost</span><strong>2.450,00 €</strong></div>
       </div>

       <div className="vatSec"><h4>Kontrole</h4>{controls.map((c,i)=><div className={"control "+c.sev} key={i}><b>{c.sev==="ok"?"✓ ":"⚠ "}{c.title}</b><small>{c.text}</small></div>)}</div>

       <div className="vatSec"><h4>RP-O / VIES</h4><div className="calcLine"><span>EU partnerji</span><strong>1</strong></div><div className="calcLine"><span>Vrednost</span><strong>2.000,00 €</strong></div><button className="secondary" style={{width:"100%",marginTop:8}}>Preglej rekapitulacijo</button></div>

       <div className="vatSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}><button className="primary" disabled={approved} onClick={()=>setApproved(true)}>{approved?"Odobreno":"Odobri DDV obračun"}</button><button className="secondary">Generiraj XML osnutek</button><button className="secondary">Prikaži audit sled</button></div></div>
     </aside>
   </div>
 </section>
}
