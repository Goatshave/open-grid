import { createFrameworkAppTicketExportResponse } from "../../../../../shared";

export function GET(request: Request): Response | Promise<Response> {
  return createFrameworkAppTicketExportResponse(request, "nextjs-app-server-tickets");
}
