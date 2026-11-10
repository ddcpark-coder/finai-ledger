"use client";
import {useEffect,useMemo,useState} from "react";
import {euro} from "../issued/demoInvoice.mjs";
import CashflowScenarioPanel from "./CashflowScenarioPanel";
import {confirmBankMatch,resetCompanyBankMatches,suggestBankMatches} from "./bankMatching.mjs";

const txs=[
 {id:"TX-8841",companyId:1,date:"02. 11. 2026",party:"ABC d.o.o.",reference:"SI00 2026-0054",amountCents:122000,currency:"EUR",status:"Predlagano"},
 {id:"TX-8840",companyId:1,date:"02. 11. 2026",party:"Petrol d.d.",reference:"SI00 P-2026-88021",amountCents:-32000,currency:"EUR",status:"Predlagano"},
 {id:"TX-8839",companyId:1,date:"01. 11. 2026",party:"Gamma d.o.o.",reference:"DELNO 2026-0053",amountCents:100000,currency:"EUR",status:"Delno"},
 {id:"TX-8838",companyId:1,date:"01. 11. 2026",party:"Neznan priliv",reference:"BREZ SKLICA",amountCents:48000,currency:"EUR",status:"Neusklajeno"},
 {id:"TX-B01",companyId:2,date:"04. 11. 2026",party:"Dobavitelj B",reference:"SI00 TEST-B-001",amountCents:-8500,currency:"EUR",status:"Predlagano"},
 {id:"TX-C01",companyId:3,date:"05. 11. 2026",party:"Kupec C",reference:"SI00 TEST-C-001",amountCents:15000,currency:"EUR",status:"Predlagano"}
];
const openItems=[
 {id:"OPEN-A1",companyId:1,reference:"2026-0054",partner:"ABC d.o.o.",openCents:122000,currency:"EUR",direction:"credit"},
 {id:"OPEN-A2",companyId:1,reference:"P-2026-88021",partner:"Petrol d.d.",openCents:32000,currency:"EUR",direction:"debit"},
 {id:"OPEN-A3",companyId:1,reference:"2026-0053",partner:"Gamma d.o.o.",openCents:244000,currency:"EUR",direction:"credit"},
 {id:"OPEN-B1",companyId:2,reference:"TEST-B-001",partner:"Dobavitelj B",openCents:8500,currency:"EUR",direction:"debit"},
 {id:"OPEN-C1",companyId:3,reference:"TEST-C-001",partner:"Kupec C",openCents:15000,currency:"EUR",direction:"credit"}
];
const currency=cents=>euro(cents);
const signed=cents=>(cents>0?"+":"−")+currency(Math.abs(cents));

