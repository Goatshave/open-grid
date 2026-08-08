import { describe, expect, it } from "vitest";
import {
  createServerGroupingGroupId,
  createServerGroupingTickets,
  formatServerGrouping,
  formatServerGroupingExpanded,
  queryServerGroupingTickets,
} from "../src/index";

describe("server grouping helpers", () => {
  it("filters, sorts, groups, expands, and paginates server-owned rows", () => {
    const tickets = createServerGroupingTickets("TST");
    const result = queryServerGroupingTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      grouping: ["status"],
      expanded: { "group:status%3DWaiting": true },
      pagination: { pageIndex: 0, pageSize: 8 },
    });

    expect(result.totalLeafRows).toBe(40);
    expect(result.totalTopLevelRows).toBe(2);
    expect(result.pageCount).toBe(1);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(8);
    expect(result.rows[0]).toMatchObject({
      id: "group:status%3DWaiting",
      label: "status: Waiting",
      rowType: "group",
      childCount: 20,
      value: tickets
        .filter((ticket) => ticket.account.toLowerCase().includes("acme") && ticket.status === "Waiting")
        .reduce((total, ticket) => total + ticket.value, 0),
    });
    expect(result.rows[0]?.children?.[0]).toMatchObject({
      id: "TST-0235",
      rowType: "ticket",
      value: 20922,
    });
  });

  it("clamps negative server grouping pages to the first grouped page", () => {
    const tickets = createServerGroupingTickets("NEG");
    const result = queryServerGroupingTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      grouping: ["status"],
      expanded: {},
      pagination: { pageIndex: -1, pageSize: 1 },
    });

    expect(result.totalLeafRows).toBe(40);
    expect(result.totalTopLevelRows).toBe(2);
    expect(result.pageCount).toBe(2);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "group:status%3DWaiting",
      label: "status: Waiting",
      rowType: "group",
      childCount: 20,
    });
  });

  it("clamps invalid server grouping page sizes to one top-level row", () => {
    const tickets = createServerGroupingTickets("PSZ");
    const result = queryServerGroupingTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      grouping: ["status"],
      expanded: {},
      pagination: { pageIndex: 0, pageSize: Number.NaN },
    });

    expect(result.totalLeafRows).toBe(40);
    expect(result.totalTopLevelRows).toBe(2);
    expect(result.pageCount).toBe(2);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "group:status%3DWaiting",
      label: "status: Waiting",
      rowType: "group",
      childCount: 20,
    });
  });

  it("formats shared server grouping state labels", () => {
    expect(createServerGroupingGroupId(["status=Backlog", "owner=Mina"])).toBe("group:status%3DBacklog/owner%3DMina");
    expect(formatServerGrouping(["status", "owner"])).toBe("status > owner");
    expect(formatServerGrouping([])).toBe("none");
    expect(formatServerGroupingExpanded({ "group:status%3DBacklog": true, ignored: false })).toBe("group:status%3DBacklog");
    expect(formatServerGroupingExpanded({})).toBe("none");
  });
});
