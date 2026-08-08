import { readFile } from "node:fs/promises";
import { expect, test, type Locator } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const svelteGridUrl = getE2eUrl(4175);
const svelteServerGridUrl = getE2eUrl(4180);

test("svelte data grid downloads CSV exports", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("open-grid-forecast.csv");
  const path = await download.path();
  expect(path).not.toBeNull();
  const text = await readFile(path as string, "utf8");
  expect(text.split("\n")[0]).toContain("Code,City,Owner");
});

test("svelte data grid applies product-owned root, row, header, and cell classes", async ({ page }) => {
  await page.goto(svelteGridUrl);

  await expect(page.locator(".og-grid").first()).toHaveClass(/forecast-grid/);
  const riskHeader = page.locator('[role="columnheader"][data-column-id="risk"]');
  await expect(riskHeader).toHaveClass(/product-header--risk/);
  const defaultHeaderColor = await page.locator('[role="columnheader"][data-column-id="city"]').evaluate((element) => getComputedStyle(element).color);
  const riskHeaderStyle = await riskHeader.evaluate((element) => ({ color: getComputedStyle(element).color, boxShadow: getComputedStyle(element).boxShadow }));
  expect(riskHeaderStyle.color).not.toBe(defaultHeaderColor);
  expect(riskHeaderStyle.boxShadow).not.toBe("none");
  const lowRiskRow = page.locator('[role="row"][data-row-id="REG-001"]');
  const highRiskRow = page.locator('[role="row"][data-row-id="REG-003"]');
  await expect(lowRiskRow).not.toHaveClass(/product-row--attention/);
  await expect(highRiskRow).toHaveClass(/product-row--attention/);

  const lowRiskBackground = await lowRiskRow.locator(".og-grid__cell").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  const highRiskBackground = await highRiskRow.locator(".og-grid__cell").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(highRiskBackground).not.toBe(lowRiskBackground);

  const riskCells = [
    page.locator('[role="gridcell"][data-row-id="REG-001"][data-column-id="risk"]'),
    page.locator('[role="gridcell"][data-row-id="REG-002"][data-column-id="risk"]'),
    page.locator('[role="gridcell"][data-row-id="REG-003"][data-column-id="risk"]'),
  ];
  await expect(riskCells[0]).toHaveClass(/product-cell--risk-low/);
  await expect(riskCells[1]).toHaveClass(/product-cell--risk-medium/);
  const highRiskCell = riskCells[2];
  await expect(highRiskCell).toHaveClass(/product-cell--risk-high/);
  await expect(highRiskCell).toHaveCSS("font-weight", "700");
  expect(new Set(await getRiskMarkerColors(riskCells)).size).toBe(3);

  await page.getByRole("button", { name: "Use dark theme" }).click();
  expect(new Set(await getRiskMarkerColors(riskCells)).size).toBe(3);
});

async function getRiskMarkerColors(cells: Locator[]): Promise<string[]> {
  return Promise.all(cells.map(async (cell) => cell.evaluate((element) => getComputedStyle(element, "::before").backgroundColor)));
}

test("svelte data grid exposes product-owned column management controls", async ({ page }) => {
  await page.goto(svelteGridUrl);

  await page.getByRole("button", { name: "Manage columns" }).click();
  const panel = page.getByLabel("Column management");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 8 / 8");
  await expect(panel.getByRole("checkbox", { name: "Code" })).toBeDisabled();
  await expect(panel.getByRole("checkbox", { name: "Risk" })).toBeDisabled();

  const ownerCheckbox = panel.getByRole("checkbox", { name: "Owner" });

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 7 / 8");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 8 / 8");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();

  await panel.getByRole("button", { name: "Move Owner left" }).click();
  await expect.poll(async () => getColumnHeaderLeft(page, "owner")).toBeLessThan(await getColumnHeaderLeft(page, "city"));

  await panel.getByRole("button", { name: "Pin Owner right" }).click();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveAttribute("data-pinned", "right");

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 7 / 8");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);

  await panel.getByRole("button", { name: "Reset columns" }).click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 8 / 8");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).not.toHaveAttribute("data-pinned", "right");
  await expect.poll(async () => getColumnHeaderLeft(page, "city")).toBeLessThan(await getColumnHeaderLeft(page, "owner"));
});

