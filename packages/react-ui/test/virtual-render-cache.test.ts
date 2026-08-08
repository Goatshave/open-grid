import type { ColumnLayout } from "@open-grid/core";
import { describe, expect, it } from "vitest";
import {
  reconcileColumnRenderItems,
  reconcileVirtualRowRenderKeys,
} from "../src/virtual-render-cache";

interface TestInput {
  column: object;
  columnIndex: number;
  layout: ColumnLayout;
}

interface TestItem extends TestInput {
  token: object;
}

describe("reconcileColumnRenderItems", () => {
  it("reuses unchanged column items across equivalent layout objects", () => {
    const firstColumn = {};
    const secondColumn = {};
    const previous = [
      createItem({ column: firstColumn, columnIndex: 0, layout: createLayout("first", 0, 120) }),
      createItem({ column: secondColumn, columnIndex: 1, layout: createLayout("second", 120, 120) }),
    ];

    const next = reconcileColumnRenderItems(previous, [
      { column: firstColumn, columnIndex: 0, layout: createLayout("first", 0, 120) },
      { column: secondColumn, columnIndex: 1, layout: createLayout("second", 120, 120) },
    ], createItem);

    expect(next[0]).toBe(previous[0]);
    expect(next[1]).toBe(previous[1]);
  });

  it("recreates only items whose geometry or logical index changed", () => {
    const firstColumn = {};
    const secondColumn = {};
    const thirdColumn = {};
    const previous = [
      createItem({ column: firstColumn, columnIndex: 0, layout: createLayout("first", 0, 120) }),
      createItem({ column: secondColumn, columnIndex: 1, layout: createLayout("second", 120, 120) }),
      createItem({ column: thirdColumn, columnIndex: 2, layout: createLayout("third", 240, 120) }),
    ];

    const resized = reconcileColumnRenderItems(previous, [
      { column: firstColumn, columnIndex: 0, layout: createLayout("first", 0, 120) },
      { column: secondColumn, columnIndex: 1, layout: createLayout("second", 120, 200) },
      { column: thirdColumn, columnIndex: 2, layout: createLayout("third", 320, 120) },
    ], createItem);

    expect(resized[0]).toBe(previous[0]);
    expect(resized[1]).not.toBe(previous[1]);
    expect(resized[2]).not.toBe(previous[2]);

    const reindexed = reconcileColumnRenderItems(previous, [
      { column: firstColumn, columnIndex: 1, layout: createLayout("first", 0, 120) },
    ], createItem);
    expect(reindexed[0]).not.toBe(previous[0]);
  });

  it("does not reuse an item when its live column object changes", () => {
    const previous = [
      createItem({ column: {}, columnIndex: 0, layout: createLayout("first", 0, 120) }),
    ];
    const next = reconcileColumnRenderItems(previous, [
      { column: {}, columnIndex: 0, layout: createLayout("first", 0, 120) },
    ], createItem);

    expect(next[0]).not.toBe(previous[0]);
  });

});

describe("reconcileVirtualRowRenderKeys", () => {
  it("keeps overlapping row keys and assigns released slots to entering rows", () => {
    const previous = [
      { rowId: "row_0", key: 0 },
      { rowId: "row_1", key: 1 },
      { rowId: "row_2", key: 2 },
    ];

    expect(reconcileVirtualRowRenderKeys(previous, ["row_1", "row_2", "row_3"])).toEqual([
      previous[1],
      previous[2],
      { rowId: "row_3", key: 0 },
    ]);
  });

  it("reuses the complete pool for non-overlapping viewport jumps", () => {
    const previous = [
      { rowId: "row_0", key: 4 },
      { rowId: "row_1", key: 7 },
    ];

    expect(reconcileVirtualRowRenderKeys(previous, ["row_50", "row_51"])).toEqual([
      { rowId: "row_50", key: 4 },
      { rowId: "row_51", key: 7 },
    ]);
  });

  it("allocates new keys only when the visible pool grows", () => {
    expect(reconcileVirtualRowRenderKeys(
      [{ rowId: "row_0", key: 3 }],
      ["row_0", "row_1", "row_2"],
    )).toEqual([
      { rowId: "row_0", key: 3 },
      { rowId: "row_1", key: 4 },
      { rowId: "row_2", key: 5 },
    ]);
  });
});

function createItem(input: TestInput): TestItem {
  return { ...input, token: {} };
}

function createLayout(id: string, start: number, size: number): ColumnLayout {
  return {
    id,
    size,
    start,
    end: start + size,
    pinned: false,
  };
}
