import { useLayoutEffect, useRef, useState } from "react";
import type { CellEditorContext } from "@open-grid/core";
import { getCellEditorKeyboardAction } from "@open-grid/primitives";
import type { ServerSideTicket } from "@open-grid/example-shared-server";

export function TicketEditor({ context }: { context: CellEditorContext<ServerSideTicket> }) {
  const [draft, setDraft] = useState(String(context.value ?? ""));
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { input.current?.focus(); }, []);
  const date = context.column.id === "openedAt";
  const list = `accounts-${context.row.id}`;
  return <>
    <input ref={input} className="og-grid__cell-editor" type={date ? "date" : "text"}
      aria-label={`Edit ${context.column.id}`} aria-invalid={Boolean(context.validationMessage)}
      value={draft} list={date ? undefined : list}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        const action = getCellEditorKeyboardAction(event);
        if (!action) return;
        event.preventDefault();
        if (action === "commit-edit") context.commit(draft, event); else context.cancel(event);
      }} />
    {!date && <datalist id={list}><option value="Acme Corporation" /><option value="Northwind Traders" /></datalist>}
    <button type="button" aria-label="Save edit" onClick={(event) => context.commit(draft, event)}>✓</button>
    <button type="button" aria-label="Cancel edit" onClick={(event) => context.cancel(event)}>×</button>
  </>;
}
