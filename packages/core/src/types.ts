export type ColumnId = string;
export type RowId = string;

export type Updater<T> = T | ((previous: T) => T);

export type SortDirection = "asc" | "desc";

export interface SortingRule {
  id: ColumnId;
  desc?: boolean;
}

export type SortingState = SortingRule[];

export interface ColumnFilter {
  id: ColumnId;
  value: unknown;
}

export type ColumnFiltersState = ColumnFilter[];
export type GroupingState = ColumnId[];
export type GroupFooterMode = false | "expanded";

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export type RowSelectionState = Record<RowId, boolean>;
export type RowSelectionCleanupScope = "loaded" | "filtered" | "page";
export type RowSelectionMode = "self" | "descendants";
export type ExpandedState = Record<RowId, boolean>;
export type ColumnVisibilityState = Record<ColumnId, boolean>;
export type ColumnSizingState = Record<ColumnId, number>;

export interface FitColumnsToWidthOptions {
  columnIds?: readonly ColumnId[];
}
export type ColumnOrderState = ColumnId[];
export type ColumnMovePosition = "before" | "after";

export interface ColumnPinningState {
  left: ColumnId[];
  right: ColumnId[];
}

export type ColumnPinningPosition = "left" | "right" | false;

export interface CellCoordinate {
  rowId: RowId;
  columnId: ColumnId;
}

export type CellEditingState = CellCoordinate | null;

export interface CellRange {
  start: CellCoordinate;
  end: CellCoordinate;
}

export type CellRangeSelectionState = CellRange | null;

export interface MoveFocusOptions {
  extendSelection?: boolean;
}

export type FocusDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "grid-start"
  | "grid-end"
  | "page-up"
  | "page-down";

export interface ColumnLayout {
  id: ColumnId;
  size: number;
  start: number;
  end: number;
  pinned: "left" | "right" | false;
  pinnedStart?: number;
  pinnedEdge?: "left" | "right";
}

export interface GridState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  grouping: GroupingState;
  expanded: ExpandedState;
  pagination: PaginationState;
  rowSelection: RowSelectionState;
  allRowsSelected: boolean;
  columnVisibility: ColumnVisibilityState;
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  focusedCell: CellCoordinate | null;
  editingCell: CellEditingState;
  cellSelectionRange: CellRangeSelectionState;
}

export type GridCacheKey =
  | "allColumns"
  | "allLeafColumns"
  | "visibleLeafColumns"
  | "headerGroups"
  | "columnLayout"
  | "coreRowModel"
  | "filteredRowModel"
  | "sortedRowModel"
  | "groupedRowModel"
  | "expandedRowModel"
  | "paginatedRowModel"
  | "selectedRowModel"
  | "filteredSelectedRowModel"
  | "pageSelectedRowModel";

export interface GridCacheDiagnosticsEntry {
  key: GridCacheKey;
  hits: number;
  misses: number;
  computes: number;
  initialized: boolean;
  lastDependencyCount: number;
}

export interface GridCacheDiagnostics {
  entries: Record<GridCacheKey, GridCacheDiagnosticsEntry>;
  totalHits: number;
  totalMisses: number;
  totalComputes: number;
}

export interface Row<TData> {
  id: RowId;
  index: number;
  original: TData | undefined;
  depth: number;
  parentId: RowId | null;
  subRows: Row<TData>[];
  leafRows: Row<TData>[];
  footerRow?: Row<TData>;
  groupingColumnId?: ColumnId;
  groupingValue?: unknown;
  groupFooterFor?: RowId;
  groupFooterLabel?: string;
  getValue: <TValue = unknown>(columnId: ColumnId) => TValue | undefined;
  getIsGrouped: () => boolean;
  getIsGroupFooter: () => boolean;
  getCanExpand: () => boolean;
}

export interface RowModel<TData> {
  rows: Row<TData>[];
  flatRows: Row<TData>[];
  rowsById: Record<RowId, Row<TData>>;
}

export interface HeaderContext<TData, TValue> {
  grid: Grid<TData>;
  column: Column<TData, TValue>;
  header?: Header<TData> | undefined;
}

export interface CellContext<TData, TValue> {
  grid: Grid<TData>;
  row: Row<TData>;
  column: Column<TData, TValue>;
  value: TValue | undefined;
}

