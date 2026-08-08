import { createServerTreePageModel } from "../../shared";

export function createNuxtPortfoliosPage(url: URL | string) {
  const pageUrl = typeof url === "string" ? new URL(url, "https://example.com") : url;

  return createServerTreePageModel({
    framework: "Nuxt",
    searchParams: pageUrl.searchParams,
    childrenPath: "/api/portfolios/children",
  });
}
