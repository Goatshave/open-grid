<script lang="ts">
  import type { CellContext } from "@open-grid/core";

  export let context: CellContext<unknown, unknown>;
</script>

<strong data-row-id={context.row.id}>{String(context.value)}</strong>
