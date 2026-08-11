import { Grid, GridState, Updater, GridOptions, GridSelectorSubscriptionOptions, GridSelector } from '@open-grid/core';
export { AccessorColumnOptions, AccessorFnColumnDef, AccessorKey, AccessorKeyColumnDef, AnyColumnDef, CellContext, CellCoordinate, CellEditEvent, CellEditEventParams, CellEditHistoryAction, CellEditHistoryState, CellEditParserContext, CellEditPhase, CellEditingState, CellFillOptions, CellInteractionEvent, CellInteractionEventParams, CellRange, CellRangeSelectionState, ClipboardCellContext, ClipboardCopyOptions, ClipboardPasteOptions, Column, ColumnDef, ColumnFilter, ColumnFiltersState, ColumnHelper, ColumnId, ColumnMovePosition, ColumnOrderState, ColumnPinningPosition, ColumnPinningState, ColumnResizeEvent, ColumnResizeEventParams, ColumnResizePhase, ColumnSizingState, ColumnVisibilityState, DisplayColumnDef, ExpandedState, FilterFn, FitColumnsToWidthOptions, Grid, GridCacheDiagnostics, GridCacheDiagnosticsEntry, GridCacheKey, GridOptions, GridSelector, GridSelectorListener, GridSelectorSubscriptionOptions, GridState, GroupColumnDef, GroupingState, Header, HeaderContext, HeaderGroup, MoveFocusOptions, PaginationState, Row, RowId, RowInteractionEvent, RowInteractionEventParams, RowModel, RowSelectionCleanupScope, RowSelectionState, SortFn, SortingRule, SortingState, Updater, createColumnHelper, createGrid, fitColumnsToWidth } from '@open-grid/core';
import { Readable } from 'svelte/store';

interface SvelteGrid<TData> {
    grid: Grid<TData>;
    state: Readable<GridState>;
    setOptions: (updater: Updater<GridOptions<TData>>, options?: {
        notify?: boolean;
    }) => void;
    dispose: () => void;
}
type SvelteGridOptions<TData> = GridOptions<TData> | Readable<GridOptions<TData>>;
type SvelteGridSelectorOptions<TSelected> = Pick<GridSelectorSubscriptionOptions<TSelected>, "equalityFn">;
declare function createGridStore<TData>(options: SvelteGridOptions<TData>): SvelteGrid<TData>;
declare function createGridSelectorStore<TData, TSelected>(grid: Grid<TData>, selector: GridSelector<TData, TSelected>, options?: SvelteGridSelectorOptions<TSelected>): Readable<TSelected>;

export { type SvelteGrid, type SvelteGridOptions, type SvelteGridSelectorOptions, createGridSelectorStore, createGridStore };
