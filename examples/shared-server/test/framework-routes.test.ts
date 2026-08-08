import { describe, expect, test } from "vitest";
import nuxtTicketsExportRoute from "../src/framework-route-examples/nuxt/server/api/tickets/export.get";
import { GET as nextTicketsExportRoute } from "../src/framework-route-examples/nextjs/app/api/tickets/export/route";
import { GET as svelteKitTicketsExportRoute } from "../src/framework-route-examples/sveltekit/src/routes/api/tickets/export/+server";

describe("server framework export route examples", () => {
  test("creates a Next.js route-handler response for filtered server CSV export", async () => {
    const response = await nextTicketsExportRoute(new Request("https://example.com/api/tickets/export?account=Acme&sort=value-desc"));
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="nextjs-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-003,Acme Labs,Resolved,1800\nFW-001,Acme Labs,Open,1200\nFW-005,Acme Labs,Backlog,700");
  });

  test("creates a Nuxt server route response for streaming server CSV export", async () => {
    const response = await nuxtTicketsExportRoute({
      request: new Request("https://example.com/api/tickets/export?status=Open&stream=1"),
    });
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="nuxt-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-001,Acme Labs,Open,1200\nFW-004,Blue River,Open,1500\nFW-006,Northwind,Open,2100");
  });

  test("creates a SvelteKit +server response for filtered server CSV export", async () => {
    const url = new URL("https://example.com/api/tickets/export?account=Northwind");
    const response = await svelteKitTicketsExportRoute({
      url,
      request: new Request(url),
    });
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="sveltekit-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-002,Northwind,Waiting,900\nFW-006,Northwind,Open,2100");
  });
});
