import { isISOCalendarDate } from "@open-grid/core";
import { TicketEditor } from "./TicketEditor";
import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
import "./styles.css";
import {
  createChunkedServerCsvExport,
  createServerSideTicketExportColumns,
  createStreamingServerCsvResponse,
  type ServerCsvExportColumn,
  type ServerSideTicket,
} from "@open-grid/example-shared-server";
import {
  createColumnHelper,
  createDataGrid,
  downloadExportFile,
  type AnyColumnDef,
  type GridOptions,
} from "@open-grid/vue-ui";
import { computed, createApp, defineComponent, h, onBeforeUnmount, ref, shallowRef } from "vue";

import { createTicketClient, getTicketPaginationLocalization, getTicketSaveSummary } from "@open-grid/example-shared-server/ticket-client";

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
const ServerGrid = createDataGrid<ServerSideTicket>();

async function exportTicketsFromServer(rows: ServerSideTicket[]) {

  return createChunkedServerCsvExport({
    rows,
    columns: serverExportColumns,
    filename: "vue-server-tickets",
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

const App = defineComponent({
  name: "VueServerSideGridExample",
  setup() {
    const client = createTicketClient();
    const remote = shallowRef(client.getSnapshot());
    const unsubscribe = client.subscribe(() => { remote.value = client.getSnapshot(); });
    onBeforeUnmount(() => { unsubscribe(); client.dispose(); });
    void client.start();
    const sorting = computed(() => remote.value.requested.sorting);
    const columnFilters = computed(() => remote.value.requested.columnFilters);
    const pagination = computed(() => remote.value.requested.pagination);
    const exportStatus = ref("Server export idle");
    const streamStatus = ref("Streaming export idle");
    const streamingActive = ref(false);
    const streamReader = ref<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const streamProgress = ref(0);
    const streamCancelRequested = ref(false);
    const serverResult = computed(() => remote.value.page);
    const accountFilter = computed(() => String(columnFilters.value.find((filter) => filter.id === "account")?.value ?? ""));
    const setAccountFilter = client.setAccountFilter;
    const handleStateChange = client.onStateChange;

    const handleServerExport = async () => {
      exportStatus.value = "Exporting server CSV...";
      try {
        const result = await exportTicketsFromServer(await client.exportRows({ sorting: sorting.value, columnFilters: columnFilters.value }));
        const downloaded = downloadExportFile(result.file);
        exportStatus.value = downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable";
      } catch (error) {
        exportStatus.value = error instanceof Error ? `Server export failed: ${error.message}` : "Server export failed";
      }
    };

    const handleStreamingExport = async () => {
      if (streamingActive.value) {
        return;
      }

      streamingActive.value = true;
      streamStatus.value = "Loading server rows for streaming export...";
      let rows: ServerSideTicket[];
      try { rows = await client.exportRows({ sorting: sorting.value, columnFilters: columnFilters.value }); }
      catch (error) {
        streamStatus.value = error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed";
        streamingActive.value = false;
        return;
      }
      let streamedRows = 0;
      let cancelled = false;
      let streamedBytes = 0;
      streamProgress.value = 0;
      streamCancelRequested.value = false;
      streamingActive.value = true;
      streamStatus.value = `Streaming 0 of ${rows.length} server rows`;

      const response = createStreamingServerCsvResponse({
        rows: createDelayedServerRows(rows, () => {
          cancelled = true;
        }),
        columns: serverExportColumns,
        filename: "vue-server-tickets-stream",
        chunkSize: 5,
        onChunk: ({ rowCount }) => {
          streamedRows = rowCount;
          streamProgress.value = rowCount;
          if (!streamCancelRequested.value) {
            streamStatus.value = `Streaming ${rowCount} of ${rows.length} server rows`;
          }
        },
      });
      const reader = response.body?.getReader();

      if (!reader) {
        streamingActive.value = false;
        streamStatus.value = "Streaming export unavailable";
        return;
      }

      streamReader.value = reader;

      try {
        while (true) {
          const chunk = await reader.read();

          if (chunk.done) {
            break;
          }

          streamedBytes += chunk.value.byteLength;
        }

        if (cancelled || streamCancelRequested.value) {
          streamStatus.value = `Cancelled streaming export after ${streamedRows} server rows`;
        } else {
          streamStatus.value = `Streamed ${rows.length} server rows (${streamedBytes} bytes)`;
        }
      } catch (error) {
        streamStatus.value = error instanceof Error ? `Streaming export failed: ${error.message}` : "Streaming export failed";
      } finally {
        if (streamReader.value === reader) {
          streamReader.value = null;
        }
        streamingActive.value = false;
      }
    };

    const handleStreamingCancel = async () => {
      const reader = streamReader.value;

      if (!reader) {
        return;
      }

      streamStatus.value = "Cancelling streaming export...";
      streamCancelRequested.value = true;
      streamStatus.value = `Cancelled streaming export after ${streamProgress.value} server rows`;
      await reader.cancel();
    };

    return () => {
      const result = serverResult.value;
      const serverPageIndex = result.pageIndex;
      const gridOptions: GridOptions<ServerSideTicket> = { ...client.gridOptions(columns), onStateChange: handleStateChange, onCellEdit: client.onCellEdit };
      const state = remote.value;
      const saveSummary = getTicketSaveSummary(state);

      return h("main", { class: "app-shell", onInputCapture: client.onEditorInput }, [
        h("section", { class: "toolbar", "aria-label": "Vue server-side grid controls" }, [
          h("div", [
            h("h1", "Vue server-side tickets"),
            h("p", `${result.totalRows ?? "Unknown total"} matching rows · page ${serverPageIndex + 1}${result.pageCount === undefined ? "" : ` of ${result.pageCount}`}`),
          ]),
          h("label", { class: "filter-control" }, [
            "Account",
            h("input", {
              value: accountFilter.value,
              placeholder: "Filter account",
              onInput: (event: Event) => setAccountFilter((event.currentTarget as HTMLInputElement).value),
            }),
          ]),
          h("div", { class: "export-control" }, [
            h("button", { type: "button", onClick: handleServerExport }, "Export server CSV"),
            h("span", { role: "status", "aria-live": "polite", "data-testid": "vue-server-export-status" }, exportStatus.value),
          ]),
          h("div", { class: "export-control" }, [
            h("button", { type: "button", disabled: streamingActive.value, onClick: handleStreamingExport }, "Preview streaming CSV"),
            h("button", { type: "button", disabled: !streamingActive.value, onClick: handleStreamingCancel }, "Cancel stream"),
            h("span", { role: "status", "aria-live": "polite", "data-testid": "vue-server-stream-status" }, streamStatus.value),
          ]),
        ]),
        h("section", { "aria-label": "Remote data controls" }, [
          h("button", { type: "button", disabled: state.loading, onClick: () => void client.refresh() }, "Refresh tickets"),
          h("button", { type: "button", disabled: state.loading, onClick: () => void client.failRefresh() }, "Simulate load failure"),
          h("button", { type: "button", disabled: !state.error || state.loading, onClick: () => void client.retry() }, "Retry load"),
          h("label", [h("input", { type: "checkbox", checked: state.unknownTotal, onChange: (event: Event) => void client.setUnknownTotal((event.target as HTMLInputElement).checked) }), "Hide total count"]),
          h("p", { role: "status", "aria-live": "polite", "aria-atomic": "true", "data-testid": "remote-load-status" }, state.loading ? `Loading tickets; showing page ${serverPageIndex + 1}` : state.error ? `${state.error}; retained page ${serverPageIndex + 1}` : `Loaded page ${serverPageIndex + 1}`),
        ]),
        h("section", { "aria-label": "Server editing" }, [
          h("button", { type: "button", onClick: () => client.setSaveScenario("fail-once") }, "Fail next save"),
          h("button", { type: "button", onClick: () => client.setSaveScenario("conflict-once") }, "Conflict next save"),
          h("button", { type: "button", onClick: () => client.setSaveScenario("validation") }, "Reject next save"),
          h("button", { type: "button", disabled: !saveSummary.failed || saveSummary.pending > 0, onClick: () => void client.retryFailed() }, "Retry failed saves"),
          h("button", { type: "button", disabled: saveSummary.pending > 0, onClick: () => void client.discardAndReload() }, "Discard edits and reload"),
          h("p", { role: "status", "aria-live": "polite", "aria-atomic": "true", "data-testid": "server-save-summary" }, `Pending ${saveSummary.pending} · Saved ${saveSummary.saved} · Failed ${saveSummary.failed}`),
          h("p", { role: "status", "aria-live": "polite", "data-testid": "server-save-message" }, state.saveMessage),
          h("ul", [...state.saves].map(([key, save]) => h("li", { key }, [h("span", { role: ["error", "validation-error", "conflict"].includes(save.status) ? "alert" : undefined }, `${save.input?.rowId}: ${save.status}${save.error instanceof Error ? ` — ${save.error.message}` : ""}`)]))),
        ]),
        h("section", { "aria-label": "Server selection" }, [
          h("button", { type: "button", disabled: state.loading || Boolean(state.error) || state.bulk.pending, onClick: () => client.selectAllMatching() }, "Select all matching tickets"),
          h("button", { type: "button", onClick: () => client.clearSelection() }, "Clear server selection"),
          h("button", { type: "button", disabled: state.loading || Boolean(state.error) || state.bulk.pending || saveSummary.pending > 0 || (state.selection.mode === "explicit" && !state.selection.ids.length), onClick: () => void client.resolveSelected() }, "Resolve selected tickets"),
          h("button", { type: "button", disabled: !state.bulk.error || state.bulk.pending || state.loading, onClick: () => void client.retryBulk() }, "Retry bulk action"),
          h("p", { role: "status", "data-testid": "server-selection-summary" }, state.selection.mode === "all-matching" ? `All matching tickets · ${state.selection.excludedIds.length} excluded` : `${state.selection.ids.length} tickets selected`),
          h("p", { role: "status", "data-testid": "server-bulk-status" }, state.bulk.message),
        ]),
        h(ServerGrid, {
          options: gridOptions,
          renderEditor: (context) => ["account", "openedAt"].includes(context.column.id) ? h(TicketEditor, { context }) : null,
            localization: getTicketPaginationLocalization("Vue server pagination"), loading: state.loading, loadingState: "Refreshing tickets...", paginationControls: true, columnFilterControls: true, rowSelectionControls: true,
          columnPinningControls: true,
          style: { height: "500px" },
        }),

      ]);
    };
  },
});

createApp(App).mount("#app");
