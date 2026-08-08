import { createTicketExportPageModel } from "../../shared";

export function createNuxtTicketsPage(url: URL | string) {
  const pageUrl = typeof url === "string" ? new URL(url, "https://example.com") : url;

  return createTicketExportPageModel({
    framework: "Nuxt",
    searchParams: pageUrl.searchParams,
    exportPath: "/api/tickets/export",
  });
}
