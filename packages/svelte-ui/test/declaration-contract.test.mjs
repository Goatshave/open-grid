import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const declarationSource = readFileSync(new URL("../src/DataGrid.svelte.d.ts", import.meta.url), "utf8");

describe("Svelte DataGrid declaration contract", () => {
  it("exposes the runtime accessibility and styling props", () => {
    expect(declarationSource).toMatch(/ariaLabel\?: string/);
    expect(declarationSource).toMatch(/getRowClassName\?: \(row: Row<TData>\) => string \| undefined/);
    expect(declarationSource).toMatch(/getHeaderClassName\?: \(context: HeaderContext<TData, unknown>\) => string \| undefined/);
    expect(declarationSource).toMatch(/getCellClassName\?: \(context: CellContext<TData, unknown>\) => string \| undefined/);
    expect(declarationSource).toMatch(/class\?: string/);
  });
});
