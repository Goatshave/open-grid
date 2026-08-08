import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
import "./styles.css";
import {
  createColumnHelper,
  createDataGrid,
  type AnyColumnDef,
  type ExpandedState,
  type GridOptions,
  type GridState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@open-grid/vue-ui";
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
  type ServerTreeRow,
} from "@open-grid/example-shared-server";
import { computed, createApp, defineComponent, h, onBeforeUnmount, ref, watchEffect } from "vue";

interface InFlightLoad {
  controller: AbortController;
  requestId: number;
}

const column = createColumnHelper<ServerTreeRow>();
const ServerTreeGrid = createDataGrid<ServerTreeRow>();
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

const mutationTargetPortfolioId = "PFL-001";
const mutationTargetWorkId = "PFL-001-WRK-1";
const optimisticMutationTargetWorkId = "PFL-001-WRK-2";
const conflictMutationTargetWorkId = "PFL-001-WRK-3";
const mergeTargetWorkId = "PFL-001-WRK-4";

function loadChildrenFromServer(
  portfolioId: string,
  signal: AbortSignal,
  refreshVersion = 0,
  workMutationCounts: Record<string, number> = {},
  workMergeCounts: Record<string, number> = {},
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
          serverTreeWorkToRow(work, refreshVersion, workMutationCounts[work.id] ?? 0, workMergeCounts[work.id] ?? 0),
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

function createAbortError(): Error {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
}

const App = defineComponent({
  name: "VueServerTreeGridExample",
  setup() {
    const sorting = ref<SortingState>([]);
    const expanded = ref<ExpandedState>({});
    const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 6 });
    const rowSelection = ref<RowSelectionState>({});
    const loadedChildren = ref<Record<string, ServerTreeRow[]>>({});
    const loading = ref<Record<string, boolean>>({});
    const loadErrors = ref<Record<string, string>>({});
    const cancelledLoads = ref<Record<string, string>>({});
    const refreshCounts = ref<Record<string, number>>({});
    const mutatingWork = ref<Record<string, boolean>>({});
    const workMutationCounts = ref<Record<string, number>>({});
    const workMutationErrors = ref<Record<string, string>>({});
    const branchMergeCounts = ref<Record<string, number>>({});
    const workMergeCounts = ref<Record<string, number>>({});
    const branchMergeConflicts = ref<Record<string, string>>({});
    const inFlightLoads = new Map<string, InFlightLoad>();
    let requestSequence = 0;

    const cancelChildrenLoad = (portfolioId: string, reason: string): boolean => {
      const load = inFlightLoads.get(portfolioId);

      if (!load) {
        return false;
      }

      load.controller.abort();
      inFlightLoads.delete(portfolioId);
      const nextLoading = { ...loading.value };
      delete nextLoading[portfolioId];
      loading.value = nextLoading;
      cancelledLoads.value = { ...cancelledLoads.value, [portfolioId]: reason };
      return true;
    };

    const isCurrentRequest = (portfolioId: string, requestId: number): boolean => inFlightLoads.get(portfolioId)?.requestId === requestId;

    watchEffect(() => {
      const expandedIds = new Set(Object.entries(expanded.value).flatMap(([id, value]) => (value ? [id] : [])));

      for (const id of inFlightLoads.keys()) {
        if (!expandedIds.has(id)) {
          cancelChildrenLoad(id, "collapsed before response");
        }
      }

      const loadableIds = Object.entries(expanded.value)
        .filter(([id, value]) => value && !loadedChildren.value[id] && !loadErrors.value[id] && !inFlightLoads.has(id))
        .map(([id]) => id);

      for (const id of loadableIds) {
        const requestId = requestSequence + 1;
        const controller = new AbortController();
        const refreshVersion = refreshCounts.value[id] ?? 0;
        const mutationSnapshot = { ...workMutationCounts.value };
        const mergeSnapshot = { ...workMergeCounts.value };
        requestSequence = requestId;
        inFlightLoads.set(id, { controller, requestId });
        loading.value = { ...loading.value, [id]: true };
        const nextCancelled = { ...cancelledLoads.value };
        delete nextCancelled[id];
        cancelledLoads.value = nextCancelled;

        void loadChildrenFromServer(id, controller.signal, refreshVersion, mutationSnapshot, mergeSnapshot)
          .then((children) => {
            if (!isCurrentRequest(id, requestId) || controller.signal.aborted) {
              return;
            }

            loadedChildren.value = { ...loadedChildren.value, [id]: children };
          })
          .catch((error: unknown) => {
            if (!isCurrentRequest(id, requestId) || controller.signal.aborted) {
              return;
            }

            loadErrors.value = {
              ...loadErrors.value,
              [id]: error instanceof Error ? error.message : "Unknown server error",
            };
          })
          .finally(() => {
            if (!isCurrentRequest(id, requestId)) {
              return;
            }

            const nextLoading = { ...loading.value };
            delete nextLoading[id];
            loading.value = nextLoading;
            inFlightLoads.delete(id);
          });
      }
    });

    onBeforeUnmount(() => {
      for (const load of inFlightLoads.values()) {
        load.controller.abort();
      }
      inFlightLoads.clear();
    });

    const serverResult = computed(() =>
      queryServerTreeRows(
        portfolios,
        {
          sorting: sorting.value,
          expanded: expanded.value,
          pagination: pagination.value,
        },
        loadedChildren.value,
        loading.value,
        loadErrors.value,
      ),
    );

    const retryChildren = (portfolioId: string) => {
      cancelChildrenLoad(portfolioId, "retry replaced request");
      const nextLoaded = { ...loadedChildren.value };
      delete nextLoaded[portfolioId];
      loadedChildren.value = nextLoaded;
      const nextErrors = { ...loadErrors.value };
      delete nextErrors[portfolioId];
      loadErrors.value = nextErrors;
      const nextCancelled = { ...cancelledLoads.value };
      delete nextCancelled[portfolioId];
      cancelledLoads.value = nextCancelled;
    };

    const refreshChildren = (portfolioId: string) => {
      cancelChildrenLoad(portfolioId, "refresh replaced request");
      expanded.value = { ...expanded.value, [portfolioId]: true };
      const nextLoaded = { ...loadedChildren.value };
      delete nextLoaded[portfolioId];
      loadedChildren.value = nextLoaded;
      const nextErrors = { ...loadErrors.value };
      delete nextErrors[portfolioId];
      loadErrors.value = nextErrors;
      const nextCancelled = { ...cancelledLoads.value };
      delete nextCancelled[portfolioId];
      cancelledLoads.value = nextCancelled;
      refreshCounts.value = { ...refreshCounts.value, [portfolioId]: (refreshCounts.value[portfolioId] ?? 0) + 1 };
    };

    const getRefreshableLoadedIds = () => Object.keys(loadedChildren.value).filter((id) => !loading.value[id]);

    const refreshLoadedChildren = () => {
      const portfolioIds = getRefreshableLoadedIds();

      if (portfolioIds.length === 0) {
        return;
      }

      for (const id of portfolioIds) {
        cancelChildrenLoad(id, "bulk refresh replaced request");
      }

      expanded.value = portfolioIds.reduce<ExpandedState>((next, id) => ({ ...next, [id]: true }), { ...expanded.value });
      const nextLoaded = { ...loadedChildren.value };
      for (const id of portfolioIds) {
        delete nextLoaded[id];
      }
      loadedChildren.value = nextLoaded;
      const nextErrors = { ...loadErrors.value };
      for (const id of portfolioIds) {
        delete nextErrors[id];
      }
      loadErrors.value = nextErrors;
      const nextCancelled = { ...cancelledLoads.value };
      for (const id of portfolioIds) {
        delete nextCancelled[id];
      }
      cancelledLoads.value = nextCancelled;
      refreshCounts.value = portfolioIds.reduce<Record<string, number>>(
        (next, id) => ({ ...next, [id]: (next[id] ?? 0) + 1 }),
        { ...refreshCounts.value },
      );
    };

    const commitWorkMutation = (portfolioId: string, workId: string) => {
      if (!loadedChildren.value[portfolioId] || loading.value[portfolioId] || mutatingWork.value[workId]) {
        return;
      }

      mutatingWork.value = { ...mutatingWork.value, [workId]: true };
      const nextMutationErrors = { ...workMutationErrors.value };
      delete nextMutationErrors[workId];
      workMutationErrors.value = nextMutationErrors;
      void commitWorkMutationToServer()
        .then(() => {
          const work = (workByPortfolio[portfolioId] ?? []).find((candidate) => candidate.id === workId);
          const mutationVersion = (workMutationCounts.value[workId] ?? 0) + 1;
          const refreshVersion = refreshCounts.value[portfolioId] ?? 0;

          workMutationCounts.value = { ...workMutationCounts.value, [workId]: Math.max(workMutationCounts.value[workId] ?? 0, mutationVersion) };

          if (!work) {
            return;
          }

          const children = loadedChildren.value[portfolioId];

          if (!children) {
            return;
          }

          loadedChildren.value = {
            ...loadedChildren.value,
            [portfolioId]: children.map((child) =>
              child.id === workId ? serverTreeWorkToRow(work, refreshVersion, mutationVersion, workMergeCounts.value[workId] ?? 0) : child,
            ),
          };
        })
        .finally(() => {
          const next = { ...mutatingWork.value };
          delete next[workId];
          mutatingWork.value = next;
        });
    };

    const commitOptimisticWorkMutation = (portfolioId: string, workId: string) => {
      const previousChildren = loadedChildren.value[portfolioId];
      const previousChild = previousChildren?.find((child) => child.id === workId);

      if (!previousChildren || !previousChild || loading.value[portfolioId] || mutatingWork.value[workId]) {
        return;
      }

      mutatingWork.value = { ...mutatingWork.value, [workId]: true };
      const nextMutationErrors = { ...workMutationErrors.value };
      delete nextMutationErrors[workId];
      workMutationErrors.value = nextMutationErrors;
      loadedChildren.value = {
        ...loadedChildren.value,
        [portfolioId]: previousChildren.map((child) => (child.id === workId ? { ...child, name: `${child.name} (optimistic)`, status: "Blocked" } : child)),
      };

      void rejectOptimisticMutationFromServer()
        .catch((error: unknown) => {
          const children = loadedChildren.value[portfolioId];

          if (children) {
            loadedChildren.value = {
              ...loadedChildren.value,
              [portfolioId]: children.map((child) => (child.id === workId ? previousChild : child)),
            };
          }

          workMutationErrors.value = {
            ...workMutationErrors.value,
            [workId]: error instanceof Error ? error.message : "Unknown mutation error",
          };
        })
        .finally(() => {
          const next = { ...mutatingWork.value };
          delete next[workId];
          mutatingWork.value = next;
        });
    };

    const commitConflictingWorkMutation = (portfolioId: string, workId: string) => {
      if (!loadedChildren.value[portfolioId] || loading.value[portfolioId] || mutatingWork.value[workId]) {
        return;
      }

      const expectedBranchVersion = refreshCounts.value[portfolioId] ?? 0;
      mutatingWork.value = { ...mutatingWork.value, [workId]: true };
      const nextMutationErrors = { ...workMutationErrors.value };
      delete nextMutationErrors[workId];
      workMutationErrors.value = nextMutationErrors;

      void rejectConflictingMutationFromServer(portfolioId, workId, expectedBranchVersion)
        .catch((error: unknown) => {
          workMutationErrors.value = {
            ...workMutationErrors.value,
            [workId]: error instanceof Error ? error.message : "Unknown mutation error",
          };
        })
        .finally(() => {
          const next = { ...mutatingWork.value };
          delete next[workId];
          mutatingWork.value = next;
        });
    };

    const recoverConflictedWorkMutation = (portfolioId: string, workId: string) => {
      if (!workMutationErrors.value[workId] || loading.value[portfolioId] || mutatingWork.value[workId]) {
        return;
      }

      cancelChildrenLoad(portfolioId, "conflict recovery replaced request");
      expanded.value = { ...expanded.value, [portfolioId]: true };
      const nextLoaded = { ...loadedChildren.value };
      delete nextLoaded[portfolioId];
      loadedChildren.value = nextLoaded;
      const nextErrors = { ...loadErrors.value };
      delete nextErrors[portfolioId];
      loadErrors.value = nextErrors;
      const nextCancelled = { ...cancelledLoads.value };
      delete nextCancelled[portfolioId];
      cancelledLoads.value = nextCancelled;
      const nextMutationErrors = { ...workMutationErrors.value };
      delete nextMutationErrors[workId];
      workMutationErrors.value = nextMutationErrors;
      refreshCounts.value = { ...refreshCounts.value, [portfolioId]: (refreshCounts.value[portfolioId] ?? 0) + 1 };
    };

    const mergeServerBranchPatch = (portfolioId: string) => {
      const children = loadedChildren.value[portfolioId];

      if (!children || loading.value[portfolioId]) {
        return;
      }

      const mergeVersion = (branchMergeCounts.value[portfolioId] ?? 0) + 1;
      const refreshVersion = refreshCounts.value[portfolioId] ?? 0;
      const nextMergeConflicts: Record<string, string> = {};

      loadedChildren.value = {
        ...loadedChildren.value,
        [portfolioId]: children.map((child) => {
          const work = (workByPortfolio[portfolioId] ?? []).find((candidate) => candidate.id === child.id);

          if (!work) {
            return child;
          }

          if ((workMutationCounts.value[child.id] ?? 0) > 0) {
            nextMergeConflicts[child.id] = `kept local mutation over remote merge ${mergeVersion}`;
            return child;
          }

          if (child.id === mergeTargetWorkId) {
            return serverTreeWorkToRow(work, refreshVersion, 0, mergeVersion);
          }

          return child;
        }),
      };
      branchMergeCounts.value = { ...branchMergeCounts.value, [portfolioId]: mergeVersion };
      workMergeCounts.value = { ...workMergeCounts.value, [mergeTargetWorkId]: mergeVersion };
      branchMergeConflicts.value = nextMergeConflicts;
    };

    const handleStateChange = (state: GridState) => {
      sorting.value = state.sorting;
      expanded.value = state.expanded;
      pagination.value = state.pagination;
      rowSelection.value = state.rowSelection;
    };

    return () => {
      const result = serverResult.value;
      const serverPageIndex = result.pageIndex;
      const gridOptions: GridOptions<ServerTreeRow> = {
        data: result.rows,
        columns,
        getRowId: (row) => row.id,
        getSubRows: (row) => row.children,
        getRowCanExpand: (row) => row.rowType === "portfolio",
        state: {
          sorting: sorting.value,
          expanded: expanded.value,
          pagination: pagination.value,
          rowSelection: rowSelection.value,
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

      return h("main", { class: "app-shell" }, [
        h("section", { class: "toolbar", "aria-label": "Vue server tree controls" }, [
          h("div", [
            h("h1", "Vue server lazy tree"),
            h("p", `${result.totalTopLevelRows} server portfolios · page ${serverPageIndex + 1} of ${result.pageCount}`),
          ]),
          h("div", { class: "toolbar-actions" }, [
            h(
              "button",
              { type: "button", onClick: () => (expanded.value = { ...expanded.value, "PFL-001": !expanded.value["PFL-001"] }) },
              "Toggle PFL-001",
            ),
            h(
              "button",
              {
                type: "button",
                disabled: !loadedChildren.value["PFL-001"] || !!loading.value["PFL-001"],
                onClick: () => refreshChildren("PFL-001"),
              },
              "Refresh PFL-001",
            ),
            h(
              "button",
              {
                type: "button",
                disabled: getRefreshableLoadedIds().length === 0,
                onClick: refreshLoadedChildren,
              },
              "Refresh loaded branches",
            ),
            h(
              "button",
              {
                type: "button",
                disabled: !loadedChildren.value[mutationTargetPortfolioId] || !!loading.value[mutationTargetPortfolioId] || !!mutatingWork.value[mutationTargetWorkId],
                onClick: () => commitWorkMutation(mutationTargetPortfolioId, mutationTargetWorkId),
              },
              "Mutate PFL-001 work 1",
            ),
            h(
              "button",
              {
                type: "button",
                disabled:
                  !loadedChildren.value[mutationTargetPortfolioId] ||
                  !!loading.value[mutationTargetPortfolioId] ||
                  !!mutatingWork.value[optimisticMutationTargetWorkId],
                onClick: () => commitOptimisticWorkMutation(mutationTargetPortfolioId, optimisticMutationTargetWorkId),
              },
              "Optimistic fail PFL-001 work 2",
            ),
            h(
              "button",
              {
                type: "button",
                disabled:
                  !loadedChildren.value[mutationTargetPortfolioId] ||
                  !!loading.value[mutationTargetPortfolioId] ||
                  !!mutatingWork.value[conflictMutationTargetWorkId],
                onClick: () => commitConflictingWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId),
              },
              "Conflict PFL-001 work 3",
            ),
            h(
              "button",
              {
                type: "button",
                disabled:
                  !workMutationErrors.value[conflictMutationTargetWorkId] ||
                  !!loading.value[mutationTargetPortfolioId] ||
                  !!mutatingWork.value[conflictMutationTargetWorkId],
                onClick: () => recoverConflictedWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId),
              },
              "Recover PFL-001 conflict",
            ),
            h(
              "button",
              {
                type: "button",
                disabled: !loadedChildren.value[mutationTargetPortfolioId] || !!loading.value[mutationTargetPortfolioId],
                onClick: () => mergeServerBranchPatch(mutationTargetPortfolioId),
              },
              "Merge PFL-001 server patch",
            ),
            h("button", { type: "button", onClick: () => (expanded.value = { ...expanded.value, "PFL-002": true }) }, "Expand PFL-002"),
            h("button", { type: "button", disabled: !loadErrors.value["PFL-002"], onClick: () => retryChildren("PFL-002") }, "Retry PFL-002"),
            h("button", { type: "button", onClick: () => (expanded.value = { ...expanded.value, "PFL-003": true }) }, "Expand PFL-003"),
            h("button", { type: "button", onClick: () => (expanded.value = { ...expanded.value, "PFL-003": false }) }, "Collapse PFL-003"),
          ]),
        ]),
        h("div", { class: "server-state", "aria-label": "Vue server tree query state" }, [
          h("span", { "data-testid": "vue-tree-expanded" }, `Expanded: ${formatServerTreeExpanded(expanded.value)}`),
          h("span", { "data-testid": "vue-tree-loading" }, `Loading: ${formatServerTreeLoading(loading.value)}`),
          h("span", { "data-testid": "vue-tree-errors" }, `Errors: ${formatServerTreeErrors(loadErrors.value)}`),
          h("span", { "data-testid": "vue-tree-cancelled" }, `Cancelled: ${formatServerTreeCancelled(cancelledLoads.value)}`),
          h("span", { "data-testid": "vue-tree-refreshes" }, `Refreshes: ${formatServerTreeRefreshes(refreshCounts.value)}`),
          h("span", { "data-testid": "vue-tree-mutating" }, `Mutating: ${formatServerTreeMutating(mutatingWork.value)}`),
          h("span", { "data-testid": "vue-tree-mutations" }, `Mutations: ${formatServerTreeMutations(workMutationCounts.value)}`),
          h("span", { "data-testid": "vue-tree-mutation-errors" }, `Mutation errors: ${formatServerTreeMutationErrors(workMutationErrors.value)}`),
          h("span", { "data-testid": "vue-tree-merges" }, `Merges: ${formatServerTreeMerges(branchMergeCounts.value)}`),
          h("span", { "data-testid": "vue-tree-merge-conflicts" }, `Merge conflicts: ${formatServerTreeMutationErrors(branchMergeConflicts.value)}`),
          h("span", { "data-testid": "vue-tree-loaded" }, `Loaded: ${Object.keys(loadedChildren.value).join(", ") || "none"}`),
          h("span", { "data-testid": "vue-tree-selected" }, `Selected: ${Object.keys(rowSelection.value).join(", ") || "none"}`),
          h(
            "span",
            { "data-testid": "vue-tree-sorting" },
            `Sorting: ${sorting.value.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}`,
          ),
        ]),
        h(ServerTreeGrid, {
          options: gridOptions,
        }),
        h("nav", { class: "pagination", "aria-label": "Vue server tree pagination" }, [
          h("button", { type: "button", disabled: serverPageIndex === 0, onClick: () => (pagination.value = { ...pagination.value, pageIndex: 0 }) }, "First"),
          h(
            "button",
            {
              type: "button",
              disabled: serverPageIndex === 0,
              onClick: () => (pagination.value = { ...pagination.value, pageIndex: Math.max(0, serverPageIndex - 1) }),
            },
            "Previous",
          ),
          h("span", `Page ${serverPageIndex + 1} / ${result.pageCount}`),
          h(
            "button",
            {
              type: "button",
              disabled: serverPageIndex >= result.pageCount - 1,
              onClick: () =>
                (pagination.value = {
                  ...pagination.value,
                  pageIndex: Math.min(result.pageCount - 1, serverPageIndex + 1),
                }),
            },
            "Next",
          ),
        ]),
      ]);
    };
  },
});

createApp(App).mount("#app");
