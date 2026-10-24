<script lang="ts">
  import { isISOCalendarDate } from "@open-grid/core";
  import TicketEditor from "./TicketEditor.svelte";
  import { createSvelteDataGridRenderer } from "@open-grid/svelte-ui";
  import { onMount, onDestroy } from "svelte";
  import { createTicketClient, getTicketPaginationLocalization, getTicketSaveSummary } from "@open-grid/example-shared-server/ticket-client";
  import type { GridState } from "@open-grid/core";
  import {
    createChunkedServerCsvExport,
    createServerSideTicketExportColumns,
    createStreamingServerCsvResponse,
    type ServerCsvExportColumn,
    type ServerSideTicket,
  } from "@open-grid/example-shared-server";
  import {
    createColumnHelper,
    DataGrid,
    downloadExportFile,
    type AnyColumnDef,
  } from "@open-grid/svelte-ui";

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

  const client = createTicketClient();
  let remote = client.getSnapshot();
  const unsubscribe = client.subscribe(() => { remote = client.getSnapshot(); });
  onMount(() => { void client.start(); });
  onDestroy(() => { unsubscribe(); client.dispose(); });
  $: sorting = remote.requested.sorting;
  $: columnFilters = remote.requested.columnFilters;
  $: pagination = remote.requested.pagination;
  $: saveSummary = getTicketSaveSummary(remote);
  let exportStatus = "Server export idle";
  let streamStatus = "Streaming export idle";
  let streamingActive = false;
  let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let streamProgress = 0;
  let streamCancelRequested = false;

  $: serverResult = remote.page;
  $: accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  $: serverPageIndex = serverResult.pageIndex;
  $: gridOptions = (remote, { ...client.gridOptions(columns), onStateChange: handleStateChange, onCellEdit: client.onCellEdit });

  async function exportTicketsFromServer(rows: ServerSideTicket[]) {

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

  function handleStateChange(state: GridState) { client.onStateChange(state); }
  function setAccountFilter(value: string) { void client.setAccountFilter(value); }

  async function handleServerExport() {
    exportStatus = "Exporting server CSV...";
    try {
      const result = await exportTicketsFromServer(await client.exportRows({ sorting, columnFilters }));
      const downloaded = downloadExportFile(result.file);
      exportStatus = downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable";
    } catch (error) {
      exportStatus = error instanceof Error ? `Server export failed: ${error.message}` : "Server export failed";
    }
  }

  async function handleStreamingExport() {
    if (streamingActive) {
      return;
    }

    streamingActive = true;
    streamStatus = "Loading server rows for streaming export...";
    let rows: ServerSideTicket[];
    try { rows = await client.exportRows({ sorting, columnFilters }); }
    catch (error) {
      streamStatus = error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed";
      streamingActive = false;
      return;
    }
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

<main class="app-shell" on:input|capture={client.onEditorInput}>
  <section class="toolbar" aria-label="Svelte server-side grid controls">
    <div>
      <h1>Svelte server-side tickets</h1>
      <p>{serverResult.totalRows ?? "Unknown total"} matching rows · page {serverPageIndex + 1}{serverResult.pageCount === undefined ? "" : ` of ${serverResult.pageCount}`}</p>
    </div>
    <label class="filter-control">
      Account
      <input value={accountFilter} placeholder="Filter account" on:input={(event) => setAccountFilter(event.currentTarget.value)} />
    </label>
    <div class="export-control">
      <button type="button" on:click={handleServerExport}>Export server CSV</button>
      <span role="status" aria-live="polite" data-testid="svelte-server-export-status">{exportStatus}</span>
    </div>
    <div class="export-control">
      <button type="button" disabled={streamingActive} on:click={handleStreamingExport}>Preview streaming CSV</button>
      <button type="button" disabled={!streamingActive} on:click={handleStreamingCancel}>Cancel stream</button>
      <span role="status" aria-live="polite" data-testid="svelte-server-stream-status">{streamStatus}</span>
    </div>
  </section>

  <section aria-label="Remote data controls">
    <button type="button" disabled={remote.loading} on:click={() => void client.refresh()}>Refresh tickets</button>
    <button type="button" disabled={remote.loading} on:click={() => void client.failRefresh()}>Simulate load failure</button>
    <button type="button" disabled={!remote.error || remote.loading} on:click={() => void client.retry()}>Retry load</button>
    <label><input type="checkbox" checked={remote.unknownTotal} on:change={(event) => void client.setUnknownTotal(event.currentTarget.checked)} />Hide total count</label>
    <p role="status" aria-live="polite" aria-atomic="true" data-testid="remote-load-status">{remote.loading ? `Loading tickets; showing page ${serverPageIndex + 1}` : remote.error ? `${remote.error}; retained page ${serverPageIndex + 1}` : `Loaded page ${serverPageIndex + 1}`}</p>
  </section>
  <section aria-label="Server editing">
    <button type="button" on:click={() => client.setSaveScenario("fail-once")}>Fail next save</button>
    <button type="button" on:click={() => client.setSaveScenario("conflict-once")}>Conflict next save</button>
    <button type="button" on:click={() => client.setSaveScenario("validation")}>Reject next save</button>
    <button type="button" disabled={!saveSummary.failed || saveSummary.pending > 0} on:click={() => void client.retryFailed()}>Retry failed saves</button>
    <button type="button" disabled={saveSummary.pending > 0} on:click={() => void client.discardAndReload()}>Discard edits and reload</button>
    <p role="status" aria-live="polite" aria-atomic="true" data-testid="server-save-summary">Pending {saveSummary.pending} · Saved {saveSummary.saved} · Failed {saveSummary.failed}</p>
    <p role="status" aria-live="polite" data-testid="server-save-message">{remote.saveMessage}</p>
    <ul>{#each [...remote.saves] as [key, save] (key)}<li><span role={["error", "validation-error", "conflict"].includes(save.status) ? "alert" : undefined}>{save.input?.rowId}: {save.status}{save.error instanceof Error ? ` — ${save.error.message}` : ""}</span></li>{/each}</ul>
  </section>
  <section aria-label="Server selection">
    <button type="button" disabled={remote.loading || Boolean(remote.error) || remote.bulk.pending} on:click={() => client.selectAllMatching()}>Select all matching tickets</button>
    <button type="button" on:click={() => client.clearSelection()}>Clear server selection</button>
    <button type="button" disabled={remote.loading || Boolean(remote.error) || remote.bulk.pending || saveSummary.pending > 0 || (remote.selection.mode === "explicit" && !remote.selection.ids.length)} on:click={() => void client.resolveSelected()}>Resolve selected tickets</button>
    <button type="button" disabled={!remote.bulk.error || remote.bulk.pending || remote.loading} on:click={() => void client.retryBulk()}>Retry bulk action</button>
    <p role="status" data-testid="server-selection-summary">{remote.selection.mode === "all-matching" ? `All matching tickets · ${remote.selection.excludedIds.length} excluded` : `${remote.selection.ids.length} tickets selected`}</p>
    <p role="status" data-testid="server-bulk-status">{remote.bulk.message}</p>
  </section>
  <DataGrid options={gridOptions} renderEditor={(context) => ["account", "openedAt"].includes(context.column.id) ? createSvelteDataGridRenderer(TicketEditor)(context) : null}
    localization={getTicketPaginationLocalization("Svelte server pagination")} loading={remote.loading} loadingState="Refreshing tickets..." paginationControls={true} columnPinningControls={true} columnFilterControls={true} rowSelectionControls={true} style="height: 500px" />



</main>
