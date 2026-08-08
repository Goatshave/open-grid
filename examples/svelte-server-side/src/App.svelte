<script lang="ts">
  import type { GridState } from "@open-grid/core";
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
    type ServerSideTicketResult,
  } from "@open-grid/example-shared-server";
  import {
    createColumnHelper,
    DataGrid,
    downloadExportFile,
    type AnyColumnDef,
    type ColumnFiltersState,
    type GridOptions,
    type PaginationState,
    type SortingState,
  } from "@open-grid/svelte-ui";

  const column = createColumnHelper<ServerSideTicket>();
  const allTickets = createServerSideTickets("SVL", { valueBase: 1_350, valueStep: 89, openedMonth: "2026-08" });

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

  let sorting: SortingState = [];
  let columnFilters: ColumnFiltersState = [];
  let pagination: PaginationState = { pageIndex: 0, pageSize: 25 };
  let exportStatus = "Server export idle";
  let streamStatus = "Streaming export idle";
  let streamingActive = false;
  let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let streamProgress = 0;
  let streamCancelRequested = false;

  $: serverResult = queryServerSideTickets(allTickets, { sorting, columnFilters, pagination });
  $: accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  $: serverPageIndex = serverResult.pageIndex;
  $: gridOptions = createGridOptions(serverResult);

  function createGridOptions(result: ServerSideTicketResult): GridOptions<ServerSideTicket> {
    return {
      data: result.rows,
      columns,
      getRowId: (row) => row.id,
      state: {
        sorting,
        columnFilters,
        pagination,
      },
      onStateChange: handleStateChange,
      manualSorting: true,
      manualFiltering: true,
      manualPagination: true,
      pageCount: result.pageCount,
      initialState: {
        columnPinning: { left: ["id"], right: ["value"] },
      },
    };
  }

  async function exportTicketsFromServer(query: Pick<ServerSideTicketQuery, "columnFilters" | "sorting">) {
    const rows = getServerSideTicketRows(allTickets, query);

    return createChunkedServerCsvExport({
      rows,
      columns: serverExportColumns,
      filename: "svelte-server-tickets",
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

  function handleStateChange(state: GridState) {
    sorting = state.sorting;
    columnFilters = state.columnFilters;
    pagination = state.pagination;
  }

  function setAccountFilter(value: string) {
    columnFilters = value ? [{ id: "account", value }] : [];
    pagination = { ...pagination, pageIndex: 0 };
  }

  async function handleServerExport() {
    exportStatus = "Exporting server CSV...";
    const result = await exportTicketsFromServer({ sorting, columnFilters });
    const downloaded = downloadExportFile(result.file);
    exportStatus = downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable";
  }

  async function handleStreamingExport() {
    if (streamReader) {
      return;
    }

    const rows = getServerSideTicketRows(allTickets, { sorting, columnFilters });
    let streamedRows = 0;
    let cancelled = false;
    let streamedBytes = 0;
    streamProgress = 0;
    streamCancelRequested = false;
    streamingActive = true;
    streamStatus = `Streaming 0 of ${rows.length} server rows`;

    const response = createStreamingServerCsvResponse({
      rows: createDelayedServerRows(rows, () => {
        cancelled = true;
      }),
      columns: serverExportColumns,
      filename: "svelte-server-tickets-stream",
      chunkSize: 5,
      onChunk: ({ rowCount }) => {
        streamedRows = rowCount;
        streamProgress = rowCount;
        if (!streamCancelRequested) {
          streamStatus = `Streaming ${rowCount} of ${rows.length} server rows`;
        }
      },
    });
    const reader = response.body?.getReader();

    if (!reader) {
      streamingActive = false;
      streamStatus = "Streaming export unavailable";
      return;
    }

    streamReader = reader;

    try {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) {
          break;
        }

        streamedBytes += chunk.value.byteLength;
      }

      if (cancelled || streamCancelRequested) {
        streamStatus = `Cancelled streaming export after ${streamedRows} server rows`;
      } else {
        streamStatus = `Streamed ${rows.length} server rows (${streamedBytes} bytes)`;
      }
    } catch (error) {
      streamStatus = error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed";
    } finally {
      if (streamReader === reader) {
        streamReader = null;
      }
      streamingActive = false;
    }
  }

  async function handleStreamingCancel() {
    const reader = streamReader;

    if (!reader) {
      return;
    }

    streamStatus = "Cancelling streaming export...";
    streamCancelRequested = true;
    streamStatus = `Cancelled streaming export after ${streamProgress} server rows`;
    await reader.cancel();
  }
</script>

<main class="app-shell">
  <section class="toolbar" aria-label="Svelte server-side grid controls">
    <div>
      <h1>Svelte server-side tickets</h1>
      <p>{serverResult.totalRows} matching rows · page {serverPageIndex + 1} of {serverResult.pageCount}</p>
    </div>
    <label class="filter-control">
      Account
      <input value={accountFilter} placeholder="Filter account" on:input={(event) => setAccountFilter(event.currentTarget.value)} />
    </label>
    <div class="export-control">
      <button type="button" on:click={handleServerExport}>Export server CSV</button>
      <span data-testid="svelte-server-export-status">{exportStatus}</span>
    </div>
    <div class="export-control">
      <button type="button" disabled={streamingActive} on:click={handleStreamingExport}>Preview streaming CSV</button>
      <button type="button" disabled={!streamingActive} on:click={handleStreamingCancel}>Cancel stream</button>
      <span data-testid="svelte-server-stream-status">{streamStatus}</span>
    </div>
  </section>

  <DataGrid options={gridOptions} columnPinningControls={true} style="height: 500px" />

  <nav class="pagination" aria-label="Svelte server pagination">
    <button type="button" disabled={serverPageIndex === 0} on:click={() => (pagination = { ...pagination, pageIndex: 0 })}>First</button>
    <button
      type="button"
      disabled={serverPageIndex === 0}
      on:click={() => (pagination = { ...pagination, pageIndex: Math.max(0, serverPageIndex - 1) })}
    >
      Previous
    </button>
    <span>Page {serverPageIndex + 1} / {serverResult.pageCount}</span>
    <button
      type="button"
      disabled={serverPageIndex >= serverResult.pageCount - 1}
      on:click={() => (pagination = { ...pagination, pageIndex: Math.min(serverResult.pageCount - 1, serverPageIndex + 1) })}
    >
      Next
    </button>
  </nav>
</main>
