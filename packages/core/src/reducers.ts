import { clampColumnSize, getLeafColumns } from "./columns";
import { normalizePaginationPageIndex, normalizePaginationPageSize } from "./pipeline";
import { applyUpdater } from "./state";
import type {
  CellCoordinate,
  Column,
  ColumnId,
  ColumnFiltersState,
  ExpandedState,
  GroupingState,
  ColumnMovePosition,
  ColumnOrderState,
  ColumnPinningPosition,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  PaginationState,
  RowId,
  RowSelectionCleanupScope,
  RowSelectionState,
  SortingState,
  Updater,
} from "./types";

export const sortingReducers = {
  set: (previous: SortingState, updater: Updater<SortingState>): SortingState => applyUpdater(previous, updater),
  toggleColumn: (previous: SortingState, columnId: ColumnId, desc?: boolean, multi = false): SortingState => {
    const existing = previous.find((rule) => rule.id === columnId);
    const withoutColumn = previous.filter((rule) => rule.id !== columnId);

    if (!existing) {
      const nextRule = { id: columnId, desc: desc ?? false };
      return multi ? [...previous, nextRule] : [nextRule];
    }

    if (typeof desc === "boolean") {
      const nextRule = { id: columnId, desc };
      return multi ? [...withoutColumn, nextRule] : [nextRule];
    }

    if (!existing.desc) {
      const nextRule = { id: columnId, desc: true };
      return multi ? [...withoutColumn, nextRule] : [nextRule];
    }

    return multi ? withoutColumn : [];
  },
};

export const filterReducers = {
  setColumnFilters: (
    previous: ColumnFiltersState,
    updater: Updater<ColumnFiltersState>,
  ): ColumnFiltersState => applyUpdater(previous, updater),
  setGlobalFilter: (previous: string, updater: Updater<string>): string => applyUpdater(previous, updater),
};

export const groupingReducers = {
  set: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: GroupingState,
    updater: Updater<GroupingState>,
  ): GroupingState => normalizeGrouping(columns, applyUpdater(previous, updater)),
  toggleColumn: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: GroupingState,
    columnId: ColumnId,
    grouped?: boolean,
  ): GroupingState => {
    const nextGrouped = grouped ?? !previous.includes(columnId);
    const withoutColumn = previous.filter((candidate) => candidate !== columnId);
    return normalizeGrouping(columns, nextGrouped ? [...withoutColumn, columnId] : withoutColumn);
  },
  moveColumn: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: GroupingState,
    columnId: ColumnId,
    targetColumnId: ColumnId,
    position: ColumnMovePosition,
  ): GroupingState => {
    if (columnId === targetColumnId) {
      return normalizeGrouping(columns, previous);
    }

    const currentGrouping = normalizeGrouping(columns, previous);

    if (!currentGrouping.includes(columnId) || !currentGrouping.includes(targetColumnId)) {
      return currentGrouping;
    }

    const withoutColumn = currentGrouping.filter((candidate) => candidate !== columnId);
    const targetIndex = withoutColumn.indexOf(targetColumnId);
    const nextIndex = position === "after" ? targetIndex + 1 : targetIndex;
    withoutColumn.splice(nextIndex, 0, columnId);

    return normalizeGrouping(columns, withoutColumn);
  },
  reset: (): GroupingState => [],
};

export const expandedReducers = {
  set: <TData>(
    rows: readonly { id: RowId; getCanExpand?: () => boolean }[],
    previous: ExpandedState,
    updater: Updater<ExpandedState>,
  ): ExpandedState => normalizeExpanded(rows, applyUpdater(previous, updater)),
  toggleRow: <TData>(
    rows: readonly { id: RowId; getCanExpand?: () => boolean }[],
    previous: ExpandedState,
    rowId: RowId,
    expanded?: boolean,
  ): ExpandedState => {
    const nextExpanded = expanded ?? !previous[rowId];
    return normalizeExpanded(rows, {
      ...previous,
      [rowId]: nextExpanded,
    });
  },
  toggleRows: <TData>(
    rows: readonly { id: RowId; getCanExpand?: () => boolean }[],
    previous: ExpandedState,
    expanded?: boolean,
  ): ExpandedState => {
    const expandableRows = rows.filter((row) => row.getCanExpand?.());
    const nextExpanded = expanded ?? !expandableRows.every((row) => previous[row.id]);
    const next: ExpandedState = { ...previous };

    for (const row of expandableRows) {
      next[row.id] = nextExpanded;
    }

    return normalizeExpanded(rows, next);
  },
  reset: (): ExpandedState => ({}),
};