export default function BankingWorkspace({context,companyId}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Računi";
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [selectedId,setSelectedId]=useState(null);
 const [confirmed,setConfirmed]=useState([]);
 const [events,setEvents]=useState([]);
 const [notice,setNotice]=useState("");
 const scoped=useMemo(()=>txs.filter(tx=>tx.companyId===companyId),[companyId]);
 const companyConfirmed=useMemo(()=>confirmed.filter(x=>x.companyId===companyId),[confirmed,companyId]);
 const list=useMemo(()=>scoped.filter(tx=>{
   const match=companyConfirmed.some(x=>x.transactionId===tx.id);
   const q=query.trim().toLowerCase();
   const matchesQuery=!q||[tx.party,tx.reference,tx.id].join(" ").toLowerCase().includes(q);
   const matchesStatus=filter==="Vsi"||(filter==="Usklajeno"?match:!match&&tx.status===filter);
   const matchesContext=section==="Transakcije"
     ?(subView==="Prilivi"?tx.amountCents>0:subView==="Odlivi"?tx.amountCents<0:true)
     :section==="Usklajevanje"
     ?(subView==="Predlogi"?tx.status==="Predlagano":subView==="Delno"?tx.status==="Delno":subView==="Neusklajeno"?tx.status==="Neusklajeno":true)
     :section==="SEPA"?tx.amountCents<0:true;
   return matchesQuery&&matchesStatus&&matchesContext;
 }),[scoped,companyConfirmed,query,filter,section,subView]);
 const selected=list.find(x=>x.id===selectedId)??list[0]??null;
 const isMatched=selected&&companyConfirmed.some(x=>x.transactionId===selected.id);
 const candidates=useMemo(()=>selected
   ?suggestBankMatches(selected,openItems,confirmed,companyId):[],
   [selected,confirmed,companyId]);
 const unique=candidates.length===1?candidates[0]:null;
 const companyEvents=events.filter(x=>x.companyId===companyId).slice(-8).reverse();
 const inflow=scoped.filter(x=>x.amountCents>0).reduce((v,x)=>v+x.amountCents,0);
 const outflow=scoped.filter(x=>x.amountCents<0).reduce((v,x)=>v+Math.abs(x.amountCents),0);
 useEffect(()=>{
   setSelectedId(null);setQuery("");setFilter("Vsi");setNotice("");
 },[companyId]);
 const accept=()=>{
   if(!selected||!unique)return;
   try{
     const next=confirmBankMatch(selected,unique.itemId,openItems,confirmed,companyId);
     setConfirmed(next);
     setEvents(old=>[...old,{companyId,action:"confirmed",transactionId:selected.id,at:new Date().toISOString()}]);
     setNotice("Demo ujemanje potrjeno. Glavna knjiga in bančni račun ostajata nespremenjena.");
   }catch(error){setNotice(error.message)}
 };
 const reset=()=>{
   setConfirmed(old=>resetCompanyBankMatches(old,companyId));
   setEvents(old=>[...old,{companyId,action:"reset",transactionId:null,at:new Date().toISOString()}]);
   setNotice("Ponastavljena so samo demo ujemanja izbranega podjetja.");
 };
 const status=tx=>companyConfirmed.some(x=>x.transactionId===tx.id)?"Demo usklajeno":tx.status;
 return <section className="bankWorkspace">
   <style>{`
   .bankWorkspace{margin-top:10px}.bankGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;gap:10px}
   .bankCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .bankHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.bankHead h3{margin:0;font-size:12px}
   .bankTools{display:flex;gap:7px;flex-wrap:wrap}.bankTools input,.bankTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:10px}
   .accountStrip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:12px}.accountStrip div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.accountStrip small,.accountStrip b{display:block}.accountStrip small{font-size:9px;color:var(--muted)}.accountStrip b{font-size:12px;margin-top:3px;font-variant-numeric:tabular-nums}
   .bankRow{display:grid;grid-template-columns:.8fr 1.3fr 1.05fr .8fr .9fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}
   .bankRow.head{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}.bankRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.bankRow[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
   .bankRow b{font-size:10px}.bankRow small{display:block;color:var(--muted);font-size:9px;margin-top:2px}.bankAmt{text-align:right;font-variant-numeric:tabular-nums}
   .matchState{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:9px}.matchState.good{color:var(--ok)}.matchState.warn{color:var(--warn)}.matchState.info{color:var(--accent2)}.matchState.bad{color:var(--danger)}
   .bankDetail{padding:14px}.bankDetail h3{margin:8px 0 2px;font-size:16px}.bankDetail>small{color:var(--muted);font-size:10px}.bankMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
   .bankMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.bankMeta small,.bankMeta b{display:block}.bankMeta small{font-size:9px;color:var(--muted)}.bankMeta b{font-size:10px;margin-top:3px}
   .bankSec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.bankSec h4{margin:0 0 8px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
   .matchBox{border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:11px;padding:10px;background:color-mix(in srgb,var(--accent) 5%,var(--panel))}.matchBox b,.matchBox small{display:block}.matchBox small{font-size:10px;color:var(--muted);margin-top:5px}
   .sepaBox{margin:12px;border:1px solid var(--line);border-radius:11px;padding:10px;background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px}.sepaBox b,.sepaBox small{display:block}.sepaBox small{font-size:9px;color:var(--muted);margin-top:3px}
   @media(max-width:1100px){.bankGrid{grid-template-columns:1fr}}@media(max-width:760px){.accountStrip{grid-template-columns:1fr 1fr}.bankRow{grid-template-columns:.9fr 1.2fr .8fr}.bankRow>*:nth-child(3),.bankRow>*:nth-child(5){display:none}.bankMeta{grid-template-columns:1fr}.bankTools input{width:100%}}
   `}</style>
   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Aktivno: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · sintetični podatki izbranega podjetja; brez povezave z banko</div>
   {notice&&<div role="status" style={{padding:10,marginBottom:10,border:"1px solid var(--line)",borderRadius:9,fontSize:11}}>{notice}</div>}
   {section==="Pregled"&&subView==="Napoved"&&<CashflowScenarioPanel companyId={companyId}/>}
   <div className="bankGrid">
     <article className="bankCard">
       <div className="bankHead"><h3>Banka · {section} / {subView}</h3><div className="bankTools">
         <input aria-label="Išči bančne transakcije" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči sklic, partnerja ..."/>
         <select aria-label="Filter usklajevanja" value={filter} onChange={e=>setFilter(e.target.value)}>
           {["Vsi","Predlagano","Delno","Neusklajeno","Usklajeno"].map(x=><option key={x}>{x}</option>)}
         </select>
         <button type="button" className="secondary" onClick={reset}>Ponastavi demo</button>
         <button type="button" className="primary" disabled title="Resnični uvoz izpiska še ni aktiviran">Uvoz izpiska (v pripravi)</button>
       </div></div>
       <div className="accountStrip">
         <div><small>Vzorčni prilivi</small><b>{currency(inflow)}</b></div>
         <div><small>Vzorčni odlivi</small><b>{currency(outflow)}</b></div>
         <div><small>Potrjena demo ujemanja</small><b>{companyConfirmed.length}</b></div>
       </div>
       <div className="sepaBox"><div><b>SEPA nalogi</b><small>Izvoz pain.001 ni povezan; demonstracija ne izvaja plačil.</small></div><button type="button" className="secondary" disabled>SEPA (v pripravi)</button></div>
       <div className="bankRow head"><span>Datum</span><span>Partner / sklic</span><span>Predlog</span><span>Znesek</span><span>Status</span></div>
       {!list.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>V izbranem pogledu ni sintetičnih transakcij.</p>}
       {list.map(tx=>{
         const matched=companyConfirmed.some(x=>x.transactionId===tx.id);
         const matches=suggestBankMatches(tx,openItems,confirmed,companyId);
         return <button type="button" className="bankRow" key={tx.id} aria-pressed={selected?.id===tx.id} onClick={()=>{setSelectedId(tx.id);setNotice("");}}>
           <span><b>{tx.date}</b><small>{tx.id}</small></span>
           <span><b>{tx.party}</b><small>{tx.reference}</small></span>
           <span><b>{matched?"Potrjeno v demonstraciji":matches.length===1?matches[0].reference:"Brez enoličnega predloga"}</b><small>{matches.length===1&&matches[0].kind==="partial"?"Delno plačilo":""}</small></span>
           <b className="bankAmt">{signed(tx.amountCents)}</b>
           <span className={"matchState "+(matched?"good":tx.status==="Predlagano"?"info":tx.status==="Delno"?"warn":"bad")}>{status(tx)}</span>
         </button>;
       })}
     </article>
     {selected&&<aside className="bankCard bankDetail">
       <span className={"matchState "+(isMatched?"good":"info")}>{status(selected)}</span>
       <h3>{selected.party}</h3><small>{selected.reference} · {selected.id}</small>
       <div className="bankMeta">
         <div><small>Znesek</small><b>{signed(selected.amountCents)}</b></div>
         <div><small>Datum</small><b>{selected.date}</b></div>
         <div><small>Valuta</small><b>{selected.currency}</b></div>
         <div><small>Smer</small><b>{selected.amountCents>0?"Priliv":"Odliv"}</b></div>
       </div>
       <div className="bankSec"><h4>Razložljiv predlog ujemanja</h4><div className="matchBox">
         {isMatched?<><b>Demonstracijsko potrjeno</b><small>Ni izvedenega knjiženja ali bančne transakcije.</small></>
         :unique?<><b>{unique.partner} · {unique.reference}</b>
           <small>{unique.explanation}</small>
           <small>Odprto pred ujemanjem: {currency(unique.remainingCents)}. Predlagana dodelitev: {currency(unique.appliedCents)}.</small>
           <small>{unique.kind==="partial"?"Delno plačilo – preostanek ostane odprt.":"Celotno ujemanje odprte postavke."} Potrebna je ročna potrditev.</small>
         </>:<><b>Ni enoličnega varnega predloga</b><small>Sklic, valuta, smer ali razpoložljivi znesek se ne ujemajo. FinAI ne ugiba in ničesar ne potrdi samodejno.</small></>}
       </div></div>
       <div className="bankSec"><h4>Dejanja</h4><div style={{display:"grid",gap:8}}>
         <button type="button" className="primary" disabled={!unique||isMatched} onClick={accept}>{isMatched?"Demo ujemanje potrjeno":"Potrdi demo ujemanje"}</button>
         <button type="button" className="secondary" disabled title="Razdelitev po več odprtih postavkah še ni aktivna">Razdeli plačilo (v pripravi)</button>
         <button type="button" className="secondary" disabled title="Knjiženje ni aktivno">Prikaži temeljnico (v pripravi)</button>
       </div></div>
     </aside>}
     {!selected&&<aside className="bankCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Ni izbrane transakcije.</aside>}
   </div>
   <article className="bankCard" aria-label="Demonstracijska zgodovina bančnih ujemanj" style={{marginTop:10,padding:14}}>
     <h3 style={{fontSize:12,margin:"0 0 6px"}}>Sejna zgodovina ujemanj</h3>
     <p style={{fontSize:10,color:"var(--muted)",margin:"0 0 9px"}}>Zgolj v spominu brskalnika in samo za to podjetje; ni trajna revizijska sled ali bančno knjiženje.</p>
     {companyEvents.length===0&&<p style={{fontSize:10,color:"var(--muted)"}}>Še ni potrjenih demo ujemanj.</p>}
     {companyEvents.map((event,i)=><div key={event.at+i} style={{display:"flex",gap:12,justifyContent:"space-between",fontSize:10,padding:"7px 0",borderTop:"1px solid var(--line)"}}>
       <span>{event.action==="confirmed"?"Potrjeno ujemanje "+event.transactionId:"Ponastavljena demo ujemanja"}</span>
       <time dateTime={event.at}>{new Date(event.at).toLocaleString("sl-SI")}</time>
     </div>)}
   </article>
 </section>;
}
