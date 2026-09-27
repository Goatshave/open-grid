import * as vue from 'vue';
import { DefineComponent, PropType, VNodeChild, VNode } from 'vue';
import { GridOptions, Grid, Row, Column, HeaderContext, CellContext, CellFillOptions, ClipboardPasteResult, ClipboardPasteOptions, ExportFile } from '@open-grid/core';
export { AccessorColumnOptions, AccessorFnColumnDef, AccessorKey, AccessorKeyColumnDef, AnyColumnDef, CellContext, CellCoordinate, CellEditEvent, CellEditEventParams, CellEditHistoryAction, CellEditHistoryState, CellEditOption, CellEditParserContext, CellEditPhase, CellEditValidationContext, CellEditValidationResult, CellEditValidationState, CellEditingState, CellFillOptions, CellInteractionEvent, CellInteractionEventParams, CellRange, CellRangeSelectionState, ClipboardCellContext, ClipboardCopyOptions, ClipboardPasteCellContext, ClipboardPasteCommittedCell, ClipboardPasteOptions, ClipboardPasteResult, ClipboardPasteSkippedCell, ClipboardPasteSkippedReason, ClipboardPasteValidationError, Column, ColumnDef, ColumnFilter, ColumnFiltersState, ColumnHelper, ColumnId, ColumnMovePosition, ColumnOrderState, ColumnPinningPosition, ColumnPinningState, ColumnResizeEvent, ColumnResizeEventParams, ColumnResizePhase, ColumnSizingState, ColumnVisibilityState, DisplayColumnDef, ExpandedState, ExportFile, ExportFileOptions, FilterFn, FitColumnsToWidthOptions, Grid, GridCacheDiagnostics, GridCacheDiagnosticsEntry, GridCacheKey, GridOptions, GridState, GroupColumnDef, GroupingState, Header, HeaderContext, HeaderGroup, MoveFocusOptions, PaginationState, Row, RowId, RowInteractionEvent, RowInteractionEventParams, RowModel, RowSelectionCleanupScope, RowSelectionState, SortFn, SortingRule, SortingState, Updater, fitColumnsToWidth } from '@open-grid/core';
import { ColumnVirtualizationPrimitiveOptions, GridLocalizationOverrides, GridDensity, RowVirtualizationPrimitiveOptions, GridLocalization } from '@open-grid/primitives';
export { DEFAULT_GRID_LOCALIZATION, GRID_PREFERENCES_VERSION, GridDensity, GridLocalization, GridLocalizationOverrides, GridPreferences, GridPreferencesMigration, GridPreferencesOptions, GridPreferencesParseOptions, GridPreferencesState, GridPreferencesStorageEnvironmentLike, GridPreferencesStorageLike, createGridLocalization, createGridPreferences, getBrowserGridPreferencesStorage, migrateGridPreferences, parseGridPreferences, readGridPreferences, removeGridPreferences, serializeGridPreferences, writeGridPreferences } from '@open-grid/primitives';
export { createColumnHelper, useGrid } from '@open-grid/vue';

