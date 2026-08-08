<script lang="ts">
  import type { GridState } from "@open-grid/core";
  import {
    createColumnHelper,
    DataGrid,
    type AnyColumnDef,
    type ColumnFiltersState,
    type ExpandedState,
    type GridOptions,
    type GroupingState,
    type PaginationState,
    type SortingState,
  } from "@open-grid/svelte-ui";
  import {
    areServerGroupingStatesEqual,
    createServerGroupingTickets,
    formatServerGrouping,
    formatServerGroupingExpanded,
    queryServerGroupingTickets,
    type ServerGroupingResult,
    type ServerGroupingRow,
  } from "@open-grid/example-shared-server";

  const column = createColumnHelper<ServerGroupingRow>();
  const allTickets = createServerGroupingTickets("SGR");

  const columns: AnyColumnDef<ServerGroupingRow>[] = [
    column.accessor("label", {
      header: "Ticket / group",
      size: 190,
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

  let sorting: SortingState = [];
  let columnFilters: ColumnFiltersState = [];
  let grouping: GroupingState = [];
  let expanded: ExpandedState = {};
  let pagination: PaginationState = { pageIndex: 0, pageSize: 8 };

  $: serverResult = queryServerGroupingTickets(allTickets, { sorting, columnFilters, grouping, expanded, pagination });
  $: accountFilter = String(columnFilters.find((filter) => filter.id === "account")?.value ?? "");
  $: serverPageIndex = serverResult.pageIndex;
  $: gridOptions = createGridOptions(serverResult);

  function createGridOptions(result: ServerGroupingResult): GridOptions<ServerGroupingRow> {
    return {
      data: result.rows,
      columns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      getRowCanExpand: (row) => row.rowType === "group",
      state: {
        sorting,
        columnFilters,
        grouping,
        expanded,
        pagination,
      },
      onStateChange: handleStateChange,
      manualSorting: true,
      manualFiltering: true,
      manualGrouping: true,
      manualPagination: true,
      pageCount: result.pageCount,
      initialState: {
        columnPinning: { left: ["label"], right: ["value"] },
      },
    };
  }

  function handleStateChange(state: GridState) {
    const groupingChanged = !areServerGroupingStatesEqual(state.grouping, grouping);

    sorting = state.sorting;
    columnFilters = state.columnFilters;
    grouping = state.grouping;
    expanded = groupingChanged ? {} : state.expanded;
    pagination = groupingChanged ? { ...state.pagination, pageIndex: 0 } : state.pagination;
  }

  function setAccountFilter(value: string) {
    columnFilters = value ? [{ id: "account", value }] : [];
    expanded = {};
    pagination = { ...pagination, pageIndex: 0 };
  }

  function setServerGrouping(nextGrouping: GroupingState) {
    grouping = nextGrouping;
    expanded = {};
    pagination = { ...pagination, pageIndex: 0 };
  }
</script>

<main class="app-shell">
  <section class="toolbar" aria-label="Svelte server grouping controls">
    <div>
      <h1>Svelte server-grouped tickets</h1>
      <p>{serverResult.totalLeafRows} matching leaf rows · {serverResult.totalTopLevelRows} server rows · page {serverPageIndex + 1} of {serverResult.pageCount}</p>
    </div>
    <div class="toolbar-actions">
      <label class="filter-control">
        Account
        <input value={accountFilter} placeholder="Filter account" on:input={(event) => setAccountFilter(event.currentTarget.value)} />
      </label>
      <button type="button" on:click={() => setServerGrouping(grouping[0] === "status" ? [] : ["status"])}>
        {grouping[0] === "status" ? "Clear grouping" : "Group status"}
      </button>
      <button type="button" on:click={() => setServerGrouping(["status", "owner"])}>Group status then owner</button>
      <button type="button" on:click={() => (expanded = { ...expanded, "group:status%3DBacklog": !expanded["group:status%3DBacklog"] })}>
        Toggle Backlog group
      </button>
      <button
        type="button"
        on:click={() =>
          (expanded = {
            ...expanded,
            "group:status%3DBacklog/owner%3DMina": !expanded["group:status%3DBacklog/owner%3DMina"],
          })}
      >
        Toggle Backlog Mina group
      </button>
    </div>
  </section>

  <div class="server-state" aria-label="Svelte server query state">
    <span data-testid="svelte-query-grouping">Grouping: {formatServerGrouping(grouping)}</span>
    <span data-testid="svelte-query-expanded">Expanded: {formatServerGroupingExpanded(expanded)}</span>
    <span data-testid="svelte-query-sorting">Sorting: {sorting.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}</span>
    <span data-testid="svelte-query-page">Page: {serverPageIndex + 1}</span>
  </div>

  <DataGrid options={gridOptions} groupingPanel={true} />

  <nav class="pagination" aria-label="Svelte server grouping pagination">
    <button type="button" disabled={serverPageIndex === 0} on:click={() => (pagination = { ...pagination, pageIndex: 0 })}>First</button>
    <button
      type="button"
      disabled={serverPageIndex === 0}
      on:click={() => (pagination = { ...pagination, pageIndex: Math.max(0, serverPageIndex - 1) })}
    >
      Previous
    </button>
    <span>Page {serverPageIndex + 1} / {serverResult.pageCount}</span>
    <button
      type="button"
      disabled={serverPageIndex >= serverResult.pageCount - 1}
      on:click={() => (pagination = { ...pagination, pageIndex: Math.min(serverResult.pageCount - 1, serverPageIndex + 1) })}
    >
      Next
    </button>
  </nav>
</main>
