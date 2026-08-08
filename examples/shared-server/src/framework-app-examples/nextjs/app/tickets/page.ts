import { createTicketExportPageModel, type TicketExportPageSearchParams } from "../../../shared";

export interface NextTicketsPageProps {
  searchParams?: TicketExportPageSearchParams | Promise<TicketExportPageSearchParams>;
}

export default async function TicketsPage({ searchParams }: NextTicketsPageProps = {}) {
  return createTicketExportPageModel({
    framework: "Next.js",
    searchParams: await Promise.resolve(searchParams),
    exportPath: "/api/tickets/export",
  });
}
