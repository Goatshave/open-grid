import { describe, expect, it } from "vitest";
import { createServerSelection } from "../src";

describe("query-scoped server selection", () => {
  const create = () => createServerSelection({ query: { filter: "open", page: 0, sort: "id" }, getQueryKey: (query) => query.filter });
  it("represents all matches compactly, retains exclusions on other pages, and projects only loaded IDs", () => {
    const selection = create(); selection.selectAllMatching();
    selection.setRowSelected("a", false);
    expect(selection.getState()).toMatchObject({ mode: "all-matching", excludedIds: ["a"] });
    expect(selection.getGridState(["a", "b"])).toEqual({ allRowsSelected: false, rowSelection: { b: true } });
    selection.setQuery({ filter: "open", page: 8, sort: "name" });
    expect(selection.getGridState(["unloaded-before"])).toEqual({ allRowsSelected: false, rowSelection: { "unloaded-before": true } });
    selection.setRowSelected("a", true);
    expect(selection.getState()).toMatchObject({ excludedIds: [] });
  });
  it("keeps explicit IDs across pages, but resets both modes on a query change", () => {
    const selection = create(); selection.setRowSelected("a", true); selection.setRowSelected("b", true);
    selection.setQuery({ filter: "open", page: 1, sort: "id" });
    expect(selection.getState()).toMatchObject({ mode: "explicit", ids: ["a", "b"] });
    expect(selection.setQuery({ filter: "closed", page: 0, sort: "id" })).toBe(true);
    expect(selection.getState()).toMatchObject({ mode: "explicit", ids: [] });
    selection.selectAllMatching(); selection.setQuery({ filter: "another", page: 0, sort: "id" });
    expect(selection.getIsRowSelected("a")).toBe(false);
  });
  it("captures an immutable request independent of later query and selection changes", () => {
    const query = { filters: [{ id: "status", value: ["Open"] }] };
    const selection = createServerSelection({ query, getQueryKey: (value) => JSON.stringify(value) });
    selection.selectAllMatching(); selection.setRowSelected("excluded", false);
    const request = selection.getState(); query.filters[0]!.value.push("Closed");
    selection.clear();
    expect(request.query.filters[0]!.value).toEqual(["Open"]);
    expect(request).toMatchObject({ mode: "all-matching", excludedIds: ["excluded"] });
    expect(Object.isFrozen(request.query.filters[0]!.value)).toBe(true);
    expect(Object.isFrozen(request)).toBe(true);
  });
  it("rejects non-JSON queries, invalid identities, and invalid row IDs", () => {
    for (const query of [{ value: NaN }, { value: Infinity }, { value: new Date() }, { value: () => {} }, { value: 1n }]) {
      expect(() => createServerSelection({ query, getQueryKey: () => "key" })).toThrow(/JSON/);
    }
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(() => createServerSelection({ query: cyclic, getQueryKey: () => "key" })).toThrow(/JSON/);
    expect(() => createServerSelection({ query: {}, getQueryKey: () => "" })).toThrow(/key/);
    expect(() => create().setRowSelected("", true)).toThrow(/IDs/);
  });
  it("notifies once for changes, supports unsubscribe, and fences mutations after disposal", () => {
    const selection = create(); let calls = 0;
    const unsubscribe = selection.subscribe(() => calls++);
    selection.setRowSelected("a", true); selection.setRowSelected("a", true);
    expect(calls).toBe(1);
    unsubscribe(); selection.clear(); expect(calls).toBe(1);
    selection.dispose(); expect(selection.getGridState(["a"])).toEqual({ rowSelection: {}, allRowsSelected: false });
    expect(() => selection.selectAllMatching()).toThrow(/disposed/);
  });
});
