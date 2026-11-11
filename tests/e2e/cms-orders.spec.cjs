const {test,expect}=require("@playwright/test");

test("CMS import demo: distinct tenants, exact totals, repeated import and zero server writes",async({page})=>{
 const writes=[];
 page.on("request",req=>{
  if(["POST","PUT","PATCH","DELETE"].includes(req.method()))writes.push(req.url());
 });
 await page.goto("/?module=orders&view=Pregled&subview=Vsa");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const cms=page.getByRole("region",{name:"CMS integracija – demonstracija WooCommerce"});
 await expect(cms).toBeVisible();
 await cms.getByRole("button",{name:"Uvozi vzorčna CMS naročila"}).click();
 await expect(cms).toContainText("Uvoženo: 2");
 const a=page.locator(".sor").filter({hasText:"CMS-DEMO-1-1001"});
 await expect(a).toBeVisible();
 await expect(a).toContainText("122.00 €");
 await cms.getByRole("button",{name:"Uvozi vzorčna CMS naročila"}).click();
 await expect(cms).toContainText("že obstoječih: 2");
 await expect(page.locator(".sor").filter({hasText:"CMS-DEMO-1-1001"})).toHaveCount(1);

 await company.selectOption("2");
 await expect(a).toHaveCount(0);
 await cms.getByRole("button",{name:"Uvozi vzorčna CMS naročila"}).click();
 await expect(page.locator(".sor").filter({hasText:"CMS-DEMO-2-1001"})).toBeVisible();
 await company.selectOption("1");
 await expect(a).toBeVisible();
 await cms.getByRole("button",{name:"Ponastavi CMS demo"}).click();
 await expect(a).toHaveCount(0);
 await company.selectOption("2");
 await expect(page.locator(".sor").filter({hasText:"CMS-DEMO-2-1001"})).toBeVisible();
 expect(writes).toEqual([]);
});
