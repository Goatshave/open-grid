import { createColumnHelper } from "@open-grid/core";
import { createDataGrid } from "@open-grid/vue-ui";
import { h } from "vue";

interface CompatibilityRow {
  id: string;
  name: string;
}

const column = createColumnHelper<CompatibilityRow>();
const DataGrid = createDataGrid<CompatibilityRow>();

export const vue34Grid = h(DataGrid, {
  ariaLabel: "Vue 3.4 compatibility grid",
  localization: { noRows: "No compatible rows" },
  options: {
    columns: [column.accessor("name", { header: "Name" })],
    data: [{ id: "1", name: "Compatibility" }],
    getRowId: (row: CompatibilityRow) => row.id,
  },
});
