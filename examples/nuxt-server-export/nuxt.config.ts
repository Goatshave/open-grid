export default defineNuxtConfig({
  compatibilityDate: "2026-07-16",
  devtools: { enabled: false },
  css: ["~/assets/main.css"],
  build: {
    transpile: ["@open-grid/example-shared-server"],
  },
  nitro: {
    preset: "node-server",
  },
  typescript: {
    strict: true,
  },
});
