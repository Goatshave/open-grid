import {
  createExportFile,
  type ColumnFiltersState,
  type ExpandedState,
  type ExportFile,
  type ExportFileOptions,
  type GroupingState,
  type PaginationState,
  type SortingState,
} from "@open-grid/core";

export interface ServerCsvExportColumn<TData> {
  id: string;
  header: string;
  value?: (row: TData) => unknown;
}

export interface ServerCsvExportChunkContext {
  chunkIndex: number;
  rowCount: number;
}

export interface ServerCsvExportResult {
  file: ExportFile;
  rowCount: number;
  chunkCount: number;
}

export interface ServerCsvExportOptions<TData> {
  rows: Iterable<TData> | AsyncIterable<TData>;
  columns: readonly ServerCsvExportColumn<TData>[];
  filename: string;
  chunkSize?: number;
  includeByteOrderMark?: boolean;
  onChunk?: (context: ServerCsvExportChunkContext) => void | Promise<void>;
}

export interface StreamingServerCsvResponseOptions<TData> extends Omit<ServerCsvExportOptions<TData>, "onChunk"> {
  onChunk?: (context: ServerCsvExportChunkContext) => void | Promise<void>;
}

export interface ServerSideTicket extends Record<string, string | number> {
  id: string;
  account: string;
  owner: string;
  status: "Backlog" | "Open" | "Waiting" | "Resolved";
  priority: "Low" | "Medium" | "High";
  value: number;
  openedAt: string;
}

export interface ServerSideTicketFixtureOptions {
  count?: number;
  valueBase?: number;
  valueStep?: number;
  openedMonth?: string;
}

export interface ServerSideTicketQuery {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
}

