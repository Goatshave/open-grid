import { describe, expect, it } from "vitest";
import {
  createMeasuredSizeCache,
  createMeasuredSizeResolver,
  getColumnLayoutMeasurementSignature,
  getColumnCellRenderItems,
  getColumnRenderItemKey,
  getColumnRenderItems,
  getHeaderRenderItemKey,
  getHeaderRenderItems,
  getInitialScrollFrame,
  getIsFocusedCellInRenderWindow,
  getMeasuredColumnLayout,
  getMeasuredColumnLayoutFromCache,
  getScrollFrame,
  getSizedColumnLayout,
  getVirtualRowRange,
  getVirtualRange,
  getVirtualRowItems,
  isColumnRenderSpacerItem,
  isHeaderRenderSpacerItem,
  syncMeasuredColumnLayoutCache,
} from "../src";

describe("getVirtualRange", () => {
  it("returns an empty range for empty data", () => {
    expect(
      getVirtualRange({
        count: 0,
        viewportSize: 400,
        scrollOffset: 0,
        estimateSize: 40,
      }),
    ).toEqual({
      totalSize: 0,
      startIndex: 0,
      endIndex: -1,
      items: [],
    });
  });

  it("calculates fixed-size visible items with overscan", () => {
    const range = getVirtualRange({
      count: 100,
      viewportSize: 120,
      scrollOffset: 200,
      estimateSize: 40,
      overscan: 1,
    });

    expect(range.totalSize).toBe(4000);
    expect(range.startIndex).toBe(4);
    expect(range.endIndex).toBe(8);
    expect(range.items.map((item) => item.index)).toEqual([4, 5, 6, 7, 8]);
    expect(range.items[0]).toEqual({ index: 4, start: 160, size: 40, end: 200 });
  });

  it("calculates a million-row fixed-size range without materializing preceding items", () => {
    const range = getVirtualRange({
      count: 1_000_000,
      viewportSize: 600,
      scrollOffset: 120_000,
      estimateSize: 40,
      overscan: 5,
    });

    expect(range.totalSize).toBe(40_000_000);
    expect(range.startIndex).toBe(2_995);
    expect(range.endIndex).toBe(3_019);
    expect(range.items).toHaveLength(25);
  });

  it("does not mount an item that starts exactly at the viewport end", () => {
    const fixed = getVirtualRange({ count: 5, viewportSize: 40, scrollOffset: 40, estimateSize: 40, overscan: 0 });
    const variable = getVirtualRange({ count: 5, viewportSize: 40, scrollOffset: 40, estimateSize: () => 40, overscan: 0 });

    expect(fixed.items.map((item) => item.index)).toEqual([1]);
    expect(variable.items.map((item) => item.index)).toEqual([1]);
  });

  it("supports variable item sizes", () => {
    const range = getVirtualRange({
      count: 5,
      viewportSize: 50,
      scrollOffset: 45,
      estimateSize: (index) => (index === 0 ? 20 : 30),
      overscan: 0,
    });

    expect(range.totalSize).toBe(140);
    expect(range.items.map((item) => [item.index, item.start, item.end])).toEqual([
      [1, 20, 50],
      [2, 50, 80],
      [3, 80, 110],
    ]);
  });

  it("uses measured size cache values before falling back to estimates", () => {
    const cache = createMeasuredSizeCache();

    expect(cache.version).toBe(0);
    expect(cache.set("row-2", 80)).toBe(true);
    expect(cache.set("row-2", 80)).toBe(false);
    expect(cache.version).toBe(1);

    const range = getVirtualRange({
      count: 4,
      viewportSize: 140,
      scrollOffset: 0,
      estimateSize: createMeasuredSizeResolver(cache, (index) => `row-${index + 1}`, 40),
      overscan: 0,
    });

    expect(range.totalSize).toBe(200);
    expect(range.items.map((item) => [item.index, item.start, item.size, item.end])).toEqual([
      [0, 0, 40, 40],
      [1, 40, 80, 120],
      [2, 120, 40, 160],
    ]);
  });

  it("prunes stale measured sizes", () => {
    const cache = createMeasuredSizeCache();

    cache.set("row-1", 40);
    cache.set("row-2", 80);

    expect(cache.prune(["row-2"])).toBe(true);
    expect(cache.get("row-1")).toBeUndefined();
    expect(cache.get("row-2")).toBe(80);
    expect(cache.size).toBe(1);
  });

  it("normalizes scroll frame offsets for sticky headers", () => {
    expect(
      getScrollFrame({
        scrollTop: 84,
        scrollLeft: 120,
        viewportHeight: 640,
        viewportWidth: 1024,
        stickyTopOffset: 44,
      }),
    ).toEqual({
      scrollTop: 40,
      scrollLeft: 120,
      viewportHeight: 596,
      viewportWidth: 1024,
    });

    expect(
      getScrollFrame({
        scrollTop: 20,
        scrollLeft: -10,
        viewportHeight: -1,
        viewportWidth: 800,
        stickyTopOffset: 44,
      }),
    ).toEqual({
      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: 0,
      viewportWidth: 800,
    });
  });

  it("returns an empty initial scroll frame", () => {
    expect(getInitialScrollFrame()).toEqual({
      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: 0,
      viewportWidth: 0,
    });
  });

  it("returns virtual row ranges from scroll frames", () => {
    expect(
      getVirtualRowRange({
        count: 10,
        enabled: false,
        estimateSize: 40,
        scrollFrame: { scrollTop: 80, scrollLeft: 0, viewportHeight: 120, viewportWidth: 300 },
      }),
    ).toBeNull();

    expect(
      getVirtualRowRange({
        count: 10,
        enabled: true,
        estimateSize: 40,
        overscan: 1,
        scrollFrame: { scrollTop: 80, scrollLeft: 0, viewportHeight: 120, viewportWidth: 300 },
      }),
    ).toEqual({
      totalSize: 400,
      startIndex: 1,
      endIndex: 5,
      items: [
        { index: 1, start: 40, size: 40, end: 80 },
        { index: 2, start: 80, size: 40, end: 120 },
        { index: 3, start: 120, size: 40, end: 160 },
        { index: 4, start: 160, size: 40, end: 200 },
        { index: 5, start: 200, size: 40, end: 240 },
      ],
    });
  });
});

