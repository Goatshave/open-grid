import { defineConfig, devices } from "@playwright/test";
import { getE2eUrl, withE2ePortOffset } from "./scripts/e2e-ports.mjs";

const rendererServers = [
  {
    command:
      "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-basic build && pnpm --filter @open-grid/example-react-basic preview --port 4173",
    url: "http://127.0.0.1:4173",
  },
  {
    command:
      "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-grouped build && pnpm --filter @open-grid/example-vue-grouped preview --port 4174",
    url: "http://127.0.0.1:4174",
  },
  {
    command:
      "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-grouped build && pnpm --filter @open-grid/example-svelte-grouped preview --port 4175",
    url: "http://127.0.0.1:4175",
  },
  {
    command:
      "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-server-side build && pnpm --filter @open-grid/example-react-server-side preview --port 4178",
    url: "http://127.0.0.1:4178",
  },
  {
    command:
      "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-server-side build && pnpm --filter @open-grid/example-vue-server-side preview --port 4179",
    url: "http://127.0.0.1:4179",
  },
  {
    command:
      "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-server-side build && pnpm --filter @open-grid/example-svelte-server-side preview --port 4180",
    url: "http://127.0.0.1:4180",
  },
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(react|vue|svelte)-grid\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: getE2eUrl(4173),
    trace: "on-first-retry",
  },
  webServer: rendererServers.map((server) => ({
    command: withE2ePortOffset(server.command),
    url: withE2ePortOffset(server.url),
    reuseExistingServer: false,
    timeout: 120_000,
  })),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
