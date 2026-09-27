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
