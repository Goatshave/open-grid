# Product composition

`DataGrid` exposes product-owned composition points without moving product UI into
the framework-agnostic core.

## Add a toolbar

Use `renderToolbar(context)` for commands that belong to the grid workflow. The
toolbar is rendered before built-in controls and outside the semantic `role="grid"`
element.

```tsx
<DataGrid
  {...options}
  renderToolbar={({ grid, rows, visibleColumns }) => (
    <InvoiceToolbar
      visibleCount={rows.length}
      columnCount={visibleColumns.length}
      exportPage={() => downloadExportFile(grid.getExportFile({ rowScope: "page" }))}
    />
  )}
/>
```

The same callback is available in Vue. In Svelte, wrap the toolbar component with
`createSvelteDataGridRenderer` as described in [Custom rendering](custom-rendering.md).

`DataGridRenderContext<TData>` contains the live `grid`, current rendered row model,
and visible leaf columns. Use `onGridReady` and selector subscriptions instead when
controls live outside the component or need long-lived reactive subscriptions.

## Compose loading, error, and empty states

Use these callbacks when a state needs product components instead of a static value:

- `renderLoadingState(context)`
- `renderErrorState({ ...context, retry })`
- `renderEmptyState(context)`

```tsx
<DataGrid
  {...options}
  loading={query.isLoading}
  error={query.isError}
  onRetry={() => query.refetch()}
  renderLoadingState={() => <InvoiceSkeleton />}
  renderErrorState={({ retry }) => <ErrorMessage onRetry={retry} />}
  renderEmptyState={() => <EmptyInvoices action={<CreateInvoiceButton />} />}
/>
```

Render callbacks replace state content while Open Grid retains busy, alert, grid
coordinate, and overlay structure. `error` takes precedence over `loading`. The
existing `loadingState`, `errorState`, and `emptyState` value props remain the simple
choice and are used as fallbacks when a render callback returns `null` or
`undefined`.

## Handle an empty server response

Always normalize the product query result before it reaches the grid:

```ts
const rows = Array.isArray(response?.items) ? response.items : [];
```

Pass `rows` as `data` and use `loading`, `error`, and `renderEmptyState` to represent
query state. Do not read nested response fields from `undefined` while constructing
columns or rows; Open Grid intentionally treats an empty array as a valid dataset.
