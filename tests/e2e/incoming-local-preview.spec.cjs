const {test,expect}=require("@playwright/test");

const syntheticPng=Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=",
  "base64"
);

test("synthetic document can be previewed locally and is not attached to incoming record",async({page})=>{
  const requests=[];
  page.on("request",request=>{
    if(["POST","PUT","PATCH"].includes(request.method()))requests.push(request.url());
  });
  await page.goto("/?module=incoming_invoices&view=Pregled&subview=Vsi");
  await page.getByRole("button",{name:/Nov demo račun/}).click();
  const dialog=page.getByRole("dialog",{name:"Nov demonstracijski prejeti račun"});
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Izberi lokalni vzorec dokumenta").setInputFiles({
    name:"synthetic.png",mimeType:"image/png",buffer:syntheticPng
  });
  await expect(dialog.getByText("Lokalno izbrano:")).toBeVisible();
  await expect(dialog.getByRole("img",{name:"Predogled sintetičnega dokumenta samo v brskalniku"})).toBeVisible();
  await dialog.getByRole("button",{name:"Odstrani vzorec"}).click();
  await expect(dialog.getByRole("img",{name:"Predogled sintetičnega dokumenta samo v brskalniku"})).toHaveCount(0);
  await dialog.getByLabel("Dobavitelj").fill("Sintetični lokalni vzorec");
  await dialog.getByLabel("Številka prejetega računa").fill("TEST-PREVIEW-01");
  await dialog.getByLabel("Bruto znesek v EUR").fill("12,20");
  await dialog.getByRole("button",{name:"Dodaj v demonstracijo"}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".invoiceRow").filter({hasText:"Sintetični lokalni vzorec"})).toBeVisible();
  expect(requests).toEqual([]);
});
