import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "Open Grid",
  description: "A production-oriented data grid foundation for React, Vue, and Svelte.",
  base: "/open-grid/",
  cleanUrls: true,
  srcExclude: ["README.md", "agent-handoff.md", "release.md"],
  head: [["link", { rel: "icon", href: "/open-grid/favicon.ico", sizes: "any" }]],
  markdown: {
    lineNumbers: true,
  },
  vite: {
    plugins: [
      {
        name: "open-grid-dev-favicon",
        configureServer(server) {
          server.middlewares.use("/favicon.ico", (_request, response) => {
            response.statusCode = 302;
            response.setHeader("Location", "/open-grid/favicon.ico");
            response.end();
          });
        },
      },
    ],
  },
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Open Grid",
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Frameworks", link: "/react-ui" },
      { text: "Packages", link: "/packages" },
      { text: "Performance", link: "/performance" },
      { text: "v0.1.0", link: "https://github.com/Goatshave/open-grid/releases" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "Packages", link: "/packages" },
        ],
      },
      {
        text: "Framework UI",
        items: [
          { text: "React", link: "/react-ui" },
          { text: "Vue", link: "/vue-ui" },
          { text: "Svelte", link: "/svelte-ui" },
        ],
      },
      {
        text: "Engineering",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "API stability", link: "/api-stability" },
          { text: "Performance", link: "/performance" },
          { text: "Roadmap", link: "/roadmap" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Contributing", link: "https://github.com/Goatshave/open-grid/blob/main/CONTRIBUTING.md" },
          { text: "Changelog", link: "https://github.com/Goatshave/open-grid/blob/main/CHANGELOG.md" },
          { text: "Security", link: "https://github.com/Goatshave/open-grid/blob/main/SECURITY.md" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Goatshave/open-grid" }],
    search: { provider: "local" },
    outline: { level: [2, 3], label: "On this page" },
    editLink: {
      pattern: "https://github.com/Goatshave/open-grid/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Open Grid contributors",
    },
  },
});