export interface ClipboardCellContext<TData, TValue> {
  grid: Grid<TData>;
  row: Row<TData>;
  rowIndex: number;
  column: Column<TData, TValue>;
  columnIndex: number;
  value: TValue | undefined;
}

export interface ClipboardCopyOptions {
  includeHeaders?: boolean;
}

export interface ExportCellContext<TData, TValue> extends ClipboardCellContext<TData, TValue> {}

export type ExportTextFormat = "csv" | "tsv";

export type ExportRowScope =
  | "page"
  | "pre-pagination"
  | "filtered"
  | "all"
  | "selected"
  | "filtered-selected"
  | "page-selected";

export interface ExportTextOptions {
  includeHeaders?: boolean;
  format?: ExportTextFormat;
  delimiter?: string;
  newline?: "\n" | "\r\n";
  rowScope?: ExportRowScope;
  columnIds?: ColumnId[];
  maxRows?: number;
  maxRowsMode?: "block" | "truncate";
}

export interface ExportFileOptions extends ExportTextOptions {
  filename?: string;
  extension?: string;
  mimeType?: string;
  includeByteOrderMark?: boolean;
}

export interface ExportFile {
  filename: string;
  extension: string;
  mimeType: string;
  text: string;
}

export interface ClipboardPasteOptions {
  target?: CellCoordinate;
  sourceEvent?: unknown;
  maxCells?: number;
  maxCellsMode?: "block" | "truncate";
}

export type ClipboardPasteSkippedReason = "readonly" | "missing-value" | "validation" | "max-cells";

export interface ClipboardPasteCellContext<TData> {
  coordinate: CellCoordinate;
  row: Row<TData>;
  rowIndex: number;
  column: Column<TData, unknown>;
  columnIndex: number;
  rawValue: string;
  value: unknown;
  previousValue: unknown;
}

export interface ClipboardPasteCommittedCell<TData> extends ClipboardPasteCellContext<TData> {
  event: CellEditEvent<TData>;
}

export interface ClipboardPasteSkippedCell<TData> {
  coordinate?: CellCoordinate | undefined;
  row?: Row<TData> | undefined;
  rowIndex?: number | undefined;
  column?: Column<TData, unknown> | undefined;
  columnIndex?: number | undefined;
  rawValue?: string | undefined;
  value?: unknown;
  previousValue?: unknown;
  reason: ClipboardPasteSkippedReason;
  validation?: CellEditValidationState | undefined;
  event?: CellEditEvent<TData> | undefined;
}

export interface ClipboardPasteValidationError<TData> extends ClipboardPasteCellContext<TData> {
  validation: CellEditValidationState;
  event: CellEditEvent<TData>;
}

export interface ClipboardPasteResult<TData> {
  attemptedCells: number;
  committedCells: Array<ClipboardPasteCommittedCell<TData>>;
  skippedCells: Array<ClipboardPasteSkippedCell<TData>>;
  validationErrors: Array<ClipboardPasteValidationError<TData>>;
  events: Array<CellEditEvent<TData>>;
  blocked: boolean;
  truncated: boolean;
}

export interface CellFillOptions {
  sourceEvent?: unknown;
  fillMode?: "copy" | "series";
  maxCells?: number;
  maxCellsMode?: "block" | "truncate";
}

export interface CellEditParserContext<TData, TValue> {
  grid: Grid<TData>;
  row: Row<TData>;
  column: Column<TData, TValue>;
  previousValue: TValue | undefined;
}

export interface CellEditValidationContext<TData, TValue> extends CellEditParserContext<TData, TValue> {
  value: unknown;
}

export type CellEditValidationResult = boolean | string | { valid: boolean; message?: string };

export interface CellEditValidationState {
  valid: boolean;
  message?: string;
}

export interface CellEditOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

export type AccessorKey<TData> = Extract<keyof TData, string>;

export type SortFn<TData, TValue = unknown> = (
  a: Row<TData>,
  b: Row<TData>,
  columnId: ColumnId,
) => number;

export type FilterFn<TData, TValue = unknown> = (
  value: TValue | undefined,
  filterValue: unknown,
  row: Row<TData>,
  column: Column<TData, TValue>,
) => boolean;

export interface GroupingValueContext<TData, TValue> {
  row: TData;
  rowIndex: number;
  column: Column<TData, TValue>;
}

export interface AggregationContext<TData, TValue> {
  column: Column<TData, TValue>;
  columnId: ColumnId;
  leafRows: Row<TData>[];
  childRows: Row<TData>[];
  values: Array<TValue | undefined>;
}

