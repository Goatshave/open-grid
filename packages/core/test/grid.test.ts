import { describe, expect, it } from "vitest";
import {
  createGrid,
  fitColumnsToWidth,
  type CellEditEvent,
  type CellInteractionEvent,
  type ColumnDef,
  type ColumnResizeEvent,
  type RowInteractionEvent,
  type SortingState,
} from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
}

interface TreeItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size: number;
  children?: TreeItem[];
}

const data: Person[] = [
  { id: "1", name: "Mina", age: 32, role: "admin" },
  { id: "2", name: "Joon", age: 25, role: "editor" },
  { id: "3", name: "Ara", age: 41, role: "admin" },
];

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age" },
  { accessorKey: "role", header: "Role" },
];

const treeData: TreeItem[] = [
  {
    id: "docs",
    name: "Docs",
    type: "folder",
    size: 0,
    children: [
      { id: "intro", name: "Intro.md", type: "file", size: 12 },
      {
        id: "guides",
        name: "Guides",
        type: "folder",
        size: 0,
        children: [{ id: "api", name: "API.md", type: "file", size: 24 }],
      },
    ],
  },
  { id: "readme", name: "README.md", type: "file", size: 8 },
];

const treeColumns: ColumnDef<TreeItem>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "size", header: "Size" },
];

