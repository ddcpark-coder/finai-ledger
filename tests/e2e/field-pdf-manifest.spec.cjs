const {test,expect}=require("@playwright/test");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");

test("mobile/desktop: PDF and manifest refer to the exact same unsigned synthetic document",async({page})=>{
 const writes=[];
 page.on("request",request=>{
  if(["POST","PUT","PATCH","DELETE"].includes(request.method()))writes.push(request.url());
 });
 await page.goto("/field/");
 const canvas=page.getByLabel("Površina za demonstracijski podpis");
 const box=await canvas.boundingBox();
 expect(box).toBeTruthy();
 const start={x:Math.round(box.x+20),y:Math.round(box.y+40),id:1};
 const end={x:Math.round(box.x+95),y:Math.round(box.y+70),id:1};
 if(page.viewportSize().width<=480){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[start]});
  for(let i=1;i<=8;i++){
   const t=i/8;
   await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{
    x:Math.round(start.x+(end.x-start.x)*t),
    y:Math.round(start.y+(end.y-start.y)*t),id:1
   }]});
  }
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await cdp.detach();
 }else{
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps:8});
  await page.mouse.up();
 }
 await page.getByRole("checkbox",{name:/Potrjujem, da sem pregledal/}).check();
 await expect(page.getByRole("button",{name:"Zaključi demo prevzem"})).toBeEnabled();
 await page.getByRole("button",{name:"Zaključi demo prevzem"}).click();
 const pdfButton=page.getByRole("button",{name:"Prenesi demo PDF"});
 const manifestButton=page.getByRole("button",{name:"Izvozi SHA-256 manifest PDF"});
 await expect(manifestButton).toBeDisabled();
 const [pdfDownload]=await Promise.all([
  page.waitForEvent("download"),pdfButton.click()
 ]);
 const pdfBytes=readFileSync(await pdfDownload.path());
 expect(pdfBytes.subarray(0,5).toString()).toBe("%PDF-");
 await expect(manifestButton).toBeEnabled();
 const [manifestDownload]=await Promise.all([
  page.waitForEvent("download"),manifestButton.click()
 ]);
 const manifest=JSON.parse(readFileSync(await manifestDownload.path(),"utf8"));
 expect(manifest.format).toBe("finai-unsigned-pdf-manifest-v1");
 expect(manifest.companyId).toBe(1);
 expect(manifest.documentId).toBe("SYNTH-DOB-2026-0048");
 expect(manifest.pdfTemplateVersion).toBe(2);
 expect(manifest.pdfSha256).toBe(createHash("sha256").update(pdfBytes).digest("hex"));
 expect(manifest.qualified).toBe(false);
 expect(manifest.signatureProvider).toBe(null);
 expect(manifest.signatureStatus).toBe("image-only-unsigned-demo");
 expect(writes).toEqual([]);

 await page.getByLabel("Podjetje").selectOption("2");
 await expect(manifestButton).toBeDisabled();
 await expect(page.getByText("SYNTH-DOB-2026-B001")).toBeVisible();
});
