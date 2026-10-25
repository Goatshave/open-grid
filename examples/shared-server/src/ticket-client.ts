import { createServerMutationCoordinator, createServerRequestCoordinator, createServerSelection, type CellEditEvent, type GridOptions, type GridState, type ServerMutationState, type ServerSelection } from "@open-grid/core";
import { createExampleCellEditController, type ExampleCellEditInput } from "./cell-edit-client";
import { getTicketSelectionQueryKey, readTicketApi, TicketApiError, type RemoteTicketPage, type TicketEditAck, type TicketSaveScenario, type TicketSelectionQuery, type TicketBulkAck } from "./ticket-api";
import type { ServerSideTicket, ServerSideTicketQuery } from "./index";

interface ListInput { query: ServerSideTicketQuery; unknown: boolean; fail: boolean; }
export interface TicketClientSnapshot {
  page: RemoteTicketPage;
  requested: ServerSideTicketQuery;
  gridState: Partial<GridState>;
  loading: boolean;
  error: string | null;
  unknownTotal: boolean;
  saveMessage: string;
  saves: ReadonlyMap<string, ServerMutationState<ExampleCellEditInput, TicketEditAck>>;
  selection: ServerSelection<TicketSelectionQuery>;
  bulk: { pending: boolean; message: string; error: string | null };
}

