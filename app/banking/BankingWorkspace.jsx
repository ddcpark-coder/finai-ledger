"use client";
import {useMemo,useState} from "react";

const txs=[
 {id:"TX-8841",date:"02. 11. 2026",party:"ABC d.o.o.",ref:"SI00 2026-0054",amount:"+1.220,00 €",raw:1220,status:"Predlagano",confidence:100,item:"2026-0054",open:"1.220,00 €"},
 {id:"TX-8840",date:"02. 11. 2026",party:"Petrol d.d.",ref:"SI00 P-2026-88021",amount:"-320,00 €",raw:-320,status:"Predlagano",confidence:96,item:"P-2026-88021",open:"320,00 €"},
 {id:"TX-8839",date:"01. 11. 2026",party:"Gamma d.o.o.",ref:"DELNO 2026-0053",amount:"+1.000,00 €",raw:1000,status:"Delno",confidence:92,item:"2026-0053",open:"2.440,00 €"},
 {id:"TX-8838",date:"01. 11. 2026",party:"Neznan priliv",ref:"BREZ SKLICA",amount:"+480,00 €",raw:480,status:"Neusklajeno",confidence:42,item:"—",open:"—"}
];

export default function BankingWorkspace({context}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Računi";
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selected,setSelected]=useState(txs[0]);
 const [matched,setMatched]=useState({});
 const [batch,setBatch]=useState(false);
 const list=useMemo(()=>txs.filter(x=>{
   const q=query.toLowerCase();
   const ok=!q||[x.party,x.ref,x.id,x.item].join(" ").toLowerCase().includes(q);
   const contextMatch=section==="Transakcije"?(subView==="Prilivi"?x.raw>0:subView==="Odlivi"?x.raw<0:true)
     :section==="Usklajevanje"?(subView==="Predlogi"?x.status==="Predlagano":subView==="Delno"?x.status==="Delno":x.status==="Neusklajeno")
     :section==="SEPA"?x.raw<0:true;
   return ok&&(filter==="Vsi"||x.status===filter)&&contextMatch;
 }),[query,filter,section,subView]);
 const isMatched=matched[selected.id];

 return <section className="bankWorkspace">
   <style>{`
   .bankWorkspace{margin-top:10px}.bankGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}
   .bankCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .bankHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.bankHead h3{margin:0;font-size:12px}
   .bankTools{display:flex;gap:7px;flex-wrap:wrap}.bankTools input,.bankTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .accountStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:12px}.accountStrip div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.accountStrip small,.accountStrip b{display:block}.accountStrip small{font-size:8px;color:var(--muted)}.accountStrip b{font-size:12px;margin-top:3px;font-variant-numeric:tabular-nums}
   .bankRow{display:grid;grid-template-columns:.8fr 1.3fr 1.05fr .8fr .75fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}
   .bankRow.head{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.bankRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}
   .bankRow b{font-size:10px}.bankRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.bankAmt{text-align:right;font-variant-numeric:tabular-nums}
   .matchState{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.matchState.good{color:var(--ok)}.matchState.warn{color:var(--warn)}.matchState.info{color:var(--accent2)}.matchState.bad{color:var(--danger)}
   .bankDetail{padding:14px}.bankDetail h3{margin:8px 0 2px;font-size:16px}.bankDetail>small{color:var(--muted);font-size:9px}.bankMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
   .bankMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.bankMeta small,.bankMeta b{display:block}.bankMeta small{font-size:8px;color:var(--muted)}.bankMeta b{font-size:10px;margin-top:3px}
   .bankSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.bankSec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .matchBox{border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent) 5%,var(--panel))}.matchBox b,.matchBox small{display:block}.matchBox small{font-size:8px;color:var(--muted);margin-top:3px}.score{display:flex;align-items:center;gap:8px;margin-top:8px}.scoreBar{height:6px;flex:1;background:var(--line);border-radius:99px;overflow:hidden}.scoreBar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:inherit}
   .sepaBox{margin:12px;border:1px solid color-mix(in srgb,var(--violet) 45%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--violet) 5%,var(--panel));display:flex;align-items:center;justify-content:space-between;gap:10px}.sepaBox b,.sepaBox small{display:block}.sepaBox small{font-size:8px;color:var(--muted);margin-top:3px}
   @media(max-width:1100px){.bankGrid{grid-template-columns:1fr}}@media(max-width:760px){.accountStrip{grid-template-columns:1fr 1fr}.bankRow{grid-template-columns:.9fr 1.2fr .8fr}.bankRow>*:nth-child(3),.bankRow>*:nth-child(5){display:none}.bankMeta{grid-template-columns:1fr}.bankTools input{width:100%}}
   `}</style>

   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Aktivno: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · demonstracijski bančni podatki</div>
   <div className="bankGrid">
     <article className="bankCard">
       <div className="bankHead"><h3>Banka · {section} / {subView}</h3><div className="bankTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči transakcijo, partnerja, sklic ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>Predlagano</option><option>Delno</option><option>Neusklajeno</option></select><button className="primary">＋ Uvozi izpisek</button></div></div>
       <div className="accountStrip"><div><small>Stanje</small><b>12.450,80 €</b></div><div><small>Prilivi danes</small><b>1.700,00 €</b></div><div><small>Odlivi danes</small><b>320,00 €</b></div><div><small>Neusklajeno</small><b>480,00 €</b></div></div>
       <div className="sepaBox"><div><b>SEPA paket · 3 plačila</b><small>2.980,00 € · osnutek pain.001</small></div><button className="secondary" onClick={()=>setBatch(v=>!v)}>{batch?"Paket pripravljen":"Pripravi SEPA"}</button></div>
       <div className="bankRow head"><span>Datum</span><span>Partner / sklic</span><span>Odprta postavka</span><span>Znesek</span><span>Status</span></div>
       {!list.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>Ni transakcij za izbrani pogled.</p>}
       {list.map(x=><button className="bankRow" key={x.id} onClick={()=>setSelected(x)}>
         <span><b>{x.date}</b><small>{x.id}</small></span>
         <span><b>{x.party}</b><small>{x.ref}</small></span>
         <span><b>{x.item}</b><small>{x.open}</small></span>
         <b className="bankAmt">{x.amount}</b>
         <span className={"matchState "+(matched[x.id]?"good":x.status==="Predlagano"?"info":x.status==="Delno"?"warn":"bad")}>{matched[x.id]?"Usklajeno":x.status}</span>
       </button>)}
     </article>

     <aside className="bankCard bankDetail">
       <span className={"matchState "+(isMatched?"good":selected.confidence>=95?"info":selected.confidence>=70?"warn":"bad")}>{isMatched?"Usklajeno":selected.status}</span>
       <h3>{selected.party}</h3><small>{selected.ref} · {selected.id}</small>
       <div className="bankMeta"><div><small>Znesek</small><b>{selected.amount}</b></div><div><small>Datum</small><b>{selected.date}</b></div><div><small>Valuta</small><b>EUR</b></div><div><small>Smer</small><b>{selected.raw>0?"Priliv":"Odliv"}</b></div></div>

       <div className="bankSec"><h4>Predlog ujemanja</h4>
         <div className="matchBox"><b>{selected.item==="—"?"Ni zanesljivega predloga":"Odprta postavka "+selected.item}</b><small>{selected.item==="—"?"Sklic in partner nista dovolj zanesljiva.":"Znesek, valuta in sklic so primerjani z odprtimi postavkami."}</small><div className="score"><div className="scoreBar"><i style={{width:selected.confidence+"%"}}/></div><b>{selected.confidence} %</b></div></div>
       </div>

       <div className="bankSec"><h4>Delno plačilo</h4><div className="bankMeta"><div><small>Transakcija</small><b>{selected.amount.replace("+","").replace("-","")}</b></div><div><small>Odprto na postavki</small><b>{selected.open}</b></div></div></div>

       <div className="bankSec"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         <button className="primary" disabled={selected.item==="—"||isMatched} onClick={()=>setMatched(x=>({...x,[selected.id]:true}))}>{isMatched?"Usklajeno":"Potrdi ujemanje"}</button>
         <button className="secondary">Razdeli plačilo</button>
         <button className="secondary">Izberi drugo odprto postavko</button>
         <button className="secondary">Prikaži bančno temeljnico</button>
       </div></div>
     </aside>
   </div>
 </section>
}
