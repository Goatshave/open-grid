import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref, watch } from "vue";
import { useGrid, useGridSelector, type ColumnDef, type GridOptions, type VueGrid, type VueGridSelector } from "../src";

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

describe("useGrid", () => {
  it("syncs grid state and reactive option updates", async () => {
    const options = ref<GridOptions<Person>>({
      data,
      columns,
      getRowId: (row) => row.id,
    });
    const scope = effectScope();
    let adapter: VueGrid<Person> | undefined;

    scope.run(() => {
      adapter = useGrid(options);
    });

    expect(adapter?.grid.getCoreRowModel().rows.map((row) => row.id)).toEqual(["1", "2"]);

    adapter?.grid.toggleRowSelected("1");
    expect(adapter?.state.value.rowSelection).toEqual({ "1": true });

    options.value = {
      ...options.value,
      data: data.slice(0, 1),
    };
    await nextTick();

    expect(adapter?.grid.getCoreRowModel().rows.map((row) => row.id)).toEqual(["1"]);

    scope.stop();
  });

  it("can be disposed manually outside an active Vue scope", async () => {
    const options = ref<GridOptions<Person>>({
      data,
      columns,
      getRowId: (row) => row.id,
    });
    const adapter = useGrid(options);

    adapter.dispose();
    options.value = {
      ...options.value,
      data: [],
    };
    await nextTick();

    expect(adapter.grid.getCoreRowModel().rows.map((row) => row.id)).toEqual(["1", "2"]);
  });

  it("updates selector refs only for relevant state and disposes with the Vue scope", async () => {
    const scope = effectScope();
    let adapter: VueGrid<Person> | undefined;
    let selectorAdapter: VueGridSelector<string> | undefined;
    let notifications = 0;

    scope.run(() => {
      adapter = useGrid<Person>({ data, columns, getRowId: (row) => row.id });
      selectorAdapter = useGridSelector(adapter.grid, (grid) => grid.getState().globalFilter);
      watch(selectorAdapter.selected, () => {
        notifications += 1;
      });
    });

    adapter?.grid.setSorting([{ id: "age", desc: true }]);
    await nextTick();
    expect(notifications).toBe(0);

    adapter?.grid.setGlobalFilter("active");
    await nextTick();
    expect(selectorAdapter?.selected.value).toBe("active");
    expect(notifications).toBe(1);

    scope.stop();
    adapter?.grid.setGlobalFilter("inactive");
    await nextTick();
    expect(selectorAdapter?.selected.value).toBe("active");
  });
});
