export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualRangeOptions {
  count: number;
  viewportSize: number;
  scrollOffset: number;
  estimateSize: number | ((index: number) => number);
  overscan?: number;
}

export interface VirtualRowRangeOptions {
  count: number;
  scrollFrame: ScrollFrame;
  enabled: boolean;
  estimateSize: number | ((index: number) => number);
  overscan?: number;
}

export interface VirtualRange {
  totalSize: number;
  startIndex: number;
  endIndex: number;
  items: VirtualItem[];
}

export interface VirtualRowItem<TRow> {
  row: TRow;
  rowIndex: number;
  virtualItem: VirtualItem | null;
}

export interface ScrollFrameOptions {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  stickyTopOffset?: number;
}

export interface ScrollFrame {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ColumnVirtualLayoutItem {
  id: string;
  start: number;
  end: number;
  size: number;
  pinned: false | "left" | "right";
  pinnedStart?: number;
  pinnedEdge?: "left" | "right";
}

export type ColumnRenderItem<TLayout extends ColumnVirtualLayoutItem = ColumnVirtualLayoutItem> =
  | {
      type: "column";
      layout: TLayout;
    }
  | {
      type: "spacer";
      id: string;
      size: number;
    };

export interface ColumnCellRenderItem<TLayout extends ColumnVirtualLayoutItem = ColumnVirtualLayoutItem> {
  layout: TLayout;
  beforeSpacerSize: number;
  afterSpacerSize: number;
}

export interface HeaderRenderHeaderLike {
  id: string;
  leafColumnIds: readonly string[];
}

export interface HeaderRenderGroupLike<THeader extends HeaderRenderHeaderLike> {
  headers: readonly THeader[];
}

export interface FocusedCellRenderWindowLike {
  rowId: string;
  columnId: string;
}

export type HeaderRenderItem<THeader extends HeaderRenderHeaderLike = HeaderRenderHeaderLike> =
  | {
      type: "header";
      header: THeader;
      size: number;
      leafColumnIds: string[];
    }
  | {
      type: "spacer";
      id: string;
      size: number;
    };

export function isColumnRenderSpacerItem<TItem extends ColumnRenderItem>(
  item: TItem,
): item is Extract<TItem, { type: "spacer" }> {
  return item.type === "spacer";
}

export function isHeaderRenderSpacerItem<TItem extends HeaderRenderItem>(
  item: TItem,
): item is Extract<TItem, { type: "spacer" }> {
  return item.type === "spacer";
}

export function getColumnRenderItemKey<TLayout extends ColumnVirtualLayoutItem>(item: ColumnRenderItem<TLayout>): string {
  return isColumnRenderSpacerItem(item) ? item.id : item.layout.id;
}

export function getColumnCellRenderItems<TLayout extends ColumnVirtualLayoutItem>(
  items: readonly ColumnRenderItem<TLayout>[],
): ColumnCellRenderItem<TLayout>[] {
  const columns: TLayout[] = [];
  let beforeSpacerSize = 0;
  let afterSpacerSize = 0;

  for (const item of items) {
    if (!isColumnRenderSpacerItem(item)) {
      columns.push(item.layout);
    } else if (item.id === "center-before") {
      beforeSpacerSize = item.size;
    } else if (item.id === "center-after") {
      afterSpacerSize = item.size;
    }
  }

  const firstCenterIndex = columns.findIndex((layout) => layout.pinned === false);
  let lastCenterIndex = -1;

  for (let index = columns.length - 1; index >= 0; index -= 1) {
    if (columns[index]?.pinned === false) {
      lastCenterIndex = index;
      break;
    }
  }

  return columns.map((layout, index) => ({
    layout,
    beforeSpacerSize: index === firstCenterIndex ? beforeSpacerSize : 0,
    afterSpacerSize: index === lastCenterIndex ? afterSpacerSize : 0,
  }));
}

export function getHeaderRenderItemKey<THeader extends HeaderRenderHeaderLike>(headerGroupId: string, item: HeaderRenderItem<THeader>): string {
  return isHeaderRenderSpacerItem(item) ? item.id : `${headerGroupId}:${item.header.id}:${item.leafColumnIds.join(",")}`;
}

export interface ColumnRenderItemsOptions {
  enabled: boolean;
  overscan: number;
}

export interface ColumnRenderItemsScrollFrame {
  scrollLeft: number;
  viewportWidth: number;
}

export type MeasuredSizeKey = string | number;

export interface MeasuredSizeCache {
  readonly version: number;
  readonly size: number;
  get: (key: MeasuredSizeKey) => number | undefined;
  set: (key: MeasuredSizeKey, size: number) => boolean;
  delete: (key: MeasuredSizeKey) => boolean;
  clear: () => boolean;
  prune: (keys: Iterable<MeasuredSizeKey>) => boolean;
  resolve: (key: MeasuredSizeKey, estimateSize: number | (() => number)) => number;
}

export interface MeasuredColumnLayoutCacheOptions {
  enabled: boolean;
  cache: Pick<MeasuredSizeCache, "get">;
  tolerance?: number;
}

export interface MeasuredColumnLayoutCacheSyncOptions {
  enabled: boolean;
  cache: Pick<MeasuredSizeCache, "clear">;
  currentSignature: string;
  nextSignature: string;
}

export interface MeasuredColumnLayoutCacheSyncResult {
  signature: string;
  changed: boolean;
}

export interface SizedColumnLayoutOptions {
  getColumnSize: (columnId: string) => number | undefined;
  getFallbackSize?: (columnId: string, fallbackSize: number) => number | undefined;
}

export function getVirtualRange(options: VirtualRangeOptions): VirtualRange {
  const { count, viewportSize, scrollOffset, overscan = 2 } = options;

  if (count <= 0) {
    return {
      totalSize: 0,
      startIndex: 0,
      endIndex: -1,
      items: [],
    };
  }

  if (typeof options.estimateSize === "number" && Number.isFinite(options.estimateSize) && options.estimateSize > 0) {
    return getFixedVirtualRange(count, viewportSize, scrollOffset, options.estimateSize, overscan);
  }

  const sizes = Array.from({ length: count }, (_, index) => resolveSize(options.estimateSize, index));
  const offsets = createOffsets(sizes);
  const totalSize = offsets[count] ?? 0;

  const visibleStart = Math.max(0, findNearestIndex(offsets, scrollOffset) - overscan);
  const viewportEnd = scrollOffset + viewportSize;
  const lastVisibleIndex = viewportSize > 0
    ? findLastIndexStartingBefore(offsets, viewportEnd)
    : findNearestIndex(offsets, scrollOffset);
  const visibleEnd = Math.min(count - 1, Math.max(visibleStart, lastVisibleIndex) + overscan);

  const items: VirtualItem[] = [];

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    const start = offsets[index] ?? 0;
    const size = sizes[index] ?? 0;
    items.push({
      index,
      start,
      size,
      end: start + size,
    });
  }

