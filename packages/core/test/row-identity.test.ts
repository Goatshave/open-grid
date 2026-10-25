import { describe, expect, it } from "vitest";
import { createGrid, type CellEditEvent, type ColumnDef, type RowModel } from "../src";
import { createRowModel } from "../src/rows";

const specialIds = ["__proto__", "constructor", "toString", "hasOwnProperty"];
interface Item { id: string; name: string; rank: number; team: string; children?: Item[]; }
const data: Item[] = ["ordinary", ...specialIds].map((id, rank) => ({ id, name: `Name ${id}`, rank, team: "A" }));
const columns: ColumnDef<Item>[] = [
  { accessorKey: "id" }, { accessorKey: "name", enableEditing: true },
  { accessorKey: "rank" }, { accessorKey: "team", aggregationFn: "count" },
];

function expectOwnIndex(model: RowModel<Item>) {
  const index = model.rowsById;
  expect(Object.getPrototypeOf(index)).toBeNull();
  // Sorted models may share their source index; a dictionary has no row order.
  expect(Object.keys(index).sort()).toEqual(model.flatRows.map((row) => row.id).sort());
  expect(Object.values(index)).toHaveLength(model.flatRows.length);
  expect(Object.values(index)).toEqual(expect.arrayContaining(model.flatRows));
  for (const row of model.flatRows) {
    expect(Object.hasOwn(index, row.id)).toBe(true);
    expect(index[row.id]).toBe(row);
  }
  for (const missing of ["valueOf", "isPrototypeOf", "__defineGetter__", "__lookupSetter__"]) {
    expect(index[missing]).toBeUndefined();
  }
  // Rows contain cyclic leafRows. Project row values while serializing the ID
  // dictionary to verify enumerable keys without claiming raw rows are JSON data.
  const projected = JSON.parse(JSON.stringify(index, (_key, value) =>
    typeof value?.getValue === "function" ? { id: value.id } : value));
  expect(Object.keys(projected)).toEqual(Object.keys(index));
  for (const id of Object.keys(index)) expect(projected[id]).toEqual({ id });
}

function applyNameEdit(event: CellEditEvent<Item>) {
  if (event.phase === "commit" && !event.defaultPrevented && event.column.id === "name") {
    event.grid.setOptions((previous) => ({ ...previous,
      data: previous.data.map((row) => row.id === event.row.id ? { ...row, name: String(event.value) } : row),
    }));
  }
}

