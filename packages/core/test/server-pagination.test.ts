import { describe, expect, it } from "vitest";
import { createGrid } from "../src";

describe("unknown-total manual pagination", () => {
  it("navigates by server availability without inventing a total or last page", () => {
    const grid = createGrid({ data: [{ id: "a" }], columns: [{ accessorKey: "id" }],
      manualPagination: true, hasNextPage: true,
      initialState: { pagination: { pageIndex: 0, pageSize: 25 } } });
    expect(grid.getPageCount()).toBe(-1);
    expect(grid.getCanNextPage()).toBe(true);
    expect(grid.getCanPreviousPage()).toBe(false);
    grid.nextPage(); expect(grid.getState().pagination.pageIndex).toBe(1);
    grid.lastPage(); expect(grid.getState().pagination.pageIndex).toBe(1);
    expect(grid.getCanPreviousPage()).toBe(true);
    grid.setOptions((previous) => ({ ...previous, hasNextPage: false }));
    expect(grid.getCanNextPage()).toBe(false);
    grid.nextPage(); expect(grid.getState().pagination.pageIndex).toBe(1);
    grid.previousPage(); expect(grid.getState().pagination.pageIndex).toBe(0);
  });

  it("lets exact counts take precedence and preserves existing normalization", () => {
    const grid = createGrid({ data: [], columns: [], manualPagination: true,
      rowCount: 30, hasNextPage: false,
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
    expect(grid.getPageCount()).toBe(3); expect(grid.getCanNextPage()).toBe(true);
    grid.setOptions((previous) => ({ ...previous, pageCount: 5 }));
    expect(grid.getPageCount()).toBe(5);
    grid.lastPage(); expect(grid.getState().pagination.pageIndex).toBe(4);
  });

  it("honors unavailable previous cursors and normalizes malformed indexes", () => {
    const grid = createGrid({ data: [], columns: [], manualPagination: true,
      hasNextPage: true, hasPreviousPage: false,
      initialState: { pagination: { pageIndex: 3, pageSize: 10 } } });
    expect(grid.getCanPreviousPage()).toBe(false);
    grid.previousPage(); expect(grid.getState().pagination.pageIndex).toBe(3);
    grid.setPageIndex(Number.NaN); grid.nextPage();
    expect(grid.getState().pagination.pageIndex).toBe(1);
    grid.firstPage(); expect(grid.getState().pagination.pageIndex).toBe(0);
  });
});
