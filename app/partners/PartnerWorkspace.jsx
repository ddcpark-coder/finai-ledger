"use client";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {createDemoPartner,updateDemoPartner} from "./demoPartners.mjs";
import {useEffect,useMemo,useState} from "react";

const partners=[
 {name:"ACME d.o.o.",tax:"SI12345678",country:"SI",balance:"1.240,00 €",status:"Aktiven",risk:"Normalno",vat:"Veljaven",terms:"15 dni",iban:"SI56 •••• 5678",email:"finance@acme.si"},
 {name:"Gamma GmbH",tax:"DE123456789",country:"DE",balance:"2.480,00 €",status:"Aktiven",risk:"Normalno",vat:"Veljaven",terms:"30 dni",iban:"DE89 •••• 3000",email:"buchhaltung@gamma.de"},
 {name:"Delta SRL",tax:"IT12345678901",country:"IT",balance:"730,00 €",status:"Aktiven",risk:"Pregled",vat:"Veljaven",terms:"30 dni",iban:"IT60 •••• 9876",email:"amministrazione@delta.it"},
 {name:"Beta trgovina d.o.o.",tax:"SI98765432",country:"SI",balance:"0,00 €",status:"Aktiven",risk:"Normalno",vat:"Preverjeno",terms:"15 dni",iban:"SI56 •••• 1122",email:"racuni@beta.si"},
 {name:"Studio Kreativ s.p.",tax:"SI44556677",country:"SI",balance:"915,00 €",status:"Aktiven",risk:"Opozorilo",vat:"Ni zavezanec",terms:"8 dni",iban:"SI56 •••• 9001",email:"info@studio.si"}
];

