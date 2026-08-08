import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
import "./styles.css";
import { createGrid, type Grid, type Row } from "@open-grid/core";
import { createOpenGridThemeStyle } from "@open-grid/theme/tokens";
import {
  createColumnHelper,
  createDataGrid,
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
} from "@open-grid/vue-ui";
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
} from "@lucide/vue";
import { computed, createApp, defineComponent, h, ref } from "vue";

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

const productGridThemeStyles = {
  light: createOpenGridThemeStyle({
    accent: "#155eef",
    accentHover: "#004eeb",
    accentSoft: "#eff4ff",
    focus: "#0e9384",
    radiusLarge: "8px",
  }),
  dark: createOpenGridThemeStyle({
    accent: "#84adff",
    accentHover: "#b2ccff",
    accentSoft: "#102a56",
    focus: "#5fe9d0",
    radiusLarge: "8px",
  }),
} satisfies Record<ProductTheme, ReturnType<typeof createOpenGridThemeStyle>>;

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
const ForecastGrid = createDataGrid<Forecast>();

function commitForecastEditToServer(rowId: string, columnId: string, value: string | number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 160);
  });
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

function createManagedColumnVisibilityState(previous: Partial<GridState>, columnId: string, visible: boolean): Partial<GridState> {
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
}

function createManagedColumnPinningState(previous: Partial<GridState>, columnId: string, position: ColumnPinningPosition): Partial<GridState> {
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
}

function createManagedColumnOrderState(
  previous: Partial<GridState>,
  columnId: string,
  targetColumnId: string,
  position: ColumnMovePosition,
): Partial<GridState> {
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
}

function createResetManagedColumnState(previous: Partial<GridState>): Partial<GridState> {
  return {
    ...previous,
    columnVisibility: {},
    columnSizing: {},
    columnOrder: defaultColumnOrder,
    columnPinning: defaultColumnPinning,
    focusedCell: null,
    cellSelectionRange: null,
  };
}