export function createTicketClient() {
  const session = globalThis.crypto.randomUUID();
  const initialQuery: ServerSideTicketQuery = { sorting: [], columnFilters: [], pagination: { pageIndex: 0, pageSize: 25 } };
  const selection = createServerSelection<TicketSelectionQuery>({ query: { columnFilters: [] }, getQueryKey: getTicketSelectionQueryKey });
  const empty: RemoteTicketPage = { rows: [], revisions: {}, totalRows: 0, pageCount: 1,
    pageIndex: 0, pageSize: 25, hasNextPage: false, hasPreviousPage: false, query: initialQuery };
  let snapshot: TicketClientSnapshot = { page: empty, requested: initialQuery, gridState: {},
    loading: false, error: null, unknownTotal: false, saveMessage: "Server edit: idle", saves: new Map(),
    selection: selection.getState(), bulk: { pending: false, message: "Bulk action: idle", error: null } };
  const listeners = new Set<() => void>();
  const patches = new Map<string, TicketEditAck>();
  const projectedSelections = new WeakSet<object>();
  let disposed = false;
  let nextSave: TicketSaveScenario = "normal";
  const publish = (patch: Partial<TicketClientSnapshot>) => {
    if (disposed) return;
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const urlFor = (path: string) => `${path}?session=${encodeURIComponent(session)}`;
  const requestPage = async (input: ListInput, signal?: AbortSignal) => {
    const url = `${urlFor("/__open-grid/tickets")}&query=${encodeURIComponent(JSON.stringify(input.query))}&unknown=${Number(input.unknown)}&fail=${Number(input.fail)}`;
    return readTicketApi<RemoteTicketPage>(await fetch(url, signal ? { signal } : {}));
  };
  const reads = createServerRequestCoordinator<string, ListInput, RemoteTicketPage>({ getKey: () => "tickets",
    request: (input, context) => requestPage(input, context.signal) });
  selection.subscribe(() => publish({ selection: selection.getState() }));
  // Server revisions cover a whole row, so writes from different editors also serialize per row.
  const writes = createServerMutationCoordinator<string, ExampleCellEditInput & { operationId: string; scenario: TicketSaveScenario }, TicketEditAck>({
    getKey: (input) => input.rowId,
    mutate: async (input, context) => readTicketApi<TicketEditAck>(await fetch(urlFor("/__open-grid/edits"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, expectedRevision: Math.max(context.previousData?.revision ?? 0, snapshot.page.revisions[input.rowId] ?? 0) }),
    })),
  });

  const edits = createExampleCellEditController<ServerSideTicket, TicketEditAck>({
    classifyError: (error) => error instanceof TicketApiError ? error.status === 409 ? "conflict" : error.status === 422 ? "validation-error" : "error" : "error",
    getMode: (event) => ["account", "openedAt"].includes(event.column.id) ? (event.type.includes("paste") ? "paste" : "edit") : null,
    save: async (input, context) => {
      const scenario = nextSave; nextSave = "normal";
      const result = await writes.run({ ...input, operationId: context.operationId, scenario });
      if (result.status === "success") return result.data;
      throw result.status === "cancelled" ? new Error("Save scope disposed") : result.error;
    },
    apply: (input, ack) => {
      if (!ack || ack.revision < Math.max(patches.get(input.rowId)?.revision ?? 0, snapshot.page.revisions[input.rowId] ?? 0)) return;
      patches.set(input.rowId, ack);
      publish({ page: { ...snapshot.page,
        rows: snapshot.page.rows.map((row) => row.id === input.rowId ? ack.row : row),
        revisions: { ...snapshot.page.revisions, [input.rowId]: ack.revision } } });
    },
    finish: ({ rowId, columnId }) => {
      const focus = snapshot.gridState.focusedCell;
      if (focus?.rowId === rowId && focus.columnId === columnId) publish({ gridState: { ...snapshot.gridState, editingCell: null } });
    },
    status: (saveMessage) => publish({ saveMessage }),
  });
  edits.subscribe(() => publish({ saves: edits.getStates() }));
  let failedBulk: { selection: ServerSelection<TicketSelectionQuery>; operationId: string } | null = null;

  const load = async (input: ListInput) => {
    if (disposed) return;
    if (JSON.stringify(input.query) !== JSON.stringify(snapshot.requested)) edits.invalidateEditor();
    if (JSON.stringify(input.query.columnFilters) !== JSON.stringify(snapshot.requested.columnFilters)) {
      // This product's selection universe changes with filters, not page/sort changes.
      publish({ gridState: { ...snapshot.gridState, rowSelection: {}, allRowsSelected: false } });
    }
    if (selection.setQuery({ columnFilters: input.query.columnFilters })) {
      failedBulk = null;
      publish({ bulk: { pending: snapshot.bulk.pending, message: "Bulk action: query changed", error: null } });
    }
    publish({ requested: input.query, unknownTotal: input.unknown, loading: true, error: null });
    const result = await reads.run(input);
    if (disposed || reads.getState("tickets").requestId !== result.requestId) return;
    if (result.status === "success") {
      const page = result.data;
      const rows = page.rows.map((row) => {
        const saved = patches.get(row.id);
        return saved && saved.revision > (page.revisions[row.id] ?? 0) ? saved.row : row;
      });
      const revisions = { ...page.revisions };
      for (const row of rows) revisions[row.id] = Math.max(revisions[row.id] ?? 0, patches.get(row.id)?.revision ?? 0);
      publish({ page: { ...page, rows, revisions }, requested: page.query, loading: false });
    } else if (result.status === "error") {
      publish({ loading: false, error: result.error instanceof Error ? result.error.message : "Unable to load tickets" });
    }
  };
  const queryFrom = (state: GridState): ServerSideTicketQuery => ({ sorting: state.sorting, columnFilters: state.columnFilters, pagination: state.pagination });
  const selectionReady = () => !snapshot.loading && !snapshot.error && getTicketSelectionQueryKey(snapshot.page.query) === selection.getState().queryKey;
  const runBulk = async (intent: NonNullable<typeof failedBulk>) => {
    if (disposed || snapshot.bulk.pending || !selectionReady() || [...snapshot.saves.values()].some((state) => state.pendingCount)) return;
    publish({ bulk: { pending: true, message: "Resolving selected tickets...", error: null } });
    try {
      const ack = await readTicketApi<TicketBulkAck>(await fetch(urlFor("/__open-grid/bulk"), {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...intent, action: "resolve" }),
      }));
      if (disposed) return;
      if (selection.getState() === intent.selection) selection.clear();
      const current = selection.getState().queryKey === intent.selection.queryKey;
      failedBulk = null;
      publish({ bulk: { pending: false, message: current ? `Resolved ${ack.affectedCount} of ${ack.matchedCount} matching tickets` : "Bulk action completed for previous query", error: null } });
      await load({ query: snapshot.requested, unknown: snapshot.unknownTotal, fail: false });
    } catch (error) {
      if (disposed) return;
      const current = selection.getState().queryKey === intent.selection.queryKey;
      failedBulk = current ? intent : null;
      const message = error instanceof Error ? error.message : "Bulk action failed";
      publish({ bulk: { pending: false, message: current ? `Bulk action failed: ${message}` : "Bulk action ended for previous query", error: current ? message : null } });
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start: () => load({ query: initialQuery, unknown: false, fail: false }),
    refresh: () => load({ query: snapshot.requested, unknown: snapshot.unknownTotal, fail: false }),
    failRefresh: () => load({ query: snapshot.requested, unknown: snapshot.unknownTotal, fail: true }),
    retry: () => load({ query: snapshot.requested, unknown: snapshot.unknownTotal, fail: false }),
    setUnknownTotal: (unknown: boolean) => load({ query: { ...snapshot.requested, pagination: { ...snapshot.requested.pagination, pageIndex: 0 } }, unknown, fail: false }),
    setAccountFilter: (value: string) => load({ query: { ...snapshot.requested,
      columnFilters: [...snapshot.requested.columnFilters.filter((filter) => filter.id !== "account"), ...(value ? [{ id: "account", value }] : [])], pagination: { ...snapshot.requested.pagination, pageIndex: 0 } }, unknown: snapshot.unknownTotal, fail: false }),
    setPageIndex: (pageIndex: number) => load({ query: { ...snapshot.requested, pagination: { ...snapshot.requested.pagination, pageIndex } }, unknown: snapshot.unknownTotal, fail: false }),
    onStateChange: (state: GridState) => {
      const query = queryFrom(state);
      const previous = snapshot.requested;
      if (snapshot.loading && query.pagination.pageIndex === snapshot.page.pageIndex && query.pagination.pageSize === snapshot.page.pageSize) {
        query.pagination = previous.pagination;
      }
      if (JSON.stringify(query.sorting) !== JSON.stringify(previous.sorting) || JSON.stringify(query.columnFilters) !== JSON.stringify(previous.columnFilters)) query.pagination = { ...query.pagination, pageIndex: 0 };
      publish({ gridState: state });
      // Focus/range events may carry a previous controlled projection before the
      // framework applies new props (notably WebKit's focus/click ordering).
      if (selectionReady() && (state.allRowsSelected || !projectedSelections.has(state.rowSelection))) {
        selection.setGridState(snapshot.page.rows.map((row) => row.id), state);
      }
      if (JSON.stringify(query) !== JSON.stringify(previous)) void load({ query, unknown: snapshot.unknownTotal, fail: false });
    },
    onCellEdit: (event: CellEditEvent<ServerSideTicket>) => edits.handle(event),
    onEditorInput: (event: Event) => { if (event.target instanceof Element && event.target.closest(".og-grid__cell-editor, .og-grid__custom-editor")) edits.invalidateEditor(); },
    setSaveScenario: (scenario: TicketSaveScenario) => { nextSave = scenario; publish({ saveMessage: `Next save: ${scenario}` }); },
    retryFailed: () => edits.retryFailed(),
    selectAllMatching: () => { if (selectionReady()) selection.selectAllMatching(); },
    clearSelection: () => selection.clear(),
    setRowSelected: (rowId: string, selected: boolean) => { if (selectionReady()) selection.setRowSelected(rowId, selected); },
    resolveSelected: () => runBulk({ selection: selection.getState(), operationId: globalThis.crypto.randomUUID() }),
    retryBulk: () => failedBulk ? runBulk(failedBulk) : Promise.resolve(),
    discardAndReload: async () => {
      if ([...snapshot.saves.values()].some((state) => state.pendingCount > 0)) return;
      edits.discardSettled(); patches.clear();
      for (const key of writes.getStates().keys()) writes.reset(key);
      publish({ gridState: { ...snapshot.gridState, editingCell: null }, saves: edits.getStates(), saveMessage: "Server edit: changes discarded" });
      await load({ query: snapshot.requested, unknown: snapshot.unknownTotal, fail: false });
    },
    exportRows: async (query: Pick<ServerSideTicketQuery, "sorting" | "columnFilters">) => (await requestPage({
      query: { ...query, pagination: { pageIndex: 0, pageSize: 10_000 } }, unknown: false, fail: false })).rows,
    gridOptions: (columns: GridOptions<ServerSideTicket>["columns"]): GridOptions<ServerSideTicket> => {
      const gridSelection = selection.getGridState(snapshot.page.rows.map((row) => row.id));
      projectedSelections.add(gridSelection.rowSelection);
      return {
      data: snapshot.page.rows, columns, getRowId: (row) => row.id,
      manualSorting: true, manualFiltering: true, manualPagination: true,
      ...(snapshot.page.totalRows === undefined ? { hasNextPage: snapshot.page.hasNextPage, hasPreviousPage: snapshot.page.hasPreviousPage } : { rowCount: snapshot.page.totalRows }),
      state: { ...snapshot.gridState, ...gridSelection, sorting: snapshot.requested.sorting, columnFilters: snapshot.requested.columnFilters,
        pagination: { pageIndex: snapshot.page.pageIndex, pageSize: snapshot.page.pageSize } },
      initialState: { columnPinning: { left: ["id"], right: ["value"] } },
      };
    },
    dispose: () => { disposed = true; reads.dispose(); edits.dispose(); writes.dispose(); selection.dispose(); listeners.clear(); },
  };
}

export function getTicketSaveSummary(snapshot: TicketClientSnapshot) {
  const states = [...snapshot.saves.values()];
  return { pending: states.reduce((count, state) => count + state.pendingCount, 0),
    saved: states.filter((state) => state.status === "success").length,
    failed: states.filter((state) => ["error", "validation-error", "conflict"].includes(state.status)).length };
}

export function getTicketPaginationLocalization(paginationLabel: string) {
  return {
    paginationLabel,
    paginationActionLabel: (action: string) => action === "last" ? "Last page" : action.charAt(0).toUpperCase() + action.slice(1),
    pageStatus: (page: number, count: number) => `Page ${page} / ${count}`,
    pageStatusUnknown: (page: number) => `Page ${page}`,
  };
}
