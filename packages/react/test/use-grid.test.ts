import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useGrid, useGridSelector, type ColumnDef, type Grid } from "../src";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
];

describe("useGrid", () => {
  it("exposes safe special-name row indexes and selection through the adapter", () => {
    const ids = ["__proto__", "constructor", "toString", "hasOwnProperty"];
    let grid: Grid<Person> | undefined;
    function Harness() {
      grid = useGrid<Person>({ data: ids.map((id) => ({ id, name: id })), columns, getRowId: (row) => row.id });
      const indexed = useGridSelector(grid, (current) => Object.keys(current.getCoreRowModel().rowsById).join(","));
      return createElement("output", null, indexed);
    }
    expect(renderToStaticMarkup(createElement(Harness))).toBe(`<output>${ids.join(",")}</output>`);
    grid!.toggleRowSelected("__proto__");
    expect(grid!.getSelectedRowModel().rows.map((row) => row.id)).toEqual(["__proto__"]);
    grid!.setOptions((previous) => ({ ...previous, data: previous.data.filter((row) => row.id !== "constructor") }));
    expect(grid!.getCoreRowModel().rowsById.constructor).toBeUndefined();
  });

  it("creates a grid and exposes selected state during server rendering", () => {
    const data: Person[] = [
      { id: "1", name: "Mina" },
      { id: "2", name: "Joon" },
    ];
    let renderedGrid: Grid<Person> | undefined;

    function GridHarness() {
      const grid = useGrid<Person>({ data, columns, getRowId: (row) => row.id });
      const rowIds = useGridSelector(grid, (currentGrid) =>
        currentGrid.getCoreRowModel().rows.map((row) => row.id).join(","),
      );
      renderedGrid = grid;

      return createElement("output", null, rowIds);
    }

    expect(renderToStaticMarkup(createElement(GridHarness))).toBe("<output>1,2</output>");
    expect(renderedGrid?.getCoreRowModel().rows.map((row) => row.original.name)).toEqual(["Mina", "Joon"]);
  });
});
