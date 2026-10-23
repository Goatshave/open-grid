import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixture = new URL("../../compatibility/svelte-4/", import.meta.url);
const require = createRequire(new URL("package.json", fixture));
const vitePackage = pathToFileURL(require.resolve("vite/package.json"));
const { loadConfigFromFile } = await import(new URL("dist/node/index.js", vitePackage).href);
const configFile = fileURLToPath(new URL("vite.config.ts", fixture));
const root = fileURLToPath(fixture);

test("Svelte 4 lower-bound fixture rejects dev, middleware and preview server configs", async () => {
  for (const isPreview of [false, true]) {
    await assert.rejects(
      loadConfigFromFile({ command: "serve", mode: "development", isPreview }, configFile, root, "silent"),
      /compatibility fixture is build-only/,
    );
  }
});

test("Svelte 4 lower-bound fixture still permits the compatibility build", async () => {
  const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, configFile, root, "silent");
  assert.ok(loaded?.config.plugins.length > 0);
});
