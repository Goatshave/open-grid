import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTicketApiHandler } from "../src/ticket-api-server";
import { getTicketSelectionQueryKey } from "../src/ticket-api";

let server: Server;
let base: string;
beforeEach(async () => {
  server = createServer(createTicketApiHandler("TCK", { count: 30 }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No HTTP port");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
const query = { sorting: [], columnFilters: [], pagination: { pageIndex: 0, pageSize: 25 } };
const edit = { rowId: "TCK-0001", columnId: "account", value: "Updated account", expectedRevision: 0, operationId: "operation-1", scenario: "normal" };
const read = (session = "test", unknown = false) => fetch(`${base}/__open-grid/tickets?session=${session}&query=${encodeURIComponent(JSON.stringify(query))}&unknown=${Number(unknown)}`);
const save = (body: unknown, session = "test") => fetch(`${base}/__open-grid/edits?session=${session}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("local ticket HTTP API", () => {
  it("returns committed pagination metadata and omits counts in unknown-total mode", async () => {
    const page = await (await read()).json();
    expect(page.rows).toHaveLength(25); expect(page.totalRows).toBe(30);
    expect(page.hasNextPage).toBe(true); expect(page.query.pagination.pageIndex).toBe(0);
    const unknown = await (await read("test", true)).json();
    expect(unknown).not.toHaveProperty("totalRows"); expect(unknown).not.toHaveProperty("pageCount");
    expect(unknown.hasNextPage).toBe(true);
  });

  it("enforces expected revisions and idempotency, while isolating browser sessions", async () => {
    expect((await save(edit)).status).toBe(200);
    expect((await save(edit)).status).toBe(200);
    const page = await (await read()).json();
    expect(page.revisions["TCK-0001"]).toBe(1);
    expect(page.rows[0].account).toBe("Updated account");
    expect((await save({ ...edit, operationId: "operation-2" })).status).toBe(409);
    expect((await save({ ...edit, value: "Changed intent" })).status).toBe(409);
    const other = await (await read("other-session")).json();
    expect(other.revisions["TCK-0001"]).toBe(0);
    expect(other.rows[0].account).not.toBe("Updated account");
  });

  it("models retryable, validation and conflict failures without silently overwriting remote data", async () => {
    const fail = { ...edit, scenario: "fail-once" };
    expect((await save(fail)).status).toBe(503);
    expect((await save(fail)).status).toBe(200);
    expect((await save({ ...edit, operationId: "validation", expectedRevision: 1, scenario: "validation" })).status).toBe(422);
    expect((await save({ ...edit, operationId: "conflict", expectedRevision: 1, scenario: "conflict-once" })).status).toBe(409);
    const page = await (await read()).json();
    expect(page.rows[0].account).toBe("Remote account change");
    expect(page.revisions["TCK-0001"]).toBe(2);
  });

  it("rejects malformed query and write payloads", async () => {
    expect((await fetch(`${base}/__open-grid/tickets?session=test&query=broken`)).status).toBe(400);
    expect((await save({ ...edit, columnId: "id" })).status).toBe(400);
    expect((await save({ ...edit, expectedRevision: -1 })).status).toBe(400);
    expect((await fetch(`${base}/__open-grid/edits?session=test`, { method: "POST", body: "{}" })).status).toBe(415);
  });

  it("applies typed filters on the server and rejects malformed calendar ranges", async () => {
    const filtered = { ...query, columnFilters: [
      { id: "status", value: { type: "set", values: ["Open", "Waiting"] } },
      { id: "value", value: { type: "number-range", min: 1000, max: 100_000 } },
      { id: "openedAt", value: { type: "date-range", from: "2026-01-01", to: "2026-12-31" } },
    ] };
    const response = await fetch(`${base}/__open-grid/tickets?session=typed&query=${encodeURIComponent(JSON.stringify(filtered))}`);
    expect(response.status).toBe(200);
    const page = await response.json();
    expect(page.rows.length).toBeGreaterThan(0);
    expect(page.rows.every((row: { status: string; value: number }) => ["Open", "Waiting"].includes(row.status) && row.value >= 1000)).toBe(true);
    const invalid = { ...query, columnFilters: [{ id: "openedAt", value: { type: "date-range", from: "2026-02-30" } }] };
    expect((await fetch(`${base}/__open-grid/tickets?session=typed&query=${encodeURIComponent(JSON.stringify(invalid))}`)).status).toBe(400);
  });

  it("resolves all live matches except exclusions and replays a bulk operation idempotently", async () => {
    const selectionQuery = { columnFilters: [{ id: "status", value: { type: "set", values: ["Open"] } }] };
    const selected = { mode: "all-matching", query: selectionQuery, queryKey: getTicketSelectionQueryKey(selectionQuery), excludedIds: ["TCK-0002"] };
    const body = { action: "resolve", operationId: "bulk-1", selection: selected };
    const bulk = (input: unknown) => fetch(`${base}/__open-grid/bulk?session=test`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const first = await bulk(body); expect(first.status).toBe(200);
    const ack = await first.json(); expect(ack.affectedCount).toBeGreaterThan(0);
    expect(await (await bulk(body)).json()).toEqual(ack);
    const page = await (await read()).json();
    expect(page.rows.find((row: { id: string }) => row.id === "TCK-0002").status).toBe("Open");
    expect(page.revisions["TCK-0006"]).toBe(1);
    expect((await bulk({ ...body, selection: { ...selected, excludedIds: [] } })).status).toBe(409);
    expect((await bulk({ ...body, operationId: "bulk-wrong-key", selection: { ...selected, queryKey: "wrong" } })).status).toBe(409);
  });

  it("revalidates explicit IDs against the query and isolates bulk actions by session", async () => {
    const selectionQuery = { columnFilters: [{ id: "status", value: "Open" }] };
    const body = { action: "resolve", operationId: "bulk-explicit", selection: { mode: "explicit", query: selectionQuery,
      queryKey: getTicketSelectionQueryKey(selectionQuery), ids: ["TCK-0001", "TCK-0002", "missing"] } };
    const response = await fetch(`${base}/__open-grid/bulk?session=test`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    expect(await response.json()).toEqual({ matchedCount: 1, affectedCount: 1 });
    const other = await (await read("separate-session")).json();
    expect(other.rows[1].status).toBe("Open");
  });
});
