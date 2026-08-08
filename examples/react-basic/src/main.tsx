import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import "./styles.css";
import { createGrid, type ColumnMovePosition, type ColumnPinningPosition, type Grid, type Row } from "@open-grid/core";
import { useGridSelector } from "@open-grid/react";
import { createOpenGridThemeStyle } from "@open-grid/theme/tokens";
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
  type GridState,
  type GridDensity,
  type HeaderContext,
  type HeaderActionMenuItems,
} from "@open-grid/react-ui";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  GitBranch,
  Moon,
  PanelLeft,
  PanelRight,
  PinOff,
  RefreshCw,
  Redo2,
  RotateCcw,
  Rows3,
  Settings2,
  Sun,
  TableProperties,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";

interface Invoice extends Record<string, string | number> {
  id: string;
  customer: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  owner: string;
  region: string;
  channel: string;
  amount: number;
  issuedAt: string;
  dueAt: string;
  risk: "Low" | "Medium" | "High";
}

interface InvoiceTreeRow extends Record<string, string | number | boolean | InvoiceTreeRow[] | undefined> {
  id: string;
  customer: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  owner: string;
  region: string;
  channel: string;
  amount: number;
  issuedAt: string;
  dueAt: string;
  risk: "Low" | "Medium" | "High";
  children?: InvoiceTreeRow[];
  hasLazyChildren?: boolean;
}

interface PasteSummary {
  attemptedCells: number;
  committedCells: number;
  skippedCells: number;
  validationErrors: number;
  blocked: boolean;
  truncated: boolean;
}

interface ColumnManagementItem {
  id: string;
  label: string;
  locked?: boolean;
}

interface ServerEditStatus {
  phase: "idle" | "pending" | "committed";
  message: string;
}

const statuses: Invoice["status"][] = ["Paid", "Sent", "Draft", "Overdue"];
const owners = ["Mina", "Joon", "Ara", "Theo", "Sora"];
const customers = ["Acme Labs", "Northwind", "Blue River", "Orbit Systems", "Summit Bank", "Core Studio"];
const regions = ["Seoul", "Tokyo", "Singapore", "Sydney", "San Francisco"];
const channels = ["Enterprise", "Self-serve", "Partner", "Marketplace"];
const risks: Invoice["risk"][] = ["Low", "Medium", "High"];
const column = createColumnHelper<InvoiceTreeRow>();

const initialData: InvoiceTreeRow[] = Array.from({ length: 1000 }, (_, index) => ({
  id: `INV-${String(index + 1).padStart(4, "0")}`,
  customer: customers[index % customers.length] ?? "Acme Labs",
  status: statuses[index % statuses.length] ?? "Draft",
  owner: owners[index % owners.length] ?? "Mina",
  region: regions[index % regions.length] ?? "Seoul",
  channel: channels[index % channels.length] ?? "Enterprise",
  amount: 1200 + index * 137,
  issuedAt: `2026-06-${String((index % 28) + 1).padStart(2, "0")}`,
  dueAt: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
  risk: risks[index % risks.length] ?? "Low",
  ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, index * (metricIndex + 3)])),
}));

function getInvoiceRowClassName(row: Row<InvoiceTreeRow>): string | undefined {
  return !row.getIsGrouped() && !row.getIsGroupFooter() && row.original?.risk === "High" ? "product-row--attention" : undefined;
}

function getInvoiceHeaderClassName(context: HeaderContext<InvoiceTreeRow, unknown>): string | undefined {
  return context.column.id === "risk" ? "product-header--risk" : undefined;
}

function getInvoiceCellClassName(context: CellContext<InvoiceTreeRow, unknown>): string | undefined {
  if (typeof context.value !== "string") return undefined;
  if (context.column.id === "status" && statuses.some((status) => status === context.value)) {
    return `product-cell--marker product-cell--status product-cell--status-${context.value.toLowerCase()}`;
  }
  if (context.column.id === "risk" && risks.some((risk) => risk === context.value)) {
    return `product-cell--marker product-cell--risk product-cell--risk-${context.value.toLowerCase()}`;
  }
  return undefined;
}

