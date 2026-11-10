const {test,expect}=require("@playwright/test");

test("per-company and per-module complexity/layout survive reload and cannot bleed",async({page})=>{
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  const shell=page.locator(".finaiAdaptive");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.getByLabel("Zahtevnost").selectOption("simple");
  await page.getByLabel("Razporeditev").selectOption("stacked");
  await page.getByLabel("Velikost prikaza").selectOption("130");
  await expect(shell).toHaveAttribute("data-level","simple");
  await expect(shell).toHaveAttribute("data-arrangement","stacked");

  await page.reload();
  await expect(shell).toHaveAttribute("data-level","simple");
  await expect(shell).toHaveAttribute("data-arrangement","stacked");

  await page.goto("/?module=banking&view=Pregled&subview=Vsi");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.getByLabel("Zahtevnost").selectOption("expert");
  await page.getByLabel("Razporeditev").selectOption("list");
  await expect(shell).toHaveAttribute("data-arrangement","list");

  // Changes in the banking module must not change the invoices module.
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  await expect(shell).toHaveAttribute("data-level","simple");
  await expect(shell).toHaveAttribute("data-arrangement","stacked");
  await expect(page.getByLabel("Velikost prikaza")).toHaveValue("130");

  const companies=page.locator(".topbarMain select.companySwitch");
  await companies.selectOption("2");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.getByLabel("Zahtevnost").selectOption("expert");
  await expect(shell).toHaveAttribute("data-level","expert");
  await companies.selectOption("1");
  await expect(shell).toHaveAttribute("data-level","simple");
  await page.getByRole("button",{name:"Ponastavi pogled"}).click();
  await expect(shell).toHaveAttribute("data-level","standard");
  await expect(shell).toHaveAttribute("data-arrangement","split");
});
