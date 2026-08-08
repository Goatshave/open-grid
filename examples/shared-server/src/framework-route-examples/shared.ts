import { createChunkedServerCsvExport, createServerCsvResponse, createStreamingServerCsvResponse, type ServerCsvExportColumn } from "../index";

export interface RouteTicket {
  id: string;
  account: string;
  status: "Backlog" | "Open" | "Waiting" | "Resolved";
  value: number;
}

const tickets: RouteTicket[] = [
  { id: "FW-001", account: "Acme Labs", status: "Open", value: 1200 },
  { id: "FW-002", account: "Northwind", status: "Waiting", value: 900 },
  { id: "FW-003", account: "Acme Labs", status: "Resolved", value: 1800 },
  { id: "FW-004", account: "Blue River", status: "Open", value: 1500 },
  { id: "FW-005", account: "Acme Labs", status: "Backlog", value: 700 },
  { id: "FW-006", account: "Northwind", status: "Open", value: 2100 },
];

const columns: ServerCsvExportColumn<RouteTicket>[] = [
  { id: "id", header: "Ticket" },
  { id: "account", header: "Account" },
  { id: "status", header: "Status" },
  { id: "value", header: "Value" },
];

export function createTicketExportRouteResponse(searchParams: URLSearchParams, filename: string): Response | Promise<Response> {
  return searchParams.get("stream") === "1"
    ? createStreamingServerCsvResponse({
        rows: getRouteTicketRows(searchParams),
        columns,
        filename,
        chunkSize: 2,
      })
    : createBufferedTicketExportResponse(searchParams, filename);
}

async function createBufferedTicketExportResponse(searchParams: URLSearchParams, filename: string): Promise<Response> {
  const result = await createChunkedServerCsvExport({
    rows: getRouteTicketRows(searchParams),
    columns,
    filename,
    chunkSize: 2,
  });

  return createServerCsvResponse(result.file);
}

export function getRouteTicketRows(searchParams: URLSearchParams): RouteTicket[] {
  let rows = [...tickets];
  const account = searchParams.get("account");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort");

  if (account) {
    const accountFilter = account.toLowerCase();
    rows = rows.filter((row) => row.account.toLowerCase().includes(accountFilter));
  }

  if (status) {
    rows = rows.filter((row) => row.status.toLowerCase() === status.toLowerCase());
  }

  if (sort === "value-desc") {
    rows.sort((left, right) => right.value - left.value || left.id.localeCompare(right.id));
  } else {
    rows.sort((left, right) => left.id.localeCompare(right.id));
  }

  return rows;
}
