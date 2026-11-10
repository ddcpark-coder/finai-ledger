const {test,expect}=require("@playwright/test");

test("bank demo: explainable partial match, company boundary and session-only reset",async({page})=>{
 await page.goto("/?module=banking&view=Pregled&subview=Ra%C4%8Duni");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 const gamma=page.locator(".bankRow").filter({hasText:"Gamma d.o.o."});
 await expect(gamma).toBeVisible();
 await gamma.click();
 await expect(page.locator(".bankDetail")).toContainText("Delno plačilo");
 await page.getByRole("button",{name:"Potrdi demo ujemanje"}).click();
 await expect(gamma).toContainText("Demo usklajeno");
 await expect(page.getByLabel("Demonstracijska zgodovina bančnih ujemanj")).toContainText("TX-8839");
 await company.selectOption("2");
 await expect(gamma).toHaveCount(0);
 const b=page.locator(".bankRow").filter({hasText:"Dobavitelj B"});
 await expect(b).toBeVisible();
 await b.click();
 await page.getByRole("button",{name:"Potrdi demo ujemanje"}).click();
 await expect(b).toContainText("Demo usklajeno");
 await company.selectOption("1");
 await expect(gamma).toContainText("Demo usklajeno");
 await page.getByRole("button",{name:"Ponastavi demo"}).click();
 await expect(gamma).not.toContainText("Demo usklajeno");
 await company.selectOption("2");
 await expect(b).toContainText("Demo usklajeno");
 await page.reload();
 await company.selectOption("2");
 await expect(b).toBeVisible();
 await expect(b).not.toContainText("Demo usklajeno");
});

test("unmatched synthetic bank transfer never offers a fake automatic match",async({page})=>{
 await page.goto("/?module=banking&view=Pregled&subview=Ra%C4%8Duni");
 const noRef=page.locator(".bankRow").filter({hasText:"Neznan priliv"});
 await noRef.click();
 await expect(page.locator(".bankDetail")).toContainText("Ni enoličnega varnega predloga");
 await expect(page.getByRole("button",{name:"Potrdi demo ujemanje"})).toBeDisabled();
 await expect(page.getByRole("button",{name:/Uvoz izpiska/})).toBeDisabled();
});
