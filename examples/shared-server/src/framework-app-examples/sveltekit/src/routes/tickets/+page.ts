import { createTicketExportPageModel } from "../../../../shared";

interface SvelteKitLoadEvent {
  url: URL;
}

export function load({ url }: SvelteKitLoadEvent) {
  return createTicketExportPageModel({
    framework: "SvelteKit",
    searchParams: url.searchParams,
    exportPath: "/api/tickets/export",
  });
}
