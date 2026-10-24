# Custom rendering

Use class hooks when markup does not need to change. Use render callbacks when a
header or cell needs framework-native content such as a badge, link, icon, or
product component. The grid keeps sorting, editing, selection, focus, and ARIA
structure around the rendered content.

## Choose the smallest override

1. Use `getHeaderClassName` and `getCellClassName` for CSS-only changes.
2. Use `columnDef.header` or `columnDef.cell` when one column owns the rendering.
3. Use `renderHeader` or `renderCell` for a product-wide rendering policy.

The global render callback runs first. Returning `null` or `undefined` falls back to
the column callback and then to Open Grid's default text rendering.

## React

```tsx
<DataGrid
  data={invoices}
  columns={columns}
  getRowId={(invoice) => invoice.id}
  renderHeader={({ column }) => <strong>{column.id}</strong>}
  renderCell={({ column, row, value }) =>
    column.id === "status"
      ? <StatusBadge status={String(value)} />
      : <a href={`/invoices/${row.id}`}>{String(value ?? "")}</a>
  }
/>
```

Callbacks receive typed core `HeaderContext<TData, TValue>` and
`CellContext<TData, TValue>` values. A column-level callback uses the same context.

## Vue

```ts
h(InvoiceGrid, {
  options,
  renderHeader: ({ column }) => h("strong", column.id),
  renderCell: ({ column, row, value }) =>
    column.id === "status"
      ? h(StatusBadge, { status: String(value) })
      : h("a", { href: `/invoices/${row.id}` }, String(value ?? "")),
});
```

`createDataGrid<Invoice>()` preserves row typing for these callbacks.

## Svelte

Svelte callbacks return a typed renderer descriptor. This keeps component creation
inside Svelte instead of attempting to render framework objects as strings.

```svelte
<script lang="ts">
  import DataGrid from "@open-grid/svelte-ui/DataGrid.svelte";
  import { createSvelteDataGridRenderer } from "@open-grid/svelte-ui";
  import InvoiceCell from "./InvoiceCell.svelte";

  const renderCell = createSvelteDataGridRenderer(InvoiceCell);
</script>

<DataGrid {options} {renderCell} />
```

The component receives the typed context as a `context` prop:

```svelte
<script lang="ts">
  import type { CellContext } from "@open-grid/core";
  export let context: CellContext<Invoice, unknown>;
</script>

<a href={`/invoices/${context.row.id}`}>{String(context.value ?? "")}</a>
```

Pass a second object to `createSvelteDataGridRenderer(Component, props)` for stable
component props shared by every invocation. The helper supports Svelte 4.2.20 and
Svelte 5.

## Performance boundary

Render callbacks run for mounted cells, not every row in a virtualized dataset.
Keep callback and component identities stable, and avoid product-side scans of the
full dataset during each render. Use `getCellClassName` instead of a custom component
when a semantic class is sufficient.

## Custom editors (0.4 development)

Enable column editing and pass `renderEditor(context)` to the maintained renderer.
Return a framework-native component for selected columns or `null`/`undefined` to
use the built-in text/select editor. React returns a React node, Vue returns a VNode,
and Svelte uses `createSvelteDataGridRenderer(EditorComponent)` with the same
`CellEditorContext<TData>` contract. React hooks belong inside the returned editor
component, not inside the render callback.

```tsx
<DataGrid
  data={rows}
  columns={columns}
  renderEditor={(context) => context.column.id === "openedAt"
    ? <CalendarEditor context={context} />
    : null}
/>
```

| Context member | Contract |
| --- | --- |
| `grid`, `row`, `column`, `value` | Typed cell context and the row's current value. Initialize a component-owned draft on mount; keep it through context/error updates. |
| `validationMessage` | Current local validation feedback; reflect it through an accessible invalid state on the actual input. |
| `isActive()` | Whether this captured edit session is still current. Check before applying delayed editor effects. |
| `commit(value, sourceEvent?)` | Strings use `editValueParser`; other typed values pass directly to existing validation, preventable edit events, history, and product-owned server approval. Returns the edit event or `null` for an inactive session. |
| `cancel(sourceEvent?)` | Uses the existing preventable cancellation path and normal focus restoration. Old callbacks cannot cancel a newly opened session, even in the same cell. |

An event with `defaultPrevented` can mean validation failed or a product is awaiting
server approval. Keep the draft/editor available in either case; server writes stay
outside local undo history under the existing contract.

The editor owns autofocus, popup focus, blur behavior, and keyboard policy. The
renderer isolates its keyboard/click/pointer events from grid shortcuts and does
not implicitly save a composite editor on blur. Provide clear save/cancel actions
and labels. Reuse `getCellEditorKeyboardAction` from `@open-grid/primitives` for
IME-aware Enter/Escape handling; composition keys belong to the input method.

Product-owned asynchronous saves must also guard cleanup against newer drafts.
The reference HTTP client invalidates cleanup through captured input events in
`.og-grid__custom-editor`; editors whose drafts change through non-input mechanisms
should notify their product guard explicitly. A grid cannot infer an application
popup's internal draft or roll back an already-started server write.

The three flat server examples demonstrate native calendar inputs and account
autocomplete components with draft retention, local/server validation, cancellation,
row-revision ordering across different columns, and failed-save recovery.