  return {
    totalSize,
    startIndex: visibleStart,
    endIndex: visibleEnd,
    items,
  };
}

function getFixedVirtualRange(
  count: number,
  viewportSize: number,
  scrollOffset: number,
  size: number,
  overscan: number,
): VirtualRange {
  const totalSize = count * size;
  const resolvedScrollOffset = Math.max(0, scrollOffset);
  const resolvedViewportEnd = Math.max(0, resolvedScrollOffset + viewportSize);
  const visibleStart = Math.max(0, Math.min(count - 1, Math.floor(resolvedScrollOffset / size)) - overscan);
  const lastVisibleIndex = viewportSize > 0
    ? Math.max(0, Math.ceil(resolvedViewportEnd / size) - 1)
    : Math.floor(resolvedScrollOffset / size);
  const visibleEnd = Math.min(count - 1, Math.max(visibleStart, lastVisibleIndex) + overscan);
  const items: VirtualItem[] = [];

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    const start = index * size;
    items.push({ index, start, size, end: start + size });
  }

  return { totalSize, startIndex: visibleStart, endIndex: visibleEnd, items };
}

export function getScrollFrame(options: ScrollFrameOptions): ScrollFrame {
  const stickyTopOffset = options.stickyTopOffset ?? 0;

  return {
    scrollTop: Math.max(0, options.scrollTop - stickyTopOffset),
    scrollLeft: Math.max(0, options.scrollLeft),
    viewportHeight: Math.max(0, options.viewportHeight - stickyTopOffset),
    viewportWidth: Math.max(0, options.viewportWidth),
  };
}

