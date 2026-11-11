const {test,expect}=require("@playwright/test");

test("mobile delivery receipt: consent, drawn signature, SHA-256 evidence, isolated company",async({page})=>{
 const writes=[];
 page.on("request",req=>{
  if(["POST","PUT","PATCH","DELETE"].includes(req.method()))writes.push(req.url());
 });
 await page.goto("/?module=documents&view=Dobavnice&subview=Za%20podpis");
 const company=page.locator(".topbarMain select.companySwitch");
 await company.selectOption("1");
 await expect(page.getByRole("heading",{name:"SYNTH-DOB-2026-0048"})).toBeVisible();
 const finalize=page.getByRole("button",{name:"Zaključi in preveri demo dokazilo"});
 await expect(finalize).toBeDisabled();
 const canvas=page.getByLabel("Površina za risanje demonstracijskega podpisa");
 await canvas.scrollIntoViewIfNeeded();
 const box=await canvas.boundingBox();
 expect(box).toBeTruthy();
 await page.mouse.move(box.x+25,box.y+45);
 await page.mouse.down();
 await page.mouse.move(box.x+90,box.y+55,{steps:6});
 await page.mouse.move(box.x+135,box.y+80,{steps:6});
 await page.mouse.up();
 await expect(page.getByText("Podpis zajet (še nepotrjen)")).toBeVisible();
 await expect(finalize).toBeDisabled();
 await page.getByRole("checkbox",{name:/Potrjujem, da je podpisnik/}).check();
 await expect(finalize).toBeEnabled();
 await finalize.click();
 await expect(page.getByText("Lokalno dokazilo izračunano")).toBeVisible();
 await expect(page.locator(".proof")).toContainText(/SHA-256 dokazila: [a-f0-9]{64}/);
 await expect(page.getByRole("button",{name:"Izvozi demo dokazilo (.json)"})).toBeEnabled();
 const [download]=await Promise.all([
   page.waitForEvent("download"),
   page.getByRole("button",{name:"Prenesi demo PDF s sliko podpisa"}).click()
 ]);
 expect(download.suggestedFilename()).toMatch(/SYNTH-DOB-2026-0048.*\.pdf$/);
 const bytes=require("node:fs").readFileSync(await download.path());
 expect(bytes.subarray(0,5).toString("ascii")).toBe("%PDF-");
 expect(bytes.length).toBeGreaterThan(1000);
 await expect(page.getByRole("button",{name:"Pošlji kopijo (v pripravi)"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Kvalificiran podpis (v pripravi)"})).toBeDisabled();
 const password=page.getByLabel("Geslo šifriranega demo dokazila");
 await password.fill("synthetic-local-secret-2026");
 await page.getByRole("button",{name:"Shrani šifrirano demo kopijo"}).click();
 await expect(page.getByText("Šifrirana kopija je prisotna na napravi.")).toBeVisible();
 await page.reload();
 await page.locator(".topbarMain select.companySwitch").selectOption("1");
 await page.getByLabel("Geslo šifriranega demo dokazila")
   .fill("synthetic-local-secret-2026");
 await page.getByRole("button",{name:"Obnovi šifrirano demo kopijo"}).click();
 await expect(page.getByText("Sintetično dokazilo je uspešno dešifrirano in ponovno preverjeno.")).toBeVisible();
 await expect(page.getByRole("button",{name:"Prenesi demo PDF s sliko podpisa"})).toBeEnabled();
 await company.selectOption("2");
 await expect(page.getByRole("heading",{name:"SYNTH-DOB-2026-B001"})).toBeVisible();
 await expect(page.getByText("Lokalno dokazilo izračunano")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Izvozi demo dokazilo (.json)"})).toBeDisabled();
 expect(writes).toEqual([]);
});
