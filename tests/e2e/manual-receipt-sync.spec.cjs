const {test,expect}=require("@playwright/test");

async function prepareDemoEnvelope(page){
 await page.goto("/field/");
 const canvas=page.getByLabel("Površina za demonstracijski podpis");
 const rect=await canvas.boundingBox();
 expect(rect).toBeTruthy();
 const start={x:Math.round(rect.x+20),y:Math.round(rect.y+40),id:1};
 const end={x:Math.round(rect.x+110),y:Math.round(rect.y+70),id:1};
 if(page.viewportSize().width<=480){
  // The mobile workflow uses actual browser TouchEvent handlers. Playwright
  // CDP touch injection does not consistently produce pointer movement in
  // iPhone viewport emulation across Chromium runner revisions.
  await canvas.evaluate(el=>{
   const rect=el.getBoundingClientRect();
   const point=(x,y)=>new Touch({identifier:1,target:el,
    clientX:rect.left+x,clientY:rect.top+y,
    pageX:rect.left+x,pageY:rect.top+y,
    screenX:rect.left+x,screenY:rect.top+y});
   const emit=(type,touch,active)=>{
    el.dispatchEvent(new TouchEvent(type,{
     bubbles:true,cancelable:true,
     touches:active?[touch]:[],
     targetTouches:active?[touch]:[],
     changedTouches:[touch]
    }));
   };
   emit("touchstart",point(20,40),true);
   for(let i=1;i<=8;i++)emit("touchmove",point(20+i*10,40+i*4),true);
   emit("touchend",point(100,72),false);
  });
 }else{
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps:7});
  await page.mouse.up();
 }
 await page.getByRole("checkbox",{name:/Potrjujem, da sem pregledal/}).check();
 await expect(page.getByRole("button",{name:"Zaključi demo prevzem"})).toBeEnabled();
 await page.getByRole("button",{name:"Zaključi demo prevzem"}).click();
 await expect(page.getByText("SHA-256 dokazila:")).toBeVisible();
 await page.getByLabel("Lokalno testno geslo").fill("synthetic-outbox-passphrase-123");
 await page.getByRole("button",{name:"Shrani šifrirano"}).click();
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
 await page.getByRole("button",{name:"Pripravi lokalni demo zahtevek"}).click();
 await expect(page.getByText("Pripravljen za ročno preverbo")).toBeVisible();
}
test("offline synthetic outbox persists encrypted request without sending it",async({page,context})=>{
 let writes=0;
 page.on("request",request=>{if(["POST","PUT","DELETE"].includes(request.method()))writes++});
 await prepareDemoEnvelope(page);
 await page.reload();
 await expect(page.getByText("Pripravljen za ročno preverbo")).toBeVisible();
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
 await context.setOffline(true);
 await page.goto("/field/");
 await expect(page.getByText("Pripravljen za ročno preverbo")).toBeVisible();
 await expect(page.getByRole("button",{name:"Ročno pošlji v lokalni testni API"})).toBeDisabled();
 expect(writes).toBe(0);
 await context.setOffline(false);
});
test("409 conflict stops upload, preserves encrypted local proof and requires manual review",async({page,context})=>{
 await context.addCookies([{name:"XSRF-TOKEN",value:"synthetic-test-csrf",url:"http://127.0.0.1:3000"}]);
 let posts=0;
 await page.route("**/sanctum/csrf-cookie",async route=>{
  await route.fulfill({status:204,body:""});
 });
 await page.route("**/api/companies/*/demo/sync-receipts/*",async route=>{
  const request=route.request();
  if(request.method()==="POST"){
   posts++;
   const body=request.postDataJSON();
   expect(body.client_event_id).toMatch(/^[0-9a-f-]{36}$/i);
   expect(body.envelope.companyId).toBe(1);
   expect(body.expected_version).toBe(0);
   await route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({message:"Conflict"})});
  }else{
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
    data:{company_id:1,document_id:"SYNTH-DOB-2026-0048",
     version:2,demo_only:true,real_sync_enabled:false}
   })});
  }
 });
 await prepareDemoEnvelope(page);
 const sync=page.getByRole("button",{name:"Ročno pošlji v lokalni testni API"});
 await expect(sync).toBeEnabled();
 await sync.click();
 await expect(page.getByText("KONFLIKT – ročni pregled")).toBeVisible();
 await expect(page.getByText(/KONFLIKT: na strežniku je že verzija 2/)).toBeVisible();
 await expect(sync).toBeDisabled();
 expect(posts).toBe(1);
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
 const [download]=await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button",{name:"Izvozi šifriran zahtevek"}).click()
 ]);
 expect(download.suggestedFilename()).toContain("sifriran-demo-zahtevek.json");
 page.once("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:"Odstrani samo zahtevek"}).click();
 await expect(page.getByText("KONFLIKT – ročni pregled")).toHaveCount(0);
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
});
test("same immutable event succeeds only when server returns explicit demo-only acknowledgment",async({page,context})=>{
 await context.addCookies([{name:"XSRF-TOKEN",value:"synthetic-test-csrf",url:"http://127.0.0.1:3000"}]);
 let posts=0;
 await page.route("**/sanctum/csrf-cookie",async route=>route.fulfill({status:204,body:""}));
 await page.route("**/api/companies/*/demo/sync-receipts/*",async route=>{
  const request=route.request();
  if(request.method()!=="POST")throw new Error("No preflight GET required for immutable UUID.");
  posts++;
  const body=request.postDataJSON();
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   data:{company_id:1,document_id:"SYNTH-DOB-2026-0048",version:1,
    already_received:false,business_document_created:false,
    encrypted_demo_envelope_stored:true,real_sync_enabled:false,demo_only:true}
  })});
 });
 await prepareDemoEnvelope(page);
 await page.getByRole("button",{name:"Ročno pošlji v lokalni testni API"}).click();
 await expect(page.getByText("Testno potrjen")).toBeVisible();
 expect(posts).toBe(1);
 await page.reload();
 await expect(page.getByText("Testno potrjen")).toBeVisible();
 await expect(page.getByRole("button",{name:"Ročno pošlji v lokalni testni API"})).toBeDisabled();
});