describe("getColumnRenderItems", () => {
  const layout = [
    { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const },
    { id: "name", start: 48, end: 168, size: 120, pinned: false as const },
    { id: "status", start: 168, end: 288, size: 120, pinned: false as const },
    { id: "owner", start: 288, end: 408, size: 120, pinned: false as const },
    { id: "date", start: 408, end: 528, size: 120, pinned: false as const },
    { id: "actions", start: 528, end: 592, size: 64, pinned: "right" as const },
  ];

  it("returns every column when column virtualization is disabled", () => {
    expect(
      getColumnRenderItems(layout, { scrollLeft: 220, viewportWidth: 180 }, { enabled: false, overscan: 0 }).map((item) =>
        item.type === "column" ? item.layout.id : item.id,
      ),
    ).toEqual(["select", "name", "status", "owner", "date", "actions"]);
  });

  it("keeps pinned columns mounted while virtualizing center columns", () => {
    const items = getColumnRenderItems(layout, { scrollLeft: 220, viewportWidth: 180 }, { enabled: true, overscan: 0 });

    expect(items.filter(isColumnRenderSpacerItem).map((item) => item.id)).toEqual(["center-before", "center-after"]);
    expect(isColumnRenderSpacerItem(items[0])).toBe(false);
    expect(items.map(getColumnRenderItemKey)).toEqual(["select", "center-before", "status", "center-after", "actions"]);
    expect(items.map((item) => (item.type === "column" ? item.layout.id : `${item.id}:${item.size}`))).toEqual([
      "select",
      "center-before:120",
      "status",
      "center-after:240",
      "actions",
    ]);
  });

  it("subtracts pinned widths from the virtual center viewport", () => {
    const centerOnly = Array.from({ length: 20 }, (_, index) => ({
      id: `column-${index}`,
      start: index * 120,
      end: (index + 1) * 120,
      size: 120,
      pinned: false as const,
    }));
    const pinned = [
      { ...centerOnly[10]!, start: 0, end: 120, pinned: "left" as const },
      ...centerOnly.filter((_, index) => index !== 10).map((item, index) => ({
        ...item,
        start: 120 + index * 120,
        end: 240 + index * 120,
      })),
    ];

    const unpinnedItems = getColumnRenderItems(centerOnly, { scrollLeft: 0, viewportWidth: 1_200 }, { enabled: true, overscan: 2 });
    const pinnedItems = getColumnRenderItems(pinned, { scrollLeft: 0, viewportWidth: 1_200 }, { enabled: true, overscan: 2 });

    expect(unpinnedItems.filter((item) => !isColumnRenderSpacerItem(item))).toHaveLength(12);
    expect(pinnedItems.filter((item) => !isColumnRenderSpacerItem(item))).toHaveLength(12);
  });

  it("detects whether a focused cell is inside the rendered row and column windows", () => {
    const columnItems = getColumnRenderItems(layout, { scrollLeft: 220, viewportWidth: 180 }, { enabled: true, overscan: 0 });
    const rowItems = getVirtualRowItems([{ id: "row-1" }, { id: "row-2" }, { id: "row-3" }], {
      totalSize: 120,
      startIndex: 1,
      endIndex: 2,
      items: [
        { index: 1, start: 40, size: 40, end: 80 },
        { index: 2, start: 80, size: 40, end: 120 },
      ],
    });

    expect(getIsFocusedCellInRenderWindow({ rowId: "row-2", columnId: "status" }, rowItems, columnItems)).toBe(true);
    expect(getIsFocusedCellInRenderWindow({ rowId: "row-1", columnId: "status" }, rowItems, columnItems)).toBe(false);
    expect(getIsFocusedCellInRenderWindow({ rowId: "row-2", columnId: "name" }, rowItems, columnItems)).toBe(false);
    expect(getIsFocusedCellInRenderWindow(null, rowItems, columnItems)).toBe(false);
  });
});

