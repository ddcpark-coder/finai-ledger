const {test,expect}=require("@playwright/test");

// One real-browser smoke flow for the actual Integracije module. Synthetic
// scenarios only; no HTTP writes, provider calls, accounting or stock changes.
test("commerce price, stock shortfall, hold and company isolation update instantly",async({page})=>{
 const writes=[];
 page.on("request",r=>{
  if(["POST","PUT","PATCH","DELETE"].includes(r.method()))writes.push(r.url());
 });
 await page.goto("/?module=integrations");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const panel=page.getByRole("region",{name:"Simulacija integracij spletnih trgovin"});
 await expect(panel).toBeVisible();
 await expect(panel.getByRole("button",{name:"Osveži lokalno pregledno vrsto"}))
  .toBeDisabled();
 const quantity=panel.getByRole("spinbutton",{name:"Količina naročila"});
 await quantity.fill("11");
 const forecast=panel.getByRole("status",{name:"Napoved razpoložljive zaloge"});
 await expect(forecast).toContainText("Pomanjkanje: 1");
 await expect(panel).toContainText("1.375,00");
 await expect(panel).toContainText("Predlog medskladiščne prerazporeditve");
 await panel.getByRole("button",{name:"Pripravi sintetično naročilo za pregled"}).click();
 await expect(panel).toContainText("V pregledni vrsti: 1");
 await expect(panel).toContainText("SYN-WOO-ORDER-1-001");
 await panel.getByRole("button",{name:"Demo: zadrži"}).click();
 await expect(panel).toContainText("zadržano");
 await expect(panel).toContainText("V pregledni vrsti: 1");
 // The local simulation may be reset but no API write happens.
 await company.selectOption("2");
 await expect(panel).toContainText("V pregledni vrsti: 0");
 await expect(panel).not.toContainText("SYN-WOO-ORDER-1-001");
 await expect(panel.getByRole("button",{name:"Osveži lokalno pregledno vrsto"}))
  .toBeDisabled();
 expect(writes).toEqual([]);
});
