import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const frameworkApps = [
  {
    framework: "Next.js",
    url: getE2eUrl(4185, "/tickets"),
    filename: "nextjs-app-server-tickets.csv",
  },
  {
    framework: "Nuxt",
    url: getE2eUrl(4186, "/tickets"),
    filename: "nuxt-app-server-tickets.csv",
  },
  {
    framework: "SvelteKit",
    url: getE2eUrl(4187, "/tickets"),
    filename: "sveltekit-app-server-tickets.csv",
  },
] as const;

for (const app of frameworkApps) {
  test(`${app.framework} server export app filters rows and downloads both CSV modes`, async ({ page }) => {
    await page.goto(app.url);

    await expect(page.getByRole("heading", { name: `${app.framework} server export app` })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("6 tickets");

    await page.getByLabel("Account").fill("Acme Labs");
    await page.getByLabel("Status").selectOption("Open");
    await page.getByLabel("Sort").selectOption("value-desc");
    await Promise.all([
      page.waitForURL(/account=Acme(?:\+|%20)Labs.*status=Open.*sort=value-desc/),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ]);

    await expect(page.getByRole("status")).toHaveText("1 ticket");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("FW-001");
    await expect(rows.first()).toContainText("$1,200");

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download CSV" }).click(),
    ]).then(([event]) => event);
    expect(download.suggestedFilename()).toBe(app.filename);

    const streamHref = await page.getByRole("link", { name: "Stream CSV" }).getAttribute("href");
    expect(streamHref).toContain("stream=1");
    const streamResponse = await page.request.get(new URL(streamHref ?? "", app.url).toString());
    expect(streamResponse.ok()).toBe(true);
    expect(streamResponse.headers()["content-disposition"]).toContain(app.filename);
    expect(await streamResponse.text()).toContain("FW-001,Acme Labs,Open,1200");

    await page.setViewportSize({ width: 390, height: 844 });
    const layout = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tableClientWidth: document.querySelector(".table-shell")?.clientWidth ?? 0,
      tableScrollWidth: document.querySelector(".table-shell")?.scrollWidth ?? 0,
    }));
    expect(layout.documentOverflow).toBeLessThanOrEqual(1);
    expect(layout.tableClientWidth).toBeGreaterThan(0);
    expect(layout.tableScrollWidth).toBeGreaterThan(layout.tableClientWidth);
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeInViewport();
    await expect(page.getByRole("link", { name: "Stream CSV" })).toBeInViewport();
  });
}
