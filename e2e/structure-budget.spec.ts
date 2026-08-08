import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { BENCHMARK_DEEP_SCROLL_TOP, type BenchmarkAction, type BenchmarkSnapshot } from "../benchmarks/shared/browser.mjs";
import {
  evaluateStructureBudgets,
  formatStructureBudgetMarkdown,
  type StructureBudgetConfig,
  type StructureBudgetObservation,
} from "../benchmarks/shared/structure-budget.mjs";

const config = JSON.parse(readFileSync(resolve("benchmarks/structure-budgets.json"), "utf8")) as StructureBudgetConfig;

test("keeps Open Grid renderer DOM work within checked-in budgets", async ({ browser }) => {
  const observations: StructureBudgetObservation[] = [];

  for (const profile of config.profiles) {
    for (const application of config.applications) {
      const context = await browser.newContext({ viewport: config.viewport });
      const page = await context.newPage();
      try {
        await page.goto(`${application.url}/?profile=${profile.id}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await expect(page.locator("html")).toHaveAttribute("data-benchmark-ready", "true", { timeout: 120_000 });
        const driverMetadata = await page.evaluate(() => ({
          implementation: window.__OPEN_GRID_BENCHMARK__?.implementation,
          version: window.__OPEN_GRID_BENCHMARK__?.version,
        }));
        expect(driverMetadata).toEqual({ implementation: application.id, version: 15 });

        await runAction(page, { type: "sort", columnId: "column_5", direction: "asc" });
        await runAction(page, { type: "clear" });
        await runAction(page, { type: "filter", value: "Blocked" });
        await runAction(page, { type: "clear" });
        await runAction(page, { type: "scroll", top: BENCHMARK_DEEP_SCROLL_TOP, left: 1_200 });

        observations.push(await page.evaluate(({ applicationId }) => {
          const driver = window.__OPEN_GRID_BENCHMARK__!;
          const snapshot = driver.getSnapshot();
          const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
          let domNodeCount = 0;
          while (walker.nextNode()) domNodeCount += 1;
          return {
            applicationId,
            profileId: snapshot.profileId,
            datasetFingerprint: driver.datasetFingerprint,
            rowCount: snapshot.rowCount,
            columnCount: snapshot.columnCount,
            displayedRowCount: snapshot.displayedRowCount,
            mountedRowCount: snapshot.mountedRowCount,
            mountedCellCount: snapshot.mountedCellCount,
            domElementCount: document.querySelectorAll("*").length,
            domNodeCount,
          };
        }, { applicationId: application.id }));
      } finally {
        await context.close();
      }
    }
  }

  const result = evaluateStructureBudgets(config, observations);
  const report = formatStructureBudgetMarkdown(result);
  await test.info().attach("structure-budget.md", { body: report, contentType: "text/markdown" });
  test.info().annotations.push({ type: "structure-budget", description: `${result.checks.length} checks` });
  expect(result.failures, report).toEqual([]);
});

async function runAction(page: import("@playwright/test").Page, action: BenchmarkAction): Promise<BenchmarkSnapshot> {
  const result = await page.evaluate(async (selectedAction) => {
    const driver = window.__OPEN_GRID_BENCHMARK__!;
    const duration = await driver.measureAction(selectedAction);
    return { duration, snapshot: driver.getSnapshot() };
  }, action);
  expect(result.duration).toBeGreaterThan(0);
  return result.snapshot;
}