describe("createGrid", () => {
  it("creates typed rows and values", () => {
    const grid = createGrid({ data, columns, getRowId: (row) => row.id });
    const core = grid.getCoreRowModel();

    expect(core.rows[0]?.id).toBe("1");
    expect(core.rows[0]?.getValue("name")).toBe("Mina");
    expect(core.flatRows).toBe(core.rows);
    expect(Object.getOwnPropertyDescriptor(core, "rowsById")?.get).toBeTypeOf("function");
    expect(core.rowsById["1"]).toBe(core.rows[0]);
    expect(core.rowsById).toBe(core.rowsById);
    expect(core.rows[0]?.subRows).toEqual([]);
    expect(core.rows[0]?.leafRows).toEqual([core.rows[0]]);
  });

  it("builds expandable tree row models from nested sub rows", () => {
    const parentIds: Array<string | undefined> = [];
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row, _index, parentRow) => {
        parentIds.push(parentRow?.id);
        return row.id;
      },
      getSubRows: (row) => row.children,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    const [docs, readme] = grid.getCoreRowModel().rows;

    expect(parentIds).toEqual([undefined, "docs", "docs", "guides", undefined]);
    expect(docs?.getCanExpand()).toBe(true);
    expect(readme?.getCanExpand()).toBe(false);
    expect(docs?.subRows.map((row) => [row.id, row.depth, row.parentId, row.getCanExpand()])).toEqual([
      ["intro", 1, "docs", false],
      ["guides", 1, "docs", true],
    ]);
    expect(docs?.leafRows.map((row) => row.id)).toEqual(["intro", "api"]);
    expect(grid.getCoreRowModel().flatRows.map((row) => row.id)).toEqual(["docs", "intro", "guides", "api", "readme"]);
    expect(grid.getCoreRowModel().flatRows).not.toBe(grid.getCoreRowModel().rows);
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual(["docs", "readme"]);

    grid.toggleRowExpanded("docs", true);

    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual(["docs", "intro", "guides", "readme"]);

    grid.toggleRowExpanded("guides", true);

    expect(grid.getExpandedRowModel().rows.map((row) => [row.id, row.depth, row.parentId])).toEqual([
      ["docs", 0, null],
      ["intro", 1, "docs"],
      ["guides", 1, "docs"],
      ["api", 2, "guides"],
      ["readme", 0, null],
    ]);
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["docs", "intro", "guides", "api", "readme"]);
  });

  it("supports lazy tree parents that can expand before sub rows are loaded", () => {
    const lazyTreeData: TreeItem[] = [
      { id: "remote", name: "Remote", type: "folder", size: 0 },
      { id: "readme", name: "README.md", type: "file", size: 8 },
    ];
    const loadedTreeData: TreeItem[] = [
      {
        id: "remote",
        name: "Remote",
        type: "folder",
        size: 0,
        children: [{ id: "remote-api", name: "Remote API.md", type: "file", size: 18 }],
      },
      { id: "readme", name: "README.md", type: "file", size: 8 },
    ];
    const grid = createGrid({
      data: lazyTreeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      getRowCanExpand: (row) => row.type === "folder",
      initialState: {
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    const [remote] = grid.getCoreRowModel().rows;

    expect(remote?.getCanExpand()).toBe(true);
    expect(remote?.subRows).toEqual([]);
    expect(remote?.leafRows.map((row) => row.id)).toEqual(["remote"]);
    expect(grid.getCoreRowModel().flatRows).toBe(grid.getCoreRowModel().rows);

    grid.toggleRowExpanded("remote", true);

    expect(grid.getState().expanded).toEqual({ remote: true });
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual(["remote", "readme"]);

    grid.setOptions((previous) => ({
      ...previous,
      data: loadedTreeData,
    }));

    expect(grid.getCoreRowModel().rows[0]?.subRows.map((row) => row.id)).toEqual(["remote-api"]);
    expect(grid.getCoreRowModel().flatRows).not.toBe(grid.getCoreRowModel().rows);
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual(["remote", "remote-api", "readme"]);
  });

  it("filters tree rows while preserving matching ancestor paths", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      initialState: {
        columnFilters: [{ id: "name", value: "api" }],
        expanded: { docs: true, guides: true },
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    const [docs] = grid.getFilteredRowModel().rows;

    expect(grid.getFilteredRowModel().flatRows.map((row) => [row.id, row.depth, row.parentId])).toEqual([
      ["docs", 0, null],
      ["guides", 1, "docs"],
      ["api", 2, "guides"],
    ]);
    expect(docs?.subRows.map((row) => row.id)).toEqual(["guides"]);
    expect(docs?.leafRows.map((row) => row.id)).toEqual(["api"]);
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["docs", "guides", "api"]);
  });

  it("sorts tree rows recursively by sibling depth", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      initialState: {
        sorting: [{ id: "name", desc: true }],
        expanded: { docs: true, guides: true },
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    const docs = grid.getSortedRowModel().rows.find((row) => row.id === "docs");

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["readme", "docs"]);
    expect(grid.getSortedRowModel().flatRows).not.toBe(grid.getSortedRowModel().rows);
    expect(docs?.subRows.map((row) => row.id)).toEqual(["intro", "guides"]);
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["readme", "docs", "intro", "guides", "api"]);
  });

  it("keeps tree parent row selection self-scoped by default", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
    });

    grid.toggleRowSelected("docs", true);

    expect(grid.getState().rowSelection).toEqual({ docs: true });
    expect(grid.getIsRowSelected("docs")).toBe(true);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["docs"]);
  });

  it("selects tree descendant leaf rows when descendant selection mode is enabled", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      rowSelectionMode: "descendants",
      initialState: {
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });

    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["docs"]);

    grid.toggleRowSelected("docs", true);

    expect(grid.getState().rowSelection).toEqual({ api: true, intro: true });
    expect(grid.getIsRowSelected("docs")).toBe(true);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["intro", "api"]);
    expect(grid.getPageSelectedRowModel().rows.map((row) => row.id)).toEqual(["intro", "api"]);
    expect(grid.getIsAllPageRowsSelected()).toBe(true);
    expect(grid.getIsAllRowsSelected()).toBe(false);

    grid.toggleAllRowsSelected(true);
    expect(grid.getState().rowSelection).toEqual({ api: true, intro: true, readme: true });
    expect(grid.getIsAllRowsSelected()).toBe(true);

    grid.pruneRowSelection("page");
    expect(grid.getState().rowSelection).toEqual({ api: true, intro: true });

    grid.toggleRowSelected("docs", false);
    expect(grid.getState().rowSelection).toEqual({});
  });

  it("applies tree descendant selection to filtered tree scopes", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      rowSelectionMode: "descendants",
      initialState: {
        columnFilters: [{ id: "name", value: "api" }],
        expanded: { docs: true, guides: true },
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });

    grid.toggleAllFilteredRowsSelected(true);

    expect(grid.getState().rowSelection).toEqual({ api: true });
    expect(grid.getFilteredSelectedRowModel().rows.map((row) => row.id)).toEqual(["api"]);
    expect(grid.getIsRowSelected("docs")).toBe(true);
    expect(grid.getIsAllFilteredRowsSelected()).toBe(true);
  });

  it("filters, sorts, and paginates client data", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        sorting: [{ id: "age", desc: true }],
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });

    const filteredRowModel = grid.getFilteredRowModel();
    const sortedRowModel = grid.getSortedRowModel();

    expect(grid.getPrePaginationRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Ara", "Mina"]);
    expect(sortedRowModel.flatRows).toBe(sortedRowModel.rows);
    expect(Object.getOwnPropertyDescriptor(sortedRowModel, "rowsById")?.get).toBeTypeOf("function");
    expect(sortedRowModel.rowsById).toBe(filteredRowModel.rowsById);
    expect(grid.getRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Ara"]);
    expect(grid.getRowModel().flatRows).toBe(grid.getRowModel().rows);
    expect(grid.getPageCount()).toBe(2);
  });

  it("keeps default sorting stable across null, equal, and descending values", () => {
    const grid = createGrid({
      data: [
        { id: "a", value: 2 },
        { id: "b", value: null },
        { id: "c", value: 2 },
        { id: "d", value: 10 },
      ],
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["b", "a", "c", "d"]);

    grid.setSorting([{ id: "value", desc: true }]);

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["d", "a", "c", "b"]);
  });

  it("stably sorts large flat finite-number models in both cold directions", () => {
    const numericData = Array.from({ length: 1_024 }, (_, index) => ({
      id: String(index),
      value: (index * 37 % 101) - 50,
    }));
    numericData[100]!.value = -0;
    numericData[101]!.value = 0;
    numericData[200]!.value = -Number.MAX_VALUE;
    numericData[201]!.value = Number.MAX_VALUE;
    numericData[300]!.value = -Number.MIN_VALUE;
    numericData[301]!.value = Number.MIN_VALUE;

    const expectedIds = (direction: number) => [...numericData]
      .sort((left, right) => {
        const comparison = left.value - right.value;
        return comparison === 0
          ? Number(left.id) - Number(right.id)
          : comparison * direction;
      })
      .map((row) => row.id);
    const grid = createGrid({
      data: numericData,
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(expectedIds(1));
    grid.setSorting([]);
    grid.getSortedRowModel();
    grid.setSorting([{ id: "value", desc: true }]);
    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(expectedIds(-1));
  });

  it("evaluates large mixed default-sort values once before using the general fallback", () => {
    let accesses = 0;
    const mixedData = Array.from({ length: 600 }, (_, index) => ({
      id: String(index),
      value: index === 511 ? null : 600 - index,
    }));
    const grid = createGrid({
      data: mixedData,
      columns: [{
        id: "value",
        accessorFn: (row) => {
          accesses += 1;
          return row.value;
        },
      }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    const rows = grid.getSortedRowModel().rows;
    expect(rows[0]?.id).toBe("511");
    expect(rows.at(-1)?.id).toBe("0");
    expect(accesses).toBe(mixedData.length);
  });

  it("precomputes each default multi-sort accessor once per row", () => {
    const accesses = { status: 0, value: 0 };
    const multiSortData = [
      { id: "a", status: "blocked", value: 3 },
      { id: "b", status: "active", value: 4 },
      { id: "c", status: "blocked", value: 1 },
      { id: "d", status: "active", value: 2 },
      { id: "e", status: "active", value: 2 },
    ];
    const grid = createGrid({
      data: multiSortData,
      columns: [
        {
          id: "status",
          accessorFn: (row) => {
            accesses.status += 1;
            return row.status;
          },
        },
        {
          id: "value",
          accessorFn: (row) => {
            accesses.value += 1;
            return row.value;
          },
        },
      ],
      getRowId: (row) => row.id,
      initialState: {
        sorting: [
          { id: "status", desc: false },
          { id: "value", desc: false },
        ],
      },
    });

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["d", "e", "b", "c", "a"]);
    expect(accesses).toEqual({ status: multiSortData.length, value: multiSortData.length });
  });

  it("keeps primitive multi-sort rules stable across radix and ranked passes", () => {
    const multiSortData = Array.from({ length: 1_024 }, (_, index) => ({
      id: String(index),
      status: ["pending", "Active", "active", "blocked"][index % 4]!,
      value: (index * 37) % 29,
    }));
    const expectedIds = [...multiSortData]
      .sort((left, right) =>
        left.status.localeCompare(right.status, undefined, { numeric: true, sensitivity: "base" })
        || right.value - left.value
        || Number(left.id) - Number(right.id))
      .map((row) => row.id);
    const grid = createGrid({
      data: multiSortData,
      columns: [
        { accessorKey: "status" },
        { accessorKey: "value" },
      ],
      getRowId: (row) => row.id,
      initialState: {
        sorting: [
          { id: "status", desc: false },
          { id: "value", desc: true },
        ],
      },
    });

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(expectedIds);
  });

  it("preserves stable ties when reversing a finite-number sort", () => {
    const grid = createGrid({
      data: [
        { id: "a", value: 2 },
        { id: "b", value: 1 },
        { id: "c", value: 2 },
        { id: "d", value: 3 },
      ],
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });
    const ascending = grid.getSortedRowModel();

    expect(ascending.rows.map((row) => row.id)).toEqual(["b", "a", "c", "d"]);
    grid.setSorting([{ id: "value", desc: true }]);

    const descending = grid.getSortedRowModel();
    expect(descending.rows.map((row) => row.id)).toEqual(["d", "a", "c", "b"]);
    expect(descending.rowsById).toBe(ascending.rowsById);
  });

  it("evaluates each finite-number accessor once when reversing a sort", () => {
    let accesses = 0;
    const numericData = Array.from({ length: 600 }, (_, index) => ({
      id: String(index),
      value: index % 17,
    }));
    const grid = createGrid({
      data: numericData,
      columns: [{
        id: "value",
        accessorFn: (row) => {
          accesses += 1;
          return row.value;
        },
      }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    grid.getSortedRowModel();
    accesses = 0;
    grid.setSorting([{ id: "value", desc: true }]);
    const rows = grid.getSortedRowModel().rows;

    expect(rows[0]?.original?.value).toBe(16);
    expect(rows.at(-1)?.original?.value).toBe(0);
    expect(accesses).toBe(numericData.length);
  });

  it("preserves stable ties when a very large direction change reuses radix sorting", () => {
    const numericData = Array.from({ length: 65_537 }, (_, index) => ({
      id: String(index),
      value: index % 257,
    }));
    const grid = createGrid({
      data: numericData,
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    grid.getSortedRowModel();
    grid.setSorting([{ id: "value", desc: true }]);
    const rows = grid.getSortedRowModel().rows;
    const highestValueIds = numericData.filter((row) => row.value === 256).map((row) => row.id);
    const lowestValueIds = numericData.filter((row) => row.value === 0).map((row) => row.id);

    expect(rows.slice(0, highestValueIds.length).map((row) => row.id)).toEqual(highestValueIds);
    expect(rows.slice(-lowestValueIds.length).map((row) => row.id)).toEqual(lowestValueIds);
  });

  it("runs a custom comparator again when the sort direction changes", () => {
    let comparisons = 0;
    const grid = createGrid({
      data: [
        { id: "a", value: 2 },
        { id: "b", value: 1 },
        { id: "c", value: 3 },
      ],
      columns: [{
        accessorKey: "value",
        sortFn: (left, right, columnId) => {
          comparisons += 1;
          return Number(left.getValue(columnId)) - Number(right.getValue(columnId));
        },
      }],
      getRowId: (row) => row.id,
      initialState: { sorting: [{ id: "value", desc: false }] },
    });

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["b", "a", "c"]);
    comparisons = 0;
    grid.setSorting([{ id: "value", desc: true }]);

    expect(grid.getSortedRowModel().rows.map((row) => row.id)).toEqual(["c", "a", "b"]);
    expect(comparisons).toBeGreaterThan(0);
  });

  it("reuses the pre-pagination model when the first page covers every row", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: { pagination: { pageIndex: 0, pageSize: data.length } },
    });

    expect(grid.getRowModel()).toBe(grid.getPrePaginationRowModel());
    grid.setPageSize(data.length + 1);
    expect(grid.getRowModel()).toBe(grid.getPrePaginationRowModel());
  });

  it("filters rows across columns and combines global and column filters", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        globalFilter: "editor",
        pagination: { pageIndex: 0, pageSize: 25 },
      },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Joon"]);
    expect(Object.keys(grid.getFilteredRowModel().rowsById)).toEqual(["1"]);

    grid.setGlobalFilter("3");
    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Mina"]);

    grid.setColumnFilters([{ id: "role", value: "admin" }]);
    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Mina"]);

    grid.setGlobalFilter((previous) => `${previous}2`);
    expect(grid.getState().globalFilter).toBe("32");
    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Mina"]);

    grid.setGlobalFilter("");
    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Mina", "Ara"]);
  });

  it("preserves custom filter context for a single column", () => {
    const calls: Array<[unknown, unknown, string, string]> = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        {
          accessorKey: "role",
          header: "Role",
          filterFn: (value, filterValue, row, column) => {
            calls.push([value, filterValue, row.id, column.id]);
            return value === filterValue;
          },
        },
      ],
      getRowId: (row) => row.id,
      initialState: { columnFilters: [{ id: "role", value: "editor" }] },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.id)).toEqual(["2"]);
    expect(calls).toEqual([
      ["admin", "editor", "1", "role"],
      ["editor", "editor", "2", "role"],
      ["admin", "editor", "3", "role"],
    ]);
  });

  it("reuses flat row models through the expansion stage", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: { columnFilters: [{ id: "role", value: "admin" }] },
    });

    expect(grid.getExpandedRowModel()).toBe(grid.getGroupedRowModel());
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["1", "3"]);
  });

  it("supports global filter opt-out and custom matching", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "role", header: "Role", enableGlobalFiltering: false },
      ],
      globalFilterFn: (value, filterValue) => String(value ?? "").startsWith(String(filterValue)),
      initialState: { globalFilter: "Mi" },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Mina"]);
    grid.setGlobalFilter("admin");
    expect(grid.getFilteredRowModel().rows).toEqual([]);
  });

  it("preserves default global matching across primitive value types", () => {
    const grid = createGrid({
      data: [
        { id: "number", value: 1234 },
        { id: "bigint", value: 1234n },
        { id: "boolean", value: true },
        { id: "null", value: null },
        { id: "nan", value: Number.NaN },
        { id: "infinity", value: Number.POSITIVE_INFINITY },
        { id: "text", value: "Blocked" },
      ],
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
    });
    const matchingIds = (query: string) => {
      grid.setGlobalFilter(query);
      return grid.getFilteredRowModel().rows.map((row) => row.id);
    };

    expect(matchingIds("23")).toEqual(["number", "bigint"]);
    expect(matchingIds("TRUE")).toEqual(["boolean"]);
    expect(matchingIds("nan")).toEqual(["nan"]);
    expect(matchingIds("finity")).toEqual(["infinity"]);
    expect(matchingIds("blocked")).toEqual(["text"]);
    expect(matchingIds("missing")).toEqual([]);
  });

  it("does not cache object conversion in the default single-column filter", () => {
    let conversionCount = 0;
    const sharedValue = {
      toString() {
        conversionCount += 1;
        return "match";
      },
    };
    const grid = createGrid({
      data: [
        { id: "first", value: sharedValue },
        { id: "second", value: sharedValue },
      ],
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { columnFilters: [{ id: "value", value: "match" }] },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.id)).toEqual(["first", "second"]);
    expect(conversionCount).toBe(2);
  });

  it("preserves object conversion and AND semantics across default multi-column filters", () => {
    let statusConversionCount = 0;
    let regionConversionCount = 0;
    const status = {
      toString() {
        statusConversionCount += 1;
        return "Blocked";
      },
    };
    const region = {
      toString() {
        regionConversionCount += 1;
        return "APAC";
      },
    };
    const grid = createGrid({
      data: [
        { id: "first", status, region },
        { id: "second", status, region },
        { id: "third", status: "Complete", region },
      ],
      columns: [{ accessorKey: "status" }, { accessorKey: "region" }],
      getRowId: (row) => row.id,
      initialState: {
        columnFilters: [
          { id: "status", value: "blocked" },
          { id: "region", value: "apac" },
        ],
      },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.id)).toEqual(["first", "second"]);
    expect(statusConversionCount).toBe(2);
    expect(regionConversionCount).toBe(2);
  });

  it("does not cache object conversion in the default global filter", () => {
    let conversionCount = 0;
    const sharedValue = {
      toString() {
        conversionCount += 1;
        return "match";
      },
    };
    const grid = createGrid({
      data: [
        { id: "first", value: sharedValue },
        { id: "second", value: sharedValue },
      ],
      columns: [{ accessorKey: "value" }],
      getRowId: (row) => row.id,
      initialState: { globalFilter: "match" },
    });

    expect(grid.getFilteredRowModel().rows.map((row) => row.id)).toEqual(["first", "second"]);
    expect(conversionCount).toBe(2);
  });

  it("preserves matching tree paths for global filters", () => {
    const grid = createGrid({
      data: treeData,
      columns: treeColumns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      initialState: {
        globalFilter: "api",
        expanded: { docs: true, guides: true },
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });

    expect(grid.getFilteredRowModel().flatRows.map((row) => row.id)).toEqual(["docs", "guides", "api"]);
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual(["docs", "guides", "api"]);
  });

  it("normalizes invalid client pagination bounds", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        sorting: [{ id: "age", desc: true }],
        pagination: { pageIndex: -3, pageSize: 0 },
      },
    });

    expect(grid.getRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Ara"]);
    expect(grid.getPageCount()).toBe(3);

    grid.setPageIndex(Number.NaN);
    grid.setPageSize(Number.POSITIVE_INFINITY);

    expect(grid.getState().pagination).toEqual({ pageIndex: 0, pageSize: 1 });
    expect(grid.getRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Ara"]);

    grid.setPagination({ pageIndex: -2, pageSize: 0 });

    expect(grid.getState().pagination).toEqual({ pageIndex: 0, pageSize: 1 });
    expect(grid.getRowModel().rows.map((row) => row.getValue("name"))).toEqual(["Ara"]);
  });

  it("moves between pagination boundaries through convenience APIs", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: { pagination: { pageIndex: 0, pageSize: 1 } },
    });

    expect(grid.getCanPreviousPage()).toBe(false);
    expect(grid.getCanNextPage()).toBe(true);

    grid.previousPage();
    expect(grid.getState().pagination.pageIndex).toBe(0);

    grid.nextPage();
    expect(grid.getState().pagination.pageIndex).toBe(1);
    expect(grid.getCanPreviousPage()).toBe(true);
    expect(grid.getCanNextPage()).toBe(true);

    grid.lastPage();
    expect(grid.getState().pagination.pageIndex).toBe(2);
    expect(grid.getCanNextPage()).toBe(false);

    grid.nextPage();
    expect(grid.getState().pagination.pageIndex).toBe(2);

    grid.firstPage();
    expect(grid.getState().pagination.pageIndex).toBe(0);

    grid.setPageIndex(99);
    grid.previousPage();
    expect(grid.getState().pagination.pageIndex).toBe(1);

    grid.setPageIndex(99);
    grid.nextPage();
    expect(grid.getState().pagination.pageIndex).toBe(2);
  });

  it("keeps manual server-side modes from transforming rows", () => {
    const grid = createGrid({
      data,
      columns,
      manualFiltering: true,
      manualSorting: true,
      manualGrouping: true,
      manualPagination: true,
      pageCount: 12,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        globalFilter: "missing",
        sorting: [{ id: "age", desc: true }],
        grouping: ["role"],
        pagination: { pageIndex: 2, pageSize: 1 },
      },
    });

    expect(grid.getRowModel().rows).toHaveLength(3);
    expect(grid.getPageCount()).toBe(12);
  });

  it("normalizes manual server-side page counts", () => {
    const grid = createGrid({
      data,
      columns,
      manualPagination: true,
      pageCount: 0,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });

    expect(grid.getPageCount()).toBe(1);

    grid.setOptions((previous) => ({ ...previous, pageCount: Number.NaN }));
    expect(grid.getPageCount()).toBe(1);

    grid.setOptions((previous) => ({ ...previous, pageCount: 2.8 }));
    expect(grid.getPageCount()).toBe(2);
  });

  it("groups sorted rows and aggregates grouped values", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", header: "Age", aggregationFn: "sum" },
        { accessorKey: "role", header: "Role" },
      ],
      getRowId: (row) => row.id,
      initialState: {
        sorting: [{ id: "age", desc: true }],
        grouping: ["role"],
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });

    const groups = grid.getGroupedRowModel().rows;

    expect(groups.map((row) => [row.getIsGrouped(), row.depth, row.groupingColumnId, row.groupingValue])).toEqual([
      [true, 0, "role", "admin"],
      [true, 0, "role", "editor"],
    ]);
    expect(groups.map((row) => [row.getValue("role"), row.getValue("age"), row.leafRows.map((leafRow) => leafRow.id)])).toEqual([
      ["admin", 73, ["3", "1"]],
      ["editor", 25, ["2"]],
    ]);
    expect(groups[0]?.subRows.map((row) => [row.id, row.depth, row.parentId, row.getIsGrouped()])).toEqual([
      ["3", 1, groups[0]?.id, false],
      ["1", 1, groups[0]?.id, false],
    ]);
    expect(grid.getPrePaginationRowModel()).toBe(grid.getExpandedRowModel());
    expect(grid.getRowModel().rows.map((row) => row.groupingValue)).toEqual(["admin", "editor"]);

    grid.toggleColumnGrouping("role", false);
    expect(grid.getState().grouping).toEqual([]);
    expect(grid.getGroupedRowModel().rows.map((row) => row.id)).toEqual(["3", "1", "2"]);
  });

  it("moves grouped columns and updates grouping depth order", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        grouping: ["role", "name"],
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });

    expect(grid.getState().grouping).toEqual(["role", "name"]);
    expect(grid.getGroupedRowModel().rows.map((row) => row.id)).toEqual([
      "__group__role:admin",
      "__group__role:editor",
    ]);

    grid.moveGroupingColumn("name", "role", "before");

    expect(grid.getState().grouping).toEqual(["name", "role"]);
    expect(grid.getGroupedRowModel().rows.map((row) => row.id)).toEqual([
      "__group__name:Mina",
      "__group__name:Joon",
      "__group__name:Ara",
    ]);
  });

  it("expands grouped rows before pagination", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", header: "Age", aggregationFn: "count" },
        { accessorKey: "role", header: "Role" },
      ],
      getRowId: (row) => row.id,
      initialState: {
        grouping: ["role"],
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });
    const [adminGroup, editorGroup] = grid.getGroupedRowModel().rows;

    expect(adminGroup?.getCanExpand()).toBe(true);
    expect(editorGroup?.getCanExpand()).toBe(true);
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual([adminGroup?.id, editorGroup?.id]);
    expect(grid.getPageCount()).toBe(1);

    grid.toggleRowExpanded(adminGroup!.id, true);

    expect(grid.getIsRowExpanded(adminGroup!.id)).toBe(true);
    expect(grid.getExpandedRowModel().rows.map((row) => [row.id, row.depth, row.parentId])).toEqual([
      [adminGroup?.id, 0, null],
      ["1", 1, adminGroup?.id],
      ["3", 1, adminGroup?.id],
      [editorGroup?.id, 0, null],
    ]);
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual([adminGroup?.id, "1", "3"]);
    expect(grid.getPageCount()).toBe(2);

    grid.toggleAllRowsExpanded(true);
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual([adminGroup?.id, "1", "3", editorGroup?.id, "2"]);

    grid.resetExpanded();
    expect(grid.getState().expanded).toEqual({});
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual([adminGroup?.id, editorGroup?.id]);
  });

  it("renders aggregate footer rows for expanded grouped rows when enabled", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", header: "Age", aggregationFn: "sum" },
        { accessorKey: "role", header: "Role" },
      ],
      getRowId: (row) => row.id,
      groupFooterMode: "expanded",
      initialState: {
        grouping: ["role"],
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
    const [adminGroup] = grid.getGroupedRowModel().rows;

    expect(adminGroup?.footerRow?.id).toBe(`${adminGroup?.id}>__footer__`);
    expect(grid.getExpandedRowModel().rows.map((row) => row.id)).toEqual([
      "__group__role:admin",
      "__group__role:editor",
    ]);

    grid.toggleRowExpanded(adminGroup!.id, true);

    const rows = grid.getRowModel().rows;
    const footerRow = rows.find((row) => row.getIsGroupFooter());

    expect(rows.map((row) => [row.id, row.getIsGrouped(), row.getIsGroupFooter()])).toEqual([
      ["__group__role:admin", true, false],
      ["1", false, false],
      ["3", false, false],
      ["__group__role:admin>__footer__", false, true],
      ["__group__role:editor", true, false],
    ]);
    expect(footerRow?.parentId).toBe(adminGroup?.id);
    expect(footerRow?.groupFooterFor).toBe(adminGroup?.id);
    expect(footerRow?.groupFooterLabel).toBe("Total admin");
    expect(footerRow?.getValue("age")).toBe(73);

    grid.toggleRowSelected(footerRow!.id, true);

    expect(grid.getState().rowSelection).toEqual({});
  });

  it("selects grouped rows through their leaf row ids", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        grouping: ["role"],
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });
    const [adminGroup] = grid.getGroupedRowModel().rows;

    expect(adminGroup).toBeDefined();
    expect(grid.getRowModel().rows.map((row) => row.id)).toEqual([adminGroup?.id]);
    expect(grid.getIsRowSelected(adminGroup!.id)).toBe(false);

    grid.toggleRowSelected(adminGroup!.id, true);

    expect(grid.getState().rowSelection).toEqual({ "1": true, "3": true });
    expect(grid.getIsRowSelected(adminGroup!.id)).toBe(true);
    expect(grid.getPageSelectedRowModel().rows.map((row) => row.id)).toEqual(["1", "3"]);
    expect(grid.getIsAllPageRowsSelected()).toBe(true);
    expect(grid.getIsAllFilteredRowsSelected()).toBe(false);
    expect(grid.getIsSomeFilteredRowsSelected()).toBe(true);

    grid.toggleAllFilteredRowsSelected(true);
    expect(grid.getState().rowSelection).toEqual({ "1": true, "2": true, "3": true });
    expect(grid.getFilteredSelectedRowModel().rows.map((row) => row.id)).toEqual(["1", "3", "2"]);

    grid.pruneRowSelection("page");
    expect(grid.getState().rowSelection).toEqual({ "1": true, "3": true });

    grid.toggleRowSelected(adminGroup!.id, false);
    expect(grid.getState().rowSelection).toEqual({});
  });

  it("supports nested grouping, grouping value formatters, and custom aggregation", () => {
    const grid = createGrid({
      data,
      columns: [
        {
          accessorKey: "name",
          header: "Name",
          aggregationFn: ({ leafRows }) => leafRows.map((row) => row.getValue("name")).join(","),
        },
        { accessorKey: "age", header: "Age", aggregationFn: "mean" },
        {
          accessorKey: "role",
          header: "Role",
          groupingValue: ({ row }) => (row.role === "admin" ? "staff" : row.role),
        },
      ],
      getRowId: (row) => row.id,
      initialState: {
        grouping: ["role", "age", "role"],
      },
    });

    grid.setGrouping((previous) => previous);
    expect(grid.getState().grouping).toEqual(["role", "age"]);

    const [staffGroup, editorGroup] = grid.getGroupedRowModel().rows;
    expect(staffGroup?.groupingValue).toBe("staff");
    expect(staffGroup?.getValue("age")).toBe(36.5);
    expect(staffGroup?.getValue("name")).toBe("Mina,Ara");
    expect(staffGroup?.subRows.map((row) => [row.groupingColumnId, row.groupingValue, row.leafRows.map((leafRow) => leafRow.id)])).toEqual([
      ["age", 32, ["1"]],
      ["age", 41, ["3"]],
    ]);
    expect(editorGroup?.groupingValue).toBe("editor");
  });

  it("updates interaction state", () => {
    const grid = createGrid({ data, columns });

    grid.toggleRowSelected("1");
    grid.setColumnVisibility({ age: false });
    grid.setColumnSizing({ name: 240 });
    grid.setFocusedCell({ rowId: "1", columnId: "name" });

    expect(grid.getState().rowSelection["1"]).toBe(true);
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "role"]);
    expect(grid.getAllLeafColumns()[0]?.getSize()).toBe(240);
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "name" });
  });

  it("emits preventable framework-neutral row and cell events", () => {
    let rowEvent: RowInteractionEvent<Person> | undefined;
    let cellEvent: CellInteractionEvent<Person> | undefined;
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      onRowEvent: (event) => {
        rowEvent = event;
        event.preventDefault();
      },
      onCellEvent: (event) => {
        cellEvent = event;
        event.preventDefault();
      },
    });
    const row = grid.getRowModel().rows[0];
    const column = grid.getVisibleLeafColumns()[0];

    expect(row).toBeDefined();
    expect(column).toBeDefined();

    const emittedRowEvent = grid.emitRowEvent({ type: "click", row: row!, rowIndex: 0, sourceEvent: { pointerType: "mouse" } });
    const emittedCellEvent = grid.emitCellEvent({
      type: "click",
      row: row!,
      column: column!,
      rowIndex: 0,
      columnIndex: 0,
      sourceEvent: { pointerType: "mouse" },
    });

    expect(emittedRowEvent).toBe(rowEvent);
    expect(emittedRowEvent.defaultPrevented).toBe(true);
    expect(emittedRowEvent.row.id).toBe("1");
    expect(emittedRowEvent.sourceEvent).toEqual({ pointerType: "mouse" });
    expect(emittedCellEvent).toBe(cellEvent);
    expect(emittedCellEvent.defaultPrevented).toBe(true);
    expect(emittedCellEvent.column.id).toBe("name");
    expect(emittedCellEvent.value).toBe("Mina");
  });

  it("manages preventable framework-neutral cell editing events", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        { accessorKey: "age", header: "Age" },
      ],
      getRowId: (row) => row.id,
      onCellEdit: (event) => {
        events.push(event);

        if (event.phase === "commit" && event.value === "blocked") {
          event.preventDefault();
        }
      },
    });

    expect(grid.startCellEdit("1", "age")).toBeNull();
    expect(grid.getState().editingCell).toBeNull();

    const startEvent = grid.startCellEdit("1", "name", { type: "dblclick" });
    expect(startEvent?.type).toBe("cellEdit:start");
    expect(startEvent?.phase).toBe("start");
    expect(startEvent?.value).toBe("Mina");
    expect(startEvent?.previousValue).toBe("Mina");
    expect(startEvent?.sourceEvent).toEqual({ type: "dblclick" });
    expect(grid.getState().editingCell).toEqual({ rowId: "1", columnId: "name" });
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "name" });
    expect(grid.getIsCellEditing("1", "name")).toBe(true);

    const blockedCommitEvent = grid.commitCellEdit("blocked");
    expect(blockedCommitEvent?.defaultPrevented).toBe(true);
    expect(grid.getState().editingCell).toEqual({ rowId: "1", columnId: "name" });

    const commitEvent = grid.commitCellEdit("Minah");
    expect(commitEvent?.type).toBe("cellEdit:commit");
    expect(commitEvent?.phase).toBe("commit");
    expect(commitEvent?.value).toBe("Minah");
    expect(commitEvent?.previousValue).toBe("Mina");
    expect(grid.getState().editingCell).toBeNull();

    grid.startCellEdit("2", "name");
    const cancelEvent = grid.cancelCellEdit();
    expect(cancelEvent?.type).toBe("cellEdit:cancel");
    expect(cancelEvent?.value).toBe("Joon");
    expect(grid.getState().editingCell).toBeNull();
    expect(events.map((event) => event.type)).toEqual([
      "cellEdit:start",
      "cellEdit:commit",
      "cellEdit:commit",
      "cellEdit:start",
      "cellEdit:cancel",
    ]);
  });

  it("prevents invalid direct cell edits with validation metadata", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        {
          accessorKey: "name",
          header: "Name",
          enableEditing: true,
          validateEditValue: (value) => (String(value).trim().length >= 3 ? true : "Name must be at least 3 characters"),
        },
        {
          accessorKey: "age",
          header: "Age",
          enableEditing: true,
          editValueParser: (value) => Number(value),
          validateEditValue: (value) => (typeof value === "number" && value >= 18 ? true : { valid: false, message: "Age must be 18 or older" }),
        },
      ],
      getRowId: (row) => row.id,
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.startCellEdit("1", "name");
    const invalidName = grid.commitCellEdit("Mi");

    expect(invalidName?.defaultPrevented).toBe(true);
    expect(invalidName?.validation).toEqual({ valid: false, message: "Name must be at least 3 characters" });
    expect(grid.getState().editingCell).toEqual({ rowId: "1", columnId: "name" });

    const validName = grid.commitCellEdit("Mina");
    expect(validName?.defaultPrevented).toBe(false);
    expect(validName?.validation).toBeUndefined();
    expect(grid.getState().editingCell).toBeNull();

    grid.startCellEdit("1", "age");
    const invalidAge = grid.commitCellEdit(12);

    expect(invalidAge?.defaultPrevented).toBe(true);
    expect(invalidAge?.validation).toEqual({ valid: false, message: "Age must be 18 or older" });
    expect(events.map((event) => [event.type, event.defaultPrevented, event.validation?.message ?? ""])).toEqual([
      ["cellEdit:start", false, ""],
      ["cellEdit:commit", true, "Name must be at least 3 characters"],
      ["cellEdit:commit", false, ""],
      ["cellEdit:start", false, ""],
      ["cellEdit:commit", true, "Age must be 18 or older"],
    ]);
  });

  it("emits preventable framework-neutral column resize events", () => {
    const events: ColumnResizeEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns,
      onColumnResize: (event) => {
        events.push(event);

        if (event.phase === "move") {
          event.preventDefault();
        }
      },
    });
    const column = grid.getVisibleLeafColumns()[0];

    expect(column).toBeDefined();

    const startEvent = grid.emitColumnResizeEvent({
      phase: "start",
      column: column!,
      columnIndex: 0,
      startSize: 160,
      size: 160,
      sourceEvent: { pointerType: "mouse" },
    });
    const moveEvent = grid.emitColumnResizeEvent({
      phase: "move",
      column: column!,
      columnIndex: 0,
      startSize: 160,
      size: 212,
      sourceEvent: { pointerType: "mouse" },
    });
    const endEvent = grid.emitColumnResizeEvent({
      phase: "end",
      column: column!,
      columnIndex: 0,
      startSize: 160,
      size: 212,
      sourceEvent: { pointerType: "mouse" },
    });

    expect(events).toEqual([startEvent, moveEvent, endEvent]);
    expect(startEvent.type).toBe("columnResize:start");
    expect(moveEvent.type).toBe("columnResize:move");
    expect(endEvent.type).toBe("columnResize:end");
    expect(moveEvent.defaultPrevented).toBe(true);
    expect(moveEvent.delta).toBe(52);
    expect(moveEvent.column.id).toBe("name");
    expect(moveEvent.columnIndex).toBe(0);
    expect(moveEvent.sourceEvent).toEqual({ pointerType: "mouse" });
  });

  it("updates column visibility through dedicated visibility APIs", () => {
    const grid = createGrid({ data, columns });

    expect(grid.getIsColumnVisible("age")).toBe(true);

    grid.toggleColumnVisibility("age", false);
    expect(grid.getState().columnVisibility).toEqual({ age: false });
    expect(grid.getIsColumnVisible("age")).toBe(false);
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "role"]);
    expect(grid.getColumnLayout().map((column) => column.id)).toEqual(["name", "role"]);

    grid.toggleColumnVisibility("age");
    expect(grid.getState().columnVisibility).toEqual({});
    expect(grid.getIsColumnVisible("age")).toBe(true);

    grid.setColumnVisibility({ name: false, age: true, role: false });
    expect(grid.getState().columnVisibility).toEqual({ name: false, role: false });
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["age"]);

    grid.resetColumnVisibility();
    expect(grid.getState().columnVisibility).toEqual({});
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "age", "role"]);
  });

  it("updates column sizing through dedicated sizing APIs with column bounds", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", minSize: 80, maxSize: 220 },
        { accessorKey: "age", header: "Age", size: 90 },
        { accessorKey: "role", header: "Role" },
      ],
    });

    expect(grid.getColumnSize("name")).toBe(160);
    expect(grid.getColumnSize("age")).toBe(90);

    grid.setColumnSize("name", 40);
    expect(grid.getState().columnSizing).toEqual({ name: 80 });
    expect(grid.getColumnSize("name")).toBe(80);

    grid.setColumnSize("name", 400);
    expect(grid.getState().columnSizing).toEqual({ name: 220 });
    expect(grid.getColumnLayout()[0]?.size).toBe(220);

    grid.setColumnSizing({ name: Number.NaN, age: 120, role: 10 });
    expect(grid.getState().columnSizing).toEqual({ age: 120, role: 48 });

    grid.resetColumnSizing();
    expect(grid.getState().columnSizing).toEqual({});
    expect(grid.getColumnSize("name")).toBe(160);
  });

  it("fits visible columns proportionally while redistributing min and max constraints", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", size: 100, minSize: 80, maxSize: 150 },
        { accessorKey: "age", header: "Age", size: 200, minSize: 100, maxSize: 500 },
        { accessorKey: "role", header: "Role", size: 100, minSize: 80, maxSize: 400 },
        { id: "hidden", header: "Hidden", size: 300 },
      ],
      initialState: { columnVisibility: { hidden: false } },
    });
    const coreRows = grid.getCoreRowModel();

    fitColumnsToWidth(grid, 800);

    expect(grid.getColumnSize("name")).toBe(150);
    expect(grid.getColumnSize("age")).toBeCloseTo(433.333333, 5);
    expect(grid.getColumnSize("role")).toBeCloseTo(216.666667, 5);
    expect(grid.getColumnSize("hidden")).toBe(300);
    expect(grid.getColumnLayout().reduce((total, item) => total + item.size, 0)).toBeCloseTo(800, 8);
    expect(grid.getCoreRowModel()).toBe(coreRows);

    fitColumnsToWidth(grid, 300, { columnIds: ["age", "role", "age", "unknown"] });
    expect(grid.getColumnSize("name")).toBe(150);
    expect(grid.getColumnSize("age")).toBeCloseTo(200, 8);
    expect(grid.getColumnSize("role")).toBeCloseTo(100, 8);
  });

  it("honors impossible fit bounds, validates width, and ignores an empty selection", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", size: 120, minSize: 100, maxSize: 150 },
        { accessorKey: "age", header: "Age", size: 120, minSize: 100, maxSize: 150 },
      ],
    });
    let notifications = 0;
    const unsubscribe = grid.subscribe(() => {
      notifications += 1;
    });

    fitColumnsToWidth(grid, 50);
    expect(grid.getState().columnSizing).toEqual({ name: 100, age: 100 });
    fitColumnsToWidth(grid, 500);
    expect(grid.getState().columnSizing).toEqual({ name: 150, age: 150 });
    fitColumnsToWidth(grid, 240, { columnIds: ["unknown"] });
    expect(notifications).toBe(2);
    expect(() => fitColumnsToWidth(grid, Number.NaN)).toThrow(RangeError);
    expect(() => fitColumnsToWidth(grid, -1)).toThrow("width must be a non-negative finite number");
    unsubscribe();
  });

  it("cycles column sorting", () => {
    const grid = createGrid({ data, columns });

    grid.toggleColumnSorting("age");
    expect(grid.getColumnSortDirection("age")).toBe("asc");

    grid.toggleColumnSorting("age");
    expect(grid.getColumnSortDirection("age")).toBe("desc");

    grid.toggleColumnSorting("age");
    expect(grid.getColumnSortDirection("age")).toBe(false);
  });

  it("moves focus through the visible cell coordinates", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });

    grid.moveFocus("right");
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "name" });

    grid.moveFocus("right");
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "age" });

    grid.moveFocus("down");
    expect(grid.getState().focusedCell).toEqual({ rowId: "2", columnId: "age" });

    grid.moveFocus("end");
    expect(grid.getState().focusedCell).toEqual({ rowId: "2", columnId: "role" });
  });

  it("moves focus by page and grid boundaries", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 2 },
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "age" });

    grid.moveFocus("page-down");
    expect(grid.getState().focusedCell).toEqual({ rowId: "2", columnId: "age" });

    grid.moveFocus("grid-end");
    expect(grid.getState().focusedCell).toEqual({ rowId: "2", columnId: "role" });

    grid.moveFocus("grid-start");
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "name" });

    grid.moveFocus("page-up");
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "name" });
  });

  it("extends and clears cell range selection while moving focus", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    grid.moveFocus("right", { extendSelection: true });

    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "age" });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "1", columnId: "age" },
    });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "name" },
      { rowId: "1", columnId: "age" },
    ]);
    expect(grid.getIsCellRangeSelected("1", "name")).toBe(true);
    expect(grid.getIsCellRangeSelected("1", "role")).toBe(false);

    grid.setFocusedCell({ rowId: "1", columnId: "age" });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "1", columnId: "age" },
    });

    grid.moveFocus("down", { extendSelection: true });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "name" },
      { rowId: "1", columnId: "age" },
      { rowId: "2", columnId: "name" },
      { rowId: "2", columnId: "age" },
    ]);

    grid.moveFocus("left");
    expect(grid.getCellSelectionRange()).toBeNull();
    expect(grid.getSelectedCellCoordinates()).toEqual([]);

    grid.setCellSelectionRange({
      start: { rowId: "1", columnId: "age" },
      end: { rowId: "3", columnId: "role" },
    });
    expect(grid.getSelectedCellCoordinates()).toHaveLength(6);

    grid.selectCellRange({ rowId: "2", columnId: "role" }, { rowId: "1", columnId: "age" });
    expect(grid.getState().focusedCell).toEqual({ rowId: "1", columnId: "age" });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "age" },
      { rowId: "1", columnId: "role" },
      { rowId: "2", columnId: "age" },
      { rowId: "2", columnId: "role" },
    ]);

    grid.resetCellSelectionRange();
    expect(grid.getCellSelectionRange()).toBeNull();
  });

  it("extends cell range selection across row, page, and grid boundaries", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "age" });
    grid.moveFocus("end", { extendSelection: true });

    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "age" },
      end: { rowId: "1", columnId: "role" },
    });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "age" },
      { rowId: "1", columnId: "role" },
    ]);

    grid.moveFocus("home", { extendSelection: true });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "age" },
      end: { rowId: "1", columnId: "name" },
    });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "name" },
      { rowId: "1", columnId: "age" },
    ]);

    grid.moveFocus("page-down", { extendSelection: true });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "age" },
      end: { rowId: "3", columnId: "name" },
    });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "name" },
      { rowId: "1", columnId: "age" },
      { rowId: "2", columnId: "name" },
      { rowId: "2", columnId: "age" },
      { rowId: "3", columnId: "name" },
      { rowId: "3", columnId: "age" },
    ]);

    grid.moveFocus("grid-end", { extendSelection: true });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "age" },
      end: { rowId: "3", columnId: "role" },
    });
    expect(grid.getSelectedCellCoordinates()).toEqual([
      { rowId: "1", columnId: "age" },
      { rowId: "1", columnId: "role" },
      { rowId: "2", columnId: "age" },
      { rowId: "2", columnId: "role" },
      { rowId: "3", columnId: "age" },
      { rowId: "3", columnId: "role" },
    ]);

    grid.resetCellSelectionRange();
    grid.setFocusedCell({ rowId: "3", columnId: "role" });
    grid.moveFocus("grid-start", { extendSelection: true });

    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "3", columnId: "role" },
      end: { rowId: "1", columnId: "name" },
    });
    expect(grid.getSelectedCellCoordinates()).toHaveLength(9);
  });

  it("serializes focused cells and selected ranges for clipboard copy", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });

    expect(grid.getClipboardText()).toBe("");

    grid.setFocusedCell({ rowId: "1", columnId: "role" });
    expect(grid.getClipboardText()).toBe("admin");

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    grid.moveFocus("right", { extendSelection: true });
    grid.moveFocus("down", { extendSelection: true });

    expect(grid.getClipboardText()).toBe("Mina\t32\nJoon\t25");
    expect(grid.getClipboardText({ includeHeaders: true })).toBe("Name\tAge\nMina\t32\nJoon\t25");
  });

  it("uses clipboard value formatters and escapes tabular values", () => {
    const grid = createGrid({
      data: [{ id: "1", name: "Mi\tna", age: 32, role: "line\nbreak" }],
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", clipboardValue: ({ value }) => `Age:${value}` },
        { accessorKey: "role" },
      ] satisfies ColumnDef<Person>[],
      getRowId: (row) => row.id,
      getClipboardCellValue: ({ value }) => (typeof value === "string" ? value.toUpperCase() : value),
    });

    grid.setCellSelectionRange({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "1", columnId: "role" },
    });

    expect(grid.getClipboardText({ includeHeaders: true })).toBe('Name\tage\trole\n"MI\tNA"\tAge:32\t"LINE\nBREAK"');
  });

  it("exports visible grid data across row scopes", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        sorting: [{ id: "age", desc: true }],
        pagination: { pageIndex: 0, pageSize: 1 },
        columnVisibility: { role: false },
      },
    });

    expect(grid.getExportText({ includeHeaders: true })).toBe("Name\tAge\nAra\t41");
    expect(grid.getExportText({ includeHeaders: true, rowScope: "pre-pagination" })).toBe("Name\tAge\nAra\t41\nMina\t32");
    expect(grid.getExportText({ includeHeaders: true, rowScope: "filtered" })).toBe("Name\tAge\nMina\t32\nAra\t41");
    expect(grid.getExportText({ includeHeaders: true, rowScope: "all", columnIds: ["role", "name", "missing", "role"] })).toBe(
      "Role\tName\nadmin\tMina\neditor\tJoon\nadmin\tAra",
    );

    grid.toggleRowSelected("1", true);
    grid.toggleRowSelected("3", true);

    expect(grid.getExportText({ rowScope: "page-selected" })).toBe("Ara\t41");
    expect(grid.getExportText({ rowScope: "filtered-selected" })).toBe("Ara\t41\nMina\t32");
    expect(grid.getExportText({ rowScope: "selected", columnIds: ["name"] })).toBe("Mina\nAra");
  });

  it("exports CSV with export formatters and delimiter escaping", () => {
    const grid = createGrid({
      data: [{ id: "1", name: 'Mi, "na"', age: 32, role: "line\nbreak" }],
      columns: [
        { accessorKey: "name", header: "Full Name" },
        { accessorKey: "age", exportValue: ({ value }) => `Age:${value}` },
        { accessorKey: "role" },
      ] satisfies ColumnDef<Person>[],
      getRowId: (row) => row.id,
      getExportCellValue: ({ value }) => (typeof value === "string" ? value.toUpperCase() : value),
    });

    expect(grid.getExportText({ format: "csv", includeHeaders: true, rowScope: "all" })).toBe(
      'Full Name,age,role\n"MI, ""NA""",Age:32,"LINE\nBREAK"',
    );
    expect(grid.getExportText({ delimiter: "|", newline: "\r\n", rowScope: "all", columnIds: ["name", "age"] })).toBe(
      '"MI, ""NA"""|Age:32',
    );
  });

  it("guards large exports by blocking or truncating row output", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
    });

    expect(grid.getExportText({ includeHeaders: true, maxRows: 2, rowScope: "all" })).toBe("");
    expect(grid.getExportText({ includeHeaders: true, maxRows: 2, maxRowsMode: "truncate", rowScope: "all" })).toBe(
      "Name\tAge\tRole\nMina\t32\tadmin\nJoon\t25\teditor",
    );
    expect(
      grid.getExportFile({
        filename: "limited",
        format: "csv",
        includeHeaders: true,
        maxRows: 1,
        maxRowsMode: "truncate",
        rowScope: "all",
      }).text,
    ).toBe("Name,Age,Role\nMina,32,admin");
  });

  it("creates DOM-free export file metadata for downloads", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });

    const csvFile = grid.getExportFile({
      filename: "admin-report",
      format: "csv",
      includeHeaders: true,
      rowScope: "filtered",
      columnIds: ["name", "role"],
    });
    expect(csvFile).toEqual({
      filename: "admin-report.csv",
      extension: "csv",
      mimeType: "text/csv;charset=utf-8",
      text: "Name,Role\nMina,admin\nAra,admin",
    });

    expect(grid.getExportFile({ filename: "forecast.tsv", includeHeaders: true }).filename).toBe("forecast.tsv");

    const customFile = grid.getExportFile({
      delimiter: "|",
      extension: ".pipe",
      filename: "bad/name",
      includeByteOrderMark: true,
      mimeType: "text/x-pipe",
      rowScope: "page",
      columnIds: ["name", "age"],
    });
    expect(customFile.filename).toBe("bad-name.pipe");
    expect(customFile.extension).toBe("pipe");
    expect(customFile.mimeType).toBe("text/x-pipe");
    expect(customFile.text).toBe("\uFEFFMina|32");
  });

  it("pastes clipboard text into editable cells from the focused coordinate", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        {
          accessorKey: "age",
          header: "Age",
          enableEditing: true,
          editValueParser: (value) => Number(value),
        },
        { accessorKey: "role", header: "Role" },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    const pasteResult = grid.pasteClipboardText('"Mi\tna"\t33\nJoonie\t26\n');

    expect(pasteResult.committedCells).toHaveLength(4);
    expect(pasteResult.events).toHaveLength(4);
    expect(pasteResult.attemptedCells).toBe(4);
    expect(pasteResult.skippedCells).toHaveLength(0);
    expect(events.map((event) => [event.row.id, event.column.id, event.value, event.previousValue])).toEqual([
      ["1", "name", "Mi\tna", "Mina"],
      ["1", "age", 33, 32],
      ["2", "name", "Joonie", "Joon"],
      ["2", "age", 26, 25],
    ]);
    expect(grid.getState().focusedCell).toEqual({ rowId: "2", columnId: "age" });
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "2", columnId: "age" },
    });
  });

  it("fills selected editable cells when pasting one clipboard value", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        { accessorKey: "age", header: "Age", enableEditing: true, editValueParser: (value) => Number(value) },
        { accessorKey: "role", header: "Role" },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.setCellSelectionRange({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "2", columnId: "role" },
    });

    const pasteResult = grid.pasteClipboardText("9");

    expect(pasteResult.committedCells).toHaveLength(4);
    expect(pasteResult.attemptedCells).toBe(6);
    expect(pasteResult.skippedCells.map((cell) => [cell.coordinate?.rowId, cell.column?.id, cell.reason])).toEqual([
      ["1", "role", "readonly"],
      ["2", "role", "readonly"],
    ]);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([
      ["1", "name", "9"],
      ["1", "age", 9],
      ["2", "name", "9"],
      ["2", "age", 9],
    ]);
  });

  it("applies edit validation when pasting clipboard text", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        {
          accessorKey: "age",
          header: "Age",
          enableEditing: true,
          editValueParser: (value) => Number(value),
          validateEditValue: (value) => (typeof value === "number" && value >= 18 ? true : "Age must be 18 or older"),
        },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    const pasteResult = grid.pasteClipboardText("Mina\n12\nJoon");

    expect(pasteResult.committedCells).toHaveLength(3);
    expect(pasteResult.committedCells.map((cell) => [cell.row.id, cell.column.id, cell.value])).toEqual([
      ["1", "name", "Mina"],
      ["2", "name", "12"],
      ["3", "name", "Joon"],
    ]);
    expect(events.map((event) => [event.row.id, event.column.id, event.value, event.defaultPrevented, event.validation?.message ?? ""])).toEqual([
      ["1", "name", "Mina", false, ""],
      ["2", "name", "12", false, ""],
      ["3", "name", "Joon", false, ""],
    ]);

    events.length = 0;
    grid.setFocusedCell({ rowId: "1", columnId: "age" });
    const agePasteResult = grid.pasteClipboardText("21\n12\n35");

    expect(agePasteResult.committedCells).toHaveLength(2);
    expect(agePasteResult.validationErrors).toHaveLength(1);
    expect(agePasteResult.skippedCells.map((cell) => [cell.coordinate?.rowId, cell.column?.id, cell.reason, cell.validation?.message])).toEqual([
      ["2", "age", "validation", "Age must be 18 or older"],
    ]);
    expect(agePasteResult.committedCells.map((cell) => [cell.row.id, cell.column.id, cell.value])).toEqual([
      ["1", "age", 21],
      ["3", "age", 35],
    ]);
    expect(events.map((event) => [event.row.id, event.column.id, event.value, event.defaultPrevented, event.validation?.message ?? ""])).toEqual([
      ["1", "age", 21, false, ""],
      ["2", "age", 12, true, "Age must be 18 or older"],
      ["3", "age", 35, false, ""],
    ]);
  });

  it("summarizes blocked and truncated large clipboard pastes", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        { accessorKey: "age", header: "Age", enableEditing: true, editValueParser: (value) => Number(value) },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    const blockedResult = grid.pasteClipboardText("A\t1\nB\t2\nC\t3", { maxCells: 4 });

    expect(blockedResult.blocked).toBe(true);
    expect(blockedResult.truncated).toBe(false);
    expect(blockedResult.attemptedCells).toBe(6);
    expect(blockedResult.committedCells).toHaveLength(0);
    expect(blockedResult.skippedCells).toHaveLength(6);
    expect(blockedResult.skippedCells.every((cell) => cell.reason === "max-cells")).toBe(true);
    expect(events).toHaveLength(0);

    const truncatedResult = grid.pasteClipboardText("A\t1\nB\t2\nC\t3", { maxCells: 4, maxCellsMode: "truncate" });

    expect(truncatedResult.blocked).toBe(false);
    expect(truncatedResult.truncated).toBe(true);
    expect(truncatedResult.attemptedCells).toBe(6);
    expect(truncatedResult.committedCells.map((cell) => [cell.row.id, cell.column.id, cell.value])).toEqual([
      ["1", "name", "A"],
      ["1", "age", 1],
      ["2", "name", "B"],
      ["2", "age", 2],
    ]);
    expect(truncatedResult.skippedCells.map((cell) => [cell.coordinate?.rowId, cell.column?.id, cell.reason])).toEqual([
      ["3", "name", "max-cells"],
      ["3", "age", "max-cells"],
    ]);
    expect(events).toHaveLength(4);
  });

  it("fills selected cell ranges into adjacent editable cells", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        { accessorKey: "age", header: "Age", enableEditing: true, editValueParser: (value) => Number(value) },
        { accessorKey: "role", header: "Role", enableEditing: true },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.selectCellRange({ rowId: "1", columnId: "name" }, { rowId: "2", columnId: "age" });
    const verticalFillEvents = grid.fillCellRange({ rowId: "3", columnId: "age" });

    expect(verticalFillEvents).toHaveLength(2);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([
      ["3", "name", "Mina"],
      ["3", "age", 32],
    ]);
    expect(grid.getCellSelectionRange()).toEqual({
      start: { rowId: "1", columnId: "name" },
      end: { rowId: "3", columnId: "age" },
    });

    events.length = 0;
    grid.selectCellRange({ rowId: "1", columnId: "name" }, { rowId: "1", columnId: "age" });
    const horizontalFillEvents = grid.fillCellRange({ rowId: "1", columnId: "role" });

    expect(horizontalFillEvents).toHaveLength(1);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([["1", "role", "Mina"]]);
  });

  it("fills numeric and text-number series when requested", () => {
    interface Invoice {
      id: string;
      code: string;
      amount: number;
    }

    const events: CellEditEvent<Invoice>[] = [];
    const grid = createGrid({
      data: [
        { id: "1", code: "INV-001", amount: 10 },
        { id: "2", code: "INV-002", amount: 15 },
        { id: "3", code: "", amount: 0 },
        { id: "4", code: "", amount: 0 },
      ],
      columns: [
        { accessorKey: "code", header: "Code", enableEditing: true },
        { accessorKey: "amount", header: "Amount", enableEditing: true, editValueParser: (value) => Number(value) },
      ] satisfies ColumnDef<Invoice>[],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 4 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.selectCellRange({ rowId: "1", columnId: "amount" }, { rowId: "2", columnId: "amount" });
    const amountFillEvents = grid.fillCellRange({ rowId: "4", columnId: "amount" }, { fillMode: "series" });

    expect(amountFillEvents).toHaveLength(2);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([
      ["3", "amount", 20],
      ["4", "amount", 25],
    ]);

    events.length = 0;
    grid.selectCellRange({ rowId: "1", columnId: "code" }, { rowId: "2", columnId: "code" });
    const codeFillEvents = grid.fillCellRange({ rowId: "4", columnId: "code" }, { fillMode: "series" });

    expect(codeFillEvents).toHaveLength(2);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([
      ["3", "code", "INV-003"],
      ["4", "code", "INV-004"],
    ]);
  });

  it("guards large fill ranges by blocking or truncating target cells", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        { accessorKey: "age", header: "Age", enableEditing: true, editValueParser: (value) => Number(value) },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.selectCellRange({ rowId: "1", columnId: "name" }, { rowId: "1", columnId: "age" });

    expect(grid.fillCellRange({ rowId: "3", columnId: "age" }, { maxCells: 2 })).toEqual([]);
    expect(events).toHaveLength(0);

    const truncatedEvents = grid.fillCellRange({ rowId: "3", columnId: "age" }, { maxCells: 2, maxCellsMode: "truncate" });

    expect(truncatedEvents).toHaveLength(2);
    expect(events.map((event) => [event.row.id, event.column.id, event.value])).toEqual([
      ["2", "name", "Mina"],
      ["2", "age", 32],
    ]);
  });

  it("applies edit validation when filling selected cell ranges", () => {
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", enableEditing: true },
        {
          accessorKey: "age",
          header: "Age",
          enableEditing: true,
          editValueParser: (value) => Number(value),
          validateEditValue: (value) => (typeof value === "number" && value >= 18 ? true : "Age must be 18 or older"),
        },
      ],
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 3 },
      },
      onCellEdit: (event) => {
        events.push(event);
      },
    });

    grid.selectCellRange({ rowId: "1", columnId: "name" }, { rowId: "1", columnId: "name" });
    const fillEvents = grid.fillCellRange({ rowId: "3", columnId: "age" });

    expect(fillEvents).toHaveLength(2);
    expect(events.map((event) => [event.row.id, event.column.id, event.value, event.defaultPrevented, event.validation?.message ?? ""])).toEqual([
      ["2", "name", "Mina", false, ""],
      ["3", "name", "Mina", false, ""],
    ]);

    events.length = 0;
    grid.selectCellRange({ rowId: "2", columnId: "name" }, { rowId: "2", columnId: "name" });
    const invalidFillEvents = grid.fillCellRange({ rowId: "2", columnId: "age" });

    expect(invalidFillEvents).toHaveLength(0);
    expect(events.map((event) => [event.row.id, event.column.id, event.value, event.defaultPrevented, event.validation?.message ?? ""])).toEqual([
      ["2", "age", Number.NaN, true, "Age must be 18 or older"],
    ]);
  });

  it("calculates visible column layout and pinned offsets", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        columnSizing: { name: 120, age: 80, role: 160 },
        columnPinning: { left: ["name"], right: ["role"] },
      },
    });

    expect(grid.getColumnLayout()).toEqual([
      { id: "name", size: 120, start: 0, end: 120, pinned: "left", pinnedStart: 0, pinnedEdge: "left" },
      { id: "age", size: 80, start: 120, end: 200, pinned: false },
      { id: "role", size: 160, start: 200, end: 360, pinned: "right", pinnedStart: 0, pinnedEdge: "right" },
    ]);
  });

  it("marks only pinned boundary columns as pinned edges", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        columnSizing: { name: 100, age: 80, role: 60 },
        columnPinning: { left: ["name", "age"], right: ["role"] },
      },
    });

    expect(
      grid.getColumnLayout().map((column) => ({
        id: column.id,
        pinnedStart: column.pinnedStart,
        pinnedEdge: column.pinnedEdge,
      })),
    ).toEqual([
      { id: "name", pinnedStart: 0, pinnedEdge: undefined },
      { id: "age", pinnedStart: 100, pinnedEdge: "left" },
      { id: "role", pinnedStart: 0, pinnedEdge: "right" },
    ]);
  });

  it("partitions pinned layout before center columns and calculates offsets from visible pinned widths", () => {
    const grid = createGrid({
      data,
      columns: [
        { accessorKey: "name", header: "Name", size: 100 },
        { accessorKey: "age", header: "Age", size: 80 },
        { accessorKey: "role", header: "Role", size: 60 },
        { id: "actions", header: "Actions", size: 70 },
      ],
      initialState: {
        columnOrder: ["role", "actions", "name", "age"],
        columnPinning: { left: ["name", "age"], right: ["role", "actions"] },
        columnVisibility: { actions: false },
      },
    });

    expect(grid.getVisibleLeafColumns().map((column) => [column.id, column.getIsPinned()])).toEqual([
      ["role", "right"],
      ["name", "left"],
      ["age", "left"],
    ]);
    expect(
      grid.getColumnLayout().map((column) => ({
        id: column.id,
        start: column.start,
        end: column.end,
        pinned: column.pinned,
        pinnedStart: column.pinnedStart,
        pinnedEdge: column.pinnedEdge,
      })),
    ).toEqual([
      { id: "name", start: 0, end: 100, pinned: "left", pinnedStart: 0, pinnedEdge: undefined },
      { id: "age", start: 100, end: 180, pinned: "left", pinnedStart: 100, pinnedEdge: "left" },
      { id: "role", start: 180, end: 240, pinned: "right", pinnedStart: 0, pinnedEdge: "right" },
    ]);

    grid.toggleColumnVisibility("actions", true);
    expect(grid.getColumnLayout().map((column) => [column.id, column.pinned, column.pinnedStart, column.pinnedEdge])).toEqual([
      ["name", "left", 0, undefined],
      ["age", "left", 100, "left"],
      ["role", "right", 70, "right"],
      ["actions", "right", 0, undefined],
    ]);

    grid.setColumnSize("actions", 90);
    expect(grid.getColumnLayout().map((column) => [column.id, column.pinnedStart])).toEqual([
      ["name", 0],
      ["age", 100],
      ["role", 90],
      ["actions", 0],
    ]);
  });

  it("updates column pinning through dedicated pinning APIs", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        columnSizing: { name: 100, age: 80, role: 60 },
      },
    });

    grid.pinColumn("name", "left");
    grid.pinColumn("role", "right");

    expect(grid.getState().columnPinning).toEqual({ left: ["name"], right: ["role"] });
    expect(grid.getColumnLayout().map((column) => [column.id, column.pinned, column.pinnedStart])).toEqual([
      ["name", "left", 0],
      ["age", false, undefined],
      ["role", "right", 0],
    ]);

    grid.pinColumn("name", "right");
    expect(grid.getState().columnPinning).toEqual({ left: [], right: ["role", "name"] });
    expect(grid.getVisibleLeafColumns().find((column) => column.id === "name")?.getIsPinned()).toBe("right");

    grid.pinColumn("role", false);
    expect(grid.getState().columnPinning).toEqual({ left: [], right: ["name"] });

    grid.setColumnPinning({ left: ["age", "age"], right: ["name", "age", "name"] });
    expect(grid.getState().columnPinning).toEqual({ left: ["age"], right: ["name"] });

    grid.resetColumnPinning();
    expect(grid.getState().columnPinning).toEqual({ left: [], right: [] });
  });

  it("orders visible leaf columns and layout", () => {
    const grid = createGrid({
      data,
      columns,
      initialState: {
        columnOrder: ["role", "name"],
        columnSizing: { role: 120, name: 180, age: 90 },
      },
    });

    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["role", "name", "age"]);
    expect(grid.getColumnLayout().map((column) => [column.id, column.start, column.end])).toEqual([
      ["role", 0, 120],
      ["name", 120, 300],
      ["age", 300, 390],
    ]);
  });

  it("moves and normalizes column order through ordering APIs", () => {
    const grid = createGrid({ data, columns });

    grid.moveColumn("role", "name", "before");
    expect(grid.getState().columnOrder).toEqual(["role", "name", "age"]);
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["role", "name", "age"]);

    grid.moveColumn("name", "age", "after");
    expect(grid.getState().columnOrder).toEqual(["role", "age", "name"]);
    expect(grid.getColumnLayout().map((column) => column.id)).toEqual(["role", "age", "name"]);

    grid.setColumnOrder(["name", "name", "missing", "role"]);
    expect(grid.getState().columnOrder).toEqual(["name", "role"]);
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "role", "age"]);

    grid.moveColumn("missing", "role");
    expect(grid.getState().columnOrder).toEqual(["name", "role"]);

    grid.resetColumnOrder();
    expect(grid.getState().columnOrder).toEqual([]);
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "age", "role"]);
  });

  it("builds grouped header rows from visible column trees", () => {
    const grid = createGrid({
      data,
      columns: [
        {
          id: "person",
          header: "Person",
          columns: [
            { accessorKey: "name", header: "Name" },
            { accessorKey: "age", header: "Age" },
          ],
        },
        { accessorKey: "role", header: "Role" },
      ],
      initialState: {
        columnVisibility: { age: false },
      },
    });

    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "role"]);
    expect(
      grid.getHeaderGroups().map((group) =>
        group.headers.map((header) => ({
          id: header.id,
          columnId: header.column.id,
          colSpan: header.colSpan,
          rowSpan: header.rowSpan,
          isPlaceholder: header.isPlaceholder,
          leafColumnIds: header.leafColumnIds,
        })),
      ),
    ).toEqual([
      [
        { id: "person", columnId: "person", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["name"] },
        { id: "role", columnId: "role", colSpan: 1, rowSpan: 2, isPlaceholder: false, leafColumnIds: ["role"] },
      ],
      [
        { id: "person.name", columnId: "name", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["name"] },
        { id: "role.__placeholder_1", columnId: "role", colSpan: 1, rowSpan: 1, isPlaceholder: true, leafColumnIds: ["role"] },
      ],
    ]);
  });

  it("keeps grouped headers aligned with reordered leaf columns", () => {
    const grid = createGrid({
      data,
      columns: [
        {
          id: "person",
          header: "Person",
          columns: [
            { accessorKey: "name", header: "Name" },
            { accessorKey: "age", header: "Age" },
          ],
        },
        { accessorKey: "role", header: "Role" },
      ],
      initialState: {
        columnOrder: ["age", "role", "name"],
      },
    });

    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["age", "role", "name"]);
    expect(
      grid.getHeaderGroups().map((group) =>
        group.headers.map((header) => ({
          id: header.id,
          columnId: header.column.id,
          colSpan: header.colSpan,
          rowSpan: header.rowSpan,
          isPlaceholder: header.isPlaceholder,
          leafColumnIds: header.leafColumnIds,
        })),
      ),
    ).toEqual([
      [
        { id: "person", columnId: "person", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["age"] },
        { id: "role", columnId: "role", colSpan: 1, rowSpan: 2, isPlaceholder: false, leafColumnIds: ["role"] },
        { id: "person.__segment_1", columnId: "person", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["name"] },
      ],
      [
        { id: "person.age", columnId: "age", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["age"] },
        { id: "role.__placeholder_1", columnId: "role", colSpan: 1, rowSpan: 1, isPlaceholder: true, leafColumnIds: ["role"] },
        { id: "person.name", columnId: "name", colSpan: 1, rowSpan: 1, isPlaceholder: false, leafColumnIds: ["name"] },
      ],
    ]);

    grid.moveColumn("name", "age", "before");
    expect(grid.getVisibleLeafColumns().map((column) => column.id)).toEqual(["name", "age", "role"]);
    expect(grid.getHeaderGroups()[0]?.headers.map((header) => [header.id, header.leafColumnIds])).toEqual([
      ["person", ["name", "age"]],
      ["role", ["role"]],
    ]);
  });

  it("selects page rows and all pre-pagination rows separately", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 2 },
      },
    });

    grid.toggleAllPageRowsSelected();
    expect(grid.getState().rowSelection).toEqual({ "1": true, "2": true });
    expect(grid.getIsAllPageRowsSelected()).toBe(true);
    expect(grid.getIsSomePageRowsSelected()).toBe(false);

    grid.toggleAllRowsSelected(true);
    expect(grid.getState().rowSelection).toEqual({});
    expect(grid.getState().allRowsSelected).toBe(true);

    grid.toggleAllPageRowsSelected(false);
    expect(grid.getState().rowSelection).toEqual({ "1": false, "2": false });
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["3"]);
    expect(grid.getIsAllPageRowsSelected()).toBe(false);
    expect(grid.getIsSomePageRowsSelected()).toBe(false);

    grid.toggleRowSelected("1", true);
    expect(grid.getState().rowSelection).toEqual({ "2": false });
    expect(grid.getIsRowSelected("1")).toBe(true);

    grid.resetRowSelection();
    expect(grid.getState().rowSelection).toEqual({});
    expect(grid.getState().allRowsSelected).toBe(false);
    expect(grid.getSelectedRowModel().rows).toEqual([]);
  });

  it("prunes row selection against loaded, filtered, or page row scopes", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        pagination: { pageIndex: 0, pageSize: 1 },
        rowSelection: { "1": true, "2": true, "3": true, missing: true },
      },
    });

    grid.pruneRowSelection("page");
    expect(grid.getState().rowSelection).toEqual({ "1": true });

    grid.setState((previous) => ({
      ...previous,
      rowSelection: { "1": true, "2": true, "3": true, missing: true },
    }));
    grid.pruneRowSelection("filtered");
    expect(grid.getState().rowSelection).toEqual({ "1": true, "3": true });

    grid.setState((previous) => ({
      ...previous,
      rowSelection: { "1": true, "2": true, "3": true, missing: true },
    }));
    grid.pruneRowSelection();
    expect(grid.getState().rowSelection).toEqual({ "1": true, "2": true, "3": true });

    grid.setState((previous) => ({
      ...previous,
      allRowsSelected: true,
      rowSelection: { "2": false, missing: false },
    }));
    grid.pruneRowSelection();
    expect(grid.getState().rowSelection).toEqual({ "2": false });
    expect(grid.getState().allRowsSelected).toBe(true);
  });

  it("exposes selected row models for loaded, filtered, and paginated scopes", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        columnFilters: [{ id: "role", value: "admin" }],
        sorting: [{ id: "age", desc: false }],
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    });

    grid.toggleAllPageRowsSelected(true);

    expect(grid.getState().rowSelection).toEqual({ "1": true });
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["1"]);
    expect(grid.getFilteredSelectedRowModel().rows.map((row) => row.id)).toEqual(["1"]);
    expect(grid.getPageSelectedRowModel().rows.map((row) => row.id)).toEqual(["1"]);
    expect(grid.getIsAllPageRowsSelected()).toBe(true);
    expect(grid.getIsAllFilteredRowsSelected()).toBe(false);
    expect(grid.getIsSomeFilteredRowsSelected()).toBe(true);
    expect(grid.getIsSomeRowsSelected()).toBe(true);

    grid.toggleAllFilteredRowsSelected(true);

    expect(grid.getState().rowSelection).toEqual({ "1": true, "3": true });
    expect(grid.getFilteredSelectedRowModel().rows.map((row) => row.id)).toEqual(["1", "3"]);
    expect(grid.getIsAllFilteredRowsSelected()).toBe(true);
    expect(grid.getIsAllRowsSelected()).toBe(false);

    grid.toggleAllRowsSelected(true);

    expect(grid.getState().rowSelection).toEqual({});
    expect(grid.getState().allRowsSelected).toBe(true);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(grid.getFilteredSelectedRowModel().rows.map((row) => row.id)).toEqual(["1", "3"]);
    expect(grid.getPageSelectedRowModel().rows.map((row) => row.id)).toEqual(["1"]);
    expect(grid.getIsRowSelected("2")).toBe(true);
    expect(grid.getIsAllRowsSelected()).toBe(true);
  });

  it("memoizes row and column models until their dependencies change", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 2 },
      },
    });

    const allColumns = grid.getAllLeafColumns();
    const visibleColumns = grid.getVisibleLeafColumns();
    const columnLayout = grid.getColumnLayout();
    const coreRows = grid.getCoreRowModel();
    const filteredRows = grid.getFilteredRowModel();
    const sortedRows = grid.getSortedRowModel();
    const pageRows = grid.getRowModel();
    const selectedRows = grid.getSelectedRowModel();

    expect(grid.getAllLeafColumns()).toBe(allColumns);
    expect(grid.getVisibleLeafColumns()).toBe(visibleColumns);
    expect(grid.getColumnLayout()).toBe(columnLayout);
    expect(grid.getCoreRowModel()).toBe(coreRows);
    expect(grid.getFilteredRowModel()).toBe(filteredRows);
    expect(grid.getSortedRowModel()).toBe(sortedRows);
    expect(grid.getRowModel()).toBe(pageRows);

    grid.toggleRowSelected("1");
    grid.setFocusedCell({ rowId: "1", columnId: "name" });

    expect(grid.getState().rowSelection).toEqual({ "1": true });
    expect(grid.getSelectedRowModel()).not.toBe(selectedRows);
    expect(grid.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["1"]);
    expect(grid.getAllLeafColumns()).toBe(allColumns);
    expect(grid.getVisibleLeafColumns()).toBe(visibleColumns);
    expect(grid.getColumnLayout()).toBe(columnLayout);
    expect(grid.getCoreRowModel()).toBe(coreRows);
    expect(grid.getFilteredRowModel()).toBe(filteredRows);
    expect(grid.getSortedRowModel()).toBe(sortedRows);
    expect(grid.getRowModel()).toBe(pageRows);

    grid.toggleColumnVisibility("role", false);

    expect(grid.getVisibleLeafColumns()).not.toBe(visibleColumns);
    expect(grid.getColumnLayout()).not.toBe(columnLayout);
    expect(grid.getCoreRowModel()).toBe(coreRows);
    expect(grid.getFilteredRowModel()).toBe(filteredRows);
    expect(grid.getSortedRowModel()).toBe(sortedRows);
    expect(grid.getRowModel()).toBe(pageRows);

    grid.toggleColumnVisibility("role", true);

    const selectedRowsAfterSelection = grid.getSelectedRowModel();
    expect(grid.getSelectedRowModel()).toBe(selectedRowsAfterSelection);

    grid.setSorting([{ id: "age", desc: true }]);

    expect(grid.getCoreRowModel()).toBe(coreRows);
    expect(grid.getFilteredRowModel()).toBe(filteredRows);
    expect(grid.getSortedRowModel()).not.toBe(sortedRows);
    expect(grid.getRowModel()).not.toBe(pageRows);

    const sortedPageRows = grid.getRowModel();
    grid.setPageIndex(1);
    expect(grid.getSortedRowModel()).toBe(grid.getPrePaginationRowModel());
    expect(grid.getRowModel()).not.toBe(sortedPageRows);

    const beforeResizeCoreRows = grid.getCoreRowModel();
    const beforeResizeFilteredRows = grid.getFilteredRowModel();
    const beforeResizeSortedRows = grid.getSortedRowModel();
    const beforeResizePageRows = grid.getRowModel();
    const beforeResizeVisibleColumns = grid.getVisibleLeafColumns();
    grid.setColumnSizing({ name: 240 });
    expect(grid.getAllLeafColumns()).toBe(allColumns);
    expect(grid.getVisibleLeafColumns()).toBe(beforeResizeVisibleColumns);
    expect(grid.getAllLeafColumns().find((column) => column.id === "name")?.getSize()).toBe(240);
    expect(grid.getColumnLayout()).not.toBe(columnLayout);
    expect(grid.getCoreRowModel()).toBe(beforeResizeCoreRows);
    expect(grid.getFilteredRowModel()).toBe(beforeResizeFilteredRows);
    expect(grid.getSortedRowModel()).toBe(beforeResizeSortedRows);
    expect(grid.getRowModel()).toBe(beforeResizePageRows);

    const resizedColumns = grid.getAllLeafColumns();
    const resizedLayout = grid.getColumnLayout();
    const beforeReorderCoreRows = grid.getCoreRowModel();
    const beforeReorderFilteredRows = grid.getFilteredRowModel();
    const beforeReorderSortedRows = grid.getSortedRowModel();
    const beforeReorderPageRows = grid.getRowModel();
    grid.setColumnOrder(["role", "name", "age"]);
    expect(grid.getAllLeafColumns()).not.toBe(resizedColumns);
    expect(grid.getAllLeafColumns().map((column) => column.id)).toEqual(["role", "name", "age"]);
    expect(grid.getColumnLayout()).not.toBe(resizedLayout);
    expect(grid.getCoreRowModel()).toBe(beforeReorderCoreRows);
    expect(grid.getFilteredRowModel()).toBe(beforeReorderFilteredRows);
    expect(grid.getSortedRowModel()).toBe(beforeReorderSortedRows);
    expect(grid.getRowModel()).toBe(beforeReorderPageRows);

    const reorderedColumns = grid.getAllLeafColumns();
    const reorderedLayout = grid.getColumnLayout();
    const beforePinCoreRows = grid.getCoreRowModel();
    const beforePinFilteredRows = grid.getFilteredRowModel();
    const beforePinSortedRows = grid.getSortedRowModel();
    const beforePinPageRows = grid.getRowModel();
    grid.pinColumn("age", "left");
    expect(grid.getAllLeafColumns()).toBe(reorderedColumns);
    expect(grid.getVisibleLeafColumns().find((column) => column.id === "age")?.getIsPinned()).toBe("left");
    expect(grid.getColumnLayout()).not.toBe(reorderedLayout);
    expect(grid.getColumnLayout().map((layout) => [layout.id, layout.pinned])).toEqual([
      ["age", "left"],
      ["role", false],
      ["name", false],
    ]);
    expect(grid.getCoreRowModel()).toBe(beforePinCoreRows);
    expect(grid.getFilteredRowModel()).toBe(beforePinFilteredRows);
    expect(grid.getSortedRowModel()).toBe(beforePinSortedRows);
    expect(grid.getRowModel()).toBe(beforePinPageRows);

    const pinnedCoreRows = grid.getCoreRowModel();
    const pinnedFilteredRows = grid.getFilteredRowModel();
    const pinnedSortedRows = grid.getSortedRowModel();
    const pinnedPageRows = grid.getRowModel();
    grid.setGlobalFilter("Mina");
    expect(grid.getCoreRowModel()).toBe(pinnedCoreRows);
    expect(grid.getFilteredRowModel()).not.toBe(pinnedFilteredRows);
    expect(grid.getSortedRowModel()).not.toBe(pinnedSortedRows);
    expect(grid.getRowModel()).not.toBe(pinnedPageRows);
  });

  it("reports cache diagnostics for model and layout caches", () => {
    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
      initialState: {
        pagination: { pageIndex: 0, pageSize: 2 },
      },
    });

    const initialDiagnostics = grid.getCacheDiagnostics();
    expect(initialDiagnostics.totalHits).toBe(0);
    expect(initialDiagnostics.totalMisses).toBe(0);
    expect(Object.values(initialDiagnostics.entries).every((entry) => !entry.initialized)).toBe(true);

    grid.getRowModel();
    grid.getColumnLayout();
    const afterFirstRead = grid.getCacheDiagnostics();

    expect(afterFirstRead.entries.allColumns.initialized).toBe(true);
    expect(afterFirstRead.entries.coreRowModel.misses).toBeGreaterThan(0);
    expect(afterFirstRead.entries.paginatedRowModel.misses).toBeGreaterThan(0);
    expect(afterFirstRead.entries.columnLayout.misses).toBeGreaterThan(0);
    expect(afterFirstRead.totalComputes).toBe(afterFirstRead.totalMisses);

    grid.getRowModel();
    grid.getColumnLayout();
    const afterSecondRead = grid.getCacheDiagnostics();

    expect(afterSecondRead.entries.paginatedRowModel.hits).toBeGreaterThan(afterFirstRead.entries.paginatedRowModel.hits);
    expect(afterSecondRead.entries.columnLayout.hits).toBeGreaterThan(afterFirstRead.entries.columnLayout.hits);
    expect(afterSecondRead.totalHits).toBeGreaterThan(afterFirstRead.totalHits);

    grid.resetCacheDiagnostics();
    const afterReset = grid.getCacheDiagnostics();

    expect(afterReset.totalHits).toBe(0);
    expect(afterReset.totalMisses).toBe(0);
    expect(afterReset.totalComputes).toBe(0);
    expect(afterReset.entries.paginatedRowModel.initialized).toBe(true);
    expect(afterReset.entries.paginatedRowModel.lastDependencyCount).toBeGreaterThan(0);
  });

  it("records bounded opt-in cell edit history and clears redo after a new edit", () => {
    const editableData = data.map((person) => ({ ...person }));
    const events: CellEditEvent<Person>[] = [];
    const grid = createGrid({
      data: editableData,
      columns: [{ accessorKey: "age", enableEditing: true }],
      getRowId: (row) => row.id,
      editHistoryLimit: 2,
      onCellEdit: (event) => {
        events.push(event);
        if (event.phase === "commit" && event.row.original) {
          event.row.original.age = Number(event.value);
        }
      },
    });

    for (const age of [33, 34, 35]) {
      grid.startCellEdit("1", "age");
      grid.commitCellEdit(age);
    }

    expect(editableData[0]?.age).toBe(35);
    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 2, redoDepth: 0, limit: 2 });
    expect(grid.undoCellEdit()).toHaveLength(1);
    expect(editableData[0]?.age).toBe(34);
    expect(grid.undoCellEdit()).toHaveLength(1);
    expect(editableData[0]?.age).toBe(33);
    expect(grid.undoCellEdit()).toEqual([]);
    expect(grid.getCanRedoCellEdit()).toBe(true);

    expect(grid.redoCellEdit()).toHaveLength(1);
    expect(editableData[0]?.age).toBe(34);
    expect(events.at(-1)?.historyAction).toBe("redo");

    grid.startCellEdit("1", "age");
    grid.commitCellEdit(40);
    expect(grid.getCanRedoCellEdit()).toBe(false);
    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 2, redoDepth: 0, limit: 2 });

    grid.clearCellEditHistory();
    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 0, redoDepth: 0, limit: 2 });

    grid.setOptions((previous) => ({ ...previous, editHistoryLimit: 0 }));
    grid.startCellEdit("1", "age");
    grid.commitCellEdit(41);
    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 0, redoDepth: 0, limit: 0 });
  });

  it("undoes clipboard and fill edits as transactions outside the current page", () => {
    const editableData = data.map((person) => ({ ...person }));
    const historyEvents: Array<[string, string, unknown, string | undefined]> = [];
    const grid = createGrid({
      data: editableData,
      columns: [
        { accessorKey: "name", enableEditing: true },
        { accessorKey: "age", enableEditing: true, editValueParser: (value) => Number(value) },
      ],
      getRowId: (row) => row.id,
      editHistoryLimit: 10,
      initialState: { pagination: { pageIndex: 0, pageSize: 3 } },
      onCellEdit: (event) => {
        if (event.phase !== "commit" || !event.row.original) return;
        historyEvents.push([event.row.id, event.column.id, event.value, event.historyAction]);
        if (event.column.id === "name") event.row.original.name = String(event.value);
        if (event.column.id === "age") event.row.original.age = Number(event.value);
      },
    });

    grid.setFocusedCell({ rowId: "1", columnId: "name" });
    grid.pasteClipboardText("Mina 2\t33\nJoon 2\t26");
    expect(grid.getCellEditHistoryState().undoDepth).toBe(1);
    expect(editableData.slice(0, 2).map(({ name, age }) => [name, age])).toEqual([
      ["Mina 2", 33],
      ["Joon 2", 26],
    ]);

    grid.setPageIndex(9);
    expect(grid.getRowModel().rows).toEqual([]);
    expect(grid.undoCellEdit()).toHaveLength(4);
    expect(editableData.slice(0, 2).map(({ name, age }) => [name, age])).toEqual([
      ["Mina", 32],
      ["Joon", 25],
    ]);
    expect(historyEvents.slice(-4).every((event) => event[3] === "undo")).toBe(true);

    expect(grid.redoCellEdit()).toHaveLength(4);
    expect(editableData.slice(0, 2).map(({ name, age }) => [name, age])).toEqual([
      ["Mina 2", 33],
      ["Joon 2", 26],
    ]);
    expect(historyEvents.slice(-4).every((event) => event[3] === "redo")).toBe(true);

    grid.setPageIndex(0);
    grid.selectCellRange({ rowId: "1", columnId: "age" });
    grid.fillCellRange({ rowId: "3", columnId: "age" }, { fillMode: "series" });
    expect(grid.getCellEditHistoryState().undoDepth).toBe(2);
    expect(grid.undoCellEdit()).toHaveLength(2);
  });

  it("drops history changes whose rows or columns are no longer editable", () => {
    const editableData = data.map((person) => ({ ...person }));
    const grid = createGrid({
      data: editableData,
      columns: [{ accessorKey: "age", enableEditing: true }],
      getRowId: (row) => row.id,
      editHistoryLimit: 5,
      onCellEdit: (event) => {
        if (event.phase === "commit" && event.row.original) {
          event.row.original.age = Number(event.value);
        }
      },
    });

    grid.startCellEdit("1", "age");
    grid.commitCellEdit(33);
    grid.setOptions((previous) => ({
      ...previous,
      columns: [{ accessorKey: "age", enableEditing: false }],
    }));

    expect(grid.undoCellEdit()).toEqual([]);
    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 0, redoDepth: 0, limit: 5 });
  });

  it("retains edit history snapshot identity until its values change", () => {
    const grid = createGrid({ data, columns, editHistoryLimit: 2 });
    const initialHistory = grid.getCellEditHistoryState();

    grid.setGlobalFilter("active");

    expect(grid.getCellEditHistoryState()).toBe(initialHistory);

    grid.setOptions((previous) => ({ ...previous, editHistoryLimit: 3 }));

    expect(grid.getCellEditHistoryState()).toEqual({ undoDepth: 0, redoDepth: 0, limit: 3 });
    expect(grid.getCellEditHistoryState()).not.toBe(initialHistory);
  });

  it("notifies selector subscribers only when their selected value changes", () => {
    const grid = createGrid({ data, columns });
    const selectedValues: Array<[string, string | undefined]> = [];
    const unsubscribe = grid.subscribeSelector(
      (currentGrid) => currentGrid.getState().globalFilter,
      (selectedValue, previousValue) => {
        selectedValues.push([selectedValue, previousValue]);
      },
      { fireImmediately: true },
    );

    grid.setSorting([{ id: "age", desc: true }]);
    grid.setGlobalFilter("active");
    grid.setColumnVisibility({ age: false });
    unsubscribe();
    grid.setGlobalFilter("inactive");

    expect(selectedValues).toEqual([
      ["", undefined],
      ["active", ""],
    ]);
  });

  it("supports selector-specific equality", () => {
    const grid = createGrid({ data, columns });
    const selectedValues: string[] = [];
    const unsubscribe = grid.subscribeSelector(
      (currentGrid) => ({ value: currentGrid.getState().globalFilter }),
      (selectedValue) => {
        selectedValues.push(selectedValue.value);
      },
      {
        equalityFn: (previousValue, nextValue) => previousValue.value === nextValue.value,
      },
    );

    grid.setSorting([{ id: "age" }]);
    grid.setGlobalFilter("active");
    unsubscribe();

    expect(selectedValues).toEqual(["active"]);
  });

  it("emits next state while respecting controlled state", () => {
    let nextSorting = gridSorting();
    let notifications = 0;
    const grid = createGrid({
      data,
      columns,
      state: {
        sorting: nextSorting,
      },
      onStateChange: (state) => {
        nextSorting = state.sorting;
      },
    });
    grid.subscribe(() => {
      notifications += 1;
    });

    grid.setSorting([{ id: "age", desc: true }]);

    expect(nextSorting).toEqual([{ id: "age", desc: true }]);
    expect(grid.getState().sorting).toEqual([]);
    expect(notifications).toBe(0);

    grid.setOptions((previous) => ({
      ...previous,
      state: {
        sorting: nextSorting,
      },
    }));

    expect(grid.getState().sorting).toEqual([{ id: "age", desc: true }]);
    expect(notifications).toBe(1);

    const resolvedState = grid.getState();
    grid.setOptions((previous) => ({ ...previous }), { notify: false });
    expect(grid.getState()).toBe(resolvedState);
  });

  it("notifies subscribers when an uncontrolled field changes beside controlled state", () => {
    const grid = createGrid({
      data,
      columns,
      state: { sorting: [] },
    });
    let notifications = 0;
    grid.subscribe(() => {
      notifications += 1;
    });

    grid.setGlobalFilter("active");

    expect(grid.getState().globalFilter).toBe("active");
    expect(notifications).toBe(1);
  });
});

function gridSorting(): SortingState {
  return [];
}
