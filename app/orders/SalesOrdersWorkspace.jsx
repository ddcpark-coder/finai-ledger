"use client";
import BusinessChainPanel from "../business/BusinessChainPanel";
import AdaptivePaneGrid from "../components/AdaptivePaneGrid";
import {DEMO_WOO_ORDERS,importSyntheticCmsOrders} from "../integrations/cmsOrderAdapter.mjs";
import {useEffect,useMemo,useState} from "react";
const orders=[
{companyId:1,id:"NAR-2026-0008",partner:"ABC d.o.o.",status:"V izvedbi",gross:2989,delivery:"12. 11. 2026",source:"PON-2026-0042",reserved:"Delno"},
{companyId:1,id:"NAR-2026-0007",partner:"Gamma GmbH",status:"Pripravljeno",gross:5200,delivery:"08. 11. 2026",source:"PON-2026-0041",reserved:"Da"},
{companyId:1,id:"NAR-2026-0006",partner:"Studio Kreativ s.p.",status:"Dostavljeno",gross:1195.6,delivery:"03. 11. 2026",source:"Ročno",reserved:"—"},
{companyId:1,id:"NAR-2026-0005",partner:"Delta d.o.o.",status:"Fakturirano",gross:2196,delivery:"31. 10. 2026",source:"PON-2026-0038",reserved:"Da"},
{companyId:2,id:"SYN-NAR-B01",partner:"Sintetični partner B",status:"V izvedbi",gross:85,delivery:"11. 11. 2026",source:"Ročno (demo)",reserved:"—"},
{companyId:3,id:"SYN-NAR-C01",partner:"Sintetični partner C",status:"Pripravljeno",gross:150,delivery:"12. 11. 2026",source:"Ročno (demo)",reserved:"—"}
];
export default function SalesOrdersWorkspace({context,companyId}){
 const section=context?.level2??"Pregled";
 const subView=context?.level3??"Vsa";
 const [q,setQ]=useState("");
 const [filter,setFilter]=useState("Vsi");
 const [sel,setSel]=useState(null);
 const [cmsOrders,setCmsOrders]=useState([]);
 const [cmsNotice,setCmsNotice]=useState("");
 const allOrders=useMemo(()=>[...orders,...cmsOrders],[cmsOrders]);
 const rows=useMemo(()=>allOrders.filter(x=>{
   if(x.companyId!==companyId)return false;
   const sectionMatch=section==="Pregled"?(subView==="Nova"?false:subView==="Aktivna"?["V izvedbi","Pripravljeno"].includes(x.status):true)
     :section==="Izvedba"?(subView==="V delu"?x.status==="V izvedbi":subView==="Pripravljeno"?x.status==="Pripravljeno":false)
     :section==="Rezervacije"?(subView==="Pomanjkanje"?x.reserved==="Delno":subView==="Sproščene"?false:x.reserved!=="—")
     :section==="Dobavnice"?(subView==="Priprava"?x.status==="Pripravljeno":subView==="Dostavljeno"?x.status==="Dostavljeno":false)
     :section==="Fakturiranje"?(subView==="Za račun"?x.status==="Dostavljeno":subView==="Fakturirano"?x.status==="Fakturirano":false):true;
   return (!q||[x.id,x.partner,x.source].join(" ").toLowerCase().includes(q.toLowerCase()))
     &&(filter==="Vsi"||x.status===filter)&&sectionMatch;
 }),[allOrders,companyId,q,filter,section,subView]);
 const activeSel=rows.find(row=>row.id===sel?.id)??rows[0]??null;
 useEffect(()=>{
   if(rows.length&&!rows.some(row=>row.id===sel?.id)){
     setSel(rows[0]);
   }
 },[rows,sel?.id]);
 useEffect(()=>{
   setSel(null);setQ("");setFilter("Vsi");setCmsNotice("");
 },[companyId]);
 const importCms=()=>{
   try{
     const result=importSyntheticCmsOrders(cmsOrders,DEMO_WOO_ORDERS,companyId);
     setCmsOrders(result.orders);
     setCmsNotice("Uvoženo: "+result.added+" · že obstoječih: "+result.duplicates+
       ". To so samo testna naročila; zaloge in računovodstvo niso spremenjeni.");
     setFilter("Vsi");setQ("");
   }catch(error){setCmsNotice(error.message)}
 };
 const resetCms=()=>{
   setCmsOrders(old=>old.filter(x=>x.companyId!==companyId));
   setCmsNotice("CMS demonstracija ponastavljena samo za izbrano podjetje.");
 };

 return <section className="so"><style>{`
 .sog{display:grid;grid-template-columns:minmax(0,1.45fr) 370px;gap:10px}.soc{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.soh{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.soh h3{margin:0;font-size:12px}.tools{display:flex;gap:7px;flex-wrap:wrap}.tools input,.tools select{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 9px;font-size:9px}
 .sor{display:grid;grid-template-columns:1fr 1.2fr .85fr .8fr .75fr;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);align-items:center;width:100%;background:transparent;color:var(--text);border-left:0;border-right:0;border-top:0;text-align:left}.sor.head{font-size:8px;color:var(--muted);text-transform:uppercase}.sor b{font-size:10px}.sor small{display:block;color:var(--muted);font-size:8px}.st{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px;color:var(--accent2)}.detail{padding:14px}.detail h3{margin:8px 0 2px}.detail>small{color:var(--muted);font-size:9px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.meta div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.meta small,.meta b{display:block}.meta small{font-size:8px;color:var(--muted)}.meta b{font-size:10px;margin-top:3px}.sec{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.sec h4{margin:0 0 8px;font-size:9px;color:var(--muted);text-transform:uppercase}.line{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:9px}.flow{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px}.flow div{border:1px solid var(--line);border-radius:8px;padding:7px;text-align:center;font-size:8px;color:var(--muted)}.flow .on{border-color:var(--accent);color:var(--text)}
 @media(max-width:1100px){.sog{grid-template-columns:1fr}}@media(max-width:760px){.sor{grid-template-columns:1fr 1fr .8fr}.sor>*:nth-child(3),.sor>*:nth-child(4){display:none}.meta{grid-template-columns:1fr}.flow{grid-template-columns:repeat(3,1fr)}}
 `}</style>
 <div role="status" style={{fontSize:10,color:"var(--muted)",marginBottom:9}}>Naročila · <b style={{color:"var(--text)"}}>{section} / {subView}</b> · demonstracijski podatki</div>
 <div className="flow"><div className="on">Potrjeno</div><div className="on">Izvedba</div><div>Pripravljeno</div><div>Dobavnica</div><div>Račun</div><div>Zaključeno</div></div>
 <BusinessChainPanel companyId={companyId} moduleKey="orders"/>
 <section aria-label="CMS integracija – demonstracija WooCommerce"
   style={{border:"1px solid var(--line)",borderRadius:12,padding:12,marginBottom:10,background:"var(--panel)"}}>
   <h3 style={{fontSize:13,margin:"0 0 7px"}}>CMS / WooCommerce – prikaz integracije naročil</h3>
   <p style={{fontSize:10,color:"var(--muted)",lineHeight:1.5}}>
     Sintetična naročila iz lokalnega vzorca. Brez povezave s trgovino, brez dostopa do uporabnikov, plačil,
     zalog, računovodstva ali pošiljanja. Podjetje {companyId} je izolirano.
   </p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button type="button" className="primary" onClick={importCms}>Uvozi vzorčna CMS naročila</button>
     <button type="button" className="secondary" onClick={resetCms}>Ponastavi CMS demo</button>
   </div>
   {cmsNotice&&<p role="status" style={{fontSize:10,margin:"8px 0 0"}}>{cmsNotice}</p>}
 </section>
 <AdaptivePaneGrid className="sog"><article className="soc"><div className="soh"><h3>Naročila kupcev · {section} / {subView}</h3><div className="tools"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Išči naročilo ali partnerja ..."/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Vsi</option><option>V izvedbi</option><option>Pripravljeno</option><option>Dostavljeno</option><option>Fakturirano</option><option>Za pregled</option></select><button className="primary" type="button" disabled title="Pravo ustvarjanje naročil še ni povezano">Novo naročilo (v pripravi)</button></div></div><div className="sor head"><span>Naročilo</span><span>Partner</span><span>Dostava</span><span>Vrednost</span><span>Status</span></div>{!rows.length&&<p style={{padding:12,color:"var(--muted)",fontSize:10}}>Ni naročil za izbrani podpogled.</p>}{rows.map(x=><button className="sor" key={x.id} onClick={()=>setSel(x)}><span><b>{x.id}</b><small>{x.source}</small></span><span><b>{x.partner}</b><small>Rezervacija: {x.reserved}</small></span><span>{x.delivery}</span><b>{x.gross.toFixed(2)} €</b><span className="st">{x.status}</span></button>)}</article>
 {rows.length>0&&<aside className="soc detail"><span className="st">{activeSel.status}</span><h3>{activeSel.id}</h3><small>{activeSel.partner} · {activeSel.source}</small><div className="meta"><div><small>Vrednost</small><b>{activeSel.gross.toFixed(2)} €</b></div><div><small>Želeni datum</small><b>{activeSel.delivery}</b></div><div><small>Rezervacija</small><b>{activeSel.reserved}</b></div><div><small>Vir</small><b>{activeSel.source}</b></div></div><div className="sec"><h4>Postavke</h4>{activeSel.lines?.length
 ?activeSel.lines.map((line,i)=><div className="line" key={i}><span>{line.name}</span><b>{line.quantity} · {line.grossCents/100} €</b></div>)
 :<><div className="line"><span>Reklamna tabla 100 × 70 cm</span><b>20 kos (demo)</b></div>
   <div className="line"><span>Montaža na lokaciji</span><b>12 h (demo)</b></div></>}</div><div className="sec"><h4>Naslednji koraki</h4><div style={{display:"grid",gap:7}}><button className="primary" type="button" disabled>Premakni v naslednjo fazo (v pripravi)</button><button className="secondary" disabled>Rezervacije (v pripravi)</button><button className="secondary" disabled>Dobavnica (v pripravi)</button><button className="secondary" disabled>Račun (v pripravi)</button><button className="secondary" disabled>Revizija (v pripravi)</button></div></div></aside>}{rows.length===0&&<aside className="soc" style={{padding:14,color:"var(--muted)",fontSize:10}}>Za izbrani pogled ni podatkov. Izberi drug podmodul ali filter.</aside>}</AdaptivePaneGrid></section>
}
