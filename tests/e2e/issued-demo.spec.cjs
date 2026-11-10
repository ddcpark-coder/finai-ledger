const {test,expect}=require("@playwright/test");

test("synthetic invoice workflow creates a draft, issues demo number and simulates sending",async({page})=>{
  await page.goto("/?module=issued_invoices&view=Pregled&subview=Vsi");
  await expect(page.getByRole("heading",{name:"Izdani računi",exact:true})).toBeVisible();
  await page.getByRole("button",{name:/Nov račun/}).click();

  const dialog=page.getByRole("dialog",{name:"Nov demonstracijski račun"});
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Kupec / partner").fill("Testni Kupec d.o.o.");
  await dialog.getByLabel("Opis postavke").fill("Testno oblikovanje");
  await dialog.getByLabel("Neto znesek (€)").fill("1000,00");
  await dialog.getByLabel("DDV (demo)").selectOption("22");
  await dialog.getByLabel("Rok plačila").selectOption("15");
  await dialog.getByRole("button",{name:"Ustvari osnutek"}).click();
  await expect(dialog).not.toBeVisible();

  const row=page.locator(".invoiceRow2").filter({hasText:"Testni Kupec d.o.o."});
  await expect(row).toBeVisible();
  await expect(row).toContainText("Osnutek");

  const preview=page.locator(".invoicePreview");
  await expect(preview).toContainText("1.220,00");
  await preview.getByRole("button",{name:/Simuliraj izdajo/}).click();
  await expect(preview.getByRole("heading",{name:/DEMO-\d{4}-\d{4}/})).toBeVisible();
  await expect(row).toContainText("Izdano");
  await preview.getByRole("button",{name:/Simuliraj pošiljanje/}).click();
  await expect(row).toContainText("Poslano");
  await expect(preview).toContainText("Simulacija · brez pošiljanja");

  await preview.getByRole("button",{name:"Prikaži HTML predogled"}).click();
  const document=preview.getByLabel("HTML predogled demonstracijskega računa");
  await expect(document).toBeVisible();
  await expect(document).toContainText("Testni Kupec d.o.o.");
  await expect(document).toContainText("ni uradni račun");

  await page.getByRole("button",{name:"Ponastavi demo"}).click();
  await expect(row).toHaveCount(0);
});

test("synthetic invoice actions never persist records after reload",async({page})=>{
  await page.goto("/?module=issued_invoices&view=Pregled&subview=Vsi");
  await page.getByRole("button",{name:/Nov račun/}).click();
  const modal=page.getByRole("dialog",{name:"Nov demonstracijski račun"});
  await modal.getByLabel("Kupec / partner").fill("Preizkusni kupec");
  await modal.getByLabel("Opis postavke").fill("Demonstracijska storitev");
  await modal.getByLabel("Neto znesek (€)").fill("20,00");
  await modal.getByRole("button",{name:"Ustvari osnutek"}).click();
  await expect(page.getByText("Preizkusni kupec")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Preizkusni kupec")).toHaveCount(0);
});
