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

## Pagination without an exact total

For manual pagination, pass `hasNextPage` when the server cannot supply `rowCount`
or `pageCount`. `getPageCount()` returns `-1` in this opt-in mode, `nextPage()` uses
the supplied availability, and `lastPage()` leaves the current page unchanged.
An exact `pageCount` or `rowCount` takes precedence over availability flags.

```ts
const grid = createGrid({
  data: page.rows,
  columns,
  manualPagination: true,
  hasNextPage: page.nextCursor !== null,
  hasPreviousPage: cursorHistory.length > 0,
  state: { pagination: { pageIndex, pageSize: 25 } },
});
```

Without an explicit `hasPreviousPage`, previous-page availability follows a positive
page index. Products retain opaque cursors, cursor history, query resets, and the
mapping from a page index to a backend cursor. These are not added to grid state.
`getRowCount()` still describes loaded rows when no exact `rowCount` is provided;
it must not be interpreted as the remote total. Renderers keep `aria-rowcount="-1"`,
disable last-page controls, and display `Page N` instead of inventing a total.
Customize this text with the optional `localization.pageStatusUnknown(page)`.
Built-in pagination buttons are disabled while `loading` is true.

## Ordered server mutations

Use `createServerMutationCoordinator` for opt-in product-owned writes. It serializes
work with the same key and permits independent keys to run concurrently. It does
not abort an earlier write when a new one arrives. Choose the key to match the
server's concurrency boundary: use a cell key for cell revisions or a row key when
all fields share one row revision.

```ts
import { createServerMutationCoordinator } from "@open-grid/core";

interface EditInput {
  rowId: string;
  value: string;
  expectedRevision: number;
}
interface SavedRow { rowId: string; value: string; revision: number; }

const edits = createServerMutationCoordinator<string, EditInput, SavedRow>({
  getKey: (input) => input.rowId,
  mutate: async (input, context) => {
    const response = await fetch(`/api/rows/${input.rowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        value: input.value,
        operationId: context.operationId,
        expectedRevision: context.previousData?.revision ?? input.expectedRevision,
      }),
    });
    if (!response.ok) throw new Error(`Save failed: ${response.status}`);
    return response.json() as Promise<SavedRow>;
  },
});

const input = { rowId: "ticket-1", value: "New account", expectedRevision: 0 };
const result = await edits.run(input);
if (result.status === "success" && edits.isCurrent(input.rowId, result.mutationId)) {
  // Product code applies the authoritative row. Also guard any editor/focus cleanup
  // against a newer draft, a different editor, navigation, and unmount.
  applySavedRow(result.data);
}
```

`ServerMutationResult.isCurrent` describes the intent at settlement. Call
`isCurrent(key, mutationId)` immediately before applying UI effects because a newer
intent can arrive between settlement and the caller's continuation. Earlier writes
can have succeeded on the server even when their result is no longer current.

`getState(key)` returns an immutable snapshot with `idle`, `queued`, `saving`,
`success`, `error`, `validation-error`, or `conflict` status, the latest input,
acknowledged data, and a pending count. `subscribe` reports keyed state changes;
`getStates()` returns a copy of the current state map. Supply `classifyError` to
distinguish transport, validation, and conflict errors. A subscriber exception does
not strand writes; use `onListenerError` to report it, otherwise it is rethrown in
a microtask.

`runAll(inputs)` returns per-operation results, not an atomic transaction.
`retry(key)` retries only the latest failed intent for a settled key, with the same
operation ID and a new mutation ID. `retryFailed()` retries failed keys without
repeating successful keys. Corrected values are new intents, with new operation IDs.
Conflict recovery normally needs an explicit product reload or merge decision
before another write; it is not an automatic overwrite policy.

The transport/server must enforce revisions and idempotency. An operation ID alone
does not provide either guarantee, and a failed response does not prove a write was
not applied. The default IDs use `crypto.randomUUID()`; provide `createOperationId`
when the host supplies its own unique IDs.

Call `reset(key)` to release settled state and retry input, or `reset(key, data)` to
replace the acknowledged baseline after a product-owned reload. Busy keys return
`false` without being reset. Clear settled keys when their product scope no longer
needs them. `dispose()` drops queued writes and fences UI effects from active work;
it does not cancel or roll back a write that has already reached the server.

## Maintained HTTP examples

The React, Vue, and Svelte flat server examples use real local HTTP routes for
list reads, Account/calendar edits, and query-scoped bulk actions. The routes are mounted in both Vite development and
preview servers. They use per-browser in-memory sessions, expected revisions, and
operation IDs; production persistence and authentication remain product work.

Run `pnpm dev:server`, `pnpm dev:vue-server`, or `pnpm dev:svelte-server`. The examples
provide:

- Remote sorting/filtering/pagination through the existing read coordinator.
- Product-owned selection that survives page/sort changes and resets when filters
  change the matching universe; core's default selection policy is unchanged.
- Typed number/calendar/set filters and custom account-autocomplete/calendar editors.
- Retained rows and their committed page label after a failed refresh, plus retry.
- A hide-total control that exercises the unknown-count pagination contract.
- Editable accounts with explicit pending/saved/failed cell counts and recoverable
  validation, transient-failure, and revision-conflict scenarios.
- Multi-row paste with independent results and retry of failed cells only. The
  product's asynchronous save summary is separate from core's synchronous paste
  acceptance/skipped counts.
- Buffered and streaming exports of the current server query, including accepted
  edits. A newer acknowledged row cannot be overwritten by an older read response.
- Query-wide selection with excluded IDs, execution-time server matching, a real
  resolve action, and retry of the same operation after a response is lost.

The reference client keeps a newer unsaved draft or a different active editor open
when a save finishes. Explicit discard/reload is disabled while writes are pending.
Local grid undo/redo retains its existing contract; server-approved writes are not
silently added to local history. A server-side undo operation needs its own product
revision and authorization policy.

See `examples/shared-server/src/ticket-client.ts`, `ticket-api-server.ts`, and
`cell-edit-client.ts` for the framework-neutral product wiring. Use
`pnpm e2e:server-data` for the HTTP examples' browser regression suite.

## Query-scoped remote selection (0.4 development)

`createServerSelection<TQuery>` owns a separate selection descriptor. Existing grid
selection and loaded selected-row models keep their current behavior.

```ts
import { createServerSelection } from "@open-grid/core";

