"use client";

import {useEffect,useMemo,useState} from "react";
import {
 demoTaskRoute,dueDescription,listDemoTasks,normalizeCompletedTasks,
 taskSessionKey,toggleCompletedDemoTask
} from "./demoTaskCenter.mjs";

const scopedOptions=[
 ["all","Odprte"],["overdue","Zamujene"],["today","Danes"],
 ["week","Ta teden"],["done","Opravljene (demo)"]
];

export default function TaskCenter({companyId,compact=false,initialScope="all"}){
 const key=taskSessionKey(companyId);
 const [completed,setCompleted]=useState([]);
 const [readyKey,setReadyKey]=useState(null);
 const [scope,setScope]=useState(initialScope);
 const [query,setQuery]=useState("");
 const [notice,setNotice]=useState("");

 useEffect(()=>{
  let saved=[];
  try{saved=normalizeCompletedTasks(companyId,JSON.parse(window.sessionStorage.getItem(key)))}catch{}
  setReadyKey(null);setCompleted(saved);setQuery("");setScope(initialScope);setNotice("");
  setReadyKey(key);
 },[key,companyId,initialScope]);

 useEffect(()=>{
  if(readyKey!==key)return;
  try{window.sessionStorage.setItem(key,JSON.stringify(completed))}catch{}
 },[readyKey,key,completed]);

 const records=useMemo(()=>listDemoTasks(companyId,{scope:compact?"all":scope,query:compact?"":query,completed}),
  [companyId,scope,query,compact,completed]);
 const shown=compact?records.slice(0,3):records;
 const mark=id=>{
  if(readyKey!==key)return;
  try{
   setCompleted(prev=>toggleCompletedDemoTask(companyId,prev,id));
   setNotice("Sprememba velja samo za to demonstracijsko sejo in podjetje.");
  }catch(error){setNotice(error.message)}
 };

 return <section className={"finaiTaskCenter"+(compact?" finaiTaskCompact":"")}
   aria-label={compact?"Pregled demonstracijskih opravil":"Moje demonstracijske naloge"}>
  <style>{`
    .finaiTaskCenter{border:1px solid var(--line);border-radius:14px;background:var(--panel);margin:10px 0;overflow:hidden}
    .finaiTaskTop{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:13px 15px;border-bottom:1px solid var(--line);flex-wrap:wrap}
    .finaiTaskTop h3{font-size:14px;margin:0 0 4px}.finaiTaskTop p{font-size:10px;color:var(--muted);margin:0;line-height:1.5}
    .finaiTaskFilters{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:11px 14px;border-bottom:1px solid var(--line)}
    .finaiTaskFilters select,.finaiTaskFilters input{border-radius:8px;padding:8px 10px;border:1px solid var(--line);background:var(--bg2);color:var(--text);font-size:11px;min-height:36px}
    .finaiTaskFilters input{flex:1;min-width:180px}
    .finaiTaskGrid{display:grid;grid-template-columns:minmax(0,2fr) minmax(105px,.5fr) minmax(95px,.45fr) minmax(170px,.85fr);gap:9px;align-items:center}
    .finaiTaskHead{padding:9px 14px;background:var(--bg2);font-size:10px;color:var(--muted);font-weight:600}
    .finaiTaskRow{padding:11px 14px;border-top:1px solid var(--line);font-size:11px}
    .finaiTaskRow strong{display:block;font-size:12px}.finaiTaskRow small{display:block;color:var(--muted);font-size:10px;margin-top:4px}
    .finaiTaskBadge{font-size:10px;border:1px solid var(--line);border-radius:99px;padding:5px 8px;display:inline-flex}
    .finaiTaskActions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
    .finaiTaskActions a{color:var(--accent);font-weight:600;text-decoration:underline;text-underline-offset:3px;font-size:11px}
    .finaiTaskActions button{border:1px solid var(--line);border-radius:8px;padding:7px;background:var(--bg2);color:var(--text);font-size:10px;cursor:pointer}
    .finaiTaskActions button:disabled{opacity:.55}
    .finaiTaskFoot{padding:9px 14px;color:var(--muted);font-size:10px;border-top:1px solid var(--line)}
    .finaiTaskFoot a{color:var(--accent)}
    @media(max-width:760px){
      .finaiTaskGrid{grid-template-columns:minmax(0,1fr) auto;gap:8px}
      .finaiTaskHead{display:none}
      .finaiTaskRow>[data-col="category"],.finaiTaskRow>[data-col="deadline"]{display:none}
      .finaiTaskActions{justify-content:flex-end;max-width:170px}
      .finaiTaskActions a,.finaiTaskActions button{font-size:11px;padding:7px}
    }
  `}</style>
  <div className="finaiTaskTop">
   <div><h3>{compact?"Moje naloge – hitri pregled":"Moje naloge – delovni seznam"}</h3>
     <p>Podjetje {companyId} · samo sintetična opravila. Označitev ne potrdi računov, dobavnic ali knjižb.</p>
   </div>
   <strong style={{fontSize:13}}>{listDemoTasks(companyId,{completed}).length} odprtih</strong>
  </div>
  {!compact&&<div className="finaiTaskFilters">
   <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10}}>Prikaz
    <select aria-label="Filter opravil" value={scope} onChange={e=>setScope(e.target.value)}>
      {scopedOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
   </label>
   <input aria-label="Išči med opravili" value={query} onChange={e=>setQuery(e.target.value)}
     placeholder="Išči naslov ali vrsto opravila ..."/>
  </div>}
  <div className="finaiTaskGrid finaiTaskHead" aria-hidden="true">
   <span>Naloga</span><span>Vrsta</span><span>Rok</span><span style={{textAlign:"right"}}>Dejanja</span>
  </div>
  {!shown.length&&<p style={{padding:14,fontSize:11,color:"var(--muted)"}}>Ni demonstracijskih opravil za izbrani filter.</p>}
  {shown.map(task=><div key={task.id} className="finaiTaskGrid finaiTaskRow">
   <div data-col="task">
    <strong>{task.title}</strong>
    <small>{task.id} · {task.priority==="high"?"Visoka prioriteta":"Običajna prioriteta"}</small>
   </div>
   <div data-col="category"><span className="finaiTaskBadge">{task.category}</span></div>
   <div data-col="deadline"><span>{task.completed?"Opravljeno (demo)":dueDescription(task.dueDays)}</span></div>
   <div className="finaiTaskActions">
    <a href={demoTaskRoute(task)}>Odpri modul</a>
    <button type="button" disabled={readyKey!==key}
     onClick={()=>mark(task.id)}>
      {task.completed?"Vrni med odprte":"Označi opravljeno"}
    </button>
   </div>
  </div>)}
  <div className="finaiTaskFoot">
   {compact&&<a href="/?module=dashboard&view=Moje+naloge&subview=Danes">Poglej moja opravila</a>}
   {notice&&<p role="status">{notice}</p>}
   <span>Roki in prednostne naloge so demonstracijski; ne uporabljaj jih za dejanska poslovna opozorila.</span>
  </div>
 </section>;
}
