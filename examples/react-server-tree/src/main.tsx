import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import "./styles.css";
import type { RowSelectionState } from "@open-grid/core";
import {
  createColumnHelper,
  DataGrid,
  type AnyColumnDef,
  type ExpandedState,
  type GridState,
  type PaginationState,
  type SortingState,
} from "@open-grid/react-ui";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

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

function App() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 6 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [loadedChildren, setLoadedChildren] = useState<Record<string, ServerTreeRow[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [cancelledLoads, setCancelledLoads] = useState<Record<string, string>>({});
  const [refreshCounts, setRefreshCounts] = useState<Record<string, number>>({});
  const [mutatingWork, setMutatingWork] = useState<Record<string, boolean>>({});
  const [workMutationCounts, setWorkMutationCounts] = useState<Record<string, number>>({});
  const [workMutationErrors, setWorkMutationErrors] = useState<Record<string, string>>({});
  const [branchMergeCounts, setBranchMergeCounts] = useState<Record<string, number>>({});
  const [workMergeCounts, setWorkMergeCounts] = useState<Record<string, number>>({});
  const [branchMergeConflicts, setBranchMergeConflicts] = useState<Record<string, string>>({});
  const inFlightLoads = useRef(new Map<string, InFlightLoad>());
  const requestSequence = useRef(0);

  useEffect(() => {
    const expandedIds = new Set(Object.entries(expanded).flatMap(([id, value]) => (value ? [id] : [])));

    for (const id of inFlightLoads.current.keys()) {
      if (!expandedIds.has(id)) {
        cancelChildrenLoad(id, "collapsed before response");
      }
    }

    const loadableIds = Object.entries(expanded)
      .filter(([id, value]) => value && !loadedChildren[id] && !loadErrors[id] && !inFlightLoads.current.has(id))
      .map(([id]) => id);

    for (const id of loadableIds) {
      const requestId = requestSequence.current + 1;
      const controller = new AbortController();
      const refreshVersion = refreshCounts[id] ?? 0;
      const mutationSnapshot = { ...workMutationCounts };
      const mergeSnapshot = { ...workMergeCounts };
      requestSequence.current = requestId;
      inFlightLoads.current.set(id, { controller, requestId });
      setLoading((previous) => ({ ...previous, [id]: true }));
      setCancelledLoads((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      void loadChildrenFromServer(id, controller.signal, refreshVersion, mutationSnapshot, mergeSnapshot)
        .then((children) => {
          if (!isCurrentRequest(id, requestId) || controller.signal.aborted) {
            return;
          }

          setLoadedChildren((previous) => ({ ...previous, [id]: children }));
        })
        .catch((error: unknown) => {
          if (!isCurrentRequest(id, requestId) || controller.signal.aborted) {
            return;
          }

          setLoadErrors((previous) => ({
            ...previous,
            [id]: error instanceof Error ? error.message : "Unknown server error",
          }));
        })
        .finally(() => {
          if (!isCurrentRequest(id, requestId)) {
            return;
          }

          setLoading((previous) => {
            const next = { ...previous };
            delete next[id];
            return next;
          });
          inFlightLoads.current.delete(id);
        });
    }
  }, [expanded, loadedChildren, loadErrors, refreshCounts, workMergeCounts, workMutationCounts]);

  useEffect(
    () => () => {
      for (const load of inFlightLoads.current.values()) {
        load.controller.abort();
      }
      inFlightLoads.current.clear();
    },
    [],
  );

  const serverResult = useMemo(
    () => queryServerTreeRows(portfolios, { sorting, expanded, pagination }, loadedChildren, loading, loadErrors),
    [expanded, loadedChildren, loadErrors, loading, pagination, sorting],
  );
  const serverPageIndex = serverResult.pageIndex;

  const handleStateChange = (state: GridState) => {
    setSorting(state.sorting);
    setExpanded(state.expanded);
    setPagination(state.pagination);
    setRowSelection(state.rowSelection);
  };

  const retryChildren = (portfolioId: string) => {
    cancelChildrenLoad(portfolioId, "retry replaced request");
    setLoadedChildren((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setLoadErrors((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setCancelledLoads((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
  };

  const refreshChildren = (portfolioId: string) => {
    cancelChildrenLoad(portfolioId, "refresh replaced request");
    setExpanded((previous) => ({ ...previous, [portfolioId]: true }));
    setLoadedChildren((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setLoadErrors((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setCancelledLoads((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setRefreshCounts((previous) => ({ ...previous, [portfolioId]: (previous[portfolioId] ?? 0) + 1 }));
  };

  const refreshLoadedChildren = () => {
    const portfolioIds = Object.keys(loadedChildren).filter((id) => !loading[id]);

    if (portfolioIds.length === 0) {
      return;
    }

    for (const id of portfolioIds) {
      cancelChildrenLoad(id, "bulk refresh replaced request");
    }

    setExpanded((previous) => portfolioIds.reduce<ExpandedState>((next, id) => ({ ...next, [id]: true }), { ...previous }));
    setLoadedChildren((previous) => {
      const next = { ...previous };
      for (const id of portfolioIds) {
        delete next[id];
      }
      return next;
    });
    setLoadErrors((previous) => {
      const next = { ...previous };
      for (const id of portfolioIds) {
        delete next[id];
      }
      return next;
    });
    setCancelledLoads((previous) => {
      const next = { ...previous };
      for (const id of portfolioIds) {
        delete next[id];
      }
      return next;
    });
    setRefreshCounts((previous) =>
      portfolioIds.reduce<Record<string, number>>((next, id) => ({ ...next, [id]: (next[id] ?? 0) + 1 }), { ...previous }),
    );
  };

  const commitWorkMutation = (portfolioId: string, workId: string) => {
    if (!loadedChildren[portfolioId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    setMutatingWork((previous) => ({ ...previous, [workId]: true }));
    setWorkMutationErrors((previous) => {
      const next = { ...previous };
      delete next[workId];
      return next;
    });
    void commitWorkMutationToServer()
      .then(() => {
        const work = (workByPortfolio[portfolioId] ?? []).find((candidate) => candidate.id === workId);
        const mutationVersion = (workMutationCounts[workId] ?? 0) + 1;
        const refreshVersion = refreshCounts[portfolioId] ?? 0;

        setWorkMutationCounts((previous) => ({ ...previous, [workId]: Math.max(previous[workId] ?? 0, mutationVersion) }));

        if (!work) {
          return;
        }

        setLoadedChildren((previous) => {
          const children = previous[portfolioId];

          if (!children) {
            return previous;
          }

          return {
            ...previous,
            [portfolioId]: children.map((child) =>
              child.id === workId ? serverTreeWorkToRow(work, refreshVersion, mutationVersion, workMergeCounts[workId] ?? 0) : child,
            ),
          };
        });
      })
      .finally(() => {
        setMutatingWork((previous) => {
          const next = { ...previous };
          delete next[workId];
          return next;
        });
      });
  };

  const commitOptimisticWorkMutation = (portfolioId: string, workId: string) => {
    const previousChildren = loadedChildren[portfolioId];
    const previousChild = previousChildren?.find((child) => child.id === workId);

    if (!previousChildren || !previousChild || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    setMutatingWork((previous) => ({ ...previous, [workId]: true }));
    setWorkMutationErrors((previous) => {
      const next = { ...previous };
      delete next[workId];
      return next;
    });
    setLoadedChildren((previous) => {
      const children = previous[portfolioId];

      if (!children) {
        return previous;
      }

      return {
        ...previous,
        [portfolioId]: children.map((child) => (child.id === workId ? { ...child, name: `${child.name} (optimistic)`, status: "Blocked" } : child)),
      };
    });

    void rejectOptimisticMutationFromServer()
      .catch((error: unknown) => {
        setLoadedChildren((previous) => {
          const children = previous[portfolioId];

          if (!children) {
            return previous;
          }

          return {
            ...previous,
            [portfolioId]: children.map((child) => (child.id === workId ? previousChild : child)),
          };
        });
        setWorkMutationErrors((previous) => ({
          ...previous,
          [workId]: error instanceof Error ? error.message : "Unknown mutation error",
        }));
      })
      .finally(() => {
        setMutatingWork((previous) => {
          const next = { ...previous };
          delete next[workId];
          return next;
        });
      });
  };

  const commitConflictingWorkMutation = (portfolioId: string, workId: string) => {
    if (!loadedChildren[portfolioId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    const expectedBranchVersion = refreshCounts[portfolioId] ?? 0;
    setMutatingWork((previous) => ({ ...previous, [workId]: true }));
    setWorkMutationErrors((previous) => {
      const next = { ...previous };
      delete next[workId];
      return next;
    });

    void rejectConflictingMutationFromServer(portfolioId, workId, expectedBranchVersion)
      .catch((error: unknown) => {
        setWorkMutationErrors((previous) => ({
          ...previous,
          [workId]: error instanceof Error ? error.message : "Unknown mutation error",
        }));
      })
      .finally(() => {
        setMutatingWork((previous) => {
          const next = { ...previous };
          delete next[workId];
          return next;
        });
      });
  };

  const recoverConflictedWorkMutation = (portfolioId: string, workId: string) => {
    if (!workMutationErrors[workId] || loading[portfolioId] || mutatingWork[workId]) {
      return;
    }

    cancelChildrenLoad(portfolioId, "conflict recovery replaced request");
    setExpanded((previous) => ({ ...previous, [portfolioId]: true }));
    setLoadedChildren((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setLoadErrors((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setCancelledLoads((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setWorkMutationErrors((previous) => {
      const next = { ...previous };
      delete next[workId];
      return next;
    });
    setRefreshCounts((previous) => ({ ...previous, [portfolioId]: (previous[portfolioId] ?? 0) + 1 }));
  };

  const mergeServerBranchPatch = (portfolioId: string) => {
    const children = loadedChildren[portfolioId];

    if (!children || loading[portfolioId]) {
      return;
    }

    const mergeVersion = (branchMergeCounts[portfolioId] ?? 0) + 1;
    const refreshVersion = refreshCounts[portfolioId] ?? 0;
    const nextMergeConflicts: Record<string, string> = {};
    const nextChildren = children.map((child) => {
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
    });

    setLoadedChildren((previous) => ({ ...previous, [portfolioId]: nextChildren }));
    setBranchMergeCounts((previous) => ({ ...previous, [portfolioId]: mergeVersion }));
    setWorkMergeCounts((previous) => ({ ...previous, [mergeTargetWorkId]: mergeVersion }));
    setBranchMergeConflicts(nextMergeConflicts);
  };

  function isCurrentRequest(portfolioId: string, requestId: number): boolean {
    return inFlightLoads.current.get(portfolioId)?.requestId === requestId;
  }

  function cancelChildrenLoad(portfolioId: string, reason: string): boolean {
    const load = inFlightLoads.current.get(portfolioId);

    if (!load) {
      return false;
    }

    load.controller.abort();
    inFlightLoads.current.delete(portfolioId);
    setLoading((previous) => {
      const next = { ...previous };
      delete next[portfolioId];
      return next;
    });
    setCancelledLoads((previous) => ({ ...previous, [portfolioId]: reason }));
    return true;
  }

  const hasRefreshableLoadedChildren = Object.keys(loadedChildren).some((id) => !loading[id]);
  const canMutateTargetWork = !!loadedChildren[mutationTargetPortfolioId] && !loading[mutationTargetPortfolioId] && !mutatingWork[mutationTargetWorkId];
  const canOptimisticallyMutateTargetWork =
    !!loadedChildren[mutationTargetPortfolioId] && !loading[mutationTargetPortfolioId] && !mutatingWork[optimisticMutationTargetWorkId];
  const canConflictTargetWork =
    !!loadedChildren[mutationTargetPortfolioId] && !loading[mutationTargetPortfolioId] && !mutatingWork[conflictMutationTargetWorkId];
  const canRecoverConflict =
    !!workMutationErrors[conflictMutationTargetWorkId] && !loading[mutationTargetPortfolioId] && !mutatingWork[conflictMutationTargetWorkId];
  const canMergeServerPatch = !!loadedChildren[mutationTargetPortfolioId] && !loading[mutationTargetPortfolioId];

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="Server tree controls">
        <div>
          <h1>Server lazy tree</h1>
          <p>
            {serverResult.totalTopLevelRows} server portfolios · page {serverPageIndex + 1} of {serverResult.pageCount}
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, "PFL-001": !previous["PFL-001"] }))}>
            Toggle PFL-001
          </button>
          <button type="button" disabled={!loadedChildren["PFL-001"] || !!loading["PFL-001"]} onClick={() => refreshChildren("PFL-001")}>
            Refresh PFL-001
          </button>
          <button type="button" disabled={!hasRefreshableLoadedChildren} onClick={refreshLoadedChildren}>
            Refresh loaded branches
          </button>
          <button type="button" disabled={!canMutateTargetWork} onClick={() => commitWorkMutation(mutationTargetPortfolioId, mutationTargetWorkId)}>
            Mutate PFL-001 work 1
          </button>
          <button
            type="button"
            disabled={!canOptimisticallyMutateTargetWork}
            onClick={() => commitOptimisticWorkMutation(mutationTargetPortfolioId, optimisticMutationTargetWorkId)}
          >
            Optimistic fail PFL-001 work 2
          </button>
          <button type="button" disabled={!canConflictTargetWork} onClick={() => commitConflictingWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId)}>
            Conflict PFL-001 work 3
          </button>
          <button type="button" disabled={!canRecoverConflict} onClick={() => recoverConflictedWorkMutation(mutationTargetPortfolioId, conflictMutationTargetWorkId)}>
            Recover PFL-001 conflict
          </button>
          <button type="button" disabled={!canMergeServerPatch} onClick={() => mergeServerBranchPatch(mutationTargetPortfolioId)}>
            Merge PFL-001 server patch
          </button>
          <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, "PFL-002": true }))}>
            Expand PFL-002
          </button>
          <button type="button" disabled={!loadErrors["PFL-002"]} onClick={() => retryChildren("PFL-002")}>
            Retry PFL-002
          </button>
          <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, "PFL-003": true }))}>
            Expand PFL-003
          </button>
          <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, "PFL-003": false }))}>
            Collapse PFL-003
          </button>
        </div>
      </section>

      <div className="server-state" aria-label="Server tree query state">
        <span data-testid="tree-expanded">Expanded: {formatServerTreeExpanded(expanded)}</span>
        <span data-testid="tree-loading">Loading: {formatServerTreeLoading(loading)}</span>
        <span data-testid="tree-errors">Errors: {formatServerTreeErrors(loadErrors)}</span>
        <span data-testid="tree-cancelled">Cancelled: {formatServerTreeCancelled(cancelledLoads)}</span>
        <span data-testid="tree-refreshes">Refreshes: {formatServerTreeRefreshes(refreshCounts)}</span>
        <span data-testid="tree-mutating">Mutating: {formatServerTreeMutating(mutatingWork)}</span>
        <span data-testid="tree-mutations">Mutations: {formatServerTreeMutations(workMutationCounts)}</span>
        <span data-testid="tree-mutation-errors">Mutation errors: {formatServerTreeMutationErrors(workMutationErrors)}</span>
        <span data-testid="tree-merges">Merges: {formatServerTreeMerges(branchMergeCounts)}</span>
        <span data-testid="tree-merge-conflicts">Merge conflicts: {formatServerTreeMutationErrors(branchMergeConflicts)}</span>
        <span data-testid="tree-loaded">Loaded: {Object.keys(loadedChildren).join(", ") || "none"}</span>
        <span data-testid="tree-selected">Selected: {Object.keys(rowSelection).join(", ") || "none"}</span>
        <span data-testid="tree-sorting">Sorting: {sorting.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(", ") || "none"}</span>
      </div>

      <DataGrid
        data={serverResult.rows}
        columns={columns}
        getRowId={(row) => row.id}
        getSubRows={(row) => row.children}
        getRowCanExpand={(row) => row.rowType === "portfolio"}
        state={{ sorting, expanded, pagination, rowSelection }}
        onStateChange={handleStateChange}
        manualSorting
        manualPagination
        pageCount={serverResult.pageCount}
        rowSelectionMode="descendants"
        initialState={{
          columnPinning: { left: ["name"], right: ["budget"] },
        }}
      />

      <nav className="pagination" aria-label="Server tree pagination">
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
          onClick={() => setPagination((previous) => ({ ...previous, pageIndex: Math.min(serverResult.pageCount - 1, serverPageIndex + 1) }))}
        >
          Next
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