export interface ServerSideTicketResult {
  rows: ServerSideTicket[];
  totalRows: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface ServerTreePortfolio extends Record<string, string | number> {
  id: string;
  name: string;
  owner: string;
  region: string;
  budget: number;
  childCount: number;
}

export interface ServerTreeWork extends Record<string, string | number> {
  id: string;
  portfolioId: string;
  name: string;
  owner: string;
  region: string;
  budget: number;
  status: "Planned" | "Active" | "Blocked";
}

export interface ServerTreeRow extends Record<string, string | number | boolean | ServerTreeRow[] | undefined> {
  id: string;
  rowType: "portfolio" | "work" | "loading" | "error";
  name: string;
  owner: string;
  region: string;
  budget: number;
  status: string;
  childCount?: number;
  children?: ServerTreeRow[];
}

export interface ServerTreeQuery {
  sorting: SortingState;
  expanded: ExpandedState;
  pagination: PaginationState;
}

export interface ServerTreeResult {
  rows: ServerTreeRow[];
  totalTopLevelRows: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface ServerGroupingTicket extends Record<string, string | number> {
  id: string;
  account: string;
  owner: string;
  status: "Backlog" | "Open" | "Waiting" | "Resolved";
  priority: "Low" | "Medium" | "High";
  value: number;
  openedAt: string;
}

export interface ServerGroupingRow extends Record<string, string | number | boolean | ServerGroupingRow[] | undefined> {
  id: string;
  label: string;
  rowType: "group" | "ticket";
  groupLabel?: string;
  groupBy?: string;
  groupValue?: string;
  childCount?: number;
  children?: ServerGroupingRow[];
  account: string;
  owner: string;
  status: string;
  priority: string;
  value: number;
  openedAt: string;
}

export interface ServerGroupingQuery {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  grouping: GroupingState;
  expanded: ExpandedState;
  pagination: PaginationState;
}

export interface ServerGroupingResult {
  rows: ServerGroupingRow[];
  totalLeafRows: number;
  totalTopLevelRows: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
}

const serverGroupingStatuses: ServerGroupingTicket["status"][] = ["Backlog", "Open", "Waiting", "Resolved"];
const serverGroupingPriorities: ServerGroupingTicket["priority"][] = ["Low", "Medium", "High"];
const serverGroupingOwners = ["Mina", "Joon", "Ara", "Theo", "Sora", "Kai"];
const serverGroupingAccounts = ["Acme Labs", "Northwind", "Blue River", "Orbit Systems", "Summit Bank", "Core Studio"];
const serverTreeOwners = ["Mina", "Joon", "Ara", "Theo", "Sora"];
const serverTreeRegions = ["Seoul", "Tokyo", "Singapore", "Sydney"];
const serverTreeStatuses: ServerTreeWork["status"][] = ["Active", "Planned", "Blocked"];

export async function createChunkedServerCsvExport<TData>(options: ServerCsvExportOptions<TData>): Promise<ServerCsvExportResult> {
  const chunkSize = normalizeChunkSize(options.chunkSize);
  const lines = [options.columns.map((column) => escapeCsvValue(column.header)).join(",")];
  let pendingRows: string[] = [];
  let rowCount = 0;
  let chunkCount = 0;

  async function flushChunk() {
    if (pendingRows.length === 0) {
      return;
    }

    lines.push(...pendingRows);
    pendingRows = [];
    chunkCount += 1;
    await options.onChunk?.({ chunkIndex: chunkCount, rowCount });
  }

  for await (const row of options.rows) {
    rowCount += 1;
    pendingRows.push(
      options.columns
        .map((column) => escapeCsvValue(column.value ? column.value(row) : readRowValue(row, column.id)))
        .join(","),
    );

    if (pendingRows.length >= chunkSize) {
      await flushChunk();
    }
  }

  await flushChunk();

  const exportFileOptions: ExportFileOptions = {
    filename: options.filename,
    format: "csv",
  };

  if (options.includeByteOrderMark !== undefined) {
    exportFileOptions.includeByteOrderMark = options.includeByteOrderMark;
  }

  return {
    file: createExportFile(lines.join("\n"), exportFileOptions),
    rowCount,
    chunkCount,
  };
}

export function createServerGroupingTickets(prefix: string, count = 240): ServerGroupingTicket[] {
  return createServerSideTickets(prefix, { count, valueBase: 1_500, valueStep: 83, openedMonth: "2026-06" });
}

export function createServerSideTickets(prefix: string, options: ServerSideTicketFixtureOptions = {}): ServerSideTicket[] {
  const count = options.count ?? 240;
  const valueBase = options.valueBase ?? 1_500;
  const valueStep = options.valueStep ?? 83;
  const openedMonth = options.openedMonth ?? "2026-06";

  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(4, "0")}`,
    account: serverGroupingAccounts[index % serverGroupingAccounts.length] ?? "Acme Labs",
    owner: serverGroupingOwners[index % serverGroupingOwners.length] ?? "Mina",
    status: serverGroupingStatuses[index % serverGroupingStatuses.length] ?? "Open",
    priority: serverGroupingPriorities[index % serverGroupingPriorities.length] ?? "Medium",
    value: valueBase + index * valueStep,
    openedAt: `${openedMonth}-${String((index % 28) + 1).padStart(2, "0")}`,
  }));
}

export function createServerSideTicketExportColumns(): ServerCsvExportColumn<ServerSideTicket>[] {
  return [
    { id: "id", header: "Ticket" },
    { id: "account", header: "Account" },
    { id: "owner", header: "Owner" },
    { id: "status", header: "Status" },
    { id: "priority", header: "Priority" },
    { id: "value", header: "Value" },
    { id: "openedAt", header: "Opened" },
  ];
}

export function queryServerSideTickets(rows: readonly ServerSideTicket[], query: ServerSideTicketQuery): ServerSideTicketResult {
  const sortedRows = getServerSideTicketRows(rows, query);
  const totalRows = sortedRows.length;
  const pageSize = clampServerPageSize(query.pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageIndex = clampServerPageIndex(query.pagination.pageIndex, pageCount);
  const start = pageIndex * pageSize;

  return {
    rows: sortedRows.slice(start, start + pageSize),
    totalRows,
    pageCount,
    pageIndex,
    pageSize,
  };
}

export function getServerSideTicketRows(
  rows: readonly ServerSideTicket[],
  query: Pick<ServerSideTicketQuery, "columnFilters" | "sorting">,
): ServerSideTicket[] {
  return sortServerSideTickets(filterServerSideTickets(rows, query.columnFilters), query.sorting);
}

export function filterServerSideTickets(rows: readonly ServerSideTicket[], columnFilters: ColumnFiltersState): ServerSideTicket[] {
  return columnFilters.reduce<ServerSideTicket[]>((currentRows, filter) => {
    if (filter.value == null || filter.value === "") {
      return currentRows;
    }

    const filterValue = String(filter.value).toLowerCase();
    return currentRows.filter((row) => String(row[filter.id] ?? "").toLowerCase().includes(filterValue));
  }, [...rows]);
}

export function sortServerSideTickets(rows: readonly ServerSideTicket[], sorting: SortingState): ServerSideTicket[] {
  return [...rows].sort((left, right) => {
    for (const rule of sorting) {
      const leftValue = left[rule.id];
      const rightValue = right[rule.id];
      const direction = rule.desc ? -1 : 1;
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });

      if (result !== 0) {
        return result * direction;
      }
    }

    return left.id.localeCompare(right.id);
  });
}

export function createServerTreePortfolios(count = 18): ServerTreePortfolio[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `PFL-${String(index + 1).padStart(3, "0")}`,
    name: `Portfolio ${String(index + 1).padStart(3, "0")}`,
    owner: serverTreeOwners[index % serverTreeOwners.length] ?? "Mina",
    region: serverTreeRegions[index % serverTreeRegions.length] ?? "Seoul",
    budget: 40_000 + index * 3_750,
    childCount: 4,
  }));
}

export function createServerTreeWorkByPortfolio(portfolios: readonly ServerTreePortfolio[]): Record<string, ServerTreeWork[]> {
  return Object.fromEntries(
    portfolios.map((portfolio, portfolioIndex) => [
      portfolio.id,
      Array.from({ length: portfolio.childCount }, (_, childIndex) => ({
        id: `${portfolio.id}-WRK-${childIndex + 1}`,
        portfolioId: portfolio.id,
        name: `${portfolio.name} / work ${childIndex + 1}`,
        owner: serverTreeOwners[(portfolioIndex + childIndex) % serverTreeOwners.length] ?? "Mina",
        region: portfolio.region,
        budget: 6_000 + portfolioIndex * 640 + childIndex * 450,
        status: serverTreeStatuses[(portfolioIndex + childIndex) % serverTreeStatuses.length] ?? "Active",
      })),
    ]),
  );
}

export function queryServerTreeRows(
  portfolios: readonly ServerTreePortfolio[],
  query: ServerTreeQuery,
  loadedChildren: Record<string, ServerTreeRow[]>,
  loading: Record<string, boolean>,
  loadErrors: Record<string, string>,
): ServerTreeResult {
  const sortedRows = sortServerTreePortfolios(portfolios, query.sorting);
  const pageSize = clampServerPageSize(query.pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageIndex = clampServerPageIndex(query.pagination.pageIndex, pageCount);
  const start = pageIndex * pageSize;
  const pageRows = sortedRows.slice(start, start + pageSize).map(serverTreePortfolioToRow);

  return {
    rows: pageRows.map((row) => attachServerTreeChildren(row, query.expanded, loadedChildren, loading, loadErrors)),
    totalTopLevelRows: sortedRows.length,
    pageCount,
    pageIndex,
    pageSize,
  };
}

export function sortServerTreePortfolios(rows: readonly ServerTreePortfolio[], sorting: SortingState): ServerTreePortfolio[] {
  return [...rows].sort((left, right) => {
    for (const rule of sorting) {
      const leftValue = left[rule.id];
      const rightValue = right[rule.id];
      const direction = rule.desc ? -1 : 1;
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });

      if (result !== 0) {
        return result * direction;
      }
    }

    return left.id.localeCompare(right.id);
  });
}

export function attachServerTreeChildren(
  row: ServerTreeRow,
  expanded: ExpandedState,
  loadedChildren: Record<string, ServerTreeRow[]>,
  loading: Record<string, boolean>,
  loadErrors: Record<string, string>,
): ServerTreeRow {
  if (!expanded[row.id]) {
    return row;
  }

  if (loading[row.id]) {
    return {
      ...row,
      children: [createServerTreeLoadingRow(row.id)],
    };
  }

  if (loadErrors[row.id]) {
    return {
      ...row,
      children: [createServerTreeErrorRow(row.id, loadErrors[row.id] ?? "Retry available")],
    };
  }

  return {
    ...row,
    children: loadedChildren[row.id] ?? [],
  };
}

export function serverTreePortfolioToRow(portfolio: ServerTreePortfolio): ServerTreeRow {
  return {
    ...portfolio,
    rowType: "portfolio",
    status: "",
  };
}

export function serverTreeWorkToRow(work: ServerTreeWork, refreshVersion = 0, mutationVersion = 0, mergeVersion = 0): ServerTreeRow {
  const refreshedName = refreshVersion > 0 ? `${work.name} (refresh ${refreshVersion})` : work.name;
  const mergedName = mergeVersion > 0 ? `${refreshedName} (merged ${mergeVersion})` : refreshedName;

  return {
    id: work.id,
    rowType: "work",
    name: mutationVersion > 0 ? `${mergedName} (mutated ${mutationVersion})` : mergedName,
    owner: work.owner,
    region: work.region,
    budget: work.budget,
    status: mutationVersion > 0 ? "Blocked" : work.status,
  };
}

export function createServerTreeLoadingRow(parentId: string): ServerTreeRow {
  return {
    id: `${parentId}-loading`,
    rowType: "loading",
    name: "Loading child rows...",
    owner: "",
    region: "",
    budget: 0,
    status: "",
  };
}

export function createServerTreeErrorRow(parentId: string, error: string): ServerTreeRow {
  return {
    id: `${parentId}-error`,
    rowType: "error",
    name: "Failed to load child rows",
    owner: "",
    region: "",
    budget: 0,
    status: error,
  };
}

export function formatServerTreeExpanded(expanded: ExpandedState): string {
  return formatTruthyRecordKeys(expanded);
}

export function formatServerTreeLoading(loading: Record<string, boolean>): string {
  return formatTruthyRecordKeys(loading);
}

export function formatServerTreeErrors(errors: Record<string, string>): string {
  return formatRecordValues(errors);
}

export function formatServerTreeCancelled(cancelled: Record<string, string>): string {
  return formatRecordValues(cancelled);
}

export function formatServerTreeRefreshes(refreshCounts: Record<string, number>): string {
  return formatPositiveNumberRecord(refreshCounts);
}

export function formatServerTreeMutating(mutating: Record<string, boolean>): string {
  return formatTruthyRecordKeys(mutating);
}

export function formatServerTreeMutations(mutations: Record<string, number>): string {
  return formatPositiveNumberRecord(mutations);
}

export function formatServerTreeMutationErrors(errors: Record<string, string>): string {
  return formatRecordValues(errors);
}

export function formatServerTreeMerges(merges: Record<string, number>): string {
  return formatPositiveNumberRecord(merges);
}

export function queryServerGroupingTickets(rows: readonly ServerGroupingTicket[], query: ServerGroupingQuery): ServerGroupingResult {
  const filteredRows = filterServerSideTickets(rows, query.columnFilters);
  const sortedRows = sortServerSideTickets(filteredRows, query.sorting);
  const topLevelRows =
    query.grouping.length > 0 ? buildServerGroupingRows(sortedRows, query.grouping, query.expanded, []) : sortedRows.map(ticketToServerGroupingRow);
  const pageSize = clampServerPageSize(query.pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(topLevelRows.length / pageSize));
  const pageIndex = clampServerPageIndex(query.pagination.pageIndex, pageCount);
  const start = pageIndex * pageSize;

  return {
    rows: topLevelRows.slice(start, start + pageSize),
    totalLeafRows: filteredRows.length,
    totalTopLevelRows: topLevelRows.length,
    pageCount,
    pageIndex,
    pageSize,
  };
}

export function filterServerGroupingTickets(rows: readonly ServerGroupingTicket[], columnFilters: ColumnFiltersState): ServerGroupingTicket[] {
  return filterServerSideTickets(rows, columnFilters);
}

export function sortServerGroupingTickets(rows: readonly ServerGroupingTicket[], sorting: SortingState): ServerGroupingTicket[] {
  return sortServerSideTickets(rows, sorting);
}

export function buildServerGroupingRows(
  rows: readonly ServerGroupingTicket[],
  grouping: GroupingState,
  expanded: ExpandedState,
  path: string[],
): ServerGroupingRow[] {
  const groupBy = grouping[path.length];

  if (!groupBy) {
    return rows.map(ticketToServerGroupingRow);
  }

  const groups = new Map<string, { rows: ServerGroupingTicket[]; aggregateValue: number }>();

  for (const row of rows) {
    const value = String(row[groupBy] ?? "");
    const group = groups.get(value);
    if (group) {
      group.rows.push(row);
      group.aggregateValue += row.value;
    } else {
      groups.set(value, { rows: [row], aggregateValue: row.value });
    }
  }

  return Array.from(groups.entries()).map(([value, group]) => {
    const nextPath = [...path, `${groupBy}=${value}`];
    const id = createServerGroupingGroupId(nextPath);
    const row: ServerGroupingRow = {
      id,
      label: `${groupBy}: ${value}`,
      rowType: "group",
      groupLabel: `${groupBy}: ${value}`,
      groupBy,
      groupValue: value,
      childCount: group.rows.length,
      account: groupBy === "account" ? value : "",
      owner: groupBy === "owner" ? value : "",
      status: groupBy === "status" ? value : "",
      priority: groupBy === "priority" ? value : "",
      value: group.aggregateValue,
      openedAt: "",
    };

    if (expanded[id] === true) {
      row.children = buildServerGroupingRows(group.rows, grouping, expanded, nextPath);
    }

    return row;
  });
}

export function ticketToServerGroupingRow(ticket: ServerGroupingTicket): ServerGroupingRow {
  return {
    ...ticket,
    label: ticket.id,
    rowType: "ticket",
  };
}

export function createServerGroupingGroupId(path: readonly string[]): string {
  return `group:${path.map((part) => encodeURIComponent(part)).join("/")}`;
}

export function formatServerGrouping(grouping: GroupingState): string {
  return grouping.length > 0 ? grouping.join(" > ") : "none";
}

export function formatServerGroupingExpanded(expanded: ExpandedState): string {
  const expandedIds = Object.entries(expanded)
    .filter(([, value]) => value)
    .map(([id]) => id);

  return expandedIds.length > 0 ? expandedIds.join(", ") : "none";
}

export function areServerGroupingStatesEqual(left: GroupingState, right: GroupingState): boolean {
  return left.length === right.length && left.every((columnId, index) => columnId === right[index]);
}

function formatTruthyRecordKeys(record: Record<string, boolean>): string {
  const ids = Object.entries(record)
    .filter(([, value]) => value)
    .map(([id]) => id);

  return ids.length > 0 ? ids.join(", ") : "none";
}

function formatRecordValues(record: Record<string, string>): string {
  const ids = Object.keys(record);

  return ids.length > 0 ? ids.map((id) => `${id}: ${record[id]}`).join(", ") : "none";
}

function formatPositiveNumberRecord(record: Record<string, number>): string {
  const ids = Object.keys(record).filter((id) => (record[id] ?? 0) > 0);

  return ids.length > 0 ? ids.map((id) => `${id}: ${record[id]}`).join(", ") : "none";
}

function clampServerPageIndex(pageIndex: number, pageCount: number): number {
  return Number.isFinite(pageIndex) ? Math.max(0, Math.min(Math.floor(pageIndex), pageCount - 1)) : 0;
}

function clampServerPageSize(pageSize: number): number {
  return Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
}

export function createServerCsvResponse(file: ExportFile, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", file.mimeType);
  headers.set("content-disposition", `attachment; filename="${escapeHeaderFilename(file.filename)}"`);

  return new Response(file.text, {
    ...init,
    headers,
  });
}

export function createStreamingServerCsvResponse<TData>(options: StreamingServerCsvResponseOptions<TData>, init: ResponseInit = {}): Response {
  const exportFileOptions: ExportFileOptions = {
    filename: options.filename,
    format: "csv",
  };

  if (options.includeByteOrderMark !== undefined) {
    exportFileOptions.includeByteOrderMark = options.includeByteOrderMark;
  }

  const metadata = createExportFile("", exportFileOptions);
  const headers = new Headers(init.headers);
  headers.set("content-type", metadata.mimeType);
  headers.set("content-disposition", `attachment; filename="${escapeHeaderFilename(metadata.filename)}"`);

  return new Response(createServerCsvStream(options), {
    ...init,
    headers,
  });
}

export function escapeCsvValue(value: unknown): string {
  const text = value == null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeChunkSize(chunkSize: number | undefined): number {
  return typeof chunkSize === "number" && Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 100;
}

function createServerCsvStream<TData>(options: StreamingServerCsvResponseOptions<TData>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = toAsyncIterator(options.rows);
  const chunkSize = normalizeChunkSize(options.chunkSize);
  let headerPending = true;
  let rowCount = 0;
  let chunkCount = 0;
  let closed = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (closed) {
        return;
      }

      if (headerPending) {
        headerPending = false;
        const header = options.columns.map((column) => escapeCsvValue(column.header)).join(",");
        controller.enqueue(encoder.encode(`${options.includeByteOrderMark ? "\uFEFF" : ""}${header}`));
        return;
      }

      const lines: string[] = [];

      while (lines.length < chunkSize) {
        const next = await iterator.next();

        if (next.done) {
          closed = true;
          if (lines.length > 0) {
            chunkCount += 1;
            await options.onChunk?.({ chunkIndex: chunkCount, rowCount });
            controller.enqueue(encoder.encode(`\n${lines.join("\n")}`));
          }
          controller.close();
          return;
        }

        rowCount += 1;
        lines.push(
          options.columns
            .map((column) => escapeCsvValue(column.value ? column.value(next.value) : readRowValue(next.value, column.id)))
            .join(","),
        );
      }

      chunkCount += 1;
      await options.onChunk?.({ chunkIndex: chunkCount, rowCount });
      controller.enqueue(encoder.encode(`\n${lines.join("\n")}`));
    },
    async cancel() {
      closed = true;
      await iterator.return?.();
    },
  });
}

function toAsyncIterator<TData>(rows: Iterable<TData> | AsyncIterable<TData>): AsyncIterator<TData> {
  if (Symbol.asyncIterator in rows) {
    return rows[Symbol.asyncIterator]();
  }

  const iterator = rows[Symbol.iterator]();

  return {
    next: async () => iterator.next(),
    return: async () => {
      iterator.return?.();
      return { done: true, value: undefined as TData };
    },
  };
}

function readRowValue<TData>(row: TData, id: string): unknown {
  return typeof row === "object" && row !== null ? (row as Record<string, unknown>)[id] : undefined;
}

function escapeHeaderFilename(filename: string): string {
  return filename.replace(/["\\\r\n]/g, "_");
}
