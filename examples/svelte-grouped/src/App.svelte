<script lang="ts">
  import { createGrid, type Grid, type Row } from "@open-grid/core";
  import { createOpenGridThemeCssText } from "@open-grid/theme/tokens";
  import {
    createColumnHelper,
    DataGrid,
    downloadExportFile,
    getBrowserGridPreferencesStorage,
    readGridPreferences,
    removeGridPreferences,
    writeGridPreferences,
    type AnyColumnDef,
    type CellEditEvent,
    type CellContext,
    type ClipboardPasteResult,
    type ColumnMovePosition,
    type ColumnPinningPosition,
    type GridOptions,
    type GridState,
    type GridDensity,
    type HeaderContext,
    type HeaderActionMenuItems,
  } from "@open-grid/svelte-ui";
  import {
    ArrowLeft,
    ArrowRight,
    Download,
    Moon,
    PanelLeft,
    PanelRight,
    PinOff,
    RefreshCw,
    Redo2,
    RotateCcw,
    Settings2,
    Sun,
    TableProperties,
    TriangleAlert,
    Undo2,
  } from "@lucide/svelte";
  import HeaderMenuTokenPreview from "./HeaderMenuTokenPreview.svelte";

  interface Forecast extends Record<string, string | number> {
    id: string;
    city: string;
    owner: string;
    note: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    risk: "Low" | "Medium" | "High";
  }

  interface ColumnManagementItem {
    id: string;
    label: string;
    locked?: boolean;
  }

  interface PasteSummary {
    attemptedCells: number;
    committedCells: number;
    skippedCells: number;
    validationErrors: number;
    blocked: boolean;
    truncated: boolean;
  }

  const column = createColumnHelper<Forecast>();
  const metricColumns: AnyColumnDef<Forecast>[] = Array.from({ length: 24 }, (_, index) =>
    column.accessor(`metric${index + 1}`, {
      header: `Metric ${index + 1}`,
      size: 132,
    }),
  );

  const cities = ["Seoul", "Tokyo", "Singapore", "Sydney", "San Francisco", "London"];
  const owners = ["Mina", "Joon", "Ara", "Theo", "Sora"];
  const risks: Forecast["risk"][] = ["Low", "Medium", "High"];
  const initialData: Forecast[] = Array.from({ length: 1000 }, (_, index) => ({
    id: `REG-${String(index + 1).padStart(3, "0")}`,
    city: cities[index % cities.length] ?? "Seoul",
    owner: owners[index % owners.length] ?? "Mina",
    note: index % 2 === 0 ? "Regional forecast includes a longer planning note that wraps across two visual lines." : "Steady demand.",
    q1: 30 + (index % 70),
    q2: 36 + (index % 80),
    q3: 42 + (index % 90),
    q4: 48 + (index % 100),
    risk: risks[index % risks.length] ?? "Low",
    ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, index * (metricIndex + 3)])),
  }));

  function getForecastRowClassName(row: Row<Forecast>): string | undefined {
    return !row.getIsGrouped() && !row.getIsGroupFooter() && row.original?.risk === "High" ? "product-row--attention" : undefined;
  }

  function getForecastHeaderClassName(context: HeaderContext<Forecast, unknown>): string | undefined {
    return context.column.id === "risk" ? "product-header--risk" : undefined;
  }

  function getForecastCellClassName(context: CellContext<Forecast, unknown>): string | undefined {
    if (context.column.id !== "risk" || typeof context.value !== "string") return undefined;
    return `product-cell--marker product-cell--risk product-cell--risk-${context.value.toLowerCase()}`;
  }

  const columns: AnyColumnDef<Forecast>[] = [
    column.group({
      id: "region",
      header: "Region",
      columns: [
        column.accessor("id", { header: "Code", size: 110 }),
        column.accessor("city", {
          header: "City",
          size: 160,
          minSize: 120,
          maxSize: 260,
          enableEditing: true,
          validateEditValue: (value) => (String(value).trim().length >= 3 ? true : "City must be at least 3 characters"),
        }),
        column.accessor("owner", {
          header: "Owner",
          size: 120,
          enableEditing: true,
          editOptions: owners.map((owner) => ({ value: owner, label: owner })),
        }),
        column.accessor("note", { header: "Note", size: 220 }),
      ],
    }),
    column.group({
      id: "pipeline",
      header: "Pipeline",
      columns: [
        column.accessor("q1", { header: "Q1", size: 96, minSize: 72, maxSize: 160, aggregationFn: "sum" }),
        column.accessor("q2", { header: "Q2", size: 96, minSize: 72, maxSize: 160, aggregationFn: "sum" }),
        column.accessor("q3", { header: "Q3", size: 96, minSize: 72, maxSize: 160, aggregationFn: "sum" }),
        column.accessor("q4", { header: "Q4", size: 96, minSize: 72, maxSize: 160, aggregationFn: "sum" }),
      ],
    }),
    column.group({
      id: "metrics",
      header: "Metrics",
      columns: metricColumns,
    }),
    column.accessor("risk", { header: "Risk", size: 110 }),
  ];

  const metricColumnIds = metricColumns.map((metricColumn) => metricColumn.accessorKey ?? "");
  const defaultColumnOrder = ["id", "city", "owner", "note", "q1", "q2", "q3", "q4", ...metricColumnIds, "risk"];
  const defaultColumnPinning = { left: ["id"], right: ["risk"] };
  const gridPreferencesKey = "open-grid:reference-preferences:v1";
  const gridPreferencesOptions = { validColumnIds: defaultColumnOrder } as const;
  const gridPreferencesStorage = getBrowserGridPreferencesStorage();
  const initialGridPreferences = readGridPreferences(gridPreferencesStorage, gridPreferencesKey, gridPreferencesOptions);
  const productThemeKey = "open-grid:reference-theme:v1";

  type ProductTheme = "light" | "dark";

  const productGridThemeStyles: Record<ProductTheme, string> = {
    light: createOpenGridThemeCssText({
      accent: "#155eef",
      accentHover: "#004eeb",
      accentSoft: "#eff4ff",
      focus: "#0e9384",
      radiusLarge: "8px",
    }),
    dark: createOpenGridThemeCssText({
      accent: "#84adff",
      accentHover: "#b2ccff",
      accentSoft: "#102a56",
      focus: "#5fe9d0",
      radiusLarge: "8px",
    }),
  };

  function readProductTheme(): ProductTheme {
    try {
      return window.localStorage.getItem(productThemeKey) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function writeProductTheme(theme: ProductTheme): void {
    try {
      window.localStorage.setItem(productThemeKey, theme);
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }
  }
  const columnManagementItems: ColumnManagementItem[] = [
    { id: "id", label: "Code", locked: true },
    { id: "city", label: "City" },
    { id: "owner", label: "Owner" },
    { id: "q1", label: "Q1" },
    { id: "q2", label: "Q2" },
    { id: "q3", label: "Q3" },
    { id: "q4", label: "Q4" },
    { id: "risk", label: "Risk", locked: true },
  ];

  const baseGridOptions: Omit<GridOptions<Forecast>, "data" | "initialState" | "state" | "onStateChange" | "onCellEdit"> = {
    columns,
    getRowId: (row) => row.id,
    groupFooterMode: "expanded",
    editHistoryLimit: 20,
  };

  let rows = initialData;
  let productTheme: ProductTheme = readProductTheme();
  let gridError = false;
  let gridLoading = false;
  let columnManagementOpen = false;
  let managedGridState: Partial<GridState> = {
    columnPinning: defaultColumnPinning,
    columnOrder: defaultColumnOrder,
    ...initialGridPreferences?.state,
    pagination: { pageIndex: 0, pageSize: rows.length },
  };
  let density: GridDensity = initialGridPreferences?.density ?? "standard";
  let gridKey = 0;
  let designMenuAction = "Design menu: none";
  let serverEditStatus = "Server edit: idle";
  let gridApi: Grid<Forecast> | null = null;
  let editHistoryState = { undoDepth: 0, redoDepth: 0, limit: 0 };
  let pasteSummary: PasteSummary | null = null;
  function connectGridApi(grid: Grid<Forecast>) {
    gridApi = grid;
    return grid.subscribeSelector(
      (currentGrid) => currentGrid.getCellEditHistoryState(),
      (nextHistoryState) => {
        editHistoryState = nextHistoryState;
      },
      { fireImmediately: true },
    );
  }
  $: gridOptions = {
    ...baseGridOptions,
    data: rows,
    onCellEdit: commitServerOwnedCellEdit,
    state: managedGridState,
    onStateChange: updateGridState,
  } satisfies GridOptions<Forecast>;
  $: orderedColumnManagementItems = orderColumnManagementItems(columnManagementItems, managedGridState.columnOrder ?? defaultColumnOrder);
  $: visibleManagedColumnCount = orderedColumnManagementItems.filter((item) => isColumnVisible(managedGridState, item.id)).length;

  function orderColumnManagementItems(items: ColumnManagementItem[], columnOrder: string[]): ColumnManagementItem[] {
    const orderIndex = new Map(columnOrder.map((columnId, index) => [columnId, index]));

    return [...items].sort((left, right) => {
      const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      return leftIndex - rightIndex;
    });
  }

  function isColumnVisible(state: Partial<GridState>, columnId: string): boolean {
    return state.columnVisibility?.[columnId] !== false;
  }

  function getColumnPinning(state: Partial<GridState>, columnId: string): ColumnPinningPosition {
    if (state.columnPinning?.left.includes(columnId)) {
      return "left";
    }

    if (state.columnPinning?.right.includes(columnId)) {
      return "right";
    }

    return false;
  }

  function setManagedState(updater: (previous: Partial<GridState>) => Partial<GridState>) {
    managedGridState = updater(managedGridState);
    writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, managedGridState, density, gridPreferencesOptions);
    gridKey += 1;
  }

  function updateGridState(nextState: GridState) {
    managedGridState = nextState;
    writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, nextState, density, gridPreferencesOptions);
  }

  function updateDensity(nextDensity: GridDensity) {
    density = nextDensity;
    writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, managedGridState, nextDensity, gridPreferencesOptions);
  }

  function commitForecastEditToServer(rowId: string, columnId: string, value: string | number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 160);
    });
  }

  function updatePasteSummary(result: ClipboardPasteResult<Forecast>) {
    pasteSummary = {
      attemptedCells: result.attemptedCells,
      committedCells: result.committedCells.length,
      skippedCells: result.skippedCells.length,
      validationErrors: result.validationErrors.length,
      blocked: result.blocked,
      truncated: result.truncated,
    };
  }

  function getKeyboardEventLike(sourceEvent: unknown): { key?: unknown; metaKey?: unknown; ctrlKey?: unknown } | null {
    if (typeof sourceEvent !== "object" || sourceEvent === null) {
      return null;
    }

    const eventLike = sourceEvent as { key?: unknown; metaKey?: unknown; ctrlKey?: unknown; nativeEvent?: unknown };

    if ("key" in eventLike) {
      return eventLike;
    }

    if (typeof eventLike.nativeEvent === "object" && eventLike.nativeEvent !== null) {
      return eventLike.nativeEvent as { key?: unknown; metaKey?: unknown; ctrlKey?: unknown };
    }

    return null;
  }

  function isDirectEnterEditCommit(event: CellEditEvent<Forecast>): boolean {
    const sourceEvent = event.sourceEvent;

    if (typeof KeyboardEvent !== "undefined" && sourceEvent instanceof KeyboardEvent) {
      return sourceEvent.key === "Enter";
    }

    return getKeyboardEventLike(sourceEvent)?.key === "Enter";
  }

  function isKeyboardPasteCommit(event: CellEditEvent<Forecast>): boolean {
    const keyboardEvent = getKeyboardEventLike(event.sourceEvent);

    return typeof keyboardEvent?.key === "string" && keyboardEvent.key.toLowerCase() === "v" && (keyboardEvent.metaKey === true || keyboardEvent.ctrlKey === true);
  }

  function commitServerOwnedCellEdit(event: CellEditEvent<Forecast>) {
    if (event.phase !== "commit" || event.defaultPrevented) {
      return;
    }

    const value = typeof event.value === "number" ? event.value : String(event.value ?? "");

    if (event.column.id === "city" && isKeyboardPasteCommit(event)) {
      event.preventDefault();
      serverEditStatus = `Server paste: saving ${event.row.id} ${event.column.id}`;

      void commitForecastEditToServer(event.row.id, event.column.id, value).then(() => {
        rows = rows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
        managedGridState = {
          ...managedGridState,
          focusedCell: { rowId: event.row.id, columnId: event.column.id },
          editingCell: null,
          cellSelectionRange: null,
        };
        serverEditStatus = `Server paste: saved ${event.row.id} ${event.column.id} = ${value}`;
        gridKey += 1;
      });
      return;
    }

    if (event.column.id !== "city" || !isDirectEnterEditCommit(event)) {
      rows = rows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
      return;
    }

    event.preventDefault();
    serverEditStatus = `Server edit: saving ${event.row.id} ${event.column.id}`;

    void commitForecastEditToServer(event.row.id, event.column.id, value).then(() => {
      rows = rows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
      managedGridState = {
        ...managedGridState,
        focusedCell: { rowId: event.row.id, columnId: event.column.id },
        editingCell: null,
      };
      serverEditStatus = `Server edit: saved ${event.row.id} ${event.column.id} = ${value}`;
      gridKey += 1;
    });
  }

  function toggleManagedColumn(columnId: string, visible: boolean) {
    setManagedState((previous) => {
      const nextVisibility = { ...(previous.columnVisibility ?? {}) };

      if (visible) {
        delete nextVisibility[columnId];
      } else {
        nextVisibility[columnId] = false;
      }

      return {
        ...previous,
        columnVisibility: nextVisibility,
        focusedCell: null,
        cellSelectionRange: null,
      };
    });
  }

  function pinManagedColumn(columnId: string, position: ColumnPinningPosition) {
    setManagedState((previous) => {
      const previousPinning = previous.columnPinning ?? defaultColumnPinning;
      const withoutColumn = {
        left: previousPinning.left.filter((candidate) => candidate !== columnId),
        right: previousPinning.right.filter((candidate) => candidate !== columnId),
      };

      return {
        ...previous,
        columnPinning: {
          left: position === "left" ? [...withoutColumn.left, columnId] : withoutColumn.left,
          right: position === "right" ? [...withoutColumn.right, columnId] : withoutColumn.right,
        },
        focusedCell: null,
        cellSelectionRange: null,
      };
    });
  }

  function moveManagedColumn(columnId: string, targetColumnId: string, position: ColumnMovePosition) {
    setManagedState((previous) => {
      const currentOrder = previous.columnOrder ?? defaultColumnOrder;

      if (columnId === targetColumnId || !currentOrder.includes(columnId) || !currentOrder.includes(targetColumnId)) {
        return previous;
      }

      const withoutColumn = currentOrder.filter((candidate) => candidate !== columnId);
      const targetIndex = withoutColumn.indexOf(targetColumnId);
      withoutColumn.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, columnId);

      return {
        ...previous,
        columnOrder: withoutColumn,
        focusedCell: null,
        cellSelectionRange: null,
      };
    });
  }

  function resetManagedColumns() {
    setManagedState((previous) => ({
      ...previous,
      columnVisibility: {},
      columnSizing: {},
      columnOrder: defaultColumnOrder,
      columnPinning: defaultColumnPinning,
      focusedCell: null,
      cellSelectionRange: null,
    }));
  }

  function resetGridPreferences() {
    removeGridPreferences(gridPreferencesStorage, gridPreferencesKey);
    density = "standard";
    managedGridState = {
      ...managedGridState,
      columnVisibility: {},
      columnSizing: {},
      columnOrder: defaultColumnOrder,
      columnPinning: defaultColumnPinning,
      focusedCell: null,
      cellSelectionRange: null,
    };
    gridKey += 1;
  }

  const headerActionMenuItems: HeaderActionMenuItems<Forecast> = ({ defaultItems, grid, column }) => [
    ...defaultItems,
    { id: "design-menu-label", type: "label", label: "Design tokens" },
    {
      id: "design-token-preview",
      type: "custom",
      label: "Design token preview",
      component: HeaderMenuTokenPreview,
      props: { columnId: column.id },
    },
    {
      id: "design-width-token",
      label: "Apply design width token",
      onSelect: () => {
        grid.setColumnSize(column.id, 180);
        designMenuAction = `Design menu: ${column.id} width token 180`;
      },
    },
    { id: "design-menu-separator", type: "separator", label: "Column sizing actions" },
    {
      id: "set-width-220",
      label: "Set width 220",
      disabled: (grid.getColumnSize(column.id) ?? column.getSize()) >= 220,
      onSelect: () => grid.setColumnSize(column.id, 220),
    },
  ];

  function downloadCsvExport() {
    const grid = createGrid(gridOptions);

    downloadExportFile(
      grid.getExportFile({
        filename: "open-grid-forecast",
        format: "csv",
        includeHeaders: true,
        rowScope: "pre-pagination",
      }),
    );
  }
