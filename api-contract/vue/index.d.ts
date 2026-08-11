import { GridOptions, GridSelectorSubscriptionOptions, Grid, GridSelector } from '@open-grid/core';
export { AccessorColumnOptions, AccessorFnColumnDef, AccessorKey, AccessorKeyColumnDef, AnyColumnDef, CellContext, CellCoordinate, CellEditEvent, CellEditEventParams, CellEditHistoryAction, CellEditHistoryState, CellEditParserContext, CellEditPhase, CellEditingState, CellFillOptions, CellInteractionEvent, CellInteractionEventParams, CellRange, CellRangeSelectionState, ClipboardCellContext, ClipboardCopyOptions, ClipboardPasteOptions, Column, ColumnDef, ColumnFilter, ColumnFiltersState, ColumnHelper, ColumnId, ColumnMovePosition, ColumnOrderState, ColumnPinningPosition, ColumnPinningState, ColumnResizeEvent, ColumnResizeEventParams, ColumnResizePhase, ColumnSizingState, ColumnVisibilityState, DisplayColumnDef, ExpandedState, FilterFn, FitColumnsToWidthOptions, Grid, GridCacheDiagnostics, GridCacheDiagnosticsEntry, GridCacheKey, GridOptions, GridSelector, GridSelectorListener, GridSelectorSubscriptionOptions, GridState, GroupColumnDef, GroupingState, Header, HeaderContext, HeaderGroup, MoveFocusOptions, PaginationState, Row, RowId, RowInteractionEvent, RowInteractionEventParams, RowModel, RowSelectionCleanupScope, RowSelectionState, SortFn, SortingRule, SortingState, Updater, createColumnHelper, createGrid, fitColumnsToWidth } from '@open-grid/core';
import { MaybeRefOrGetter, ShallowRef } from 'vue';

interface VueGrid<TData> {
    grid: Grid<TData>;
    state: ShallowRef<ReturnType<Grid<TData>["getState"]>>;
    dispose: () => void;
}
type UseGridOptions<TData> = MaybeRefOrGetter<GridOptions<TData>>;
interface VueGridSelector<TSelected> {
    selected: ShallowRef<TSelected>;
    dispose: () => void;
}
type UseGridSelectorOptions<TSelected> = Pick<GridSelectorSubscriptionOptions<TSelected>, "equalityFn">;
declare function useGrid<TData>(options: UseGridOptions<TData>): VueGrid<TData>;
declare function useGridSelector<TData, TSelected>(grid: Grid<TData>, selector: GridSelector<TData, TSelected>, options?: UseGridSelectorOptions<TSelected>): VueGridSelector<TSelected>;

export { type UseGridOptions, type UseGridSelectorOptions, type VueGrid, type VueGridSelector, useGrid, useGridSelector };
