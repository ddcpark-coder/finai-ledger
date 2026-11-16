const {test,expect}=require("@playwright/test");

// Two genuinely separate browser contexts, emulating independent mobile
// device storage + separate service workers. NOT two physical phones.
async function signSynthetic(page){
 const canvas=page.getByLabel("Površina za demonstracijski podpis");
 await canvas.evaluate(el=>{
  const rect=el.getBoundingClientRect();
  const point=(x,y)=>new Touch({identifier:1,target:el,
    clientX:rect.left+x,clientY:rect.top+y,pageX:rect.left+x,
    pageY:rect.top+y,screenX:rect.left+x,screenY:rect.top+y});
  const emit=(type,touch,active)=>el.dispatchEvent(new TouchEvent(type,{
    bubbles:true,cancelable:true,touches:active?[touch]:[],
    targetTouches:active?[touch]:[],changedTouches:[touch]
  }));
  emit("touchstart",point(20,40),true);
  for(let i=1;i<=8;i++)emit("touchmove",point(20+i*10,40+i*4),true);
  emit("touchend",point(100,72),false);
 });
 await page.getByRole("checkbox",{name:/Potrjujem, da sem pregledal/}).check();
 await page.getByRole("button",{name:"Zaključi demo prevzem"}).click();
}

test("two independent emulated mobile profiles exchange only authenticated synthetic queued proof",async({browser,baseURL})=>{
 const phrase="synthetic-offline-two-devices-not-real-2026";
 const a=await browser.newContext({
  baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  deviceScaleFactor:2,acceptDownloads:true
 });
 const b=await browser.newContext({
  baseURL,viewport:{width:375,height:812},isMobile:true,hasTouch:true,
  deviceScaleFactor:2
 });
 const pageA=await a.newPage(),pageB=await b.newPage();
 const writes=[];
 for(const page of [pageA,pageB])page.on("request",r=>{
  if(["POST","PUT","PATCH","DELETE"].includes(r.method()))
   writes.push({url:r.url(),method:r.method()});
 });
 try{
  await pageA.goto("/field/");
  await pageB.goto("/field/");
  const stateA=pageA.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"});
  const stateB=pageB.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"});
  await expect(stateA).toContainText("prazna");
  await expect(stateB).toContainText("prazna");
  await signSynthetic(pageA);
  await pageA.getByLabel("Lokalno testno geslo").fill(phrase);
  await pageA.getByRole("button",{name:"Shrani šifrirano"}).click();
  await expect(pageA.getByText("Šifrirana kopija obstaja na tej napravi.")).toBeVisible();
  await pageA.getByRole("button",{name:"Uvrsti šifriran demo v vrsto"}).click();
  await expect(stateA).toContainText("queued");
  const uuid=(await stateA.textContent()).match(/[a-f0-9]{8}-[a-f0-9-]{27}/i)?.[0];
  expect(uuid).toBeTruthy();
  await expect(stateB).toContainText("prazna"); // no shared IndexedDB
  await pageA.getByLabel("Lokalno testno geslo").fill(phrase);
  const downloadWait=pageA.waitForEvent("download");
  await pageA.getByRole("button",{name:"Izvozi šifrirano vrsto"}).click();
  const saved=await (await downloadWait).path();
  expect(saved).toBeTruthy();

  // Device B, wrong tenant: must not create a local event.
  await pageB.getByLabel("Podjetje").selectOption("2");
  await pageB.getByLabel("Lokalno testno geslo").fill(phrase);
  let file=pageB.waitForEvent("filechooser");
  await pageB.getByRole("button",{name:"Uvozi šifrirano vrsto"}).click();
  await (await file).setFiles(saved);
  await expect(pageB.getByText(/Paket ne pripada izbranemu podjetju/)).toBeVisible();
  await expect(stateB).toContainText("prazna");

  // Device B, same company but wrong passphrase: HMAC fails before IndexedDB.
  await pageB.getByLabel("Podjetje").selectOption("1");
  await pageB.getByLabel("Lokalno testno geslo")
    .fill("wrong-synthetic-passphrase-not-real-2026");
  file=pageB.waitForEvent("filechooser");
  await pageB.getByRole("button",{name:"Uvozi šifrirano vrsto"}).click();
  await (await file).setFiles(saved);
  await expect(pageB.getByText(/Napačna fraza ali spremenjen podpisani demo dogodek/))
    .toBeVisible();
  await expect(stateB).toContainText("prazna");

  await pageB.getByLabel("Lokalno testno geslo").fill(phrase);
  file=pageB.waitForEvent("filechooser");
  await pageB.getByRole("button",{name:"Uvozi šifrirano vrsto"}).click();
  await (await file).setFiles(saved);
  await expect(stateB).toContainText(uuid);
  await expect(pageB.getByText(/Uvoz v2: HMAC in AES-GCM dokazilo sta preverjena/))
    .toBeVisible();
  await expect(pageB.getByLabel("Lokalno testno geslo")).toHaveValue("");

  // Device B can use its OWN offline PWA independently of device A.
  await pageB.waitForFunction(async()=>{
   if(!("serviceWorker" in navigator))return false;
   await navigator.serviceWorker.ready;
   return true;
  });
  await pageB.reload();
  await pageB.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await b.setOffline(true);
  await pageB.reload();
  await expect(pageB.getByRole("status",{name:"Lokalna sinhronizacijska vrsta"}))
    .toContainText(uuid);
  await expect(pageB.getByRole("button",{name:"Ročno pošlji šifriran demo"}))
    .toBeDisabled();
  await expect(pageB.getByRole("button",{name:"Uvozi šifrirano vrsto"}))
    .toBeDisabled();

  // Neither browser context ever uploaded anything or shared private storage.
  await expect(stateA).toContainText(uuid);
  expect(writes).toEqual([]);
 } finally {
  await b.setOffline(false).catch(()=>{});
  await a.close();await b.close();
 }
});
