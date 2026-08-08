# @open-grid/react-ui

Optional styled React data grid for Open Grid.

Use this package for the reference React grid UI, including sorting, filtering, selection, editing, grouping, tree data, virtualization, and export helpers.

`DataGrid` accepts `ariaLabel` for a product-specific accessible name and defaults to `"Data grid"`.

Use `className`, `getRowClassName(row)`, `getHeaderClassName(context)`, and `getCellClassName(context)` to attach product-owned root, row, header, and cell classes for status, risk, or workflow styling without replacing the renderer. Header contexts include the grid, column, and header; cell contexts also include the row and current value.

## Install

```bash
npm install @open-grid/react-ui @open-grid/theme react
```

## Usage

```tsx
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import { createColumnHelper, DataGrid } from "@open-grid/react-ui";

const column = createColumnHelper<{ id: string; name: string }>();
const columns = [column.accessor("name", { header: "Name" })];

export function PeopleGrid({ data }: { data: Array<{ id: string; name: string }> }) {
  return <DataGrid ariaLabel="People" data={data} columns={columns} getRowId={(row) => row.id} />;
}
```

For fixed-height, read-only analytics views where startup, scrolling, and bundle
size take priority over built-in editing, selection, grouping controls, menus, and
resizing, use the separately tree-shakeable virtual entry:

```tsx
import "@open-grid/react-ui/virtual.css";
import { createColumnHelper, VirtualDataGrid } from "@open-grid/react-ui/virtual";

const getPersonId = (person: { id: string }) => person.id;

<VirtualDataGrid
  ariaLabel="People analytics"
  data={data}
  columns={columns}
  getRowId={getPersonId}
  rowHeight={40}
  rowOverscan={5}
  columnOverscan={5}
/>
```

`VirtualDataGrid` keeps core sorting/filtering/pagination state, sortable leaf
headers, custom header/cell renderers, pinned columns, row and column
virtualization, semantic grid coordinates, and product class hooks. Use `DataGrid`
when the renderer must provide grouped headers, editing, selection, grouping/tree
controls, menus, resize handles, clipboard/fill interactions, overlays, or keyboard
cell navigation. Keep data-model callbacks such as `getRowId` stable in either
component so React renders do not invalidate core row caches.

Pass `editHistoryLimit={100}` to opt into bounded edit history. Outside an active
editor, Ctrl/Meta+Z undoes and Ctrl/Meta+Shift+Z or Ctrl+Y redoes direct edits,
pastes, and fills through the same preventable `onCellEdit` contract.

Use `onGridReady={(grid) => ...}` to connect product-owned toolbar commands,
diagnostics, or subscriptions to the styled grid's live core API. The handler runs
after mount and may return a cleanup function; return the unsubscribe function from
`grid.subscribeSelector(...)` when product UI mirrors one derived API value without
reacting to unrelated grid notifications.

The package re-exports `fitColumnsToWidth(grid, width, { columnIds? })` for
proportional visible-column fitting with core-owned min/max redistribution. Products decide the
available width and command placement; the renderer does not read layout implicitly.

The virtual entry has its own lean stylesheet at
`@open-grid/react-ui/virtual.css`. It contains only the fixed-height virtual grid
shell, header, row, cell, focus, selection, and empty-state styles. Import the full
`@open-grid/react-ui/css` entry only with `DataGrid`; importing both stylesheets
removes the virtual entry's bundle-size advantage.

The virtual stylesheet applies strict CSS containment to the semantic scroller.
Keep the grid in an explicitly sized flex or block container; containment bounds
layout, paint, style, and size work to the scrolling surface without changing the
row or column virtualization API.

The minimal renderer also enables row `content-visibility` only when the core row
model contains at least 50,000 rows. Smaller grids avoid the first-use column-layout
cost of that browser feature, while large and stress-sized grids retain the bounded
deep-scroll and selection behavior. This threshold is an internal rendering
heuristic and does not change semantic row counts or the virtualization API.

For the full `DataGrid`, set `columnVirtualization.measureColumnWidth` to `false`
only when every virtualized leaf column has a guaranteed explicit width. This skips
DOM width measurement and uses the core sized layout; keep the default measured
mode for resizable columns or product CSS that can change rendered widths.

Full-grid body rows render only actual cells. Shared virtual helpers attach omitted
center width to the first and last rendered center cells, avoiding repeated per-row
spacer elements while preserving pinned columns and grouped-header alignment.

The fixed-size virtual window treats its viewport end as exclusive, so a row that
starts exactly at the bottom edge is not mounted until it becomes visible. Virtual
center columns use their calculated absolute positions rather than per-row spacer
elements; pinned columns remain sticky.

Override semantic `--og-*` variables on `[data-open-grid]` to match a product design system. Set `data-og-theme="dark"` on the grid or an ancestor for the bundled dark defaults; application toolbars and surrounding panels remain product-owned.

See the [React UI guide](https://goatshave.github.io/open-grid/react-ui) for controlled state, virtualization, editing, grouping, accessibility, and server-owned workflows.
