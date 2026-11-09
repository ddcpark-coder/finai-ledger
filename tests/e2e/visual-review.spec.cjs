const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test("FinAI visual demo status and context-aware feedback", async ({ page }, testInfo) => {
  const output = path.join("test-results", "visual-qa");
  fs.mkdirSync(output, { recursive: true });

  await page.goto("/");
  const banner = page.getByRole("note", { name: "Status demonstracijske izdaje" });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("sintetični");
  await expect(page.getByRole("heading", { name: "Nadzorna plošča" })).toBeVisible();
  await page.screenshot({
    path: path.join(output, testInfo.project.name + "-dashboard.png"),
    fullPage: true
  });

  await page.getByRole("button", { name: "Pripomba o zaslonu" }).click();
  const dialog = page.getByRole("dialog", { name: "Pripomba k izbranemu zaslonu" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Kaj želiš spremeniti?").fill("Test: večji naslov in kontrast kartic.");
  const report = dialog.getByLabel("Predogled poročila");
  await expect(report).toHaveValue(/Modul: Nadzorna plošča/);
  await expect(report).toHaveValue(/Pripomba: Test: večji naslov in kontrast kartic/);
  await page.screenshot({
    path: path.join(output, testInfo.project.name + "-feedback.png"),
    fullPage: false
  });
  await dialog.getByRole("button", { name: "Zapri" }).click();
  await expect(dialog).not.toBeVisible();
});
