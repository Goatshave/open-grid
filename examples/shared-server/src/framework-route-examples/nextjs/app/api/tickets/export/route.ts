import { createTicketExportRouteResponse } from "../../../../../shared";

export function GET(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);

  return createTicketExportRouteResponse(url.searchParams, "nextjs-server-tickets");
}
