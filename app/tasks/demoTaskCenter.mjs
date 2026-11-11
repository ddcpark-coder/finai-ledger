// FinAI synthetic task queue. Display/workflow exercise only: no approvals,
// posting, reminders, notifications, or changes to actual business records.
const tasks=Object.freeze([
 {id:"A-IN-01",companyId:1,title:"Preglej prejeti vzorčni račun",module:"incoming_invoices",view:"Odobritve",subview:"Čaka mene",category:"Računi",priority:"high",dueDays:-2},
 {id:"A-DOC-02",companyId:1,title:"Podpiši sintetično dobavnico",module:"documents",view:"Dobavnice",subview:"Za podpis",category:"Dokumenti",priority:"high",dueDays:0},
 {id:"A-BANK-03",companyId:1,title:"Preveri predlog bančnega ujemanja",module:"banking",view:"Usklajevanje",subview:"Predlogi",category:"Banka",priority:"normal",dueDays:2},
 {id:"A-INV-04",companyId:1,title:"Preglej osnutek izdanega računa",module:"issued_invoices",view:"Pregled",subview:"Osnutki",category:"Računi",priority:"normal",dueDays:6},
 {id:"B-DOC-01",companyId:2,title:"Podpiši dobavnico podjetja B",module:"documents",view:"Dobavnice",subview:"Za podpis",category:"Dokumenti",priority:"high",dueDays:0},
 {id:"B-ORDER-02",companyId:2,title:"Preglej sintetično naročilo",module:"orders",view:"Pregled",subview:"Vsa",category:"Prodaja",priority:"normal",dueDays:3},
 {id:"C-DOC-01",companyId:3,title:"Preglej dobavnico podjetja C",module:"documents",view:"Dobavnice",subview:"Za podpis",category:"Dokumenti",priority:"normal",dueDays:1}
]);
export function assertTaskCompany(companyId){
 if(!Number.isSafeInteger(companyId)||![1,2,3].includes(companyId))
  throw new Error("Neveljavno demonstracijsko podjetje.");
}
export function taskSessionKey(companyId){
 assertTaskCompany(companyId);
 return "finai:synthetic-tasks:v1:company-"+companyId;
}
export function normalizeCompletedTasks(companyId,value){
 assertTaskCompany(companyId);
 if(!Array.isArray(value))return [];
 const allowed=new Set(tasks.filter(x=>x.companyId===companyId).map(x=>x.id));
 return [...new Set(value.filter(id=>typeof id==="string"&&allowed.has(id)))];
}
export function toggleCompletedDemoTask(companyId,completed,taskId){
 const valid=new Set(tasks.filter(x=>x.companyId===companyId).map(x=>x.id));
 if(!valid.has(taskId))throw new Error("Naloga ne pripada izbranemu podjetju.");
 const old=normalizeCompletedTasks(companyId,completed);
 return old.includes(taskId)?old.filter(id=>id!==taskId):[...old,taskId];
}
export function demoTaskRoute(task){
 if(!tasks.some(x=>x.id===task?.id&&x.companyId===task?.companyId&&
     x.module===task?.module&&x.view===task?.view&&x.subview===task?.subview))
  throw new Error("Neveljavna demonstracijska povezava.");
 const params=new URLSearchParams({module:task.module,view:task.view,subview:task.subview});
 return "/?"+params.toString();
}
const scopes=new Set(["all","today","week","overdue","done"]);
export function listDemoTasks(companyId,{scope="all",query="",completed=[]}={}){
 assertTaskCompany(companyId);
 if(!scopes.has(scope))throw new Error("Neznan filter nalog.");
 const done=new Set(normalizeCompletedTasks(companyId,completed));
 const q=String(query).trim().toLocaleLowerCase("sl-SI");
 return tasks.filter(x=>{
  if(x.companyId!==companyId)return false;
  const isDone=done.has(x.id);
  if(scope==="done")return isDone&&(!q||[x.title,x.category].join(" ").toLocaleLowerCase("sl-SI").includes(q));
  if(isDone)return false;
  if(scope==="today"&&x.dueDays!==0)return false;
  if(scope==="week"&&(x.dueDays<0||x.dueDays>7))return false;
  if(scope==="overdue"&&x.dueDays>=0)return false;
  return !q||[x.title,x.category].join(" ").toLocaleLowerCase("sl-SI").includes(q);
 }).sort((a,b)=>a.dueDays-b.dueDays||
    (a.priority==="high"?-1:1)-(b.priority==="high"?-1:1)||
    a.id.localeCompare(b.id))
 .map(x=>({...x,completed:done.has(x.id)}));
}
export function dueDescription(days){
 if(days<0)return "Zamujeno (demo)";
 if(days===0)return "Danes (demo)";
 if(days===1)return "Jutri (demo)";
 return "Čez "+days+" dni (demo)";
}