export const paginationReducers = {
  set: (previous: PaginationState, updater: Updater<PaginationState>): PaginationState =>
    normalizePaginationState(applyUpdater(previous, updater)),
  setPageIndex: (previous: PaginationState, pageIndex: number): PaginationState => ({ ...previous, pageIndex: normalizePaginationPageIndex(pageIndex) }),
  setPageSize: (previous: PaginationState, pageSize: number): PaginationState => ({ ...previous, pageSize: normalizePaginationPageSize(pageSize), pageIndex: 0 }),
};

function normalizePaginationState(state: PaginationState): PaginationState {
  return {
    pageIndex: normalizePaginationPageIndex(state.pageIndex),
    pageSize: normalizePaginationPageSize(state.pageSize),
  };
}

export const rowSelectionReducers = {
  toggleRow: (previous: RowSelectionState, rowId: RowId, selected?: boolean): RowSelectionState => {
    const next = { ...previous };
    const nextSelected = selected ?? !previous[rowId];

    if (nextSelected) {
      next[rowId] = true;
    } else {
      delete next[rowId];
    }

    return next;
  },
  toggleRows: (previous: RowSelectionState, rowIds: readonly RowId[], selected?: boolean): RowSelectionState => {
    const next = { ...previous };
    const nextSelected = selected ?? !rowIds.every((rowId) => previous[rowId]);

    for (const rowId of rowIds) {
      if (nextSelected) {
        next[rowId] = true;
      } else {
        delete next[rowId];
      }
    }

    return next;
  },
  prune: (previous: RowSelectionState, rowIds: readonly RowId[]): RowSelectionState => {
    const retainedRowIds = new Set(rowIds);
    const next: RowSelectionState = {};

    for (const [rowId, selected] of Object.entries(previous)) {
      if (selected && retainedRowIds.has(rowId)) {
        next[rowId] = true;
      }
    }

    return next;
  },
  reset: (): RowSelectionState => ({}),
};

export function getRowIdsForSelectionCleanup<TData>(
  scope: RowSelectionCleanupScope,
  models: {
    loaded: { rows: readonly { id: RowId }[] };
    filtered: { rows: readonly { id: RowId }[] };
    page: { rows: readonly { id: RowId }[] };
  },
): RowId[] {
  const model = scope === "page" ? models.page : scope === "filtered" ? models.filtered : models.loaded;
  return model.rows.map((row) => row.id);
}

export const columnVisibilityReducers = {
  set: (
    previous: ColumnVisibilityState,
    updater: Updater<ColumnVisibilityState>,
  ): ColumnVisibilityState => normalizeColumnVisibility(applyUpdater(previous, updater)),
  toggleColumn: (previous: ColumnVisibilityState, columnId: ColumnId, visible?: boolean): ColumnVisibilityState => {
    const next = { ...previous };
    const nextVisible = visible ?? previous[columnId] === false;

    if (nextVisible) {
      delete next[columnId];
    } else {
      next[columnId] = false;
    }

    return normalizeColumnVisibility(next);
  },
  reset: (): ColumnVisibilityState => ({}),
};

export const columnSizingReducers = {
  set: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: ColumnSizingState,
    updater: Updater<ColumnSizingState>,
  ): ColumnSizingState => normalizeColumnSizing(columns, applyUpdater(previous, updater)),
  setColumnSize: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: ColumnSizingState,
    columnId: ColumnId,
    size: number,
  ): ColumnSizingState =>
    normalizeColumnSizing(columns, {
      ...previous,
      [columnId]: size,
    }),
  reset: (): ColumnSizingState => ({}),
};

export const columnOrderReducers = {
  set: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: ColumnOrderState,
    updater: Updater<ColumnOrderState>,
  ): ColumnOrderState => normalizeColumnOrder(columns, applyUpdater(previous, updater)),
  moveColumn: <TData>(
    columns: readonly Column<TData, unknown>[],
    previous: ColumnOrderState,
    columnId: ColumnId,
    targetColumnId: ColumnId,
    position: ColumnMovePosition,
  ): ColumnOrderState => {
    if (columnId === targetColumnId) {
      return normalizeColumnOrder(columns, previous);
    }

    const currentOrder = orderLeafColumns(columns, previous).map((column) => column.id);

    if (!currentOrder.includes(columnId) || !currentOrder.includes(targetColumnId)) {
      return normalizeColumnOrder(columns, previous);
    }

    const withoutColumn = currentOrder.filter((candidate) => candidate !== columnId);
    const targetIndex = withoutColumn.indexOf(targetColumnId);
    const nextIndex = position === "after" ? targetIndex + 1 : targetIndex;
    withoutColumn.splice(nextIndex, 0, columnId);

    return normalizeColumnOrder(columns, withoutColumn);
  },
  reset: (): ColumnOrderState => [],
};