function downloadCsvExport(gridOptions: GridOptions<Forecast>) {
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

const App = defineComponent({
  name: "VueGroupedGridExample",
  setup() {
    const productTheme = ref<ProductTheme>(readProductTheme());
    const rows = ref<Forecast[]>(initialData);
    const gridError = ref(false);
    const gridLoading = ref(false);
    const columnManagementOpen = ref(false);
    const gridState = ref<Partial<GridState>>({
      columnPinning: defaultColumnPinning,
      columnOrder: defaultColumnOrder,
      ...initialGridPreferences?.state,
      pagination: { pageIndex: 0, pageSize: rows.value.length },
    });
    const density = ref<GridDensity>(initialGridPreferences?.density ?? "standard");
    const serverEditStatus = ref("Server edit: idle");
    const gridApi = ref<Grid<Forecast> | null>(null);
    const editHistoryState = ref({ undoDepth: 0, redoDepth: 0, limit: 0 });
    const pasteSummary = ref<PasteSummary | null>(null);
    const connectGridApi = (grid: Grid<Forecast>) => {
      gridApi.value = grid;
      return grid.subscribeSelector(
        (currentGrid) => currentGrid.getCellEditHistoryState(),
        (nextHistoryState) => { editHistoryState.value = nextHistoryState; },
        { fireImmediately: true },
      );
    };
    const updatePasteSummary = (result: ClipboardPasteResult<Forecast>) => {
      pasteSummary.value = {
        attemptedCells: result.attemptedCells,
        committedCells: result.committedCells.length,
        skippedCells: result.skippedCells.length,
        validationErrors: result.validationErrors.length,
        blocked: result.blocked,
        truncated: result.truncated,
      };
    };
    const commitServerOwnedCellEdit = (event: CellEditEvent<Forecast>) => {
      if (event.phase !== "commit" || event.defaultPrevented) {
        return;
      }

      const value = typeof event.value === "number" ? event.value : String(event.value ?? "");

      if (event.column.id === "city" && isKeyboardPasteCommit(event)) {
        event.preventDefault();
        serverEditStatus.value = `Server paste: saving ${event.row.id} ${event.column.id}`;

        void commitForecastEditToServer(event.row.id, event.column.id, value).then(() => {
          rows.value = rows.value.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
          gridState.value = {
            ...gridState.value,
            focusedCell: { rowId: event.row.id, columnId: event.column.id },
            editingCell: null,
            cellSelectionRange: null,
          };
          serverEditStatus.value = `Server paste: saved ${event.row.id} ${event.column.id} = ${value}`;
        });
        return;
      }

      if (event.column.id !== "city" || !isDirectEnterEditCommit(event)) {
        rows.value = rows.value.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
        return;
      }

      event.preventDefault();
      serverEditStatus.value = `Server edit: saving ${event.row.id} ${event.column.id}`;

      void commitForecastEditToServer(event.row.id, event.column.id, value).then(() => {
        rows.value = rows.value.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row));
        gridState.value = {
          ...gridState.value,
          focusedCell: { rowId: event.row.id, columnId: event.column.id },
          editingCell: null,
        };
        serverEditStatus.value = `Server edit: saved ${event.row.id} ${event.column.id} = ${value}`;
      });
    };
    const gridOptions = computed<GridOptions<Forecast>>(() => ({
      ...baseGridOptions,
      data: rows.value,
      state: gridState.value,
      onStateChange: (nextState) => {
        gridState.value = nextState;
        writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, nextState, density.value, gridPreferencesOptions);
      },
      onCellEdit: commitServerOwnedCellEdit,
    }));
    const orderedColumnManagementItems = computed(() => orderColumnManagementItems(columnManagementItems, gridState.value.columnOrder ?? defaultColumnOrder));
    const visibleManagedColumnCount = computed(() => orderedColumnManagementItems.value.filter((item) => isColumnVisible(gridState.value, item.id)).length);
    const designMenuAction = ref("Design menu: none");
    const headerActionMenuItems: HeaderActionMenuItems<Forecast> = ({ defaultItems, grid, column }) => [
      ...defaultItems,
      { id: "design-menu-label", type: "label", label: "Design tokens" },
      {
        id: "design-token-preview",
        type: "custom",
        label: "Design token preview",
        render: () =>
          h(
            "span",
            {
              class: "menu-token-preview",
              "data-testid": "vue-menu-custom-slot",
            },
            `Width token: ${column.id}`,
          ),
      },
      {
        id: "design-width-token",
        label: "Apply design width token",
        onSelect: () => {
          grid.setColumnSize(column.id, 180);
          designMenuAction.value = `Design menu: ${column.id} width token 180`;
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
    const setManagedState = (updater: (previous: Partial<GridState>) => Partial<GridState>) => {
      gridState.value = updater(gridState.value);
      writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, gridState.value, density.value, gridPreferencesOptions);
    };
    const resetGridPreferences = () => {
      removeGridPreferences(gridPreferencesStorage, gridPreferencesKey);
      density.value = "standard";
      gridState.value = createResetManagedColumnState(gridState.value);
    };
    const updateDensity = (nextDensity: GridDensity) => {
      density.value = nextDensity;
      writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, gridState.value, nextDensity, gridPreferencesOptions);
    };

    return () =>
      h("main", { class: "app-shell", "data-og-theme": productTheme.value }, [
        h("section", { class: "toolbar", "aria-label": "Forecast grid summary" }, [
          h("div", { class: "toolbar__identity" }, [
            h("span", { class: "product-mark", "aria-hidden": "true" }, [h(TableProperties, { size: 19 })]),
            h("div", [h("span", { class: "toolbar__eyebrow" }, "Planning workspace"), h("h1", "Regional forecast"), h("p", "1,000 regions · Updated just now")]),
          ]),
          h("div", { class: "metrics", "aria-label": "Summary metrics" }, [
            h("span", { class: "metric-pill" }, [h("span", "Regions"), h("strong", "1,000")]),
            h("span", { class: "metric-pill" }, [h("span", "Risk view"), h("strong", "Pinned")]),
            h("button", { class: "icon-button", type: "button", title: `Undo edit (${editHistoryState.value.undoDepth})`, "aria-label": "Undo edit", disabled: editHistoryState.value.undoDepth === 0, onClick: (event: MouseEvent) => gridApi.value?.undoCellEdit(event) }, [h(Undo2, { size: 16, "aria-hidden": "true" })]),
            h("button", { class: "icon-button", type: "button", title: `Redo edit (${editHistoryState.value.redoDepth})`, "aria-label": "Redo edit", disabled: editHistoryState.value.redoDepth === 0, onClick: (event: MouseEvent) => gridApi.value?.redoCellEdit(event) }, [h(Redo2, { size: 16, "aria-hidden": "true" })]),
            h("button", { class: "action-button action-button--primary", type: "button", onClick: () => downloadCsvExport(gridOptions.value) }, [h(Download, { size: 15, "aria-hidden": "true" }), "Export CSV"]),
            h("button", {
              class: "action-button",
              type: "button",
              "aria-label": "Manage columns",
              "aria-controls": "column-management-panel",
              "aria-expanded": columnManagementOpen.value,
              onClick: () => { columnManagementOpen.value = !columnManagementOpen.value; },
            }, [h(Settings2, { size: 15, "aria-hidden": "true" }), `Core columns ${visibleManagedColumnCount.value}/${orderedColumnManagementItems.value.length}`]),
            h("button", { class: "icon-button", type: "button", title: gridLoading.value ? "Finish refresh" : "Refresh data", "aria-label": gridLoading.value ? "Finish refresh" : "Refresh data", onClick: () => { gridLoading.value = !gridLoading.value; } }, [h(RefreshCw, { class: gridLoading.value ? "is-spinning" : undefined, size: 16, "aria-hidden": "true" }), h("span", { class: "sr-only" }, gridLoading.value ? "Finish refresh" : "Refresh data")]),
            h("button", { class: "icon-button icon-button--danger", type: "button", title: "Simulate error", "aria-label": "Simulate error", disabled: gridError.value, onClick: () => { gridError.value = true; } }, [h(TriangleAlert, { size: 16, "aria-hidden": "true" }), h("span", { class: "sr-only" }, "Simulate error")]),
            h("button", {
              class: "icon-button",
              type: "button",
              title: `Use ${productTheme.value === "light" ? "dark" : "light"} theme`,
              "aria-label": `Use ${productTheme.value === "light" ? "dark" : "light"} theme`,
              onClick: () => {
                const nextTheme: ProductTheme = productTheme.value === "light" ? "dark" : "light";
                writeProductTheme(nextTheme);
                productTheme.value = nextTheme;
              },
            }, [
              h(productTheme.value === "light" ? Moon : Sun, { size: 16, "aria-hidden": "true" }),
              h("span", { class: "sr-only" }, `Use ${productTheme.value === "light" ? "dark" : "light"} theme`),
            ]),
          ]),
        ]),
        h("section", { id: "column-management-panel", class: "column-management", "aria-label": "Column management", hidden: !columnManagementOpen.value }, [
          h("div", { class: "column-management__header" }, [
            h("div", [h("span", { class: "section-heading" }, [h(Settings2, { size: 16, "aria-hidden": "true" }), h("h2", "Column management")]), h("p", "Choose which fields stay visible and where they appear.")]),
            h("div", { class: "column-management__summary" }, [
              h("span", { "data-testid": "managed-column-count" }, `Visible ${visibleManagedColumnCount.value} / ${orderedColumnManagementItems.value.length}`),
              h("button", { class: "action-button", type: "button", onClick: () => setManagedState(createResetManagedColumnState) }, [h(RotateCcw, { size: 14, "aria-hidden": "true" }), "Reset columns"]),
              h("button", { class: "action-button", type: "button", onClick: resetGridPreferences }, [h(Settings2, { size: 14, "aria-hidden": "true" }), "Reset preferences"]),
            ]),
          ]),
          h(
            "div",
            { class: "column-management__list" },
            orderedColumnManagementItems.value.map((item, index) => {
              const visible = isColumnVisible(gridState.value, item.id);
              const pinning = getColumnPinning(gridState.value, item.id);
              const previousItem = orderedColumnManagementItems.value[index - 1];
              const nextItem = orderedColumnManagementItems.value[index + 1];

              return h("div", { class: "column-management__item", "data-column-id": item.id, key: item.id }, [
                h("label", [
                  h("input", {
                    type: "checkbox",
                    checked: visible,
                    disabled: item.locked,
                    onChange: (event: Event) => {
                      const input = event.currentTarget;

                      if (input instanceof HTMLInputElement) {
                        setManagedState((previous) => createManagedColumnVisibilityState(previous, item.id, input.checked));
                      }
                    },
                  }),
                  item.label,
                ]),
                h("div", { class: "column-management__actions", "aria-label": `${item.label} column actions` }, [
                  h(
                    "button",
                    {
                      type: "button",
                      "aria-label": `Move ${item.label} left`,
                      title: `Move ${item.label} left`,
                      disabled: !previousItem,
                      onClick: () => previousItem && setManagedState((previous) => createManagedColumnOrderState(previous, item.id, previousItem.id, "before")),
                    },
                    h(ArrowLeft, { size: 14, "aria-hidden": "true" }),
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      "aria-label": `Move ${item.label} right`,
                      title: `Move ${item.label} right`,
                      disabled: !nextItem,
                      onClick: () => nextItem && setManagedState((previous) => createManagedColumnOrderState(previous, item.id, nextItem.id, "after")),
                    },
                    h(ArrowRight, { size: 14, "aria-hidden": "true" }),
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      "aria-label": `Pin ${item.label} left`,
                      title: `Pin ${item.label} left`,
                      disabled: pinning === "left",
                      onClick: () => setManagedState((previous) => createManagedColumnPinningState(previous, item.id, "left")),
                    },
                    h(PanelLeft, { size: 14, "aria-hidden": "true" }),
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      "aria-label": `Unpin ${item.label}`,
                      title: `Unpin ${item.label}`,
                      disabled: !pinning,
                      onClick: () => setManagedState((previous) => createManagedColumnPinningState(previous, item.id, false)),
                    },
                    h(PinOff, { size: 14, "aria-hidden": "true" }),
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      "aria-label": `Pin ${item.label} right`,
                      title: `Pin ${item.label} right`,
                      disabled: pinning === "right",
                      onClick: () => setManagedState((previous) => createManagedColumnPinningState(previous, item.id, "right")),
                    },
                    h(PanelRight, { size: 14, "aria-hidden": "true" }),
                  ),
                ]),
              ]);
            }),
          ),
        ]),
        h("section", { class: "activity-status", "aria-label": "Header menu composition status", "aria-live": "polite", "data-active": designMenuAction.value !== "Design menu: none" }, [
          h("span", { "data-testid": "vue-design-menu-action" }, designMenuAction.value),
        ]),
        pasteSummary.value
          ? h("section", { class: "paste-summary", "aria-label": "Paste summary" }, [
              h("span", `Attempted ${pasteSummary.value.attemptedCells}`),
              h("span", `Committed ${pasteSummary.value.committedCells}`),
              h("span", `Skipped ${pasteSummary.value.skippedCells}`),
              h("span", `Validation ${pasteSummary.value.validationErrors}`),
              pasteSummary.value.blocked ? h("span", "Blocked") : null,
              pasteSummary.value.truncated ? h("span", "Truncated") : null,
            ])
          : null,
        h("section", { class: "activity-status", "aria-label": "Server edit status", "aria-live": "polite", "data-active": serverEditStatus.value !== "Server edit: idle" }, [
          h("span", { "data-testid": "vue-server-edit-status" }, serverEditStatus.value),
        ]),
        h(ForecastGrid, {
          ariaLabel: "Regional forecasts",
          class: "forecast-grid",
          options: gridOptions.value,
          error: gridError.value,
          errorState: "Forecast service is unavailable.",
          onRetry: () => { gridError.value = false; },
          loading: gridLoading.value,
          loadingState: "Refreshing forecasts...",
          onGridReady: connectGridApi,
          getRowClassName: getForecastRowClassName,
          getHeaderClassName: getForecastHeaderClassName,
          getCellClassName: getForecastCellClassName,
          groupingPanel: true,
          quickFilterControl: true,
          rowSelectionControls: true,
          columnVisibilityControls: true,
          densityControl: true,
          density: density.value,
          onDensityChange: updateDensity,
          columnFilterControls: true,
          paginationControls: true,
          pageSizeOptions: [25, 50, 100, 1000],
          headerActionMenu: true,
          headerActionMenuItems,
          clipboardPasteOptions: { maxCells: 16, maxCellsMode: "truncate" },
          onClipboardPaste: updatePasteSummary,
          rowVirtualization: { enabled: true, estimateRowHeight: 40, overscan: 6 },
          columnVirtualization: { enabled: true, overscan: 2 },
          style: { ...productGridThemeStyles[productTheme.value], height: "360px" },
        }),
      ]);
  },
});

createApp(App).mount("#app");
