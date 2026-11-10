"use client";
import {useId} from "react";
import useAdaptiveWorkspace from "../hooks/useAdaptiveWorkspace";
import {DEFAULT_VIEW,updateViewField} from "../lib/workspacePersonalization.mjs";

const MODES=[
 ["split","Dve okni"],
 ["stacked","Navpično"],
 ["list","Samo seznam"],
 ["detail","Samo podrobnosti"]
];

export default function AdaptiveWorkspace({companyId,moduleKey,children}){
 const {view,setView,ready}=useAdaptiveWorkspace(companyId,moduleKey);
 const helpId=useId();
 const set=(key,value)=>setView(prev=>updateViewField(prev,key,value));
 return <section className="finaiAdaptive" data-level={view.level} data-arrangement={view.arrangement}
   style={{"--finai-detail-width":view.detailWidth+"px","--finai-text-zoom":view.textScale/100}}>
   <style>{`
     .finaiAdaptive{min-width:0;container-type:inline-size}
     .finaiAdaptiveBody{zoom:var(--finai-text-zoom);min-width:0}
     .finaiAdaptiveBar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;padding:9px 11px;margin:0 0 12px;background:var(--panel)}
     .finaiAdaptiveBar label{font-size:10px;color:var(--text);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
     .finaiAdaptiveBar select,.finaiAdaptiveBar button{border:1px solid var(--line);border-radius:8px;background:var(--bg2);color:var(--text);min-height:32px;padding:5px 8px;font-size:11px}
     .finaiAdaptiveBar button{cursor:pointer}.finaiAdaptiveBar button:disabled{opacity:.5;cursor:default}
     .finaiAdaptiveBar input{width:95px;accent-color:var(--accent)}
     .finaiAdaptiveBar .finaiAdaptiveCaption{font-size:9px;color:var(--muted);flex-basis:100%}
     .finaiAdaptive :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace){
       grid-template-columns:minmax(0,1fr) minmax(240px,var(--finai-detail-width))!important
     }
     .finaiAdaptive[data-arrangement="stacked"] :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace),
     .finaiAdaptive[data-arrangement="list"] :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace),
     .finaiAdaptive[data-arrangement="detail"] :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace){
       grid-template-columns:minmax(0,1fr)!important
     }
     .finaiAdaptive[data-arrangement="list"] :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace)>:nth-child(2),
     .finaiAdaptive[data-arrangement="detail"] :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace)>:nth-child(1){display:none!important}
     .finaiAdaptive[data-level="simple"] :is(.flow,.statusStrip,.confidenceRow,.aiExplain,.anomaly,.sepaBox,.accountStrip){display:none!important}
     .finaiAdaptive[data-level="simple"] :is(.invoiceRow,.invoiceRow2,.bankRow,.partnerRow,.crmRow)>:nth-child(4),
     .finaiAdaptive[data-level="simple"] :is(.invoiceRow,.invoiceRow2,.bankRow,.partnerRow,.crmRow).head>:nth-child(4){display:none}
     @media(max-width:800px){
       .finaiAdaptive :is(.incomingGrid,.issuedGrid,.bankGrid,.partnerGrid,.vatGrid,.edGrid,.docsGrid,.catalogGrid,.crmGrid,.quotesGrid,.procGrid,.accountingGrid,.identityGrid,.workspace){
         grid-template-columns:minmax(0,1fr)!important
       }
       .finaiAdaptiveBar .finaiAdaptiveCaption{line-height:1.4}
     }
   `}</style>
   <div className="finaiAdaptiveBar" aria-label="Prilagajanje delovnih oken">
     <label htmlFor={helpId+"-level"}>Zahtevnost
       <select id={helpId+"-level"} value={view.level} disabled={!ready}
         onChange={e=>set("level",e.target.value)}>
         <option value="simple">Osnovno</option>
         <option value="standard">Običajno</option>
         <option value="expert">Napredno</option>
       </select>
     </label>
     <label htmlFor={helpId+"-layout"}>Razporeditev
       <select id={helpId+"-layout"} value={view.arrangement} disabled={!ready}
         onChange={e=>set("arrangement",e.target.value)}>
         {MODES.map(([key,label])=><option key={key} value={key}>{label}</option>)}
       </select>
     </label>
     <label htmlFor={helpId+"-scale"}>Velikost prikaza
       <select id={helpId+"-scale"} value={view.textScale} disabled={!ready}
         onChange={e=>set("textScale",Number(e.target.value))}>
         <option value={100}>100 %</option>
         <option value={115}>115 %</option>
         <option value={130}>130 %</option>
       </select>
     </label>
     <label htmlFor={helpId+"-width"}>Širina podrobnosti
       <input id={helpId+"-width"} type="range" min="260" max="700" step="20"
         value={view.detailWidth} disabled={!ready||view.arrangement!=="split"}
         onChange={e=>set("detailWidth",Number(e.target.value))}/>
       <span>{view.detailWidth} px</span>
     </label>
     <button type="button" disabled={!ready} onClick={()=>setView(DEFAULT_VIEW)}>Ponastavi pogled</button>
     <span className="finaiAdaptiveCaption" role="note">Nastavitve veljajo le za ta modul in izbrano podjetje; shranjene so lokalno v brskalniku. Skrita polja ne spreminjajo podatkov ali uporabniških dovoljenj.</span>
   </div>
   <div className="finaiAdaptiveBody">{children}</div>
 </section>;
}
