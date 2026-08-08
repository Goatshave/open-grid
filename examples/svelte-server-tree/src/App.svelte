<script lang="ts">
  import type { GridState, RowSelectionState } from "@open-grid/core";
  import {
    createServerTreePortfolios,
    createServerTreeWorkByPortfolio,
    formatServerTreeCancelled,
    formatServerTreeErrors,
    formatServerTreeExpanded,
    formatServerTreeLoading,
    formatServerTreeMerges,
    formatServerTreeMutating,
    formatServerTreeMutationErrors,
    formatServerTreeMutations,
    formatServerTreeRefreshes,
    queryServerTreeRows,
    serverTreeWorkToRow,
    type ServerTreeResult,
    type ServerTreeRow,
  } from "@open-grid/example-shared-server";
  import {
    createColumnHelper,
    DataGrid,
    type AnyColumnDef,
    type ExpandedState,
    type GridOptions,
    type PaginationState,
    type SortingState,
  } from "@open-grid/svelte-ui";
  import { onDestroy } from "svelte";

  interface InFlightLoad {
    controller: AbortController;
    requestId: number;
  }

  const column = createColumnHelper<ServerTreeRow>();
  const portfolios = createServerTreePortfolios();
  const workByPortfolio = createServerTreeWorkByPortfolio(portfolios);

  const columns: AnyColumnDef<ServerTreeRow>[] = [
    column.accessor("name", {
      header: "Portfolio / work",
      size: 260,
      cell: ({ row, value }) =>
        row.original?.rowType === "loading" ? "Loading child rows..." : row.original?.rowType === "error" ? "Failed to load child rows" : value,
    }),
    column.accessor("owner", { header: "Owner", size: 120 }),
    column.accessor("region", { header: "Region", size: 140 }),
    column.accessor("status", { header: "Status", size: 120 }),
    column.accessor("childCount", {
      header: "Children",
      size: 110,
      cell: ({ value }) => (typeof value === "number" ? value.toLocaleString() : ""),
    }),
    column.accessor("budget", {
      header: "Budget",
      size: 140,
      cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
    }),
  ];

  const failOnceByPortfolio = new Set(["PFL-002"]);
  const inFlightLoads = new Map<string, InFlightLoad>();
  let requestSequence = 0;
  let sorting: SortingState = [];
  let expanded: ExpandedState = {};
  let pagination: PaginationState = { pageIndex: 0, pageSize: 6 };
  let rowSelection: RowSelectionState = {};
  let loadedChildren: Record<string, ServerTreeRow[]> = {};
  let loading: Record<string, boolean> = {};
  let loadErrors: Record<string, string> = {};
  let cancelledLoads: Record<string, string> = {};
  let refreshCounts: Record<string, number> = {};
  let mutatingWork: Record<string, boolean> = {};
  let workMutationCounts: Record<string, number> = {};
  let workMutationErrors: Record<string, string> = {};
  let branchMergeCounts: Record<string, number> = {};
  let workMergeCounts: Record<string, number> = {};
  let branchMergeConflicts: Record<string, string> = {};
  const mutationTargetPortfolioId = "PFL-001";
  const mutationTargetWorkId = "PFL-001-WRK-1";
  const optimisticMutationTargetWorkId = "PFL-001-WRK-2";
  const conflictMutationTargetWorkId = "PFL-001-WRK-3";
  const mergeTargetWorkId = "PFL-001-WRK-4";

  $: syncServerLoads(expanded, loadedChildren, loadErrors, refreshCounts, workMergeCounts);
  $: serverResult = queryServerTreeRows(portfolios, { sorting, expanded, pagination }, loadedChildren, loading, loadErrors);
  $: serverPageIndex = serverResult.pageIndex;
  $: gridOptions = createGridOptions(serverResult);

  onDestroy(() => {
    for (const load of inFlightLoads.values()) {
      load.controller.abort();
    }
    inFlightLoads.clear();
  });

  function createGridOptions(result: ServerTreeResult): GridOptions<ServerTreeRow> {
    return {
      data: result.rows,
      columns,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      getRowCanExpand: (row) => row.rowType === "portfolio",
      state: {
        sorting,
        expanded,
        pagination,
        rowSelection,
      },
      onStateChange: handleStateChange,
      manualSorting: true,
      manualPagination: true,
      pageCount: result.pageCount,
      rowSelectionMode: "descendants",
      initialState: {
        columnPinning: { left: ["name"], right: ["budget"] },
      },
    };
  }

  function loadChildrenFromServer(
    portfolioId: string,
    signal: AbortSignal,
    refreshVersion = 0,
    workMutationCountsState: Record<string, number> = {},
    workMergeCountsState: Record<string, number> = {},
  ): Promise<ServerTreeRow[]> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(createAbortError());
        return;
      }

      const timeoutId = window.setTimeout(() => {
        signal.removeEventListener("abort", abortLoad);

        if (signal.aborted) {
          reject(createAbortError());
          return;
        }

        if (failOnceByPortfolio.delete(portfolioId)) {
          reject(new Error("Temporary server error"));
          return;
        }

        resolve(
          (workByPortfolio[portfolioId] ?? []).map((work) =>
            serverTreeWorkToRow(work, refreshVersion, workMutationCountsState[work.id] ?? 0, workMergeCountsState[work.id] ?? 0),
          ),
        );
      }, 180);

      function abortLoad() {
        window.clearTimeout(timeoutId);
        reject(createAbortError());
      }

      signal.addEventListener("abort", abortLoad, { once: true });
    });
  }

  function createAbortError(): Error {
    const error = new Error("Request aborted");
    error.name = "AbortError";
    return error;
  }

  function syncServerLoads(
    expandedState: ExpandedState,
    loadedChildrenState: Record<string, ServerTreeRow[]>,
    loadErrorsState: Record<string, string>,
    refreshCountsState: Record<string, number>,
    workMergeCountsState: Record<string, number>,
  ) {
    const expandedIds = new Set(Object.entries(expandedState).flatMap(([id, value]) => (value ? [id] : [])));

    for (const id of inFlightLoads.keys()) {
      if (!expandedIds.has(id)) {
        cancelChildrenLoad(id, "collapsed before response");
      }
    }

    const loadableIds = Object.entries(expandedState)
      .filter(([id, value]) => value && !loadedChildrenState[id] && !loadErrorsState[id] && !inFlightLoads.has(id))
      .map(([id]) => id);

    for (const id of loadableIds) {
      startChildrenLoad(id, refreshCountsState[id] ?? 0, workMergeCountsState);
    }
  }

  function startChildrenLoad(portfolioId: string, refreshVersion = 0, workMergeCountsState: Record<string, number> = workMergeCounts) {
    const requestId = requestSequence + 1;
    const controller = new AbortController();
    requestSequence = requestId;
    inFlightLoads.set(portfolioId, { controller, requestId });
    loading = { ...loading, [portfolioId]: true };
    const nextCancelled = { ...cancelledLoads };
    delete nextCancelled[portfolioId];
    cancelledLoads = nextCancelled;

    void loadChildrenFromServer(portfolioId, controller.signal, refreshVersion, { ...workMutationCounts }, { ...workMergeCountsState })
      .then((children) => {
        if (!isCurrentRequest(portfolioId, requestId) || controller.signal.aborted) {
          return;
        }

        loadedChildren = { ...loadedChildren, [portfolioId]: children };
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest(portfolioId, requestId) || controller.signal.aborted) {
          return;
        }

        loadErrors = {
          ...loadErrors,
          [portfolioId]: error instanceof Error ? error.message : "Unknown server error",
        };
      })
      .finally(() => {
        if (!isCurrentRequest(portfolioId, requestId)) {
          return;
        }

        const nextLoading = { ...loading };
        delete nextLoading[portfolioId];
        loading = nextLoading;
        inFlightLoads.delete(portfolioId);
      });
  }

  function isCurrentRequest(portfolioId: string, requestId: number): boolean {
    return inFlightLoads.get(portfolioId)?.requestId === requestId;
  }

  function cancelChildrenLoad(portfolioId: string, reason: string): boolean {
    const load = inFlightLoads.get(portfolioId);

    if (!load) {
      return false;
    }

    load.controller.abort();
    inFlightLoads.delete(portfolioId);
    const nextLoading = { ...loading };
    delete nextLoading[portfolioId];
    loading = nextLoading;
    cancelledLoads = { ...cancelledLoads, [portfolioId]: reason };
    return true;
  }

  function retryChildren(portfolioId: string) {
    cancelChildrenLoad(portfolioId, "retry replaced request");
    const nextLoaded = { ...loadedChildren };
    delete nextLoaded[portfolioId];
    loadedChildren = nextLoaded;
    const nextErrors = { ...loadErrors };
    delete nextErrors[portfolioId];
    loadErrors = nextErrors;
    const nextCancelled = { ...cancelledLoads };
    delete nextCancelled[portfolioId];
    cancelledLoads = nextCancelled;
  }

  function refreshChildren(portfolioId: string) {
    cancelChildrenLoad(portfolioId, "refresh replaced request");
    expanded = { ...expanded, [portfolioId]: true };
    const nextLoaded = { ...loadedChildren };
    delete nextLoaded[portfolioId];
    loadedChildren = nextLoaded;
    const nextErrors = { ...loadErrors };
    delete nextErrors[portfolioId];
    loadErrors = nextErrors;
    const nextCancelled = { ...cancelledLoads };
    delete nextCancelled[portfolioId];
    cancelledLoads = nextCancelled;
    refreshCounts = { ...refreshCounts, [portfolioId]: (refreshCounts[portfolioId] ?? 0) + 1 };
  }

  function getRefreshableLoadedIds(loadedChildrenState: Record<string, ServerTreeRow[]>, loadingState: Record<string, boolean>): string[] {
    return Object.keys(loadedChildrenState).filter((id) => !loadingState[id]);
  }

  function refreshLoadedChildren() {
    const portfolioIds = getRefreshableLoadedIds(loadedChildren, loading);

    if (portfolioIds.length === 0) {
      return;
    }

    for (const id of portfolioIds) {
      cancelChildrenLoad(id, "bulk refresh replaced request");
    }

    expanded = portfolioIds.reduce<ExpandedState>((next, id) => ({ ...next, [id]: true }), { ...expanded });
    const nextLoaded = { ...loadedChildren };
    for (const id of portfolioIds) {
      delete nextLoaded[id];
    }
    loadedChildren = nextLoaded;
    const nextErrors = { ...loadErrors };
    for (const id of portfolioIds) {
      delete nextErrors[id];
    }
    loadErrors = nextErrors;
    const nextCancelled = { ...cancelledLoads };
    for (const id of portfolioIds) {
      delete nextCancelled[id];
    }
    cancelledLoads = nextCancelled;
    refreshCounts = portfolioIds.reduce<Record<string, number>>((next, id) => ({ ...next, [id]: (next[id] ?? 0) + 1 }), { ...refreshCounts });
  }

  function commitWorkMutation(portfolioId: string, workId: string) {
    if (!loadedChildren[portfolioId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    mutatingWork = { ...mutatingWork, [workId]: true };
    const nextMutationErrors = { ...workMutationErrors };
    delete nextMutationErrors[workId];
    workMutationErrors = nextMutationErrors;
    void commitWorkMutationToServer()
      .then(() => {
        const work = (workByPortfolio[portfolioId] ?? []).find((candidate) => candidate.id === workId);
        const mutationVersion = (workMutationCounts[workId] ?? 0) + 1;
        const refreshVersion = refreshCounts[portfolioId] ?? 0;
        workMutationCounts = { ...workMutationCounts, [workId]: Math.max(workMutationCounts[workId] ?? 0, mutationVersion) };

        if (!work || !loadedChildren[portfolioId]) {
          return;
        }

        loadedChildren = {
          ...loadedChildren,
          [portfolioId]: loadedChildren[portfolioId].map((child) =>
            child.id === workId ? serverTreeWorkToRow(work, refreshVersion, mutationVersion, workMergeCounts[workId] ?? 0) : child,
          ),
        };
      })
      .finally(() => {
        const next = { ...mutatingWork };
        delete next[workId];
        mutatingWork = next;
      });
  }

  function commitOptimisticWorkMutation(portfolioId: string, workId: string) {
    const previousChildren = loadedChildren[portfolioId];
    const previousChild = previousChildren?.find((child) => child.id === workId);

    if (!previousChildren || !previousChild || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    mutatingWork = { ...mutatingWork, [workId]: true };
    const nextMutationErrors = { ...workMutationErrors };
    delete nextMutationErrors[workId];
    workMutationErrors = nextMutationErrors;
    loadedChildren = {
      ...loadedChildren,
      [portfolioId]: previousChildren.map((child) => (child.id === workId ? { ...child, name: `${child.name} (optimistic)`, status: "Blocked" } : child)),
    };

    void rejectOptimisticMutationFromServer()
      .catch((error: unknown) => {
        const children = loadedChildren[portfolioId];

        if (children) {
          loadedChildren = {
            ...loadedChildren,
            [portfolioId]: children.map((child) => (child.id === workId ? previousChild : child)),
          };
        }

        workMutationErrors = {
          ...workMutationErrors,
          [workId]: error instanceof Error ? error.message : "Unknown mutation error",
        };
      })
      .finally(() => {
        const next = { ...mutatingWork };
        delete next[workId];
        mutatingWork = next;
      });
  }

  function commitConflictingWorkMutation(portfolioId: string, workId: string) {
    if (!loadedChildren[portfolioId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    const expectedBranchVersion = refreshCounts[portfolioId] ?? 0;
    mutatingWork = { ...mutatingWork, [workId]: true };
    const nextMutationErrors = { ...workMutationErrors };
    delete nextMutationErrors[workId];
    workMutationErrors = nextMutationErrors;

    void rejectConflictingMutationFromServer(portfolioId, workId, expectedBranchVersion)
      .catch((error: unknown) => {
        workMutationErrors = {
          ...workMutationErrors,
          [workId]: error instanceof Error ? error.message : "Unknown mutation error",
        };
      })
      .finally(() => {
        const next = { ...mutatingWork };
        delete next[workId];
        mutatingWork = next;
      });
  }

  function recoverConflictedWorkMutation(portfolioId: string, workId: string) {
    if (!workMutationErrors[workId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    cancelChildrenLoad(portfolioId, "conflict recovery replaced request");
    expanded = { ...expanded, [portfolioId]: true };
    const nextLoaded = { ...loadedChildren };
    delete nextLoaded[portfolioId];
    loadedChildren = nextLoaded;
    const nextErrors = { ...loadErrors };
    delete nextErrors[portfolioId];
    loadErrors = nextErrors;
    const nextCancelled = { ...cancelledLoads };
    delete nextCancelled[portfolioId];
    cancelledLoads = nextCancelled;
    const nextMutationErrors = { ...workMutationErrors };
    delete nextMutationErrors[workId];
    workMutationErrors = nextMutationErrors;
    refreshCounts = { ...refreshCounts, [portfolioId]: (refreshCounts[portfolioId] ?? 0) + 1 };
  }

  function mergeServerBranchPatch(portfolioId: string) {
    const children = loadedChildren[portfolioId];

    if (!children || loading[portfolioId]) {
      return;
    }

    const mergeVersion = (branchMergeCounts[portfolioId] ?? 0) + 1;
    const refreshVersion = refreshCounts[portfolioId] ?? 0;
    const nextMergeConflicts: Record<string, string> = {};

    loadedChildren = {
      ...loadedChildren,
      [portfolioId]: children.map((child) => {
        const work = (workByPortfolio[portfolioId] ?? []).find((candidate) => candidate.id === child.id);

        if (!work) {
          return child;
        }

        if ((workMutationCounts[child.id] ?? 0) > 0) {
          nextMergeConflicts[child.id] = `kept local mutation over remote merge ${mergeVersion}`;
          return child;
        }

        if (child.id === mergeTargetWorkId) {
          return serverTreeWorkToRow(work, refreshVersion, 0, mergeVersion);
        }

        return child;
      }),
    };
    branchMergeCounts = { ...branchMergeCounts, [portfolioId]: mergeVersion };
    workMergeCounts = { ...workMergeCounts, [mergeTargetWorkId]: mergeVersion };
    branchMergeConflicts = nextMergeConflicts;
  }

  function commitWorkMutationToServer(): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 140);
    });
  }

  function rejectOptimisticMutationFromServer(): Promise<void> {
    return new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Server rejected optimistic mutation")), 140);
    });
  }

  function rejectConflictingMutationFromServer(portfolioId: string, workId: string, expectedBranchVersion: number): Promise<void> {
    return new Promise((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`Version conflict: ${portfolioId} changed after mutation snapshot ${expectedBranchVersion} for ${workId}`)),
        140,
      );
    });
  }

  function handleStateChange(state: GridState) {
    sorting = state.sorting;
    expanded = state.expanded;
    pagination = state.pagination;
    rowSelection = state.rowSelection;
  }

