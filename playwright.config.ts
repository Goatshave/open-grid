import { defineConfig, devices } from "@playwright/test";
import { getE2eUrl, withE2ePortOffset } from "./scripts/e2e-ports.mjs";

export default defineConfig({
  testDir: "./e2e",
  testIgnore:
    /(ui-smoke|product-workflow|accessibility(?:-(?:display|keyboard|tree))?|framework-benchmark|server-benchmark|structure-budget)\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: getE2eUrl(4173),
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-basic build && pnpm --filter @open-grid/example-react-basic preview --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-grouped build && pnpm --filter @open-grid/example-vue-grouped preview --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-grouped build && pnpm --filter @open-grid/example-svelte-grouped preview --port 4175",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-server-grouping build && pnpm --filter @open-grid/example-react-server-grouping preview --port 4176",
      url: "http://127.0.0.1:4176",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-server-tree build && pnpm --filter @open-grid/example-react-server-tree preview --port 4177",
      url: "http://127.0.0.1:4177",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-server-side build && pnpm --filter @open-grid/example-react-server-side preview --port 4178",
      url: "http://127.0.0.1:4178",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-server-side build && pnpm --filter @open-grid/example-vue-server-side preview --port 4179",
      url: "http://127.0.0.1:4179",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-server-side build && pnpm --filter @open-grid/example-svelte-server-side preview --port 4180",
      url: "http://127.0.0.1:4180",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-server-tree build && pnpm --filter @open-grid/example-vue-server-tree preview --port 4181",
      url: "http://127.0.0.1:4181",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-server-tree build && pnpm --filter @open-grid/example-svelte-server-tree preview --port 4182",
      url: "http://127.0.0.1:4182",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/vue-ui build && pnpm --filter @open-grid/example-vue-server-grouping build && pnpm --filter @open-grid/example-vue-server-grouping preview --port 4183",
      url: "http://127.0.0.1:4183",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/svelte-ui build && pnpm --filter @open-grid/example-svelte-server-grouping build && pnpm --filter @open-grid/example-svelte-server-grouping preview --port 4184",
      url: "http://127.0.0.1:4184",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @open-grid/example-nextjs-server-export build && pnpm --filter @open-grid/example-nextjs-server-export start -H 127.0.0.1 -p 4185",
      url: "http://127.0.0.1:4185/tickets",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command:
        "pnpm --filter @open-grid/example-nuxt-server-export build && HOST=127.0.0.1 PORT=4186 pnpm --filter @open-grid/example-nuxt-server-export start",
      url: "http://127.0.0.1:4186/tickets",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command:
        "pnpm --filter @open-grid/example-sveltekit-server-export build && HOST=127.0.0.1 PORT=4187 pnpm --filter @open-grid/example-sveltekit-server-export start",
      url: "http://127.0.0.1:4187/tickets",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ].map((server) => ({
    ...server,
    command: withE2ePortOffset(server.command),
    url: withE2ePortOffset(server.url),
  })),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