test("svelte data grid manages column visibility from the shared controls", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const controls = page.getByLabel("Grid columns");
  await controls.locator("summary").click();
  const search = controls.getByRole("searchbox", { name: "Find columns" });
  await search.fill("owner");
  const ownerCheckbox = controls.getByRole("checkbox", { name: "Owner" });
  await expect(ownerCheckbox).toBeChecked();
  await ownerCheckbox.click();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);
  await expect(controls.getByRole("status")).toHaveText(/\d+ of \d+ columns visible/);
  await controls.getByRole("button", { name: "Show all columns" }).click();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
  await search.fill("missing column");
  await expect(controls.getByText("No columns found")).toBeVisible();
});

test("svelte data grid changes row density from the shared controls", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const grid = page.locator('[data-open-grid="true"]');
  const controls = page.getByRole("group", { name: "Row density" });
  const firstCell = grid.locator('[role="gridcell"][data-row-id]').first();
  await expect(grid).toHaveAttribute("data-density", "standard");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("40px");

  await controls.getByRole("button", { name: "Use compact density" }).click();
  await expect(grid).toHaveAttribute("data-density", "compact");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("32px");

  await controls.getByRole("button", { name: "Use comfortable density" }).click();
  await expect(grid).toHaveAttribute("data-density", "comfortable");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("48px");
});

test("svelte data grid restores and resets persisted product preferences", async ({ page }) => {
  await page.goto(svelteGridUrl);

  await page.getByRole("button", { name: "Manage columns" }).click();
  await page.getByLabel("Column management").getByRole("checkbox", { name: "Owner" }).click();
  await page.getByRole("group", { name: "Row density" }).getByRole("button", { name: "Use compact density" }).click();
  await page.reload();

  await expect(page.locator('[data-open-grid="true"]')).toHaveAttribute("data-density", "compact");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Manage columns" }).click();
  await page.getByLabel("Column management").getByRole("button", { name: "Reset preferences" }).click();
  await expect(page.locator('[data-open-grid="true"]')).toHaveAttribute("data-density", "standard");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("open-grid:reference-preferences:v1"))).toBeNull();

  await page.reload();
  await expect(page.locator('[data-open-grid="true"]')).toHaveAttribute("data-density", "standard");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
});

test("svelte data grid exposes richer header action menus", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const ownerHeader = page.locator('[role="columnheader"][data-column-id="owner"]');
  const menuTrigger = ownerHeader.getByRole("button", { name: "Open owner column menu" });
  const menu = page.getByRole("menu", { name: "owner column menu" });
  await menuTrigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Design tokens")).toBeVisible();
  await expect(menu.getByTestId("svelte-menu-custom-slot")).toHaveText("Width token: owner");
  await expect(menu.getByRole("separator", { name: "Column sizing actions" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sort ascending" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Sort descending" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "Sort ascending" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Set width 220" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitem", { name: "Sort ascending" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuTrigger).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Set width 220" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu).toBeHidden();

  await expect(page.getByTestId("svelte-design-menu-action")).toHaveText("Design menu: none");
  await menuTrigger.click();
  await expect(menu).toBeVisible();
  const designWidthBefore = (await ownerHeader.boundingBox())?.width ?? 0;
  await menu.getByRole("menuitem", { name: "Apply design width token" }).click();
  await expect(page.getByTestId("svelte-design-menu-action")).toHaveText("Design menu: owner width token 180");
  await expect.poll(async () => (await ownerHeader.boundingBox())?.width ?? 0).toBeGreaterThan(designWidthBefore);

  await menuTrigger.click();
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "Sort descending" }).click();
  await expect(ownerHeader).toHaveAttribute("aria-sort", "descending");

  const beforeWidth = (await ownerHeader.boundingBox())?.width ?? 0;
  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Set width 220" }).click();
  await expect.poll(async () => (await ownerHeader.boundingBox())?.width ?? 0).toBeGreaterThan(beforeWidth);

  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Pin right" }).click();
  await expect(ownerHeader).toHaveAttribute("data-pinned", "right");

  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Group by column" }).click();
  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await expect(groupingPanel.locator('[data-column-id="owner"]')).toContainText("Owner");
  await expect(page.locator('[role="row"][data-row-id="__group__owner:Mina"]')).toHaveAttribute("data-grouped-row", "true");
});

