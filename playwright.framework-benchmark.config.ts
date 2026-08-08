import { defineConfig, devices } from "@playwright/test";

const servers = [
  ["@open-grid/benchmark-open-grid-react-full", 4306],
  ["@open-grid/benchmark-open-grid-vue", 4304],
  ["@open-grid/benchmark-open-grid-svelte", 4305],
] as const;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /framework-benchmark\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { trace: "on-first-retry", viewport: { width: 1280, height: 800 } },
  webServer: servers.map(([packageName, port]) => ({
    command: `pnpm --filter ${packageName} preview`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  })),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