const selected = createServerSelection({
  query: { status: "Open" },
  getQueryKey: (query) => JSON.stringify(query),
});
selected.selectAllMatching();
selected.setRowSelected("ticket-3", false);
const requestSelection = selected.getState();
// { mode: "all-matching", queryKey, query: { status: "Open" }, excludedIds: ["ticket-3"] }
```

The descriptor is either `explicit` with `ids`, or `all-matching` with
`excludedIds`. Both carry a captured query and its identity; selecting all matches
does not enumerate or download remote IDs. `getState()` returns a frozen snapshot
with a recursively frozen JSON query, suitable for a later request. Queries must
contain finite JSON values; functions, cycles, dates, and other object types are
rejected. Convert product-specific values into an explicit transport representation.

`setQuery(query)` preserves selection when `getQueryKey` is unchanged and clears it
when the matching universe changes. Define the key from matching conditions, with
canonical ordering/normalization where equivalent queries should share selection;
exclude page index and sort order. The helper validates non-empty keys, while the
product is responsible for making them identify the actual matching universe.

`getGridState(loadedIds)` projects selection onto visible/loaded IDs without setting
core `allRowsSelected`. Feed that projection into controlled grid state and call
`setGridState(loadedIds, nextGridState)` for row/page checkbox changes. That setter
updates loaded IDs only and does not infer all remote matches from a grid checkbox.
Use a dedicated select-all-matching action and `clear()` for the whole remote scope.
`subscribe`/unsubscribe and `dispose()` support product lifecycle cleanup.

Controlled integrations must distinguish a checkbox update from a focus/range
notification carrying an older projection before the framework has applied new
props. The maintained client tracks projection identities so those notifications
cannot undo a newer exclusion; WebKit coverage exercises the different event order.
It also gates selection against the successfully committed query while retaining old
rows during a new request or failure.

The server must validate the descriptor/query/allowed IDs, apply authorization,
re-evaluate eligibility, and enforce idempotency for the bulk operation. A query key
is an identity, not an authorization token. The demo resolves live matches at
execution time, intersects explicit IDs with those matches, honors exclusions, and
returns matched/changed counts without returning the complete result set. It is not
a point-in-time snapshot of remote records.

A retry uses the captured descriptor and operation ID. A completion for an older
query cannot clear the new query's selection or restore its old page. Backend writes
may already have happened even when the response was lost; navigation does not roll
them back. Applications requiring snapshot selection or atomic transactions must
supply those server contracts.

## Upgrading from 0.3

Existing grid options, exact-count pagination, synchronous `onCellEdit`, clipboard
results, and preference storage continue to work. The new pagination behavior is
opt-in: only manual pagination with an explicit `hasNextPage` and no exact count
returns the `-1` page-count sentinel. Consumers rendering their own pagination
controls must handle that sentinel when adopting the new mode.

The mutation coordinator is an additional export. Products can keep their existing
save implementation or adopt it incrementally; it does not mutate grid rows,
introduce a network client, add server writes to undo history, or change how a
product authenticates requests. Keep pending writes and drafts separate from a
local clipboard operation's synchronous acceptance summary.

Custom editors, typed filter values/metadata, and server selection are opt-in
additions. See [custom rendering](custom-rendering) and [typed filters](filters).
