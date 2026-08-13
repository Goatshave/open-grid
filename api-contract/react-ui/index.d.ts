import * as react from 'react';
import { CSSProperties, ReactNode } from 'react';
import { GridOptions, Grid, Row, HeaderContext, CellContext, Column, CellFillOptions, ClipboardPasteOptions, ClipboardPasteResult, ExportFile } from '@open-grid/core';
export { AccessorColumnOptions, AccessorFnColumnDef, AccessorKeyColumnDef, AnyColumnDef, CellContext, CellEditEvent, CellEditEventParams, CellEditHistoryAction, CellEditHistoryState, CellEditOption, CellEditParserContext, CellEditPhase, CellEditValidationContext, CellEditValidationResult, CellEditValidationState, CellEditingState, CellFillOptions, CellInteractionEvent, CellInteractionEventParams, CellRange, CellRangeSelectionState, ClipboardCellContext, ClipboardCopyOptions, ClipboardPasteCellContext, ClipboardPasteCommittedCell, ClipboardPasteOptions, ClipboardPasteResult, ClipboardPasteSkippedCell, ClipboardPasteSkippedReason, ClipboardPasteValidationError, ColumnDef, ColumnFiltersState, ColumnHelper, ColumnMovePosition, ColumnOrderState, ColumnPinningPosition, ColumnResizeEvent, ColumnResizeEventParams, ColumnResizePhase, DisplayColumnDef, ExpandedState, ExportFile, ExportFileOptions, FitColumnsToWidthOptions, GridCacheDiagnostics, GridCacheDiagnosticsEntry, GridCacheKey, GridOptions, GridState, GroupColumnDef, GroupingState, Header, HeaderContext, HeaderGroup, MoveFocusOptions, PaginationState, RowInteractionEvent, RowInteractionEventParams, RowSelectionCleanupScope, SortingState, createColumnHelper, fitColumnsToWidth } from '@open-grid/core';
import { ColumnVirtualizationPrimitiveOptions, GridLocalizationOverrides, GridDensity, RowVirtualizationPrimitiveOptions } from '@open-grid/primitives';
export { DEFAULT_GRID_LOCALIZATION, GRID_PREFERENCES_VERSION, GridDensity, GridLocalization, GridLocalizationOverrides, GridPreferences, GridPreferencesOptions, GridPreferencesState, GridPreferencesStorageEnvironmentLike, GridPreferencesStorageLike, createGridLocalization, createGridPreferences, getBrowserGridPreferencesStorage, parseGridPreferences, readGridPreferences, removeGridPreferences, serializeGridPreferences, writeGridPreferences } from '@open-grid/primitives';

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
    render: (context: HeaderActionMenuContext<TData>) => ReactNode;
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
type GridReadyHandler<TData> = (grid: Grid<TData>) => void | (() => void);
interface DataGridProps<TData> extends GridOptions<TData> {
    ariaLabel?: string;
    localization?: GridLocalizationOverrides;
    className?: string;
    style?: CSSProperties;
    emptyState?: ReactNode;
    error?: boolean;
    errorState?: ReactNode;
    onRetry?: () => void;
    loading?: boolean;
    loadingState?: ReactNode;
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
}
declare function DataGrid<TData>(props: DataGridProps<TData>): react.JSX.Element;
declare function downloadExportFile(file: ExportFile): boolean;

export { type ColumnVirtualizationOptions, DataGrid, type DataGridProps, type GridReadyHandler, type HeaderActionMenuActionItem, type HeaderActionMenuContext, type HeaderActionMenuCustomItem, type HeaderActionMenuItem, type HeaderActionMenuItems, type HeaderActionMenuLabelItem, type HeaderActionMenuSeparatorItem, type RowVirtualizationOptions, downloadExportFile };
