import type { ColumnLayout } from "@open-grid/core";

export interface ColumnRenderIdentity<TColumn> {
  column: TColumn;
  columnIndex: number;
  layout: ColumnLayout;
}

export interface VirtualRowRenderKey {
  rowId: string;
  key: number;
}

export function reconcileColumnRenderItems<
  TColumn,
  TInput extends ColumnRenderIdentity<TColumn>,
  TOutput extends TInput,
>(
  previousItems: readonly TOutput[],
  nextItems: readonly TInput[],
  createItem: (input: TInput) => TOutput,
): TOutput[] {
  const previousById = new Map(previousItems.map((item) => [item.layout.id, item]));

  return nextItems.map((input) => {
    const previous = previousById.get(input.layout.id);
    return previous && canReuseColumnRenderItem(previous, input)
      ? previous
      : createItem(input);
  });
}

export function canReuseColumnRenderItem<TColumn>(
  previous: ColumnRenderIdentity<TColumn>,
  next: ColumnRenderIdentity<TColumn>,
): boolean {
  return previous.column === next.column
    && previous.columnIndex === next.columnIndex
    && equalColumnLayout(previous.layout, next.layout);
}

export function reconcileVirtualRowRenderKeys(
  previousItems: readonly VirtualRowRenderKey[],
  nextRowIds: readonly string[],
): VirtualRowRenderKey[] {
  const nextRowIdSet = new Set(nextRowIds);
  const previousByRowId = new Map(previousItems.map((item) => [item.rowId, item]));
  const availableKeys = previousItems
    .filter((item) => !nextRowIdSet.has(item.rowId))
    .map((item) => item.key);
  let nextKey = previousItems.reduce((maximum, item) => Math.max(maximum, item.key), -1) + 1;
  let availableIndex = 0;

  return nextRowIds.map((rowId) => {
    const previous = previousByRowId.get(rowId);
    if (previous) return previous;
    const availableKey = availableKeys[availableIndex];
    if (availableKey !== undefined) {
      availableIndex += 1;
      return { rowId, key: availableKey };
    }
    const item = { rowId, key: nextKey };
    nextKey += 1;
    return item;
  });
}

function equalColumnLayout(previous: ColumnLayout, next: ColumnLayout): boolean {
  return previous === next
    || (
      previous.id === next.id
      && previous.size === next.size
      && previous.start === next.start
      && previous.end === next.end
      && previous.pinned === next.pinned
      && previous.pinnedStart === next.pinnedStart
      && previous.pinnedEdge === next.pinnedEdge
    );
}
