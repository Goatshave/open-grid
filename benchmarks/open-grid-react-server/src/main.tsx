import "@open-grid/benchmark-shared/app.css";
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";

import { readBenchmarkPageConfig } from "@open-grid/benchmark-shared/browser";
import {
  createDeterministicServerTransport,
  createLatestRequestCoordinator,
  SERVER_BENCHMARK_DEFAULT_DELAY_MS,
  SERVER_BENCHMARK_DRIVER_VERSION,
  type ServerTransportStats,
} from "@open-grid/benchmark-shared/server";
import {
  createServerGroupingGroupId,
  createServerGroupingTickets,
  createServerSideTickets,
  createServerTreePortfolios,
  createServerTreeWorkByPortfolio,
  queryServerGroupingTickets,
  queryServerSideTickets,
  queryServerTreeRows,
  serverTreeWorkToRow,
  type ServerGroupingQuery,
  type ServerGroupingRow,
  type ServerSideTicket,
  type ServerSideTicketQuery,
  type ServerSideTicketResult,
  type ServerTreePortfolio,
  type ServerTreeRow,
} from "@open-grid/example-shared-server";
import {
  createColumnHelper,
  DataGrid,
  type AnyColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GridState,
  type PaginationState,
  type SortingState,
} from "@open-grid/react-ui";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

type ServerBenchmarkMode = "flat" | "group" | "tree";
type ServerBenchmarkAction = "page" | "sort" | "filter" | "cancel" | "group" | "tree" | "patch";

interface ServerBenchmarkRow extends Record<string, unknown> {
  id: string;
  rowType: "ticket" | "group" | "portfolio" | "work";
  label: string;
  account: string;
  owner: string;
  status: string;
  priority: string;
  value: number;
  openedAt: string;
  children?: ServerBenchmarkRow[];
}

interface ServerBenchmarkView {
  mode: ServerBenchmarkMode;
  operation: "initial" | ServerBenchmarkAction;
  rows: ServerBenchmarkRow[];
  totalRows: number;
  pageCount: number;
  revision: number;
}

interface ServerBenchmarkSnapshot {
  mode: ServerBenchmarkMode;
  operation: ServerBenchmarkView["operation"];
  revision: number;
  totalRows: number;
  displayedRows: number;
  mountedRows: number;
  mountedCells: number;
  mountedRowSignature: string;
  sorting: string;
  filter: string;
  pageIndex: number;
  transport: ServerTransportStats;
  staleResponses: number;
}

interface ServerBenchmarkMeasurement {
  action: ServerBenchmarkAction;
  durationMs: number;
  snapshot: ServerBenchmarkSnapshot;
}

interface ServerBenchmarkDriver {
  version: typeof SERVER_BENCHMARK_DRIVER_VERSION;
  ready: boolean;
  profileId: string;
  fixtureFingerprint: string;
  configuredDelayMs: number;
  actions: readonly ServerBenchmarkAction[];
  getSnapshot(): ServerBenchmarkSnapshot;
  measureAction(action: ServerBenchmarkAction): Promise<ServerBenchmarkMeasurement>;
}

declare global {
  interface Window {
    __OPEN_GRID_SERVER_BENCHMARK__?: ServerBenchmarkDriver;
  }
}

const config = readBenchmarkPageConfig();
const ticketCount = config.profile.rowCount;
const tickets = createServerSideTickets("SBT", { count: ticketCount, valueBase: 1_000, valueStep: 17, openedMonth: "2026-07" });
const groupingTickets = createServerGroupingTickets("SBG", ticketCount);
const portfolioCount = Math.max(100, Math.min(2_000, Math.ceil(ticketCount / 10)));
const portfolios = createServerTreePortfolios(portfolioCount);
const workByPortfolio = createServerTreeWorkByPortfolio(portfolios);
const fixtureFingerprint = `server-v1:${ticketCount}:${tickets[0]?.id}:${tickets.at(-1)?.id}:${portfolioCount}`;
const initialQuery: ServerSideTicketQuery = {
  sorting: [],
  columnFilters: [],
  pagination: { pageIndex: 0, pageSize: 100 },
};