export type BuiltInAggregationFn = "count" | "sum" | "min" | "max" | "mean";

export type AggregationFn<TData, TValue = unknown> =
  | BuiltInAggregationFn
  | ((context: AggregationContext<TData, TValue>) => unknown);

export interface ColumnDef<TData, TValue = unknown> {
  id?: ColumnId;
  accessorKey?: AccessorKey<TData>;
  accessorFn?: (row: TData, index: number) => TValue;
  header?: string | ((context: HeaderContext<TData, TValue>) => unknown);
  cell?: (context: CellContext<TData, TValue>) => unknown;
  clipboardValue?: (context: ClipboardCellContext<TData, TValue>) => unknown;
  exportValue?: (context: ExportCellContext<TData, TValue>) => unknown;
  footer?: string | ((context: HeaderContext<TData, TValue>) => unknown);
  columns?: AnyColumnDef<TData>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableGlobalFiltering?: boolean;
  enableGrouping?: boolean;
  enableEditing?: boolean;
  editOptions?: readonly CellEditOption[];
  editValueParser?: (value: string, context: CellEditParserContext<TData, TValue>) => unknown;
  validateEditValue?: (value: unknown, context: CellEditValidationContext<TData, TValue>) => CellEditValidationResult;
  sortFn?: SortFn<TData, TValue>;
  filterFn?: FilterFn<TData, TValue>;
  groupingValue?: (context: GroupingValueContext<TData, TValue>) => unknown;
  aggregationFn?: AggregationFn<TData, TValue>;
  size?: number;
  minSize?: number;
  maxSize?: number;
  meta?: Record<string, unknown>;
}

export type AnyColumnDef<TData> = ColumnDef<TData, any>;

export interface Column<TData, TValue = unknown> {
  id: ColumnId;
  depth: number;
  parentId: ColumnId | null;
  columnDef: ColumnDef<TData, TValue>;
  columns: Column<TData, unknown>[];
  getValue: (row: TData, rowIndex: number) => TValue | undefined;
  getCanSort: () => boolean;
  getCanFilter: () => boolean;
  getCanGlobalFilter: () => boolean;
  getCanGroup: () => boolean;
  getCanEdit: () => boolean;
  getSize: () => number;
  getIsVisible: () => boolean;
  getIsPinned: () => ColumnPinningPosition;
}

export interface Header<TData> {
  id: string;
  depth: number;
  column: Column<TData, unknown>;
  colSpan: number;
  rowSpan: number;
  isPlaceholder: boolean;
  leafColumnIds: ColumnId[];
}

export interface HeaderGroup<TData> {
  id: string;
  depth: number;
  headers: Header<TData>[];
}

