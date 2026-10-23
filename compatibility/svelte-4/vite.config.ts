import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  if (command !== "build") {
    throw new Error("The Svelte 4 compatibility fixture is build-only; dev and preview servers are disabled.");
  }
  return {
    plugins: [svelte({ preprocess: vitePreprocess() })],
  };
});
