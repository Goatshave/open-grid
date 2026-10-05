# Server data

Open Grid keeps transport and product data outside the grid instance. Products own
query construction, transport, authentication, cache policy, and how successful
results enter grid data.

## Exact server totals

Pass `rowCount` with `manualPagination` when the server knows the exact number of
rows matching the current query. Open Grid returns that value from `getRowCount()`
and derives `getPageCount()` from the normalized page size.

```ts
import { createGrid } from "@open-grid/core";

const grid = createGrid({
  data: page.rows,
  columns,
  manualPagination: true,
  rowCount: page.totalRows,
  initialState: {
    pagination: { pageIndex: 0, pageSize: 25 },
  },
});

grid.getRowCount(); // exact server total
grid.getPageCount(); // Math.ceil(page.totalRows / 25), with a minimum of 1
```

An explicit `pageCount` takes precedence when both values are supplied. Use it when
the backend exposes pages but cannot provide an exact total. For manual pagination
without `rowCount`, maintained renderers expose `aria-rowcount="-1"` instead of
inventing an accessible row total. Supplying `rowCount` lets shared primitives expose
an accessible total based on the exact data-row total, adding rendered header rows
and the empty-state row when applicable.

Malformed totals are normalized at the core boundary: negative or non-finite
`rowCount` values become `0`, and fractional totals are floored. Page indexes and page
sizes follow the same bounded pagination rules documented in the
[architecture guide](./architecture).

## Request lifecycle

Use `createServerRequestCoordinator` when several framework views need the same request
lifecycle without sharing framework state.

The coordinator runs different keys concurrently and replaces only the active request
for the same key. Each request receives an `AbortSignal` and increasing `requestId`.
Late results from replaced work resolve as `stale` and cannot overwrite the current
state.

```ts
import { createServerRequestCoordinator } from "@open-grid/core";

interface ChildrenQuery {
  parentId: string;
  refreshVersion: number;
}

const childrenRequests = createServerRequestCoordinator<
  string,
  ChildrenQuery,
  readonly Ticket[]
>({
  getKey: (query) => query.parentId,
  request: async (query, { signal }) => {
    const response = await fetch(
      `/api/tickets/${query.parentId}?refresh=${query.refreshVersion}`,
      { signal },
    );
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<readonly Ticket[]>;
  },
});
```

The maintained React, Vue, and Svelte server-tree examples use this contract for
keyed request ordering, cancellation, retry, and stale-response protection. Their
product state continues to own expansion and how successful child rows enter grid
data. Loading, error, and pagination changes are exposed through polite atomic status
regions so assistive technology receives the same lifecycle transitions.

Call `run(query)` to load a key. The returned result is a discriminated union with a
`success`, `error`, `cancelled`, or `stale` status, so callers do not need to identify
abort errors from each transport. `getState(key)` reports `idle`, `loading`, `success`,
`error`, or `cancelled` state. A refresh retains the last successful `data` while the
new request is loading or has failed.

```ts
const result = await childrenRequests.run({ parentId: "portfolio-1", refreshVersion: 0 });

if (result.status === "success") {
  renderChildren(result.data);
}

const current = childrenRequests.getState("portfolio-1");
if (current.status === "error") {
  showRetry(() => childrenRequests.retry("portfolio-1"));
}
```

`subscribe(listener)` reports future state changes with their key and returns an
unsubscribe function; read an existing snapshot with `getState(key)` when subscribing.
Framework code can copy those snapshots into React state, Vue refs, or a Svelte store
without changing the request semantics.

Use `cancel(key, reason)` when a row collapses, `cancelAll(reason)` during a broader
navigation change, and `reset(key)` to cancel active work and discard both retained
state and the saved retry input. `cancel` returns whether it stopped active work, while
`cancelAll` returns the number of stopped requests. `retry(key)` returns `null` when no
saved input exists. Call `dispose()` when the owning product scope is destroyed; it
aborts active work, clears retained inputs and states, removes listeners, and rejects
later `run` calls.

The coordinator owns request ordering and lifecycle state. Product code still owns
query construction, transport, authentication, cache policy, how results enter grid
`data`, and when a request should run.