describe("getColumnCellRenderItems", () => {
  it("moves virtual center spacers onto the boundary center columns", () => {
    const layout = [
      { id: "left", start: 0, end: 100, size: 100, pinned: "left" as const },
      { id: "center-1", start: 100, end: 200, size: 100, pinned: false as const },
      { id: "center-2", start: 200, end: 300, size: 100, pinned: false as const },
      { id: "center-3", start: 300, end: 400, size: 100, pinned: false as const },
      { id: "right", start: 400, end: 500, size: 100, pinned: "right" as const },
    ];
    const renderItems = getColumnRenderItems(layout, { scrollLeft: 250, viewportWidth: 50 }, { enabled: true, overscan: 0 });

    expect(getColumnCellRenderItems(renderItems)).toEqual([
      { layout: layout[0], beforeSpacerSize: 0, afterSpacerSize: 0 },
      { layout: layout[2], beforeSpacerSize: 100, afterSpacerSize: 100 },
      { layout: layout[4], beforeSpacerSize: 0, afterSpacerSize: 0 },
    ]);
  });

  it("returns zero spacer sizes when column virtualization is disabled", () => {
    const layout = [
      { id: "one", start: 0, end: 100, size: 100, pinned: false as const },
      { id: "two", start: 100, end: 200, size: 100, pinned: false as const },
    ];

    expect(getColumnCellRenderItems(getColumnRenderItems(layout, { scrollLeft: 100, viewportWidth: 50 }, { enabled: false, overscan: 0 }))).toEqual([
      { layout: layout[0], beforeSpacerSize: 0, afterSpacerSize: 0 },
      { layout: layout[1], beforeSpacerSize: 0, afterSpacerSize: 0 },
    ]);
  });
});

