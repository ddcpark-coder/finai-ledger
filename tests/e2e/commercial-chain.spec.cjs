const {test,expect}=require("@playwright/test");

test("a single demo company can complete quote → order → delivery → invoice without real side effects",async({page})=>{
 const panel=page.getByRole("region",{name:"Povezani demonstracijski poslovni tok"});
 await page.goto("/?module=quotes");
 await page.locator(".topbarMain select.companySwitch").selectOption("1");
 await expect(panel).toBeVisible();
 await panel.getByRole("button",{name:"Ustvari demo ponudbo"}).click();
 await expect(panel).toContainText("SYN-CHAIN-1-001");
 await panel.getByRole("button",{name:"Simuliraj pripravo ponudbe"}).click();
 await panel.getByRole("link",{name:"Naslednji korak: Naročila"}).click();

 await panel.getByRole("button",{name:"Potrdi sprejem demo ponudbe"}).click();
 await panel.getByRole("button",{name:"Ustvari demo naročilo"}).click();
 await panel.getByRole("link",{name:"Naslednji korak: Dokumenti / dobavnice"}).click();

 await panel.getByRole("button",{name:"Potrdi demo dobavnico"}).click();
 await panel.getByRole("link",{name:"Naslednji korak: Izdani računi"}).click();
 await panel.getByRole("button",{name:"Simuliraj pripravo računa"}).click();
 await expect(panel).toContainText("Vsi demonstracijski koraki so potrjeni");
 await expect(panel).toContainText("SYN-CHAIN-1-001");
 await page.reload();
 await expect(panel).toContainText("Vsi demonstracijski koraki so potrjeni");
 await expect(panel).toContainText("Brez pravega pošiljanja");

 // Another company must never inherit first company's chain.
 await page.locator(".topbarMain select.companySwitch").selectOption("2");
 await expect(panel).not.toContainText("SYN-CHAIN-1-001");
 await expect(panel).toContainText("podjetje 2");
 await page.locator(".topbarMain select.companySwitch").selectOption("1");
 await expect(panel).toContainText("SYN-CHAIN-1-001");
 await panel.getByRole("button",{name:"Ponastavi poslovni demo"}).click();
 await expect(panel).not.toContainText("SYN-CHAIN-1-001");
});