const flatTransport = createDeterministicServerTransport((query: ServerSideTicketQuery) => queryServerSideTickets(tickets, query));
const groupingTransport = createDeterministicServerTransport((query: ServerGroupingQuery) => queryServerGroupingTickets(groupingTickets, query));
const treeTransport = createDeterministicServerTransport((input: { kind: "roots" } | { kind: "children"; portfolioId: string }) => {
  if (input.kind === "children") {
    return (workByPortfolio[input.portfolioId] ?? []).map((row) => serverTreeWorkToRow(row));
  }
  return queryServerTreeRows(
    portfolios,
    { sorting: [], expanded: {}, pagination: { pageIndex: 0, pageSize: 25 } },
    {},
    {},
    {},
  );
});
const patchTransport = createDeterministicServerTransport((input: { rows: ServerBenchmarkRow[]; revision: number }) => ({
  rows: updateFirstLeafValue(input.rows, input.revision),
  revision: input.revision,
}));
const latestFlatRequest = createLatestRequestCoordinator();

const column = createColumnHelper<ServerBenchmarkRow>();
const columns: AnyColumnDef<ServerBenchmarkRow>[] = [
  column.accessor("label", { header: "Record", size: 190 }),
  column.accessor("account", { header: "Account", size: 160 }),
  column.accessor("owner", { header: "Owner", size: 120 }),
  column.accessor("status", { header: "Status", size: 120 }),
  column.accessor("priority", { header: "Priority", size: 110 }),
  column.accessor("value", { header: "Value", size: 130 }),
  column.accessor("openedAt", { header: "Opened", size: 130 }),
];
const getRowId = (row: ServerBenchmarkRow) => row.id;
const getSubRows = (row: ServerBenchmarkRow) => row.children;
const getRowCanExpand = (row: ServerBenchmarkRow) => row.rowType === "group" || row.rowType === "portfolio";

