# @open-grid/vue

Vue adapter for Open Grid.

Use this package when you want Vue bindings for the framework-agnostic core without the optional styled UI.

## Install

```bash
npm install @open-grid/vue vue
```

## Usage

```ts
import { computed } from "vue";
import { createColumnHelper, useGrid, useGridSelector } from "@open-grid/vue";

const column = createColumnHelper<{ id: string; name: string }>();
const options = computed(() => ({
  data: [{ id: "1", name: "Mina" }],
  columns: [column.accessor("name", { header: "Name" })],
  getRowId: (row: { id: string }) => row.id,
}));
const { grid, state, dispose } = useGrid(options);
const { selected: selectedRowCount } = useGridSelector(
  grid,
  (currentGrid) => Object.keys(currentGrid.getState().rowSelection).length,
);
```

`state` is a shallow ref updated by core subscriptions; `dispose` is called automatically inside a Vue effect scope. Use [`@open-grid/vue-ui`](https://www.npmjs.com/package/@open-grid/vue-ui) for the maintained styled grid.

`useGridSelector` returns a shallow `selected` ref and updates it only when the
selected value changes. Its subscription is also disposed with the active Vue
effect scope, or can be disposed manually through the returned `dispose` function.
