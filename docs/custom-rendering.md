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
