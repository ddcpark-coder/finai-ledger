"use client";
import {useMemo} from "react";
import {demoCompanyPulse} from "./sharedDemoCompany.mjs";
import {useSharedDemoCompany} from "./useSharedDemoCompany";

const money=cents=>(cents/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR",maximumFractionDigits:2
});
const small={fontSize:10,color:"var(--muted)",lineHeight:1.6};
export default function SharedDemoBusinessPulse({
 companyId,unitId="all",mode="summary"
}){
 const state=useSharedDemoCompany(companyId);
 const pulse=useMemo(()=>demoCompanyPulse(state,unitId),[state,unitId]);
 const tiles=mode==="stock"?[
  ["Skladišča",pulse.warehouses],["Fizično na voljo",pulse.stock.available],
  ["Predvideno pomanjkanje",pulse.stock.projectedShortage],
  ["Demo prenosi",pulse.transfers]
 ]:mode==="orders"?[
  ["Naročila iz Integracij",pulse.orderCount],
  ["Čaka pregled",pulse.reviewCount],["Pregledano",pulse.reviewedCount],
  ["Zadržano",pulse.holdCount]
 ]:mode==="crm"?[
  ["Odprte CRM priložnosti",pulse.crm.openCount],
  ["Utežena prodajna napoved",money(pulse.crm.weightedValueCents)],
  ["Naročila iz Integracij",pulse.orderCount],
  ["Predvideno pomanjkanje",pulse.stock.projectedShortage]
 ]:[
  ["CRM napoved",money(pulse.crm.weightedValueCents)],
  ["Trgovinska naročila",pulse.orderCount],
  ["Vrednost za pregled",money(pulse.activeOrderCents)],
  ["Predvideno pomanjkanje",pulse.stock.projectedShortage]
 ];
 return <section aria-label="FinAI skupni sintetični poslovni pogled"
  style={{background:"var(--panel)",border:"1px solid var(--line)",
   borderRadius:13,padding:12,marginBottom:12}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,
    alignItems:"start",flexWrap:"wrap"}}>
   <div><h3 style={{fontSize:12,margin:"0 0 5px"}}>
    Skupni operativni pregled · sintetično</h3>
    <p style={{...small,margin:"0 0 9px"}}>
     Podjetje {companyId}{unitId!=="all"?" · enota "+unitId:""}.
     Isti podatki so vidni v Integracijah, Zalogi, CRM, Naročilih in Analitiki.
    </p></div>
   <span style={{...small}}>Revizija demo seje: {pulse.revision}</span>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
     gap:8}}>
   {tiles.map(([name,value])=><div key={name}
    style={{border:"1px solid var(--line)",borderRadius:9,padding:9,
       background:"var(--bg2)"}}>
     <small style={{...small,display:"block",fontSize:9}}>{name}</small>
     <b style={{fontSize:14,fontVariantNumeric:"tabular-nums"}}>{value}</b>
    </div>)}
  </div>
  {mode==="orders"&&<p style={{...small,margin:"9px 0 0"}}>
   Vrednost nezadržanih testnih naročil: {money(pulse.activeOrderCents)}.
   Zadržano: {money(pulse.heldOrderCents)}. Spodnji ločeni CMS vzorec ni
   samodejno vključen v to pregledno vrsto.</p>}
  {mode==="stock"&&<p style={{...small,margin:"9px 0 0"}}>
   Fizična demo zaloga: {pulse.stock.onHand}; že rezervirano:
   {" "}{pulse.stock.reserved}. Napoved ne rezervira novih količin.
   Spodnja podrobna tabela je še neodvisen statični primer.</p>}
  <p style={{...small,margin:"9px 0 0"}}>
   Samo pomnilnik tega zavihka; ponovni začetek strani ponastavi stanje.
   Brez strežniškega shranjevanja, rezervacij, računov, plačil ali knjiženj.
   {mode==="summary"?" Zgodovinski finančni grafikoni spodaj so ločeni sintetični podatki.":""}
  </p>
 </section>;
}