export const columnPinningReducers = {
  set: (previous: ColumnPinningState, updater: Updater<ColumnPinningState>): ColumnPinningState =>
    normalizeColumnPinning(applyUpdater(previous, updater)),
  pinColumn: (previous: ColumnPinningState, columnId: ColumnId, position: ColumnPinningPosition): ColumnPinningState => {
    const withoutColumn: ColumnPinningState = {
      left: previous.left.filter((candidate) => candidate !== columnId),
      right: previous.right.filter((candidate) => candidate !== columnId),
    };

    if (position === "left") {
      return normalizeColumnPinning({
        ...withoutColumn,
        left: [...withoutColumn.left, columnId],
      });
    }

    if (position === "right") {
      return normalizeColumnPinning({
        ...withoutColumn,
        right: [...withoutColumn.right, columnId],
      });
    }

    return normalizeColumnPinning(withoutColumn);
  },
  reset: (): ColumnPinningState => ({ left: [], right: [] }),
};

export const focusReducers = {
  set: (_previous: CellCoordinate | null, coordinate: CellCoordinate | null): CellCoordinate | null => coordinate,
  reset: (): CellCoordinate | null => null,
};

export function orderLeafColumns<TData>(
  columns: readonly Column<TData, unknown>[],
  columnOrder: readonly ColumnId[],
): Column<TData, unknown>[] {
  if (columnOrder.length === 0) {
    return [...columns];
  }

  const byId = new Map(columns.map((column) => [column.id, column]));
  const ordered = columnOrder.flatMap((columnId) => {
    const column = byId.get(columnId);
    return column ? [column] : [];
  });
  const orderedIds = new Set(ordered.map((column) => column.id));
  const remaining = columns.filter((column) => !orderedIds.has(column.id));

  return [...ordered, ...remaining];
}

export function getOrderableLeafColumns<TData>(columns: readonly Column<TData, unknown>[]): Column<TData, unknown>[] {
  return getLeafColumns(columns);
}

function normalizeColumnVisibility(visibility: ColumnVisibilityState): ColumnVisibilityState {
  const next: ColumnVisibilityState = {};

  for (const [columnId, visible] of Object.entries(visibility)) {
    if (visible === false) {
      next[columnId] = false;
    }
  }

  return next;
}

function normalizeColumnSizing<TData>(
  columns: readonly Column<TData, unknown>[],
  sizing: ColumnSizingState,
): ColumnSizingState {
  const next: ColumnSizingState = {};
  const columnById = new Map(columns.map((column) => [column.id, column]));

  for (const [columnId, size] of Object.entries(sizing)) {
    if (!Number.isFinite(size)) {
      continue;
    }

    const column = columnById.get(columnId);

    if (!column) {
      continue;
    }

    next[columnId] = clampColumnSize(size, column.columnDef);
  }

  return next;
}

function normalizeColumnOrder<TData>(
  columns: readonly Column<TData, unknown>[],
  columnOrder: readonly ColumnId[],
): ColumnOrderState {
  const availableColumnIds = new Set(columns.map((column) => column.id));
  const next: ColumnOrderState = [];

  for (const columnId of columnOrder) {
    if (availableColumnIds.has(columnId) && !next.includes(columnId)) {
      next.push(columnId);
    }
  }

  return next;
}

function normalizeGrouping<TData>(
  columns: readonly Column<TData, unknown>[],
  grouping: readonly ColumnId[],
): GroupingState {
  const groupableColumnIds = new Set(columns.filter((column) => column.getCanGroup()).map((column) => column.id));
  const next: GroupingState = [];

  for (const columnId of grouping) {
    if (groupableColumnIds.has(columnId) && !next.includes(columnId)) {
      next.push(columnId);
    }
  }

  return next;
}

function normalizeExpanded<TData>(
  rows: readonly { id: RowId; getCanExpand?: () => boolean }[],
  expanded: ExpandedState,
): ExpandedState {
  const expandableRowIds = new Set(rows.filter((row) => row.getCanExpand?.()).map((row) => row.id));
  const next: ExpandedState = {};

  for (const [rowId, isExpanded] of Object.entries(expanded)) {
    if (isExpanded === true && expandableRowIds.has(rowId)) {
      next[rowId] = true;
    }
  }

  return next;
}

function normalizeColumnPinning(pinning: ColumnPinningState): ColumnPinningState {
  const left = uniqueColumnIds(pinning.left);
  const leftSet = new Set(left);
  const right = uniqueColumnIds(pinning.right).filter((columnId) => !leftSet.has(columnId));

  return { left, right };
}

function uniqueColumnIds(columnIds: readonly ColumnId[]): ColumnId[] {
  return Array.from(new Set(columnIds));
}
