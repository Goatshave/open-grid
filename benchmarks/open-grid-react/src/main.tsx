import "@open-grid/benchmark-shared/app.css";
import "@open-grid/theme/css";
import "@open-grid/react-ui/virtual.css";

import { createBenchmarkDataset, fingerprintBenchmarkDataset, type BenchmarkRow } from "@open-grid/benchmark-shared";
import { createBenchmarkInitializationTracker, getBenchmarkSnapshotRequirements, installBenchmarkDriver, readBenchmarkPageConfig, toggleBenchmarkSort, type BenchmarkAction, type BenchmarkSnapshot } from "@open-grid/benchmark-shared/browser";
import { createColumnHelper, VirtualDataGrid, type AnyColumnDef, type GridState } from "@open-grid/react-ui/virtual";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

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

function App() {
  const [state, setState] = useState<Partial<GridState>>({
    globalFilter: "",
    columnFilters: [],
    pagination: { pageIndex: 0, pageSize: dataset.rowCount },
  });
  const allRowsSelectedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const updateFilter = (value: string) => {
    setState((current) => ({ ...current, globalFilter: value, pagination: { pageIndex: 0, pageSize: dataset.rowCount } }));
  };
  const updateColumnFilter = (value: string) => {
    setState((current) => ({ ...current, columnFilters: value ? [{ id: "column_2", value }] : [], pagination: { pageIndex: 0, pageSize: dataset.rowCount } }));
  };
  const updateColumnVisibility = (visible: boolean) => {
    setState((current) => ({ ...current, columnVisibility: visible ? {} : { column_10: false } }));
  };
  const updateColumnSize = (size: number) => {
    setState((current) => ({ ...current, columnSizing: { ...current.columnSizing, column_10: size } }));
  };
  const updateColumnOrder = (moved: boolean) => {
    setState((current) => ({ ...current, columnOrder: moved ? movedColumnOrder : [] }));
  };
  const updateColumnPinning = (pinned: boolean) => {
    setState((current) => ({ ...current, columnPinning: { left: pinned ? ["column_10"] : [], right: [] } }));
  };
  const updateRowSelection = (selected: boolean) => {
    allRowsSelectedRef.current = false;
    setState((current) => ({ ...current, rowSelection: selected ? { row_0: true } : {}, allRowsSelected: false }));
  };
  const updateAllRowSelection = (selected: boolean) => {
    allRowsSelectedRef.current = selected;
    setState((current) => ({ ...current, rowSelection: {}, allRowsSelected: selected }));
  };

  useEffect(() => {
    const readSnapshot = (action?: BenchmarkAction): BenchmarkSnapshot => {
      const requirements = getBenchmarkSnapshotRequirements(action);
      const scroller = requirements.scrollPosition
        ? document.querySelector<HTMLElement>(".og-grid__scroller")
        : null;
      const grid = requirements.displayedRows
        ? document.querySelector<HTMLElement>("[data-open-grid]")
        : null;
      const logicalRows = requirements.displayedRows
        ? Number(grid?.getAttribute("aria-rowcount") ?? 1) - 1
        : 0;
      const mountedRows = requirements.renderedRows
        ? [...document.querySelectorAll<HTMLElement>(".og-grid__body > .og-grid__row")]
        : [];
      const sorting = requirements.sorting
        ? (stateRef.current.sorting ?? []).map((rule) => ({ columnId: rule.id, direction: rule.desc ? "desc" as const : "asc" as const }))
        : [];
      const columnFilters = requirements.filtering
        ? (stateRef.current.columnFilters ?? []).map((rule) => ({ columnId: rule.id, value: String(rule.value) }))
        : [];
      const needsEffectiveOrder = requirements.columnOrder || requirements.visibleColumns;
      const columnOrderIds = needsEffectiveOrder
        ? stateRef.current.columnOrder?.length === dataset.columnCount ? [...stateRef.current.columnOrder] : defaultColumnOrder
        : [];
      const visibleColumnIds = requirements.visibleColumns
        ? columnOrderIds.filter((columnId) => stateRef.current.columnVisibility?.[columnId] !== false)
        : [];
      const selectedRowIds = requirements.selection && !allRowsSelectedRef.current
        ? Object.entries(stateRef.current.rowSelection ?? {}).filter(([, selected]) => selected).map(([rowId]) => rowId).sort()
        : [];

      return {
        implementation: "open-grid",
        profileId: config.profile.id,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        visibleColumnCount: visibleColumnIds.length,
        visibleColumnIds,
        columnSize: {
          columnId: "column_10",
          size: requirements.columnSize ? stateRef.current.columnSizing?.column_10 ?? 120 : 0,
        },
        columnOrderIds,
        columnPinning: requirements.columnPinning
          ? {
              left: [...(stateRef.current.columnPinning?.left ?? [])],
              right: [...(stateRef.current.columnPinning?.right ?? [])],
            }
          : { left: [], right: [] },
        selectedRowIds,
        selectedRowCount: requirements.selection
          ? allRowsSelectedRef.current ? dataset.rowCount : selectedRowIds.length
          : 0,
        allRowsSelected: requirements.selection && allRowsSelectedRef.current,
        displayedRowCount: Math.max(0, logicalRows),
        mountedRowCount: mountedRows.length,
        mountedCellCount: requirements.mountedCells
          ? document.querySelectorAll(".og-grid__body > .og-grid__row > .og-grid__cell").length
          : 0,
        firstMountedRowId: mountedRows[0]?.dataset.rowId ?? null,
        mountedRowSignature: mountedRows.map((row) => row.dataset.rowId ?? "").join("|"),
        sort: sorting[0] ?? null,
        sorting,
        filter: requirements.filtering ? stateRef.current.globalFilter ?? "" : "",
        columnFilter: columnFilters[0] ?? null,
        columnFilters,
        scrollTop: scroller?.scrollTop ?? 0,
        scrollLeft: scroller?.scrollLeft ?? 0,
      };
    };

    return installBenchmarkDriver({
    implementation: "open-grid",
    profileId: config.profile.id,
    datasetFingerprint,
    initializationTracker,
    setQuickFilter: updateFilter,
    setColumnFilter: (_columnId, value) => updateColumnFilter(value),
    setColumnFilters: (rules) => setState((current) => ({
      ...current,
      columnFilters: rules.map((rule) => ({ id: rule.columnId, value: rule.value })),
      pagination: { pageIndex: 0, pageSize: dataset.rowCount },
    })),
    setColumnVisible: (_columnId, visible) => updateColumnVisibility(visible),
    setColumnSize: (_columnId, size) => updateColumnSize(size),
    setColumnOrder: (columnIds) => setState((current) => ({ ...current, columnOrder: columnIds })),
    setColumnPinned: (_columnId, pinned) => updateColumnPinning(pinned),
    setRowSelected: (_rowId, selected) => updateRowSelection(selected),
    setAllRowsSelected: updateAllRowSelection,
    setSort: (columnId, direction) => setState((current) => ({ ...current, sorting: [{ id: columnId, desc: direction === "desc" }] })),
    setSorting: (rules) => setState((current) => ({ ...current, sorting: rules.map((rule) => ({ id: rule.columnId, desc: rule.direction === "desc" })) })),
    clearState: () => {
      allRowsSelectedRef.current = false;
      setState({
        sorting: [],
        globalFilter: "",
        columnFilters: [],
        columnVisibility: {},
        columnSizing: {},
        columnOrder: [],
        columnPinning: { left: [], right: [] },
        rowSelection: {},
        pagination: { pageIndex: 0, pageSize: dataset.rowCount },
      });
    },
    scrollTo: (top, left) => document.querySelector<HTMLElement>(".og-grid__scroller")?.scrollTo({ top, left }),
    getSnapshot: () => readSnapshot(),
    getActionSnapshot: readSnapshot,
  });
  }, []);

  return (
    <main className="benchmark-app">
      <BenchmarkToolbar implementation="Open Grid" filter={state.globalFilter ?? ""} columnFilter={String(state.columnFilters?.[0]?.value ?? "")} columnVisible={state.columnVisibility?.column_10 !== false} columnSize={state.columnSizing?.column_10 ?? 120} columnMoved={state.columnOrder?.[2] === "column_10"} columnPinned={state.columnPinning?.left?.includes("column_10") ?? false} rowSelected={state.rowSelection?.row_0 ?? false} allRowsSelected={allRowsSelectedRef.current} onFilter={updateFilter} onColumnFilter={updateColumnFilter} onColumnVisibility={updateColumnVisibility} onColumnSize={updateColumnSize} onColumnOrder={updateColumnOrder} onColumnPinning={updateColumnPinning} onRowSelection={updateRowSelection} onAllRowSelection={updateAllRowSelection} />
      <section className="benchmark-frame" aria-label="Open Grid benchmark frame">
        <VirtualDataGrid
          ariaLabel="Open Grid performance benchmark"
          data={dataset.rows}
          columns={columns}
          getRowId={getBenchmarkRowId}
          state={state}
          onStateChange={setState}
          rowHeight={40}
          rowOverscan={5}
          columnOverscan={5}
        />
      </section>
    </main>
  );
}

