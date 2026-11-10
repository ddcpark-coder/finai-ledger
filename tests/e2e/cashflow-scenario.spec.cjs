const {test,expect}=require("@playwright/test");

test("synthetic liquidity forecasts vary by scenario and selected demo company",async({page})=>{
 await page.goto("/?module=banking&view=Pregled&subview=Napoved");
 const panel=page.getByRole("article",{name:"Demonstracijska napoved likvidnosti"});
 await expect(panel).toBeVisible();
 await expect(panel).toContainText("12.450,80");
 await panel.getByLabel("Scenarij likvidnosti").selectOption("conservative");
 await expect(panel).toContainText("50 %");
 await expect(panel).toContainText("14.018,80");
 await panel.getByLabel("Scenarij likvidnosti").selectOption("optimistic");
 await expect(panel).toContainText("100 %");
 await panel.getByLabel("Obdobje napovedi").selectOption("14");
 await expect(panel).toContainText("14 dni");
 await page.locator(".topbarMain select.companySwitch").selectOption("2");
 await expect(panel).toContainText("8.000,00");
 await expect(panel).toContainText("sintetični");
});
