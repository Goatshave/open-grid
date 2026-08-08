import { describe, expect, it } from "vitest";
import {
  createServerSideTicketExportColumns,
  createServerSideTickets,
  getServerSideTicketRows,
  queryServerSideTickets,
} from "../src/index";

describe("server-side ticket helpers", () => {
  it("creates framework-prefixed ticket fixtures with configurable values and dates", () => {
    const tickets = createServerSideTickets("VUE", { count: 3, valueBase: 1_200, valueStep: 97, openedMonth: "2026-07" });

    expect(tickets).toEqual([
      {
        id: "VUE-0001",
        account: "Acme Labs",
        owner: "Mina",
        status: "Backlog",
        priority: "Low",
        value: 1_200,
        openedAt: "2026-07-01",
      },
      {
        id: "VUE-0002",
        account: "Northwind",
        owner: "Joon",
        status: "Open",
        priority: "Medium",
        value: 1_297,
        openedAt: "2026-07-02",
      },
      {
        id: "VUE-0003",
        account: "Blue River",
        owner: "Ara",
        status: "Waiting",
        priority: "High",
        value: 1_394,
        openedAt: "2026-07-03",
      },
    ]);
  });

  it("filters, sorts, and paginates server-owned ticket rows", () => {
    const tickets = createServerSideTickets("TST");
    const result = queryServerSideTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      pagination: { pageIndex: 1, pageSize: 10 },
    });

    expect(result.totalRows).toBe(40);
    expect(result.pageCount).toBe(4);
    expect(result.pageIndex).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0]?.id).toBe("TST-0175");
    expect(result.rows[0]?.value).toBe(15942);
  });

  it("clamps negative server-owned ticket pages to the first page", () => {
    const tickets = createServerSideTickets("NEG");
    const result = queryServerSideTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      pagination: { pageIndex: -3, pageSize: 10 },
    });

    expect(result.totalRows).toBe(40);
    expect(result.pageCount).toBe(4);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(10);
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0]?.id).toBe("NEG-0235");
    expect(result.rows[0]?.value).toBe(20922);
  });

  it("clamps invalid server-owned ticket page sizes to one row", () => {
    const tickets = createServerSideTickets("PSZ");
    const result = queryServerSideTickets(tickets, {
      sorting: [{ id: "value", desc: true }],
      columnFilters: [{ id: "account", value: "Acme" }],
      pagination: { pageIndex: 0, pageSize: 0 },
    });

    expect(result.totalRows).toBe(40);
    expect(result.pageCount).toBe(40);
    expect(result.pageIndex).toBe(0);
    expect(result.pageSize).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.id).toBe("PSZ-0235");
    expect(result.rows[0]?.value).toBe(20922);
  });

  it("returns full filtered and sorted rows for server export and streaming", () => {
    const tickets = createServerSideTickets("SVL", { valueBase: 1_350, valueStep: 89, openedMonth: "2026-08" });
    const rows = getServerSideTicketRows(tickets, {
      sorting: [{ id: "value", desc: false }],
      columnFilters: [{ id: "account", value: "Acme" }],
    });

    expect(rows).toHaveLength(40);
    expect(rows[0]?.id).toBe("SVL-0001");
    expect(rows.at(-1)?.id).toBe("SVL-0235");
  });

  it("provides the shared server CSV column contract", () => {
    expect(createServerSideTicketExportColumns()).toEqual([
      { id: "id", header: "Ticket" },
      { id: "account", header: "Account" },
      { id: "owner", header: "Owner" },
      { id: "status", header: "Status" },
      { id: "priority", header: "Priority" },
      { id: "value", header: "Value" },
      { id: "openedAt", header: "Opened" },
    ]);
  });
});
