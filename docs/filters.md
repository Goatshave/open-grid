# Typed column filters

The following contracts are part of 0.4 development; published 0.3 packages retain
their existing text/custom-filter APIs.

`columnFilters` keeps its existing `{ id, value }` shape. Text values remain
case-insensitive substring searches. A `value` can also be a serializable condition:

```ts
import type { TypedColumnFilterValue } from "@open-grid/core";

const amount: TypedColumnFilterValue = { type: "number-range", min: 100, max: 500 };
const opened: TypedColumnFilterValue = { type: "date-range", from: "2026-10-01", to: "2026-10-24" };
const status: TypedColumnFilterValue = { type: "set", values: ["Open", "Waiting"] };
grid.setColumnFilters([
  { id: "amount", value: amount },
  { id: "openedAt", value: opened },
  { id: "status", value: status },
]);
```

Conditions on different columns combine with AND. A set combines its values with
OR using exact primitive equality: `1`, `"1"`, and `true` are distinct. `null`
matches nullish cells. An empty set or a range without bounds matches every value.
Numeric ranges include both endpoints and match finite numbers without coercing
empty strings or null to zero. Calendar ranges include both endpoints, accept
valid ISO `YYYY-MM-DD` cells, and interpret `Date` cells by their UTC calendar day.
Use a custom `filterFn` for timestamps with product-specific timezone semantics.

`isTypedColumnFilterValue` validates conditions, including reversed ranges,
non-finite numbers, invalid calendar days, unsupported keys, and non-primitive set
members. Malformed recognized typed conditions match no cells in the default
pipeline. A column's existing `filterFn` takes precedence over built-in matching.

## Built-in controls

Set column metadata and enable `columnFilterControls` on the maintained renderer:

```ts
const columns = [
  { accessorKey: "amount", filterType: "number-range" },
  { accessorKey: "openedAt", filterType: "date-range" },
  { accessorKey: "status", filterType: "set", filterOptions: [
    { value: "Open", label: "Open" }, { value: "Waiting", label: "Waiting" },
  ] },
];
```

React, Vue, and Svelte render numeric/calendar endpoints, a native multiple-select,
and a clear action for typed columns. Columns without `filterType` keep text search.
Controls reset pagination to the first page. Invalid intermediate ranges remain
visible with `aria-invalid`; clearing endpoints or the clear action removes the
condition. A remote product can reject invalid conditions while retaining the last
successfully loaded page, as the HTTP examples demonstrate.

`filterColumnLabel`, `filterRangeStartLabel`, `filterRangeEndLabel`,
`clearColumnFilterLabel`, `clear`, and per-option labels provide localization.
The new label callbacks are optional for existing complete localization objects.
Custom renderers can reuse `getColumnFilterControls` and
`getNextColumnFilterControlValue` from `@open-grid/primitives`.

## Server matching

Send conditions as JSON alongside sorting and pagination. Validate column IDs,
allowed operators/types, and values on the server. `createColumnFilterMatcher`
compiles the same text/typed condition into a predicate for a product-owned server
adapter; the maintained local HTTP examples use it for client/server parity.
SQL-backed products must translate validated conditions into bound parameters under
their own authorization and query limits. The library does not generate SQL.

See [server data](server-data) for query-scoped selection and remote recovery, and
[custom rendering](custom-rendering) for editors that work with typed values.
