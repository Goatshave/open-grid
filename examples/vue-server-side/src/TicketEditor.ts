import { defineComponent, h, onMounted, ref, type PropType } from "vue";
import type { CellEditorContext } from "@open-grid/core";
import { getCellEditorKeyboardAction } from "@open-grid/primitives";
import type { ServerSideTicket } from "@open-grid/example-shared-server";

export const TicketEditor = defineComponent({
  props: { context: { type: Object as PropType<CellEditorContext<ServerSideTicket>>, required: true } },
  setup(props) {
    const draft = ref(String(props.context.value ?? ""));
    const input = ref<HTMLInputElement>();
    onMounted(() => input.value?.focus());
    return () => {
      const context = props.context;
      const date = context.column.id === "openedAt";
      const list = `accounts-${context.row.id}`;
      return [
        h("input", { ref: input, class: "og-grid__cell-editor", type: date ? "date" : "text",
          "aria-label": `Edit ${context.column.id}`, "aria-invalid": Boolean(context.validationMessage),
          value: draft.value, list: date ? undefined : list,
          onInput: (event: Event) => { draft.value = (event.target as HTMLInputElement).value; },
          onKeydown: (event: KeyboardEvent) => {
            const action = getCellEditorKeyboardAction(event);
            if (!action) return;
            event.preventDefault();
            if (action === "commit-edit") context.commit(draft.value, event); else context.cancel(event);
          } }),
        !date ? h("datalist", { id: list }, [h("option", { value: "Acme Corporation" }), h("option", { value: "Northwind Traders" })]) : null,
        h("button", { type: "button", "aria-label": "Save edit", onClick: (event: MouseEvent) => context.commit(draft.value, event) }, "✓"),
        h("button", { type: "button", "aria-label": "Cancel edit", onClick: (event: MouseEvent) => context.cancel(event) }, "×"),
      ];
    };
  },
});
