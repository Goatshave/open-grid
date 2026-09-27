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

  it("renders typed toolbar, header, and cell content with live grid context", async () => {
    const markup = await renderToString(createSSRApp({
      render: () => h(PersonGrid, {
        ariaLabel: "People",
        options: {
          data: [{ id: "1", name: "Mina" }],
          columns,
          getRowId: (row) => row.id,
        },
        renderToolbar: ({ grid, rows, visibleColumns }) => h(
          "aside",
          { "data-grid-id": grid.getRowModel().rows[0]?.id },
          `${rows.length} row / ${visibleColumns.length} column`,
        ),
        renderHeader: ({ column }) => h("strong", `Header ${column.id}`),
        renderCell: ({ row, value }) => h("em", { "data-row-id": row.id }, `Cell ${String(value)}`),
      }),
    }));

    expect(markup).toContain('data-grid-id="1"');
    expect(markup).toContain("1 row / 1 column");
    expect(markup).toContain("<strong>Header name</strong>");
    expect(markup).toContain('<em data-row-id="1">Cell Mina</em>');
  });

  it("renders custom loading, error, and empty states", async () => {
    const options: GridOptions<Person> = { data: [], columns, getRowId: (row) => row.id };
    const retry = () => undefined;
    const render = (props: Record<string, unknown>) => renderToString(createSSRApp({
      render: () => h(PersonGrid, { ariaLabel: "People", options, ...props }),
    }));

    expect(await render({ loading: true, renderLoadingState: ({ rows }: { rows: readonly unknown[] }) => h("span", `Loading ${rows.length}`) })).toContain("Loading 0");
    expect(await render({ error: true, onRetry: retry, renderErrorState: (context: { retry?: () => void }) => h("span", context.retry === retry ? "Retry ready" : "Retry missing") })).toContain("Retry ready");
    expect(await render({ renderEmptyState: ({ visibleColumns }: { visibleColumns: readonly unknown[] }) => h("span", `Empty ${visibleColumns.length}`) })).toContain("Empty 1");
  });
});
