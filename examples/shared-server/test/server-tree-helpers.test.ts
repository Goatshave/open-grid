import { describe, expect, it } from "vitest";
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
} from "../src/index";

describe("server tree helpers", () => {
  it("creates deterministic portfolio and work fixtures", () => {
    const portfolios = createServerTreePortfolios(2);
    const workByPortfolio = createServerTreeWorkByPortfolio(portfolios);

    expect(portfolios).toEqual([
      {
        id: "PFL-001",
        name: "Portfolio 001",
        owner: "Mina",
        region: "Seoul",
        budget: 40000,
        childCount: 4,
      },
      {
        id: "PFL-002",
        name: "Portfolio 002",
        owner: "Joon",
        region: "Tokyo",
        budget: 43750,
        childCount: 4,
      },
    ]);
    expect(workByPortfolio["PFL-001"]?.[0]).toEqual({
      id: "PFL-001-WRK-1",
      portfolioId: "PFL-001",
      name: "Portfolio 001 / work 1",
      owner: "Mina",
      region: "Seoul",
      budget: 6000,
      status: "Active",
    });
  });

  it("sorts, paginates, and attaches loaded server children", () => {
    const portfolios = createServerTreePortfolios();
    const workByPortfolio = createServerTreeWorkByPortfolio(portfolios);
    const result = queryServerTreeRows(
      portfolios,
      {
        sorting: [{ id: "budget", desc: true }],
        expanded: { "PFL-018": true },
        pagination: { pageIndex: 0, pageSize: 6 },
      },
      {
        "PFL-018": (workByPortfolio["PFL-018"] ?? []).map((work) => serverTreeWorkToRow(work, 1, 2, 3)),
      },
      {},
      {},
    );

    expect(result.totalTopLevelRows).toBe(18);
    expect(result.pageCount).toBe(3);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(6);
    expect(result.rows[0]).toMatchObject({
      id: "PFL-018",
      rowType: "portfolio",
      budget: 103750,
    });
    expect(result.rows[0]?.children).toHaveLength(4);
    expect(result.rows[0]?.children?.[0]).toMatchObject({
      id: "PFL-018-WRK-1",
      rowType: "work",
      name: "Portfolio 018 / work 1 (refresh 1) (merged 3) (mutated 2)",
      status: "Blocked",
    });
  });

  it("clamps negative server tree pages to the first page", () => {
    const portfolios = createServerTreePortfolios();
    const result = queryServerTreeRows(
      portfolios,
      {
        sorting: [{ id: "budget", desc: true }],
        expanded: {},
        pagination: { pageIndex: -2, pageSize: 6 },
      },
      {},
      {},
      {},
    );

    expect(result.totalTopLevelRows).toBe(18);
    expect(result.pageCount).toBe(3);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(6);
    expect(result.rows[0]).toMatchObject({
      id: "PFL-018",
      rowType: "portfolio",
      budget: 103750,
    });
  });

  it("clamps invalid server tree page sizes to one top-level row", () => {
    const portfolios = createServerTreePortfolios();
    const result = queryServerTreeRows(
      portfolios,
      {
        sorting: [{ id: "budget", desc: true }],
        expanded: {},
        pagination: { pageIndex: 0, pageSize: Number.POSITIVE_INFINITY },
      },
      {},
      {},
      {},
    );

    expect(result.totalTopLevelRows).toBe(18);
    expect(result.pageCount).toBe(18);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "PFL-018",
      rowType: "portfolio",
      budget: 103750,
    });
  });

  it("attaches loading and error placeholders for expanded unloaded rows", () => {
    const portfolios = createServerTreePortfolios();
    const loadingResult = queryServerTreeRows(
      portfolios,
      { sorting: [], expanded: { "PFL-001": true }, pagination: { pageIndex: 0, pageSize: 6 } },
      {},
      { "PFL-001": true },
      {},
    );
    const errorResult = queryServerTreeRows(
      portfolios,
      { sorting: [], expanded: { "PFL-002": true }, pagination: { pageIndex: 0, pageSize: 6 } },
      {},
      {},
      { "PFL-002": "Temporary server error" },
    );

    expect(loadingResult.rows[0]?.children?.[0]).toMatchObject({
      id: "PFL-001-loading",
      rowType: "loading",
      name: "Loading child rows...",
    });
    expect(errorResult.rows[1]?.children?.[0]).toMatchObject({
      id: "PFL-002-error",
      rowType: "error",
      status: "Temporary server error",
    });
  });

  it("formats server tree status records", () => {
    expect(formatServerTreeExpanded({ "PFL-001": true, "PFL-002": false })).toBe("PFL-001");
    expect(formatServerTreeLoading({ "PFL-003": true })).toBe("PFL-003");
    expect(formatServerTreeErrors({ "PFL-002": "Temporary server error" })).toBe("PFL-002: Temporary server error");
    expect(formatServerTreeCancelled({ "PFL-001": "collapsed before response" })).toBe("PFL-001: collapsed before response");
    expect(formatServerTreeRefreshes({ "PFL-001": 2, "PFL-002": 0 })).toBe("PFL-001: 2");
    expect(formatServerTreeMutating({ "PFL-001-WRK-1": true })).toBe("PFL-001-WRK-1");
    expect(formatServerTreeMutations({ "PFL-001-WRK-1": 1 })).toBe("PFL-001-WRK-1: 1");
    expect(formatServerTreeMutationErrors({ "PFL-001-WRK-2": "Server rejected optimistic mutation" })).toBe(
      "PFL-001-WRK-2: Server rejected optimistic mutation",
    );
    expect(formatServerTreeMerges({ "PFL-001": 3 })).toBe("PFL-001: 3");
    expect(formatServerTreeExpanded({})).toBe("none");
    expect(formatServerTreeErrors({})).toBe("none");
    expect(formatServerTreeRefreshes({})).toBe("none");
  });
});
