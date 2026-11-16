"use client";

import {useMemo,useState} from "react";
import {offlineScenarioSkuOptions,projectOfflineOrder}
 from "./offlineBusinessScenario.mjs";

const eur=cents=>(cents/100).toLocaleString("sl-SI",{
 style:"currency",currency:"EUR",maximumFractionDigits:2
});
const choices=[5000,12500,25000,50000];
const styles={
 shell:{marginTop:18,padding:13,border:"1px solid #436778",borderRadius:12,
  background:"#0a2030"},
 label:{display:"grid",gap:6,fontSize:12,color:"#c3dae9"},
 control:{minHeight:44,padding:"8px 10px",width:"100%",color:"#effaff",
  background:"#0b1c2c",border:"1px solid #668da0",borderRadius:8},
 grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
  gap:10,marginTop:13},
 number:{fontSize:17,fontWeight:750,marginTop:5},
 muted:{fontSize:11,color:"#a9c3d1",lineHeight:1.5}
};

export default function OfflineBusinessScenario({companyId,unitId="all"}){
 const [sku,setSku]=useState("");
 const [quantity,setQuantity]=useState("3");
 const [price,setPrice]=useState(12500);
 const [cost,setCost]=useState(7500);
 const [expanded,setExpanded]=useState(false);
 const options=useMemo(()=>offlineScenarioSkuOptions(companyId,unitId),
  [companyId,unitId]);
 const selected=options.some(x=>x.sku===sku)?sku:options[0]?.sku;
 const valid=/^(?:0|[1-9]\d{0,2})$/.test(quantity)&&Number(quantity)<=200;
 const scenario=useMemo(()=>valid&&selected?
  projectOfflineOrder(companyId,unitId,{
    sku:selected,quantity:Number(quantity),
    unitPriceCents:price,unitCostCents:cost
  }):null,[companyId,unitId,selected,valid,quantity,price,cost]);
 const metric=(label,value,sub)=>(
  <div style={{border:"1px solid #35546b",padding:10,borderRadius:9,background:"#102c3f"}}>
   <div style={styles.muted}>{label}</div>
   <div style={styles.number}>{value}</div>
   {sub&&<div style={styles.muted}>{sub}</div>}
  </div>
 );
 return <section aria-label="FinAI NEXT13 offline simulacija naročila" style={styles.shell}>
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}
   style={{color:"#d5fcf5",background:"#163e4c",border:"1px solid #5d9198",
    borderRadius:9,padding:"10px 13px",minHeight:44,fontSize:12,fontWeight:700,
    cursor:"pointer"}}>
   {expanded?"Skrij simulacijo naročila":"Simuliraj naročilo in razpoložljivo zalogo"}
  </button>
  {expanded&&<div>
   <p style={{...styles.muted,marginTop:11}}>
    Samo izmišljeni podatki. Izračun se opravi na napravi, brez interneta,
    shranjevanja, rezervacije zaloge ali knjiženja.
   </p>
   <div style={styles.grid}>
    <label style={styles.label}>Artikel (sintetični SKU)
     <select value={selected??""} onChange={e=>setSku(e.target.value)}
      style={styles.control} aria-label="Artikel za offline simulacijo">
      {options.map(o=><option key={o.sku} value={o.sku}>
       {o.sku} · na voljo {o.available}
      </option>)}
     </select>
    </label>
    <label style={styles.label}>Načrtovana količina (0–200)
     <input type="number" min="0" max="200" step="1" value={quantity}
      onChange={e=>setQuantity(e.target.value)}
      style={styles.control} aria-label="Načrtovana količina naročila"/>
    </label>
    <label style={styles.label}>Sintetična prodajna cena na kos
     <select value={price} onChange={e=>setPrice(Number(e.target.value))}
      style={styles.control} aria-label="Prodajna cena za simulacijo">
      {choices.map(v=><option key={v} value={v}>{eur(v)}</option>)}
     </select>
    </label>
    <label style={styles.label}>Sintetični strošek na kos
     <select value={cost} onChange={e=>setCost(Number(e.target.value))}
      style={styles.control} aria-label="Strošek za simulacijo">
      {[0,3500,7500,12000,30000].map(v=>
       <option key={v} value={v}>{eur(v)}</option>)}
     </select>
    </label>
   </div>
   {!valid&&<p role="alert" style={{color:"#ffd0ba",fontSize:12}}>
    Količina mora biti celo število med 0 in 200.
   </p>}
   {scenario&&<div role="status" aria-live="polite">
    <div style={styles.grid}>
     {metric("Razpoložljiva količina",String(scenario.availableBefore))}
     {metric("Simulirana izvedljiva količina",String(scenario.fulfilled),
       "Ne izvede skladiščnega premika")}
     {metric("Primanjkljaj",String(scenario.shortage),
       scenario.shortage?"Dodatna zaloga bi bila potrebna":"Zaloga zadostuje")}
     {metric("Ocenjeni dodatni prispevek",
       eur(scenario.additionalRevenueCents-scenario.additionalCostCents),
       "Brez davčnega ali računovodskega učinka")}
    </div>
    <p style={{...styles.muted,marginTop:12}}>
     Izhodiščni demonstracijski poslovni izid: {eur(scenario.baselineProfitCents)}.
     Ocena po izvedljivem delu naročila: <strong>{eur(scenario.projectedProfitCents)}</strong>.
     Neizpolnjen del ({scenario.shortage} kosov) ni vključen v dodatne prihodke.
    </p>
   </div>}
  </div>}
 </section>;
}