const lazyTreeRoot: InvoiceTreeRow = {
  id: "TREE-LAZY",
  customer: "Lazy loaded portfolio",
  status: "Draft",
  owner: "Mina",
  region: "Seoul",
  channel: "Enterprise",
  amount: 0,
  issuedAt: "2026-06-01",
  dueAt: "2026-07-01",
  risk: "Medium",
  hasLazyChildren: true,
  ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, metricIndex])),
};

const treeData = [lazyTreeRoot, ...Array.from({ length: 180 }, (_, rootIndex): InvoiceTreeRow => {
  const children = Array.from({ length: 6 }, (_, childIndex): InvoiceTreeRow => {
    const absoluteIndex = rootIndex * 6 + childIndex;
    return {
      id: `TREE-${String(rootIndex + 1).padStart(3, "0")}-LINE-${childIndex + 1}`,
      customer: `Portfolio ${String(rootIndex + 1).padStart(3, "0")} / invoice ${childIndex + 1}`,
      status: statuses[absoluteIndex % statuses.length] ?? "Draft",
      owner: owners[absoluteIndex % owners.length] ?? "Mina",
      region: regions[absoluteIndex % regions.length] ?? "Seoul",
      channel: channels[absoluteIndex % channels.length] ?? "Enterprise",
      amount: 900 + absoluteIndex * 41,
      issuedAt: `2026-06-${String((absoluteIndex % 28) + 1).padStart(2, "0")}`,
      dueAt: `2026-07-${String((absoluteIndex % 28) + 1).padStart(2, "0")}`,
      risk: risks[absoluteIndex % risks.length] ?? "Low",
      ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, absoluteIndex * (metricIndex + 2)])),
    };
  });
  const amount = children.reduce((total, row) => total + row.amount, 0);

  return {
    id: `TREE-${String(rootIndex + 1).padStart(3, "0")}`,
    customer: `Portfolio ${String(rootIndex + 1).padStart(3, "0")}`,
    status: statuses[rootIndex % statuses.length] ?? "Draft",
    owner: owners[rootIndex % owners.length] ?? "Mina",
    region: regions[rootIndex % regions.length] ?? "Seoul",
    channel: channels[rootIndex % channels.length] ?? "Enterprise",
    amount,
    issuedAt: `2026-06-${String((rootIndex % 28) + 1).padStart(2, "0")}`,
    dueAt: `2026-07-${String((rootIndex % 28) + 1).padStart(2, "0")}`,
    risk: risks[rootIndex % risks.length] ?? "Low",
    children,
    ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, amount + metricIndex])),
  };
})];

function createLazyTreeChildren(): InvoiceTreeRow[] {
  return Array.from({ length: 4 }, (_, childIndex): InvoiceTreeRow => ({
    id: `TREE-LAZY-LINE-${childIndex + 1}`,
    customer: `Lazy loaded portfolio / invoice ${childIndex + 1}`,
    status: statuses[childIndex % statuses.length] ?? "Draft",
    owner: owners[childIndex % owners.length] ?? "Mina",
    region: regions[childIndex % regions.length] ?? "Seoul",
    channel: channels[childIndex % channels.length] ?? "Enterprise",
    amount: 1400 + childIndex * 320,
    issuedAt: `2026-06-${String(childIndex + 1).padStart(2, "0")}`,
    dueAt: `2026-07-${String(childIndex + 1).padStart(2, "0")}`,
    risk: risks[childIndex % risks.length] ?? "Low",
    ...Object.fromEntries(Array.from({ length: 24 }, (_, metricIndex) => [`metric${metricIndex + 1}`, (childIndex + 1) * (metricIndex + 5)])),
  }));
}

function countTreeRows(rows: InvoiceTreeRow[]): number {
  return rows.reduce((total, row) => total + 1 + countTreeRows(row.children ?? []), 0);
}

