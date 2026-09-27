# Server data

Open Grid keeps transport and product data outside the grid instance. Use
`createServerRequestCoordinator` when several framework views need the same request
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

`subscribe(listener)` reports state changes with their key and returns an unsubscribe
function. Framework code can copy those snapshots into React state, Vue refs, or a
Svelte store without changing the request semantics.

Use `cancel(key, reason)` when a row collapses, `cancelAll(reason)` during a broader
navigation change, and `reset(key)` to discard both retained state and the saved retry
input. Call `dispose()` when the owning product scope is destroyed; it aborts active
work, clears retained inputs and states, removes listeners, and rejects later `run`
calls.

The coordinator owns request ordering and lifecycle state. Product code still owns
query construction, transport, authentication, cache policy, how results enter grid
`data`, and when a request should run.