export interface GridInteractionEventBase<TData> {
  type: string;
  grid: Grid<TData>;
  sourceEvent?: unknown;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export interface RowInteractionEvent<TData> extends GridInteractionEventBase<TData> {
  row: Row<TData>;
  rowIndex: number;
}

export interface CellInteractionEvent<TData> extends RowInteractionEvent<TData> {
  column: Column<TData, unknown>;
  columnIndex: number;
  value: unknown;
}

export type CellEditPhase = "start" | "commit" | "cancel";
export type CellEditHistoryAction = "undo" | "redo";

export interface CellEditHistoryState {
  undoDepth: number;
  redoDepth: number;
  limit: number;
}

export type GridSelector<TData, TSelected> = (grid: Grid<TData>) => TSelected;

export type GridSelectorListener<TSelected> = (
  selectedValue: TSelected,
  previousValue: TSelected | undefined,
) => void;

export interface GridSelectorSubscriptionOptions<TSelected> {
  equalityFn?: (previousValue: TSelected, nextValue: TSelected) => boolean;
  fireImmediately?: boolean;
}

export interface CellEditEvent<TData> extends CellInteractionEvent<TData> {
  phase: CellEditPhase;
  previousValue: unknown;
  historyAction?: CellEditHistoryAction | undefined;
  validation?: CellEditValidationState | undefined;
}

export type ColumnResizePhase = "start" | "move" | "end";

export interface ColumnResizeEvent<TData> extends GridInteractionEventBase<TData> {
  phase: ColumnResizePhase;
  column: Column<TData, unknown>;
  columnIndex: number;
  startSize: number;
  size: number;
  delta: number;
}

export interface RowInteractionEventParams<TData> {
  type: string;
  row: Row<TData>;
  rowIndex: number;
  sourceEvent?: unknown;
}

export interface CellInteractionEventParams<TData> extends RowInteractionEventParams<TData> {
  column: Column<TData, unknown>;
  columnIndex: number;
}

export interface CellEditEventParams<TData> extends CellInteractionEventParams<TData> {
  phase: CellEditPhase;
  value: unknown;
  previousValue: unknown;
  historyAction?: CellEditHistoryAction | undefined;
  validation?: CellEditValidationState | undefined;
}

export interface ColumnResizeEventParams<TData> {
  phase: ColumnResizePhase;
  column: Column<TData, unknown>;
  columnIndex: number;
  startSize: number;
  size: number;
  sourceEvent?: unknown;
}

export interface GridOptions<TData> {
  data: readonly TData[];
  columns: readonly AnyColumnDef<TData>[];
  state?: Partial<GridState>;
  initialState?: Partial<GridState>;
  onStateChange?: (state: GridState) => void;
  onRowEvent?: (event: RowInteractionEvent<TData>) => void;
  onCellEvent?: (event: CellInteractionEvent<TData>) => void;
  onCellEdit?: (event: CellEditEvent<TData>) => void;
  onColumnResize?: (event: ColumnResizeEvent<TData>) => void;
  getClipboardCellValue?: (context: ClipboardCellContext<TData, unknown>) => unknown;
  getExportCellValue?: (context: ExportCellContext<TData, unknown>) => unknown;
  globalFilterFn?: FilterFn<TData, unknown>;
  getRowId?: (row: TData, index: number, parentRow?: Row<TData>) => RowId;
  getSubRows?: (row: TData, index: number) => readonly TData[] | undefined;
  getRowCanExpand?: (row: TData, index: number, parentRow?: Row<TData>) => boolean;
  rowSelectionMode?: RowSelectionMode;
  groupFooterMode?: GroupFooterMode;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  manualGrouping?: boolean;
  manualPagination?: boolean;
  pageCount?: number;
  editHistoryLimit?: number;
}

export interface Grid<TData> {
  getOptions: () => GridOptions<TData>;
  setOptions: (updater: Updater<GridOptions<TData>>, options?: { notify?: boolean }) => void;
  getState: () => GridState;
  setState: (updater: Updater<GridState>) => void;
  getAllColumns: () => Column<TData, unknown>[];
  getAllLeafColumns: () => Column<TData, unknown>[];
  getVisibleLeafColumns: () => Column<TData, unknown>[];
  getHeaderGroups: () => HeaderGroup<TData>[];
  getColumnLayout: () => ColumnLayout[];
  getCoreRowModel: () => RowModel<TData>;
  getFilteredRowModel: () => RowModel<TData>;
  getSortedRowModel: () => RowModel<TData>;
  getGroupedRowModel: () => RowModel<TData>;
  getExpandedRowModel: () => RowModel<TData>;
  getPrePaginationRowModel: () => RowModel<TData>;
  getRowModel: () => RowModel<TData>;
  emitRowEvent: (event: RowInteractionEventParams<TData>) => RowInteractionEvent<TData>;
  emitCellEvent: (event: CellInteractionEventParams<TData>) => CellInteractionEvent<TData>;
  emitCellEditEvent: (event: CellEditEventParams<TData>) => CellEditEvent<TData>;
  emitColumnResizeEvent: (event: ColumnResizeEventParams<TData>) => ColumnResizeEvent<TData>;
  getCacheDiagnostics: () => GridCacheDiagnostics;
  resetCacheDiagnostics: () => void;
  getPageCount: () => number;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  firstPage: () => void;
  previousPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  setSorting: (updater: Updater<SortingState>) => void;
  getColumnSortDirection: (columnId: ColumnId) => SortDirection | false;
  toggleColumnSorting: (columnId: ColumnId, desc?: boolean, multi?: boolean) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  setGlobalFilter: (updater: Updater<string>) => void;
  setGrouping: (updater: Updater<GroupingState>) => void;
  toggleColumnGrouping: (columnId: ColumnId, grouped?: boolean) => void;
  moveGroupingColumn: (columnId: ColumnId, targetColumnId: ColumnId, position?: ColumnMovePosition) => void;
  resetGrouping: () => void;
  setExpanded: (updater: Updater<ExpandedState>) => void;
  toggleRowExpanded: (rowId: RowId, expanded?: boolean) => void;
  toggleAllRowsExpanded: (expanded?: boolean) => void;
  getIsRowExpanded: (rowId: RowId) => boolean;
  resetExpanded: () => void;
  setPagination: (updater: Updater<PaginationState>) => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  getIsRowSelected: (rowId: RowId) => boolean;
  getSelectedRowModel: () => RowModel<TData>;
  getFilteredSelectedRowModel: () => RowModel<TData>;
  getPageSelectedRowModel: () => RowModel<TData>;
  toggleRowSelected: (rowId: RowId, selected?: boolean) => void;
  toggleAllPageRowsSelected: (selected?: boolean) => void;
  toggleAllFilteredRowsSelected: (selected?: boolean) => void;
  toggleAllRowsSelected: (selected?: boolean) => void;
  pruneRowSelection: (scope?: RowSelectionCleanupScope) => void;
  getIsAllRowsSelected: () => boolean;
  getIsSomeRowsSelected: () => boolean;
  getIsAllFilteredRowsSelected: () => boolean;
  getIsSomeFilteredRowsSelected: () => boolean;
  getIsAllPageRowsSelected: () => boolean;
  getIsSomePageRowsSelected: () => boolean;
  resetRowSelection: () => void;
  getIsColumnVisible: (columnId: ColumnId) => boolean;
  setColumnVisibility: (updater: Updater<ColumnVisibilityState>) => void;
  toggleColumnVisibility: (columnId: ColumnId, visible?: boolean) => void;
  resetColumnVisibility: () => void;
  getColumnSize: (columnId: ColumnId) => number | undefined;
  setColumnSizing: (updater: Updater<ColumnSizingState>) => void;
  setColumnSize: (columnId: ColumnId, size: number) => void;
  resetColumnSizing: () => void;
  setColumnOrder: (updater: Updater<ColumnOrderState>) => void;
  moveColumn: (columnId: ColumnId, targetColumnId: ColumnId, position?: ColumnMovePosition) => void;
  resetColumnOrder: () => void;
  setColumnPinning: (updater: Updater<ColumnPinningState>) => void;
  pinColumn: (columnId: ColumnId, position: ColumnPinningPosition) => void;
  resetColumnPinning: () => void;
  setFocusedCell: (coordinate: CellCoordinate | null) => void;
  moveFocus: (direction: FocusDirection, options?: MoveFocusOptions) => void;
  getCellSelectionRange: () => CellRangeSelectionState;
  setCellSelectionRange: (updater: Updater<CellRangeSelectionState>) => void;
  selectCellRange: (start: CellCoordinate, end?: CellCoordinate) => void;
  resetCellSelectionRange: () => void;
  getIsCellRangeSelected: (rowId: RowId, columnId: ColumnId) => boolean;
  getSelectedCellCoordinates: () => CellCoordinate[];
  getClipboardText: (options?: ClipboardCopyOptions) => string;
  getExportText: (options?: ExportTextOptions) => string;
  getExportFile: (options?: ExportFileOptions) => ExportFile;
  pasteClipboardText: (text: string, options?: ClipboardPasteOptions) => ClipboardPasteResult<TData>;
  fillCellRange: (end: CellCoordinate, options?: CellFillOptions) => CellEditEvent<TData>[];
  getIsCellEditing: (rowId: RowId, columnId: ColumnId) => boolean;
  startCellEdit: (rowId: RowId, columnId: ColumnId, sourceEvent?: unknown) => CellEditEvent<TData> | null;
  commitCellEdit: (value: unknown, sourceEvent?: unknown) => CellEditEvent<TData> | null;
  cancelCellEdit: (sourceEvent?: unknown) => CellEditEvent<TData> | null;
  getCellEditHistoryState: () => CellEditHistoryState;
  getCanUndoCellEdit: () => boolean;
  getCanRedoCellEdit: () => boolean;
  undoCellEdit: (sourceEvent?: unknown) => CellEditEvent<TData>[];
  redoCellEdit: (sourceEvent?: unknown) => CellEditEvent<TData>[];
  clearCellEditHistory: () => void;
  subscribe: (listener: () => void) => () => void;
  subscribeSelector: <TSelected>(
    selector: GridSelector<TData, TSelected>,
    listener: GridSelectorListener<TSelected>,
    options?: GridSelectorSubscriptionOptions<TSelected>,
  ) => () => void;
}