const metricColumns: AnyColumnDef<InvoiceTreeRow>[] = Array.from({ length: 24 }, (_, index) => column.accessor(`metric${index + 1}`, {
  header: `Metric ${index + 1}`,
  size: 132,
}));
const metricColumnIds = metricColumns.map((column) => column.accessorKey ?? "");
const defaultColumnOrder = [
  "id",
  "customer",
  "status",
  "owner",
  "region",
  "channel",
  "issuedAt",
  "dueAt",
  "risk",
  ...metricColumnIds,
  "amount",
];
const defaultColumnPinning = { left: ["id"], right: ["amount"] };
const gridPreferencesKey = "open-grid:reference-preferences:v1";
const gridPreferencesOptions = { validColumnIds: defaultColumnOrder } as const;
const gridPreferencesStorage = getBrowserGridPreferencesStorage();
const initialGridPreferences = readGridPreferences(gridPreferencesStorage, gridPreferencesKey, gridPreferencesOptions);
const productThemeKey = "open-grid:reference-theme:v1";

type ProductTheme = "light" | "dark";

const productGridThemeStyles: Record<ProductTheme, CSSProperties> = {
  light: createOpenGridThemeStyle({
    accent: "#155eef",
    accentHover: "#004eeb",
    accentSoft: "#eff4ff",
    focus: "#0e9384",
    radiusLarge: "8px",
  }) as CSSProperties,
  dark: createOpenGridThemeStyle({
    accent: "#84adff",
    accentHover: "#b2ccff",
    accentSoft: "#102a56",
    focus: "#5fe9d0",
    radiusLarge: "8px",
  }) as CSSProperties,
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
  { id: "id", label: "Invoice", locked: true },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
  { id: "region", label: "Region" },
  { id: "channel", label: "Channel" },
  { id: "issuedAt", label: "Issued" },
  { id: "dueAt", label: "Due" },
  { id: "risk", label: "Risk" },
  { id: "amount", label: "Amount", locked: true },
];

