import { describe, expect, test } from "vitest";
import { createProductionTicketExportResponse } from "../src/framework-route-examples/production-query-auth";

describe("production query/auth export recipe", () => {
  test("requires bearer authentication before exporting server rows", async () => {
    const response = await createProductionTicketExportResponse(new Request("https://example.com/api/tickets/export?account=Acme%20Labs"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Authentication is required for server exports." });
  });

  test("accepts case-insensitive bearer auth with trimmed token whitespace", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Northwind&columns=id", {
        headers: { authorization: "bearer   ops-token  " },
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("Ticket\nSEC-002\nSEC-006");
  });

  test("blocks authenticated users without export permission", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Acme%20Labs", {
        headers: { authorization: "Bearer viewer-token" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "The current user cannot export this dataset." });
  });

  test("rejects unsupported query values and columns before generating CSV", async () => {
    const invalidStatus = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?status=Closed", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );
    const invalidColumn = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?columns=id,secret", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(invalidStatus.status).toBe(400);
    expect(invalidStatus.headers.get("cache-control")).toBe("private, no-store");
    await expect(invalidStatus.json()).resolves.toEqual({ error: "Unsupported status filter: Closed" });
    expect(invalidColumn.status).toBe(400);
    await expect(invalidColumn.json()).resolves.toEqual({ error: "Unsupported export column: secret" });
  });

  test("rejects empty explicit column selections before generating CSV", async () => {
    const emptyColumns = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?columns=", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );
    const commaOnlyColumns = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?columns=,%20,", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(emptyColumns.status).toBe(400);
    await expect(emptyColumns.json()).resolves.toEqual({ error: "At least one export column must be requested." });
    expect(commaOnlyColumns.status).toBe(400);
    await expect(commaOnlyColumns.json()).resolves.toEqual({ error: "At least one export column must be requested." });
  });

  test("rejects duplicate explicit column selections before generating CSV", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?columns=id,value,id", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Duplicate export column: id" });
  });

  test("rejects unsupported query keys before generating CSV", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Acme%20Labs&page=2&utm_source=newsletter", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Unsupported export query parameter: page" });
  });

  test("rejects duplicate query keys before generating CSV", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Acme%20Labs&account=Northwind", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Duplicate export query parameter: account" });
  });

  test("enforces account scope and row limits for production exports", async () => {
    const outsideScope = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Northwind", {
        headers: { authorization: "Bearer acme-token" },
      }),
    );
    const tooLarge = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );

    expect(outsideScope.status).toBe(403);
    await expect(outsideScope.json()).resolves.toEqual({ error: "The requested account is outside the user's export scope." });
    expect(tooLarge.status).toBe(413);
    await expect(tooLarge.json()).resolves.toEqual({ error: "Export is limited to 3 rows. Narrow the query before exporting." });
  });

  test("returns a scoped buffered CSV response with only allowlisted columns", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Acme%20Labs&sort=value-desc&columns=id,value", {
        headers: { authorization: "Bearer acme-token" },
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="production-server-tickets.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(text).toBe("Ticket,Value\nSEC-003,1800\nSEC-001,1200\nSEC-005,700");
  });

  test("returns a scoped streaming CSV response after query and auth checks pass", async () => {
    const response = await createProductionTicketExportResponse(
      new Request("https://example.com/api/tickets/export?account=Northwind&stream=1", {
        headers: { authorization: "Bearer ops-token" },
      }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="production-server-tickets.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(text).toBe("Ticket,Account,Status,Value\nSEC-002,Northwind,Waiting,900\nSEC-006,Northwind,Open,2100");
  });
});
