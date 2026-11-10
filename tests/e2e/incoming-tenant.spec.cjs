const {test,expect}=require("@playwright/test");

test("incoming tenant isolation: create, approve, switch companies and reset only current demo",async({page})=>{
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  await expect(page.getByRole("heading",{name:"Prejeti računi",exact:true})).toBeVisible();

  const company=page.locator(".topbarMain select.companySwitch");
  await company.selectOption("1");

  async function addInvoice(partner){
    await page.getByRole("button",{name:/Nov demo račun/}).click();
    const dialog=page.getByRole("dialog",{name:"Nov demonstracijski prejeti račun"});
    await dialog.getByLabel("Dobavitelj").fill(partner);
    await dialog.getByLabel("Številka prejetega računa").fill("SYN-88");
    await dialog.getByLabel("Bruto znesek v EUR").fill("122,00");
    await dialog.getByRole("button",{name:"Dodaj v demonstracijo"}).click();
    await expect(dialog).not.toBeVisible();
  }
  const label="Vzorčni dobavitelj test A";
  await addInvoice(label);
  await expect(page.locator(".invoiceRow").filter({hasText:label})).toBeVisible();
  await page.getByRole("button",{name:"Odobri demo račun"}).click();
  await expect(page.locator(".invoiceRow").filter({hasText:label})).toContainText("Odobreno");
  await expect(page.getByLabel("Demonstracijska revizijska aktivnost")).toContainText("Odobren demo račun");

  await company.selectOption("2");
  await expect(page.locator(".invoiceRow").filter({hasText:label})).toHaveCount(0);
  await expect(page.locator(".invoiceRow").filter({hasText:"Testni dobavitelj B"})).toBeVisible();
  const other="Vzorčni dobavitelj test B";
  await addInvoice(other);
  await expect(page.locator(".invoiceRow").filter({hasText:other})).toBeVisible();
  const audit=page.getByLabel("Demonstracijska revizijska aktivnost");
  await expect(audit).toContainText("Ustvarjen demo račun");
  await expect(audit).not.toContainText("Odobren demo račun");

  await company.selectOption("1");
  await expect(page.locator(".invoiceRow").filter({hasText:other})).toHaveCount(0);
  await expect(page.locator(".invoiceRow").filter({hasText:label})).toBeVisible();
  await page.getByRole("button",{name:"Ponastavi demo"}).click();
  await expect(page.locator(".invoiceRow").filter({hasText:label})).toHaveCount(0);

  await company.selectOption("2");
  await expect(page.locator(".invoiceRow").filter({hasText:other})).toBeVisible();
  await page.reload();
  await expect(page.locator(".invoiceRow").filter({hasText:other})).toHaveCount(0);
});
