import type { CellContext, CellFillOptions, ClipboardPasteOptions, ClipboardPasteResult, Column, Grid, GridOptions, HeaderContext, Row } from "@open-grid/core";
import type { ColumnVirtualizationPrimitiveOptions, GridDensity, GridLocalizationOverrides, RowVirtualizationPrimitiveOptions } from "@open-grid/primitives";
import type { SvelteComponentTyped } from "svelte";

export interface DataGridProps<TData = unknown> {
  ariaLabel?: string;
  localization?: GridLocalizationOverrides;
  options: GridOptions<TData>;
  emptyState?: unknown;
  error?: boolean;
  errorState?: unknown;
  onRetry?: () => void;
  loading?: boolean;
  loadingState?: unknown;
  renderToolbar?: (context: DataGridRenderContext<TData>) => SvelteDataGridRenderValue<DataGridRenderContext<TData>>;
  renderEmptyState?: (context: DataGridRenderContext<TData>) => SvelteDataGridRenderValue<DataGridRenderContext<TData>>;
  renderLoadingState?: (context: DataGridRenderContext<TData>) => SvelteDataGridRenderValue<DataGridRenderContext<TData>>;
  renderErrorState?: (context: DataGridErrorRenderContext<TData>) => SvelteDataGridRenderValue<DataGridErrorRenderContext<TData>>;
  renderHeader?: (context: HeaderContext<TData, unknown>) => SvelteDataGridRenderValue<HeaderContext<TData, unknown>>;
  renderCell?: (context: CellContext<TData, unknown>) => SvelteDataGridRenderValue<CellContext<TData, unknown>>;
  onGridReady?: GridReadyHandler<TData>;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getHeaderClassName?: (context: HeaderContext<TData, unknown>) => string | undefined;
  getCellClassName?: (context: CellContext<TData, unknown>) => string | undefined;
  groupingPanel?: boolean;
  quickFilterControl?: boolean;
  rowSelectionControls?: boolean;
  columnVisibilityControls?: boolean;
  density?: GridDensity;
  defaultDensity?: GridDensity;
  densityControl?: boolean;
  onDensityChange?: (density: GridDensity) => void;
  columnFilterControls?: boolean;
  paginationControls?: boolean;
  pageSizeOptions?: readonly number[];
  columnPinningControls?: boolean;
  headerActionMenu?: boolean;
  headerActionMenuItems?: HeaderActionMenuItems<TData>;
  rowVirtualization?: boolean | RowVirtualizationOptions;
  columnVirtualization?: boolean | ColumnVirtualizationOptions;
  cellFillOptions?: Omit<CellFillOptions, "sourceEvent">;
  clipboardPasteOptions?: Omit<ClipboardPasteOptions, "sourceEvent">;
  onClipboardPaste?: (result: ClipboardPasteResult<TData>) => void;
  class?: string;
  style?: string;
}

export interface DataGridRenderContext<TData = unknown> {
  grid: Grid<TData>;
  rows: readonly Row<TData>[];
  visibleColumns: readonly Column<TData, unknown>[];
}

export interface DataGridErrorRenderContext<TData = unknown> extends DataGridRenderContext<TData> {
  retry: (() => void) | undefined;
}

export interface SvelteDataGridRenderer<TContext = unknown> {
  type: "open-grid:svelte-renderer";
  component: unknown;
  context: TContext;
  props?: Record<string, unknown>;
}

export type SvelteDataGridRenderValue<TContext = unknown> = string | number | boolean | null | undefined | SvelteDataGridRenderer<TContext>;

export type GridReadyHandler<TData = unknown> = (grid: Grid<TData>) => void | (() => void);

export type RowVirtualizationOptions = RowVirtualizationPrimitiveOptions;

export type ColumnVirtualizationOptions = ColumnVirtualizationPrimitiveOptions;

export interface HeaderActionMenuActionItem<TData = unknown> {
  type?: "action";
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: (context: HeaderActionMenuContext<TData>) => void;
}

export interface HeaderActionMenuLabelItem {
  type: "label";
  id: string;
  label: string;
}

export interface HeaderActionMenuSeparatorItem {
  type: "separator";
  id: string;
  label?: string;
}

export interface HeaderActionMenuCustomItem<TData = unknown> {
  type: "custom";
  id: string;
  label?: string;
  component: unknown;
  props?: Record<string, unknown>;
}

export type HeaderActionMenuItem<TData = unknown> =
  | HeaderActionMenuActionItem<TData>
  | HeaderActionMenuLabelItem
  | HeaderActionMenuSeparatorItem
  | HeaderActionMenuCustomItem<TData>;

export interface HeaderActionMenuContext<TData = unknown> {
  grid: Grid<TData>;
  column: Column<TData, unknown>;
  sortDirection: "asc" | "desc" | false;
  pinningPosition: "left" | "right" | false;
  isGrouped: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  defaultItems: Array<HeaderActionMenuActionItem<TData>>;
}

export type HeaderActionMenuItems<TData = unknown> = (context: HeaderActionMenuContext<TData>) => Array<HeaderActionMenuItem<TData> | null | false | undefined>;

declare class DataGrid<TData = unknown> extends SvelteComponentTyped<DataGridProps<TData>> {}
export default DataGrid;
