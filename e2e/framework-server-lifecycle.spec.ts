import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const examples = [
  {
    framework: "React",
    url: getE2eUrl(4177),
    heading: "Server lazy tree",
    stateLabel: "Server tree query state",
    paginationLabel: "Server tree pagination",
    loadingTestId: "tree-loading",
    errorsTestId: "tree-errors",
    loadedTestId: "tree-loaded",
  },
  {
    framework: "Vue",
    url: getE2eUrl(4181),
    heading: "Vue server lazy tree",
    stateLabel: "Vue server tree query state",
    paginationLabel: "Vue server tree pagination",
    loadingTestId: "vue-tree-loading",
    errorsTestId: "vue-tree-errors",
    loadedTestId: "vue-tree-loaded",
  },
  {
    framework: "Svelte",
    url: getE2eUrl(4182),
    heading: "Svelte server lazy tree",
    stateLabel: "Svelte server tree query state",
    paginationLabel: "Svelte server tree pagination",
    loadingTestId: "svelte-tree-loading",
    errorsTestId: "svelte-tree-errors",
    loadedTestId: "svelte-tree-loaded",
  },
] as const;

for (const example of examples) {
  test(`${example.framework} exposes accessible server loading, error, retry, and pagination states`, async ({ page }) => {
    await page.goto(example.url);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await expect(page.getByLabel(example.stateLabel)).toBeVisible();

    const loadingStatus = page.getByTestId(example.loadingTestId);
    const errorStatus = page.getByTestId(example.errorsTestId);
    await expect(loadingStatus).toHaveAttribute("role", "status");
    await expect(loadingStatus).toHaveAttribute("aria-live", "polite");
    await expect(loadingStatus).toHaveAttribute("aria-atomic", "true");
    await expect(errorStatus).toHaveAttribute("role", "status");
    await expect(errorStatus).toHaveAttribute("aria-live", "polite");
    await expect(errorStatus).toHaveAttribute("aria-atomic", "true");

    await page.getByRole("button", { name: "Expand PFL-002" }).click();
    await expect(loadingStatus).toHaveText("Loading: PFL-002");
    await expect(page.locator('[role="row"][data-row-id="PFL-002-loading"]')).toContainText("Loading child rows");

    await expect(errorStatus).toContainText("PFL-002: Temporary server error");
    await expect(page.locator('[role="row"][data-row-id="PFL-002-error"]')).toContainText("Temporary server error");
    const errorResults = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(formatViolations(errorResults.violations)).toEqual([]);

    const retry = page.getByRole("button", { name: "Retry PFL-002" });
    await expect(retry).toBeEnabled();
    await retry.focus();
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(errorStatus).toHaveText("Errors: none");
    await expect(loadingStatus).toHaveText("Loading: PFL-002");
    await expect(page.locator('[role="row"][data-row-id="PFL-002-WRK-1"]')).toBeVisible();
    await expect(page.getByTestId(example.loadedTestId)).toContainText("PFL-002");

    const pagination = page.getByRole("navigation", { name: example.paginationLabel });
    const pageStatus = pagination.getByRole("status");
    await expect(pageStatus).toHaveAttribute("aria-live", "polite");
    await expect(pageStatus).toHaveAttribute("aria-atomic", "true");
    await expect(pageStatus).toHaveText("Page 1 / 3");
    await expect(pagination.getByRole("button", { name: "First" })).toBeDisabled();
    await expect(pagination.getByRole("button", { name: "Previous" })).toBeDisabled();

    const next = pagination.getByRole("button", { name: "Next" });
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(pageStatus).toHaveText("Page 2 / 3");
    await expect(pagination.getByRole("button", { name: "First" })).toBeEnabled();
    await expect(pagination.getByRole("button", { name: "Previous" })).toBeEnabled();

    const paginationResults = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(formatViolations(paginationResults.violations)).toEqual([]);
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
