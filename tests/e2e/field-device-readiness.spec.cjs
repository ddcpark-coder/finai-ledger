const {test,expect}=require("@playwright/test");
const fs=require("node:fs/promises");

test("physical-device readiness panel exports only synthetic local capability results",async({page})=>{
 const writes=[];
 page.on("request",r=>{
  if(["POST","PATCH","PUT","DELETE"].includes(r.method()))
   writes.push(r.url());
 });
 await page.goto("/field/");
 await expect(page.getByRole("heading",{name:"Diagnostika mobilne naprave"})).toBeVisible();
 await page.getByRole("button",{name:"Preveri pripravljenost naprave"}).click();
 const results=page.getByRole("region",{name:"Rezultati diagnostike"});
 await expect(results).toBeVisible();
 await expect(results).toContainText("Lokalna kriptografija: OK");
 await expect(results).toContainText("Lokalna shramba: OK");
 await expect(results).toContainText("Varen kontekst: OK");
 const downloadPromise=page.waitForEvent("download");
 await page.getByRole("button",{name:"Izvozi poročilo naprave"}).click();
 const path=await (await downloadPromise).path();
 const report=JSON.parse(await fs.readFile(path,"utf8"));
 expect(report.format).toBe("finai-synthetic-mobile-readiness-v1");
 expect(report.production_approved).toBe(false);
 expect(report.real_data_allowed).toBe(false);
 expect(report.server_contacted).toBe(false);
 expect(report.checks.map(x=>x.code)).toEqual([
  "secure","crypto","indexeddb","service-worker",
  "offline-cache","persistence","network"
 ]);
 const raw=JSON.stringify(report);
 for(const forbidden of ["userAgent","clientEventId","companyId","signatureDataUrl",
  "password","privateKey","evidenceSha256","documentId"])expect(raw).not.toContain(forbidden);
 expect(writes).toEqual([]);
});

test("local device diagnostic still runs without internet after field PWA install",async({page,context})=>{
 await page.goto("/field/");
 await page.waitForFunction(async()=>{
  if(!navigator.serviceWorker)return false;
  await navigator.serviceWorker.ready;
  return true;
 });
 await page.reload();
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await context.setOffline(true);
 try{
  await page.reload();
  await page.getByRole("button",{name:"Preveri pripravljenost naprave"}).click();
  const results=page.getByRole("region",{name:"Rezultati diagnostike"});
  await expect(results).toContainText("Lokalna kriptografija: OK");
  await expect(results).toContainText("Lokalna shramba: OK");
  await expect(results).toContainText("Naprava poroča brez povezave");
 }finally{await context.setOffline(false)}
});
