import { describe, expect, it } from "vitest";
import {
  columnOrderReducers,
  columnPinningReducers,
  columnSizingReducers,
  columnVisibilityReducers,
  createGrid,
  expandedReducers,
  filterReducers,
  getOrderableLeafColumns,
  groupingReducers,
  paginationReducers,
  rowSelectionReducers,
  sortingReducers,
  type ColumnDef,
} from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
}

const data: Person[] = [
  { id: "1", name: "Mina", age: 32, role: "admin" },
  { id: "2", name: "Joon", age: 25, role: "editor" },
];

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name", minSize: 80, maxSize: 240 },
  { accessorKey: "age", header: "Age", minSize: 64, maxSize: 120 },
  { accessorKey: "role", header: "Role" },
];

describe("feature state reducers", () => {
  it("applies sorting, filtering, and pagination transitions without a grid instance", () => {
    expect(sortingReducers.toggleColumn([], "age")).toEqual([{ id: "age", desc: false }]);
    expect(sortingReducers.toggleColumn([{ id: "age", desc: false }], "age")).toEqual([{ id: "age", desc: true }]);
    expect(sortingReducers.toggleColumn([{ id: "age", desc: true }], "age")).toEqual([]);

    expect(filterReducers.setColumnFilters([], [{ id: "role", value: "admin" }])).toEqual([
      { id: "role", value: "admin" },
    ]);
    expect(filterReducers.setGlobalFilter("admin", (previous) => `${previous}-team`)).toBe("admin-team");

    expect(paginationReducers.setPageIndex({ pageIndex: 0, pageSize: 25 }, 2)).toEqual({ pageIndex: 2, pageSize: 25 });
    expect(paginationReducers.setPageSize({ pageIndex: 2, pageSize: 25 }, 100)).toEqual({ pageIndex: 0, pageSize: 100 });
    expect(paginationReducers.setPageIndex({ pageIndex: 2, pageSize: 25 }, -1)).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(paginationReducers.setPageIndex({ pageIndex: 2, pageSize: 25 }, Number.NaN)).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(paginationReducers.setPageSize({ pageIndex: 2, pageSize: 25 }, 0)).toEqual({ pageIndex: 0, pageSize: 1 });
    expect(paginationReducers.setPageSize({ pageIndex: 2, pageSize: 25 }, Number.POSITIVE_INFINITY)).toEqual({ pageIndex: 0, pageSize: 1 });
    expect(paginationReducers.set({ pageIndex: 2, pageSize: 25 }, { pageIndex: -1, pageSize: 0 })).toEqual({
      pageIndex: 0,
      pageSize: 1,
    });
    expect(
      paginationReducers.set({ pageIndex: 2, pageSize: 25 }, () => ({
        pageIndex: Number.NaN,
        pageSize: Number.POSITIVE_INFINITY,
      })),
    ).toEqual({ pageIndex: 0, pageSize: 1 });
  });

  it("normalizes row selection, visibility, sizing, ordering, and pinning transitions", () => {
    const grid = createGrid({ data, columns });
    const leafColumns = grid.getAllLeafColumns();

    expect(rowSelectionReducers.toggleRow({}, "1")).toEqual({ "1": true });
    expect(rowSelectionReducers.toggleRows({ "1": true }, ["1", "2"])).toEqual({ "1": true, "2": true });
    expect(rowSelectionReducers.toggleRows({ "1": true, "2": true }, ["1", "2"])).toEqual({});
    expect(rowSelectionReducers.prune({ "1": true, "2": true, missing: true }, ["1", "2"])).toEqual({
      "1": true,
      "2": true,
    });

    expect(columnVisibilityReducers.set({}, { name: true, age: false })).toEqual({ age: false });
    expect(columnVisibilityReducers.toggleColumn({ age: false }, "age")).toEqual({});

    expect(columnSizingReducers.set(leafColumns, {}, { name: 500, age: 10, missing: 100 })).toEqual({
      name: 240,
      age: 64,
    });

    expect(columnOrderReducers.set(getOrderableLeafColumns(grid.getAllColumns()), [], ["role", "missing", "role", "name"])).toEqual([
      "role",
      "name",
    ]);
    expect(columnOrderReducers.moveColumn(leafColumns, ["role", "name"], "name", "role", "after")).toEqual([
      "role",
      "name",
      "age",
    ]);

    expect(columnPinningReducers.set({ left: [], right: [] }, { left: ["name", "name"], right: ["age", "name"] })).toEqual({
      left: ["name"],
      right: ["age"],
    });
    expect(columnPinningReducers.pinColumn({ left: ["name"], right: [] }, "name", false)).toEqual({ left: [], right: [] });

    expect(groupingReducers.set(leafColumns, [], ["role", "missing", "role", "name"])).toEqual(["role", "name"]);
    expect(groupingReducers.toggleColumn(leafColumns, ["role"], "name")).toEqual(["role", "name"]);
    expect(groupingReducers.toggleColumn(leafColumns, ["role", "name"], "role", false)).toEqual(["name"]);
    expect(groupingReducers.moveColumn(leafColumns, ["role", "name"], "name", "role", "before")).toEqual(["name", "role"]);
    expect(groupingReducers.moveColumn(leafColumns, ["role", "name"], "role", "name", "after")).toEqual(["name", "role"]);
    expect(groupingReducers.moveColumn(leafColumns, ["role", "name"], "role", "missing", "after")).toEqual(["role", "name"]);

    const groupedRows = grid.getGroupedRowModel().flatRows;
    expect(expandedReducers.toggleRow(groupedRows, {}, "missing")).toEqual({});
    expect(expandedReducers.toggleRows(groupedRows, { missing: true })).toEqual({});
  });

  it("normalizes expanded state against expandable grouped rows", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        grouping: ["role"],
      },
    });
    const groupedRows = grid.getGroupedRowModel().flatRows;
    const expandableRowIds = groupedRows.filter((row) => row.getCanExpand()).map((row) => row.id);

    expect(expandableRowIds).toHaveLength(2);
    expect(expandedReducers.toggleRow(groupedRows, {}, expandableRowIds[0]!)).toEqual({ [expandableRowIds[0]!]: true });
    expect(expandedReducers.toggleRows(groupedRows, {})).toEqual({
      [expandableRowIds[0]!]: true,
      [expandableRowIds[1]!]: true,
    });
    expect(expandedReducers.set(groupedRows, {}, { [expandableRowIds[0]!]: true, missing: true })).toEqual({
      [expandableRowIds[0]!]: true,
    });
  });
});
