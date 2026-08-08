import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import "./styles.css";
import {
  createColumnHelper,
  DataGrid,
  downloadExportFile,
  type AnyColumnDef,
  type ColumnFiltersState,
  type GridState,
  type PaginationState,
  type SortingState,
} from "@open-grid/react-ui";
import {
  createChunkedServerCsvExport,
  createServerSideTicketExportColumns,
  createServerSideTickets,
  createStreamingServerCsvResponse,
  getServerSideTicketRows,
  queryServerSideTickets,
  type ServerCsvExportColumn,
  type ServerSideTicket,
  type ServerSideTicketQuery,
} from "@open-grid/example-shared-server";
import { createRoot } from "react-dom/client";
import { useMemo, useRef, useState } from "react";

const column = createColumnHelper<ServerSideTicket>();
const allTickets = createServerSideTickets("TCK", { valueBase: 1_500, valueStep: 83, openedMonth: "2026-06" });

const columns: AnyColumnDef<ServerSideTicket>[] = [
  column.accessor("id", { header: "Ticket", size: 120 }),
  column.accessor("account", { header: "Account", size: 190 }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("status", { header: "Status", size: 120 }),
  column.accessor("priority", { header: "Priority", size: 110 }),
  column.accessor("value", {
    header: "Value",
    size: 120,
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
  column.accessor("openedAt", { header: "Opened", size: 130 }),
];

const serverExportColumns: ServerCsvExportColumn<ServerSideTicket>[] = createServerSideTicketExportColumns();

async function exportTicketsFromServer(query: Pick<ServerSideTicketQuery, "columnFilters" | "sorting">) {
  const rows = getServerSideTicketRows(allTickets, query);

  return createChunkedServerCsvExport({
    rows,
    columns: serverExportColumns,
    filename: "server-tickets",
    chunkSize: 50,
    onChunk: () => new Promise((resolve) => window.setTimeout(resolve, 0)),
  });
}

async function* createDelayedServerRows(rows: ServerSideTicket[], onCancel: () => void): AsyncIterable<ServerSideTicket> {
  let completed = false;

  try {
    for (const row of rows) {
      await new Promise((resolve) => window.setTimeout(resolve, 35));
      yield row;
    }

    completed = true;
  } finally {
    if (!completed) {
      onCancel();
    }
  }
}

function App() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [exportStatus, setExportStatus] = useState("Server export idle");
  const [streamStatus, setStreamStatus] = useState("Streaming export idle");
  const [streamingActive, setStreamingActive] = useState(false);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const streamProgressRef = useRef(0);
  const streamCancelRequestedRef = useRef(false);
  const serverResult = useMemo(
    () => queryServerSideTickets(allTickets, { sorting, columnFilters, pagination }),
    [columnFilters, pagination, sorting],
  );
  const accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  const serverPageIndex = serverResult.pageIndex;

  const handleStateChange = (state: GridState) => {
    setSorting(state.sorting);
    setColumnFilters(state.columnFilters);
    setPagination(state.pagination);
  };

  const setAccountFilter = (value: string) => {
    setColumnFilters(value ? [{ id: "account", value }] : []);
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  };

  const handleServerExport = async () => {
    setExportStatus("Exporting server CSV...");
    const result = await exportTicketsFromServer({ sorting, columnFilters });
    const downloaded = downloadExportFile(result.file);
    setExportStatus(downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable");
  };

  const handleStreamingExport = async () => {
    if (streamReaderRef.current) {
      return;
    }

    const rows = getServerSideTicketRows(allTickets, { sorting, columnFilters });
    let streamedRows = 0;
    let cancelled = false;
    let streamedBytes = 0;
    streamProgressRef.current = 0;
    streamCancelRequestedRef.current = false;
    setStreamingActive(true);
    setStreamStatus(`Streaming 0 of ${rows.length} server rows`);

    const response = createStreamingServerCsvResponse({
      rows: createDelayedServerRows(rows, () => {
        cancelled = true;
      }),
      columns: serverExportColumns,
      filename: "server-tickets-stream",
      chunkSize: 5,
      onChunk: ({ rowCount }) => {
        streamedRows = rowCount;
        streamProgressRef.current = rowCount;
        if (!streamCancelRequestedRef.current) {
          setStreamStatus(`Streaming ${rowCount} of ${rows.length} server rows`);
        }
      },
    });
    const reader = response.body?.getReader();

    if (!reader) {
      setStreamingActive(false);
      setStreamStatus("Streaming export unavailable");
      return;
    }

    streamReaderRef.current = reader;

    try {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) {
          break;
        }

        streamedBytes += chunk.value.byteLength;
      }

      if (cancelled || streamCancelRequestedRef.current) {
        setStreamStatus(`Cancelled streaming export after ${streamedRows} server rows`);
      } else {
        setStreamStatus(`Streamed ${rows.length} server rows (${streamedBytes} bytes)`);
      }
    } catch (error) {
      setStreamStatus(error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed");
    } finally {
      if (streamReaderRef.current === reader) {
        streamReaderRef.current = null;
      }
      setStreamingActive(false);
    }
  };

  const handleStreamingCancel = async () => {
    const reader = streamReaderRef.current;

    if (!reader) {
      return;
    }

    setStreamStatus("Cancelling streaming export...");
    streamCancelRequestedRef.current = true;
    setStreamStatus(`Cancelled streaming export after ${streamProgressRef.current} server rows`);
    await reader.cancel();
  };

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="Server-side grid controls">
        <div>
          <h1>Server-side tickets</h1>
          <p>
            {serverResult.totalRows} matching rows · page {serverPageIndex + 1} of {serverResult.pageCount}
          </p>
        </div>
        <label className="filter-control">
          Account
          <input value={accountFilter} onChange={(event) => setAccountFilter(event.currentTarget.value)} placeholder="Filter account" />
        </label>
        <div className="export-control">
          <button type="button" onClick={handleServerExport}>
            Export server CSV
          </button>
          <span data-testid="server-export-status">{exportStatus}</span>
        </div>
        <div className="export-control">
          <button type="button" onClick={handleStreamingExport} disabled={streamingActive}>
            Preview streaming CSV
          </button>
          <button type="button" onClick={handleStreamingCancel} disabled={!streamingActive}>
            Cancel stream
          </button>
          <span data-testid="server-stream-status">{streamStatus}</span>
        </div>
      </section>

      <DataGrid
        data={serverResult.rows}
        columns={columns}
        getRowId={(row) => row.id}
        state={{
          sorting,
          columnFilters,
          pagination,
        }}
        onStateChange={handleStateChange}
        manualSorting
        manualFiltering
        manualPagination
        pageCount={serverResult.pageCount}
        initialState={{
          columnPinning: { left: ["id"], right: ["value"] },
        }}
        columnPinningControls
      />

      <nav className="pagination" aria-label="Server pagination">
        <button type="button" disabled={serverPageIndex === 0} onClick={() => setPagination((previous) => ({ ...previous, pageIndex: 0 }))}>
          First
        </button>
        <button
          type="button"
          disabled={serverPageIndex === 0}
          onClick={() => setPagination((previous) => ({ ...previous, pageIndex: Math.max(0, serverPageIndex - 1) }))}
        >
          Previous
        </button>
        <span>
          Page {serverPageIndex + 1} / {serverResult.pageCount}
        </span>
        <button
          type="button"
          disabled={serverPageIndex >= serverResult.pageCount - 1}
          onClick={() =>
            setPagination((previous) => ({
              ...previous,
              pageIndex: Math.min(serverResult.pageCount - 1, serverPageIndex + 1),
            }))
          }
        >
          Next
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
