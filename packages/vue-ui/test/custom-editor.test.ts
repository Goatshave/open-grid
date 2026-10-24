import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { describe, expect, it } from "vitest";
import { createDataGrid, type CellEditorContext } from "../src";

describe("custom editor contract", () => {
  it("uses parsing/validation and fences callbacks from an ended or reopened edit session", async () => {
    type Person = { id: string; name: string };
    const contexts: CellEditorContext<Person>[] = [];
    const Grid = createDataGrid<Person>();
    await renderToString(createSSRApp({ render: () => h(Grid, {
      options: { data: [{ id: "one", name: "Original" }], getRowId: (row) => row.id,
        columns: [{ accessorKey: "name", enableEditing: true, editValueParser: (value) => value.trim(), validateEditValue: (value) => String(value).length >= 3 || "Too short" }],
        initialState: { editingCell: { rowId: "one", columnId: "name" } } },
      renderEditor: (context) => { contexts.push(context); return h("input", { "aria-label": "Custom name" }); },
    }) }));
    const context = contexts[0]!;
    expect(context.isActive()).toBe(true);
    expect(context.commit(" x ")?.validation).toMatchObject({ valid: false, message: "Too short" });
    expect(context.commit(" Saved ")?.value).toBe("Saved");
    expect(context.isActive()).toBe(false);
    context.grid.startCellEdit("one", "name");
    expect(context.commit("Stale completion")).toBeNull();
    expect(context.cancel()).toBeNull();
    expect(context.grid.getIsCellEditing("one", "name")).toBe(true);
  });
});
