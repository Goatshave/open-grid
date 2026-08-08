import "@open-grid/benchmark-shared/app.css";
import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";

import { createBenchmarkDataset, fingerprintBenchmarkDataset, type BenchmarkRow } from "@open-grid/benchmark-shared";
import { createBenchmarkInitializationTracker, installBenchmarkDriver, readBenchmarkPageConfig, toggleBenchmarkSort } from "@open-grid/benchmark-shared/browser";
import { createColumnHelper, createDataGrid, type AnyColumnDef, type GridOptions, type GridState } from "@open-grid/vue-ui";
import { computed, createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";

const initializationTracker = createBenchmarkInitializationTracker();
const config = readBenchmarkPageConfig();
const dataset = createBenchmarkDataset({ ...config.profile, seed: config.seed });
initializationTracker.markDatasetReady();
const datasetFingerprint = fingerprintBenchmarkDataset(dataset);
initializationTracker.markFingerprintReady();
const columnHelper = createColumnHelper<BenchmarkRow>();
const DataGrid = createDataGrid<BenchmarkRow>();
const getBenchmarkRowId = (row: BenchmarkRow) => row.id;
const columns: AnyColumnDef<BenchmarkRow>[] = dataset.columns.map((column) =>
  columnHelper.accessor(column.id, { header: column.label, size: 120 }),
);
const defaultColumnOrder = dataset.columns.map((column) => column.id);
const movedColumnOrder = [...defaultColumnOrder.slice(0, 2), "column_10", ...defaultColumnOrder.slice(2, 10), ...defaultColumnOrder.slice(11)];
const multiSortRules = [{ columnId: "column_2", direction: "asc" as const }, { columnId: "column_5", direction: "asc" as const }];
const multiFilterRules = [{ columnId: "column_2", value: "Blocked" }, { columnId: "column_4", value: "APAC" }];

const App = defineComponent({
  name: "OpenGridVueBenchmark",
  setup() {
    const state = ref<Partial<GridState>>({
      globalFilter: "",
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: dataset.rowCount },
    });
    const allRowsSelected = ref(false);
    const updateFilter = (value: string) => {
      state.value = { ...state.value, globalFilter: value, pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
    };
    const updateColumnFilter = (value: string) => {
      state.value = { ...state.value, columnFilters: value ? [{ id: "column_2", value }] : [], pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
    };
    const updateColumnVisibility = (visible: boolean) => {
      state.value = { ...state.value, columnVisibility: { ...state.value.columnVisibility, column_10: visible } };
    };
    const updateColumnSize = (size: number) => {
      state.value = { ...state.value, columnSizing: { ...state.value.columnSizing, column_10: size } };
    };
    const updateColumnOrder = (moved: boolean) => {
      state.value = { ...state.value, columnOrder: moved ? movedColumnOrder : [] };
    };
    const updateColumnPinning = (pinned: boolean) => {
      state.value = { ...state.value, columnPinning: { left: pinned ? ["column_10"] : [], right: [] } };
    };
    const updateRowSelection = (selected: boolean) => {
      allRowsSelected.value = false;
    state.value = { ...state.value, rowSelection: selected ? { row_0: true } : {}, allRowsSelected: false };
    };
    const updateAllRowSelection = (selected: boolean) => {
      allRowsSelected.value = selected;
    state.value = { ...state.value, rowSelection: {}, allRowsSelected: selected };
    };
    const options = computed<GridOptions<BenchmarkRow>>(() => ({
      data: dataset.rows,
      columns,
      getRowId: getBenchmarkRowId,
      state: state.value,
      onStateChange: (nextState) => {
        state.value = nextState;
      },
    }));
    let cleanupDriver: (() => void) | undefined;

    onMounted(() => {
      cleanupDriver = installBenchmarkDriver({
        implementation: "open-grid-vue",
        profileId: config.profile.id,
        datasetFingerprint,
        initializationTracker,
        setQuickFilter: updateFilter,
        setColumnFilter: (_columnId, value) => updateColumnFilter(value),
        setColumnFilters: (rules) => {
          state.value = {
            ...state.value,
            columnFilters: rules.map((rule) => ({ id: rule.columnId, value: rule.value })),
            pagination: { pageIndex: 0, pageSize: dataset.rowCount },
          };
        },
        setColumnVisible: (_columnId, visible) => updateColumnVisibility(visible),
        setColumnSize: (_columnId, size) => updateColumnSize(size),
        setColumnOrder: (columnIds) => {
          state.value = { ...state.value, columnOrder: columnIds };
        },
        setColumnPinned: (_columnId, pinned) => updateColumnPinning(pinned),
        setRowSelected: (_rowId, selected) => updateRowSelection(selected),
        setAllRowsSelected: updateAllRowSelection,
        setSort: (columnId, direction) => {
          state.value = { ...state.value, sorting: [{ id: columnId, desc: direction === "desc" }] };
        },
        setSorting: (rules) => {
          state.value = { ...state.value, sorting: rules.map((rule) => ({ id: rule.columnId, desc: rule.direction === "desc" })) };
        },
        clearState: () => {
          allRowsSelected.value = false;
          state.value = { sorting: [], globalFilter: "", columnFilters: [], columnVisibility: {}, columnSizing: {}, columnOrder: [], columnPinning: { left: [], right: [] }, rowSelection: {}, pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
        },
        scrollTo: (top, left) => document.querySelector<HTMLElement>(".og-grid__scroller")?.scrollTo({ top, left }),
        getSnapshot: () => getSnapshot(state.value, allRowsSelected.value),
      });
    });
    onBeforeUnmount(() => cleanupDriver?.());

    return () => h("main", { class: "benchmark-app" }, [
      renderToolbar("Open Grid Vue", state.value.globalFilter ?? "", String(state.value.columnFilters?.[0]?.value ?? ""), state.value.columnVisibility?.column_10 !== false, state.value.columnSizing?.column_10 ?? 120, state.value.columnOrder?.[2] === "column_10", state.value.columnPinning?.left?.includes("column_10") ?? false, state.value.rowSelection?.row_0 ?? false, allRowsSelected.value, updateFilter, updateColumnFilter, updateColumnVisibility, updateColumnSize, updateColumnOrder, updateColumnPinning, updateRowSelection, updateAllRowSelection),
      h("section", { class: "benchmark-frame", "aria-label": "Open Grid Vue benchmark frame" }, [
        h(DataGrid, {
          ariaLabel: "Open Grid Vue performance regression",
          options: options.value,
          rowVirtualization: { enabled: true, estimateRowHeight: 40, measureRowHeight: false, overscan: 5 },
          columnVirtualization: { enabled: true, measureColumnWidth: false, overscan: 5 },
        }),
      ]),
    ]);
  },
});

function getSnapshot(state: Partial<GridState>, allRowsSelected: boolean) {
  const scroller = document.querySelector<HTMLElement>(".og-grid__scroller");
  const grid = document.querySelector<HTMLElement>("[data-open-grid]");
  const mountedRows = [...document.querySelectorAll<HTMLElement>(".og-grid__body > .og-grid__row")];
  const sorting = (state.sorting ?? []).map((rule) => ({ columnId: rule.id, direction: rule.desc ? "desc" as const : "asc" as const }));
  const columnFilters = (state.columnFilters ?? []).map((rule) => ({ columnId: rule.id, value: String(rule.value) }));
  const columnOrderIds = state.columnOrder?.length === dataset.columnCount ? [...state.columnOrder] : defaultColumnOrder;
  const visibleColumnIds = columnOrderIds.filter((columnId) => state.columnVisibility?.[columnId] !== false);
  const selectedRowIds = allRowsSelected ? [] : Object.entries(state.rowSelection ?? {}).filter(([, selected]) => selected).map(([rowId]) => rowId).sort();
  return {
    implementation: "open-grid-vue",
    profileId: config.profile.id,
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    visibleColumnCount: visibleColumnIds.length,
    visibleColumnIds,
    columnSize: { columnId: "column_10" as const, size: state.columnSizing?.column_10 ?? 120 },
    columnOrderIds,
    columnPinning: {
      left: [...(state.columnPinning?.left ?? [])],
      right: [...(state.columnPinning?.right ?? [])],
    },
    selectedRowIds,
    selectedRowCount: allRowsSelected ? dataset.rowCount : selectedRowIds.length,
    allRowsSelected,
    displayedRowCount: Math.max(0, Number(grid?.getAttribute("aria-rowcount") ?? 1) - 1),
    mountedRowCount: mountedRows.length,
    mountedCellCount: document.querySelectorAll(".og-grid__body > .og-grid__row > .og-grid__cell").length,
    firstMountedRowId: mountedRows[0]?.dataset.rowId ?? null,
    mountedRowSignature: mountedRows.map((row) => row.dataset.rowId ?? "").join("|"),
    sort: sorting[0] ?? null,
    sorting,
    filter: state.globalFilter ?? "",
    columnFilter: columnFilters[0] ?? null,
    columnFilters,
    scrollTop: scroller?.scrollTop ?? 0,
    scrollLeft: scroller?.scrollLeft ?? 0,
  };
}

function renderToolbar(implementation: string, filter: string, columnFilter: string, columnVisible: boolean, columnSize: number, columnMoved: boolean, columnPinned: boolean, rowSelected: boolean, allRowsSelected: boolean, onFilter: (value: string) => void, onColumnFilter: (value: string) => void, onColumnVisibility: (visible: boolean) => void, onColumnSize: (size: number) => void, onColumnOrder: (moved: boolean) => void, onColumnPinning: (pinned: boolean) => void, onRowSelection: (selected: boolean) => void, onAllRowSelection: (selected: boolean) => void) {
  return h("header", { class: "benchmark-toolbar" }, [
    h("div", { class: "benchmark-title" }, [
      h("h1", implementation),
      h("p", `${dataset.rowCount.toLocaleString()} rows / ${dataset.columnCount} columns / ${datasetFingerprint}`),
    ]),
    h("div", { class: "benchmark-controls" }, [
      h("label", { class: "benchmark-control" }, ["Profile", h("select", { value: config.profile.id, disabled: true }, [h("option", config.profile.id)])]),
      h("label", { class: "benchmark-control" }, ["Quick filter", h("input", { "data-benchmark-action": "quick-filter", value: filter, onInput: (event: Event) => onFilter((event.currentTarget as HTMLInputElement).value) })]),
      h("label", { class: "benchmark-control" }, ["Status filter", h("input", { "data-benchmark-action": "column-filter", value: columnFilter, onInput: (event: Event) => onColumnFilter((event.currentTarget as HTMLInputElement).value) })]),
      h("button", { "data-benchmark-action": "sort", type: "button", onClick: () => toggleBenchmarkSort("column_5") }, "Sort amount"),
      h("button", { "data-benchmark-action": "multi-sort", type: "button", onClick: () => window.__OPEN_GRID_BENCHMARK__?.setSorting(window.__OPEN_GRID_BENCHMARK__.getSnapshot().sorting.length === 2 ? [] : multiSortRules) }, "Sort status + amount"),
      h("button", { "data-benchmark-action": "multi-filter", type: "button", onClick: () => window.__OPEN_GRID_BENCHMARK__?.setColumnFilters(window.__OPEN_GRID_BENCHMARK__.getSnapshot().columnFilters.length === 2 ? [] : multiFilterRules) }, "Filter status + region"),
      h("button", { "data-benchmark-action": "column-visibility", type: "button", onClick: () => onColumnVisibility(!columnVisible) }, columnVisible ? "Hide column 10" : "Show column 10"),
      h("button", { "data-benchmark-action": "column-sizing", type: "button", onClick: () => onColumnSize(columnSize === 120 ? 200 : 120) }, columnSize === 120 ? "Widen column 10" : "Reset column 10"),
      h("button", { "data-benchmark-action": "column-ordering", type: "button", onClick: () => onColumnOrder(!columnMoved) }, columnMoved ? "Restore column 10" : "Move column 10"),
      h("button", { "data-benchmark-action": "column-pinning", type: "button", onClick: () => onColumnPinning(!columnPinned) }, columnPinned ? "Unpin column 10" : "Pin column 10"),
      h("button", { "data-benchmark-action": "row-selection", type: "button", onClick: () => onRowSelection(!rowSelected) }, rowSelected ? "Deselect row 0" : "Select row 0"),
      h("button", { "data-benchmark-action": "all-row-selection", type: "button", onClick: () => onAllRowSelection(!allRowsSelected) }, allRowsSelected ? "Deselect all rows" : "Select all rows"),
      h("button", { "data-benchmark-action": "clear", type: "button", onClick: () => window.__OPEN_GRID_BENCHMARK__?.clearState() }, "Clear"),
    ]),
  ]);
}

createApp(App).mount("#app");