interface DataGridRenderContext<TData> {
    grid: Grid<TData>;
    rows: readonly Row<TData>[];
    visibleColumns: readonly Column<TData, unknown>[];
}
interface DataGridErrorRenderContext<TData> extends DataGridRenderContext<TData> {
    retry: (() => void) | undefined;
}
interface DataGridProps<TData> {
    ariaLabel?: string;
    localization?: GridLocalizationOverrides;
    options: GridOptions<TData>;
    emptyState?: VNodeChild;
    error?: boolean;
    errorState?: VNodeChild;
    onRetry?: () => void;
    loading?: boolean;
    loadingState?: VNodeChild;
    renderToolbar?: (context: DataGridRenderContext<TData>) => VNodeChild;
    renderEmptyState?: (context: DataGridRenderContext<TData>) => VNodeChild;
    renderLoadingState?: (context: DataGridRenderContext<TData>) => VNodeChild;
    renderErrorState?: (context: DataGridErrorRenderContext<TData>) => VNodeChild;
    renderHeader?: (context: HeaderContext<TData, unknown>) => VNodeChild;
    renderCell?: (context: CellContext<TData, unknown>) => VNodeChild;
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
    style?: unknown;
    class?: unknown;
}
type DataGridComponent<TData> = DefineComponent<DataGridProps<TData>>;
type GridReadyHandler<TData> = (grid: Grid<TData>) => void | (() => void);
type RowVirtualizationOptions = RowVirtualizationPrimitiveOptions;
type ColumnVirtualizationOptions = ColumnVirtualizationPrimitiveOptions;
interface HeaderActionMenuActionItem<TData> {
    type?: "action";
    id: string;
    label: string;
    disabled?: boolean;
    onSelect: (context: HeaderActionMenuContext<TData>) => void;
}
interface HeaderActionMenuLabelItem {
    type: "label";
    id: string;
    label: string;
}
interface HeaderActionMenuSeparatorItem {
    type: "separator";
    id: string;
    label?: string;
}
interface HeaderActionMenuCustomItem<TData> {
    type: "custom";
    id: string;
    label?: string;
    render: (context: HeaderActionMenuContext<TData>) => VNodeChild;
}
type HeaderActionMenuItem<TData> = HeaderActionMenuActionItem<TData> | HeaderActionMenuLabelItem | HeaderActionMenuSeparatorItem | HeaderActionMenuCustomItem<TData>;
interface HeaderActionMenuContext<TData> {
    grid: Grid<TData>;
    column: Column<TData, unknown>;
    sortDirection: "asc" | "desc" | false;
    pinningPosition: "left" | "right" | false;
    isGrouped: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    defaultItems: Array<HeaderActionMenuActionItem<TData>>;
}
type HeaderActionMenuItems<TData> = (context: HeaderActionMenuContext<TData>) => Array<HeaderActionMenuItem<TData> | null | false | undefined>;
declare const DataGrid: DefineComponent<vue.ExtractPropTypes<{
    ariaLabel: {
        type: StringConstructor;
        default: undefined;
    };
    localization: {
        type: PropType<GridLocalizationOverrides>;
        default: undefined;
    };
    options: {
        type: PropType<GridOptions<unknown>>;
        required: true;
    };
    emptyState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    error: {
        type: BooleanConstructor;
        default: boolean;
    };
    errorState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    onRetry: {
        type: PropType<() => void>;
        default: undefined;
    };
    loading: {
        type: BooleanConstructor;
        default: boolean;
    };
    loadingState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    renderToolbar: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderEmptyState: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderLoadingState: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderErrorState: {
        type: PropType<(context: DataGridErrorRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderHeader: {
        type: PropType<(context: HeaderContext<unknown, unknown>) => VNodeChild>;
        default: undefined;
    };
    renderCell: {
        type: PropType<(context: CellContext<unknown, unknown>) => VNodeChild>;
        default: undefined;
    };
    onGridReady: {
        type: PropType<GridReadyHandler<unknown>>;
        default: undefined;
    };
    getRowClassName: {
        type: PropType<(row: Row<unknown>) => string | undefined>;
        default: undefined;
    };
    getHeaderClassName: {
        type: PropType<(context: HeaderContext<unknown, unknown>) => string | undefined>;
        default: undefined;
    };
    getCellClassName: {
        type: PropType<(context: CellContext<unknown, unknown>) => string | undefined>;
        default: undefined;
    };
    groupingPanel: {
        type: BooleanConstructor;
        default: boolean;
    };
    quickFilterControl: {
        type: BooleanConstructor;
        default: boolean;
    };
    rowSelectionControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    columnVisibilityControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    density: {
        type: PropType<GridDensity>;
        default: undefined;
    };
    defaultDensity: {
        type: PropType<GridDensity>;
        default: undefined;
    };
    densityControl: {
        type: BooleanConstructor;
        default: boolean;
    };
    onDensityChange: {
        type: PropType<(density: GridDensity) => void>;
        default: undefined;
    };
    columnFilterControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    paginationControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    pageSizeOptions: {
        type: PropType<readonly number[]>;
        default: undefined;
    };
    columnPinningControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    headerActionMenu: {
        type: BooleanConstructor;
        default: boolean;
    };
    headerActionMenuItems: {
        type: PropType<HeaderActionMenuItems<unknown>>;
        default: undefined;
    };
    rowVirtualization: {
        type: PropType<boolean | RowVirtualizationOptions>;
        default: boolean;
    };
    columnVirtualization: {
        type: PropType<boolean | ColumnVirtualizationOptions>;
        default: boolean;
    };
    cellFillOptions: {
        type: PropType<Omit<CellFillOptions, "sourceEvent">>;
        default: undefined;
    };
    onClipboardPaste: {
        type: PropType<(result: ClipboardPasteResult<unknown>) => void>;
        default: undefined;
    };
    clipboardPasteOptions: {
        type: PropType<Omit<ClipboardPasteOptions, "sourceEvent">>;
        default: undefined;
    };
}>, () => VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    ariaLabel: {
        type: StringConstructor;
        default: undefined;
    };
    localization: {
        type: PropType<GridLocalizationOverrides>;
        default: undefined;
    };
    options: {
        type: PropType<GridOptions<unknown>>;
        required: true;
    };
    emptyState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    error: {
        type: BooleanConstructor;
        default: boolean;
    };
    errorState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    onRetry: {
        type: PropType<() => void>;
        default: undefined;
    };
    loading: {
        type: BooleanConstructor;
        default: boolean;
    };
    loadingState: {
        type: PropType<VNodeChild>;
        default: undefined;
    };
    renderToolbar: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderEmptyState: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderLoadingState: {
        type: PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderErrorState: {
        type: PropType<(context: DataGridErrorRenderContext<unknown>) => VNodeChild>;
        default: undefined;
    };
    renderHeader: {
        type: PropType<(context: HeaderContext<unknown, unknown>) => VNodeChild>;
        default: undefined;
    };
    renderCell: {
        type: PropType<(context: CellContext<unknown, unknown>) => VNodeChild>;
        default: undefined;
    };
    onGridReady: {
        type: PropType<GridReadyHandler<unknown>>;
        default: undefined;
    };
    getRowClassName: {
        type: PropType<(row: Row<unknown>) => string | undefined>;
        default: undefined;
    };
    getHeaderClassName: {
        type: PropType<(context: HeaderContext<unknown, unknown>) => string | undefined>;
        default: undefined;
    };
    getCellClassName: {
        type: PropType<(context: CellContext<unknown, unknown>) => string | undefined>;
        default: undefined;
    };
    groupingPanel: {
        type: BooleanConstructor;
        default: boolean;
    };
    quickFilterControl: {
        type: BooleanConstructor;
        default: boolean;
    };
    rowSelectionControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    columnVisibilityControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    density: {
        type: PropType<GridDensity>;
        default: undefined;
    };
    defaultDensity: {
        type: PropType<GridDensity>;
        default: undefined;
    };
    densityControl: {
        type: BooleanConstructor;
        default: boolean;
    };
    onDensityChange: {
        type: PropType<(density: GridDensity) => void>;
        default: undefined;
    };
    columnFilterControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    paginationControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    pageSizeOptions: {
        type: PropType<readonly number[]>;
        default: undefined;
    };
    columnPinningControls: {
        type: BooleanConstructor;
        default: boolean;
    };
    headerActionMenu: {
        type: BooleanConstructor;
        default: boolean;
    };
    headerActionMenuItems: {
        type: PropType<HeaderActionMenuItems<unknown>>;
        default: undefined;
    };
    rowVirtualization: {
        type: PropType<boolean | RowVirtualizationOptions>;
        default: boolean;
    };
    columnVirtualization: {
        type: PropType<boolean | ColumnVirtualizationOptions>;
        default: boolean;
    };
    cellFillOptions: {
        type: PropType<Omit<CellFillOptions, "sourceEvent">>;
        default: undefined;
    };
    onClipboardPaste: {
        type: PropType<(result: ClipboardPasteResult<unknown>) => void>;
        default: undefined;
    };
    clipboardPasteOptions: {
        type: PropType<Omit<ClipboardPasteOptions, "sourceEvent">>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    ariaLabel: string;
    localization: Partial<GridLocalization>;
    emptyState: VNodeChild;
    error: boolean;
    errorState: VNodeChild;
    onRetry: () => void;
    loading: boolean;
    loadingState: VNodeChild;
    renderToolbar: (context: DataGridRenderContext<unknown>) => VNodeChild;
    renderEmptyState: (context: DataGridRenderContext<unknown>) => VNodeChild;
    renderLoadingState: (context: DataGridRenderContext<unknown>) => VNodeChild;
    renderErrorState: (context: DataGridErrorRenderContext<unknown>) => VNodeChild;
    renderHeader: (context: HeaderContext<unknown, unknown>) => VNodeChild;
    renderCell: (context: CellContext<unknown, unknown>) => VNodeChild;
    onGridReady: GridReadyHandler<unknown>;
    getRowClassName: (row: Row<unknown>) => string | undefined;
    getHeaderClassName: (context: HeaderContext<unknown, unknown>) => string | undefined;
    getCellClassName: (context: CellContext<unknown, unknown>) => string | undefined;
    groupingPanel: boolean;
    quickFilterControl: boolean;
    rowSelectionControls: boolean;
    columnVisibilityControls: boolean;
    density: "compact" | "standard" | "comfortable";
    defaultDensity: "compact" | "standard" | "comfortable";
    densityControl: boolean;
    onDensityChange: (density: GridDensity) => void;
    columnFilterControls: boolean;
    paginationControls: boolean;
    pageSizeOptions: readonly number[];
    columnPinningControls: boolean;
    headerActionMenu: boolean;
    headerActionMenuItems: HeaderActionMenuItems<unknown>;
    rowVirtualization: boolean | RowVirtualizationPrimitiveOptions;
    columnVirtualization: boolean | ColumnVirtualizationPrimitiveOptions;
    cellFillOptions: Omit<CellFillOptions, "sourceEvent">;
    clipboardPasteOptions: Omit<ClipboardPasteOptions, "sourceEvent">;
    onClipboardPaste: (result: ClipboardPasteResult<unknown>) => void;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;
declare function createDataGrid<TData>(): DataGridComponent<TData>;
declare function downloadExportFile(file: ExportFile): boolean;

export { type ColumnVirtualizationOptions, DataGrid, type DataGridComponent, type DataGridErrorRenderContext, type DataGridProps, type DataGridRenderContext, type GridReadyHandler, type HeaderActionMenuActionItem, type HeaderActionMenuContext, type HeaderActionMenuCustomItem, type HeaderActionMenuItem, type HeaderActionMenuItems, type HeaderActionMenuLabelItem, type HeaderActionMenuSeparatorItem, type RowVirtualizationOptions, createDataGrid, downloadExportFile };
