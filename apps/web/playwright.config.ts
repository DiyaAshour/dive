import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {timeout: 8_000},
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure"},
  projects: [{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000/api/v1/health/live",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
