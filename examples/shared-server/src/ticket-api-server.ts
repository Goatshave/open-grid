import { isISOCalendarDate, isTypedColumnFilterValue } from "@open-grid/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServerSideTickets, getServerSideTicketRows, queryServerSideTickets, type ServerSideTicketFixtureOptions, type ServerSideTicketQuery } from "./index";
import { getTicketSelectionQueryKey, type TicketBulkAck, type TicketBulkRequest, type TicketEditAck, type TicketEditRequest } from "./ticket-api";

type Next = () => void;
interface MiddlewareServer { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: Next) => void) => unknown }; }
const columns = new Set(["id", "account", "owner", "status", "priority", "value", "openedAt"]);

export function createTicketApiHandler(prefix: string, fixture: ServerSideTicketFixtureOptions = {}) {
  type Session = { rows: ReturnType<typeof createServerSideTickets>; revisions: Map<string, number>;
    operations: Map<string, { signature: string; result: TicketEditAck }>;
    bulkOperations: Map<string, { signature: string; result: TicketBulkAck }>; failed: Set<string>; };
  const sessions = new Map<string, Session>();
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" });
    res.end(JSON.stringify(body));
  };
  return (req: IncomingMessage, res: ServerResponse, next: Next = () => { res.writeHead(404); res.end(); }) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/__open-grid/")) { next(); return; }
    void (async () => {
      const sessionId = url.searchParams.get("session");
      if (!sessionId || !/^[\w-]{1,100}$/.test(sessionId)) { send(res, 400, { error: "A valid demo session is required" }); return; }
      let session = sessions.get(sessionId);
      if (!session) {
        if (sessions.size >= 128) sessions.delete(sessions.keys().next().value!);
        session = { rows: createServerSideTickets(prefix, fixture), revisions: new Map(), operations: new Map(), bulkOperations: new Map(), failed: new Set() };
        sessions.set(sessionId, session);
      }
      if (url.pathname === "/__open-grid/tickets" && req.method === "GET") {
        const raw = JSON.parse(url.searchParams.get("query") ?? "{}") as ServerSideTicketQuery;
        if (!Array.isArray(raw.sorting) || !Array.isArray(raw.columnFilters) || !raw.pagination ||
          raw.sorting.some((sort) => !sort || !columns.has(sort.id) || (sort.desc !== undefined && typeof sort.desc !== "boolean")) ||
          raw.columnFilters.some((filter) => !filter || !columns.has(filter.id) || !["string", "number"].includes(typeof filter.value) && !isTypedColumnFilterValue(filter.value)) ||
          typeof raw.pagination.pageIndex !== "number" || typeof raw.pagination.pageSize !== "number") {
          send(res, 400, { error: "Invalid ticket query" }); return;
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
        if (url.searchParams.get("fail") === "1") { send(res, 503, { error: "Ticket service is temporarily unavailable" }); return; }
        const query = { sorting: raw.sorting, columnFilters: raw.columnFilters,
          pagination: { pageIndex: raw.pagination.pageIndex, pageSize: Math.min(10_000, raw.pagination.pageSize) } };
        const result = queryServerSideTickets(session.rows, query);
        const unknown = url.searchParams.get("unknown") === "1";
        send(res, 200, { rows: result.rows, revisions: Object.fromEntries(result.rows.map((row) => [row.id, session!.revisions.get(row.id) ?? 0])),
          pageIndex: result.pageIndex, pageSize: result.pageSize,
          ...(unknown ? {} : { totalRows: result.totalRows, pageCount: result.pageCount }),
          hasNextPage: result.pageIndex < result.pageCount - 1, hasPreviousPage: result.pageIndex > 0,
          query: { ...query, pagination: { pageIndex: result.pageIndex, pageSize: result.pageSize } } });
        return;
      }
      if (url.pathname === "/__open-grid/edits" && req.method === "POST") {
        if (!req.headers["content-type"]?.startsWith("application/json")) { send(res, 415, { error: "JSON body required" }); return; }
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) { send(res, 403, { error: "Same-origin requests required" }); return; }
        let body = "";
        for await (const chunk of req) {
          body += String(chunk);
          if (body.length > 16_384) { send(res, 413, { error: "Edit body too large" }); return; }
        }
        const edit = JSON.parse(body) as TicketEditRequest;
        if (!edit || typeof edit.rowId !== "string" || !["account", "openedAt"].includes(edit.columnId) || typeof edit.value !== "string" ||
          !Number.isInteger(edit.expectedRevision) || edit.expectedRevision < 0 || typeof edit.operationId !== "string" ||
          !edit.operationId || edit.operationId.length > 100 || !["normal", "fail-once", "conflict-once", "validation"].includes(edit.scenario)) {
          send(res, 400, { error: "Invalid edit request" }); return;
        }
        const row = session.rows.find((candidate) => candidate.id === edit.rowId);
        if (!row) { send(res, 404, { error: "Ticket not found" }); return; }
        await new Promise((resolve) => setTimeout(resolve, 160));
        const signature = JSON.stringify([edit.rowId, edit.columnId, edit.value]);
        const previous = session.operations.get(edit.operationId);
        if (previous) {
          send(res, previous.signature === signature ? 200 : 409, previous.signature === signature ? previous.result : { error: "Operation ID belongs to a different edit" });
          return;
        }
        if (edit.value.trim().length < 3 || (edit.columnId === "openedAt" && !isISOCalendarDate(edit.value)) || edit.scenario === "validation") { send(res, 422, { error: edit.columnId === "openedAt" ? "Opened must be an accepted ISO calendar date" : "Account must contain at least 3 characters and be accepted by the server" }); return; }
        const failOnce = !session.failed.has(edit.operationId);
        session.failed.add(edit.operationId);
        if (edit.scenario === "fail-once" && failOnce) { send(res, 503, { error: "Temporary save failure; retry this edit" }); return; }
        if (edit.scenario === "conflict-once" && failOnce) {
          row.account = "Remote account change";
          session.revisions.set(row.id, (session.revisions.get(row.id) ?? 0) + 1);
        }
        const revision = session.revisions.get(row.id) ?? 0;
        if (edit.expectedRevision !== revision) { send(res, 409, { error: "Revision conflict; reload server data before retrying" }); return; }
        row[edit.columnId] = edit.value;
        session.revisions.set(row.id, revision + 1);
        const result = { row: { ...row }, revision: revision + 1 };
        session.operations.set(edit.operationId, { signature, result });
        send(res, 200, result);
        return;
      }
      if (url.pathname === "/__open-grid/bulk" && req.method === "POST") {
        if (!req.headers["content-type"]?.startsWith("application/json")) { send(res, 415, { error: "JSON body required" }); return; }
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { send(res, 403, { error: "Same-origin requests required" }); return; }
        let body = "";
        for await (const chunk of req) {
          body += String(chunk);
          if (body.length > 16_384) { send(res, 413, { error: "Bulk request too large" }); return; }
        }
        const request = JSON.parse(body) as TicketBulkRequest;
        const selection = request?.selection;
        if (request?.action !== "resolve" || typeof request.operationId !== "string" || !request.operationId || request.operationId.length > 100 ||
          !selection || !["explicit", "all-matching"].includes(selection.mode) || !selection.query ||
          !Array.isArray(selection.query.columnFilters) || selection.query.columnFilters.some((filter) => !filter || !columns.has(filter.id) ||
            !["string", "number"].includes(typeof filter.value) && !isTypedColumnFilterValue(filter.value))) {
          send(res, 400, { error: "Invalid bulk request" }); return;
        }
        const ids = selection.mode === "explicit" ? selection.ids : selection.excludedIds;
        if (!Array.isArray(ids) || ids.length > 5000 || ids.some((id) => typeof id !== "string" || !id)) { send(res, 400, { error: "Invalid selection IDs" }); return; }
        if (selection.queryKey !== getTicketSelectionQueryKey(selection.query)) { send(res, 409, { error: "Selection query identity does not match" }); return; }
        const signature = JSON.stringify([request.action, selection.mode, selection.queryKey, [...new Set(ids)].sort()]);
        await new Promise((resolve) => setTimeout(resolve, 160));
        const cached = session.bulkOperations.get(request.operationId);
        if (cached) { send(res, cached.signature === signature ? 200 : 409, cached.signature === signature ? cached.result : { error: "Operation ID belongs to a different bulk action" }); return; }
        const selectedIds = new Set(ids);
        // Re-evaluate the live query within the authorized session at execution time.
        const matching = getServerSideTicketRows(session.rows, { ...selection.query, sorting: [] })
          .filter((row) => selection.mode === "explicit" ? selectedIds.has(row.id) : !selectedIds.has(row.id));
        let affectedCount = 0;
        for (const row of matching) {
          if (row.status === "Resolved") continue;
          row.status = "Resolved"; affectedCount++;
          session.revisions.set(row.id, (session.revisions.get(row.id) ?? 0) + 1);
        }
        const result = { matchedCount: matching.length, affectedCount };
        session.bulkOperations.set(request.operationId, { signature, result });
        send(res, 200, result); return;
      }
      send(res, 404, { error: "Demo route not found" });
    })().catch(() => { if (!res.headersSent) send(res, 400, { error: "Invalid request" }); else res.end(); });
  };
}

/** Local demonstration routes for both Vite dev and preview; not production auth/storage. */
export function ticketApiPlugin(prefix: string, fixture: ServerSideTicketFixtureOptions = {}) {
  const handler = createTicketApiHandler(prefix, fixture);
  const install = (server: MiddlewareServer) => { server.middlewares.use(handler); };
  return { name: "open-grid-ticket-api", configureServer: install, configurePreviewServer: install };
}
