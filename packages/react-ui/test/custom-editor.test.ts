import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataGrid, type CellEditorContext } from "../src";

describe("custom editor contract", () => {
  it("uses parsing/validation and fences callbacks from an ended or reopened edit session", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const contexts: CellEditorContext<{ id: string; name: string }>[] = [];
      renderToStaticMarkup(createElement(DataGrid<{ id: string; name: string }>, {
        data: [{ id: "one", name: "Original" }], getRowId: (row) => row.id,
        columns: [{ accessorKey: "name", enableEditing: true, editValueParser: (value) => value.trim(), validateEditValue: (value) => String(value).length >= 3 || "Too short" }],
        initialState: { editingCell: { rowId: "one", columnId: "name" } },
        renderEditor: (context) => { contexts.push(context); return createElement("input", { "aria-label": "Custom name" }); },
      }));
      const context = contexts[0]!;
      expect(context.isActive()).toBe(true);
      expect(context.commit(" x ")?.validation).toMatchObject({ valid: false, message: "Too short" });
      expect(context.isActive()).toBe(true);
      expect(context.commit(" Saved ")?.value).toBe("Saved");
      expect(context.isActive()).toBe(false);
      context.grid.startCellEdit("one", "name");
      expect(context.commit("Stale completion")).toBeNull();
      expect(context.cancel()).toBeNull();
      expect(context.grid.getIsCellEditing("one", "name")).toBe(true);
    } finally { errors.mockRestore(); }
  });
});
