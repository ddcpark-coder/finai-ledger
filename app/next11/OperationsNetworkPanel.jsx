"use client";
import {useMemo,useState} from "react";
import {
 demoNetworkState,networkStockTotals,transferDemoStock,
 demoShopSample,stageDemoShopOrder
} from "./demoOperations.mjs";

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
 const move=()=>{
  try{
   setState(current=>transferDemoStock(current,companyId,{
     fromWarehouseId:sourceId,toWarehouseId:targetId,sku:effectiveSku,
     quantity:1,eventId:"SYN-XFER-"+String(current.version+1),
     expectedVersion:current.version
   }));
   setNotice("Zabeležen sintetični medskladiščni prenos 1 enote.");
  }catch(error){setNotice(error.message)}
 };
 const addShop=()=>{
  try{
   const sample=demoShopSample(companyId,provider);
   const next=stageDemoShopOrder(state,companyId,sample,state.version);
   setState(next);
   setNotice(next.replayed
     ?"Isti testni dogodek je že v vrsti; brez podvajanja."
     :"Naročilo je pripravljeno za ročni pregled, ne za fakturiranje.");
  }catch(error){setNotice(error.message)}
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
    <button className="primary" type="button" onClick={addShop}
       style={{fontSize:10}}>Pripravi sintetično naročilo za pregled</button>
   </div>
   <div style={{marginTop:13,padding:10,border:"1px solid var(--line)",
      background:"var(--bg2)",borderRadius:10}}>
    <b style={{fontSize:11}}>Pregledna vrsta: {state.stagedOrders.length} naročil</b>
    {state.stagedOrders.map(order=><div key={order.eventId}
     style={{fontSize:10,marginTop:8,borderTop:"1px solid var(--line)",paddingTop:8}}>
     <b>{order.provider} · {order.externalOrderId}</b>
     <span style={{display:"block",color:"var(--muted)"}}>
      {order.lines.map(x=>x.sku+" × "+x.quantity).join(", ")} ·
      {(order.totalCents/100).toLocaleString("sl-SI",{style:"currency",currency:"EUR"})}
      · status: samo pregled · brez knjiženja
     </span>
    </div>)}
   </div>
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
