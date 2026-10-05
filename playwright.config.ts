import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  projects: [{ name: "chromium" }],
});
