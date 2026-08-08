<script lang="ts">
  import "@open-grid/benchmark-shared/app.css";
  import "@open-grid/theme/css";
  import "@open-grid/svelte-ui/css";

  import { createBenchmarkDataset, fingerprintBenchmarkDataset, type BenchmarkRow } from "@open-grid/benchmark-shared";
  import { createBenchmarkInitializationTracker, installBenchmarkDriver, readBenchmarkPageConfig, toggleBenchmarkSort } from "@open-grid/benchmark-shared/browser";
  import { createColumnHelper, DataGrid, type AnyColumnDef, type GridOptions, type GridState } from "@open-grid/svelte-ui";
  import { onMount } from "svelte";

  const initializationTracker = createBenchmarkInitializationTracker();
  const config = readBenchmarkPageConfig();
  const dataset = createBenchmarkDataset({ ...config.profile, seed: config.seed });
  initializationTracker.markDatasetReady();
  const datasetFingerprint = fingerprintBenchmarkDataset(dataset);
  initializationTracker.markFingerprintReady();
  const columnHelper = createColumnHelper<BenchmarkRow>();
  const getBenchmarkRowId = (row: BenchmarkRow) => row.id;
  const columns: AnyColumnDef<BenchmarkRow>[] = dataset.columns.map((column) =>
    columnHelper.accessor(column.id, { header: column.label, size: 120 }),
  );
  const defaultColumnOrder = dataset.columns.map((column) => column.id);
  const movedColumnOrder = [...defaultColumnOrder.slice(0, 2), "column_10", ...defaultColumnOrder.slice(2, 10), ...defaultColumnOrder.slice(11)];
  const multiSortRules = [{ columnId: "column_2", direction: "asc" as const }, { columnId: "column_5", direction: "asc" as const }];
  const multiFilterRules = [{ columnId: "column_2", value: "Blocked" }, { columnId: "column_4", value: "APAC" }];
  let state: Partial<GridState> = {
    globalFilter: "",
    columnFilters: [],
    pagination: { pageIndex: 0, pageSize: dataset.rowCount },
  };
  let allRowsSelected = false;
  const updateColumnFilter = (value: string) => {
    state = { ...state, columnFilters: value ? [{ id: "column_2", value }] : [], pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
  };
  const updateColumnVisibility = (visible: boolean) => {
    state = { ...state, columnVisibility: { ...state.columnVisibility, column_10: visible } };
  };
  const updateColumnSize = (size: number) => {
    state = { ...state, columnSizing: { ...state.columnSizing, column_10: size } };
  };
  const updateColumnOrder = (moved: boolean) => {
    state = { ...state, columnOrder: moved ? movedColumnOrder : [] };
  };
  const updateColumnPinning = (pinned: boolean) => {
    state = { ...state, columnPinning: { left: pinned ? ["column_10"] : [], right: [] } };
  };
  const updateRowSelection = (selected: boolean) => {
    allRowsSelected = false;
    state = { ...state, rowSelection: selected ? { row_0: true } : {}, allRowsSelected: false };
  };
  const updateAllRowSelection = (selected: boolean) => {
    allRowsSelected = selected;
    state = { ...state, rowSelection: {}, allRowsSelected: selected };
  };
  $: gridOptions = {
    data: dataset.rows,
    columns,
    getRowId: getBenchmarkRowId,
    state,
    onStateChange: (nextState: GridState) => {
      state = nextState;
    },
  } satisfies GridOptions<BenchmarkRow>;

  const updateFilter = (value: string) => {
    state = { ...state, globalFilter: value, pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
  };

  onMount(() => installBenchmarkDriver({
    implementation: "open-grid-svelte",
    profileId: config.profile.id,
    datasetFingerprint,
    initializationTracker,
    setQuickFilter: updateFilter,
    setColumnFilter: (_columnId, value) => updateColumnFilter(value),
    setColumnFilters: (rules) => {
      state = {
        ...state,
        columnFilters: rules.map((rule) => ({ id: rule.columnId, value: rule.value })),
        pagination: { pageIndex: 0, pageSize: dataset.rowCount },
      };
    },
    setColumnVisible: (_columnId, visible) => updateColumnVisibility(visible),
    setColumnSize: (_columnId, size) => updateColumnSize(size),
    setColumnOrder: (columnIds) => {
      state = { ...state, columnOrder: columnIds };
    },
    setColumnPinned: (_columnId, pinned) => updateColumnPinning(pinned),
    setRowSelected: (_rowId, selected) => updateRowSelection(selected),
    setAllRowsSelected: updateAllRowSelection,
    setSort: (columnId, direction) => {
      state = { ...state, sorting: [{ id: columnId, desc: direction === "desc" }] };
    },
    setSorting: (rules) => {
      state = { ...state, sorting: rules.map((rule) => ({ id: rule.columnId, desc: rule.direction === "desc" })) };
    },
    clearState: () => {
      allRowsSelected = false;
      state = { sorting: [], globalFilter: "", columnFilters: [], columnVisibility: {}, columnSizing: {}, columnOrder: [], columnPinning: { left: [], right: [] }, rowSelection: {}, pagination: { pageIndex: 0, pageSize: dataset.rowCount } };
    },
    scrollTo: (top, left) => document.querySelector<HTMLElement>(".og-grid__scroller")?.scrollTo({ top, left }),
    getSnapshot: () => getSnapshot(),
  }));

  function getSnapshot() {
    const scroller = document.querySelector<HTMLElement>(".og-grid__scroller");
    const grid = document.querySelector<HTMLElement>("[data-open-grid]");
    const mountedRows = [...document.querySelectorAll<HTMLElement>(".og-grid__body > .og-grid__row")];
    const sorting = (state.sorting ?? []).map((rule) => ({ columnId: rule.id, direction: rule.desc ? "desc" as const : "asc" as const }));
    const columnFilters = (state.columnFilters ?? []).map((rule) => ({ columnId: rule.id, value: String(rule.value) }));
    const columnOrderIds = state.columnOrder?.length === dataset.columnCount ? [...state.columnOrder] : defaultColumnOrder;
    const visibleColumnIds = columnOrderIds.filter((columnId) => state.columnVisibility?.[columnId] !== false);
    const selectedRowIds = allRowsSelected ? [] : Object.entries(state.rowSelection ?? {}).filter(([, selected]) => selected).map(([rowId]) => rowId).sort();
    return {
      implementation: "open-grid-svelte",
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
</script>

<main class="benchmark-app">
  <header class="benchmark-toolbar">
    <div class="benchmark-title">
      <h1>Open Grid Svelte</h1>
      <p>{dataset.rowCount.toLocaleString()} rows / {dataset.columnCount} columns / {datasetFingerprint}</p>
    </div>
    <div class="benchmark-controls">
      <label class="benchmark-control">Profile<select value={config.profile.id} disabled><option>{config.profile.id}</option></select></label>
      <label class="benchmark-control">Quick filter<input data-benchmark-action="quick-filter" value={state.globalFilter ?? ""} on:input={(event) => updateFilter(event.currentTarget.value)} /></label>
      <label class="benchmark-control">Status filter<input data-benchmark-action="column-filter" value={String(state.columnFilters?.[0]?.value ?? "")} on:input={(event) => updateColumnFilter(event.currentTarget.value)} /></label>
      <button data-benchmark-action="sort" type="button" on:click={() => toggleBenchmarkSort("column_5")}>Sort amount</button>
      <button data-benchmark-action="multi-sort" type="button" on:click={() => window.__OPEN_GRID_BENCHMARK__?.setSorting(state.sorting?.length === 2 ? [] : multiSortRules)}>{state.sorting?.length === 2 ? "Clear multi-sort" : "Sort status, amount"}</button>
      <button data-benchmark-action="multi-filter" type="button" on:click={() => window.__OPEN_GRID_BENCHMARK__?.setColumnFilters(state.columnFilters?.length === 2 ? [] : multiFilterRules)}>{state.columnFilters?.length === 2 ? "Clear multi-filter" : "Filter status, region"}</button>
      <button data-benchmark-action="column-visibility" type="button" on:click={() => updateColumnVisibility(state.columnVisibility?.column_10 === false)}>{state.columnVisibility?.column_10 === false ? "Show column 10" : "Hide column 10"}</button>
      <button data-benchmark-action="column-sizing" type="button" on:click={() => updateColumnSize((state.columnSizing?.column_10 ?? 120) === 120 ? 200 : 120)}>{(state.columnSizing?.column_10 ?? 120) === 120 ? "Widen column 10" : "Reset column 10"}</button>
      <button data-benchmark-action="column-ordering" type="button" on:click={() => updateColumnOrder(state.columnOrder?.[2] !== "column_10")}>{state.columnOrder?.[2] === "column_10" ? "Restore column 10" : "Move column 10"}</button>
      <button data-benchmark-action="column-pinning" type="button" on:click={() => updateColumnPinning(!(state.columnPinning?.left?.includes("column_10") ?? false))}>{state.columnPinning?.left?.includes("column_10") ? "Unpin column 10" : "Pin column 10"}</button>
      <button data-benchmark-action="row-selection" type="button" on:click={() => updateRowSelection(!(state.rowSelection?.row_0 ?? false))}>{state.rowSelection?.row_0 ? "Deselect row 0" : "Select row 0"}</button>
      <button data-benchmark-action="all-row-selection" type="button" on:click={() => updateAllRowSelection(!allRowsSelected)}>{allRowsSelected ? "Deselect all rows" : "Select all rows"}</button>
      <button data-benchmark-action="clear" type="button" on:click={() => window.__OPEN_GRID_BENCHMARK__?.clearState()}>Clear</button>
    </div>
  </header>
  <section class="benchmark-frame" aria-label="Open Grid Svelte benchmark frame">
    <DataGrid
      ariaLabel="Open Grid Svelte performance regression"
      options={gridOptions}
      rowVirtualization={{ enabled: true, estimateRowHeight: 40, measureRowHeight: false, overscan: 5 }}
      columnVirtualization={{ enabled: true, measureColumnWidth: false, overscan: 5 }}
    />
  </section>
</main>
