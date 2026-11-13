const {test,expect}=require("@playwright/test");

async function signSynthetic(page){
 const canvas=page.getByLabel("Površina za demonstracijski podpis");
 const box=await canvas.boundingBox();
 expect(box).toBeTruthy();
 if(page.viewportSize().width<=480){
  await canvas.evaluate(el=>{
   const rect=el.getBoundingClientRect();
   const point=(x,y)=>new Touch({identifier:1,target:el,
    clientX:rect.left+x,clientY:rect.top+y,
    pageX:rect.left+x,pageY:rect.top+y,
    screenX:rect.left+x,screenY:rect.top+y});
   const emit=(type,touch,active)=>el.dispatchEvent(new TouchEvent(type,{
    bubbles:true,cancelable:true,touches:active?[touch]:[],
    targetTouches:active?[touch]:[],changedTouches:[touch]
   }));
   emit("touchstart",point(20,40),true);
   for(let i=1;i<=8;i++)emit("touchmove",point(20+i*10,40+i*4),true);
   emit("touchend",point(100,72),false);
  });
 }else{
  await page.mouse.move(box.x+20,box.y+40);await page.mouse.down();
  await page.mouse.move(box.x+100,box.y+72,{steps:8});await page.mouse.up();
 }
 await page.getByRole("checkbox",{name:/Potrjujem, da sem pregledal/}).check();
 await expect(page.getByRole("button",{name:"Zaključi demo prevzem"})).toBeEnabled();
 await page.getByRole("button",{name:"Zaključi demo prevzem"}).click();
}
test("encrypted outbox persists offline, tenant switching cannot expose other queue",async({page,context})=>{
 const writes=[];
 page.on("request",r=>{if(["POST","PUT","PATCH","DELETE"].includes(r.method()))writes.push(r.url())});
 await page.goto("/field/");
 await signSynthetic(page);
 await page.getByLabel("Lokalno testno geslo").fill("SINTETICNO_TESTNO_2026");
 await page.getByRole("button",{name:"Shrani šifrirano"}).click();
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
 await page.waitForFunction(async()=>{if(!navigator.serviceWorker)return false;await navigator.serviceWorker.ready;return true});
 await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await context.setOffline(true);
 await page.getByRole("button",{name:"Uvrsti šifriran demo v vrsto"}).click();
 const state=page.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"});
 await expect(state).toContainText("queued");
 const uuid=(await state.textContent()).match(/[a-f0-9]{8}-[a-f0-9-]{27}/i)?.[0];
 expect(uuid).toBeTruthy();
 await page.reload();
 await expect(page.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"})).toContainText(uuid);
 await expect(page.getByRole("button",{name:"Ročno pošlji šifriran demo"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Ročno obnovi iz testnega API-ja"})).toBeDisabled();
 await page.getByLabel("Podjetje").selectOption("2");
 await expect(page.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"})).toContainText("prazna");
 await page.getByLabel("Podjetje").selectOption("1");
 await expect(page.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"})).toContainText(uuid);
 page.once("dialog",d=>d.accept());
 await page.getByRole("button",{name:"Odstrani iz vrste"}).click();
 await expect(page.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"})).toContainText("prazna");
 await expect(page.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
 expect(writes).toEqual([]);
 await context.setOffline(false);
});
test("public static preview has no enabled network sync, even when queue controls exist",async({page})=>{
 await page.goto("/field/");
 await expect(page.getByRole("button",{name:"Ročno pošlji šifriran demo"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Preveri testno različico"})).toBeDisabled();
});
