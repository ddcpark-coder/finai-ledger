"use client";
import {useMemo,useState} from "react";
import SyntheticCommerceReviewDesk from "./SyntheticCommerceReviewDesk";
import {
 demoNetworkState,networkStockTotals,transferDemoStock,
 stageDemoShopOrder,decideDemoShopOrder
} from "./demoOperations.mjs";
import {
 buildDemoCommerceScenario,forecastDemoCommerceStock,demoEuroPriceCents
} from "./syntheticCommercePlanning.mjs";

const shell={padding:13,border:"1px solid var(--line)",borderRadius:14,
 background:"var(--panel)",marginBottom:12};
const control={padding:"7px 9px",borderRadius:8,color:"var(--text)",
 background:"var(--bg2)",border:"1px solid var(--line)",fontSize:10};
const small={fontSize:10,color:"var(--muted)"};

export default function OperationsNetworkPanel({companyId,mode="warehouses"}){
 const [state,setState]=useState(()=>demoNetworkState(companyId));
 const [sourceId,setSourceId]=useState(state.warehouses[0]?.id??"");
 const [targetId,setTargetId]=useState(state.warehouses[1]?.id??"");
 const [sku,setSku]=useState("TAB-10070");
 const [provider,setProvider]=useState("woocommerce");
 const [shopWarehouseId,setShopWarehouseId]=useState(state.warehouses[0]?.id??"");
 const [shopSku,setShopSku]=useState(state.warehouses[0]?.items[0]?.sku??"");
 const [shopQuantity,setShopQuantity]=useState(1);
 const [shopPrice,setShopPrice]=useState("125,00");
 const [notice,setNotice]=useState("");
 const [showEvents,setShowEvents]=useState(false);
 const source=state.warehouses.find(w=>w.id===sourceId);
 const target=state.warehouses.find(w=>w.id===targetId);
 const common=useMemo(()=>{
   if(!source||!target||source.id===target.id)return [];
   return source.items.filter(i=>target.items.some(j=>j.sku===i.sku))
     .map(i=>i.sku);
 },[source,target]);
 const effectiveSku=common.includes(sku)?sku:common[0]??"";
 const total=networkStockTotals(state,companyId);
 const shopWarehouse=state.warehouses.find(w=>w.id===shopWarehouseId);
 const shopItems=shopWarehouse?.items??[];
 const activeShopSku=shopItems.some(i=>i.sku===shopSku)
  ?shopSku:(shopItems[0]?.sku??"");
 const storedForecast=useMemo(()=>forecastDemoCommerceStock(state,companyId),
  [state,companyId]);
 const preview=useMemo(()=>{
  try{
   const scenario=buildDemoCommerceScenario(state,companyId,{
    provider,warehouseId:shopWarehouseId,sku:activeShopSku,
    quantity:shopQuantity,unitPriceCents:demoEuroPriceCents(shopPrice)
   });
   return {scenario,forecast:forecastDemoCommerceStock(state,companyId,scenario),
    error:null};
  }catch(error){return {scenario:null,forecast:null,error:error.message}}
 },[state,companyId,provider,shopWarehouseId,activeShopSku,shopQuantity,shopPrice]);
 const previewStock=preview.forecast?.rows.find(
  row=>row.warehouseId===shopWarehouseId&&row.sku===activeShopSku);
 const formatMoney=cents=>(cents/100).toLocaleString("sl-SI",{
  style:"currency",currency:"EUR"
 });
 const move=()=>{
  try{
   const next=transferDemoStock(state,companyId,{
     fromWarehouseId:sourceId,toWarehouseId:targetId,sku:effectiveSku,
     quantity:1,eventId:"SYN-XFER-"+String(state.version+1),
     expectedVersion:state.version
   });
   setState(next);
   setNotice("Zabeležen sintetični medskladiščni prenos 1 enote.");
  }catch(error){setNotice(error.message)}
 };
 const addShop=()=>{
  try{
   if(!preview.scenario)throw new Error(preview.error||"Neveljaven sintetični vnos.");
   const next=stageDemoShopOrder(state,companyId,preview.scenario,state.version);
   setState(next);
   setNotice(next.replayed
     ?"Isti testni dogodek je že v vrsti; brez podvajanja."
     :"Naročilo je pripravljeno za ročni pregled, ne za fakturiranje.");
  }catch(error){setNotice(error.message)}
 };
 const reviewDemo=(eventId,decision)=>{
  try{
   const next=decideDemoShopOrder(state,companyId,eventId,decision);
   setState(next);
   setNotice("Samo lokalni demo: "+(decision==="hold"?"zadržano":"pregledano")+
     ". Brez knjiženja, zalog ali strežniškega zapisa.");
  }catch(error){setNotice(error.message);}
 };
 const reset=()=>{setState(demoNetworkState(companyId));
   setNotice("Testno stanje je ponastavljeno.");};
 return <section style={shell}
   aria-label={mode==="warehouses"?"Večskladiščni demo in poslovne enote":"Simulacija integracij spletnih trgovin"}>
  <div style={{display:"flex",alignItems:"start",gap:12,
    justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><h3 style={{margin:"0 0 6px",fontSize:13}}>
    {mode==="warehouses"?"Poslovne enote in medskladiščni prenosi":
     "Povezave s spletnimi trgovinami · testni vmesnik"}
   </h3><p style={{...small,margin:"0 0 10px"}}>
    Samo sintetični primer podjetja {companyId}; brez povezave s trgovino,
    dejanskimi zalogami ali izdajo računov.
   </p></div>
   <button type="button" className="secondary" onClick={reset}
     style={{fontSize:10}}>Ponastavi demo</button>
  </div>
  {mode==="warehouses"?<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
      gap:8,margin:"8px 0 14px"}}>
    {state.businessUnits.map(unit=><div key={unit.id}
      style={{padding:10,border:"1px solid var(--line)",borderRadius:10,
        background:"var(--bg2)"}}>
     <b style={{fontSize:11}}>{unit.name}</b>
     <p style={{...small,margin:"4px 0 8px"}}>{unit.id} · {unit.location}</p>
     {state.warehouses.filter(w=>w.unitId===unit.id).map(w=>
      <div key={w.id} style={{fontSize:10,borderTop:"1px solid var(--line)",padding:"6px 0"}}>
       <b>{w.name}</b>
       <span style={{display:"block",color:"var(--muted)"}}>
        {w.items.map(i=>i.sku+" "+i.onHand+" (rez. "+i.reserved+")").join(" · ")}
       </span>
      </div>)}
    </div>)}
   </div>
   <div style={{display:"flex",gap:9,alignItems:"end",flexWrap:"wrap"}}>
    <label style={small}>Izvorno skladišče
     <select value={sourceId} onChange={e=>setSourceId(e.target.value)}
       style={{...control,display:"block"}}>
      {state.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
     </select>
    </label>
    <label style={small}>Ciljno skladišče
     <select value={targetId} onChange={e=>setTargetId(e.target.value)}
       style={{...control,display:"block"}}>
      {state.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
     </select>
    </label>
    <label style={small}>SKU
     <select value={effectiveSku} disabled={!common.length}
      onChange={e=>setSku(e.target.value)} style={{...control,display:"block"}}>
       {common.length?common.map(s=><option key={s}>{s}</option>):
        <option value="">Ni skupnega artikla</option>}
     </select>
    </label>
    <button type="button" className="primary" onClick={move}
     disabled={!common.length} style={{fontSize:10}}>
      Prenesi 1 demo enoto
    </button>
   </div>
   <p style={{...small,marginTop:10}}>Skupaj na zalogi: {total.onHand};
     rezervirano: {total.reserved}; na voljo: {total.available}.
     Prenosi ohranijo skupno fizično količino.</p>
  </>:<>
   <p style={small}>Podprta sta demonstracijska formata naročil WooCommerce in Shopify.
    Preslikava SKU, kontrola zneskov, identiteta dogodka in zaščita pred
    podvajanjem se izvedejo lokalno. Resnični API ključi se ne uporabljajo.</p>
   <div style={{display:"flex",gap:9,alignItems:"end",flexWrap:"wrap",marginTop:12}}>
    <label style={small}>Vir testnega naročila
     <select value={provider} onChange={e=>setProvider(e.target.value)}
       style={{...control,display:"block"}}>
      <option value="woocommerce">WooCommerce</option>
      <option value="shopify">Shopify</option>
     </select>
    </label>
    <label style={small}>Skladišče dobave
     <select aria-label="Skladišče naročila" value={shopWarehouseId}
      onChange={e=>{const id=e.target.value;setShopWarehouseId(id);
       setShopSku(state.warehouses.find(w=>w.id===id)?.items[0]?.sku??"")}}
      style={{...control,display:"block"}}>
      {state.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
     </select>
    </label>
    <label style={small}>Artikel (SKU)
     <select aria-label="SKU naročila" value={activeShopSku}
      onChange={e=>setShopSku(e.target.value)} style={{...control,display:"block"}}>
      {shopItems.map(i=><option key={i.sku} value={i.sku}>{i.sku}</option>)}
     </select>
    </label>
    <label style={small}>Količina
     <input aria-label="Količina naročila" type="number" min="1" max="100"
      step="1" value={shopQuantity} onChange={e=>setShopQuantity(Number(e.target.value))}
      style={{...control,display:"block",width:80}}/>
    </label>
    <label style={small}>Cena / enoto (EUR)
     <input aria-label="Cena na enoto v EUR" inputMode="decimal"
      value={shopPrice} onChange={e=>setShopPrice(e.target.value)}
      style={{...control,display:"block",width:105}}/>
    </label>
    <button className="primary" type="button" onClick={addShop}
      disabled={!preview.scenario}
      style={{fontSize:10}}>Pripravi sintetično naročilo za pregled</button>
   </div>
   <section aria-label="Predogled zaloge za testno naročilo"
    style={{padding:12,marginTop:12,border:"1px solid var(--line)",
     borderRadius:10,background:"var(--bg2)"}}>
    <b style={{fontSize:12}}>Takojšnji izračun naročila in razpoložljivosti</b>
    {preview.error?<p role="alert" style={{...small,marginTop:8}}>
     {preview.error}</p>:<>
     <p style={{...small,margin:"9px 0"}}>
      Osnovna testna vrednost: <b>{formatMoney(preview.scenario.totalCents)}</b>
      {" · "}Izbrano skladišče / SKU: <b>{shopWarehouse?.name} / {activeShopSku}</b>.
      Brez obračuna DDV, zalogovne rezervacije ali računa.
     </p>
     {previewStock&&<div role="status" aria-label="Napoved razpoložljive zaloge"
       style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11}}>
      <span>Dejansko na voljo v demu: <b>{previewStock.available}</b></span>
      <span>Obstoječe testne potrebe: <b>{previewStock.requested}</b></span>
      <span>Novi predlog: <b>{previewStock.preview}</b></span>
      <span>Po predlogu: <b>{previewStock.forecastAvailable}</b></span>
      <span style={{fontWeight:700}}>Pomanjkanje:
       {" "}{previewStock.shortage}</span>
     </div>}
     {preview.forecast.recommendations.length>0&&<div style={{marginTop:9}}>
      <b style={small}>Predlog medskladiščne prerazporeditve (brez izvedbe)</b>
      <ul style={{...small,margin:"5px 0"}}>
       {preview.forecast.recommendations.map((entry,index)=><li key={index}>
        {entry.quantity} × {entry.sku}:
        {" "}{state.warehouses.find(w=>w.id===entry.fromWarehouseId)?.name}
        {" → "}{state.warehouses.find(w=>w.id===entry.toWarehouseId)?.name}
       </li>)}
      </ul>
     </div>}
     {previewStock?.shortage>0&&
      <p style={{...small,margin:"7px 0 0"}}>
       Opozorilo: priporočeni prenos lahko pokrije le del manjkajoče zaloge.
       Predlagani prenosi niso izvedeni samodejno.</p>}
    </>}
    <p style={{...small,margin:"9px 0 0"}}>
     V pregledni vrsti: <b>{storedForecast.orderCount}</b> naročil;
     načrtovana testna vrednost <b>{formatMoney(storedForecast.activeCents)}</b>,
     zadržano <b>{formatMoney(storedForecast.heldCents)}</b>.
     Status »pregledano« ne rezervira fizične zaloge. Rezultat velja
     samo za to demonstracijsko sejo in ne za stanje v ERP-ju.
    </p>
   </section>
   <SyntheticCommerceReviewDesk companyId={companyId}
     previewOrders={state.stagedOrders} onPreviewDecision={reviewDemo}/>
  </>}
  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:10}}>
   <button type="button" className="secondary" onClick={()=>setShowEvents(x=>!x)}
    aria-expanded={showEvents} style={{fontSize:10}}>Dnevnik sintetičnih prenosov
    ({state.events.length})</button>
   <span style={{...small}}>Različica: {state.version}</span>
  </div>
  {showEvents&&<ol style={{fontSize:10,color:"var(--muted)"}}>
   {state.events.map(event=><li key={event.eventId}>{event.eventId} ·
     {event.payload.sku} · {event.payload.quantity}</li>)}
  </ol>}
  {notice&&<p role="status" style={{fontSize:10,color:"var(--muted)",margin:"9px 0 0"}}>
    {notice}</p>}
 </section>;
}
