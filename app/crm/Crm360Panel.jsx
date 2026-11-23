"use client";
import {useEffect,useMemo,useState} from "react";
import {useSharedDemoCompany} from "../next11/useSharedDemoCompany";
import {useCrm360Session} from "./useCrm360Session";
import {crm360Customers,performCrm360,resetCrm360} from "./crm360Session.mjs";

const money=cents=>(cents/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR"
});
const card={border:"1px solid var(--line)",borderRadius:12,padding:12,
 background:"var(--panel)"};
const input={width:"100%",padding:"8px 9px",borderRadius:8,
 border:"1px solid var(--line)",background:"var(--bg2)",color:"var(--text)",
 fontSize:11};

export default function Crm360Panel({companyId,context}){
 const shared=useSharedDemoCompany(companyId);
 const state=useCrm360Session(companyId);
 const [dealId,setDealId]=useState("");
 const [contactId,setContactId]=useState("");
 const [contactName,setContactName]=useState("Sintetični novi kontakt");
 const [contactEmail,setContactEmail]=useState("nov@example.test");
 const [contactRole,setContactRole]=useState("Prodaja");
 const [activityKind,setActivityKind]=useState("Naloga");
 const [activitySubject,setActivitySubject]=useState("Sintetični nadaljnji stik");
 const [notice,setNotice]=useState("");
 const [query,setQuery]=useState("");
 const [unitId,setUnitId]=useState("all");
 const [showContactForm,setShowContactForm]=useState(false);

 useEffect(()=>{
  setDealId("");setContactId("");setNotice("");setQuery("");
  setUnitId("all");setShowContactForm(false);
 },[companyId]);

 const customers=useMemo(()=>crm360Customers(companyId),[companyId]);
 const deals=shared.deals;
 const filtered=deals.filter(d=>
  (unitId==="all"||d.unitId===unitId)&&
  (!query||[d.name,d.partner,d.id].join(" ").toLocaleLowerCase("sl-SI")
   .includes(query.toLocaleLowerCase("sl-SI")))
 );
 const selected=deals.find(d=>d.id===dealId)??filtered[0]??null;
 const customer=customers.find(c=>c.dealId===selected?.id)??null;
 const contacts=state.contacts.filter(c=>c.dealId===selected?.id);
 const contact=contacts.find(c=>c.id===contactId)??contacts[0]??null;
 const activities=state.activities.filter(x=>x.dealId===selected?.id);
 const quotes=state.quotes.filter(x=>x.dealId===selected?.id);
 const orders=state.orders.filter(x=>x.dealId===selected?.id);
 const units=[...new Map(deals.map(d=>[d.unitId,d.unitId])).values()];
 const forecast=filtered.reduce((s,d)=>s+Math.round(
  d.valueCents*d.probability/100),0);
 const changeDeal=id=>{
  setDealId(id);setContactId("");setShowContactForm(false);setNotice("");
 };
 const run=(action,good)=>{
  if(!selected)return;
  try{
   performCrm360(companyId,action);
   setNotice(good+" Samo sintetično, brez trajne shrambe ali pošiljanja.");
  }catch(error){
   setNotice(error.message??"CRM demo dejanje ni dovoljeno.");
  }
 };
 const addContact=()=>run({
  type:"contact.add",dealId:selected.id,
  name:contactName,email:contactEmail,role:contactRole
 },"Dodan testni kontakt.");
 const editContact=()=>{
  if(!contact)return;
  run({
   type:"contact.edit",contactId:contact.id,expectedVersion:contact.version,
   name:contactName,email:contactEmail,role:contactRole
  },"Testni kontakt posodobljen.");
 };
 const editSelected=()=>{
  if(!contact)return;
  setContactId(contact.id);setContactName(contact.name);
  setContactEmail(contact.email);setContactRole(contact.role);
  setShowContactForm(true);
 };
 const prepareQuote=()=>{
  if(!contact||!selected)return;
  run({
   type:"quote.create",dealId:selected.id,contactId:contact.id
  },"Osnutek je pripravljen in viden v modulu Ponudbe.");
 };
 return <section aria-label="CRM 360 kartica sintetične stranke"
  style={{...card,marginTop:12}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
    gap:10,flexWrap:"wrap",marginBottom:11}}>
   <div>
    <h3 style={{fontSize:15,margin:"0 0 5px"}}>CRM 360 · kartica stranke</h3>
    <p style={{fontSize:10,color:"var(--muted)",margin:0}}>
     Enotni sintetični kontakti, aktivnosti, priložnosti ter povezava
     Ponudbe → Naročila. Samo pomnilnik tega zavihka.
    </p>
   </div>
   <button type="button" className="secondary" onClick={()=>{
    resetCrm360(companyId);
    setNotice("CRM 360 demo je ponastavljen samo za izbrano podjetje.");
    setContactId("");setShowContactForm(false);
   }}>Ponastavi CRM 360 demo</button>
  </div>
  <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:12}}>
   <label style={{fontSize:10,flex:"1 1 150px"}}>Poišči CRM stranko ali priložnost
    <input aria-label="Poišči CRM stranko" style={input} value={query}
     onChange={e=>{setQuery(e.target.value);setDealId("");setContactId("");}}/>
   </label>
   <label style={{fontSize:10,flex:"1 1 150px"}}>Poslovna enota
    <select aria-label="Poslovna enota CRM 360" style={input} value={unitId}
     onChange={e=>{setUnitId(e.target.value);setDealId("");setContactId("");}}>
     <option value="all">Vse enote</option>
     {units.map(u=><option key={u} value={u}>{u}</option>)}
    </select>
   </label>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",
    gap:10,marginBottom:12}}>
   <div style={{...card,background:"var(--bg2)"}}>
    <small style={{color:"var(--muted)"}}>Prodajna napoved · izbran filter</small>
    <strong style={{display:"block",fontSize:19,marginTop:6}}>{money(forecast)}</strong>
    <small style={{color:"var(--muted)"}}>Iz obstoječega skupnega CRM lijaka ·
     {filtered.length} priložnosti</small>
   </div>
   <div style={{...card,background:"var(--bg2)"}}>
    <small style={{color:"var(--muted)"}}>CRM 360 · to podjetje</small>
    <strong style={{display:"block",fontSize:19,marginTop:6}}>
     {state.contacts.length} kontaktov · {state.activities.length} aktivnosti
    </strong>
    <small style={{color:"var(--muted)"}}>
     {state.quotes.length} osnutkov ponudb · {state.orders.length} osnutkov naročil
    </small>
   </div>
  </div>
  {!filtered.length&&<p role="status" style={{fontSize:11}}>
   Za iskalni niz ali poslovno enoto ni sintetičnih priložnosti.
  </p>}
  {selected&&customer&&<div style={{display:"grid",
   gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:12}}>
   <article style={card} aria-label="CRM 360 identiteta stranke">
    <h4 style={{fontSize:12,margin:"0 0 8px"}}>Stranka in prodajna priložnost</h4>
    <label style={{fontSize:10}}>Izberi povezano priložnost
     <select aria-label="Izberi priložnost CRM 360" style={input} value={selected.id}
      onChange={e=>changeDeal(e.target.value)}>
      {filtered.map(d=><option key={d.id} value={d.id}>
       {d.partner} · {d.name}</option>)}
     </select>
    </label>
    <p style={{fontSize:12,margin:"12px 0 5px"}}><b>{customer.name}</b></p>
    <p style={{fontSize:10,color:"var(--muted)",margin:"0 0 8px"}}>
     {customer.id} · {selected.id} · {selected.unitId}
    </p>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,
      borderTop:"1px solid var(--line)",paddingTop:8,fontSize:11}}>
     <span>{selected.stage} · verzija {selected.version}</span>
     <b>{money(selected.valueCents)} · {selected.probability}%</b>
    </div>
    <h4 style={{fontSize:11,margin:"14px 0 8px"}}>Kontakti te stranke</h4>
    {contacts.map(c=><button type="button" key={c.id} onClick={()=>{
      setContactId(c.id);setShowContactForm(false);
     }} aria-pressed={contact?.id===c.id}
      style={{...input,textAlign:"left",marginBottom:6,cursor:"pointer"}}>
      <b>{c.name}</b> · {c.role} · v{c.version}
      <small style={{display:"block",color:"var(--muted)"}}>{c.email||"Brez testnega naslova"}</small>
     </button>)}
    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
     <button type="button" className="primary" onClick={()=>{
      setShowContactForm(true);setContactId("");
      setContactName("Sintetični novi kontakt");
      setContactEmail("nov@example.test");setContactRole("Prodaja");
     }}>＋ Dodaj demo kontakt</button>
     <button type="button" className="secondary" disabled={!contact}
      onClick={editSelected}>Uredi izbrani kontakt</button>
    </div>
    {showContactForm&&<div style={{display:"grid",gap:7,marginTop:12}}>
     <label style={{fontSize:10}}>Izmišljeno ime
      <input aria-label="Ime sintetičnega kontakta" value={contactName}
       onChange={e=>setContactName(e.target.value)} style={input} maxLength={80}/>
     </label>
     <label style={{fontSize:10}}>Testni e-naslov (samo @example.test)
      <input aria-label="E-pošta sintetičnega kontakta" type="email"
       value={contactEmail} onChange={e=>setContactEmail(e.target.value)}
       style={input} maxLength={55}/>
     </label>
     <label style={{fontSize:10}}>Vloga
      <select style={input} value={contactRole} onChange={e=>setContactRole(e.target.value)}>
       {["Nabava","Prodaja","Vodja projekta","Drugo"].map(x=>
        <option key={x} value={x}>{x}</option>)}
      </select>
     </label>
     <button type="button" className="primary"
      onClick={()=>{
       if(contactId)editContact();
       else addContact();
       setShowContactForm(false);
      }}>
      {contactId?"Shrani demo kontakt":"Ustvari demo kontakt"}
     </button>
    </div>}
   </article>
   <article style={card} aria-label="CRM 360 aktivnosti in komercialni osnutki">
    <h4 style={{fontSize:12,margin:"0 0 8px"}}>Aktivnosti in naslednja dejanja</h4>
    {activities.length===0&&<p style={{color:"var(--muted)",fontSize:10}}>
     Za to sintetično priložnost še ni CRM 360 aktivnosti.
    </p>}
    {activities.map(a=><div key={a.id} style={{
      borderBottom:"1px solid var(--line)",padding:"7px 0",fontSize:10}}>
     <b>{a.kind} · {a.subject}</b>
     <small style={{display:"block",color:"var(--muted)"}}>
      {a.id} · lokalno, ni koledarskega opomnika</small>
    </div>)}
    <div style={{display:"grid",gap:8,marginTop:10}}>
     <label style={{fontSize:10}}>Vrsta dejavnosti
      <select style={input} aria-label="Vrsta sintetične aktivnosti"
       value={activityKind} onChange={e=>setActivityKind(e.target.value)}>
       {["Naloga","Klic","Sestanek","Opomba"].map(x=><option key={x}>{x}</option>)}
      </select>
     </label>
     <label style={{fontSize:10}}>Opis aktivnosti (samo izmišljeni podatki)
      <input aria-label="Opis sintetične aktivnosti" value={activitySubject}
       onChange={e=>setActivitySubject(e.target.value)} style={input}/>
     </label>
     <button type="button" className="secondary" disabled={!contact}
      onClick={()=>run({
       type:"activity.add",dealId:selected.id,contactId:contact.id,
       kind:activityKind,subject:activitySubject
      },"Aktivnost dodana.")}>
      ＋ Dodaj demo aktivnost
     </button>
    </div>
    <h4 style={{fontSize:11,margin:"16px 0 6px"}}>Ponudbe in naročila za to stranko</h4>
    {quotes.map(q=><p key={q.id} style={{fontSize:10,margin:"6px 0"}}>
      <b>{q.id}</b> · {q.status==="approved"?"ročno potrjena":"osnutek"} · {money(q.valueCents)}
     </p>)}
    {orders.map(o=><p key={o.id} style={{fontSize:10,margin:"6px 0"}}>
      <b>{o.id}</b> · samo osnutek naročila · {money(o.valueCents)}
     </p>)}
    <button type="button" className="primary" onClick={prepareQuote}
     disabled={!contact||quotes.length>0}>
     {quotes.length?"Osnutek ponudbe že obstaja":"Pripravi sintetično ponudbo"}
    </button>
    <p style={{fontSize:10,lineHeight:1.5,color:"var(--muted)",margin:"9px 0 0"}}>
     Ponudbo ročno potrdi v <a href="/?module=quotes">Ponudbah</a>.
     Šele nato je mogoče ustvariti demo osnutek naročila.
     Nobena ponudba se ne pošlje stranki.
    </p>
   </article>
  </div>}
  <p style={{fontSize:10,lineHeight:1.5,color:"var(--muted)",margin:"12px 0 0"}}>
   CRM 360 je sintetičen predogled. Brez prenosa na strežnik, dejanskega
   upravljanja strank, pošiljanja ponudb, zalog, računov ali knjiženja.
   Osvežitev strani ponastavi podatke te predstavitve.
  </p>
  {notice&&<p role="status" style={{
   fontSize:11,background:"var(--bg2)",border:"1px solid var(--line)",
   borderRadius:9,padding:9,margin:"10px 0 0"}}>{notice}</p>}
 </section>;
}