describe("getHeaderRenderItems", () => {
  const headerGroup = {
    headers: [
      { id: "left", leafColumnIds: ["select"] },
      { id: "person", leafColumnIds: ["name", "status", "owner"] },
      { id: "actions", leafColumnIds: ["actions"] },
    ],
  };
  const columnRenderItems = [
    { type: "column" as const, layout: { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const } },
    { type: "spacer" as const, id: "center-before", size: 120 },
    { type: "column" as const, layout: { id: "status", start: 168, end: 288, size: 120, pinned: false as const } },
    { type: "column" as const, layout: { id: "owner", start: 288, end: 408, size: 120, pinned: false as const } },
    { type: "spacer" as const, id: "center-after", size: 120 },
    { type: "column" as const, layout: { id: "actions", start: 528, end: 592, size: 64, pinned: "right" as const } },
  ];

  it("groups rendered leaf columns by header while preserving spacers", () => {
    const items = getHeaderRenderItems(headerGroup, columnRenderItems, new Map([["owner", { size: 132 }]]));

    expect(items.filter(isHeaderRenderSpacerItem).map((item) => item.id)).toEqual(["center-before", "center-after"]);
    expect(isHeaderRenderSpacerItem(items[0])).toBe(false);
    expect(items.map((item) => getHeaderRenderItemKey("root", item))).toEqual([
      "root:left:select",
      "center-before",
      "root:person:status,owner",
      "center-after",
      "root:actions:actions",
    ]);
    expect(
      items.map((item) =>
        item.type === "header"
          ? {
              type: item.type,
              headerId: item.header.id,
              size: item.size,
              leafColumnIds: item.leafColumnIds,
            }
          : item,
      ),
    ).toEqual([
      { type: "header", headerId: "left", size: 48, leafColumnIds: ["select"] },
      { type: "spacer", id: "center-before", size: 120 },
      { type: "header", headerId: "person", size: 252, leafColumnIds: ["status", "owner"] },
      { type: "spacer", id: "center-after", size: 120 },
      { type: "header", headerId: "actions", size: 64, leafColumnIds: ["actions"] },
    ]);
  });
});

