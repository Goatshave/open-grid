import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
import "./styles.css";
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
import {
  createColumnHelper,
  createDataGrid,
  downloadExportFile,
  type AnyColumnDef,
  type ColumnFiltersState,
  type GridOptions,
  type GridState,
  type PaginationState,
  type SortingState,
} from "@open-grid/vue-ui";
import { computed, createApp, defineComponent, h, ref } from "vue";

const column = createColumnHelper<ServerSideTicket>();
const allTickets = createServerSideTickets("VUE", { valueBase: 1_200, valueStep: 97, openedMonth: "2026-07" });

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
const ServerGrid = createDataGrid<ServerSideTicket>();

async function exportTicketsFromServer(query: Pick<ServerSideTicketQuery, "columnFilters" | "sorting">) {
  const rows = getServerSideTicketRows(allTickets, query);

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
    const sorting = ref<SortingState>([]);
    const columnFilters = ref<ColumnFiltersState>([]);
    const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 25 });
    const exportStatus = ref("Server export idle");
    const streamStatus = ref("Streaming export idle");
    const streamingActive = ref(false);
    const streamReader = ref<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const streamProgress = ref(0);
    const streamCancelRequested = ref(false);
    const serverResult = computed(() =>
      queryServerSideTickets(allTickets, {
        sorting: sorting.value,
        columnFilters: columnFilters.value,
        pagination: pagination.value,
      }),
    );
    const accountFilter = computed(() => String(columnFilters.value.find((filter) => filter.id === "account")?.value ?? ""));

    const setAccountFilter = (value: string) => {
      columnFilters.value = value ? [{ id: "account", value }] : [];
      pagination.value = { ...pagination.value, pageIndex: 0 };
    };

    const handleStateChange = (state: GridState) => {
      sorting.value = state.sorting;
      columnFilters.value = state.columnFilters;
      pagination.value = state.pagination;
    };

    const handleServerExport = async () => {
      exportStatus.value = "Exporting server CSV...";
      const result = await exportTicketsFromServer({
        sorting: sorting.value,
        columnFilters: columnFilters.value,
      });
      const downloaded = downloadExportFile(result.file);
      exportStatus.value = downloaded ? `Exported ${result.rowCount} server rows` : "Server export unavailable";
    };

    const handleStreamingExport = async () => {
      if (streamReader.value) {
        return;
      }

      const rows = getServerSideTicketRows(allTickets, {
        sorting: sorting.value,
        columnFilters: columnFilters.value,
      });
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
      const gridOptions: GridOptions<ServerSideTicket> = {
        data: result.rows,
        columns,
        getRowId: (row) => row.id,
        state: {
          sorting: sorting.value,
          columnFilters: columnFilters.value,
          pagination: pagination.value,
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

      return h("main", { class: "app-shell" }, [
        h("section", { class: "toolbar", "aria-label": "Vue server-side grid controls" }, [
          h("div", [
            h("h1", "Vue server-side tickets"),
            h("p", `${result.totalRows} matching rows · page ${serverPageIndex + 1} of ${result.pageCount}`),
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
            h("span", { "data-testid": "vue-server-export-status" }, exportStatus.value),
          ]),
          h("div", { class: "export-control" }, [
            h("button", { type: "button", disabled: streamingActive.value, onClick: handleStreamingExport }, "Preview streaming CSV"),
            h("button", { type: "button", disabled: !streamingActive.value, onClick: handleStreamingCancel }, "Cancel stream"),
            h("span", { "data-testid": "vue-server-stream-status" }, streamStatus.value),
          ]),
        ]),
        h(ServerGrid, {
          options: gridOptions,
          columnPinningControls: true,
          style: { height: "500px" },
        }),
        h("nav", { class: "pagination", "aria-label": "Vue server pagination" }, [
          h(
            "button",
            {
              type: "button",
              disabled: serverPageIndex === 0,
              onClick: () => {
                pagination.value = { ...pagination.value, pageIndex: 0 };
              },
            },
            "First",
          ),
          h(
            "button",
            {
              type: "button",
              disabled: serverPageIndex === 0,
              onClick: () => {
                pagination.value = { ...pagination.value, pageIndex: Math.max(0, serverPageIndex - 1) };
              },
            },
            "Previous",
          ),
          h("span", `Page ${serverPageIndex + 1} / ${result.pageCount}`),
          h(
            "button",
            {
              type: "button",
              disabled: serverPageIndex >= result.pageCount - 1,
              onClick: () => {
                pagination.value = {
                  ...pagination.value,
                  pageIndex: Math.min(result.pageCount - 1, serverPageIndex + 1),
                };
              },
            },
            "Next",
          ),
        ]),
      ]);
    };
  },
});

createApp(App).mount("#app");
