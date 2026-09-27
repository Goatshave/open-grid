import { defineConfig, devices } from "@playwright/test";
import { withE2ePortOffset } from "./scripts/e2e-ports.mjs";

const serverTreeServers = [
  {
    command:
      "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-server-tree build && pnpm --filter @open-grid/example-react-server-tree preview --port 4177",
    url: "http://127.0.0.1:4177",
  },
  {
    command:
      "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-server-tree build && pnpm --filter @open-grid/example-vue-server-tree preview --port 4181",
    url: "http://127.0.0.1:4181",
  },
  {
    command:
      "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-server-tree build && pnpm --filter @open-grid/example-svelte-server-tree preview --port 4182",
    url: "http://127.0.0.1:4182",
  },
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: /framework-server-lifecycle\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: { trace: "on-first-retry" },
  webServer: serverTreeServers.map((server) => ({
    command: withE2ePortOffset(server.command),
    url: withE2ePortOffset(server.url),
    reuseExistingServer: false,
    timeout: 120_000,
  })),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
