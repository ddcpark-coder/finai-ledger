const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"],["junit",{outputFile:"test-results/e2e.xml"}]] : "list",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {name:"desktop-chromium", use:{...devices["Desktop Chrome"], viewport:{width:1440,height:900}}},
    {name:"mobile-chromium", use:{...devices["iPhone 13"],defaultBrowserType:"chromium"}},
  ]
});
