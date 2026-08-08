import { createChunkedServerCsvExport, createServerCsvResponse, createStreamingServerCsvResponse, type ServerCsvExportColumn } from "../index";

interface ExportTicket {
  id: string;
  account: string;
  status: "Backlog" | "Open" | "Waiting" | "Resolved";
  value: number;
}

interface ExportSession {
  userId: string;
  canExport: boolean;
  accountScope: readonly string[];
}

const tickets: ExportTicket[] = [
  { id: "SEC-001", account: "Acme Labs", status: "Open", value: 1200 },
  { id: "SEC-002", account: "Northwind", status: "Waiting", value: 900 },
  { id: "SEC-003", account: "Acme Labs", status: "Resolved", value: 1800 },
  { id: "SEC-004", account: "Blue River", status: "Open", value: 1500 },
  { id: "SEC-005", account: "Acme Labs", status: "Backlog", value: 700 },
  { id: "SEC-006", account: "Northwind", status: "Open", value: 2100 },
];

const sessions = new Map<string, ExportSession>([
  ["ops-token", { userId: "ops", canExport: true, accountScope: ["Acme Labs", "Northwind", "Blue River"] }],
  ["acme-token", { userId: "acme-user", canExport: true, accountScope: ["Acme Labs"] }],
  ["viewer-token", { userId: "viewer", canExport: false, accountScope: ["Acme Labs"] }],
]);

const columnRegistry = {
  id: { id: "id", header: "Ticket" },
  account: { id: "account", header: "Account" },
  status: { id: "status", header: "Status" },
  value: { id: "value", header: "Value" },
} satisfies Record<string, ServerCsvExportColumn<ExportTicket>>;

const allowedQueryKeys = new Set(["account", "status", "sort", "stream", "columns"]);
const allowedStatuses = new Set<ExportTicket["status"]>(["Backlog", "Open", "Waiting", "Resolved"]);
const allowedSorts = new Set(["id-asc", "value-desc"]);
const maxExportRows = 3;
const productionExportHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "x-accel-buffering": "no",
};

export async function createProductionTicketExportResponse(request: Request): Promise<Response> {
  const session = authenticateExportRequest(request);

  if (!session) {
    return createJsonErrorResponse(401, "Authentication is required for server exports.");
  }

  if (!session.canExport) {
    return createJsonErrorResponse(403, "The current user cannot export this dataset.");
  }

  const url = new URL(request.url);
  const query = parseExportQuery(url.searchParams);

  if (query instanceof Response) {
    return query;
  }

  if (query.account && !session.accountScope.includes(query.account)) {
    return createJsonErrorResponse(403, "The requested account is outside the user's export scope.");
  }

  const rows = getAuthorizedRows(query, session);

  if (rows.length > maxExportRows) {
    return createJsonErrorResponse(413, `Export is limited to ${maxExportRows} rows. Narrow the query before exporting.`);
  }

  return query.stream
    ? createStreamingServerCsvResponse(
        {
          rows,
          columns: query.columns,
          filename: "production-server-tickets",
          chunkSize: 2,
        },
        { headers: productionExportHeaders },
      )
    : createBufferedProductionExportResponse(rows, query.columns);
}

async function createBufferedProductionExportResponse(rows: readonly ExportTicket[], columns: readonly ServerCsvExportColumn<ExportTicket>[]): Promise<Response> {
  const result = await createChunkedServerCsvExport({
    rows,
    columns,
    filename: "production-server-tickets",
    chunkSize: 2,
  });

  return createServerCsvResponse(result.file, { headers: productionExportHeaders });
}

function authenticateExportRequest(request: Request): ExportSession | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return null;
  }

  return sessions.get(token) ?? null;
}

function parseExportQuery(searchParams: URLSearchParams):
  | {
      account: string | null;
      status: ExportTicket["status"] | null;
      sort: "id-asc" | "value-desc";
      stream: boolean;
      columns: ServerCsvExportColumn<ExportTicket>[];
    }
  | Response {
  const seenQueryKeys = new Set<string>();

  for (const key of searchParams.keys()) {
    if (!allowedQueryKeys.has(key)) {
      return createJsonErrorResponse(400, `Unsupported export query parameter: ${key}`);
    }

    if (seenQueryKeys.has(key)) {
      return createJsonErrorResponse(400, `Duplicate export query parameter: ${key}`);
    }

    seenQueryKeys.add(key);
  }

  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "id-asc";
  const stream = searchParams.get("stream");

  if (status && !allowedStatuses.has(status as ExportTicket["status"])) {
    return createJsonErrorResponse(400, `Unsupported status filter: ${status}`);
  }

  if (!allowedSorts.has(sort)) {
    return createJsonErrorResponse(400, `Unsupported sort: ${sort}`);
  }

  if (stream != null && stream !== "1") {
    return createJsonErrorResponse(400, "Streaming exports must use stream=1 when requested.");
  }

  const columns = parseColumns(searchParams.get("columns"));

  if (columns instanceof Response) {
    return columns;
  }

  return {
    account: searchParams.get("account"),
    status: status as ExportTicket["status"] | null,
    sort: sort as "id-asc" | "value-desc",
    stream: stream === "1",
    columns,
  };
}

function parseColumns(value: string | null): ServerCsvExportColumn<ExportTicket>[] | Response {
  const ids = value == null ? Object.keys(columnRegistry) : value.split(",").map((id) => id.trim()).filter(Boolean);

  if (value != null && ids.length === 0) {
    return createJsonErrorResponse(400, "At least one export column must be requested.");
  }

  const seenColumnIds = new Set<string>();
  const columns: ServerCsvExportColumn<ExportTicket>[] = [];

  for (const id of ids) {
    if (seenColumnIds.has(id)) {
      return createJsonErrorResponse(400, `Duplicate export column: ${id}`);
    }

    const column = columnRegistry[id as keyof typeof columnRegistry];

    if (!column) {
      return createJsonErrorResponse(400, `Unsupported export column: ${id}`);
    }

    seenColumnIds.add(id);
    columns.push(column);
  }

  return columns;
}

function getAuthorizedRows(
  query: {
    account: string | null;
    status: ExportTicket["status"] | null;
    sort: "id-asc" | "value-desc";
  },
  session: ExportSession,
): ExportTicket[] {
  let rows = tickets.filter((row) => session.accountScope.includes(row.account));

  if (query.account) {
    rows = rows.filter((row) => row.account === query.account);
  }

  if (query.status) {
    rows = rows.filter((row) => row.status === query.status);
  }

  if (query.sort === "value-desc") {
    rows.sort((left, right) => right.value - left.value || left.id.localeCompare(right.id));
  } else {
    rows.sort((left, right) => left.id.localeCompare(right.id));
  }

  return rows;
}

function createJsonErrorResponse(status: number, message: string): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "cache-control": "private, no-store",
      },
    },
  );
}
