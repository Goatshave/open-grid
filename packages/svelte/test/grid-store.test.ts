import { describe, expect, it } from "vitest";
import { get, writable } from "svelte/store";
import { createGridSelectorStore, createGridStore, type ColumnDef, type GridOptions } from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
}

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age" },
];

const data: Person[] = [
  { id: "1", name: "Mina", age: 32 },
  { id: "2", name: "Joon", age: 25 },
];

describe("createGridStore", () => {
  it("syncs grid state into a readable store", () => {
    const adapter = createGridStore<Person>({
      data,
      columns,
      getRowId: (row) => row.id,
    });

    adapter.grid.toggleRowSelected("1");

    expect(get(adapter.state).rowSelection).toEqual({ "1": true });
  });

  it("accepts a Svelte readable options store", () => {
    const options = writable<GridOptions<Person>>({
      data,
      columns,
      getRowId: (row) => row.id,
    });
    const adapter = createGridStore(options);

    expect(adapter.grid.getCoreRowModel().rows.map((row) => row.id)).toEqual(["1", "2"]);

    options.update((previous) => ({
      ...previous,
      data: data.slice(0, 1),
    }));

    expect(adapter.grid.getCoreRowModel().rows.map((row) => row.id)).toEqual(["1"]);
  });

  it("exposes setOptions for static option sources", () => {
    const adapter = createGridStore<Person>({
      data,
      columns,
      getRowId: (row) => row.id,
    });

    adapter.setOptions((previous) => ({
      ...previous,
      data: [],
    }));

    expect(adapter.grid.getCoreRowModel().rows).toHaveLength(0);
    expect(get(adapter.state).sorting).toEqual([]);
  });

  it("notifies selector stores only for relevant state until the last subscriber leaves", () => {
    const adapter = createGridStore<Person>({
      data,
      columns,
      getRowId: (row) => row.id,
    });
    const globalFilter = createGridSelectorStore(adapter.grid, (grid) => grid.getState().globalFilter);
    const values: string[] = [];
    const unsubscribe = globalFilter.subscribe((value) => values.push(value));

    adapter.grid.setSorting([{ id: "age", desc: true }]);
    expect(values).toEqual([""]);

    adapter.grid.setGlobalFilter("active");
    expect(values).toEqual(["", "active"]);

    unsubscribe();
    adapter.grid.setGlobalFilter("inactive");
    expect(values).toEqual(["", "active"]);
  });
});
