import { defineConfig, devices } from "@playwright/test";

const servers = [
  ["@open-grid/benchmark-open-grid-react", 4301],
  ["@open-grid/benchmark-open-grid-react-full", 4306],
  ["@open-grid/benchmark-open-grid-vue", 4304],
  ["@open-grid/benchmark-open-grid-svelte", 4305],
] as const;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /structure-budget\.spec\.ts/,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: { trace: "on-first-retry" },
  webServer: servers.map(([packageName, port]) => ({
    command: `pnpm --filter ${packageName} preview`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  })),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
