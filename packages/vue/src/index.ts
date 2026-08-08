import {
  createGrid,
  type Grid,
  type GridOptions,
  type GridSelector,
  type GridSelectorSubscriptionOptions,
} from "@open-grid/core";
import {
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  triggerRef,
  watchEffect,
  type MaybeRefOrGetter,
  type ShallowRef,
} from "vue";

export interface VueGrid<TData> {
  grid: Grid<TData>;
  state: ShallowRef<ReturnType<Grid<TData>["getState"]>>;
  dispose: () => void;
}

export type UseGridOptions<TData> = MaybeRefOrGetter<GridOptions<TData>>;

export interface VueGridSelector<TSelected> {
  selected: ShallowRef<TSelected>;
  dispose: () => void;
}

export type UseGridSelectorOptions<TSelected> = Pick<GridSelectorSubscriptionOptions<TSelected>, "equalityFn">;

export function useGrid<TData>(options: UseGridOptions<TData>): VueGrid<TData> {
  const grid = createGrid(toValue(options));
  const state = shallowRef(grid.getState());

  const unsubscribe = grid.subscribe(() => {
    state.value = grid.getState();
    triggerRef(state);
  });
  const stopOptions = watchEffect(() => {
    grid.setOptions(toValue(options), { notify: false });
    state.value = grid.getState();
    triggerRef(state);
  });
  const dispose = () => {
    stopOptions();
    unsubscribe();
  };

  if (getCurrentScope()) {
    onScopeDispose(dispose);
  }

  return {
    grid,
    state,
    dispose,
  };
}

export function useGridSelector<TData, TSelected>(
  grid: Grid<TData>,
  selector: GridSelector<TData, TSelected>,
  options?: UseGridSelectorOptions<TSelected>,
): VueGridSelector<TSelected> {
  const selected = shallowRef(selector(grid)) as ShallowRef<TSelected>;
  const dispose = grid.subscribeSelector(
    selector,
    (nextValue) => {
      if (Object.is(selected.value, nextValue)) {
        triggerRef(selected);
      } else {
        selected.value = nextValue;
      }
    },
    options,
  );

  if (getCurrentScope()) {
    onScopeDispose(dispose);
  }

  return { selected, dispose };
}

export { createGrid };
export { createColumnHelper, fitColumnsToWidth } from "@open-grid/core";
export type {
  AccessorKey,
  AccessorColumnOptions,
  AccessorFnColumnDef,
  AccessorKeyColumnDef,
  AnyColumnDef,
  CellContext,
  CellCoordinate,
  CellEditEvent,
  CellEditEventParams,
  CellEditHistoryAction,
  CellEditHistoryState,
  CellEditPhase,
  CellEditParserContext,
  CellEditingState,
  CellFillOptions,
  CellInteractionEvent,
  CellInteractionEventParams,
  CellRange,
  CellRangeSelectionState,
  ClipboardCellContext,
  ClipboardCopyOptions,
  ClipboardPasteOptions,
  Column,
  ColumnDef,
  ColumnHelper,
  ColumnFilter,
  ColumnFiltersState,
  ColumnId,
  ColumnMovePosition,
  ColumnOrderState,
  ColumnPinningPosition,
  ColumnPinningState,
  ColumnResizeEvent,
  ColumnResizeEventParams,
  ColumnResizePhase,
  ColumnSizingState,
  ColumnVisibilityState,
  DisplayColumnDef,
  ExpandedState,
  FitColumnsToWidthOptions,
  FilterFn,
  Grid,
  GridCacheDiagnostics,
  GridCacheDiagnosticsEntry,
  GridCacheKey,
  GridOptions,
  GridSelector,
  GridSelectorListener,
  GridSelectorSubscriptionOptions,
  GridState,
  GroupingState,
  Header,
  HeaderGroup,
  GroupColumnDef,
  HeaderContext,
  MoveFocusOptions,
  PaginationState,
  Row,
  RowId,
  RowInteractionEvent,
  RowInteractionEventParams,
  RowModel,
  RowSelectionCleanupScope,
  RowSelectionState,
  SortFn,
  SortingRule,
  SortingState,
  Updater,
} from "@open-grid/core";
