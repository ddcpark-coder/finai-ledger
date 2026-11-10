const {test,expect}=require("@playwright/test");

test("issued invoices are isolated and show honest e-invoice readiness guidance",async({page})=>{
 await page.goto("/?module=issued_invoices&view=Pregled&subview=Vsi");
 const companies=page.locator(".topbarMain select.companySwitch");
 await companies.selectOption("1");
 await page.getByRole("button",{name:/Nov račun/}).click();
 const form=page.getByRole("dialog",{name:"Nov demonstracijski račun"});
 await form.getByLabel("Kupec / partner").fill("Sintetični kupec podjetja A");
 await form.getByLabel("Opis postavke").fill("Testne storitve");
 await form.getByLabel("Neto znesek (€)").fill("100,00");
 await form.getByRole("button",{name:"Ustvari osnutek"}).click();
 const a=page.locator(".invoiceRow2").filter({hasText:"Sintetični kupec podjetja A"});
 await expect(a).toBeVisible();
 await page.getByRole("button",{name:/Simuliraj izdajo/}).click();
 await page.getByRole("button",{name:"Preveri podatke za e-račun"}).click();
 const check=page.getByRole("region",{name:"Kontrola pripravljenosti e-računa"});
 await expect(check).toBeVisible();
 await expect(check).toContainText("DEMO");
 await expect(check).toContainText("ni uradna validacija");
 await check.getByLabel("Profil e-računa").selectOption("en16931");
 await expect(check).toContainText("ne pa eSLOG/EN 16931");

 await companies.selectOption("2");
 await expect(a).toHaveCount(0);
 await expect(page.locator(".invoiceRow2").filter({hasText:"Vzorčni kupec B"})).toBeVisible();
 await companies.selectOption("1");
 await expect(a).toBeVisible();
 await page.getByRole("button",{name:"Ponastavi demo"}).click();
 await expect(a).toHaveCount(0);
});