test("svelte data grid disables direct header pinning controls for the active pin state", async ({ page }) => {
  await page.goto(svelteServerGridUrl);

  const statusHeader = page.locator('[role="columnheader"][data-column-id="status"]');
  const pinLeft = statusHeader.getByRole("button", { name: "Pin status left" });
  const unpin = statusHeader.getByRole("button", { name: "Unpin status" });
  const pinRight = statusHeader.getByRole("button", { name: "Pin status right" });

  await expect(statusHeader).toBeVisible();
  await expect(pinLeft).toBeEnabled();
  await expect(unpin).toBeDisabled();
  await expect(pinRight).toBeEnabled();

  await pinLeft.click();
  await expect(statusHeader).toHaveAttribute("data-pinned", "left");
  await expect(pinLeft).toBeDisabled();
  await expect(unpin).toBeEnabled();
  await expect(pinRight).toBeEnabled();

  await pinRight.click();
  await expect(statusHeader).toHaveAttribute("data-pinned", "right");
  await expect(pinLeft).toBeEnabled();
  await expect(unpin).toBeEnabled();
  await expect(pinRight).toBeDisabled();

  await unpin.click();
  await expect(statusHeader).not.toHaveAttribute("data-pinned", "right");
  await expect(pinLeft).toBeEnabled();
  await expect(unpin).toBeDisabled();
  await expect(pinRight).toBeEnabled();
});

test("svelte data grid resizes a column with keyboard arrows and Home/End", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const cityHeader = page.locator('[role="columnheader"][data-column-id="city"]');
  const resizeHandle = cityHeader.locator(".og-grid__resize-handle");
  await expect(cityHeader).toBeVisible();
  await expect(resizeHandle).toBeVisible();

  await resizeHandle.focus();
  await expect(resizeHandle).toBeFocused();
  const initialValue = Number(await resizeHandle.getAttribute("aria-valuenow"));

  await resizeHandle.press("ArrowRight");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBeGreaterThan(initialValue);
  const increasedValue = Number(await resizeHandle.getAttribute("aria-valuenow"));

  await resizeHandle.press("Shift+ArrowRight");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow")) - increasedValue).toBeGreaterThanOrEqual(40);
  const shiftedValue = Number(await resizeHandle.getAttribute("aria-valuenow"));

  await resizeHandle.press("ArrowLeft");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBeLessThan(shiftedValue);

  const minValue = Number(await resizeHandle.getAttribute("aria-valuemin"));
  const maxValue = Number(await resizeHandle.getAttribute("aria-valuemax"));
  await resizeHandle.press("End");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBe(maxValue);
  await resizeHandle.press("Home");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBe(minValue);
});

test("svelte data grid selects leaf rows from grouping-panel grouped rows", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);

  const minaGroup = page.locator('[role="row"][data-row-id="__group__owner:Mina"]');
  await expect(minaGroup).toHaveAttribute("data-grouped-row", "true");
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toHaveCount(0);

  await minaGroup.locator(".og-grid__group-label").click();
  await expect(minaGroup).toHaveAttribute("data-selected", "true");

  await minaGroup.locator(".og-grid__group-toggle").click();
  await expect(minaGroup).toHaveAttribute("data-expanded", "true");
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toHaveAttribute("data-selected", "true");
});

