# Persisted preferences

Grid preferences are product-owned. Open Grid provides a narrow, versioned JSON
contract for column visibility, sizing, order, pinning, and density while excluding
transient sorting, filters, pagination, selection, focus, and edit state.

## Read and write safely

```ts
import {
  getBrowserGridPreferencesStorage,
  readGridPreferences,
  writeGridPreferences,
} from "@open-grid/react-ui";

const storage = getBrowserGridPreferencesStorage();
const columnIds = ["invoice", "customer", "status", "amount"];
const saved = readGridPreferences(storage, "invoice-grid", {
  validColumnIds: columnIds,
});

writeGridPreferences(storage, "invoice-grid", grid.getState(), density, {
  validColumnIds: columnIds,
});
```

Use the equivalent re-exports from Vue UI, Svelte UI, or primitives. Storage access
failures return `null` or `false`; unknown columns and malformed values are removed
during normalization.

## Migrate an older product schema

Register every required forward step when reading an older payload:

```ts
import type { GridPreferencesMigration } from "@open-grid/react-ui";

const migrations: readonly GridPreferencesMigration[] = [{
  fromVersion: 0,
  toVersion: 1,
  migrate: (legacy) => ({
    version: 1,
    density: legacy.compact === true ? "compact" : "standard",
    state: {
      columnVisibility: legacy.hiddenCustomer === true ? { customer: false } : {},
      columnSizing: {},
      columnOrder: [],
      columnPinning: { left: [], right: [] },
    },
  }),
}];

const saved = readGridPreferences(storage, "invoice-grid", {
  validColumnIds: columnIds,
  migrations,
});
```

Migrations are explicit, sequential, and forward-only. A missing step, duplicate
`fromVersion`, invalid target version, malformed result, future schema, or thrown
error rejects the payload safely. A migration must return an object whose `version`
equals its declared `toVersion`.

`migrateGridPreferences(value, migrations)` is available when the product needs to
inspect a parsed object before normal Open Grid normalization. Prefer
`parseGridPreferences` or `readGridPreferences` for ordinary use.

## Upgrade policy

Keep the storage key stable when old values should migrate. Change the key when the
old preference meaning is incompatible and should reset. Always pass the current
leaf-column allowlist, and retain migration steps while supported old application
versions may still have written their payloads.
