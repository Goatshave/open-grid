import {
  createGrid,
  type Grid,
  type GridOptions,
  type GridSelector,
  type GridSelectorSubscriptionOptions,
} from "@open-grid/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

export type UseGridOptions<TData> = GridOptions<TData>;

export function useGrid<TData>(options: UseGridOptions<TData>): Grid<TData> {
  const gridRef = useRef<Grid<TData> | null>(null);

  if (!gridRef.current) {
    gridRef.current = createGrid(options);
  }

  const grid = gridRef.current;

  grid.setOptions(options, { notify: false });

  useSyncExternalStore(
    grid.subscribe,
    () => grid.getState(),
    () => grid.getState(),
  );

  return grid;
}

export function useGridSelector<TData, TSelected>(
  grid: Grid<TData>,
  selector: GridSelector<TData, TSelected>,
  equalityFn: NonNullable<GridSelectorSubscriptionOptions<TSelected>["equalityFn"]> = Object.is,
): TSelected {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  const cacheRef = useRef<{ grid: Grid<TData>; value: TSelected } | null>(null);
  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  const selectedValue = selector(grid);
  const cached = cacheRef.current;

  if (!cached || cached.grid !== grid || !equalityFn(cached.value, selectedValue)) {
    cacheRef.current = { grid, value: selectedValue };
  }

  const subscribe = useCallback(
    (notify: () => void) =>
      grid.subscribeSelector(
        (currentGrid) => selectorRef.current(currentGrid),
        (nextValue) => {
          const currentCache = cacheRef.current;

          if (!currentCache || currentCache.grid !== grid || !equalityRef.current(currentCache.value, nextValue)) {
            cacheRef.current = { grid, value: nextValue };
            notify();
          }
        },
        {
          equalityFn: (previous, next) => equalityRef.current(previous, next),
        },
      ),
    [grid],
  );
  const getSnapshot = useCallback(() => cacheRef.current?.value as TSelected, [grid]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
  CellFillOptions,
  ClipboardCellContext,
  ClipboardCopyOptions,
  ClipboardPasteOptions,
  CellInteractionEvent,
  CellInteractionEventParams,
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
