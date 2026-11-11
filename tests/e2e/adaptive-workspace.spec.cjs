const {test,expect}=require("@playwright/test");

test("per-company and per-module complexity/layout survive reload and cannot bleed",async({page})=>{
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  const shell=page.locator(".finaiAdaptive");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.getByLabel("Zahtevnost").selectOption("simple");
  const guidance=page.getByRole("region",{name:"Pojasnila trenutnega modula"});
  await expect(guidance).toBeVisible();
  await expect(guidance).toContainText("Kako pregledam prejeti račun?");
  await expect(guidance).toContainText("Predlagani naslednji korak");
  await page.getByLabel("Razporeditev").selectOption("stacked");
  await page.getByLabel("Vrstni red oken").selectOption("detail-first");
  const panes=page.locator(".incomingGrid > [data-finai-pane]");
  await expect(shell).toHaveAttribute("data-pane-order","detail-first");
  await expect(panes.first()).toHaveAttribute("data-finai-pane","detail");
  await expect(panes.nth(1)).toHaveAttribute("data-finai-pane","list");
  // DOM order itself now matches visual and assistive-technology reading order.
  await expect.poll(()=>panes.first().evaluate(el=>getComputedStyle(el).order)).toBe("0");
  await page.getByLabel("Gostota obrazca").selectOption("compact");
  await expect(shell).toHaveAttribute("data-form-density","compact");
  await page.getByLabel("Velikost prikaza").selectOption("130");
  await expect(shell).toHaveAttribute("data-level","simple");
  await expect(shell).toHaveAttribute("data-arrangement","stacked");

  await page.reload();
  await expect(shell).toHaveAttribute("data-level","simple");
  await expect(shell).toHaveAttribute("data-arrangement","stacked");
  await expect(shell).toHaveAttribute("data-pane-order","detail-first");
  await expect(shell).toHaveAttribute("data-form-density","compact");

  await page.goto("/?module=incoming_invoices&view=Odobritve&subview=Odobreno");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  await expect(shell).toHaveAttribute("data-level","simple");

  await page.goto("/?module=banking&view=Pregled&subview=Vsi");
  await expect(shell).toHaveAttribute("data-level","standard");
  await page.getByLabel("Zahtevnost").selectOption("expert");
  await page.getByLabel("Razporeditev").selectOption("list");
  await expect(shell).toHaveAttribute("data-arrangement","list");
  const bankPanes=page.locator(".bankGrid > [data-finai-pane]");
  await expect(bankPanes.first()).toHaveAttribute("data-finai-pane","list");
  await expect(bankPanes).toHaveCount(2);
  await expect(page.locator(".bankGrid > [data-finai-pane=detail]")).toBeHidden();
  await page.getByLabel("Razporeditev").selectOption("split");
  await page.getByLabel("Vrstni red oken").selectOption("detail-first");
  await expect(bankPanes.first()).toHaveAttribute("data-finai-pane","detail");
  await page.getByLabel("Razporeditev").selectOption("detail");
  await expect(page.locator(".bankGrid > [data-finai-pane=list]")).toBeHidden();
  await expect(page.locator(".bankGrid > [data-finai-pane=detail]")).toBeVisible();

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
  await expect(shell).toHaveAttribute("data-pane-order","list-first");
  await expect(shell).toHaveAttribute("data-form-density","comfortable");
  await expect(page.getByRole("region",{name:"Pojasnila trenutnega modula"})).toHaveCount(0);
  await page.getByRole("button",{name:"Pomoč pri tem pogledu"}).click();
  await expect(page.getByRole("region",{name:"Pojasnila trenutnega modula"})).toBeVisible();
});
