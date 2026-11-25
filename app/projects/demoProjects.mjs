// NEXT42 — project management in browser memory only; synthetic records, no ERP writes.
const round = value => Math.round((value+Number.EPSILON)*100)/100;
function belongs(rows,companyId) {
  if (!Number.isSafeInteger(companyId) || companyId<1 || !Array.isArray(rows) ||
      rows.some(row=>row.companyId!==companyId)) {
    throw new Error("Dostop do projektov drugega podjetja ni dovoljen.");
  }
}
const validString=(value,label,max=120)=>{
  const text=String(value??"").trim();
  if (text.length<2||text.length>max)throw new Error(label+" mora vsebovati od 2 do "+max+" znakov.");
  return text;
};
export function demoProjectFinance(row) {
  const revenue=Number(row?.revenue),cost=Number(row?.cost);
  if(!Number.isFinite(revenue)||!Number.isFinite(cost)||revenue<0||cost<0)
    throw new Error("Neveljavna sintetična finančna ocena.");
  const margin=round(revenue-cost);
  return {...row,revenue,cost,margin,marginPct:revenue?round(margin/revenue*100):0};
}
export function createDemoProject(rows,companyId,input) {
  belongs(rows,companyId);
  const name=validString(input?.name,"Naziv projekta");
  const partner=validString(input?.partner,"Sintetični partner");
  const revenue=Number(input?.revenue);
  if(!Number.isFinite(revenue)||revenue<0||revenue>10000000)
    throw new Error("Prihodkovna ocena mora biti od 0 do 10.000.000 EUR.");
  let sequence=rows.length+1;
  let id=`SYN-PROJ-${companyId}-${String(sequence).padStart(3,"0")}`;
  while(rows.some(row=>row.id===id)){
    sequence++;
    id=`SYN-PROJ-${companyId}-${String(sequence).padStart(3,"0")}`;
  }
  const project=demoProjectFinance({
    companyId,id,name,partner,status:"Aktiven",due:"Demo",
    owner:"Testni uporabnik",progress:0,revenue:round(revenue),cost:0,order:"—"
  });
  return {project,rows:[project,...rows]};
}
export function addDemoProjectTask(tasks,projects,companyId,projectId,title) {
  belongs(projects,companyId);
  if(!projects.some(x=>x.id===projectId))throw new Error("Projekt ne pripada temu podjetju.");
  const name=validString(title,"Naziv naloge");
  if(!Array.isArray(tasks)||tasks.some(t=>t.companyId!==companyId))
    throw new Error("Naloge drugega podjetja niso dovoljene.");
  const task={companyId,id:`SYN-TASK-${companyId}-${tasks.length+1}`,
    projectId,title:name,status:"Planirano",hours:0,owner:"Testni uporabnik"};
  return {task,tasks:[...tasks,task]};
}
export function logDemoProjectTime(rows,companyId,projectId,hours,hourlyRate=40) {
  belongs(rows,companyId);
  const index=rows.findIndex(row=>row.id===projectId);
  if(index<0)throw new Error("Projekt ne pripada temu podjetju.");
  const h=Number(hours);
  if(!Number.isFinite(h)||h<=0||h>24||Math.round(h*100)!==h)
    throw new Error("Ure morajo biti od 0,01 do 24,00.");
  if(!Number.isFinite(hourlyRate)||hourlyRate<0||hourlyRate>1000)
    throw new Error("Neveljavna sintetična urna postavka.");
  const cost=round(h*hourlyRate);
  const updated=rows.map((row,i)=>i===index?demoProjectFinance({...row,cost:round(row.cost+cost)}):row);
  return {rows:updated,event:{companyId,projectId,hours:h,rate:hourlyRate,cost}};
}
