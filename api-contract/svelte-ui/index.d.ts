import { ExportFile } from '@open-grid/core';
export { AccessorColumnOptions, AccessorFnColumnDef, AccessorKey, AccessorKeyColumnDef, AnyColumnDef, CellContext, CellCoordinate, CellEditEvent, CellEditEventParams, CellEditHistoryAction, CellEditHistoryState, CellEditOption, CellEditParserContext, CellEditPhase, CellEditValidationContext, CellEditValidationResult, CellEditValidationState, CellEditingState, CellFillOptions, CellInteractionEvent, CellInteractionEventParams, CellRange, CellRangeSelectionState, ClipboardCellContext, ClipboardCopyOptions, ClipboardPasteCellContext, ClipboardPasteCommittedCell, ClipboardPasteOptions, ClipboardPasteResult, ClipboardPasteSkippedCell, ClipboardPasteSkippedReason, ClipboardPasteValidationError, Column, ColumnDef, ColumnFilter, ColumnFiltersState, ColumnHelper, ColumnId, ColumnMovePosition, ColumnOrderState, ColumnPinningPosition, ColumnPinningState, ColumnResizeEvent, ColumnResizeEventParams, ColumnResizePhase, ColumnSizingState, ColumnVisibilityState, DisplayColumnDef, ExpandedState, ExportFile, ExportFileOptions, FilterFn, FitColumnsToWidthOptions, Grid, GridCacheDiagnostics, GridCacheDiagnosticsEntry, GridCacheKey, GridOptions, GridState, GroupColumnDef, GroupingState, Header, HeaderContext, HeaderGroup, MoveFocusOptions, PaginationState, Row, RowId, RowInteractionEvent, RowInteractionEventParams, RowModel, RowSelectionCleanupScope, RowSelectionState, SortFn, SortingRule, SortingState, Updater } from '@open-grid/core';
export { ColumnVirtualizationOptions, default as DataGrid, DataGridErrorRenderContext, DataGridProps, DataGridRenderContext, GridReadyHandler, HeaderActionMenuActionItem, HeaderActionMenuContext, HeaderActionMenuCustomItem, HeaderActionMenuItem, HeaderActionMenuItems, HeaderActionMenuLabelItem, HeaderActionMenuSeparatorItem, RowVirtualizationOptions, SvelteDataGridRenderValue } from './DataGrid.svelte';
export { createColumnHelper, createGridStore, fitColumnsToWidth } from '@open-grid/svelte';
export { DEFAULT_GRID_LOCALIZATION, GRID_PREFERENCES_VERSION, GridDensity, GridLocalization, GridLocalizationOverrides, GridPreferences, GridPreferencesOptions, GridPreferencesState, GridPreferencesStorageEnvironmentLike, GridPreferencesStorageLike, createGridLocalization, createGridPreferences, getBrowserGridPreferencesStorage, parseGridPreferences, readGridPreferences, removeGridPreferences, serializeGridPreferences, writeGridPreferences } from '@open-grid/primitives';

interface SvelteDataGridRenderer<TContext> {
    type: "open-grid:svelte-renderer";
    component: unknown;
    context: TContext;
    props?: Record<string, unknown>;
}
type SvelteDataGridRendererFactory<TContext> = (context: TContext) => SvelteDataGridRenderer<TContext>;
declare function createSvelteDataGridRenderer<TContext>(component: unknown, props?: Record<string, unknown>): SvelteDataGridRendererFactory<TContext>;

declare function downloadExportFile(file: ExportFile): boolean;

export { type SvelteDataGridRenderer, type SvelteDataGridRendererFactory, createSvelteDataGridRenderer, downloadExportFile };
