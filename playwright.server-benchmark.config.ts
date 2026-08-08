import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /server-benchmark\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { trace: "on-first-retry", viewport: { width: 1280, height: 800 } },
  webServer: {
    command: "pnpm --filter @open-grid/benchmark-open-grid-react-server preview",
    url: "http://127.0.0.1:4307",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
