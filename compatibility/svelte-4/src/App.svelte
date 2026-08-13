<script lang="ts">
  import { createColumnHelper, type GridOptions } from "@open-grid/core";
  import DataGrid from "@open-grid/svelte-ui/DataGrid.svelte";

  interface CompatibilityRow {
    id: string;
    name: string;
  }

  const column = createColumnHelper<CompatibilityRow>();
  const options: GridOptions<CompatibilityRow> = {
    columns: [column.accessor("name", { header: "Name" })],
    data: [{ id: "1", name: "Compatibility" }],
    getRowId: (row) => row.id,
  };
</script>

<DataGrid ariaLabel="Svelte 4 compatibility grid" localization={{ noRows: "No compatible rows" }} {options} />
