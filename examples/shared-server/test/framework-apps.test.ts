import { describe, expect, test } from "vitest";
import nextTicketsPage from "../src/framework-app-examples/nextjs/app/tickets/page";
import { GET as nextTicketsExportRoute } from "../src/framework-app-examples/nextjs/app/api/tickets/export/route";
import { createNuxtTicketsPage } from "../src/framework-app-examples/nuxt/pages/tickets";
import nuxtTicketsExportRoute from "../src/framework-app-examples/nuxt/server/api/tickets/export.get";
import { load as loadSvelteKitTicketsPage } from "../src/framework-app-examples/sveltekit/src/routes/tickets/+page";
import { GET as svelteKitTicketsExportRoute } from "../src/framework-app-examples/sveltekit/src/routes/api/tickets/export/+server";

describe("full server framework export app examples", () => {
  test("wires a Next.js app page model to its export route", async () => {
    const page = await nextTicketsPage({
      searchParams: {
        account: "Acme",
        sort: "value-desc",
      },
    });
    const response = await nextTicketsExportRoute(new Request(`https://example.com${page.exportHref}`));
    const text = await response.text();

    expect(page.framework).toBe("Next.js");
    expect(page.filteredCount).toBe(3);
    expect(page.rows.map((row) => row.id)).toEqual(["FW-003", "FW-001", "FW-005"]);
    expect(page.exportHref).toBe("/api/tickets/export?account=Acme&sort=value-desc");
    expect(page.streamingExportHref).toBe("/api/tickets/export?account=Acme&sort=value-desc&stream=1");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="nextjs-app-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-003,Acme Labs,Resolved,1800\nFW-001,Acme Labs,Open,1200\nFW-005,Acme Labs,Backlog,700");
  });

  test("wires a Nuxt page model to its server route", async () => {
    const page = createNuxtTicketsPage("https://example.com/tickets?status=Open");
    const response = await nuxtTicketsExportRoute({
      request: new Request(`https://example.com${page.streamingExportHref}`),
    });
    const text = await response.text();

    expect(page.framework).toBe("Nuxt");
    expect(page.filteredCount).toBe(3);
    expect(page.rows.map((row) => row.id)).toEqual(["FW-001", "FW-004", "FW-006"]);
    expect(page.exportHref).toBe("/api/tickets/export?status=Open");
    expect(page.streamingExportHref).toBe("/api/tickets/export?status=Open&stream=1");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="nuxt-app-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-001,Acme Labs,Open,1200\nFW-004,Blue River,Open,1500\nFW-006,Northwind,Open,2100");
  });

  test("wires a SvelteKit page load model to its +server route", async () => {
    const url = new URL("https://example.com/tickets?account=Northwind");
    const page = loadSvelteKitTicketsPage({ url });
    const response = await svelteKitTicketsExportRoute({
      request: new Request(`https://example.com${page.exportHref}`),
    });
    const text = await response.text();

    expect(page.framework).toBe("SvelteKit");
    expect(page.filteredCount).toBe(2);
    expect(page.rows.map((row) => row.id)).toEqual(["FW-002", "FW-006"]);
    expect(page.exportHref).toBe("/api/tickets/export?account=Northwind");
    expect(page.streamingExportHref).toBe("/api/tickets/export?account=Northwind&stream=1");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="sveltekit-app-server-tickets.csv"');
    expect(text).toBe("Ticket,Account,Status,Value\nFW-002,Northwind,Waiting,900\nFW-006,Northwind,Open,2100");
  });

  test("keeps framework app buffered and streaming export links explicit", async () => {
    const nextPage = await nextTicketsPage({
      searchParams: {
        account: "Acme",
        stream: "1",
        utm_source: "newsletter",
      },
    });
    const nuxtPage = createNuxtTicketsPage("https://example.com/tickets?stream=1&status=Open&page=2");
    const sveltePage = loadSvelteKitTicketsPage({
      url: new URL("https://example.com/tickets?sort=value-desc&stream=1&debug=true"),
    });

    for (const page of [nextPage, nuxtPage, sveltePage]) {
      const bufferedUrl = new URL(`https://example.com${page.exportHref}`);
      const streamingUrl = new URL(`https://example.com${page.streamingExportHref}`);

      expect(bufferedUrl.searchParams.has("stream")).toBe(false);
      expect(streamingUrl.searchParams.get("stream")).toBe("1");
      expect(bufferedUrl.searchParams.has("utm_source")).toBe(false);
      expect(bufferedUrl.searchParams.has("page")).toBe(false);
      expect(bufferedUrl.searchParams.has("debug")).toBe(false);
      expect(streamingUrl.searchParams.has("utm_source")).toBe(false);
      expect(streamingUrl.searchParams.has("page")).toBe(false);
      expect(streamingUrl.searchParams.has("debug")).toBe(false);
    }

    expect(new URL(`https://example.com${nextPage.exportHref}`).searchParams.get("account")).toBe("Acme");
    expect(new URL(`https://example.com${nuxtPage.exportHref}`).searchParams.get("status")).toBe("Open");
    expect(new URL(`https://example.com${sveltePage.exportHref}`).searchParams.get("sort")).toBe("value-desc");
  });
});
