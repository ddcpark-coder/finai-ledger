const {test,expect}=require("@playwright/test");

async function activeContext(page,moduleName,parent,child){
  const level2=page.getByRole("navigation",{name:moduleName+" podmoduli"});
  await expect(level2.getByRole("button",{name:parent,exact:true})).toHaveAttribute("aria-pressed","true");
  const level3=page.getByRole("navigation",{name:parent+" možnosti"});
  await expect(level3.getByRole("button",{name:child,exact:true})).toHaveAttribute("aria-pressed","true");
}

test("deep link opens a contextual VAT view and changes visible content",async({page})=>{
  await page.goto("/?module=vat&view=DDV+evidence&subview=Izhodni+DDV");
  await activeContext(page,"DDV in poročila","DDV evidence","Izhodni DDV");
  await expect(page.getByRole("heading",{name:"DDV in poročila",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:/DDV evidence.*Izhodni DDV/})).toBeVisible();
});

test("second and third level changes create browser history entries",async({page})=>{
  await page.goto("/?module=vat&view=DDV+evidence&subview=Vstopni+DDV");
  await activeContext(page,"DDV in poročila","DDV evidence","Vstopni DDV");
  await page.getByRole("navigation",{name:"DDV evidence možnosti"}).getByRole("button",{name:"Izhodni DDV"}).click();
  await activeContext(page,"DDV in poročila","DDV evidence","Izhodni DDV");
  await expect(page).toHaveURL(/subview=Izhodni/);
  await page.getByRole("navigation",{name:"DDV in poročila podmoduli"}).getByRole("button",{name:"DDV-O"}).click();
  await activeContext(page,"DDV in poročila","DDV-O","Izračun");
  await page.goBack();
  await activeContext(page,"DDV in poročila","DDV evidence","Izhodni DDV");
  await page.goBack();
  await activeContext(page,"DDV in poročila","DDV evidence","Vstopni DDV");
  await page.goForward();
  await activeContext(page,"DDV in poročila","DDV evidence","Izhodni DDV");
});

test("favorites are persisted, can be reopened, and can be removed",async({page})=>{
  await page.goto("/?module=projects&view=Finance&subview=Mar%C5%BEa");
  await activeContext(page,"Projekti","Finance","Marža");
  await page.getByRole("button",{name:"☆ Pripni pogled"}).click();
  await expect(page.getByRole("button",{name:"★ Priljubljeno"})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button",{name:"★ Priljubljeno"})).toBeVisible();
  await page.getByRole("navigation",{name:"Projekti podmoduli"}).getByRole("button",{name:"Naloge"}).click();
  await page.getByRole("navigation",{name:"Priljubljeni podpogledi"}).getByRole("button",{name:/Projekti.*Finance.*Marža/}).click();
  await activeContext(page,"Projekti","Finance","Marža");
  await page.getByRole("button",{name:"★ Priljubljeno"}).click();
  await expect(page.getByRole("button",{name:"☆ Pripni pogled"})).toBeVisible();
});

test("last view is restored if the URL is opened without explicit route",async({page})=>{
  await page.goto("/?module=inventory&view=Premiki&subview=Prenosi");
  await activeContext(page,"Zaloge","Premiki","Prenosi");
  await page.goto("/");
  await activeContext(page,"Zaloge","Premiki","Prenosi");
  await expect(page).toHaveURL(/module=inventory/);
});

test("invalid route resolves to a valid current module without crashing",async({page})=>{
  await page.goto("/?module=missing-module&view=Bad");
  await expect(page.getByRole("heading",{name:"Nadzorna plošča",exact:true})).toBeVisible();
  await activeContext(page,"Nadzorna plošča","Pregled","Moj pregled");
  await expect(page).toHaveURL(/module=dashboard/);
});

test("mobile context navigation remains usable without clipping active tab",async({page,isMobile})=>{
  test.skip(!isMobile,"Mobile-specific assertions");
  await page.goto("/?module=inventory&view=Stanje&subview=Vsa+skladi%C5%A1%C4%8Da");
  await activeContext(page,"Zaloge","Stanje","Vsa skladišča");
  const parentNav=page.getByRole("navigation",{name:"Zaloge podmoduli"});
  await parentNav.getByRole("button",{name:"Opozorila"}).click();
  await activeContext(page,"Zaloge","Opozorila","Minimum");
  await expect(page.getByRole("heading",{name:/Opozorila.*Minimum/})).toBeVisible();
  await page.getByRole("navigation",{name:"Opozorila možnosti"}).getByRole("button",{name:"Neusklajeno"}).click();
  await activeContext(page,"Zaloge","Opozorila","Neusklajeno");
  const height=await parentNav.evaluate(el=>el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(52);
});

test("favorite routes are separated by demonstration company",async({page,isMobile})=>{
  test.skip(isMobile,"Desktop company switch verification");
  await page.goto("/?module=vat&view=DDV-O&subview=Izra%C4%8Dun");
  await page.getByRole("button",{name:"☆ Pripni pogled"}).click();
  const companySelect=page.locator(".topbarMain select.companySwitch");
  const options=await companySelect.locator("option").count();
  test.skip(options<2,"Only one demo company");
  const first=await companySelect.inputValue();
  const second=await companySelect.locator("option").nth(1).getAttribute("value");
  await companySelect.selectOption(second);
  await expect(page.getByRole("button",{name:"☆ Pripni pogled"})).toBeVisible();
  await companySelect.selectOption(first);
  await expect(page.getByRole("button",{name:"★ Priljubljeno"})).toBeVisible();
});

test("all 17 direct module routes render without runtime errors",async({page})=>{
  const modules=[
    ["dashboard","Nadzorna plošča"],["incoming_invoices","Prejeti računi"],
    ["issued_invoices","Izdani računi"],["accounting","Knjiženje"],
    ["banking","Banka"],["vat","DDV in poročila"],
    ["edavki","eDavki / FURS"],["partners","Partnerji"],
    ["documents","Dokumenti"],["catalog","Artikli in ceniki"],
    ["crm","CRM"],["quotes","Ponudbe"],["orders","Naročila"],
    ["procurement","Nabava"],["inventory","Zaloge"],
    ["projects","Projekti"],["settings","Nastavitve"]
  ];
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const [key,label] of modules){
    await test.step(label,async()=>{
      await page.goto("/?module="+encodeURIComponent(key));
      await expect(page.getByRole("heading",{name:label,exact:true})).toBeVisible();
      await expect(page.getByRole("navigation",{name:label+" podmoduli"})).toBeVisible();
    });
  }
  expect(errors).toEqual([]);
});

test("appearance controls persist on browser reload",async({page})=>{
  await page.goto("/?module=settings&view=Videz&subview=Tema");
  const theme=page.getByRole("button",{name:"Preklopi na svetlo"});
  await expect(theme).toBeVisible();
  await theme.click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/light/);
});