function App({ initialResult }: { initialResult: ServerSideTicketResult }) {
  const [view, setView] = useState<ServerBenchmarkView>({
    mode: "flat",
    operation: "initial",
    rows: initialResult.rows.map(ticketToBenchmarkRow),
    totalRows: initialResult.totalRows,
    pageCount: initialResult.pageCount,
    revision: 0,
  });
  const [state, setState] = useState<Partial<GridState>>({
    sorting: [],
    columnFilters: [],
    pagination: initialQuery.pagination,
    expanded: {},
  });
  const viewRef = useRef(view);
  const stateRef = useRef(state);
  viewRef.current = view;
  stateRef.current = state;

  useEffect(() => {
    let disposed = false;
    const driver: ServerBenchmarkDriver = {
      version: SERVER_BENCHMARK_DRIVER_VERSION,
      ready: false,
      profileId: config.profile.id,
      fixtureFingerprint,
      configuredDelayMs: SERVER_BENCHMARK_DEFAULT_DELAY_MS,
      actions: ["page", "sort", "filter", "cancel", "group", "tree", "patch"],
      getSnapshot: () => readSnapshot(viewRef.current, stateRef.current),
      measureAction: (action) => measureServerAction(action, executeAction),
    };
    window.__OPEN_GRID_SERVER_BENCHMARK__ = driver;
    document.documentElement.dataset.serverBenchmarkReady = "false";
    const firstFrame = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (disposed) return;
      driver.ready = true;
      document.documentElement.dataset.serverBenchmarkReady = "true";
    }));

    return () => {
      disposed = true;
      cancelAnimationFrame(firstFrame);
      latestFlatRequest.cancel();
      if (window.__OPEN_GRID_SERVER_BENCHMARK__ === driver) delete window.__OPEN_GRID_SERVER_BENCHMARK__;
    };

    async function executeAction(action: ServerBenchmarkAction) {
      if (action === "page") {
        await commitFlat(action, { ...initialQuery, pagination: { ...initialQuery.pagination, pageIndex: 3 } });
        return;
      }
      if (action === "sort") {
        await commitFlat(action, { ...initialQuery, sorting: [{ id: "value", desc: true }] });
        return;
      }
      if (action === "filter") {
        await commitFlat(action, { ...initialQuery, columnFilters: [{ id: "account", value: "Orbit" }] });
        return;
      }
      if (action === "cancel") {
        const slow = latestFlatRequest.run(({ signal }) => flatTransport.request(
          { ...initialQuery, columnFilters: [{ id: "account", value: "Acme" }] },
          { signal, delayMs: 120 },
        ));
        const latest = latestFlatRequest.run(({ signal }) => flatTransport.request(
          { ...initialQuery, columnFilters: [{ id: "account", value: "Northwind" }] },
          { signal },
        ));
        const latestResult = await latest;
        await slow;
        if (latestResult.status !== "committed") throw new Error("latest server request did not commit");
        commit(
          { mode: "flat", operation: action, rows: latestResult.value.rows.map(ticketToBenchmarkRow), totalRows: latestResult.value.totalRows, pageCount: latestResult.value.pageCount, revision: viewRef.current.revision },
          { sorting: [], columnFilters: [{ id: "account", value: "Northwind" }], pagination: initialQuery.pagination, expanded: {} },
        );
        return;
      }
      if (action === "group") {
        const expanded = Object.fromEntries(["Backlog", "Open", "Waiting", "Resolved"].map((status) => [createServerGroupingGroupId([`status=${status}`]), true]));
        const result = await groupingTransport.request({
          sorting: [{ id: "value", desc: true }],
          columnFilters: [],
          grouping: ["status"],
          expanded,
          pagination: { pageIndex: 0, pageSize: 10 },
        });
        commit(
          { mode: "group", operation: action, rows: result.rows.map(groupToBenchmarkRow), totalRows: result.totalLeafRows, pageCount: result.pageCount, revision: viewRef.current.revision },
          { sorting: [{ id: "value", desc: true }], columnFilters: [], pagination: { pageIndex: 0, pageSize: 10 }, grouping: ["status"], expanded },
        );
        return;
      }
      if (action === "tree") {
        const rootResult = await treeTransport.request({ kind: "roots" });
        if (!("rows" in rootResult)) throw new Error("server tree root request returned children");
        const firstRoot = rootResult.rows[0];
        if (!firstRoot) throw new Error("server tree fixture has no roots");
        const childResult = await treeTransport.request({ kind: "children", portfolioId: firstRoot.id });
        if (!Array.isArray(childResult)) throw new Error("server tree child request returned roots");
        const rows = rootResult.rows.map((row, index) => treeToBenchmarkRow(index === 0 ? { ...row, children: childResult } : row));
        commit(
          { mode: "tree", operation: action, rows, totalRows: rootResult.totalTopLevelRows, pageCount: rootResult.pageCount, revision: viewRef.current.revision },
          { sorting: [], columnFilters: [], pagination: { pageIndex: 0, pageSize: 25 }, grouping: [], expanded: { [firstRoot.id]: true } },
        );
        return;
      }
      if (action === "patch") {
        const nextRevision = viewRef.current.revision + 1;
        const result = await patchTransport.request({ rows: viewRef.current.rows, revision: nextRevision });
        commit({ ...viewRef.current, operation: action, rows: result.rows, revision: result.revision }, stateRef.current);
        return;
      }
      throw new TypeError(`unknown server benchmark action: ${action}`);
    }

    async function commitFlat(action: ServerBenchmarkAction, query: ServerSideTicketQuery) {
      const result = await flatTransport.request(query);
      commit(
        { mode: "flat", operation: action, rows: result.rows.map(ticketToBenchmarkRow), totalRows: result.totalRows, pageCount: result.pageCount, revision: viewRef.current.revision },
        { sorting: query.sorting, columnFilters: query.columnFilters, pagination: query.pagination, grouping: [], expanded: {} },
      );
    }

    function commit(nextView: ServerBenchmarkView, nextState: Partial<GridState>) {
      flushSync(() => {
        setView(nextView);
        setState(nextState);
      });
      viewRef.current = nextView;
      stateRef.current = nextState;
    }
  }, []);

  return (
    <main className="benchmark-app">
      <header className="benchmark-toolbar">
        <div className="benchmark-title">
          <h1>Open Grid Server Workloads</h1>
          <p>{ticketCount.toLocaleString()} tickets / {portfolioCount.toLocaleString()} portfolios / fixed {SERVER_BENCHMARK_DEFAULT_DELAY_MS}ms transport</p>
        </div>
        <div className="benchmark-controls">
          <span data-testid="server-operation">{view.operation}</span>
          <span data-testid="server-mode">{view.mode}</span>
          <span data-testid="server-total">{view.totalRows.toLocaleString()} rows</span>
        </div>
      </header>
      <section className="benchmark-frame" aria-label="Open Grid server benchmark frame">
        <DataGrid
          ariaLabel="Open Grid deterministic server workload"
          data={view.rows}
          columns={columns}
          getRowId={getRowId}
          getSubRows={getSubRows}
          getRowCanExpand={getRowCanExpand}
          state={state}
          onStateChange={setState}
          manualSorting
          manualFiltering
          manualGrouping
          manualPagination
          pageCount={view.pageCount}
          rowVirtualization={{ enabled: true, estimateRowHeight: 40, measureRowHeight: false, overscan: 5 }}
          columnVirtualization={{ enabled: true, measureColumnWidth: false, overscan: 5 }}
        />
      </section>
    </main>
  );
}

