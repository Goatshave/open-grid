import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import "./styles.css";
import {
  createColumnHelper,
  DataGrid,
  type AnyColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GridState,
  type GroupingState,
  type PaginationState,
  type SortingState,
} from "@open-grid/react-ui";
import {
  areServerGroupingStatesEqual,
  createServerGroupingTickets,
  formatServerGrouping,
  formatServerGroupingExpanded,
  queryServerGroupingTickets,
  type ServerGroupingRow,
} from "@open-grid/example-shared-server";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const column = createColumnHelper<ServerGroupingRow>();
const allTickets = createServerGroupingTickets("TCK");

const columns: AnyColumnDef<ServerGroupingRow>[] = [
  column.accessor("id", {
    header: "Ticket / group",
    size: 190,
    cell: ({ row, value }) => (row.original?.rowType === "group" ? row.original.groupLabel : value),
  }),
  column.accessor("account", { header: "Account", size: 190 }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("status", { header: "Status", size: 120 }),
  column.accessor("priority", { header: "Priority", size: 110 }),
  column.accessor("childCount", {
    header: "Rows",
    size: 92,
    cell: ({ value }) => (typeof value === "number" ? value.toLocaleString() : ""),
  }),
  column.accessor("value", {
    header: "Value",
    size: 130,
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
  column.accessor("openedAt", { header: "Opened", size: 130 }),
];

function App() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 8 });
  const serverResult = useMemo(
    () => queryServerGroupingTickets(allTickets, { sorting, columnFilters, grouping, expanded, pagination }),
    [columnFilters, expanded, grouping, pagination, sorting],
  );
  const accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  const serverPageIndex = serverResult.pageIndex;

  const handleStateChange = (state: GridState) => {
    const groupingChanged = !areServerGroupingStatesEqual(state.grouping, grouping);

    setSorting(state.sorting);
    setColumnFilters(state.columnFilters);
    setGrouping(state.grouping);
    setExpanded(groupingChanged ? {} : state.expanded);
    setPagination(groupingChanged ? { ...state.pagination, pageIndex: 0 } : state.pagination);
  };

  const setAccountFilter = (value: string) => {
    setColumnFilters(value ? [{ id: "account", value }] : []);
    setExpanded({});
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  };

  const setServerGrouping = (nextGrouping: GroupingState) => {
    setGrouping(nextGrouping);
    setExpanded({});
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  };

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="Server grouping controls">
        <div>
          <h1>Server-grouped tickets</h1>
          <p>
            {serverResult.totalLeafRows} matching leaf rows · {serverResult.totalTopLevelRows} server rows · page {serverPageIndex + 1} of{" "}
            {serverResult.pageCount}
          </p>
        </div>
        <div className="toolbar-actions">
          <label className="filter-control">
            Account
            <input value={accountFilter} onChange={(event) => setAccountFilter(event.currentTarget.value)} placeholder="Filter account" />
          </label>
          <button type="button" onClick={() => setServerGrouping(grouping[0] === "status" ? [] : ["status"])}>
            {grouping[0] === "status" ? "Clear grouping" : "Group status"}
          </button>
          <button type="button" onClick={() => setServerGrouping(["status", "owner"])}>
            Group status then owner
          </button>
        </div>
      </section>

      <div className="server-state" aria-label="Server query state">
        <span data-testid="query-grouping">Grouping: {formatServerGrouping(grouping)}</span>
        <span data-testid="query-expanded">Expanded: {formatServerGroupingExpanded(expanded)}</span>
        <span data-testid="query-sorting">Sorting: {sorting.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}</span>
        <span data-testid="query-page">Page: {serverPageIndex + 1}</span>
      </div>

      <DataGrid
        data={serverResult.rows}
        columns={columns}
        getRowId={(row) => row.id}
        getSubRows={(row) => row.children}
        getRowCanExpand={(row) => row.rowType === "group"}
        state={{
          sorting,
          columnFilters,
          grouping,
          expanded,
          pagination,
        }}
        onStateChange={handleStateChange}
        manualSorting
        manualFiltering
        manualGrouping
        manualPagination
        pageCount={serverResult.pageCount}
        groupingPanel
        initialState={{
          columnPinning: { left: ["id"], right: ["value"] },
        }}
      />

      <nav className="pagination" aria-label="Server grouping pagination">
        <button type="button" disabled={serverPageIndex === 0} onClick={() => setPagination((previous) => ({ ...previous, pageIndex: 0 }))}>
          First
        </button>
        <button
          type="button"
          disabled={serverPageIndex === 0}
          onClick={() => setPagination((previous) => ({ ...previous, pageIndex: Math.max(0, serverPageIndex - 1) }))}
        >
          Previous
        </button>
        <span>
          Page {serverPageIndex + 1} / {serverResult.pageCount}
        </span>
        <button
          type="button"
          disabled={serverPageIndex >= serverResult.pageCount - 1}
          onClick={() =>
            setPagination((previous) => ({
              ...previous,
              pageIndex: Math.min(serverResult.pageCount - 1, serverPageIndex + 1),
            }))
          }
        >
          Next
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
