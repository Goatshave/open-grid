import { defineConfig, devices } from "@playwright/test";
import { createPlaywrightWebServers } from "./scripts/ui-smoke-targets.mjs";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(ui-smoke|product-workflow|accessibility(?:-(?:display|keyboard|tree))?)\.spec\.ts/,
  timeout: 20_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    trace: "on-first-retry",
  },
  webServer: createPlaywrightWebServers(),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