async function measureServerAction(action: ServerBenchmarkAction, execute: (action: ServerBenchmarkAction) => Promise<void>): Promise<ServerBenchmarkMeasurement> {
  await nextFrame();
  const start = performance.now();
  await execute(action);
  await nextFrame();
  return { action, durationMs: performance.now() - start, snapshot: window.__OPEN_GRID_SERVER_BENCHMARK__!.getSnapshot() };
}

function readSnapshot(view: ServerBenchmarkView, state: Partial<GridState>): ServerBenchmarkSnapshot {
  const mountedRows = [...document.querySelectorAll<HTMLElement>(".og-grid__body > .og-grid__row")];
  const allStats = [flatTransport, groupingTransport, treeTransport, patchTransport].map((transport) => transport.getStats());
  const transport = allStats.reduce<ServerTransportStats>((total, stats) => ({
    started: total.started + stats.started,
    completed: total.completed + stats.completed,
    aborted: total.aborted + stats.aborted,
    inFlight: total.inFlight + stats.inFlight,
  }), { started: 0, completed: 0, aborted: 0, inFlight: 0 });
  return {
    mode: view.mode,
    operation: view.operation,
    revision: view.revision,
    totalRows: view.totalRows,
    displayedRows: countDisplayedRows(view.rows, state.expanded ?? {}),
    mountedRows: mountedRows.length,
    mountedCells: document.querySelectorAll(".og-grid__body > .og-grid__row > .og-grid__cell").length,
    mountedRowSignature: mountedRows.map((row) => row.dataset.rowId ?? "").join("|"),
    sorting: state.sorting?.map((rule) => `${rule.id}:${rule.desc ? "desc" : "asc"}`).join(",") ?? "",
    filter: String(state.columnFilters?.[0]?.value ?? ""),
    pageIndex: state.pagination?.pageIndex ?? 0,
    transport,
    staleResponses: latestFlatRequest.getStats().staleResponses,
  };
}

function ticketToBenchmarkRow(row: ServerSideTicket): ServerBenchmarkRow {
  return { ...row, rowType: "ticket", label: row.id };
}

function groupToBenchmarkRow(row: ServerGroupingRow): ServerBenchmarkRow {
  const children = row.children?.map(groupToBenchmarkRow);
  return {
    id: row.id,
    rowType: row.rowType,
    label: row.label,
    account: row.account,
    owner: row.owner,
    status: row.status,
    priority: row.priority,
    value: row.value,
    openedAt: row.openedAt,
    ...(children ? { children } : {}),
  };
}

function treeToBenchmarkRow(row: ServerTreeRow): ServerBenchmarkRow {
  const children = row.children?.filter((child) => child.rowType === "work").map(treeToBenchmarkRow);
  return {
    id: row.id,
    rowType: row.rowType === "portfolio" ? "portfolio" : "work",
    label: row.name,
    account: row.region,
    owner: row.owner,
    status: row.status,
    priority: "",
    value: row.budget,
    openedAt: "",
    ...(children ? { children } : {}),
  };
}

function updateFirstLeafValue(rows: ServerBenchmarkRow[], revision: number): ServerBenchmarkRow[] {
  let updated = false;
  const visit = (row: ServerBenchmarkRow): ServerBenchmarkRow => {
    if (!updated && row.rowType === "work") {
      updated = true;
      return { ...row, value: row.value + revision * 100 };
    }
    return row.children ? { ...row, children: row.children.map(visit) } : row;
  };
  const next = rows.map(visit);
  if (!updated) throw new Error("server patch requires a loaded work row");
  return next;
}

function countDisplayedRows(rows: readonly ServerBenchmarkRow[], expanded: ExpandedState): number {
  return rows.reduce((count, row) => count + 1 + (row.children && expanded[row.id] ? countDisplayedRows(row.children, expanded) : 0), 0);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function bootstrap() {
  const initialResult = await flatTransport.request(initialQuery);
  createRoot(document.getElementById("root") as HTMLElement).render(<App initialResult={initialResult} />);
}

void bootstrap();