export function getInitialScrollFrame(): ScrollFrame {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    viewportHeight: 0,
    viewportWidth: 0,
  };
}

export function getVirtualRowRange(options: VirtualRowRangeOptions): VirtualRange | null {
  if (!options.enabled) {
    return null;
  }

  const rangeOptions: VirtualRangeOptions = {
    count: options.count,
    viewportSize: options.scrollFrame.viewportHeight,
    scrollOffset: options.scrollFrame.scrollTop,
    estimateSize: options.estimateSize,
  };

  if (options.overscan !== undefined) {
    rangeOptions.overscan = options.overscan;
  }

  return getVirtualRange(rangeOptions);
}

export function getVirtualRowItems<TRow>(
  rows: readonly TRow[],
  virtualRange: VirtualRange | null | undefined,
): VirtualRowItem<TRow>[] {
  if (!virtualRange) {
    return rows.map((row, rowIndex) => ({ row, rowIndex, virtualItem: null }));
  }

  return virtualRange.items.flatMap((item) => {
    const row = rows[item.index];
    return row ? [{ row, rowIndex: item.index, virtualItem: item }] : [];
  });
}

export function getIsFocusedCellInRenderWindow<TRow extends { id: string }, TLayout extends ColumnVirtualLayoutItem>(
  focusedCell: FocusedCellRenderWindowLike | null | undefined,
  visibleRowItems: readonly VirtualRowItem<TRow>[],
  columnRenderItems: readonly ColumnRenderItem<TLayout>[],
): boolean {
  if (!focusedCell) {
    return false;
  }

  return (
    visibleRowItems.some((item) => item.row.id === focusedCell.rowId) &&
    columnRenderItems.some((item) => !isColumnRenderSpacerItem(item) && item.layout.id === focusedCell.columnId)
  );
}

export function getColumnRenderItems<TLayout extends ColumnVirtualLayoutItem>(
  layout: readonly TLayout[],
  scrollFrame: ColumnRenderItemsScrollFrame,
  options: ColumnRenderItemsOptions,
): ColumnRenderItem<TLayout>[] {
  if (!options.enabled) {
    return layout.map((item) => ({ type: "column", layout: item }));
  }

  const leftPinned = layout.filter((item) => item.pinned === "left");
  const rightPinned = layout.filter((item) => item.pinned === "right");
  const center = layout.filter((item) => item.pinned === false);
  const leftPinnedSize = leftPinned.reduce((total, item) => total + item.size, 0);
  const rightPinnedSize = rightPinned.reduce((total, item) => total + item.size, 0);
  const centerStart = center[0]?.start ?? leftPinnedSize;
  const centerRange = getVirtualRange({
    count: center.length,
    viewportSize: Math.max(0, scrollFrame.viewportWidth - leftPinnedSize - rightPinnedSize),
    scrollOffset: Math.max(0, scrollFrame.scrollLeft - centerStart),
    estimateSize: (index) => center[index]?.size ?? 0,
    overscan: options.overscan,
  });
  const virtualCenter = centerRange.items.flatMap((item) => {
    const column = center[item.index];
    return column ? [column] : [];
  });
  const centerEnd = center.at(-1)?.end ?? centerStart;
  const firstVirtualCenter = virtualCenter[0];
  const lastVirtualCenter = virtualCenter.at(-1);
  const beforeCenterSize = Math.max(0, (firstVirtualCenter?.start ?? centerEnd) - centerStart);
  const afterCenterSize = Math.max(0, centerEnd - (lastVirtualCenter?.end ?? centerStart));
  const items: ColumnRenderItem<TLayout>[] = [...leftPinned.map((item) => ({ type: "column" as const, layout: item }))];

  if (beforeCenterSize > 0) {
    items.push({ type: "spacer", id: "center-before", size: beforeCenterSize });
  }

  items.push(...virtualCenter.map((item) => ({ type: "column" as const, layout: item })));

  if (afterCenterSize > 0) {
    items.push({ type: "spacer", id: "center-after", size: afterCenterSize });
  }

  items.push(...rightPinned.map((item) => ({ type: "column" as const, layout: item })));

  return items;
}