</script>

<main class="app-shell">
  <section class="toolbar" aria-label="Svelte server tree controls">
    <div>
      <h1>Svelte server lazy tree</h1>
      <p>{serverResult.totalTopLevelRows} server portfolios · page {serverPageIndex + 1} of {serverResult.pageCount}</p>
    </div>
    <div class="toolbar-actions">
      <button type="button" on:click={() => (expanded = { ...expanded, "PFL-001": !expanded["PFL-001"] })}>Toggle PFL-001</button>
      <button type="button" disabled={!loadedChildren["PFL-001"] || !!loading["PFL-001"]} on:click={() => refreshChildren("PFL-001")}>Refresh PFL-001</button>
      <button type="button" disabled={getRefreshableLoadedIds(loadedChildren, loading).length === 0} on:click={refreshLoadedChildren}>Refresh loaded branches</button>
      <button
        type="button"
        disabled={!loadedChildren[mutationTargetPortfolioId] || !!loading[mutationTargetPortfolioId] || !!mutatingWork[mutationTargetWorkId]}
        on:click={() => commitWorkMutation(mutationTargetPortfolioId, mutationTargetWorkId)}
      >
        Mutate PFL-001 work 1
      </button>
      <button
        type="button"
        disabled={!loadedChildren[mutationTargetPortfolioId] || !!loading[mutationTargetPortfolioId] || !!mutatingWork[optimisticMutationTargetWorkId]}
        on:click={() => commitOptimisticWorkMutation(mutationTargetPortfolioId, optimisticMutationTargetWorkId)}
      >
        Optimistic fail PFL-001 work 2
      </button>
      <button
        type="button"
        disabled={!loadedChildren[mutationTargetPortfolioId] || !!loading[mutationTargetPortfolioId] || !!mutatingWork[conflictMutationTargetWorkId]}
        on:click={() => commitConflictingWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId)}
      >
        Conflict PFL-001 work 3
      </button>
      <button
        type="button"
        disabled={!workMutationErrors[conflictMutationTargetWorkId] || !!loading[mutationTargetPortfolioId] || !!mutatingWork[conflictMutationTargetWorkId]}
        on:click={() => recoverConflictedWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId)}
      >
        Recover PFL-001 conflict
      </button>
      <button
        type="button"
        disabled={!loadedChildren[mutationTargetPortfolioId] || !!loading[mutationTargetPortfolioId]}
        on:click={() => mergeServerBranchPatch(mutationTargetPortfolioId)}
      >
        Merge PFL-001 server patch
      </button>
      <button type="button" on:click={() => (expanded = { ...expanded, "PFL-002": true })}>Expand PFL-002</button>
      <button type="button" disabled={!loadErrors["PFL-002"]} on:click={() => retryChildren("PFL-002")}>Retry PFL-002</button>
      <button type="button" on:click={() => (expanded = { ...expanded, "PFL-003": true })}>Expand PFL-003</button>
      <button type="button" on:click={() => (expanded = { ...expanded, "PFL-003": false })}>Collapse PFL-003</button>
    </div>
  </section>

  <div class="server-state" aria-label="Svelte server tree query state">
    <span data-testid="svelte-tree-expanded">Expanded: {formatServerTreeExpanded(expanded)}</span>
    <span data-testid="svelte-tree-loading">Loading: {formatServerTreeLoading(loading)}</span>
    <span data-testid="svelte-tree-errors">Errors: {formatServerTreeErrors(loadErrors)}</span>
    <span data-testid="svelte-tree-cancelled">Cancelled: {formatServerTreeCancelled(cancelledLoads)}</span>
    <span data-testid="svelte-tree-refreshes">Refreshes: {formatServerTreeRefreshes(refreshCounts)}</span>
    <span data-testid="svelte-tree-mutating">Mutating: {formatServerTreeMutating(mutatingWork)}</span>
    <span data-testid="svelte-tree-mutations">Mutations: {formatServerTreeMutations(workMutationCounts)}</span>
    <span data-testid="svelte-tree-mutation-errors">Mutation errors: {formatServerTreeMutationErrors(workMutationErrors)}</span>
    <span data-testid="svelte-tree-merges">Merges: {formatServerTreeMerges(branchMergeCounts)}</span>
    <span data-testid="svelte-tree-merge-conflicts">Merge conflicts: {formatServerTreeMutationErrors(branchMergeConflicts)}</span>
    <span data-testid="svelte-tree-loaded">Loaded: {Object.keys(loadedChildren).join(", ") || "none"}</span>
    <span data-testid="svelte-tree-selected">Selected: {Object.keys(rowSelection).join(", ") || "none"}</span>
    <span data-testid="svelte-tree-sorting">Sorting: {sorting.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}</span>
  </div>

  <DataGrid options={gridOptions} />

  <nav class="pagination" aria-label="Svelte server tree pagination">
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