</script>

<main class="app-shell" data-og-theme={productTheme}>
  <section class="toolbar" aria-label="Forecast grid summary">
    <div class="toolbar__identity">
      <span class="product-mark" aria-hidden="true"><TableProperties size={19} /></span>
      <div>
        <span class="toolbar__eyebrow">Planning workspace</span>
        <h1>Regional forecast</h1>
        <p>1,000 regions · Updated just now</p>
      </div>
    </div>
    <div class="metrics" aria-label="Summary metrics">
      <span class="metric-pill"><span>Regions</span><strong>1,000</strong></span>
      <span class="metric-pill"><span>Risk view</span><strong>Pinned</strong></span>
      <button class="icon-button" type="button" title={`Undo edit (${editHistoryState.undoDepth})`} aria-label="Undo edit" disabled={editHistoryState.undoDepth === 0} on:click={(event) => gridApi?.undoCellEdit(event)}><Undo2 size={16} aria-hidden="true" /></button>
      <button class="icon-button" type="button" title={`Redo edit (${editHistoryState.redoDepth})`} aria-label="Redo edit" disabled={editHistoryState.redoDepth === 0} on:click={(event) => gridApi?.redoCellEdit(event)}><Redo2 size={16} aria-hidden="true" /></button>
      <button class="action-button action-button--primary" type="button" on:click={downloadCsvExport}><Download size={15} aria-hidden="true" />Export CSV</button>
      <button
        class="action-button"
        type="button"
        aria-label="Manage columns"
        aria-controls="column-management-panel"
        aria-expanded={columnManagementOpen}
        on:click={() => (columnManagementOpen = !columnManagementOpen)}
      ><Settings2 size={15} aria-hidden="true" />Core columns {visibleManagedColumnCount}/{orderedColumnManagementItems.length}</button>
      <button class="icon-button" type="button" title={gridLoading ? "Finish refresh" : "Refresh data"} aria-label={gridLoading ? "Finish refresh" : "Refresh data"} on:click={() => (gridLoading = !gridLoading)}>
        <RefreshCw class={gridLoading ? "is-spinning" : undefined} size={16} aria-hidden="true" />
        <span class="sr-only">{gridLoading ? "Finish refresh" : "Refresh data"}</span>
      </button>
      <button class="icon-button icon-button--danger" type="button" title="Simulate error" aria-label="Simulate error" disabled={gridError} on:click={() => (gridError = true)}>
        <TriangleAlert size={16} aria-hidden="true" />
        <span class="sr-only">Simulate error</span>
      </button>
      <button
        class="icon-button"
        type="button"
        title={`Use ${productTheme === "light" ? "dark" : "light"} theme`}
        aria-label={`Use ${productTheme === "light" ? "dark" : "light"} theme`}
        on:click={() => {
          productTheme = productTheme === "light" ? "dark" : "light";
          writeProductTheme(productTheme);
        }}
      >
        {#if productTheme === "light"}
          <Moon size={16} aria-hidden="true" />
        {:else}
          <Sun size={16} aria-hidden="true" />
        {/if}
        <span class="sr-only">Use {productTheme === "light" ? "dark" : "light"} theme</span>
      </button>
    </div>
  </section>

  <section id="column-management-panel" class="column-management" aria-label="Column management" hidden={!columnManagementOpen}>
    <div class="column-management__header">
      <div>
        <span class="section-heading"><Settings2 size={16} aria-hidden="true" /><h2>Column management</h2></span>
        <p>Choose which fields stay visible and where they appear.</p>
      </div>
      <div class="column-management__summary">
        <span data-testid="managed-column-count">Visible {visibleManagedColumnCount} / {orderedColumnManagementItems.length}</span>
        <button class="action-button" type="button" on:click={resetManagedColumns}><RotateCcw size={14} aria-hidden="true" />Reset columns</button>
        <button class="action-button" type="button" on:click={resetGridPreferences}><Settings2 size={14} aria-hidden="true" />Reset preferences</button>
      </div>
    </div>
    <div class="column-management__list">
      {#each orderedColumnManagementItems as item, index (item.id)}
        {@const visible = isColumnVisible(managedGridState, item.id)}
        {@const pinning = getColumnPinning(managedGridState, item.id)}
        {@const previousItem = orderedColumnManagementItems[index - 1]}
        {@const nextItem = orderedColumnManagementItems[index + 1]}
        <div class="column-management__item" data-column-id={item.id}>
          <label>
            <input
              type="checkbox"
              checked={visible}
              disabled={item.locked}
              on:change={(event) => {
                const input = event.currentTarget;

                if (input instanceof HTMLInputElement) {
                  toggleManagedColumn(item.id, input.checked);
                }
              }}
            />
            {item.label}
          </label>
          <div class="column-management__actions" aria-label={`${item.label} column actions`}>
            <button
              type="button"
              aria-label={`Move ${item.label} left`}
              title={`Move ${item.label} left`}
              disabled={!previousItem}
              on:click={() => previousItem && moveManagedColumn(item.id, previousItem.id, "before")}
            >
              <ArrowLeft size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.label} right`}
              title={`Move ${item.label} right`}
              disabled={!nextItem}
              on:click={() => nextItem && moveManagedColumn(item.id, nextItem.id, "after")}
            >
              <ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Pin ${item.label} left`} title={`Pin ${item.label} left`} disabled={pinning === "left"} on:click={() => pinManagedColumn(item.id, "left")}>
              <PanelLeft size={14} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Unpin ${item.label}`} title={`Unpin ${item.label}`} disabled={!pinning} on:click={() => pinManagedColumn(item.id, false)}>
              <PinOff size={14} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Pin ${item.label} right`} title={`Pin ${item.label} right`} disabled={pinning === "right"} on:click={() => pinManagedColumn(item.id, "right")}>
              <PanelRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="activity-status" aria-label="Header menu composition status" aria-live="polite" data-active={designMenuAction !== "Design menu: none"}>
    <span data-testid="svelte-design-menu-action">{designMenuAction}</span>
  </section>

  {#if pasteSummary}
    <section class="paste-summary" aria-label="Paste summary">
      <span>Attempted {pasteSummary.attemptedCells}</span>
      <span>Committed {pasteSummary.committedCells}</span>
      <span>Skipped {pasteSummary.skippedCells}</span>
      <span>Validation {pasteSummary.validationErrors}</span>
      {#if pasteSummary.blocked}
        <span>Blocked</span>
      {/if}
      {#if pasteSummary.truncated}
        <span>Truncated</span>
      {/if}
    </section>
  {/if}

  <section class="activity-status" aria-label="Server edit status" aria-live="polite" data-active={serverEditStatus !== "Server edit: idle"}>
    <span data-testid="svelte-server-edit-status">{serverEditStatus}</span>
  </section>

  {#key gridKey}
    <DataGrid
      ariaLabel="Regional forecasts"
      class="forecast-grid"
      options={gridOptions}
      error={gridError}
      errorState="Forecast service is unavailable."
      onRetry={() => (gridError = false)}
      loading={gridLoading}
      loadingState="Refreshing forecasts..."
      onGridReady={connectGridApi}
      getRowClassName={getForecastRowClassName}
      getHeaderClassName={getForecastHeaderClassName}
      getCellClassName={getForecastCellClassName}
      groupingPanel={true}
      quickFilterControl={true}
      rowSelectionControls={true}
      columnVisibilityControls={true}
      densityControl={true}
      {density}
      onDensityChange={updateDensity}
      columnFilterControls={true}
      paginationControls={true}
      pageSizeOptions={[25, 50, 100, 1000]}
      headerActionMenu={true}
      {headerActionMenuItems}
      clipboardPasteOptions={{ maxCells: 16, maxCellsMode: "truncate" }}
      onClipboardPaste={updatePasteSummary}
      rowVirtualization={{ enabled: true, estimateRowHeight: 40, overscan: 6 }}
      columnVirtualization={{ enabled: true, overscan: 2 }}
      style={`${productGridThemeStyles[productTheme]}; height: 360px`}
    />
  {/key}
</main>
