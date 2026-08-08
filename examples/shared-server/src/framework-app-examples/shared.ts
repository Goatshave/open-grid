import { createTicketExportRouteResponse, getRouteTicketRows, type RouteTicket } from "../framework-route-examples/shared";

export type ServerFrameworkName = "Next.js" | "Nuxt" | "SvelteKit";
const ticketExportQueryKeys = ["account", "status", "sort"] as const;

export type TicketExportPageSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | number | boolean | null | undefined>
  | undefined;

export interface TicketExportPageModel {
  framework: ServerFrameworkName;
  title: string;
  rows: RouteTicket[];
  filteredCount: number;
  activeFilters: {
    account: string;
    status: string;
    sort: string;
  };
  exportHref: string;
  streamingExportHref: string;
}

export interface TicketExportPageModelOptions {
  framework: ServerFrameworkName;
  searchParams?: TicketExportPageSearchParams;
  exportPath: string;
}

export function createTicketExportPageModel(options: TicketExportPageModelOptions): TicketExportPageModel {
  const searchParams = normalizeSearchParams(options.searchParams);
  const rows = getRouteTicketRows(searchParams);

  return {
    framework: options.framework,
    title: `${options.framework} server export app`,
    rows,
    filteredCount: rows.length,
    activeFilters: {
      account: searchParams.get("account") ?? "",
      status: searchParams.get("status") ?? "",
      sort: searchParams.get("sort") ?? "",
    },
    exportHref: createTicketExportHref(options.exportPath, searchParams),
    streamingExportHref: createTicketExportHref(options.exportPath, searchParams, { stream: true }),
  };
}

export function createTicketExportHref(path: string, searchParams: URLSearchParams, options: { stream?: boolean } = {}): string {
  const next = new URLSearchParams();

  for (const key of ticketExportQueryKeys) {
    const value = searchParams.get(key);

    if (value) {
      next.set(key, value);
    }
  }

  if (options.stream) {
    next.set("stream", "1");
  }

  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

export function createFrameworkAppTicketExportResponse(request: Request, filename: string): Response | Promise<Response> {
  const url = new URL(request.url);

  return createTicketExportRouteResponse(url.searchParams, filename);
}

function normalizeSearchParams(input: TicketExportPageSearchParams): URLSearchParams {
  if (!input) {
    return new URLSearchParams();
  }

  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value == null) {
      continue;
    }

    const firstValue = Array.isArray(value) ? value[0] : value;

    if (firstValue != null) {
      searchParams.set(key, String(firstValue));
    }
  }

  return searchParams;
}
