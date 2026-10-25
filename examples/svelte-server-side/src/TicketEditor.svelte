<script lang="ts">
  import { onMount } from "svelte";
  import type { CellEditorContext } from "@open-grid/core";
  import { getCellEditorKeyboardAction } from "@open-grid/primitives";
  export let context: CellEditorContext<unknown>;
  let draft = String(context.value ?? "");
  let input: HTMLInputElement;
  const date = context.column.id === "openedAt";
  const list = `accounts-${context.row.id}`;
  onMount(() => input.focus());
</script>

<input bind:this={input} class="og-grid__cell-editor" type={date ? "date" : "text"}
  aria-label={`Edit ${context.column.id}`} aria-invalid={Boolean(context.validationMessage)}
  value={draft} list={date ? undefined : list}
  on:input={(event) => { draft = event.currentTarget.value; }}
  on:keydown={(event) => {
    const action = getCellEditorKeyboardAction(event);
    if (!action) return;
    event.preventDefault();
    if (action === "commit-edit") context.commit(draft, event); else context.cancel(event);
  }} />
{#if !date}<datalist id={list}><option value="Acme Corporation" /><option value="Northwind Traders" /></datalist>{/if}
<button type="button" aria-label="Save edit" on:click={(event) => context.commit(draft, event)}>✓</button>
<button type="button" aria-label="Cancel edit" on:click={(event) => context.cancel(event)}>×</button>