test("svelte data grid keeps grouped virtualization bounded at aggregate footers", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const scroller = page.locator(".og-grid__scroller");
  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);

  const minaGroup = page.locator('[role="row"][data-row-id="__group__owner:Mina"]');
  await expect(minaGroup).toHaveAttribute("data-grouped-row", "true");
  await minaGroup.locator(".og-grid__group-toggle").click();
  await expect(minaGroup).toHaveAttribute("data-expanded", "true");

  await scroller.evaluate((element) => {
    element.scrollTop = 20_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const minaFooter = page.locator('[role="row"][data-row-id="__group__owner:Mina>__footer__"]');
  await expect(minaFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(minaFooter).toContainText("Total Mina");

  const stats = await getVirtualizedRenderStats(page);
  expect(stats.rowCount).toBeLessThan(80);
  expect(stats.firstVirtualRowIndex).toBeGreaterThan(100);
  expect(stats.lastVirtualRowIndex).toBeGreaterThan(stats.firstVirtualRowIndex);

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(minaGroup).toHaveAttribute("data-expanded", "true");
});

test("svelte data grid keeps grouping panel reorder virtualization bounded at aggregate footers", async ({ page }) => {
  await page.goto(svelteGridUrl);

  const scroller = page.locator(".og-grid__scroller");
  const groupingPanel = page.locator(".og-grid__grouping-panel");

  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="city"] .og-grid__header-button'), groupingPanel);

  const groupingChips = groupingPanel.locator(".og-grid__grouping-chip");
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "owner");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "city");

  await groupingPanel.getByRole("button", { name: "Move city grouping left" }).click();
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "city");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "owner");

  const seoulGroup = page.locator('[role="row"][data-row-id="__group__city:Seoul"]');
  await expect(seoulGroup).toHaveAttribute("data-grouped-row", "true");
  await seoulGroup.locator(".og-grid__group-toggle").click();
  await expect(seoulGroup).toHaveAttribute("data-expanded", "true");

  for (const owner of ["Mina"]) {
    const ownerGroup = page.locator(`[role="row"][data-row-id="__group__city:Seoul>owner:${owner}"]`);
    await expect(ownerGroup).toHaveAttribute("data-grouped-row", "true");
    await ownerGroup.locator(".og-grid__group-toggle").click();
    await expect(ownerGroup).toHaveAttribute("data-expanded", "true");
  }

  await scroller.evaluate((element) => {
    element.scrollTop = 10_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const seoulFooter = page.locator('[role="row"][data-row-id="__group__city:Seoul>__footer__"]');
  await expect(seoulFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(seoulFooter).toContainText("Total Seoul");

  const stats = await getVirtualizedRenderStats(page);
  expect(stats.rowCount).toBeLessThan(80);
  expect(stats.lastVirtualRowIndex).toBeGreaterThan(stats.firstVirtualRowIndex);
});

test("svelte data grid supports sorting, keyboard navigation, selection, and resizing", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(svelteGridUrl);

  const grid = page.getByRole("grid");
  const scroller = page.locator(".og-grid__scroller");
  await expect(grid).toBeVisible();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status", { name: "Loading rows" })).toContainText("Refreshing forecasts...");
  await page.getByRole("button", { name: "Simulate error" }).click();
  await expect(grid).toHaveAttribute("data-error", "true");
  await expect(grid).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status", { name: "Loading rows" })).toHaveCount(0);
  await expect(page.getByRole("alert", { name: "Grid error" })).toContainText("Forecast service is unavailable.");
  await page.getByRole("button", { name: "Retry loading rows" }).click();
  await expect(grid).not.toHaveAttribute("data-error", "true");
  await expect(page.getByRole("alert", { name: "Grid error" })).toHaveCount(0);
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await page.getByRole("button", { name: "Finish refresh" }).click();
  await expect(grid).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status", { name: "Loading rows" })).toHaveCount(0);
  const headerRows = grid.locator(".og-grid__header > [role='row']");
  const headerRowCount = await headerRows.count();
  await expect(grid).toHaveAttribute("aria-rowcount", String(1000 + headerRowCount));
  for (let index = 0; index < headerRowCount; index += 1) {
    await expect(headerRows.nth(index)).toHaveAttribute("aria-rowindex", String(index + 1));
  }
  const firstBodyRow = grid.locator(".og-grid__body > [role='row'][data-row-id]").first();
  await expect(firstBodyRow).toHaveAttribute("aria-rowindex", String(headerRowCount + 1));
  await expect(firstBodyRow.getByRole("gridcell").first()).toHaveAttribute("aria-colindex", "1");
  const selectionControls = page.getByRole("group", { name: "Row selection" });
  const pageSelection = selectionControls.getByRole("checkbox", { name: "Select all rows on current page" });
  await expect(selectionControls.getByRole("status")).toHaveText("0 rows selected");
  await firstBodyRow.getByRole("gridcell").first().click();
  await expect(pageSelection).toHaveAttribute("aria-checked", "mixed");
  await expect(selectionControls.getByRole("status")).toHaveText("1 row selected");
  await pageSelection.click();
  await expect(pageSelection).toHaveAttribute("aria-checked", "true");
  await expect(selectionControls.getByRole("status")).toHaveText("1000 rows selected");
  await selectionControls.getByRole("button", { name: "Clear row selection" }).click();
  await expect(pageSelection).toHaveAttribute("aria-checked", "false");
  await expect(selectionControls.getByRole("status")).toHaveText("0 rows selected");
  const cityFilter = grid.getByRole("searchbox", { name: "Filter City" });
  await expect(cityFilter).toBeVisible();
  await cityFilter.fill("Tokyo");
  await expect(page.locator('[role="row"][data-row-id="REG-002"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toHaveCount(0);
  await expect.poll(async () => Number(await grid.getAttribute("aria-rowcount"))).toBeLessThan(1000 + headerRowCount);
  await cityFilter.fill("");
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toBeVisible();
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const pageSize = pagination.getByRole("combobox", { name: "Rows per page" });
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 1");
  await pageSize.selectOption("25");
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 40");
  await pagination.getByRole("button", { name: "Next page" }).click();
  await expect(pagination.getByRole("status")).toHaveText("Page 2 of 40");
  await expect(page.locator('[role="row"][data-row-id="REG-026"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toHaveCount(0);
  const quickFilter = page.getByRole("searchbox", { name: "Search all rows" });
  await quickFilter.fill("Tokyo");
  await expect(pagination.getByRole("status")).toHaveText(/^Page 1 of /);
  await expect(page.locator('[role="row"][data-row-id="REG-002"]')).toBeVisible();
  await page.getByRole("button", { name: "Clear row search" }).click();
  await expect(quickFilter).toHaveValue("");
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toBeVisible();
  await pageSize.selectOption("1000");
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 1");
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toBeVisible();
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);
  await expect.poll(async () => page.locator('[role="columnheader"][data-column-id]').count()).toBeLessThan(35);
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: /City/ })).toHaveAttribute("aria-sort", "none");
  const pinnedCityHeader = page.locator('[role="columnheader"][data-column-id="city"]');
  const cityMenu = page.getByRole("menu", { name: "city column menu" });
  await pinnedCityHeader.getByRole("button", { name: "Open city column menu" }).click();
  await cityMenu.getByRole("menuitem", { name: "Pin left" }).click();
  await expect(pinnedCityHeader).toHaveAttribute("data-pinned", "left");
  await expect(grid.locator('.og-grid__filter-cell[data-column-id="city"]')).toHaveAttribute("data-pinned", "left");
  await pinnedCityHeader.getByRole("button", { name: "Open city column menu" }).click();
  await cityMenu.getByRole("menuitem", { name: "Unpin" }).click();
  await expect(pinnedCityHeader).not.toHaveAttribute("data-pinned", "left");

  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await expect(groupingPanel).toContainText("Drag column headers here to group");
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
  await expect(groupingPanel.locator('[data-column-id="owner"]')).toContainText("Owner");
  const minaGroup = page.locator('[role="row"][data-row-id="__group__owner:Mina"]');
  await expect(minaGroup).toHaveAttribute("data-grouped-row", "true");
  const minaToggle = minaGroup.locator(".og-grid__group-toggle");
  await expect(minaToggle).toHaveAttribute("aria-expanded", "false");
  await minaToggle.focus();
  await page.keyboard.press("Enter");
  await expect(minaToggle).toHaveAttribute("aria-expanded", "true");
  await expect(minaGroup).not.toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(minaToggle).toHaveAttribute("aria-expanded", "false");
  await expect(minaGroup).not.toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(minaToggle).toHaveAttribute("aria-expanded", "true");
  await expect(minaGroup).not.toHaveAttribute("data-selected", "true");
  await scroller.evaluate((element) => {
    element.scrollTop = 20_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const minaFooter = page.locator('[role="row"][data-row-id="__group__owner:Mina>__footer__"]');
  await expect(minaFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(minaFooter).toContainText("Total Mina");
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="city"] .og-grid__header-button'), groupingPanel);
  const groupingChips = groupingPanel.locator(".og-grid__grouping-chip");
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "owner");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "city");
  await groupingPanel.getByRole("button", { name: "Move city grouping left" }).click();
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "city");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "owner");
  await expect(page.locator('[role="row"][data-row-id="__group__city:Seoul"]')).toHaveAttribute("data-grouped-row", "true");
  await groupingPanel.getByRole("button", { name: "Remove city grouping" }).click();
  await groupingPanel.getByRole("button", { name: "Remove owner grouping" }).click();
  await expect(page.locator('[role="row"][data-grouped-row="true"]')).toHaveCount(0);

  const firstRow = page.locator('[role="row"][data-row-id="REG-001"]');
  const idCell = page.locator('[role="gridcell"][data-row-id="REG-001"][data-column-id="id"]');
  await idCell.click();
  await expect(firstRow).toHaveAttribute("data-selected", "true");
  const focusedCell = page.locator('[role="gridcell"][data-focused="true"]');
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await page.keyboard.press("Space");
  await expect(firstRow).not.toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(firstRow).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(focusedCell).toHaveAttribute("data-column-id", "city");
  await page.keyboard.press("ArrowLeft");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await page.keyboard.press("End");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "risk");
  await page.keyboard.press("Home");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await page.keyboard.press("ControlOrMeta+End");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-1000");
  await expect(focusedCell).toHaveAttribute("data-column-id", "risk");
  await page.keyboard.press("ControlOrMeta+Home");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await page.keyboard.press("PageDown");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-1000");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await page.keyboard.press("PageUp");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");

  await page.keyboard.press("Shift+End");
  const firstRiskCell = page.locator('[role="gridcell"][data-row-id="REG-001"][data-column-id="risk"]');
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "risk");
  await expect(idCell).toHaveAttribute("data-range-selected", "true");
  await expect(firstRiskCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+Home");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await expect(idCell).toHaveAttribute("data-range-selected", "true");
  await expect(firstRiskCell).not.toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+PageDown");
  const lastIdCell = page.locator('[role="gridcell"][data-row-id="REG-1000"][data-column-id="id"]');
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-1000");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await expect(lastIdCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+ControlOrMeta+End");
  const lastRiskCell = page.locator('[role="gridcell"][data-row-id="REG-1000"][data-column-id="risk"]');
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-1000");
  await expect(focusedCell).toHaveAttribute("data-column-id", "risk");
  await expect(lastRiskCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+ControlOrMeta+Home");
  await expect(focusedCell).toHaveAttribute("data-row-id", "REG-001");
  await expect(focusedCell).toHaveAttribute("data-column-id", "id");
  await expect(idCell).toHaveAttribute("data-range-selected", "true");

  const cityHeaderBeforeReorder = page.locator('[role="columnheader"][data-column-id="city"]');
  const ownerHeaderBeforeReorder = page.locator('[role="columnheader"][data-column-id="owner"]');
  await cityHeaderBeforeReorder.locator(".og-grid__header-button").focus();
  await page.keyboard.press("Shift+Alt+ArrowRight");
  await expect.poll(async () => getColumnHeaderLeft(page, "owner")).toBeLessThan(await getColumnHeaderLeft(page, "city"));
  await cityHeaderBeforeReorder.locator(".og-grid__header-button").focus();
  await page.keyboard.press("Shift+Alt+ArrowLeft");
  await expect.poll(async () => getColumnHeaderLeft(page, "city")).toBeLessThan(await getColumnHeaderLeft(page, "owner"));
  await expect(ownerHeaderBeforeReorder).toBeVisible();

  await expect.poll(async () => (await firstRow.boundingBox())?.height ?? 0).toBeGreaterThan(60);
  await expect.poll(async () => page.locator(".og-grid__body").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(40_000);

  await scrollToVirtualRow(scroller, page.locator('[role="row"][data-row-id="REG-1000"]'));
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="row"][data-row-id="REG-001"]')).toBeVisible();

  await scroller.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="city"]')).toHaveCount(0);
  await expect.poll(async () => page.locator('[role="columnheader"][data-column-id]').count()).toBeLessThan(35);
  const pinnedBounds = await getPinnedBounds(page);
  expect(Math.abs(pinnedBounds.idLeft - pinnedBounds.scrollerLeft)).toBeLessThan(2);
  expect(Math.abs(pinnedBounds.riskRight - pinnedBounds.scrollerRight)).toBeLessThan(2);
  const metric24Bounds = await getColumnAlignmentBounds(page, "metric24");
  expect(Math.abs(metric24Bounds.headerLeft - metric24Bounds.cellLeft)).toBeLessThan(2);
  expect(Math.abs(metric24Bounds.headerWidth - metric24Bounds.cellWidth)).toBeLessThan(2);

  await scroller.evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="columnheader"][data-column-id="city"]')).toBeVisible();

  const cityCell = page.locator('[role="gridcell"][data-row-id="REG-001"][data-column-id="city"]');
  await cityCell.dblclick();
  const cityEditor = cityCell.locator(".og-grid__cell-editor");
  await expect(cityCell).toHaveAttribute("data-editing", "true");
  await expect(cityEditor).toBeFocused();
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server edit: idle");
  await cityEditor.fill("No");
  await cityEditor.press("Enter");
  await expect(cityCell).toHaveAttribute("data-validation-invalid", "true");
  await expect(cityEditor).toHaveAttribute("aria-invalid", "true");
  await expect(cityCell.getByRole("alert")).toContainText("City must be at least 3 characters");
  await expect(cityEditor).toBeVisible();
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server edit: idle");
  await cityEditor.fill("Seoul Edited");
  await cityEditor.press("Enter");
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server edit: saving REG-001 city");
  await expect(cityEditor).toBeVisible();
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server edit: saved REG-001 city = Seoul Edited");
  await expect(cityEditor).toHaveCount(0);
  await expect(cityCell).toContainText("Seoul Edited");
  await cityCell.click();
  await page.evaluate(() => navigator.clipboard.writeText("Busan Server"));
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server paste: saving REG-001 city");
  await expect(page.getByTestId("svelte-server-edit-status")).toHaveText("Server paste: saved REG-001 city = Busan Server");
  await expect(cityCell).toContainText("Busan Server");
  await expect(page.getByLabel("Paste summary")).toContainText("Attempted 1");
  await expect(page.getByLabel("Paste summary")).toContainText("Committed 0");
  await expect(page.getByLabel("Paste summary")).toContainText("Skipped 1");
  await expect(page.getByLabel("Paste summary")).toContainText("Validation 0");
  const ownerCell = page.locator('[role="gridcell"][data-row-id="REG-001"][data-column-id="owner"]');
  const originalOwner = (await ownerCell.textContent())?.trim();
  await ownerCell.dblclick();
  const ownerEditor = ownerCell.locator("select.og-grid__cell-editor");
  await expect(ownerEditor).toBeFocused();
  await ownerEditor.selectOption("Ara");
  await ownerEditor.press("Enter");
  await expect(ownerEditor).toHaveCount(0);
  await expect(ownerCell).toContainText("Ara");
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(ownerCell).toHaveText(originalOwner ?? "");
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(ownerCell).toContainText("Ara");
  const undoEditButton = page.getByRole("button", { name: "Undo edit" });
  const redoEditButton = page.getByRole("button", { name: "Redo edit" });
  await expect(undoEditButton).toBeEnabled();
  await undoEditButton.click();
  await expect(ownerCell).toHaveText(originalOwner ?? "");
  await expect(redoEditButton).toBeEnabled();
  await redoEditButton.click();
  await expect(ownerCell).toContainText("Ara");

  await page.locator('[role="columnheader"][data-column-id="city"] .og-grid__header-button').click();
  await expect(page.getByRole("columnheader", { name: /City/ })).toHaveAttribute("aria-sort", "ascending");

  const cityHeader = page.locator('[role="columnheader"][data-column-id="city"]');
  const beforeWidth = (await cityHeader.boundingBox())?.width ?? 0;
  const resizeHandle = cityHeader.locator(".og-grid__resize-handle");
  await expect(resizeHandle).toBeVisible();
  await expect(resizeHandle).toHaveAttribute("aria-orientation", "vertical");
  await expect(resizeHandle).toHaveAttribute("aria-label", "Resize city column");
  await expect(resizeHandle).toHaveAttribute("tabindex", "0");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  await resizeHandle.dispatchEvent("pointerdown", {
    bubbles: true,
    pointerId: 1,
    clientX: startX,
  });
  await page.evaluate((clientX) => {
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX }));
  }, startX + 48);
  await page.evaluate((clientX) => {
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX }));
  }, startX + 48);
  await expect.poll(async () => (await cityHeader.boundingBox())?.width ?? 0).toBeGreaterThan(beforeWidth);

  await resizeHandle.focus();
  await expect(resizeHandle).toBeFocused();
  const beforeKeyboardValue = Number(await resizeHandle.getAttribute("aria-valuenow"));
  await resizeHandle.press("ArrowRight");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBeGreaterThan(beforeKeyboardValue);
});

