import { createColumnHelper } from "@open-grid/core";
import { DataGrid } from "@open-grid/react-ui";

interface CompatibilityRow {
  id: string;
  name: string;
}

const column = createColumnHelper<CompatibilityRow>();

export const react18Grid = (
  <DataGrid
    ariaLabel="React 18 compatibility grid"
    columns={[column.accessor("name", { header: "Name" })]}
    data={[{ id: "1", name: "Compatibility" }]}
    getRowId={(row) => row.id}
  />
);