describe("getMeasuredColumnLayout", () => {
  it("recomputes column starts and pinned offsets from resolved sizes", () => {
    const layout = [
      { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const, pinnedStart: 0, pinnedEdge: "left" as const },
      { id: "name", start: 48, end: 168, size: 120, pinned: false as const },
      { id: "status", start: 168, end: 288, size: 120, pinned: false as const },
      { id: "actions", start: 288, end: 352, size: 64, pinned: "right" as const, pinnedStart: 0, pinnedEdge: "right" as const },
    ];

    expect(
      getMeasuredColumnLayout(layout, (columnId, fallbackSize) =>
        columnId === "name" ? 132 : columnId === "actions" ? 72 : fallbackSize,
      ),
    ).toEqual([
      { id: "select", start: 0, end: 48, size: 48, pinned: "left", pinnedStart: 0, pinnedEdge: "left" },
      { id: "name", start: 48, end: 180, size: 132, pinned: false },
      { id: "status", start: 180, end: 300, size: 120, pinned: false },
      { id: "actions", start: 300, end: 372, size: 72, pinned: "right", pinnedStart: 0, pinnedEdge: "right" },
    ]);
  });

  it("marks only the last left pinned and first right pinned edges", () => {
    const layout = [
      { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const, pinnedStart: 0, pinnedEdge: "left" as const },
      { id: "flag", start: 48, end: 88, size: 40, pinned: "left" as const, pinnedStart: 48 },
      { id: "name", start: 88, end: 208, size: 120, pinned: false as const },
      { id: "more", start: 208, end: 256, size: 48, pinned: "right" as const, pinnedStart: 64 },
      { id: "actions", start: 256, end: 320, size: 64, pinned: "right" as const, pinnedStart: 0, pinnedEdge: "right" as const },
    ];

    expect(getMeasuredColumnLayout(layout, (_columnId, fallbackSize) => fallbackSize).map(({ id, pinnedStart, pinnedEdge }) => ({
      id,
      pinnedStart,
      pinnedEdge,
    }))).toEqual([
      { id: "select", pinnedStart: 0, pinnedEdge: undefined },
      { id: "flag", pinnedStart: 48, pinnedEdge: "left" },
      { id: "name", pinnedStart: undefined, pinnedEdge: undefined },
      { id: "more", pinnedStart: 64, pinnedEdge: "right" },
      { id: "actions", pinnedStart: 0, pinnedEdge: undefined },
    ]);
  });

  it("applies measured column layout cache values within tolerance", () => {
    const layout = [
      { id: "name", start: 0, end: 120, size: 120, pinned: false as const },
      { id: "status", start: 120, end: 240, size: 120, pinned: false as const },
      { id: "actions", start: 240, end: 304, size: 64, pinned: "right" as const, pinnedStart: 0, pinnedEdge: "right" as const },
    ];
    const cache = createMeasuredSizeCache();

    cache.set("name", 120.5);
    cache.set("status", 125);
    cache.set("actions", 63.5);

    expect(getMeasuredColumnLayoutFromCache(layout, { enabled: false, cache }).map(({ id, size }) => ({ id, size }))).toEqual([
      { id: "name", size: 120 },
      { id: "status", size: 120 },
      { id: "actions", size: 64 },
    ]);

    expect(getMeasuredColumnLayoutFromCache(layout, { enabled: true, cache }).map(({ id, start, end, size }) => ({
      id,
      start,
      end,
      size,
    }))).toEqual([
      { id: "name", start: 0, end: 120.5, size: 120.5 },
      { id: "status", start: 120.5, end: 240.5, size: 120 },
      { id: "actions", start: 240.5, end: 304, size: 63.5 },
    ]);
  });

  it("resolves sized column layouts from explicit and fallback sizes", () => {
    const layout = [
      { id: "name", start: 0, end: 120, size: 120, pinned: false as const },
      { id: "status", start: 120, end: 240, size: 120, pinned: false as const },
      { id: "actions", start: 240, end: 304, size: 64, pinned: "right" as const, pinnedStart: 0, pinnedEdge: "right" as const },
    ];

    expect(
      getSizedColumnLayout(layout, {
        getColumnSize: (columnId) => (columnId === "name" ? 132 : undefined),
        getFallbackSize: (columnId, fallbackSize) => (columnId === "actions" ? 72 : fallbackSize),
      }),
    ).toEqual([
      { id: "name", start: 0, end: 132, size: 132, pinned: false },
      { id: "status", start: 132, end: 252, size: 120, pinned: false },
      { id: "actions", start: 252, end: 324, size: 72, pinned: "right", pinnedStart: 0, pinnedEdge: "right" },
    ]);
  });

  it("syncs measured column layout cache signatures", () => {
    const layout = [
      { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const, pinnedEdge: "left" as const },
      { id: "name", start: 48, end: 168, size: 120, pinned: false as const },
      { id: "actions", start: 168, end: 232, size: 64, pinned: "right" as const, pinnedStart: 0, pinnedEdge: "right" as const },
    ];
    const nextSignature = getColumnLayoutMeasurementSignature(layout);
    const cache = createMeasuredSizeCache();

    expect(nextSignature).toBe("select:48:left::left|name:120:false::|actions:64:right:0:right");
    expect(cache.set("name", 121)).toBe(true);

    expect(
      syncMeasuredColumnLayoutCache({
        cache,
        currentSignature: "stale",
        enabled: false,
        nextSignature,
      }),
    ).toEqual({ signature: nextSignature, changed: false });
    expect(cache.size).toBe(1);

    expect(
      syncMeasuredColumnLayoutCache({
        cache,
        currentSignature: "stale",
        enabled: true,
        nextSignature,
      }),
    ).toEqual({ signature: nextSignature, changed: true });
    expect(cache.size).toBe(0);

    expect(
      syncMeasuredColumnLayoutCache({
        cache,
        currentSignature: nextSignature,
        enabled: true,
        nextSignature,
      }),
    ).toEqual({ signature: nextSignature, changed: false });
  });
});

describe("getVirtualRowItems", () => {
  const rows = [{ id: "row-1" }, { id: "row-2" }, { id: "row-3" }];

  it("returns every row when row virtualization is disabled", () => {
    expect(getVirtualRowItems(rows, null)).toEqual([
      { row: rows[0], rowIndex: 0, virtualItem: null },
      { row: rows[1], rowIndex: 1, virtualItem: null },
      { row: rows[2], rowIndex: 2, virtualItem: null },
    ]);
  });

  it("maps virtual range items to available rows", () => {
    const range = {
      totalSize: 120,
      startIndex: 1,
      endIndex: 3,
      items: [
        { index: 1, start: 40, size: 40, end: 80 },
        { index: 3, start: 120, size: 40, end: 160 },
      ],
    };

    expect(getVirtualRowItems(rows, range)).toEqual([
      { row: rows[1], rowIndex: 1, virtualItem: range.items[0] },
    ]);
  });
});