describe("row identity dictionaries", () => {
  it.each([false, true])("indexes nested models and caches lazy indexes (lazy=%s)", (lazyRowsById) => {
    const grid = createGrid<Item>({ data: [{ ...data[0]!, children: data.slice(1) }], columns,
      getRowId: (row) => row.id, getSubRows: (row) => row.children });
    const model = createRowModel(grid.getCoreRowModel().rows, { lazyRowsById });
    expectOwnIndex(model);
    expect(model.rowsById).toBe(model.rowsById);
  });

  it.each([false, true])("keeps displayed-only and empty models safe (lazy=%s)", (lazyRowsById) => {
    const grid = createGrid<Item>({ data, columns, getRowId: (row) => row.id });
    expectOwnIndex(createRowModel(grid.getCoreRowModel().rows, { includeSubRows: false, lazyRowsById }));
    const empty = createRowModel<Item>([], { includeSubRows: false, lazyRowsById });
    expectOwnIndex(empty);
    for (const id of specialIds) expect(empty.rowsById[id]).toBeUndefined();
  });

  it("keeps safe indexes through filtering, sorting, grouping, expansion, and pagination", () => {
    const grid = createGrid<Item>({ data, columns, getRowId: (row) => row.id, groupFooterMode: "expanded",
      initialState: { pagination: { pageIndex: 1, pageSize: 2 } } });
    grid.setColumnFilters([{ id: "rank", value: { type: "number-range", min: 1 } }]);
    grid.setSorting([{ id: "rank", desc: true }]);
    grid.setGrouping(["team"]);
    grid.toggleAllRowsExpanded(true);
    for (const model of [grid.getCoreRowModel(), grid.getFilteredRowModel(), grid.getSortedRowModel(),
      grid.getGroupedRowModel(), grid.getExpandedRowModel(), grid.getRowModel()]) expectOwnIndex(model);
    for (const id of specialIds) expect(grid.getGroupedRowModel().rowsById[id]?.original?.id).toBe(id);
  });

  it.each(specialIds)("selects, edits, exports, and undoes an off-page row named %s", (id) => {
    const grid = createGrid<Item>({ data: structuredClone(data), columns, getRowId: (row) => row.id,
      rowSelectionMode: "descendants", editHistoryLimit: 10, onCellEdit: applyNameEdit,
      initialState: { pagination: { pageIndex: 0, pageSize: 1 } } });
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["ordinary"]);
    expect(grid.getSelectedRowModel().rows).toEqual([]);
    expect(grid.getIsRowSelected(id)).toBe(false);
    grid.toggleRowSelected(id);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual([id]);
    expectOwnIndex(grid.getSelectedRowModel());
    expect(grid.getExportText({ rowScope: "selected", columnIds: ["id"], includeHeaders: false })).toBe(id);
    grid.setFocusedCell({ rowId: id, columnId: "name" });
    // Start the editor on its page; history and selected export remain ID-based.
    grid.setPageIndex(data.findIndex((row) => row.id === id));
    expect(grid.startCellEdit(id, "name")?.row.id).toBe(id);
    expect(grid.commitCellEdit("Changed")?.defaultPrevented).toBe(false);
    expect(grid.getCoreRowModel().rowsById[id]?.getValue("name")).toBe("Changed");
    grid.setPageIndex(0);
    expect(grid.undoCellEdit()).toHaveLength(1);
    expect(grid.getCoreRowModel().rowsById[id]?.getValue("name")).toBe(`Name ${id}`);
    grid.toggleRowSelected(id);
    expect(grid.getIsRowSelected(id)).toBe(false);
  });

  it("retains __proto__ exclusions when pruning compact all-row selection", () => {
    const grid = createGrid<Item>({ data, columns, getRowId: (row) => row.id });
    expect(grid.getSelectedRowModel().rows).toEqual([]);
    grid.toggleAllRowsSelected(true);
    grid.toggleRowSelected("__proto__", false);
    expect(grid.getIsRowSelected("__proto__")).toBe(false);
    expect(Object.hasOwn(grid.getState().rowSelection, "__proto__")).toBe(true);
    grid.pruneRowSelection();
    expect(grid.getIsRowSelected("__proto__")).toBe(false);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(data.slice(0, 1).concat(data.slice(2)).map((row) => row.id));
    grid.resetRowSelection();
    expect(grid.getSelectedRowModel().rows).toEqual([]);
  });

  it("expands and collapses special-name parents without inherited flags", () => {
    const tree = specialIds.map((id, rank) => ({ id, rank, name: id, team: "A",
      children: [{ id: `child:${id}`, rank, name: "Child", team: "A" }] }));
    const grid = createGrid<Item>({ data: tree, columns, getRowId: (row) => row.id, getSubRows: (row) => row.children,
      initialState: { pagination: { pageIndex: 0, pageSize: 20 } } });
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(specialIds);
    for (const id of specialIds) {
      expect(grid.getIsRowExpanded(id)).toBe(false);
      grid.toggleRowExpanded(id);
      expect(grid.getIsRowExpanded(id)).toBe(true);
      expect(grid.getRowModel().rowsById[`child:${id}`]?.parentId).toBe(id);
      grid.toggleRowExpanded(id);
      expect(grid.getIsRowExpanded(id)).toBe(false);
    }
    grid.toggleAllRowsExpanded(true);
    expect(grid.getRowModel().rows).toHaveLength(8);
    expectOwnIndex(grid.getRowModel());
    grid.toggleAllRowsExpanded();
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(specialIds);
  });

  it("does not read inherited entries when history references a removed row", () => {
    const grid = createGrid<Item>({ data: [{ ...data[2]! }], columns, getRowId: (row) => row.id,
      editHistoryLimit: 10, onCellEdit: applyNameEdit });
    grid.startCellEdit("constructor", "name");
    grid.commitCellEdit("Changed");
    grid.setOptions((previous) => ({ ...previous, data: [] }));
    expect(() => grid.undoCellEdit()).not.toThrow();
    expect(grid.getCoreRowModel().rows).toEqual([]);
  });

  it("ignores inherited flags in supplied selection and expansion state", () => {
    const inherited = Object.create({ constructor: true }) as Record<string, boolean>;
    const grid = createGrid<Item>({ data: [{ ...data[2]!, children: [{ ...data[0]! }] }], columns,
      getRowId: (row) => row.id, getSubRows: (row) => row.children,
      initialState: { rowSelection: inherited, expanded: inherited } });
    expect(grid.getIsRowSelected("constructor")).toBe(false);
    expect(grid.getIsRowExpanded("constructor")).toBe(false);
    expect(grid.getRowModel().rows).toHaveLength(1);
    grid.setState((previous) => ({ ...previous, allRowsSelected: true,
      rowSelection: Object.create({ constructor: false }) as Record<string, boolean> }));
    expect(grid.getIsRowSelected("constructor")).toBe(true);
  });
});
