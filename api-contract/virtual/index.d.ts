interface VirtualItem {
    index: number;
    start: number;
    size: number;
    end: number;
}
interface VirtualRangeOptions {
    count: number;
    viewportSize: number;
    scrollOffset: number;
    estimateSize: number | ((index: number) => number);
    overscan?: number;
}
interface VirtualRowRangeOptions {
    count: number;
    scrollFrame: ScrollFrame;
    enabled: boolean;
    estimateSize: number | ((index: number) => number);
    overscan?: number;
}
interface VirtualRange {
    totalSize: number;
    startIndex: number;
    endIndex: number;
    items: VirtualItem[];
}
interface VirtualRowItem<TRow> {
    row: TRow;
    rowIndex: number;
    virtualItem: VirtualItem | null;
}
interface ScrollFrameOptions {
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    stickyTopOffset?: number;
}
interface ScrollFrame {
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
}
interface ColumnVirtualLayoutItem {
    id: string;
    start: number;
    end: number;
    size: number;
    pinned: false | "left" | "right";
    pinnedStart?: number;
    pinnedEdge?: "left" | "right";
}
type ColumnRenderItem<TLayout extends ColumnVirtualLayoutItem = ColumnVirtualLayoutItem> = {
    type: "column";
    layout: TLayout;
} | {
    type: "spacer";
    id: string;
    size: number;
};
interface ColumnCellRenderItem<TLayout extends ColumnVirtualLayoutItem = ColumnVirtualLayoutItem> {
    layout: TLayout;
    beforeSpacerSize: number;
    afterSpacerSize: number;
}
interface HeaderRenderHeaderLike {
    id: string;
    leafColumnIds: readonly string[];
}
interface HeaderRenderGroupLike<THeader extends HeaderRenderHeaderLike> {
    headers: readonly THeader[];
}
interface FocusedCellRenderWindowLike {
    rowId: string;
    columnId: string;
}
type HeaderRenderItem<THeader extends HeaderRenderHeaderLike = HeaderRenderHeaderLike> = {
    type: "header";
    header: THeader;
    size: number;
    leafColumnIds: string[];
} | {
    type: "spacer";
    id: string;
    size: number;
};
declare function isColumnRenderSpacerItem<TItem extends ColumnRenderItem>(item: TItem): item is Extract<TItem, {
    type: "spacer";
}>;
declare function isHeaderRenderSpacerItem<TItem extends HeaderRenderItem>(item: TItem): item is Extract<TItem, {
    type: "spacer";
}>;
declare function getColumnRenderItemKey<TLayout extends ColumnVirtualLayoutItem>(item: ColumnRenderItem<TLayout>): string;
declare function getColumnCellRenderItems<TLayout extends ColumnVirtualLayoutItem>(items: readonly ColumnRenderItem<TLayout>[]): ColumnCellRenderItem<TLayout>[];
declare function getHeaderRenderItemKey<THeader extends HeaderRenderHeaderLike>(headerGroupId: string, item: HeaderRenderItem<THeader>): string;
interface ColumnRenderItemsOptions {
    enabled: boolean;
    overscan: number;
}
interface ColumnRenderItemsScrollFrame {
    scrollLeft: number;
    viewportWidth: number;
}
type MeasuredSizeKey = string | number;
interface MeasuredSizeCache {
    readonly version: number;
    readonly size: number;
    get: (key: MeasuredSizeKey) => number | undefined;
    set: (key: MeasuredSizeKey, size: number) => boolean;
    delete: (key: MeasuredSizeKey) => boolean;
    clear: () => boolean;
    prune: (keys: Iterable<MeasuredSizeKey>) => boolean;
    resolve: (key: MeasuredSizeKey, estimateSize: number | (() => number)) => number;
}
interface MeasuredColumnLayoutCacheOptions {
    enabled: boolean;
    cache: Pick<MeasuredSizeCache, "get">;
    tolerance?: number;
}
interface MeasuredColumnLayoutCacheSyncOptions {
    enabled: boolean;
    cache: Pick<MeasuredSizeCache, "clear">;
    currentSignature: string;
    nextSignature: string;
}
interface MeasuredColumnLayoutCacheSyncResult {
    signature: string;
    changed: boolean;
}
interface SizedColumnLayoutOptions {
    getColumnSize: (columnId: string) => number | undefined;
    getFallbackSize?: (columnId: string, fallbackSize: number) => number | undefined;
}
declare function getVirtualRange(options: VirtualRangeOptions): VirtualRange;
declare function getScrollFrame(options: ScrollFrameOptions): ScrollFrame;
declare function getInitialScrollFrame(): ScrollFrame;
declare function getVirtualRowRange(options: VirtualRowRangeOptions): VirtualRange | null;
declare function getVirtualRowItems<TRow>(rows: readonly TRow[], virtualRange: VirtualRange | null | undefined): VirtualRowItem<TRow>[];
declare function getIsFocusedCellInRenderWindow<TRow extends {
    id: string;
}, TLayout extends ColumnVirtualLayoutItem>(focusedCell: FocusedCellRenderWindowLike | null | undefined, visibleRowItems: readonly VirtualRowItem<TRow>[], columnRenderItems: readonly ColumnRenderItem<TLayout>[]): boolean;
declare function getColumnRenderItems<TLayout extends ColumnVirtualLayoutItem>(layout: readonly TLayout[], scrollFrame: ColumnRenderItemsScrollFrame, options: ColumnRenderItemsOptions): ColumnRenderItem<TLayout>[];
declare function getHeaderRenderItems<THeader extends HeaderRenderHeaderLike, TLayout extends ColumnVirtualLayoutItem>(headerGroup: HeaderRenderGroupLike<THeader>, columnRenderItems: readonly ColumnRenderItem<TLayout>[], layoutById: ReadonlyMap<string, {
    size: number;
}>): HeaderRenderItem<THeader>[];
declare function getMeasuredColumnLayout<TLayout extends ColumnVirtualLayoutItem>(layout: readonly TLayout[], resolveSize: (columnId: string, fallbackSize: number) => number): TLayout[];
declare function getSizedColumnLayout<TLayout extends ColumnVirtualLayoutItem>(layout: readonly TLayout[], options: SizedColumnLayoutOptions): TLayout[];
declare function getMeasuredColumnLayoutFromCache<TLayout extends ColumnVirtualLayoutItem>(layout: readonly TLayout[], options: MeasuredColumnLayoutCacheOptions): TLayout[];
declare function getColumnLayoutMeasurementSignature(layout: readonly ColumnVirtualLayoutItem[]): string;
declare function syncMeasuredColumnLayoutCache(options: MeasuredColumnLayoutCacheSyncOptions): MeasuredColumnLayoutCacheSyncResult;
declare function createMeasuredSizeCache(): MeasuredSizeCache;
declare function createMeasuredSizeResolver(cache: MeasuredSizeCache, getKey: (index: number) => MeasuredSizeKey, estimateSize: number | ((index: number) => number)): (index: number) => number;