export function getHeaderRenderItems<THeader extends HeaderRenderHeaderLike, TLayout extends ColumnVirtualLayoutItem>(
  headerGroup: HeaderRenderGroupLike<THeader>,
  columnRenderItems: readonly ColumnRenderItem<TLayout>[],
  layoutById: ReadonlyMap<string, { size: number }>,
): HeaderRenderItem<THeader>[] {
  const headersByLeafId = new Map<string, THeader>();

  for (const header of headerGroup.headers) {
    for (const leafColumnId of header.leafColumnIds) {
      headersByLeafId.set(leafColumnId, header);
    }
  }

  const items: HeaderRenderItem<THeader>[] = [];
  let activeHeader: THeader | null = null;
  let activeSize = 0;
  let activeLeafColumnIds: string[] = [];

  const flushActiveHeader = () => {
    if (!activeHeader) {
      return;
    }

    items.push({
      type: "header",
      header: activeHeader,
      size: activeSize,
      leafColumnIds: activeLeafColumnIds,
    });
    activeHeader = null;
    activeSize = 0;
    activeLeafColumnIds = [];
  };

  for (const item of columnRenderItems) {
    if (isColumnRenderSpacerItem(item)) {
      flushActiveHeader();
      items.push(item);
      continue;
    }

    const header = headersByLeafId.get(item.layout.id);

    if (!header) {
      continue;
    }

    const size = layoutById.get(item.layout.id)?.size ?? item.layout.size;

    if (activeHeader?.id !== header.id) {
      flushActiveHeader();
      activeHeader = header;
    }

    activeSize += size;
    activeLeafColumnIds.push(item.layout.id);
  }

  flushActiveHeader();
  return items;
}

export function getMeasuredColumnLayout<TLayout extends ColumnVirtualLayoutItem>(
  layout: readonly TLayout[],
  resolveSize: (columnId: string, fallbackSize: number) => number,
): TLayout[] {
  const leftPinned = layout.filter((item) => item.pinned === "left");
  const rightPinned = layout.filter((item) => item.pinned === "right");
  const lastLeftPinnedId = leftPinned.at(-1)?.id;
  const firstRightPinnedId = rightPinned[0]?.id;
  const measuredSizes = new Map(layout.map((item) => [item.id, resolveSize(item.id, item.size)]));
  const rightOffsets = new Map<string, number>();
  let rightOffset = 0;

  for (const item of [...rightPinned].reverse()) {
    rightOffsets.set(item.id, rightOffset);
    rightOffset += measuredSizes.get(item.id) ?? item.size;
  }

  let start = 0;
  let leftOffset = 0;

  return layout.map((item) => {
    const size = measuredSizes.get(item.id) ?? item.size;
    const measured: ColumnVirtualLayoutItem = {
      id: item.id,
      size,
      start,
      end: start + size,
      pinned: item.pinned,
    };

    if (item.pinned === "left") {
      measured.pinnedStart = leftOffset;
      leftOffset += size;

      if (item.id === lastLeftPinnedId) {
        measured.pinnedEdge = "left";
      }
    } else if (item.pinned === "right") {
      measured.pinnedStart = rightOffsets.get(item.id) ?? 0;

      if (item.id === firstRightPinnedId) {
        measured.pinnedEdge = "right";
      }
    }

    start += size;
    return measured as TLayout;
  });
}

export function getSizedColumnLayout<TLayout extends ColumnVirtualLayoutItem>(
  layout: readonly TLayout[],
  options: SizedColumnLayoutOptions,
): TLayout[] {
  return getMeasuredColumnLayout(
    layout,
    (columnId, fallbackSize) =>
      options.getColumnSize(columnId) ?? options.getFallbackSize?.(columnId, fallbackSize) ?? fallbackSize,
  );
}

