import type { ServerSideTicket, ServerSideTicketQuery } from "./index";
import { isTypedColumnFilterValue, type ColumnFiltersState, type ServerSelection } from "@open-grid/core";

export interface TicketSelectionQuery { columnFilters: ColumnFiltersState; }
export interface TicketBulkAck { matchedCount: number; affectedCount: number; }
export interface TicketBulkRequest { action: "resolve"; selection: ServerSelection<TicketSelectionQuery>; operationId: string; }

/** Filter identity excludes pagination and ordering, and normalizes equivalent conditions. */
export function getTicketSelectionQueryKey(query: Readonly<TicketSelectionQuery>): string {
  const conditions = query.columnFilters.flatMap(({ id, value }) => {
    if (value == null || value === "") return [];
    if (typeof value === "string") return [{ id, value: value.toLowerCase() as unknown }];
    if (isTypedColumnFilterValue(value)) {
      if (value.type === "set") return value.values.length ? [{ id, value: [value.type, [...new Set(value.values.map((item) => JSON.stringify(item)))].sort()] }] : [];
      if (value.type === "number-range") return value.min === undefined && value.max === undefined ? [] : [{ id, value: [value.type, value.min ?? null, value.max ?? null] }];
      return value.from === undefined && value.to === undefined ? [] : [{ id, value: [value.type, value.from ?? null, value.to ?? null] }];
    }
    return [{ id, value }];
  });
  return JSON.stringify(conditions.sort((a, b) => a.id.localeCompare(b.id) || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value))));
}

export interface RemoteTicketPage {
  rows: ServerSideTicket[];
  revisions: Record<string, number>;
  pageIndex: number;
  pageSize: number;
  totalRows?: number;
  pageCount?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  query: ServerSideTicketQuery;
}
export interface TicketEditAck {
  row: ServerSideTicket;
  revision: number;
}
export type TicketSaveScenario = "normal" | "fail-once" | "conflict-once" | "validation";
export interface TicketEditRequest {
  rowId: string;
  columnId: string;
  value: string | number;
  expectedRevision: number;
  operationId: string;
  scenario: TicketSaveScenario;
}
export class TicketApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function readTicketApi<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new TicketApiError(response.status, body.error ?? `Request failed: ${response.status}`);
  return body;
}
