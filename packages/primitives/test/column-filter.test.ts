import { describe, expect, it } from "vitest";
import { createGrid } from "@open-grid/core";
import { createGridLocalization, getColumnFilterControls, getNextColumnFilterControlValue } from "../src";

describe("typed column filter controls", () => {
  const grid = createGrid({ data: [], columns: [
    { id: "amount", header: "Amount", filterType: "number-range" },
    { id: "date", filterType: "date-range" },
    { id: "status", filterType: "set", filterOptions: [{ value: 1, label: "One" }, { value: "1", label: "String one" }] },
  ] });
  const [amount, date, status] = grid.getAllLeafColumns();
  it("preserves range endpoints and removes an empty filter", () => {
    let filters = getNextColumnFilterControlValue([], amount!, "min", "0");
    filters = getNextColumnFilterControlValue(filters, amount!, "max", "10");
    expect(filters[0]!.value).toEqual({ type: "number-range", min: 0, max: 10 });
    filters = getNextColumnFilterControlValue(filters, amount!, "min", "");
    expect(filters[0]!.value).toEqual({ type: "number-range", max: 10 });
    expect(getNextColumnFilterControlValue(filters, amount!, "max", "")).toEqual([]);
  });
  it("keeps set value types through HTML strings and ignores malformed input", () => {
    const filters = getNextColumnFilterControlValue([], status!, "values", ["1", '"1"']);
    expect(filters[0]!.value).toEqual({ type: "set", values: [1, "1"] });
    expect(getNextColumnFilterControlValue(filters, status!, "values", ["{}"])).toBe(filters);
    expect(getNextColumnFilterControlValue(filters, status!, "values", [])).toEqual([]);
  });
  it("localizes ranges and exposes invalid intermediate values without silently changing them", () => {
    const localization = createGridLocalization({ filterColumnLabel: (label) => `검색 ${label}`, filterRangeStartLabel: (label) => `${label} 시작` });
    const controls = getColumnFilterControls(date!, [{ id: "date", value: { type: "date-range", from: "2026-11-01", to: "2026-10-01" } }], localization);
    expect(controls[0]).toMatchObject({ type: "date", label: "검색 date 시작", invalid: true, value: "2026-11-01" });
    expect(controls[1]!.invalid).toBe(true);
  });
});
