import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const example of getPlaywrightUiSmokeTargets()) {
  test(`${example.framework} reference UI has no automated WCAG A or AA violations`, async ({ page }) => {
    await page.goto(example.url);
    await expect(page.locator("[data-open-grid]").first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(wcagTags)
      .analyze();

    expect(formatViolations(results.violations)).toEqual([]);
  });
}

function formatViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }));
}
