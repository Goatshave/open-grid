import { describe, expect, it } from "vitest";
import { createColumnFilterMatcher, createGrid, isISOCalendarDate, isTypedColumnFilterValue } from "../src";

describe("serializable typed column filters", () => {
  it("uses inclusive finite numeric bounds without coercing blanks or strings to numbers", () => {
    const matches = createColumnFilterMatcher({ type: "number-range", min: 0, max: 2 });
    expect([null, "1", NaN, Infinity, -1, 0, 1, 2, 3].filter(matches)).toEqual([0, 1, 2]);
    expect(createColumnFilterMatcher({ type: "number-range" })(null)).toBe(true);
    expect(createColumnFilterMatcher({ type: "number-range", min: 2, max: 1 })(1)).toBe(false);
  });
  it("matches ISO calendar days and UTC Date days with inclusive boundaries", () => {
    expect(isISOCalendarDate("2024-02-29")).toBe(true);
    expect(isISOCalendarDate("2025-02-29")).toBe(false);
    expect(isISOCalendarDate("2026-04-31")).toBe(false);
    const matches = createColumnFilterMatcher({ type: "date-range", from: "2026-10-01", to: "2026-10-24" });
    expect(["2026-09-30", "2026-10-01", "2026-10-24", "2026-10-25", "not a date"].filter(matches)).toEqual(["2026-10-01", "2026-10-24"]);
    expect(matches(new Date("2026-10-24T23:59:59Z"))).toBe(true);
    expect(matches(new Date(NaN))).toBe(false);
  });
  it("preserves set value types, treats nullish values as blank, and clears an empty set", () => {
    const filter = { type: "set", values: [1, false, null] };
    const matches = createColumnFilterMatcher(JSON.parse(JSON.stringify(filter)));
    expect([1, "1", false, "false", null, undefined, ""].filter(matches)).toEqual([1, false, null, undefined]);
    expect(createColumnFilterMatcher({ type: "set", values: [] })("anything")).toBe(true);
  });
  it("rejects malformed typed filters and retains legacy text matching", () => {
    for (const invalid of [{ type: "set", values: [{}] }, { type: "number-range", min: NaN },
      { type: "date-range", from: "2026-11-01", to: "2026-10-01" }, { type: "set", values: [1], extra: true }]) {
      expect(isTypedColumnFilterValue(invalid)).toBe(false);
      expect(createColumnFilterMatcher(invalid)("[object Object]")).toBe(false);
    }
    expect(createColumnFilterMatcher("ACME")("Acme Corporation")).toBe(true);
  });
  it("composes typed filters with global search, custom filters, and retained tree ancestors", () => {
    const data = [{ id: "parent", amount: 0, status: "parent", children: [
      { id: "hit", amount: 10, status: "Open", children: [] },
      { id: "miss", amount: 20, status: "Closed", children: [] },
    ] }];
    const grid = createGrid({ data, columns: [{ accessorKey: "amount" }, { accessorKey: "status" }],
      getSubRows: (row) => row.children, getRowId: (row) => row.id,
      initialState: { columnFilters: [{ id: "amount", value: { type: "number-range", min: 5, max: 15 } }], globalFilter: "Open" } });
    expect(grid.getFilteredRowModel().flatRows.map((row) => row.id)).toEqual(["parent", "hit"]);
    grid.setOptions((previous) => ({ ...previous, columns: [{ accessorKey: "amount", filterFn: () => true }, { accessorKey: "status" }] }));
    grid.setGlobalFilter("Closed");
    expect(grid.getFilteredRowModel().flatRows.map((row) => row.id)).toEqual(["parent", "miss"]);
  });
});
