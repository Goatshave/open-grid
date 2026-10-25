import { isISOCalendarDate } from "@open-grid/core";
import { TicketEditor } from "./TicketEditor";
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import "./styles.css";
import {
  createColumnHelper,
  DataGrid,
  downloadExportFile,
  type AnyColumnDef,
} from "@open-grid/react-ui";
import {
  createChunkedServerCsvExport,
  createServerSideTicketExportColumns,
  createStreamingServerCsvResponse,
  type ServerCsvExportColumn,
  type ServerSideTicket,
} from "@open-grid/example-shared-server";
import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";

import { createTicketClient, getTicketPaginationLocalization, getTicketSaveSummary, type TicketClientSnapshot } from "@open-grid/example-shared-server/ticket-client";

const column = createColumnHelper<ServerSideTicket>();

const columns: AnyColumnDef<ServerSideTicket>[] = [
  column.accessor("id", { header: "Ticket", size: 120 }),
  column.accessor("account", { header: "Account", size: 280, enableEditing: true, validateEditValue: (value) => String(value).trim().length >= 3 || "Account must be at least 3 characters" }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("status", { header: "Status", filterType: "set", filterOptions: ["Backlog", "Open", "Waiting", "Resolved"].map((value) => ({ value })), size: 180 }),
  column.accessor("priority", { header: "Priority", size: 110 }),
  column.accessor("value", {
    header: "Value", filterType: "number-range",
    size: 120,
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
  column.accessor("openedAt", { header: "Opened", filterType: "date-range", size: 280, enableEditing: true, validateEditValue: (value) => isISOCalendarDate(value) || "Use an ISO calendar date" }),
];

const serverExportColumns: ServerCsvExportColumn<ServerSideTicket>[] = createServerSideTicketExportColumns();

async function exportTicketsFromServer(rows: ServerSideTicket[]) {
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
  const [client, setClient] = useState<ReturnType<typeof createTicketClient> | null>(null);
  const [remote, setRemote] = useState<TicketClientSnapshot | null>(null);
  useEffect(() => {
    const current = createTicketClient(); setClient(current); setRemote(current.getSnapshot());
    const unsubscribe = current.subscribe(() => setRemote(current.getSnapshot()));
    void current.start();
    return () => { unsubscribe(); current.dispose(); };
  }, []);
  const [exportStatus, setExportStatus] = useState("Server export idle");
  const [streamStatus, setStreamStatus] = useState("Streaming export idle");
  const [streamingActive, setStreamingActive] = useState(false);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const streamProgressRef = useRef(0);
  const streamCancelRequestedRef = useRef(false);
  if (!client || !remote) return <main role="status">Loading tickets...</main>;
  const serverResult = remote.page;
  const { sorting, columnFilters } = remote.requested;
  const accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  const serverPageIndex = serverResult.pageIndex;
  const saveSummary = getTicketSaveSummary(remote);
  const handleStateChange = client.onStateChange;
  const setAccountFilter = client.setAccountFilter;

  const handleServerExport = async () => {
    setExportStatus("Exporting server CSV...");
    try {
      const result = await exportTicketsFromServer(await client.exportRows({ sorting, columnFilters }));
      const downloaded = downloadExportFile(result.file);
      setExportStatus(downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable");
    } catch (error) {
      setExportStatus(error instanceof Error ? `Server export failed: ${error.message}` : "Server export failed");
    }
  };

  const handleStreamingExport = async () => {
    if (streamingActive) {
      return;
    }

    setStreamingActive(true);
    setStreamStatus("Loading server rows for streaming export...");
    let rows: ServerSideTicket[];
    try { rows = await client.exportRows({ sorting, columnFilters }); }
    catch (error) {
      setStreamStatus(error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed");
      setStreamingActive(false);
      return;
    }
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
    <main className="app-shell" onInputCapture={(event) => client.onEditorInput(event.nativeEvent)}>
      <section className="toolbar" aria-label="Server-side grid controls">
        <div>
          <h1>Server-side tickets</h1>
          <p>
            {serverResult.totalRows ?? "Unknown total"} matching rows · page {serverPageIndex + 1}{serverResult.pageCount === undefined ? "" : ` of ${serverResult.pageCount}`}
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
          <span role="status" aria-live="polite" data-testid="server-export-status">{exportStatus}</span>
        </div>
        <div className="export-control">
          <button type="button" onClick={handleStreamingExport} disabled={streamingActive}>
            Preview streaming CSV
          </button>
          <button type="button" onClick={handleStreamingCancel} disabled={!streamingActive}>
            Cancel stream
          </button>
          <span role="status" aria-live="polite" data-testid="server-stream-status">{streamStatus}</span>
        </div>
      </section>

      <section aria-label="Remote data controls">
        <button type="button" onClick={() => void client.refresh()} disabled={remote.loading}>Refresh tickets</button>
        <button type="button" onClick={() => void client.failRefresh()} disabled={remote.loading}>Simulate load failure</button>
        <button type="button" onClick={() => void client.retry()} disabled={!remote.error || remote.loading}>Retry load</button>
        <label><input type="checkbox" checked={remote.unknownTotal} onChange={(event) => void client.setUnknownTotal(event.currentTarget.checked)} />Hide total count</label>
        <p role="status" aria-live="polite" aria-atomic="true" data-testid="remote-load-status">{remote.loading ? `Loading tickets; showing page ${serverPageIndex + 1}` : remote.error ? `${remote.error}; retained page ${serverPageIndex + 1}` : `Loaded page ${serverPageIndex + 1}`}</p>
      </section>
      <section aria-label="Server editing">
        <button type="button" onClick={() => client.setSaveScenario("fail-once")}>Fail next save</button>
        <button type="button" onClick={() => client.setSaveScenario("conflict-once")}>Conflict next save</button>
        <button type="button" onClick={() => client.setSaveScenario("validation")}>Reject next save</button>
        <button type="button" disabled={!saveSummary.failed || saveSummary.pending > 0} onClick={() => void client.retryFailed()}>Retry failed saves</button>
        <button type="button" disabled={saveSummary.pending > 0} onClick={() => void client.discardAndReload()}>Discard edits and reload</button>
        <p role="status" aria-live="polite" aria-atomic="true" data-testid="server-save-summary">Pending {saveSummary.pending} · Saved {saveSummary.saved} · Failed {saveSummary.failed}</p>
        <p role="status" aria-live="polite" data-testid="server-save-message">{remote.saveMessage}</p>
        <ul>{[...remote.saves].map(([key, state]) => <li key={key}><span role={["error", "validation-error", "conflict"].includes(state.status) ? "alert" : undefined}>{state.input?.rowId}: {state.status}{state.error instanceof Error ? ` — ${state.error.message}` : ""}</span></li>)}</ul>
      </section>
      <section aria-label="Server selection">
        <button type="button" disabled={remote.loading || Boolean(remote.error) || remote.bulk.pending} onClick={() => client.selectAllMatching()}>Select all matching tickets</button>
        <button type="button" onClick={() => client.clearSelection()}>Clear server selection</button>
        <button type="button" disabled={remote.loading || Boolean(remote.error) || remote.bulk.pending || saveSummary.pending > 0 || (remote.selection.mode === "explicit" && !remote.selection.ids.length)} onClick={() => void client.resolveSelected()}>Resolve selected tickets</button>
        <button type="button" disabled={!remote.bulk.error || remote.bulk.pending || remote.loading} onClick={() => void client.retryBulk()}>Retry bulk action</button>
        <p role="status" data-testid="server-selection-summary">{remote.selection.mode === "all-matching" ? `All matching tickets · ${remote.selection.excludedIds.length} excluded` : `${remote.selection.ids.length} tickets selected`}</p>
        <p role="status" data-testid="server-bulk-status">{remote.bulk.message}</p>
      </section>
      <DataGrid {...client.gridOptions(columns)} onStateChange={handleStateChange} onCellEdit={client.onCellEdit}
        renderEditor={(context) => ["account", "openedAt"].includes(context.column.id) ? <TicketEditor context={context} /> : null}
        localization={getTicketPaginationLocalization("Server pagination")} loading={remote.loading} loadingState="Refreshing tickets..." paginationControls columnPinningControls columnFilterControls rowSelectionControls />


    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