async function dragBetweenLocators(start: Locator, end: Locator) {
  const page = start.page();
  const startBox = await start.boundingBox();
  const endBox = await end.boundingBox();

  expect(startBox).not.toBeNull();
  expect(endBox).not.toBeNull();

  const startX = (startBox?.x ?? 0) + (startBox?.width ?? 0) / 2;
  const startY = (startBox?.y ?? 0) + (startBox?.height ?? 0) / 2;
  const endX = (endBox?.x ?? 0) + (endBox?.width ?? 0) / 2;
  const endY = (endBox?.y ?? 0) + (endBox?.height ?? 0) / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 4 });
  await page.mouse.up();
}

async function scrollToVirtualRow(scroller: Locator, row: Locator) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight - element.clientHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    if ((await row.count()) > 0) {
      break;
    }
  }

  await expect(row).toBeVisible();
}

async function getVirtualizedRenderStats(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[role="row"][data-row-id]'));
    const virtualIndexes = rows.map((row) => Number(row.dataset.virtualIndex)).filter(Number.isFinite);

    if (virtualIndexes.length === 0) {
      throw new Error("Virtualized rows were not found");
    }

    return {
      rowCount: rows.length,
      firstVirtualRowIndex: Math.min(...virtualIndexes),
      lastVirtualRowIndex: Math.max(...virtualIndexes),
    };
  });
}