function BenchmarkToolbar({ implementation, filter, columnFilter, columnVisible, columnSize, columnMoved, columnPinned, rowSelected, allRowsSelected, onFilter, onColumnFilter, onColumnVisibility, onColumnSize, onColumnOrder, onColumnPinning, onRowSelection, onAllRowSelection }: { implementation: string; filter: string; columnFilter: string; columnVisible: boolean; columnSize: number; columnMoved: boolean; columnPinned: boolean; rowSelected: boolean; allRowsSelected: boolean; onFilter: (value: string) => void; onColumnFilter: (value: string) => void; onColumnVisibility: (visible: boolean) => void; onColumnSize: (size: number) => void; onColumnOrder: (moved: boolean) => void; onColumnPinning: (pinned: boolean) => void; onRowSelection: (selected: boolean) => void; onAllRowSelection: (selected: boolean) => void }) {
  return (
    <header className="benchmark-toolbar">
      <div className="benchmark-title">
        <h1>{implementation}</h1>
        <p>{dataset.rowCount.toLocaleString()} rows / {dataset.columnCount} columns / {datasetFingerprint}</p>
      </div>
      <div className="benchmark-controls">
        <label className="benchmark-control">Profile
          <select value={config.profile.id} disabled><option>{config.profile.id}</option></select>
        </label>
        <label className="benchmark-control">Quick filter
          <input data-benchmark-action="quick-filter" value={filter} onChange={(event) => onFilter(event.target.value)} />
        </label>
        <label className="benchmark-control">Status filter
          <input data-benchmark-action="column-filter" value={columnFilter} onChange={(event) => onColumnFilter(event.target.value)} />
        </label>
        <button data-benchmark-action="sort" type="button" onClick={() => toggleBenchmarkSort("column_5")}>Sort amount</button>
        <button data-benchmark-action="multi-sort" type="button" onClick={() => window.__OPEN_GRID_BENCHMARK__?.setSorting(window.__OPEN_GRID_BENCHMARK__.getSnapshot().sorting.length === 2 ? [] : multiSortRules)}>Multi-sort</button>
        <button data-benchmark-action="multi-filter" type="button" onClick={() => window.__OPEN_GRID_BENCHMARK__?.setColumnFilters(window.__OPEN_GRID_BENCHMARK__.getSnapshot().columnFilters.length === 2 ? [] : multiFilterRules)}>Filter status + region</button>
        <button data-benchmark-action="column-visibility" type="button" onClick={() => onColumnVisibility(!columnVisible)}>{columnVisible ? "Hide column 10" : "Show column 10"}</button>
        <button data-benchmark-action="column-sizing" type="button" onClick={() => onColumnSize(columnSize === 120 ? 200 : 120)}>{columnSize === 120 ? "Widen column 10" : "Reset column 10"}</button>
        <button data-benchmark-action="column-ordering" type="button" onClick={() => onColumnOrder(!columnMoved)}>{columnMoved ? "Restore column 10" : "Move column 10"}</button>
        <button data-benchmark-action="column-pinning" type="button" onClick={() => onColumnPinning(!columnPinned)}>{columnPinned ? "Unpin column 10" : "Pin column 10"}</button>
        <button data-benchmark-action="row-selection" type="button" onClick={() => onRowSelection(!rowSelected)}>{rowSelected ? "Deselect row 0" : "Select row 0"}</button>
        <button data-benchmark-action="all-row-selection" type="button" onClick={() => onAllRowSelection(!allRowsSelected)}>{allRowsSelected ? "Deselect all rows" : "Select all rows"}</button>
        <button data-benchmark-action="clear" type="button" onClick={() => window.__OPEN_GRID_BENCHMARK__?.clearState()}>Clear</button>
      </div>
    </header>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
