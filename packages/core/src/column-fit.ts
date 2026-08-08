import { clampColumnSize } from "./columns";
import type { ColumnSizingState, FitColumnsToWidthOptions, Grid } from "./types";

export function fitColumnsToWidth<TData>(
  grid: Grid<TData>,
  width: number,
  options: FitColumnsToWidthOptions = {},
): void {
  if (!Number.isFinite(width) || width < 0) {
    throw new RangeError("width must be a non-negative finite number");
  }

  const selectedColumnIds = options.columnIds ? new Set(options.columnIds) : null;
  const pending = grid.getVisibleLeafColumns()
    .filter((column) => selectedColumnIds ? selectedColumnIds.has(column.id) : true)
    .map((column) => ({
      column,
      baseSize: column.getSize(),
      minSize: clampColumnSize(Number.NEGATIVE_INFINITY, column.columnDef),
      maxSize: clampColumnSize(Number.POSITIVE_INFINITY, column.columnDef),
    }));
  if (pending.length === 0) return;

  const fittedSizing: ColumnSizingState = {};
  let remainingWidth = width;
  while (pending.length > 0) {
    const baseTotal = pending.reduce((total, item) => total + item.baseSize, 0);
    const scale = baseTotal > 0 ? remainingWidth / baseTotal : 0;
    const boundedIndexes: number[] = [];

    for (let index = 0; index < pending.length; index += 1) {
      const item = pending[index]!;
      const scaledSize = item.baseSize * scale;
      const boundedSize = scaledSize < item.minSize
        ? item.minSize
        : scaledSize > item.maxSize
          ? item.maxSize
          : undefined;
      if (boundedSize === undefined) continue;
      fittedSizing[item.column.id] = boundedSize;
      remainingWidth -= boundedSize;
      boundedIndexes.push(index);
    }

    if (boundedIndexes.length === 0) {
      for (const item of pending) fittedSizing[item.column.id] = item.baseSize * scale;
      break;
    }
    for (let index = boundedIndexes.length - 1; index >= 0; index -= 1) {
      pending.splice(boundedIndexes[index]!, 1);
    }
  }

  grid.setColumnSizing((previous) => ({ ...previous, ...fittedSizing }));
}
