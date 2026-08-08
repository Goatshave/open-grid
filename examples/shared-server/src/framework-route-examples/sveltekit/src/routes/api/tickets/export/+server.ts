import { createTicketExportRouteResponse } from "../../../../../../shared";

interface SvelteKitRequestEvent {
  url: URL;
  request: Request;
}

export function GET({ url }: SvelteKitRequestEvent): Response | Promise<Response> {
  return createTicketExportRouteResponse(url.searchParams, "sveltekit-server-tickets");
}
