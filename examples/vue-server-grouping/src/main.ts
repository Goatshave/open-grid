import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
import "./styles.css";
import {
  createColumnHelper,
  createDataGrid,
  type AnyColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GridOptions,
  type GridState,
  type GroupingState,
  type PaginationState,
  type SortingState,
} from "@open-grid/vue-ui";
import {
  areServerGroupingStatesEqual,
  createServerGroupingTickets,
  formatServerGrouping,
  formatServerGroupingExpanded,
  queryServerGroupingTickets,
  type ServerGroupingRow,
} from "@open-grid/example-shared-server";
import { computed, createApp, defineComponent, h, ref } from "vue";

const column = createColumnHelper<ServerGroupingRow>();
const allTickets = createServerGroupingTickets("VGR");

const columns: AnyColumnDef<ServerGroupingRow>[] = [
  column.accessor("label", {
    header: "Ticket / group",
    size: 190,
  }),
  column.accessor("account", { header: "Account", size: 190 }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("status", { header: "Status", size: 120 }),
  column.accessor("priority", { header: "Priority", size: 110 }),
  column.accessor("childCount", {
    header: "Rows",
    size: 92,
    cell: ({ value }) => (typeof value === "number" ? value.toLocaleString() : ""),
  }),
  column.accessor("value", {
    header: "Value",
    size: 130,
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
  column.accessor("openedAt", { header: "Opened", size: 130 }),
];

const ServerGrid = createDataGrid<ServerGroupingRow>();

const App = defineComponent({
  name: "VueServerGroupingGridExample",
  setup() {
    const sorting = ref<SortingState>([]);
    const columnFilters = ref<ColumnFiltersState>([]);
    const grouping = ref<GroupingState>([]);
    const expanded = ref<ExpandedState>({});
    const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 8 });
    const serverResult = computed(() =>
      queryServerGroupingTickets(allTickets, {
        sorting: sorting.value,
        columnFilters: columnFilters.value,
        grouping: grouping.value,
        expanded: expanded.value,
        pagination: pagination.value,
      }),
    );
    const accountFilter = computed(() => String(columnFilters.value.find((filter) => filter.id === "account")?.value ?? ""));

    const handleStateChange = (state: GridState) => {
      const groupingChanged = !areServerGroupingStatesEqual(state.grouping, grouping.value);

      sorting.value = state.sorting;
      columnFilters.value = state.columnFilters;
      grouping.value = state.grouping;
      expanded.value = groupingChanged ? {} : state.expanded;
      pagination.value = groupingChanged ? { ...state.pagination, pageIndex: 0 } : state.pagination;
    };

    const setAccountFilter = (value: string) => {
      columnFilters.value = value ? [{ id: "account", value }] : [];
      expanded.value = {};
      pagination.value = { ...pagination.value, pageIndex: 0 };
    };

    const setServerGrouping = (nextGrouping: GroupingState) => {
      grouping.value = nextGrouping;
      expanded.value = {};
      pagination.value = { ...pagination.value, pageIndex: 0 };
    };

    return () => {
      const result = serverResult.value;
      const serverPageIndex = result.pageIndex;
      const gridOptions: GridOptions<ServerGroupingRow> = {
        data: result.rows,
        columns,
        getRowId: (row) => row.id,
        getSubRows: (row) => row.children,
        getRowCanExpand: (row) => row.rowType === "group",
        state: {
          sorting: sorting.value,
          columnFilters: columnFilters.value,
          grouping: grouping.value,
          expanded: expanded.value,
          pagination: pagination.value,
        },
        onStateChange: handleStateChange,
        manualSorting: true,
        manualFiltering: true,
        manualGrouping: true,
        manualPagination: true,
        pageCount: result.pageCount,
        initialState: {
          columnPinning: { left: ["label"], right: ["value"] },
        },
      };

      return h("main", { class: "app-shell" }, [
        h("section", { class: "toolbar", "aria-label": "Vue server grouping controls" }, [
          h("div", [
            h("h1", "Vue server-grouped tickets"),
            h("p", `${result.totalLeafRows} matching leaf rows · ${result.totalTopLevelRows} server rows · page ${serverPageIndex + 1} of ${result.pageCount}`),
          ]),
          h("div", { class: "toolbar-actions" }, [
            h("label", { class: "filter-control" }, [
              "Account",
              h("input", {
                value: accountFilter.value,
                placeholder: "Filter account",
                onInput: (event: Event) => setAccountFilter((event.currentTarget as HTMLInputElement).value),
              }),
            ]),
            h(
              "button",
              {
                type: "button",
                onClick: () => setServerGrouping(grouping.value[0] === "status" ? [] : ["status"]),
              },
              grouping.value[0] === "status" ? "Clear grouping" : "Group status",
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => setServerGrouping(["status", "owner"]),
              },
              "Group status then owner",
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => {
                  expanded.value = { ...expanded.value, "group:status%3DBacklog": !expanded.value["group:status%3DBacklog"] };
                },
              },
              "Toggle Backlog group",
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => {
                  expanded.value = {
                    ...expanded.value,
                    "group:status%3DBacklog/owner%3DMina": !expanded.value["group:status%3DBacklog/owner%3DMina"],
                  };
                },
              },
              "Toggle Backlog Mina group",
            ),
          ]),
        ]),
        h("div", { class: "server-state", "aria-label": "Vue server query state" }, [
          h("span", { "data-testid": "vue-query-grouping" }, `Grouping: ${formatServerGrouping(grouping.value)}`),
          h("span", { "data-testid": "vue-query-expanded" }, `Expanded: ${formatServerGroupingExpanded(expanded.value)}`),
          h(
            "span",
            { "data-testid": "vue-query-sorting" },
            `Sorting: ${sorting.value.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}`,
          ),
          h("span", { "data-testid": "vue-query-page" }, `Page: ${serverPageIndex + 1}`),
        ]),
        h(ServerGrid, {
          options: gridOptions,
          groupingPanel: true,
        }),
        h("nav", { class: "pagination", "aria-label": "Vue server grouping pagination" }, [
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
