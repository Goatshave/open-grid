import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrid } from "@open-grid/core";
import { createTicketClient, getTicketSaveSummary } from "../src/ticket-client";
import type { RemoteTicketPage } from "../src/ticket-api";
import type { ServerSideTicket } from "../src/index";

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
const query = { sorting: [], columnFilters: [], pagination: { pageIndex: 0, pageSize: 25 } };
const row: ServerSideTicket = { id: "TCK-0001", account: "Original account", owner: "Mina", status: "Open" as const,
  priority: "Medium" as const, value: 10, openedAt: "2026-10-24" };
const page = (account = row.account): RemoteTicketPage => ({ rows: [{ ...row, account }], revisions: { [row.id]: 0 },
  totalRows: 1, pageCount: 1, pageIndex: 0, pageSize: 25, hasNextPage: false, hasPreviousPage: false, query });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("ticket client integration", () => {
  it("keeps a committed page on refresh failure and ignores an older query response", async () => {
    const calls: { task: ReturnType<typeof deferred>; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
      const task = deferred(); calls.push({ task, ...(init ? { init } : {}) }); return task.promise;
    });
    const client = createTicketClient();
    const first = client.start(); const newer = client.setAccountFilter("Newest");
    expect(calls[0]!.init?.signal?.aborted).toBe(true);
    const latest = page("Newest account"); latest.query = { ...query, columnFilters: [{ id: "account", value: "Newest" }] };
    calls[1]!.task.resolve(json(latest)); await newer;
    calls[0]!.task.resolve(json(page())); await first;
    expect(client.getSnapshot().page.rows[0]!.account).toBe("Newest account");
    const refresh = client.failRefresh(); calls[2]!.task.resolve(json({ error: "Offline" }, 503)); await refresh;
    expect(client.getSnapshot()).toMatchObject({ loading: false, error: "Offline", page: latest });
    client.dispose();
  });

  it("does not let a read captured before a save overwrite the newer acknowledged row", async () => {
    const calls: ReturnType<typeof deferred>[] = [];
    vi.stubGlobal("fetch", () => { const task = deferred(); calls.push(task); return task.promise; });
    const client = createTicketClient();
    const initial = client.start(); calls[0]!.resolve(json(page())); await initial;
    const oldRefresh = client.refresh();
    const grid = createGrid({ data: [row], columns: [{ accessorKey: "account", enableEditing: true }],
      getRowId: (value) => value.id, onCellEdit: client.onCellEdit });
    grid.startCellEdit(row.id, "account");
    grid.commitCellEdit("Acknowledged account");
    calls[2]!.resolve(json({ row: { ...row, account: "Acknowledged account" }, revision: 1 }));
    await vi.waitFor(() => expect(getTicketSaveSummary(client.getSnapshot()).saved).toBe(1));
    calls[1]!.resolve(json(page())); await oldRefresh;
    expect(client.getSnapshot().page.rows[0]!.account).toBe("Acknowledged account");
    expect(client.getSnapshot().page.revisions[row.id]).toBe(1);
    client.dispose();
  });

  it("retains selection across pages and sorting, but clears it when the filter universe changes", async () => {
    vi.stubGlobal("fetch", async () => json(page()));
    const client = createTicketClient();
    await client.start();
    const state = createGrid({ data: [row], columns: [{ accessorKey: "account" }] }).getState();
    client.onStateChange({ ...state, rowSelection: { [row.id]: true }, allRowsSelected: true });
    await client.setPageIndex(1);
    expect(client.getSnapshot().gridState).toMatchObject({ rowSelection: { [row.id]: true }, allRowsSelected: true });
    client.onStateChange({ ...client.getSnapshot().gridState, ...state,
      rowSelection: { [row.id]: true }, allRowsSelected: true, sorting: [{ id: "account", desc: true }] });
    expect(client.getSnapshot().gridState.allRowsSelected).toBe(true);
    await client.setAccountFilter("New account");
    expect(client.getSnapshot().gridState).toMatchObject({ rowSelection: {}, allRowsSelected: false });
    client.dispose();
  });

  it("serializes different edited columns against a shared server row revision", async () => {
    const calls: { task: ReturnType<typeof deferred>; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
      const task = deferred(); calls.push({ task, ...(init ? { init } : {}) }); return task.promise;
    });
    const client = createTicketClient();
    const initial = client.start(); calls[0]!.task.resolve(json(page())); await initial;
    const grid = createGrid({ data: [row], columns: [{ accessorKey: "account", enableEditing: true }, { accessorKey: "openedAt", enableEditing: true }],
      getRowId: (value) => value.id, onCellEdit: client.onCellEdit });
    grid.startCellEdit(row.id, "account"); grid.commitCellEdit("Changed account");
    grid.startCellEdit(row.id, "openedAt"); grid.commitCellEdit("2026-10-25");
    expect(calls).toHaveLength(2);
    calls[1]!.task.resolve(json({ row: { ...row, account: "Changed account" }, revision: 1 }));
    await vi.waitFor(() => expect(calls).toHaveLength(3));
    expect(JSON.parse(String(calls[2]!.init?.body)).expectedRevision).toBe(1);
    calls[2]!.task.resolve(json({ row: { ...row, account: "Changed account", openedAt: "2026-10-25" }, revision: 2 }));
    await vi.waitFor(() => expect(getTicketSaveSummary(client.getSnapshot())).toMatchObject({ saved: 2, pending: 0 }));
    expect(client.getSnapshot().page.rows[0]).toMatchObject({ account: "Changed account", openedAt: "2026-10-25" });
    client.dispose();
  });

  it("does not let an older bulk completion clear a newer query's selection or restore its page", async () => {
    const calls: ReturnType<typeof deferred>[] = [];
    vi.stubGlobal("fetch", () => { const task = deferred(); calls.push(task); return task.promise; });
    const client = createTicketClient();
    const initial = client.start(); calls[0]!.resolve(json(page())); await initial;
    client.selectAllMatching(); const bulk = client.resolveSelected();
    const newer = client.setAccountFilter("Newest");
    const latest = page("Newest account"); latest.query = { ...query, columnFilters: [{ id: "account", value: "Newest" }] };
    calls[2]!.resolve(json(latest)); await newer;
    client.setRowSelected(row.id, true);
    calls[1]!.resolve(json({ matchedCount: 1, affectedCount: 1 }));
    await vi.waitFor(() => expect(calls).toHaveLength(4));
    calls[3]!.resolve(json(latest)); await bulk;
    expect(client.getSnapshot()).toMatchObject({ page: latest, selection: { mode: "explicit", ids: [row.id] } });
    client.dispose();
  });

  it("does not interpret a stale controlled selection on a focus event as a new checkbox action", async () => {
    vi.stubGlobal("fetch", async () => json(page()));
    const client = createTicketClient(); await client.start(); client.selectAllMatching();
    const columns = [{ accessorKey: "account" as const }];
    const options = client.gridOptions(columns);
    const state = createGrid(options).getState();
    client.onStateChange({ ...state, rowSelection: { [row.id]: false } });
    expect(client.getSnapshot().selection).toMatchObject({ mode: "all-matching", excludedIds: [row.id] });
    client.onStateChange({ ...state, focusedCell: { rowId: row.id, columnId: "account" } });
    expect(client.getSnapshot().selection).toMatchObject({ mode: "all-matching", excludedIds: [row.id] });
    client.dispose();
  });
});
