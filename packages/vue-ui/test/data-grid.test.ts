import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { describe, expect, it } from "vitest";
import { createDataGrid, type ColumnDef, type GridLocalizationOverrides, type GridOptions } from "../src";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
];
const PersonGrid = createDataGrid<Person>();

async function renderGrid(
  options: GridOptions<Person>,
  emptyState?: string,
  localization?: GridLocalizationOverrides,
) {
  return renderToString(createSSRApp({
    render: () => h(PersonGrid, { ariaLabel: localization ? undefined : "People", options, emptyState, localization }),
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
    const markup = await renderGrid({ data: [], columns, getRowId: (row) => row.id }, "No people");

    expect(markup).toContain("No people");
    expect(markup).toContain('role="gridcell"');
  });

  it("renders localized built-in controls and default empty state", async () => {
    const markup = await renderGrid(
      { data: [], columns, getRowId: (row) => row.id },
      undefined,
      {
        dataGridLabel: "사용자 표",
        noRows: "사용자가 없습니다",
        searchRowsPlaceholder: "사용자 검색",
      },
    );

    expect(markup).toContain('aria-label="사용자 표"');
    expect(markup).toContain("사용자가 없습니다");
  });

});
