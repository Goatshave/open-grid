import { createFrameworkAppTicketExportResponse } from "../../../../../../shared";

interface SvelteKitRequestEvent {
  request: Request;
}

export function GET({ request }: SvelteKitRequestEvent): Response | Promise<Response> {
  return createFrameworkAppTicketExportResponse(request, "sveltekit-app-server-tickets");
}
