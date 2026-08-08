export type ServerTreeFrameworkName = "Next.js" | "Nuxt" | "SvelteKit";

export type ServerTreePageSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | number | boolean | null | undefined>
  | undefined;

export interface ServerTreePortfolio {
  id: string;
  rowType: "portfolio";
  name: string;
  owner: string;
  region: string;
  budget: number;
  childCount: number;
  children?: ServerTreeWork[];
}

export interface ServerTreeWork {
  id: string;
  rowType: "work";
  portfolioId: string;
  name: string;
  owner: string;
  region: string;
  budget: number;
  status: "Active" | "Blocked" | "Planned";
}

export interface ServerTreePageModel {
  framework: ServerTreeFrameworkName;
  title: string;
  rows: ServerTreePortfolio[];
  totalTopLevelRows: number;
  pageCount: number;
  query: {
    pageIndex: number;
    pageSize: number;
    sort: string;
    expanded: string[];
  };
  childHrefs: Record<string, string>;
}

export interface ServerTreePageModelOptions {
  framework: ServerTreeFrameworkName;
  searchParams?: ServerTreePageSearchParams;
  childrenPath: string;
}

export interface ServerTreeChildrenPayload {
  portfolioId: string;
  rows: ServerTreeWork[];
}

const portfolios: Omit<ServerTreePortfolio, "rowType" | "children">[] = [
  { id: "PFL-001", name: "Portfolio 001", owner: "Mina", region: "Seoul", budget: 42000, childCount: 3 },
  { id: "PFL-002", name: "Portfolio 002", owner: "Joon", region: "Tokyo", budget: 47000, childCount: 2 },
  { id: "PFL-003", name: "Portfolio 003", owner: "Ara", region: "Singapore", budget: 52000, childCount: 2 },
  { id: "PFL-004", name: "Portfolio 004", owner: "Theo", region: "Sydney", budget: 61000, childCount: 3 },
  { id: "PFL-005", name: "Portfolio 005", owner: "Sora", region: "Seoul", budget: 58000, childCount: 2 },
  { id: "PFL-006", name: "Portfolio 006", owner: "Mina", region: "Tokyo", budget: 69000, childCount: 3 },
];

const workByPortfolio: Record<string, Omit<ServerTreeWork, "rowType">[]> = Object.fromEntries(
  portfolios.map((portfolio, portfolioIndex) => [
    portfolio.id,
    Array.from({ length: portfolio.childCount }, (_, workIndex) => ({
      id: `${portfolio.id}-WRK-${workIndex + 1}`,
      portfolioId: portfolio.id,
      name: `${portfolio.name} / work ${workIndex + 1}`,
      owner: ["Mina", "Joon", "Ara", "Theo", "Sora"][(portfolioIndex + workIndex) % 5] ?? "Mina",
      region: portfolio.region,
      budget: 6400 + portfolioIndex * 700 + workIndex * 450,
      status: ["Active", "Planned", "Blocked"][(portfolioIndex + workIndex) % 3] as ServerTreeWork["status"],
    })),
  ]),
);

export function createServerTreePageModel(options: ServerTreePageModelOptions): ServerTreePageModel {
  const searchParams = normalizeSearchParams(options.searchParams);
  const query = getServerTreeQuery(searchParams);
  const sortedRows = sortPortfolios(portfolios, query.sort);
  const pageRows = sortedRows.slice(query.pageIndex * query.pageSize, query.pageIndex * query.pageSize + query.pageSize);
  const expanded = new Set(query.expanded);
  const rows = pageRows.map((row) => {
    const portfolio = createPortfolioRow(row);

    if (expanded.has(portfolio.id)) {
      portfolio.children = getServerTreeChildRows(portfolio.id, {
        refresh: getRefreshCount(searchParams),
      });
    }

    return portfolio;
  });

  return {
    framework: options.framework,
    title: `${options.framework} server tree app`,
    rows,
    totalTopLevelRows: sortedRows.length,
    pageCount: Math.max(1, Math.ceil(sortedRows.length / query.pageSize)),
    query,
    childHrefs: Object.fromEntries(rows.map((row) => [row.id, createServerTreeChildrenHref(options.childrenPath, row.id, searchParams)])),
  };
}

export function createServerTreeChildrenRouteResponse(request: Request): Response {
  const url = new URL(request.url);
  const portfolioId = url.searchParams.get("portfolioId");

  if (!portfolioId || !(portfolioId in workByPortfolio)) {
    return createJsonResponse({ error: "Unknown portfolioId" }, 400);
  }

  const payload: ServerTreeChildrenPayload = {
    portfolioId,
    rows: getServerTreeChildRows(portfolioId, {
      refresh: getRefreshCount(url.searchParams),
    }),
  };

  return createJsonResponse(payload);
}

export function createServerTreeChildrenHref(path: string, portfolioId: string, searchParams: URLSearchParams = new URLSearchParams()): string {
  const next = new URLSearchParams();
  next.set("portfolioId", portfolioId);

  const refresh = searchParams.get("refresh");
  if (refresh) {
    next.set("refresh", refresh);
  }

  return `${path}?${next.toString()}`;
}

export function getServerTreeChildRows(portfolioId: string, options: { refresh?: number } = {}): ServerTreeWork[] {
  const refresh = Math.max(0, options.refresh ?? 0);

  return (workByPortfolio[portfolioId] ?? []).map((work) => ({
    ...work,
    rowType: "work",
    name: refresh > 0 ? `${work.name} (refresh ${refresh})` : work.name,
  }));
}

function getServerTreeQuery(searchParams: URLSearchParams): ServerTreePageModel["query"] {
  const pageSize = clampInteger(searchParams.get("pageSize"), 1, 50, 3);
  const page = clampInteger(searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER, 1);
  const pageCount = Math.max(1, Math.ceil(portfolios.length / pageSize));
  const expanded = (searchParams.get("expanded") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    pageIndex: Math.min(page, pageCount) - 1,
    pageSize,
    sort: searchParams.get("sort") ?? "id-asc",
    expanded,
  };
}

function createPortfolioRow(row: Omit<ServerTreePortfolio, "rowType" | "children">): ServerTreePortfolio {
  return {
    ...row,
    rowType: "portfolio",
  };
}

function sortPortfolios(rows: Omit<ServerTreePortfolio, "rowType" | "children">[], sort: string): Omit<ServerTreePortfolio, "rowType" | "children">[] {
  const sorted = [...rows];

  if (sort === "budget-desc") {
    sorted.sort((left, right) => right.budget - left.budget || left.id.localeCompare(right.id));
  } else if (sort === "owner-asc") {
    sorted.sort((left, right) => left.owner.localeCompare(right.owner) || left.id.localeCompare(right.id));
  } else {
    sorted.sort((left, right) => left.id.localeCompare(right.id));
  }

  return sorted;
}

function clampInteger(input: string | null, min: number, max: number, fallback: number): number {
  if (input == null) {
    return fallback;
  }

  const value = Number(input);

  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function getRefreshCount(searchParams: URLSearchParams): number {
  return clampInteger(searchParams.get("refresh"), 0, 100, 0);
}

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function normalizeSearchParams(input: ServerTreePageSearchParams): URLSearchParams {
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