const columns: AnyColumnDef<InvoiceTreeRow>[] = [
  column.accessor("id", { header: "Invoice", size: 132 }),
  column.accessor("customer", {
    header: "Customer",
    size: 190,
    enableEditing: true,
    validateEditValue: (value) => (String(value).trim().length >= 3 ? true : "Customer must be at least 3 characters"),
  }),
  column.accessor("status", {
    header: "Status",
    size: 120,
    minSize: 96,
    maxSize: 220,
    enableEditing: true,
    editOptions: statuses.map((status) => ({ value: status, label: status })),
  }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("region", { header: "Region", size: 150 }),
  column.accessor("channel", { header: "Channel", size: 170 }),
  column.group({
    id: "timeline",
    header: "Timeline",
    columns: [
      column.accessor("issuedAt", { header: "Issued", size: 140 }),
      column.accessor("dueAt", { header: "Due", size: 140 }),
    ],
  }),
  column.accessor("risk", { header: "Risk", size: 120 }),
  ...metricColumns,
  column.accessor("amount", {
    header: "Amount",
    size: 136,
    aggregationFn: "sum",
    enableEditing: true,
    editValueParser: (value) => Number(value),
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
];

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

function commitInvoiceEditToServer(rowId: string, columnId: string, value: string | number): Promise<void> {
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

function isDirectEnterEditCommit(event: CellEditEvent<InvoiceTreeRow>): boolean {
  const sourceEvent = event.sourceEvent;

  if (typeof KeyboardEvent !== "undefined" && sourceEvent instanceof KeyboardEvent) {
    return sourceEvent.key === "Enter";
  }

  return getKeyboardEventLike(sourceEvent)?.key === "Enter";
}

function isKeyboardPasteCommit(event: CellEditEvent<InvoiceTreeRow>): boolean {
  const keyboardEvent = getKeyboardEventLike(event.sourceEvent);

  return typeof keyboardEvent?.key === "string" && keyboardEvent.key.toLowerCase() === "v" && (keyboardEvent.metaKey === true || keyboardEvent.ctrlKey === true);
}

function EditHistoryControls({ grid }: { grid: Grid<InvoiceTreeRow> }) {
  const editHistoryState = useGridSelector(grid, (currentGrid) => currentGrid.getCellEditHistoryState());

  return (
    <>
      <button className="icon-button" type="button" title={`Undo edit (${editHistoryState.undoDepth})`} aria-label="Undo edit" disabled={!editHistoryState.undoDepth} onClick={(event) => grid.undoCellEdit(event.nativeEvent)}>
        <Undo2 size={16} aria-hidden="true" />
      </button>
      <button className="icon-button" type="button" title={`Redo edit (${editHistoryState.redoDepth})`} aria-label="Redo edit" disabled={!editHistoryState.redoDepth} onClick={(event) => grid.redoCellEdit(event.nativeEvent)}>
        <Redo2 size={16} aria-hidden="true" />
      </button>
    </>
  );
}

function App() {
  const [productTheme, setProductTheme] = useState<ProductTheme>(readProductTheme);
  const [rows, setRows] = useState(initialData);
  const [gridError, setGridError] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [treeRows, setTreeRows] = useState(treeData);
  const [treeMode, setTreeMode] = useState(false);
  const [columnManagementOpen, setColumnManagementOpen] = useState(false);
  const [pasteSummary, setPasteSummary] = useState<PasteSummary | null>(null);
  const [designMenuAction, setDesignMenuAction] = useState("Design menu: none");
  const [serverEditStatus, setServerEditStatus] = useState<ServerEditStatus>({ phase: "idle", message: "Server edit: idle" });
  const [gridApi, setGridApi] = useState<Grid<InvoiceTreeRow> | null>(null);
  const [gridState, setGridState] = useState<Partial<GridState>>({
    columnPinning: defaultColumnPinning,
    columnOrder: defaultColumnOrder,
    ...initialGridPreferences?.state,
    pagination: { pageIndex: 0, pageSize: rows.length },
  });
  const [density, setDensity] = useState<GridDensity>(initialGridPreferences?.density ?? "standard");
  const groupedByStatus = (gridState.grouping ?? []).includes("status");
  const nextProductTheme = productTheme === "light" ? "dark" : "light";
  const displayRows = treeMode ? treeRows : rows;
  const orderedColumnManagementItems = orderColumnManagementItems(columnManagementItems, gridState.columnOrder ?? defaultColumnOrder);
  const visibleManagedColumnCount = orderedColumnManagementItems.filter((item) => isColumnVisible(gridState, item.id)).length;
  const connectGridApi = (grid: Grid<InvoiceTreeRow>) => {
    setGridApi(grid);
  };
  const headerActionMenuItems: HeaderActionMenuItems<InvoiceTreeRow> = ({ defaultItems, grid, column }) => [
    ...defaultItems,
    { id: "design-menu-label", type: "label", label: "Design tokens" },
    {
      id: "design-token-preview",
      type: "custom",
      label: "Design token preview",
      render: () => (
        <span className="menu-token-preview" data-testid="react-menu-custom-slot">
          Width token: {column.id}
        </span>
      ),
    },
    {
      id: "design-width-token",
      label: "Apply design width token",
      onSelect: () => {
        grid.setColumnSize(column.id, 180);
        setDesignMenuAction(`Design menu: ${column.id} width token 180`);
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

  const updateManagedGridState = (updater: (previous: Partial<GridState>) => Partial<GridState>) => {
    setGridState((previous) => {
      const nextState = updater(previous);
      writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, nextState, density, gridPreferencesOptions);
      return nextState;
    });
  };

  const toggleManagedColumn = (columnId: string, visible: boolean) => {
    updateManagedGridState((previous) => {
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
  };

  const pinManagedColumn = (columnId: string, position: ColumnPinningPosition) => {
    updateManagedGridState((previous) => {
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
  };

  const moveManagedColumn = (columnId: string, targetColumnId: string, position: ColumnMovePosition) => {
    updateManagedGridState((previous) => {
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
  };

  const resetManagedColumns = () => {
    updateManagedGridState((previous) => ({
      ...previous,
      columnVisibility: {},
      columnSizing: {},
      columnOrder: defaultColumnOrder,
      columnPinning: defaultColumnPinning,
      focusedCell: null,
      cellSelectionRange: null,
    }));
  };

  const resetGridPreferences = () => {
    removeGridPreferences(gridPreferencesStorage, gridPreferencesKey);
    setDensity("standard");
    setGridState((previous) => ({
      ...previous,
      columnVisibility: {},
      columnSizing: {},
      columnOrder: defaultColumnOrder,
      columnPinning: defaultColumnPinning,
      focusedCell: null,
      cellSelectionRange: null,
    }));
  };

  const downloadCsvExport = () => {
    const grid = createGrid<InvoiceTreeRow>({
      data: displayRows,
      columns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      getRowCanExpand: (row) => row.hasLazyChildren === true,
      rowSelectionMode: "descendants",
      groupFooterMode: "expanded",
      state: gridState,
    });

    downloadExportFile(
      grid.getExportFile({
        filename: treeMode ? "open-grid-tree-invoices" : "open-grid-invoices",
        format: "csv",
        includeHeaders: true,
        rowScope: "pre-pagination",
      }),
    );
  };

  const updatePasteSummary = (result: ClipboardPasteResult<InvoiceTreeRow>) => {
    setPasteSummary({
      attemptedCells: result.attemptedCells,
      committedCells: result.committedCells.length,
      skippedCells: result.skippedCells.length,
      validationErrors: result.validationErrors.length,
      blocked: result.blocked,
      truncated: result.truncated,
    });
  };

  const updateGridState = (nextState: GridState) => {
    setGridState(nextState);
    writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, nextState, density, gridPreferencesOptions);

    if (treeMode && nextState.expanded["TREE-LAZY"]) {
      setTreeRows((previousRows) =>
        previousRows.map((row) =>
          row.id === "TREE-LAZY" && !row.children
            ? {
                ...row,
                amount: 5_920,
                children: createLazyTreeChildren(),
              }
            : row,
        ),
      );
    }
  };

  const updateDensity = (nextDensity: GridDensity) => {
    setDensity(nextDensity);
    writeGridPreferences(gridPreferencesStorage, gridPreferencesKey, gridState, nextDensity, gridPreferencesOptions);
  };

  const commitServerOwnedCellEdit = (event: CellEditEvent<InvoiceTreeRow>) => {
    if (event.phase !== "commit" || event.defaultPrevented) {
      return;
    }

    const value = typeof event.value === "number" ? event.value : String(event.value ?? "");

    if (event.column.id === "customer" && isKeyboardPasteCommit(event)) {
      event.preventDefault();
      setServerEditStatus({ phase: "pending", message: `Server paste: saving ${event.row.id} ${event.column.id}` });

      void commitInvoiceEditToServer(event.row.id, event.column.id, value).then(() => {
        setRows((previousRows) => previousRows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row)));
        setGridState((previous) => ({
          ...previous,
          focusedCell: { rowId: event.row.id, columnId: event.column.id },
          editingCell: null,
          cellSelectionRange: null,
        }));
        setServerEditStatus({ phase: "committed", message: `Server paste: saved ${event.row.id} ${event.column.id} = ${value}` });
      });
      return;
    }

    if (event.column.id !== "customer" || !isDirectEnterEditCommit(event)) {
      setRows((previousRows) => previousRows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row)));
      return;
    }

    event.preventDefault();
    setServerEditStatus({ phase: "pending", message: `Server edit: saving ${event.row.id} ${event.column.id}` });

    void commitInvoiceEditToServer(event.row.id, event.column.id, value).then(() => {
      setRows((previousRows) => previousRows.map((row) => (row.id === event.row.id ? { ...row, [event.column.id]: value } : row)));
      setGridState((previous) => ({
        ...previous,
        focusedCell: { rowId: event.row.id, columnId: event.column.id },
        editingCell: null,
      }));
      setServerEditStatus({ phase: "committed", message: `Server edit: saved ${event.row.id} ${event.column.id} = ${value}` });
    });
  };

  return (
    <main className="app-shell" data-og-theme={productTheme}>
      <section className="toolbar" aria-label="Invoice grid summary">
        <div className="toolbar__identity">
          <span className="product-mark" aria-hidden="true"><TableProperties size={19} /></span>
          <div>
            <span className="toolbar__eyebrow">Revenue operations</span>
            <h1>Invoices</h1>
            <p>{rows.length} rows · Updated just now</p>
          </div>
        </div>
        <div className="metrics" aria-label="Summary metrics">
          <span className="metric-pill"><span>Open</span><strong>$214k</strong></span>
          <span className="metric-pill metric-pill--danger"><span>Overdue</span><strong>24</strong></span>
          {gridApi ? <EditHistoryControls grid={gridApi} /> : null}
          <button
            className="action-button"
            type="button"
            onClick={() => {
              const nextTreeMode = !treeMode;
              setTreeMode(nextTreeMode);
              setGridState((previous) => ({
                ...previous,
                grouping: [],
                expanded: {},
                focusedCell: null,
                cellSelectionRange: null,
                rowSelection: {},
                pagination: { pageIndex: 0, pageSize: nextTreeMode ? countTreeRows(treeRows) + 20 : rows.length },
              }));
            }}
          >
            <Rows3 size={15} aria-hidden="true" />
            {treeMode ? "Use invoices" : "Use tree data"}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() =>
              setGridState((previous) => ({
                ...previous,
                grouping: groupedByStatus ? [] : ["status"],
                expanded: {},
                focusedCell: null,
                cellSelectionRange: null,
                pagination: { pageIndex: 0, pageSize: rows.length },
              }))
            }
          >
            <GitBranch size={15} aria-hidden="true" />
            {groupedByStatus ? "Ungroup status" : "Group status"}
          </button>
          <button className="action-button action-button--primary" type="button" onClick={downloadCsvExport}>
            <Download size={15} aria-hidden="true" />
            Export CSV
          </button>
          <button
            className="action-button"
            type="button"
            aria-label="Manage columns"
            aria-controls="column-management-panel"
            aria-expanded={columnManagementOpen}
            onClick={() => setColumnManagementOpen((previous) => !previous)}
          >
            <Settings2 size={15} aria-hidden="true" />
            Core columns {visibleManagedColumnCount}/{orderedColumnManagementItems.length}
          </button>
          <button className="icon-button" type="button" title={gridLoading ? "Finish refresh" : "Refresh data"} aria-label={gridLoading ? "Finish refresh" : "Refresh data"} onClick={() => setGridLoading((previous) => !previous)}>
            <RefreshCw className={gridLoading ? "is-spinning" : undefined} size={16} aria-hidden="true" />
            <span className="sr-only">
            {gridLoading ? "Finish refresh" : "Refresh data"}
            </span>
          </button>
          <button className="icon-button icon-button--danger" type="button" title="Simulate error" aria-label="Simulate error" onClick={() => setGridError(true)} disabled={gridError}>
            <TriangleAlert size={16} aria-hidden="true" />
            <span className="sr-only">Simulate error</span>
          </button>
          <button
            className="icon-button"
            type="button"
            title={`Use ${nextProductTheme} theme`}
            aria-label={`Use ${nextProductTheme} theme`}
            onClick={() => {
              writeProductTheme(nextProductTheme);
              setProductTheme(nextProductTheme);
            }}
          >
            {productTheme === "light" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            <span className="sr-only">Use {nextProductTheme} theme</span>
          </button>
        </div>
      </section>

      <section id="column-management-panel" className="column-management" aria-label="Column management" hidden={!columnManagementOpen}>
        <div className="column-management__header">
          <div>
            <span className="section-heading"><Settings2 size={16} aria-hidden="true" /><h2>Column management</h2></span>
            <p>Choose which fields stay visible and where they appear.</p>
          </div>
          <div className="column-management__summary">
            <span data-testid="managed-column-count">
              Visible {visibleManagedColumnCount} / {orderedColumnManagementItems.length}
            </span>
            <button className="action-button" type="button" onClick={resetManagedColumns}>
              <RotateCcw size={14} aria-hidden="true" />
              Reset columns
            </button>
            <button className="action-button" type="button" onClick={resetGridPreferences}>
              <Settings2 size={14} aria-hidden="true" />
              Reset preferences
            </button>
          </div>
        </div>
        <div className="column-management__list">
          {orderedColumnManagementItems.map((item, index) => {
            const visible = isColumnVisible(gridState, item.id);
            const pinning = getColumnPinning(gridState, item.id);
            const previousItem = orderedColumnManagementItems[index - 1];
            const nextItem = orderedColumnManagementItems[index + 1];

            return (
              <div className="column-management__item" data-column-id={item.id} key={item.id}>
                <label
                  onClick={(event) => {
                    event.preventDefault();

                    if (!item.locked) {
                      toggleManagedColumn(item.id, !visible);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={item.locked}
                    readOnly
                  />
                  {item.label}
                </label>
                <div className="column-management__actions" aria-label={`${item.label} column actions`}>
                  <button
                    type="button"
                    aria-label={`Move ${item.label} left`}
                    title={`Move ${item.label} left`}
                    disabled={!previousItem}
                    onClick={() => previousItem && moveManagedColumn(item.id, previousItem.id, "before")}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item.label} right`}
                    title={`Move ${item.label} right`}
                    disabled={!nextItem}
                    onClick={() => nextItem && moveManagedColumn(item.id, nextItem.id, "after")}
                  >
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Pin ${item.label} left`} title={`Pin ${item.label} left`} disabled={pinning === "left"} onClick={() => pinManagedColumn(item.id, "left")}>
                    <PanelLeft size={14} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Unpin ${item.label}`} title={`Unpin ${item.label}`} disabled={!pinning} onClick={() => pinManagedColumn(item.id, false)}>
                    <PinOff size={14} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Pin ${item.label} right`} title={`Pin ${item.label} right`} disabled={pinning === "right"} onClick={() => pinManagedColumn(item.id, "right")}>
                    <PanelRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pasteSummary ? (
        <section className="paste-summary" aria-label="Paste summary">
          <span>Attempted {pasteSummary.attemptedCells}</span>
          <span>Committed {pasteSummary.committedCells}</span>
          <span>Skipped {pasteSummary.skippedCells}</span>
          <span>Validation {pasteSummary.validationErrors}</span>
          {pasteSummary.blocked ? <span>Blocked</span> : null}
          {pasteSummary.truncated ? <span>Truncated</span> : null}
        </section>
      ) : null}
      <section className="activity-status" aria-label="Header menu composition status" aria-live="polite" data-active={designMenuAction !== "Design menu: none"}>
        <span data-testid="design-menu-action">{designMenuAction}</span>
      </section>
      <section className="activity-status" aria-label="Server edit status" aria-live="polite" data-active={serverEditStatus.phase !== "idle"}>
        <span data-testid="react-server-edit-status">{serverEditStatus.message}</span>
      </section>

      <DataGrid
        ariaLabel="Invoices"
        className="invoice-grid"
        style={productGridThemeStyles[productTheme]}
        data={displayRows}
        error={gridError}
        errorState="Invoice service is unavailable."
        onRetry={() => setGridError(false)}
        loading={gridLoading}
        loadingState="Refreshing invoices..."
        onGridReady={connectGridApi}
        getRowClassName={getInvoiceRowClassName}
        getHeaderClassName={getInvoiceHeaderClassName}
        getCellClassName={getInvoiceCellClassName}
        columns={columns}
        getRowId={(row) => row.id}
        getSubRows={(row) => row.children}
        getRowCanExpand={(row) => row.hasLazyChildren === true}
        rowSelectionMode="descendants"
        groupFooterMode="expanded"
        editHistoryLimit={20}
        state={gridState}
        onStateChange={updateGridState}
        groupingPanel
        quickFilterControl
        rowSelectionControls
        columnVisibilityControls
        densityControl
        density={density}
        onDensityChange={updateDensity}
        columnFilterControls
        paginationControls
        pageSizeOptions={[25, 50, 100, 1000]}
        headerActionMenu
        headerActionMenuItems={headerActionMenuItems}
        onCellEdit={commitServerOwnedCellEdit}
        clipboardPasteOptions={{ maxCells: 16, maxCellsMode: "truncate" }}
        onClipboardPaste={updatePasteSummary}
        rowVirtualization={{ enabled: true, estimateRowHeight: 40, overscan: 6 }}
        columnVirtualization={{ enabled: true, overscan: 2 }}
      />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
