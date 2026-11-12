const {test,expect}=require("@playwright/test");

test("field app shell works without network after first visit and isolates synthetic tenants",async({page,context})=>{
 await page.goto("/field/");
 await expect(page.getByRole("heading",{name:"Dobavnica na terenu"})).toBeVisible();
 await expect(page).toHaveTitle(/FinAI/i);
 await page.waitForFunction(async()=>{
   if(!("serviceWorker" in navigator))return false;
   await navigator.serviceWorker.ready;
   return true;
 });
 await page.reload();
 await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
 const company=page.getByLabel("Podjetje");
 await expect(page.getByText("SYNTH-DOB-2026-0048")).toBeVisible();
 await company.selectOption("2");
 await expect(page.getByText("SYNTH-DOB-2026-B001")).toBeVisible();
 await expect(page.getByText("SYNTH-DOB-2026-0048")).toHaveCount(0);
 await context.setOffline(true);
 await page.goto("/field/");
 await expect(page.getByRole("heading",{name:"Dobavnica na terenu"})).toBeVisible();
 await expect(page.getByRole("status")).toContainText("brez povezave");
 await expect(page.getByLabel("Podjetje")).toHaveValue("1");
 await page.getByLabel("Podjetje").selectOption("3");
 await expect(page.getByText("SYNTH-DOB-2026-C001")).toBeVisible();
 await expect(page.getByRole("button",{name:"Shrani šifrirano"})).toBeDisabled();
 await context.setOffline(false);
});

test("field offline shell never serves a fabricated API response",async({page,context})=>{
 await page.goto("/field/");
 await page.waitForFunction(async()=>{
   if(!navigator.serviceWorker)return false;
   await navigator.serviceWorker.ready;
   return true;
 });
 await page.reload();
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await context.setOffline(true);
 const result=await page.evaluate(async()=>{
  try{const r=await fetch("/api/me",{credentials:"include"});return r.status}
  catch{return "offline-error"}
 });
 expect(result).toBe("offline-error");
 await context.setOffline(false);
});