export default function PartnerWorkspace({context,companyId=1}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Vsi partnerji";
 const [query,setQuery]=useState("");
 const [records,setRecords]=useState(()=>partners.map(p=>({
   ...p,companyId,name:companyId===1?p.name:p.name+" · demo "+companyId
 })));
 const [selected,setSelected]=useState(records[0]);
 const [risk,setRisk]=useState("Vsi");
 const [editor,setEditor]=useState(null);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [notice,setNotice]=useState("");
 const [detail,setDetail]=useState("");
 const list=useMemo(()=>records.filter(p=>{
   const q=query.toLowerCase();
   const matches=!q||[p.name,p.tax,p.country,p.email].join(" ").toLowerCase().includes(q);
   const riskMatch=risk==="Vsi"||p.risk===risk;
   const contextMatch=section==="Finance"?(subView==="Obveznosti"?false:subView==="Terjatve"?p.balance!=="0,00 €":true)
     :section==="Pregled"?(subView==="Kupci"?["ACME d.o.o.","Gamma GmbH","Studio Kreativ s.p."].includes(p.name):subView==="Dobavitelji"?["Delta SRL","Beta trgovina d.o.o.","Gamma GmbH"].includes(p.name):true)
     :section==="Kontakti"||section==="Ceniki"||section==="Dokumenti";
   return matches&&riskMatch&&contextMatch;
 }),[query,risk,section,subView,records]);

 useEffect(()=>{
   if(list.length&&!list.some(row=>row.tax===selected.tax)){
     setSelected(list[0]);setDetail("");
   }
 },[list,selected.tax]);
 const openEditor=(mode)=>{
   setEditor(mode);setName(mode==="edit"?selected.name:"");
   setEmail(mode==="edit"?selected.email:"");setNotice("");
 };
 const savePartner=(event)=>{
   event.preventDefault();
   try{
     if(editor==="create"){
       const result=createDemoPartner(records,companyId,{name,email});
       setRecords(result.records);setSelected(result.partner);setQuery("");setRisk("Vsi");
       setNotice("Sintetični partner ustvarjen samo v trenutni seji brskalnika.");
     }else{
       const next=updateDemoPartner(records,companyId,selected.tax,{name,email});
       setRecords(next);setSelected(next.find(p=>p.tax===selected.tax));
       setNotice("Podatki sintetičnega partnerja spremenjeni samo v brskalniku.");
     }
     setEditor(null);
   }catch(error){setNotice(error.message);}
 };
 return <section className="partnerWorkspace">
   <style>{`
   .partnerWorkspace{margin-top:10px}.partnerGrid{display:grid;grid-template-columns:minmax(0,1.45fr) 340px;gap:10px}
   .partnerCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}
   .partnerHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
   .partnerHead h3{margin:0;font-size:12px}.partnerTools{display:flex;gap:7px}.partnerTools input,.partnerTools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
   .partnerRow{display:grid;grid-template-columns:1.45fr .9fr .8fr .75fr .75fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);background:transparent;color:var(--text);width:100%;text-align:left;border-left:0;border-right:0;border-top:0}
   .partnerRow.head{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.06em;background:var(--panel)}
   .partnerRow:not(.head):hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.partnerRow b{font-size:10px}.partnerRow small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.money{font-variant-numeric:tabular-nums;text-align:right}
   .risk{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.risk.normal{color:var(--ok)}.risk.review{color:var(--warn)}.risk.alert{color:var(--danger)}
   .partnerDetail{padding:14px}.partnerDetail h3{margin:0;font-size:16px}.partnerDetail>small{color:var(--muted);font-size:9px}.partnerMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:13px 0}
   .partnerMeta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.partnerMeta small,.partnerMeta b{display:block}.partnerMeta small{font-size:8px;color:var(--muted)}.partnerMeta b{font-size:10px;margin-top:3px;overflow:hidden;text-overflow:ellipsis}
   .partnerSection{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.partnerSection h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
   .partnerStat{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.partnerStat span{color:var(--muted)}
   .verifyBadge{display:inline-flex;gap:5px;align-items:center;border:1px solid color-mix(in srgb,var(--ok) 45%,var(--line));border-radius:999px;padding:4px 7px;color:var(--ok);font-size:8px}
   @media(max-width:1100px){.partnerGrid{grid-template-columns:1fr}}@media(max-width:760px){.partnerRow{grid-template-columns:1.4fr .8fr .7fr}.partnerRow>*:nth-child(2),.partnerRow>*:nth-child(5){display:none}.partnerTools{flex-wrap:wrap}.partnerTools input{width:100%}.partnerMeta{grid-template-columns:1fr}}
   `}</style>
   <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Izbran pogled: <b style={{color:"var(--text)"}}>{section} / {subView}</b> · sintetični partnerji, podjetje {companyId}. Brez registrskih poizvedb in knjiženja.</div>
   {notice&&<p role="status" style={{padding:10,border:"1px solid var(--line)",borderRadius:9,fontSize:11}}>{notice}</p>}
   {editor&&<form onSubmit={savePartner} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"end",padding:12,marginBottom:10,border:"1px solid var(--line)",borderRadius:12}}>
     <label style={{display:"grid",gap:4,fontSize:10}}>Naziv demonstracijskega partnerja<input required maxLength={120} minLength={2} value={name} onChange={e=>setName(e.target.value)} style={{minHeight:36,padding:8,background:"var(--panel)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:7}}/></label>
     <label style={{display:"grid",gap:4,fontSize:10}}>E-pošta (neobvezno)<input type="email" maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} style={{minHeight:36,padding:8,background:"var(--panel)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:7}}/></label>
     <button className="primary" type="submit">Shrani samo v demo</button>
     <button className="secondary" type="button" onClick={()=>setEditor(null)}>Prekliči</button>
   </form>}
   <AdaptivePaneGrid className="partnerGrid">
     <article className="partnerCard">
       <div className="partnerHead">
         <h3>Partnerji · {section} / {subView}</h3>
         <div className="partnerTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči partnerja, VAT ID ..."/><select value={risk} onChange={e=>setRisk(e.target.value)}><option>Vsi</option><option>Normalno</option><option>Pregled</option><option>Opozorilo</option></select><button type="button" className="primary" onClick={()=>openEditor("create")}>＋ Nov demo partner</button></div>
       </div>
       <div className="partnerRow head"><span>Partner</span><span>Država / VAT</span><span>Saldo</span><span>Risk</span><span>Status</span></div>
       {!list.length&&<p style={{padding:12,fontSize:10,color:"var(--muted)"}}>Ni partnerjev za izbrano kombinacijo filtrov.</p>}
       {list.map(p=><button className="partnerRow" key={p.tax} onClick={()=>setSelected(p)}>
         <span><b>{p.name}</b><small>{p.tax}</small></span>
         <span><b>{p.country}</b><small>{p.vat}</small></span>
         <b className="money">{p.balance}</b>
         <span className={"risk "+(p.risk==="Normalno"?"normal":p.risk==="Pregled"?"review":"alert")}>{p.risk}</span>
         <span>{p.status}</span>
       </button>)}
     </article>

     {list.length>0&&<aside className="partnerCard partnerDetail">
       <span className="verifyBadge">Sintetični podatki · brez preverjanja registra</span>
       <h3 style={{marginTop:10}}>{selected.name}</h3>
       <small>{selected.tax} · {selected.country}</small>
       <div className="partnerMeta">
         <div><small>Odprti saldo</small><b>{selected.balance}</b></div>
         <div><small>Plačilni rok</small><b>{selected.terms}</b></div>
         <div><small>VAT status</small><b>{selected.vat}</b></div>
         <div><small>Risk</small><b>{selected.risk}</b></div>
       </div>
       <div className="partnerSection"><h4>Kontakt in plačila</h4><div className="partnerStat"><span>E-pošta</span><b>{selected.email}</b></div><div className="partnerStat"><span>IBAN</span><b>{selected.iban}</b></div></div>
       <div className="partnerSection"><h4>Saldakonti</h4><div className="partnerStat"><span>Terjatve</span><b>{selected.balance}</b></div><div className="partnerStat"><span>Obveznosti</span><b>0,00 €</b></div><div className="partnerStat"><span>Zapadlo</span><b style={{color:"var(--warn)"}}>{selected.risk==="Opozorilo"?"915,00 €":"0,00 €"}</b></div></div>
       <div className="partnerSection"><h4>Dejanja</h4><div style={{display:"grid",gap:7}}>
         <button type="button" className="primary" onClick={()=>openEditor("edit")}>Uredi demo partnerja</button>
         <button type="button" className="secondary" onClick={()=>setDetail(detail==="vat"?"":"vat")}>Prikaži VAT podatke (brez VIES)</button>
         <button type="button" className="secondary" onClick={()=>setDetail(detail==="balance"?"":"balance")}>Pokaži demo odprte postavke</button>
       </div>
       {detail==="vat"&&<p role="status" style={{fontSize:11}}>Davčna oznaka: {selected.tax}. Stanje: {selected.vat}. To so izmišljeni podatki; povezava z VIES ali AJPES ni vzpostavljena.</p>}
       {detail==="balance"&&<p role="status" style={{fontSize:11}}>Demo terjatve: {selected.balance}. Podrobnih postavk v glavni knjigi ni; to ni računovodski izpis.</p>}</div>
     </aside>}{list.length===0&&<aside className="partnerCard" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}
   </AdaptivePaneGrid>
 </section>
}
