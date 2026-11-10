const {test,expect}=require("@playwright/test");

test("explainable tenant-scoped demo accounting proposal has no fictional AI confidence or posting",async({page})=>{
 await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 await page.locator(".invoiceRow").filter({hasText:"Merkur d.o.o."}).click();
 const detail=page.locator(".invoiceDetail");
 await expect(detail).toContainText("Demo konto 4100");
 await expect(detail).toContainText("testno pravilo");
 await expect(detail).not.toContainText("92 % gotovost");
 await detail.getByRole("button",{name:"Potrdi demo predlog"}).click();
 await expect(detail).toContainText("demonstracijsko potrjeno");
 await company.selectOption("2");
 await expect(detail).not.toContainText("Demo konto 4100 · stroškovno mesto PROD");
 await expect(detail).toContainText("testno pravilo tega podjetja");
 await company.selectOption("1");
 await page.locator(".invoiceRow").filter({hasText:"Merkur d.o.o."}).click();
 await expect(detail).not.toContainText("demonstracijsko potrjeno");
});
