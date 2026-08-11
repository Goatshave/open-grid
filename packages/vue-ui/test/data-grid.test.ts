import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { describe, expect, it } from "vitest";
import { createDataGrid, type ColumnDef, type GridOptions } from "../src";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
];
const PersonGrid = createDataGrid<Person>();

async function renderGrid(options: GridOptions<Person>, emptyState = "No people") {
  return renderToString(createSSRApp({
    render: () => h(PersonGrid, { ariaLabel: "People", options, emptyState }),
  }));
}

describe("DataGrid", () => {
  it("renders accessible headers and row values", async () => {
    const markup = await renderGrid({
      data: [{ id: "1", name: "Mina" }],
      columns,
      getRowId: (row) => row.id,
    });

    expect(markup).toContain('role="grid"');
    expect(markup).toContain('aria-label="People"');
    expect(markup).toContain("Name");
    expect(markup).toContain("Mina");
  });

  it("renders the configured empty state for an empty dataset", async () => {
    const markup = await renderGrid({ data: [], columns, getRowId: (row) => row.id });

    expect(markup).toContain("No people");
    expect(markup).toContain('role="gridcell"');
  });
});
