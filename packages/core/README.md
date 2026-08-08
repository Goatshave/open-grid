# @open-grid/core

Framework-agnostic Open Grid engine for state, row models, column models, events, and data-grid behavior.

Use this package directly when building a custom renderer or a product-owned grid UI.

## Install

```bash
npm install @open-grid/core
```

## Quick Start

```ts
import { createColumnHelper, createGrid } from "@open-grid/core";

interface Person {
  id: string;
  name: string;
}

const column = createColumnHelper<Person>();
const grid = createGrid({
  data: [{ id: "1", name: "Mina" }],
  columns: [column.accessor("name", { header: "Name" })],
  getRowId: (row) => row.id,
});

const rows = grid.getRowModel().rows;
```

The core is DOM-free and framework-free. Product code owns data mutation, controlled state, and rendering.

## Fit Columns To Width

Import `fitColumnsToWidth` and call `fitColumnsToWidth(grid, width)` to
proportionally fit the currently visible
leaf columns to an available inline width. The core repeatedly clamps columns at
their `minSize` or `maxSize` and redistributes the remaining width, so one bounded
column does not leave unused space while other columns can still grow or shrink.

Pass `{ columnIds: ["name", "status"] }` as the third argument to fit only that visible subset. Unknown,
duplicate, and hidden ids do not receive sizing entries; existing sizes for all
other columns are preserved. A width below the selected minimum total or above its
maximum total resolves to those bounds instead of violating column constraints.
The width must be finite and non-negative. The resulting `columnSizing` still
follows the normal controlled-state and `onStateChange` contract.
The standalone command is tree-shakeable, so grids that do not use fitting do not
carry the allocation algorithm.

## Cell Edit History

Set `editHistoryLimit` to a positive number to retain bounded, product-owned cell
edit transactions. Direct edits use one transaction per commit; paste and fill
commit all accepted cells as one transaction. The default is `0`, so read-only or
history-free grids do not retain edit values.

Use `grid.undoCellEdit()` and `grid.redoCellEdit()` for replay, inspect availability
with `grid.getCanUndoCellEdit()`, `grid.getCanRedoCellEdit()`, or
`grid.getCellEditHistoryState()`, and reset retained values with
`grid.clearCellEditHistory()`. Replay emits the same preventable, validated commit
events with `historyAction: "undo" | "redo"`; product code still applies row data
updates in `onCellEdit`. A commit prevented for async server approval is not added
to local history.

## Selector Subscriptions

Use `grid.subscribeSelector(selector, listener, options)` when product-owned UI only
needs one derived grid value. The listener runs only when the selected value changes
under `Object.is`; pass `equalityFn` for structural values and `fireImmediately: true`
to receive the initial value. The returned function unsubscribes the listener.

```ts
const unsubscribe = grid.subscribeSelector(
  (currentGrid) => currentGrid.getCellEditHistoryState(),
  (history) => updateHistoryToolbar(history),
  { fireImmediately: true },
);
```

`getCellEditHistoryState()` retains its object identity while undo depth, redo depth,
and limit are unchanged, so the default equality avoids product toolbar updates for
unrelated sorting, filtering, focus, selection, and layout notifications. Use the
existing `grid.subscribe()` when every grid notification is required.

See the [project README](https://github.com/Goatshave/open-grid#readme) for features, framework packages, and examples.