export { type ColumnCellRenderItem, type ColumnRenderItem, type ColumnRenderItemsOptions, type ColumnRenderItemsScrollFrame, type ColumnVirtualLayoutItem, type FocusedCellRenderWindowLike, type HeaderRenderGroupLike, type HeaderRenderHeaderLike, type HeaderRenderItem, type MeasuredColumnLayoutCacheOptions, type MeasuredColumnLayoutCacheSyncOptions, type MeasuredColumnLayoutCacheSyncResult, type MeasuredSizeCache, type MeasuredSizeKey, type ScrollFrame, type ScrollFrameOptions, type SizedColumnLayoutOptions, type VirtualItem, type VirtualRange, type VirtualRangeOptions, type VirtualRowItem, type VirtualRowRangeOptions, createMeasuredSizeCache, createMeasuredSizeResolver, getColumnCellRenderItems, getColumnLayoutMeasurementSignature, getColumnRenderItemKey, getColumnRenderItems, getHeaderRenderItemKey, getHeaderRenderItems, getInitialScrollFrame, getIsFocusedCellInRenderWindow, getMeasuredColumnLayout, getMeasuredColumnLayoutFromCache, getScrollFrame, getSizedColumnLayout, getVirtualRange, getVirtualRowItems, getVirtualRowRange, isColumnRenderSpacerItem, isHeaderRenderSpacerItem, syncMeasuredColumnLayoutCache };
