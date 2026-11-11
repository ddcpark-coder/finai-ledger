const {test,expect}=require("@playwright/test");

test("opt-in mobile/desktop synthetic PWA has controlled offline shell but never business API cache",async({page,context})=>{
 await page.goto("/");
 const panel=page.getByRole("complementary",{name:"Namestitev sintetičnega FinAI demo prikaza"});
 await expect(panel).toBeVisible();
 await expect(panel).toContainText("stat");
 const manifest=await page.locator('link[rel="manifest"]').getAttribute("href");
 expect(manifest).toBe("/manifest.webmanifest");
 const response=await page.request.get("/manifest.webmanifest");
 expect(response.ok()).toBeTruthy();
 const json=await response.json();
 expect(json.short_name).toBe("FinAI Demo");
 await page.waitForFunction(()=>navigator.serviceWorker?.controller!=null,null,{timeout:25000});
 const shells=await page.evaluate(async()=>{
  const cache=await caches.open("finai-demo-shell-v1");
  return (await cache.keys()).map(x=>new URL(x.url).pathname);
 });
 expect(shells).toContain("/");
 expect(shells.some(x=>x.startsWith("/_next/static/"))).toBeTruthy();
 expect(shells.some(x=>x.startsWith("/api/"))).toBeFalsy();
 await context.setOffline(true);
 try{
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByRole("note",{name:"Status demonstracijske izdaje"})).toBeVisible();
 } finally {await context.setOffline(false)}
});