async function getColumnAlignmentBounds(page: import("@playwright/test").Page, columnId: string) {
  return page.evaluate((id) => {
    const header = document.querySelector(`[role="columnheader"][data-column-id="${id}"]`);
    const cell = document.querySelector(`[role="gridcell"][data-column-id="${id}"]`);

    if (!header || !cell) {
      throw new Error(`Column ${id} was not found`);
    }

    const headerBox = header.getBoundingClientRect();
    const cellBox = cell.getBoundingClientRect();

    return {
      headerLeft: headerBox.left,
      headerWidth: headerBox.width,
      cellLeft: cellBox.left,
      cellWidth: cellBox.width,
    };
  }, columnId);
}

async function getPinnedBounds(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector(".og-grid__scroller");
    const id = document.querySelector('[role="columnheader"][data-column-id="id"]');
    const risk = document.querySelector('[role="columnheader"][data-column-id="risk"]');

    if (!scroller || !id || !risk) {
      throw new Error("Pinned grid elements were not found");
    }

    const scrollerBox = scroller.getBoundingClientRect();
    const idBox = id.getBoundingClientRect();
    const riskBox = risk.getBoundingClientRect();

    return {
      scrollerLeft: scrollerBox.left,
      scrollerRight: scrollerBox.right,
      idLeft: idBox.left,
      riskRight: riskBox.right,
    };
  });
}

async function getColumnHeaderLeft(page: import("@playwright/test").Page, columnId: string) {
  return page.evaluate((id) => {
    const header = document.querySelector(`[role="columnheader"][data-column-id="${id}"]`);

    if (!header) {
      throw new Error(`Column ${id} was not found`);
    }

    return header.getBoundingClientRect().left;
  }, columnId);
}
