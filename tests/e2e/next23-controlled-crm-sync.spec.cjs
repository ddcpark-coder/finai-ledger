const {test,expect}=require("@playwright/test");

const fixtures={
 1:[
  ["SYN-CRM-101","PE-01","qualification",1250000,1],
  ["SYN-CRM-102","PE-01","proposal",860000,1],
  ["SYN-CRM-103","PE-02","negotiation",2180000,1],
 ],
 2:[["SYN-CRM-201","PE-11","discovery",920000,1]],
};
const row=(companyId,data)=>({
 demo_only:true,company_id:companyId,deal_id:data[0],
 unit_code:data[1],stage:data[2],value_cents:data[3],version:data[4]
});
async function installSyntheticApi(page,{conflict=false}={}){
 const records=new Map(Object.entries(fixtures).map(([id,list])=>
  [Number(id),list.map(x=>[...x])]));
 const writes=[],reads=[];
 let failOnce=conflict;
 const wire=async(route)=>{
  const request=route.request(),url=new URL(request.url());
  const match=url.pathname.match(
   /^\/api\/companies\/([12])\/demo\/crm\/opportunities(?:\/(SYN-CRM-[A-Z0-9-]+)\/advance)?$/);
  if(!match)return route.continue();
  const companyId=Number(match[1]),dealId=match[2];
  const rows=records.get(companyId);
  if(request.method()==="GET"){
   reads.push(companyId);
   return route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({demo_only:true,data:rows.map(x=>row(companyId,x))})});
  }
  if(request.method()!=="POST")return route.fulfill({status:405});
  const body=request.postDataJSON();
  writes.push({companyId,dealId,body});
  if(dealId){
   if(!request.headers()["x-xsrf-token"])return route.fulfill({status:419});
   const matchRow=rows.find(x=>x[0]===dealId);
   if(!matchRow)return route.fulfill({status:404});
   if(failOnce){
    failOnce=false;
    matchRow[2]="discovery";matchRow[4]=2;
    return route.fulfill({status:409,contentType:"application/json",
     body:JSON.stringify({message:"Concurrent update"})});
   }
   if(matchRow[4]!==body.expected_version)
    return route.fulfill({status:409,contentType:"application/json",
     body:JSON.stringify({message:"Stale version"})});
   matchRow[2]=body.next_stage;
   matchRow[4]+=1;
   return route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({demo_only:true,data:row(companyId,matchRow)})});
  }
  // Fully populated synthetic fixtures: bootstrap POST should never run.
  return route.fulfill({status:409,contentType:"application/json",
   body:JSON.stringify({message:"Unexpected bootstrap"})});
 };
 await page.route("**/sanctum/csrf-cookie",route=>route.fulfill({
  status:204,headers:{"Cache-Control":"no-store"}
 }));
 await page.route("**/api/companies/*/demo/crm/opportunities**",wire);
 return {records,reads,writes};
}
test("manually connect, pull newer CRM versions and push exactly one conditional stage",async({page,context,isMobile})=>{
 const api=await installSyntheticApi(page);
 await context.addCookies([{
  name:"XSRF-TOKEN",value:"demo%3Dtoken",url:"http://127.0.0.1:3000/"
 }]);
 const unsafeWrites=[];
 page.on("request",request=>{
  if(["POST","PUT","PATCH","DELETE"].includes(request.method()) &&
    !request.url().includes("/demo/crm/opportunities"))
    unsafeWrites.push(request.url());
 });
 await page.goto("/?module=crm");
 await page.locator(".topbarMain select.companySwitch").selectOption("1");
 const crm=page.getByRole("region",{
  name:"FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
 });
 await crm.getByRole("button",{name:"Poveži lokalno testno CRM bazo"}).click();
 await expect(crm.getByRole("button",{name:"Preveri spremembe CRM"})).toBeVisible();
 await expect(crm).toContainText("verzija 1");
 expect(api.writes).toEqual([]); // explicit connection was read-only
 api.records.get(1)[0][2]="discovery";
 api.records.get(1)[0][4]=2;
 await crm.getByRole("button",{name:"Preveri spremembe CRM"}).click();
 await expect(crm).toContainText("verzija 2");
 await expect(crm.getByRole("button",{name:"Premakni v: Ponudba"})).toBeVisible();
 await crm.getByRole("button",{name:"Premakni v: Ponudba"}).click();
 await expect(crm).toContainText("verzija 3");
 expect(api.writes).toEqual([{
  companyId:1,dealId:"SYN-CRM-101",
  body:{demo_only:true,expected_version:2,next_stage:"proposal"}
 }]);
 await page.locator(".topbarMain select.companySwitch").selectOption("2");
 await expect(crm).toContainText("SYN-CRM-201");
 await expect(crm.getByRole("button",{name:"Poveži lokalno testno CRM bazo"})).toBeVisible();
 await page.locator(".topbarMain select.companySwitch").selectOption("1");
 await expect(crm).toContainText("SYN-CRM-101");
 await expect(crm).toContainText("verzija 3");
 expect(unsafeWrites).toEqual([]);
});

