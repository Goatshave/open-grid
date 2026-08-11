type ColumnId = string;
type RowId = string;
type Updater<T> = T | ((previous: T) => T);
type SortDirection = "asc" | "desc";
interface SortingRule {
    id: ColumnId;
    desc?: boolean;
}
type SortingState = SortingRule[];
interface ColumnFilter {
    id: ColumnId;
    value: unknown;
}
type ColumnFiltersState = ColumnFilter[];
type GroupingState = ColumnId[];
type GroupFooterMode = false | "expanded";
interface PaginationState {
    pageIndex: number;
    pageSize: number;
}
type RowSelectionState = Record<RowId, boolean>;
type RowSelectionCleanupScope = "loaded" | "filtered" | "page";
type RowSelectionMode = "self" | "descendants";
type ExpandedState = Record<RowId, boolean>;
type ColumnVisibilityState = Record<ColumnId, boolean>;
type ColumnSizingState = Record<ColumnId, number>;
interface FitColumnsToWidthOptions {
    columnIds?: readonly ColumnId[];
}
type ColumnOrderState = ColumnId[];
type ColumnMovePosition = "before" | "after";
interface ColumnPinningState {
    left: ColumnId[];
    right: ColumnId[];
}
type ColumnPinningPosition = "left" | "right" | false;
interface CellCoordinate {
    rowId: RowId;
    columnId: ColumnId;
}
type CellEditingState = CellCoordinate | null;
interface CellRange {
    start: CellCoordinate;
    end: CellCoordinate;
}
type CellRangeSelectionState = CellRange | null;
interface MoveFocusOptions {
    extendSelection?: boolean;
}
type FocusDirection = "up" | "down" | "left" | "right" | "home" | "end" | "grid-start" | "grid-end" | "page-up" | "page-down";
interface ColumnLayout {
    id: ColumnId;
    size: number;
    start: number;
    end: number;
    pinned: "left" | "right" | false;
    pinnedStart?: number;
    pinnedEdge?: "left" | "right";
}
interface GridState {
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
type GridCacheKey = "allColumns" | "allLeafColumns" | "visibleLeafColumns" | "headerGroups" | "columnLayout" | "coreRowModel" | "filteredRowModel" | "sortedRowModel" | "groupedRowModel" | "expandedRowModel" | "paginatedRowModel" | "selectedRowModel" | "filteredSelectedRowModel" | "pageSelectedRowModel";
interface GridCacheDiagnosticsEntry {
    key: GridCacheKey;
    hits: number;
    misses: number;
    computes: number;
    initialized: boolean;
    lastDependencyCount: number;
}
interface GridCacheDiagnostics {
    entries: Record<GridCacheKey, GridCacheDiagnosticsEntry>;
    totalHits: number;
    totalMisses: number;
    totalComputes: number;
}
interface Row<TData> {
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
interface RowModel<TData> {
    rows: Row<TData>[];
    flatRows: Row<TData>[];
    rowsById: Record<RowId, Row<TData>>;
}
interface HeaderContext<TData, TValue> {
    grid: Grid<TData>;
    column: Column<TData, TValue>;
    header?: Header<TData> | undefined;
}
interface CellContext<TData, TValue> {
    grid: Grid<TData>;
    row: Row<TData>;
    column: Column<TData, TValue>;
    value: TValue | undefined;
}
interface ClipboardCellContext<TData, TValue> {
    grid: Grid<TData>;
    row: Row<TData>;
    rowIndex: number;
    column: Column<TData, TValue>;
    columnIndex: number;
    value: TValue | undefined;
}
interface ClipboardCopyOptions {
    includeHeaders?: boolean;
}
interface ExportCellContext<TData, TValue> extends ClipboardCellContext<TData, TValue> {
}
type ExportTextFormat = "csv" | "tsv";
type ExportRowScope = "page" | "pre-pagination" | "filtered" | "all" | "selected" | "filtered-selected" | "page-selected";
interface ExportTextOptions {
    includeHeaders?: boolean;
    format?: ExportTextFormat;
    delimiter?: string;
    newline?: "\n" | "\r\n";
    rowScope?: ExportRowScope;
    columnIds?: ColumnId[];
    maxRows?: number;
    maxRowsMode?: "block" | "truncate";
}
interface ExportFileOptions extends ExportTextOptions {
    filename?: string;
    extension?: string;
    mimeType?: string;
    includeByteOrderMark?: boolean;
}
interface ExportFile {
    filename: string;
    extension: string;
    mimeType: string;
    text: string;
}
interface ClipboardPasteOptions {
    target?: CellCoordinate;
    sourceEvent?: unknown;
    maxCells?: number;
    maxCellsMode?: "block" | "truncate";
}
type ClipboardPasteSkippedReason = "readonly" | "missing-value" | "validation" | "max-cells";
interface ClipboardPasteCellContext<TData> {
    coordinate: CellCoordinate;
    row: Row<TData>;
    rowIndex: number;
    column: Column<TData, unknown>;
    columnIndex: number;
    rawValue: string;
    value: unknown;
    previousValue: unknown;
}
interface ClipboardPasteCommittedCell<TData> extends ClipboardPasteCellContext<TData> {
    event: CellEditEvent<TData>;
}
interface ClipboardPasteSkippedCell<TData> {
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
interface ClipboardPasteValidationError<TData> extends ClipboardPasteCellContext<TData> {
    validation: CellEditValidationState;
    event: CellEditEvent<TData>;
}
interface ClipboardPasteResult<TData> {
    attemptedCells: number;
    committedCells: Array<ClipboardPasteCommittedCell<TData>>;
    skippedCells: Array<ClipboardPasteSkippedCell<TData>>;
    validationErrors: Array<ClipboardPasteValidationError<TData>>;
    events: Array<CellEditEvent<TData>>;
    blocked: boolean;
    truncated: boolean;
}
interface CellFillOptions {
    sourceEvent?: unknown;
    fillMode?: "copy" | "series";
    maxCells?: number;
    maxCellsMode?: "block" | "truncate";
}
interface CellEditParserContext<TData, TValue> {
    grid: Grid<TData>;
    row: Row<TData>;
    column: Column<TData, TValue>;
    previousValue: TValue | undefined;
}
interface CellEditValidationContext<TData, TValue> extends CellEditParserContext<TData, TValue> {
    value: unknown;
}
type CellEditValidationResult = boolean | string | {
    valid: boolean;
    message?: string;
};
interface CellEditValidationState {
    valid: boolean;
    message?: string;
}
interface CellEditOption {
    value: string;
    label?: string;
    disabled?: boolean;
}
type AccessorKey<TData> = Extract<keyof TData, string>;
type SortFn<TData, TValue = unknown> = (a: Row<TData>, b: Row<TData>, columnId: ColumnId) => number;
type FilterFn<TData, TValue = unknown> = (value: TValue | undefined, filterValue: unknown, row: Row<TData>, column: Column<TData, TValue>) => boolean;
interface GroupingValueContext<TData, TValue> {
    row: TData;
    rowIndex: number;
    column: Column<TData, TValue>;
}
interface AggregationContext<TData, TValue> {
    column: Column<TData, TValue>;
    columnId: ColumnId;
    leafRows: Row<TData>[];
    childRows: Row<TData>[];
    values: Array<TValue | undefined>;
}
type BuiltInAggregationFn = "count" | "sum" | "min" | "max" | "mean";
type AggregationFn<TData, TValue = unknown> = BuiltInAggregationFn | ((context: AggregationContext<TData, TValue>) => unknown);
interface ColumnDef<TData, TValue = unknown> {
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
type AnyColumnDef<TData> = ColumnDef<TData, any>;
interface Column<TData, TValue = unknown> {
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
interface Header<TData> {
    id: string;
    depth: number;
    column: Column<TData, unknown>;
    colSpan: number;
    rowSpan: number;
    isPlaceholder: boolean;
    leafColumnIds: ColumnId[];
}
interface HeaderGroup<TData> {
    id: string;
    depth: number;
    headers: Header<TData>[];
}
interface GridInteractionEventBase<TData> {
    type: string;
    grid: Grid<TData>;
    sourceEvent?: unknown;
    defaultPrevented: boolean;
    preventDefault: () => void;
}
interface RowInteractionEvent<TData> extends GridInteractionEventBase<TData> {
    row: Row<TData>;
    rowIndex: number;
}
interface CellInteractionEvent<TData> extends RowInteractionEvent<TData> {
    column: Column<TData, unknown>;
    columnIndex: number;
    value: unknown;
}
type CellEditPhase = "start" | "commit" | "cancel";
type CellEditHistoryAction = "undo" | "redo";
interface CellEditHistoryState {
    undoDepth: number;
    redoDepth: number;
    limit: number;
}
type GridSelector<TData, TSelected> = (grid: Grid<TData>) => TSelected;
type GridSelectorListener<TSelected> = (selectedValue: TSelected, previousValue: TSelected | undefined) => void;
interface GridSelectorSubscriptionOptions<TSelected> {
    equalityFn?: (previousValue: TSelected, nextValue: TSelected) => boolean;
    fireImmediately?: boolean;
}
interface CellEditEvent<TData> extends CellInteractionEvent<TData> {
    phase: CellEditPhase;
    previousValue: unknown;
    historyAction?: CellEditHistoryAction | undefined;
    validation?: CellEditValidationState | undefined;
}
type ColumnResizePhase = "start" | "move" | "end";
interface ColumnResizeEvent<TData> extends GridInteractionEventBase<TData> {
    phase: ColumnResizePhase;
    column: Column<TData, unknown>;
    columnIndex: number;
    startSize: number;
    size: number;
    delta: number;
}
interface RowInteractionEventParams<TData> {
    type: string;
    row: Row<TData>;
    rowIndex: number;
    sourceEvent?: unknown;
}
interface CellInteractionEventParams<TData> extends RowInteractionEventParams<TData> {
    column: Column<TData, unknown>;
    columnIndex: number;
}
interface CellEditEventParams<TData> extends CellInteractionEventParams<TData> {
    phase: CellEditPhase;
    value: unknown;
    previousValue: unknown;
    historyAction?: CellEditHistoryAction | undefined;
    validation?: CellEditValidationState | undefined;
}
interface ColumnResizeEventParams<TData> {
    phase: ColumnResizePhase;
    column: Column<TData, unknown>;
    columnIndex: number;
    startSize: number;
    size: number;
    sourceEvent?: unknown;
}
interface GridOptions<TData> {
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
interface Grid<TData> {
    getOptions: () => GridOptions<TData>;
    setOptions: (updater: Updater<GridOptions<TData>>, options?: {
        notify?: boolean;
    }) => void;
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
    subscribeSelector: <TSelected>(selector: GridSelector<TData, TSelected>, listener: GridSelectorListener<TSelected>, options?: GridSelectorSubscriptionOptions<TSelected>) => () => void;
}

type AccessorColumnOptions<TData, TValue> = Omit<ColumnDef<TData, TValue>, "accessorKey" | "accessorFn" | "columns">;
type AccessorKeyColumnDef<TData, TKey extends AccessorKey<TData>> = AccessorColumnOptions<TData, TData[TKey]> & {
    accessorKey: TKey;
};
type AccessorFnColumnDef<TData, TValue> = AccessorColumnOptions<TData, TValue> & {
    id: ColumnId;
    accessorFn: (row: TData, index: number) => TValue;
};
type DisplayColumnDef<TData> = Omit<ColumnDef<TData, unknown>, "accessorKey" | "accessorFn" | "columns"> & {
    id: ColumnId;
};
type GroupColumnDef<TData> = Omit<ColumnDef<TData, unknown>, "accessorKey" | "accessorFn" | "cell" | "sortFn" | "filterFn"> & {
    id?: ColumnId;
    columns: AnyColumnDef<TData>[];
};
interface ColumnHelper<TData> {
    accessor<TKey extends AccessorKey<TData>>(accessorKey: TKey, column?: AccessorColumnOptions<TData, TData[TKey]>): AccessorKeyColumnDef<TData, TKey>;
    accessor<TValue>(accessorFn: (row: TData, index: number) => TValue, column: AccessorColumnOptions<TData, TValue> & {
        id: ColumnId;
    }): AccessorFnColumnDef<TData, TValue>;
    display(column: DisplayColumnDef<TData>): DisplayColumnDef<TData>;
    group(column: GroupColumnDef<TData>): GroupColumnDef<TData>;
}
declare function createColumnHelper<TData>(): ColumnHelper<TData>;

declare function fitColumnsToWidth<TData>(grid: Grid<TData>, width: number, options?: FitColumnsToWidthOptions): void;

declare function getExportFileExtension(options?: Pick<ExportFileOptions, "delimiter" | "extension" | "format">): string;
declare function getExportMimeType(options?: Pick<ExportFileOptions, "delimiter" | "format" | "mimeType">): string;
declare function createExportFile(text: string, options?: ExportFileOptions): ExportFile;

declare function createGrid<TData>(options: GridOptions<TData>): Grid<TData>;

declare const sortingReducers: {
    set: (previous: SortingState, updater: Updater<SortingState>) => SortingState;
    toggleColumn: (previous: SortingState, columnId: ColumnId, desc?: boolean, multi?: boolean) => SortingState;
};
declare const filterReducers: {
    setColumnFilters: (previous: ColumnFiltersState, updater: Updater<ColumnFiltersState>) => ColumnFiltersState;
    setGlobalFilter: (previous: string, updater: Updater<string>) => string;
};
declare const groupingReducers: {
    set: <TData>(columns: readonly Column<TData, unknown>[], previous: GroupingState, updater: Updater<GroupingState>) => GroupingState;
    toggleColumn: <TData>(columns: readonly Column<TData, unknown>[], previous: GroupingState, columnId: ColumnId, grouped?: boolean) => GroupingState;
    moveColumn: <TData>(columns: readonly Column<TData, unknown>[], previous: GroupingState, columnId: ColumnId, targetColumnId: ColumnId, position: ColumnMovePosition) => GroupingState;
    reset: () => GroupingState;
};
declare const expandedReducers: {
    set: <TData>(rows: readonly {
        id: RowId;
        getCanExpand?: () => boolean;
    }[], previous: ExpandedState, updater: Updater<ExpandedState>) => ExpandedState;
    toggleRow: <TData>(rows: readonly {
        id: RowId;
        getCanExpand?: () => boolean;
    }[], previous: ExpandedState, rowId: RowId, expanded?: boolean) => ExpandedState;
    toggleRows: <TData>(rows: readonly {
        id: RowId;
        getCanExpand?: () => boolean;
    }[], previous: ExpandedState, expanded?: boolean) => ExpandedState;
    reset: () => ExpandedState;
};
declare const paginationReducers: {
    set: (previous: PaginationState, updater: Updater<PaginationState>) => PaginationState;
    setPageIndex: (previous: PaginationState, pageIndex: number) => PaginationState;
    setPageSize: (previous: PaginationState, pageSize: number) => PaginationState;
};
declare const rowSelectionReducers: {
    toggleRow: (previous: RowSelectionState, rowId: RowId, selected?: boolean) => RowSelectionState;
    toggleRows: (previous: RowSelectionState, rowIds: readonly RowId[], selected?: boolean) => RowSelectionState;
    prune: (previous: RowSelectionState, rowIds: readonly RowId[]) => RowSelectionState;
    reset: () => RowSelectionState;
};
declare function getRowIdsForSelectionCleanup<TData>(scope: RowSelectionCleanupScope, models: {
    loaded: {
        rows: readonly {
            id: RowId;
        }[];
    };
    filtered: {
        rows: readonly {
            id: RowId;
        }[];
    };
    page: {
        rows: readonly {
            id: RowId;
        }[];
    };
}): RowId[];
declare const columnVisibilityReducers: {
    set: (previous: ColumnVisibilityState, updater: Updater<ColumnVisibilityState>) => ColumnVisibilityState;
    toggleColumn: (previous: ColumnVisibilityState, columnId: ColumnId, visible?: boolean) => ColumnVisibilityState;
    reset: () => ColumnVisibilityState;
};
declare const columnSizingReducers: {
    set: <TData>(columns: readonly Column<TData, unknown>[], previous: ColumnSizingState, updater: Updater<ColumnSizingState>) => ColumnSizingState;
    setColumnSize: <TData>(columns: readonly Column<TData, unknown>[], previous: ColumnSizingState, columnId: ColumnId, size: number) => ColumnSizingState;
    reset: () => ColumnSizingState;
};
declare const columnOrderReducers: {
    set: <TData>(columns: readonly Column<TData, unknown>[], previous: ColumnOrderState, updater: Updater<ColumnOrderState>) => ColumnOrderState;
    moveColumn: <TData>(columns: readonly Column<TData, unknown>[], previous: ColumnOrderState, columnId: ColumnId, targetColumnId: ColumnId, position: ColumnMovePosition) => ColumnOrderState;
    reset: () => ColumnOrderState;
};
declare const columnPinningReducers: {
    set: (previous: ColumnPinningState, updater: Updater<ColumnPinningState>) => ColumnPinningState;
    pinColumn: (previous: ColumnPinningState, columnId: ColumnId, position: ColumnPinningPosition) => ColumnPinningState;
    reset: () => ColumnPinningState;
};
declare const focusReducers: {
    set: (_previous: CellCoordinate | null, coordinate: CellCoordinate | null) => CellCoordinate | null;
    reset: () => CellCoordinate | null;
};
declare function orderLeafColumns<TData>(columns: readonly Column<TData, unknown>[], columnOrder: readonly ColumnId[]): Column<TData, unknown>[];
declare function getOrderableLeafColumns<TData>(columns: readonly Column<TData, unknown>[]): Column<TData, unknown>[];

declare const defaultState: GridState;
declare function mergeState(...states: Array<Partial<GridState> | undefined>): GridState;

export { type AccessorColumnOptions, type AccessorFnColumnDef, type AccessorKey, type AccessorKeyColumnDef, type AggregationContext, type AggregationFn, type AnyColumnDef, type BuiltInAggregationFn, type CellContext, type CellCoordinate, type CellEditEvent, type CellEditEventParams, type CellEditHistoryAction, type CellEditHistoryState, type CellEditOption, type CellEditParserContext, type CellEditPhase, type CellEditValidationContext, type CellEditValidationResult, type CellEditValidationState, type CellEditingState, type CellFillOptions, type CellInteractionEvent, type CellInteractionEventParams, type CellRange, type CellRangeSelectionState, type ClipboardCellContext, type ClipboardCopyOptions, type ClipboardPasteCellContext, type ClipboardPasteCommittedCell, type ClipboardPasteOptions, type ClipboardPasteResult, type ClipboardPasteSkippedCell, type ClipboardPasteSkippedReason, type ClipboardPasteValidationError, type Column, type ColumnDef, type ColumnFilter, type ColumnFiltersState, type ColumnHelper, type ColumnId, type ColumnLayout, type ColumnMovePosition, type ColumnOrderState, type ColumnPinningPosition, type ColumnPinningState, type ColumnResizeEvent, type ColumnResizeEventParams, type ColumnResizePhase, type ColumnSizingState, type ColumnVisibilityState, type DisplayColumnDef, type ExpandedState, type ExportCellContext, type ExportFile, type ExportFileOptions, type ExportRowScope, type ExportTextFormat, type ExportTextOptions, type FilterFn, type FitColumnsToWidthOptions, type FocusDirection, type Grid, type GridCacheDiagnostics, type GridCacheDiagnosticsEntry, type GridCacheKey, type GridOptions, type GridSelector, type GridSelectorListener, type GridSelectorSubscriptionOptions, type GridState, type GroupColumnDef, type GroupFooterMode, type GroupingState, type GroupingValueContext, type Header, type HeaderContext, type HeaderGroup, type MoveFocusOptions, type PaginationState, type Row, type RowId, type RowInteractionEvent, type RowInteractionEventParams, type RowModel, type RowSelectionCleanupScope, type RowSelectionState, type SortDirection, type SortFn, type SortingRule, type SortingState, type Updater, columnOrderReducers, columnPinningReducers, columnSizingReducers, columnVisibilityReducers, createColumnHelper, createExportFile, createGrid, defaultState, expandedReducers, filterReducers, fitColumnsToWidth, focusReducers, getExportFileExtension, getExportMimeType, getOrderableLeafColumns, getRowIdsForSelectionCleanup, groupingReducers, mergeState, orderLeafColumns, paginationReducers, rowSelectionReducers, sortingReducers };
