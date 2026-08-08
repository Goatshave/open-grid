import {
  createGrid,
  type Grid,
  type GridOptions,
  type GridSelector,
  type GridSelectorSubscriptionOptions,
  type GridState,
  type Updater,
} from "@open-grid/core";
import { get, readable, type Readable } from "svelte/store";

export interface SvelteGrid<TData> {
  grid: Grid<TData>;
  state: Readable<GridState>;
  setOptions: (updater: Updater<GridOptions<TData>>, options?: { notify?: boolean }) => void;
  dispose: () => void;
}

export type SvelteGridOptions<TData> = GridOptions<TData> | Readable<GridOptions<TData>>;
export type SvelteGridSelectorOptions<TSelected> = Pick<GridSelectorSubscriptionOptions<TSelected>, "equalityFn">;

export function createGridStore<TData>(options: SvelteGridOptions<TData>): SvelteGrid<TData> {
  const optionStore = isReadable(options) ? options : null;
  const initialOptions: GridOptions<TData> = optionStore ? get(optionStore) : (options as GridOptions<TData>);
  const grid = createGrid(initialOptions);
  let setState: ((state: GridState) => void) | null = null;
  const unsubscribeOptions = optionStore?.subscribe((nextOptions) => {
    grid.setOptions(nextOptions, { notify: false });
    setState?.(grid.getState());
  });
  const state = readable(grid.getState(), (set) => {
    setState = set;
    set(grid.getState());
    const unsubscribeGrid = grid.subscribe(() => set(grid.getState()));

    return () => {
      setState = null;
      unsubscribeGrid();
    };
  });
  const setOptions: SvelteGrid<TData>["setOptions"] = (updater, setOptionsOptions) => {
    grid.setOptions(updater, setOptionsOptions);
    setState?.(grid.getState());
  };
  const dispose = () => {
    unsubscribeOptions?.();
  };

  return {
    grid,
    state,
    setOptions,
    dispose,
  };
}

export function createGridSelectorStore<TData, TSelected>(
  grid: Grid<TData>,
  selector: GridSelector<TData, TSelected>,
  options?: SvelteGridSelectorOptions<TSelected>,
): Readable<TSelected> {
  return readable(selector(grid), (set) => grid.subscribeSelector(selector, set, options));
}

function isReadable<TValue>(value: unknown): value is Readable<TValue> {
  return typeof value === "object" && value !== null && "subscribe" in value && typeof value.subscribe === "function";
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
