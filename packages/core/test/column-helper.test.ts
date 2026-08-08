import { describe, expect, expectTypeOf, it } from "vitest";
import { createColumnHelper, createGrid, type AnyColumnDef } from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
  active: boolean;
}

const data: Person[] = [
  { id: "1", name: "Mina", age: 32, active: true },
  { id: "2", name: "Joon", age: 25, active: false },
];

describe("createColumnHelper", () => {
  it("infers accessor key value types for cell, filter, and sort callbacks", () => {
    const column = createColumnHelper<Person>().accessor("age", {
      cell: ({ value }) => {
        expectTypeOf(value).toEqualTypeOf<number | undefined>();
        return value?.toFixed(0);
      },
      filterFn: (value, filterValue) => {
        expectTypeOf(value).toEqualTypeOf<number | undefined>();
        return value === filterValue;
      },
      sortFn: (a, b, columnId) => Number(a.getValue(columnId)) - Number(b.getValue(columnId)),
    });

    expect(column.accessorKey).toBe("age");
  });

  it("infers accessor function value types and requires a stable id", () => {
    const column = createColumnHelper<Person>().accessor((row) => row.name.toUpperCase(), {
      id: "upperName",
      cell: ({ value }) => {
        expectTypeOf(value).toEqualTypeOf<string | undefined>();
        return value?.toLowerCase();
      },
    });

    expect(column.id).toBe("upperName");
    expect(column.accessorFn?.(data[0] as Person, 0)).toBe("MINA");
  });

  it("supports heterogeneous helper columns in grid options", () => {
    const column = createColumnHelper<Person>();
    const columns: AnyColumnDef<Person>[] = [
      column.accessor("name", {
        header: "Name",
      }),
      column.accessor("age", {
        header: "Age",
      }),
      column.accessor((row) => (row.active ? "Active" : "Inactive"), {
        id: "status",
        header: "Status",
      }),
      column.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => row.id,
      }),
    ];

    const grid = createGrid({
      data,
      columns,
      getRowId: (row) => row.id,
    });

    expect(grid.getAllLeafColumns().map((item) => item.id)).toEqual(["name", "age", "status", "actions"]);
    expect(grid.getCoreRowModel().rows[0]?.getValue("status")).toBe("Active");
  });
});
