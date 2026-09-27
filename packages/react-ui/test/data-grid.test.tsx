import type { ColumnDef } from "@open-grid/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataGrid } from "../src";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [{ accessorKey: "name", header: "Name" }];

describe("DataGrid localization", () => {
  it("renders localized built-in controls and empty state", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const markup = renderToStaticMarkup(createElement(DataGrid<Person>, {
        data: [],
        columns,
        getRowId: (row) => row.id,
        quickFilterControl: true,
        paginationControls: true,
        localization: {
          dataGridLabel: "사용자 표",
          noRows: "사용자가 없습니다",
          searchRowsPlaceholder: "사용자 검색",
          paginationLabel: "페이지 이동",
          pageStatus: (page, pageCount) => `${pageCount}쪽 중 ${page}쪽`,
        },
      }));

    expect(markup).toContain('aria-label="사용자 표"');
    expect(markup).toContain("사용자가 없습니다");
    expect(markup).toContain('placeholder="사용자 검색"');
    expect(markup).toContain('aria-label="페이지 이동"');
    expect(markup).toContain("1쪽 중 1쪽");
    expect(consoleError.mock.calls.every(([message]) => String(message).includes("useLayoutEffect does nothing on the server"))).toBe(true);
    consoleError.mockRestore();
  });
});

describe("DataGrid composition", () => {
  it("renders typed toolbar, header, and cell content with live grid context", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const markup = renderToStaticMarkup(createElement(DataGrid<Person>, {
      data: [{ id: "1", name: "Mina" }],
      columns,
      getRowId: (row) => row.id,
      renderToolbar: ({ grid, rows, visibleColumns }) => createElement(
        "aside",
        { "data-grid-id": grid.getRowModel().rows[0]?.id },
        `${rows.length} row / ${visibleColumns.length} column`,
      ),
      renderHeader: ({ column }) => createElement("strong", null, `Header ${column.id}`),
      renderCell: ({ row, value }) => createElement("em", { "data-row-id": row.id }, `Cell ${String(value)}`),
    }));

    expect(markup).toContain('data-grid-id="1"');
    expect(markup).toContain("1 row / 1 column");
    expect(markup).toContain("<strong>Header name</strong>");
    expect(markup).toContain('<em data-row-id="1">Cell Mina</em>');
    expect(consoleError.mock.calls.every(([message]) => String(message).includes("useLayoutEffect does nothing on the server"))).toBe(true);
    consoleError.mockRestore();
  });

  it("renders custom loading, error, and empty states", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const baseProps = {
      data: [],
      columns,
      getRowId: (row: Person) => row.id,
    };

    const loadingMarkup = renderToStaticMarkup(createElement(DataGrid<Person>, {
      ...baseProps,
      loading: true,
      renderLoadingState: ({ rows }) => createElement("span", null, `Loading ${rows.length}`),
    }));
    const retry = vi.fn();
    const errorMarkup = renderToStaticMarkup(createElement(DataGrid<Person>, {
      ...baseProps,
      error: true,
      onRetry: retry,
      renderErrorState: (context) => createElement("span", null, context.retry === retry ? "Retry ready" : "Retry missing"),
    }));
    const emptyMarkup = renderToStaticMarkup(createElement(DataGrid<Person>, {
      ...baseProps,
      renderEmptyState: ({ visibleColumns }) => createElement("span", null, `Empty ${visibleColumns.length}`),
    }));

    expect(loadingMarkup).toContain("Loading 0");
    expect(errorMarkup).toContain("Retry ready");
    expect(emptyMarkup).toContain("Empty 1");
    consoleError.mockRestore();
  });
});
