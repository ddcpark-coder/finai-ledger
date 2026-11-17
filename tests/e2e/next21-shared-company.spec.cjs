const {test,expect}=require("@playwright/test");

test("CRM, integrations, inventory, orders and BI share one company demo model across in-app navigation",async({page})=>{
 const writes=[];
 page.on("request",r=>{
  if(["POST","PUT","PATCH","DELETE"].includes(r.method()))writes.push(r.url());
 });
 await page.goto("/?module=integrations");
 const sidebar=page.locator(".sidebar .nav");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const integrations=page.getByRole("region",{name:"Simulacija integracij spletnih trgovin"});
 await expect(integrations).toBeVisible();
 const quantity=integrations.getByRole("spinbutton",{name:"Količina naročila"});
 await quantity.fill("11");
 await expect(integrations.getByRole("status",{name:"Napoved razpoložljive zaloge"}))
  .toContainText("Pomanjkanje: 1");
 await integrations.getByRole("button",{name:"Pripravi sintetično naročilo za pregled"}).click();
 await expect(integrations).toContainText("SYN-WOO-ORDER-1-001");
 let pulse=page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"});
 await expect(pulse).toContainText("Naročila iz Integracij");
 await expect(pulse).toContainText("1.375,00");

 await sidebar.getByRole("button",{name:/Zaloge/}).click();
 pulse=page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"});
 await expect(pulse).toContainText("Predvideno pomanjkanje");
 await expect(pulse).toContainText("1");
 const warehouses=page.getByRole("region",{name:"Večskladiščni demo in poslovne enote"});
 await warehouses.getByLabel("Izvorno skladišče").selectOption("SYN-WH-02");
 await warehouses.getByLabel("Ciljno skladišče").selectOption("SYN-WH-01");
 await warehouses.getByRole("button",{name:"Prenesi 1 demo enoto"}).click();
 await expect(warehouses.getByRole("status")).toContainText("Zabeležen sintetični medskladiščni prenos");

 await sidebar.getByRole("button",{name:/Integracije/}).click();
 await expect(page.getByRole("region",{name:"Simulacija integracij spletnih trgovin"}))
  .toContainText("SYN-WOO-ORDER-1-001");
 await expect(page.getByRole("region",{name:"Simulacija integracij spletnih trgovin"})
  .getByRole("status",{name:"Napoved razpoložljive zaloge"}))
  .toContainText("Pomanjkanje: 0");

 await sidebar.getByRole("button",{name:/Naročila/}).click();
 pulse=page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"});
 await expect(pulse).toContainText("Naročila iz Integracij");
 await expect(pulse).toContainText("1.375,00");
 await expect(page.getByRole("region",{name:"CMS integracija – demonstracija WooCommerce"}))
  .toBeVisible();

 await sidebar.getByRole("button",{name:/CRM/}).click();
 const crm=page.getByRole("region",{
  name:"FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
 });
 await crm.getByRole("button",{name:"Premakni v: Odkrivanje"}).click();
 await expect(crm).toContainText("Sintetična priložnost je premaknjena v fazo Odkrivanje");
 await sidebar.getByRole("button",{name:/Integracije/}).click();
 await sidebar.getByRole("button",{name:/CRM/}).click();
 await expect(crm).toContainText("SYN-CRM-101");
 await expect(crm).toContainText("Odkrivanje");
 await expect(crm.getByRole("button",{name:"Premakni v: Ponudba"})).toBeVisible();

 await company.selectOption("2");
 pulse=page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"});
 await expect(pulse).toContainText("Naročila iz Integracij");
 await expect(crm).not.toContainText("SYN-CRM-101");
 await expect(crm).toContainText("SYN-CRM-201");
 await company.selectOption("1");
 await expect(crm).toContainText("SYN-CRM-101");
 await expect(crm.getByRole("button",{name:"Premakni v: Ponudba"})).toBeVisible();
 await sidebar.getByRole("button",{name:/Naročila/}).click();
 await expect(page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"}))
  .toContainText("1.375,00");
 expect(writes).toEqual([]);
});

test("hard reload resets volatile integrated synthetic data instead of implying server persistence",async({page})=>{
 await page.goto("/?module=integrations");
 const panel=page.getByRole("region",{name:"Simulacija integracij spletnih trgovin"});
 await panel.getByRole("button",{name:"Pripravi sintetično naročilo za pregled"}).click();
 await expect(panel).toContainText("SYN-WOO-ORDER-1-001");
 await page.reload();
 await expect(panel).not.toContainText("SYN-WOO-ORDER-1-001");
 await expect(page.getByRole("region",{name:"FinAI skupni sintetični poslovni pogled"}))
  .toContainText("Revizija demo seje: 0");
});
