import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import nextPortfoliosPage from "../src/framework-tree-examples/nextjs/app/portfolios/page";
import { GET as nextPortfolioChildrenRoute } from "../src/framework-tree-examples/nextjs/app/api/portfolios/children/route";
import { createNuxtPortfoliosPage } from "../src/framework-tree-examples/nuxt/pages/portfolios";
import nuxtPortfolioChildrenRoute from "../src/framework-tree-examples/nuxt/server/api/portfolios/children.get";
import { load as loadSvelteKitPortfoliosPage } from "../src/framework-tree-examples/sveltekit/src/routes/portfolios/+page";
import { GET as svelteKitPortfolioChildrenRoute } from "../src/framework-tree-examples/sveltekit/src/routes/api/portfolios/children/+server";

describe("server framework tree examples", () => {
  test("wires a Next.js page model to its children route", async () => {
    const page = await nextPortfoliosPage({
      searchParams: {
        expanded: "PFL-001",
        refresh: 2,
      },
    });
    const response = nextPortfolioChildrenRoute(new Request(`https://example.com${page.childHrefs["PFL-001"]}`));
    const payload = await response.json();

    expect(page.framework).toBe("Next.js");
    expect(page.rows.map((row) => row.id)).toEqual(["PFL-001", "PFL-002", "PFL-003"]);
    expect(page.rows[0]?.children?.map((row) => row.id)).toEqual(["PFL-001-WRK-1", "PFL-001-WRK-2", "PFL-001-WRK-3"]);
    expect(page.childHrefs["PFL-001"]).toBe("/api/portfolios/children?portfolioId=PFL-001&refresh=2");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload.portfolioId).toBe("PFL-001");
    expect(payload.rows[0]).toMatchObject({
      id: "PFL-001-WRK-1",
      rowType: "work",
      name: "Portfolio 001 / work 1 (refresh 2)",
    });
  });

  test("wires a Nuxt page model to its children server route", async () => {
    const page = createNuxtPortfoliosPage("https://example.com/portfolios?sort=budget-desc&pageSize=2&page=2");
    const response = nuxtPortfolioChildrenRoute({
      request: new Request(`https://example.com${page.childHrefs["PFL-005"]}`),
    });
    const payload = await response.json();

    expect(page.framework).toBe("Nuxt");
    expect(page.pageCount).toBe(3);
    expect(page.rows.map((row) => row.id)).toEqual(["PFL-005", "PFL-003"]);
    expect(page.childHrefs["PFL-005"]).toBe("/api/portfolios/children?portfolioId=PFL-005");
    expect(payload.rows.map((row: { id: string }) => row.id)).toEqual(["PFL-005-WRK-1", "PFL-005-WRK-2"]);
  });

  test("normalizes malformed framework tree page query params", async () => {
    const nextPage = await nextPortfoliosPage({
      searchParams: {
        page: -4,
        pageSize: 0,
      },
    });
    const nuxtPage = createNuxtPortfoliosPage("https://example.com/portfolios?page=99&pageSize=2");
    const sveltePage = loadSvelteKitPortfoliosPage({
      url: new URL("https://example.com/portfolios?page=NaN&pageSize=Infinity"),
    });

    expect(nextPage.query.pageIndex).toBe(0);
    expect(nextPage.query.pageSize).toBe(1);
    expect(nextPage.pageCount).toBe(6);
    expect(nextPage.rows.map((row) => row.id)).toEqual(["PFL-001"]);

    expect(nuxtPage.query.pageIndex).toBe(2);
    expect(nuxtPage.query.pageSize).toBe(2);
    expect(nuxtPage.pageCount).toBe(3);
    expect(nuxtPage.rows.map((row) => row.id)).toEqual(["PFL-005", "PFL-006"]);

    expect(sveltePage.query.pageIndex).toBe(0);
    expect(sveltePage.query.pageSize).toBe(3);
    expect(sveltePage.pageCount).toBe(2);
    expect(sveltePage.rows.map((row) => row.id)).toEqual(["PFL-001", "PFL-002", "PFL-003"]);
  });

  test("wires a SvelteKit page load model to its children +server route", async () => {
    const url = new URL("https://example.com/portfolios?sort=owner-asc&expanded=PFL-006");
    const page = loadSvelteKitPortfoliosPage({ url });
    const response = svelteKitPortfolioChildrenRoute({
      request: new Request(`https://example.com${page.childHrefs["PFL-006"]}`),
    });
    const payload = await response.json();

    expect(page.framework).toBe("SvelteKit");
    expect(page.query.sort).toBe("owner-asc");
    expect(page.rows.map((row) => row.id)).toEqual(["PFL-003", "PFL-002", "PFL-001"]);
    expect(page.childHrefs["PFL-006"]).toBeUndefined();
    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Unknown portfolioId" });
  });

  test("exports the tree example subpaths used by framework adapters", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      exports: Record<string, unknown>;
    };

    expect(Object.keys(packageJson.exports)).toEqual(
      expect.arrayContaining([
        "./framework-tree-examples/shared",
        "./framework-tree-examples/nextjs/app/portfolios/page",
        "./framework-tree-examples/nextjs/app/api/portfolios/children/route",
        "./framework-tree-examples/nuxt/pages/portfolios",
        "./framework-tree-examples/nuxt/server/api/portfolios/children.get",
        "./framework-tree-examples/sveltekit/src/routes/portfolios/+page",
        "./framework-tree-examples/sveltekit/src/routes/api/portfolios/children/+server",
      ]),
    );
  });
});
