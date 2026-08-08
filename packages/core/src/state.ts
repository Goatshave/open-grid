import type { GridState, Updater } from "./types";

export const defaultState: GridState = {
  sorting: [],
  columnFilters: [],
  globalFilter: "",
  grouping: [],
  expanded: {},
  pagination: {
    pageIndex: 0,
    pageSize: 25,
  },
  rowSelection: {},
  allRowsSelected: false,
  columnVisibility: {},
  columnSizing: {},
  columnOrder: [],
  columnPinning: {
    left: [],
    right: [],
  },
  focusedCell: null,
  editingCell: null,
  cellSelectionRange: null,
};

export function mergeState(...states: Array<Partial<GridState> | undefined>): GridState {
  let merged = defaultState;
  for (const state of states) {
    if (state) merged = mergeStateFromBase(merged, state);
  }
  return merged;
}

export function mergeStateFromBase(base: GridState, state: Partial<GridState>): GridState {
  return {
    ...base,
    ...state,
    pagination: state.pagination ? mergeRecord(base.pagination, state.pagination) : base.pagination,
    columnPinning: state.columnPinning ? mergeRecord(base.columnPinning, state.columnPinning) : base.columnPinning,
  };
}

function mergeRecord<T extends object>(current: T, partial: Partial<T>): T {
  for (const key of Object.keys(partial) as Array<keyof T>) {
    if (!Object.is(current[key], partial[key])) {
      return { ...current, ...partial };
    }
  }
  return current;
}

export function applyUpdater<T>(previous: T, updater: Updater<T>): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(previous) : updater;
}
