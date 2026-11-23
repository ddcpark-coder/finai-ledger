"use client";
import CrmNext11Panel from "../next11/CrmNext11Panel";
import Crm360Panel from "./Crm360Panel";

export default function CrmWorkspace({context,companyId=1}){
 return <section className="crmWorkspace">
  <div role="status" style={{
   fontSize:10,color:"var(--muted)",marginBottom:9
  }}>
   CRM · <b style={{color:"var(--text)"}}>{context?.level2??"Pregled"}</b>
   {" / "}{context?.level3??"Vse"} · sintetični podatki po podjetjih.
   Prodajni lijak, kontakti in povezani osnutki so del iste predstavitve.
  </div>
  <CrmNext11Panel key={companyId} companyId={companyId}/>
  <Crm360Panel key={"crm360-"+companyId} companyId={companyId} context={context}/>
 </section>;
}