export function getMeasuredColumnLayoutFromCache<TLayout extends ColumnVirtualLayoutItem>(
  layout: readonly TLayout[],
  options: MeasuredColumnLayoutCacheOptions,
): TLayout[] {
  const tolerance = options.tolerance ?? 1;

  return getMeasuredColumnLayout(layout, (columnId, fallbackSize) => {
    const measuredSize = options.enabled ? options.cache.get(columnId) : undefined;
    return measuredSize !== undefined && Math.abs(measuredSize - fallbackSize) <= tolerance
      ? measuredSize
      : fallbackSize;
  });
}

export function getColumnLayoutMeasurementSignature(layout: readonly ColumnVirtualLayoutItem[]): string {
  return layout
    .map((item) => `${item.id}:${item.size}:${item.pinned}:${item.pinnedStart ?? ""}:${item.pinnedEdge ?? ""}`)
    .join("|");
}

export function syncMeasuredColumnLayoutCache(
  options: MeasuredColumnLayoutCacheSyncOptions,
): MeasuredColumnLayoutCacheSyncResult {
  if (!options.enabled) {
    return {
      signature: options.nextSignature,
      changed: false,
    };
  }

  if (options.currentSignature === options.nextSignature) {
    return {
      signature: options.currentSignature,
      changed: false,
    };
  }

  return {
    signature: options.nextSignature,
    changed: options.cache.clear(),
  };
}

export function createMeasuredSizeCache(): MeasuredSizeCache {
  const sizes = new Map<MeasuredSizeKey, number>();
  let version = 0;

  const bump = () => {
    version += 1;
  };

  return {
    get version() {
      return version;
    },
    get size() {
      return sizes.size;
    },
    get: (key) => sizes.get(key),
    set: (key, size) => {
      if (!Number.isFinite(size) || size <= 0) {
        return false;
      }

      if (sizes.get(key) === size) {
        return false;
      }

      sizes.set(key, size);
      bump();
      return true;
    },
    delete: (key) => {
      const deleted = sizes.delete(key);

      if (deleted) {
        bump();
      }

      return deleted;
    },
    clear: () => {
      if (sizes.size === 0) {
        return false;
      }

      sizes.clear();
      bump();
      return true;
    },
    prune: (keys) => {
      const available = new Set(keys);
      let changed = false;

      for (const key of sizes.keys()) {
        if (!available.has(key)) {
          sizes.delete(key);
          changed = true;
        }
      }

      if (changed) {
        bump();
      }

      return changed;
    },
    resolve: (key, estimateSize) => sizes.get(key) ?? (typeof estimateSize === "function" ? estimateSize() : estimateSize),
  };
}

export function createMeasuredSizeResolver(
  cache: MeasuredSizeCache,
  getKey: (index: number) => MeasuredSizeKey,
  estimateSize: number | ((index: number) => number),
): (index: number) => number {
  return (index) =>
    cache.resolve(getKey(index), typeof estimateSize === "function" ? () => estimateSize(index) : estimateSize);
}

function resolveSize(estimateSize: number | ((index: number) => number), index: number): number {
  return typeof estimateSize === "function" ? estimateSize(index) : estimateSize;
}

function createOffsets(sizes: readonly number[]): number[] {
  const offsets = [0];

  for (const size of sizes) {
    offsets.push((offsets[offsets.length - 1] ?? 0) + size);
  }

  return offsets;
}

function findNearestIndex(offsets: readonly number[], value: number): number {
  let low = 0;
  let high = Math.max(0, offsets.length - 2);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = offsets[mid] ?? 0;
    const end = offsets[mid + 1] ?? start;

    if (value >= start && value < end) {
      return mid;
    }

    if (value < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, Math.min(offsets.length - 2, low));
}

function findLastIndexStartingBefore(offsets: readonly number[], value: number): number {
  let low = 0;
  let high = Math.max(0, offsets.length - 2);
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if ((offsets[mid] ?? 0) < value) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}
