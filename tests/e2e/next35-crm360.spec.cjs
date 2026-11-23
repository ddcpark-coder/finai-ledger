const {test,expect}=require("@playwright/test");

test("CRM 360 contact → activity → quote approval → order draft stays tenant scoped",async({page,isMobile})=>{
 test.setTimeout(90000);
 const writes=[];
 page.on("request",request=>{
  if(["POST","PUT","PATCH","DELETE"].includes(request.method()))
   writes.push(request.url());
 });
 await page.goto("/?module=crm");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const panel=page.getByRole("region",{name:"CRM 360 kartica sintetične stranke"});
 await expect(panel).toBeVisible();
 await expect(panel).toContainText("Sintetični kupec A");
 await expect(panel).toContainText("SYN-CRM-101");

 await panel.getByRole("button",{name:/Dodaj demo kontakt/}).click();
 await panel.getByRole("textbox",{name:"Ime sintetičnega kontakta"})
  .fill("Sintetični testni nabavnik");
 await panel.getByRole("textbox",{name:"E-pošta sintetičnega kontakta"})
  .fill("nabava@example.test");
 await panel.getByRole("button",{name:"Ustvari demo kontakt"}).click();
 await expect(panel).toContainText("Sintetični testni nabavnik");
 await panel.getByRole("button",{name:"＋ Dodaj demo aktivnost"}).click();
 await expect(panel).toContainText("Sintetični nadaljnji stik");

 await panel.getByRole("button",{name:"Pripravi sintetično ponudbo"}).click();
 await expect(panel).toContainText("SYN-C360-Q-1-001");

 const sidebar=page.locator(".sidebar .nav");
 const visit=async label=>{
  if(isMobile)await page.locator(".topbarMain .hamb").click();
  await sidebar.getByRole("button",{name:new RegExp(label)}).click();
 };
 await visit("Ponudbe");
 const quotePanel=page.getByRole("region",{name:"CRM 360 povezane demo ponudbe"});
 await expect(quotePanel).toContainText("SYN-C360-Q-1-001");
 await quotePanel.getByRole("checkbox",{name:/Potrjujem samo sintetični osnutek/}).check();
 await quotePanel.getByRole("button",{name:"Ročno potrdi demo ponudbo"}).click();
 await expect(quotePanel).toContainText("ročno potrjena");
 await quotePanel.getByRole("button",{name:"Pripravi osnutek demo naročila"}).click();
 await expect(quotePanel).toContainText("naročila");

 await visit("Naročila");
 const orders=page.getByRole("region",{name:"CRM 360 povezana demo naročila"});
 await expect(orders).toContainText("SYN-C360-O-1-001");
 await expect(orders).toContainText("SYN-C360-Q-1-001");
 await expect(orders).toContainText("osnutek naročila");

 await company.selectOption("2");
 await expect(orders).not.toContainText("SYN-C360-O-1-001");
 await expect(orders).toContainText("ni povezanih demo naročil");
 await company.selectOption("1");
 await expect(orders).toContainText("SYN-C360-O-1-001");
 expect(writes).toEqual([]);

 await page.reload();
 await expect(orders).not.toContainText("SYN-C360-O-1-001");
 await expect(orders).toContainText("ni povezanih demo naročil");
});

test("CRM 360 tracks the existing shared opportunity stage and never suggests another company's customer",async({page,isMobile})=>{
 await page.goto("/?module=crm");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const panel=page.getByRole("region",{name:"CRM 360 kartica sintetične stranke"});
 const pipeline=page.getByRole("region",{
  name:"FinAI NEXT11 CRM – interaktivna sintetična predstavitev"
 });
 await expect(panel).toContainText("Kvalifikacija");
 await pipeline.getByRole("button",{name:"Premakni v: Odkrivanje"}).click();
 await expect(panel).toContainText("Odkrivanje");
 await company.selectOption("2");
 await expect(panel).toContainText("Sintetični kupec D");
 await expect(panel).not.toContainText("Sintetični kupec A");
 await expect(panel).not.toContainText("SYN-CRM-101");
});