test("server version conflict disables writes until explicit refresh, no POST retry",async({page,context})=>{
 const api=await installSyntheticApi(page,{conflict:true});
 await context.addCookies([{
  name:"XSRF-TOKEN",value:"demo%3Dtoken",url:"http://127.0.0.1:3000/"
 }]);
 await page.goto("/?module=crm");
 const crm=page.getByRole("region",{
  name:"FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
 });
 await crm.getByRole("button",{name:"Poveži lokalno testno CRM bazo"}).click();
 await crm.getByRole("button",{name:"Premakni v: Odkrivanje"}).click();
 await expect(crm.getByRole("alert")).toContainText("Konflikt različic");
 await expect(crm.getByRole("button",{name:"Premakni v: Odkrivanje"})).toBeDisabled();
 expect(api.writes).toHaveLength(1);
 await crm.getByRole("button",{name:"Preveri spremembe CRM"}).click();
 await expect(crm.getByRole("alert")).toHaveCount(0);
 await expect(crm).toContainText("verzija 2");
 await expect(crm.getByRole("button",{name:"Premakni v: Ponudba"})).toBeEnabled();
 await crm.getByRole("button",{name:"Premakni v: Ponudba"}).click();
 await expect(crm).toContainText("verzija 3");
 expect(api.writes).toHaveLength(2);
 expect(api.writes[1].body.expected_version).toBe(2);
});


test("commerce reviewer conflict performs GET-only refresh and never retries terminal POST",async({page,context})=>{
 await context.addCookies([{
  name:"XSRF-TOKEN",value:"demo%3Dtoken",url:"http://127.0.0.1:3000/"
 }]);
 let status="review",posts=0,reads=0;
 await page.route("**/sanctum/csrf-cookie",route=>route.fulfill({status:204}));
 await page.route("**/api/companies/1/demo/commerce-review**",route=>{
  const request=route.request();
  if(request.method()==="POST"){
   posts++;status="hold";
   return route.fulfill({status:409,contentType:"application/json",
    body:JSON.stringify({message:"Decision already final"})});
  }
  if(request.method()==="GET"){
   reads++;
   const row={id:7,external_order_id:"SYN-ORDER-TEST-001",
    provider:"woocommerce",warehouse_id:2,total_cents:12500,
    line_count:1,status,demo_only:true,posting:false};
   return route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({data:{
     items:[row],next_cursor:null,demo_only:true,real_sync_enabled:false
    }})});
  }
  return route.fulfill({status:405});
 });
 page.on("dialog",dialog=>dialog.accept());
 await page.goto("/?module=integrations");
 const desk=page.getByRole("region",{
  name:"Pregledna vrsta sintetičnih trgovinskih naročil"
 });
 await desk.getByRole("button",{name:"Osveži lokalno pregledno vrsto"}).click();
 await expect(desk).toContainText("Čaka pregled");
 await desk.getByRole("button",{name:"Pregledano (test)"}).click();
 await expect(desk).toContainText("Konflikt pregleda");
 await expect(desk).toContainText("Zadržano");
 expect(reads).toBe(2);
 expect(posts).toBe(1);
 await expect(desk.getByRole("button",{name:"Pregledano (test)"})).toHaveCount(0);
});


test("company changed during pending CRM GET cannot apply stale tenant data or leave UI busy",async({page})=>{
 let resolveRequest,releaseRequest;
 const requested=new Promise(resolve=>{resolveRequest=resolve});
 const held=new Promise(resolve=>{releaseRequest=resolve});
 let networkWrites=0;
 page.on("request",req=>{
  if(["POST","PUT","PATCH","DELETE"].includes(req.method()))
   networkWrites++;
 });
 await page.route("**/api/companies/1/demo/crm/opportunities",async route=>{
  resolveRequest();
  await held;
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({demo_only:true,data:fixtures[1].map(x=>row(1,x))})});
 });
 await page.goto("/?module=crm");
 const company=page.locator(".topbarMain select.companySwitch");
 const crm=page.getByRole("region",{
  name:"FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
 });
 await crm.getByRole("button",{name:"Poveži lokalno testno CRM bazo"}).click();
 await requested;
 await company.selectOption("2");
 await expect(crm).toContainText("SYN-CRM-201");
 releaseRequest();
 await expect(crm.getByRole("button",{
  name:"Poveži lokalno testno CRM bazo"
 })).toBeEnabled();
 await expect(crm).not.toContainText("SYN-CRM-101");
 expect(networkWrites).toBe(0);
});
