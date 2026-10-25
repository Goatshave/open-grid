import { defineConfig, devices } from "@playwright/test";
import { withE2ePortOffset } from "./scripts/e2e-ports.mjs";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(framework-server-data|react-server-side|vue-server-side|svelte-server-side)\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: { trace: "on-first-retry" },
  webServer: [
    { name: "react", port: 4178 }, { name: "vue", port: 4179 }, { name: "svelte", port: 4180 },
  ].map(({ name, port }) => ({
    command: withE2ePortOffset(`pnpm --filter @open-grid/example-${name}-server-side build && pnpm --filter @open-grid/example-${name}-server-side preview --port ${port}`),
    url: withE2ePortOffset(`http://127.0.0.1:${port}`), reuseExistingServer: false, timeout: 120_000,
  })),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
