import { readFile } from "node:fs/promises";
import { expect, test, type Locator } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const reactServerGridUrl = getE2eUrl(4178);

test("react data grid downloads CSV exports", async ({ page }) => {
  await page.goto("/");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("open-grid-invoices.csv");
  const path = await download.path();
  expect(path).not.toBeNull();
  const text = await readFile(path as string, "utf8");
  expect(text.split("\n")[0]).toContain("Invoice,Customer,Status");
});

test("react data grid applies product-owned root, row, header, and cell classes", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".og-grid").first()).toHaveClass(/invoice-grid/);
  const riskHeader = page.locator('[role="columnheader"][data-column-id="risk"]');
  await expect(riskHeader).toHaveClass(/product-header--risk/);
  const defaultHeaderColor = await page.locator('[role="columnheader"][data-column-id="customer"]').evaluate((element) => getComputedStyle(element).color);
  const riskHeaderStyle = await riskHeader.evaluate((element) => ({ color: getComputedStyle(element).color, boxShadow: getComputedStyle(element).boxShadow }));
  expect(riskHeaderStyle.color).not.toBe(defaultHeaderColor);
  expect(riskHeaderStyle.boxShadow).not.toBe("none");
  const lowRiskRow = page.locator('[role="row"][data-row-id="INV-0001"]');
  const highRiskRow = page.locator('[role="row"][data-row-id="INV-0003"]');
  await expect(lowRiskRow).not.toHaveClass(/product-row--attention/);
  await expect(highRiskRow).toHaveClass(/product-row--attention/);

  const lowRiskBackground = await lowRiskRow.locator(".og-grid__cell").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  const highRiskBackground = await highRiskRow.locator(".og-grid__cell").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(highRiskBackground).not.toBe(lowRiskBackground);

  const riskCells = [
    page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="risk"]'),
    page.locator('[role="gridcell"][data-row-id="INV-0002"][data-column-id="risk"]'),
    page.locator('[role="gridcell"][data-row-id="INV-0003"][data-column-id="risk"]'),
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

test("react data grid exposes product-owned column management controls", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Manage columns" }).click();
  const panel = page.getByLabel("Column management");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 10 / 10");
  await expect(panel.getByRole("checkbox", { name: "Invoice" })).toBeDisabled();
  await expect(panel.getByRole("checkbox", { name: "Amount" })).toBeDisabled();

  const ownerCheckbox = panel.getByRole("checkbox", { name: "Owner" });

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 9 / 10");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 10 / 10");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();

  await panel.getByRole("button", { name: "Move Status left" }).click();
  await expect.poll(async () => getColumnHeaderLeft(page, "status")).toBeLessThan(await getColumnHeaderLeft(page, "customer"));

  await panel.getByRole("button", { name: "Pin Status right" }).click();
  await expect(page.locator('[role="columnheader"][data-column-id="status"]')).toHaveAttribute("data-pinned", "right");

  await ownerCheckbox.click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 9 / 10");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);

  await panel.getByRole("button", { name: "Reset columns" }).click();
  await expect(panel.getByTestId("managed-column-count")).toHaveText("Visible 10 / 10");
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="status"]')).not.toHaveAttribute("data-pinned", "right");
  await expect.poll(async () => getColumnHeaderLeft(page, "customer")).toBeLessThan(await getColumnHeaderLeft(page, "status"));
});

test("react data grid manages column visibility from the shared controls", async ({ page }) => {
  await page.goto("/");

  const controls = page.getByLabel("Grid columns");
  await controls.locator("summary").click();
  await expect(controls.getByRole("status")).toHaveText(/\d+ of \d+ columns visible/);

  const search = controls.getByRole("searchbox", { name: "Find columns" });
  await search.fill("owner");
  const ownerCheckbox = controls.getByRole("checkbox", { name: "Owner" });
  await expect(ownerCheckbox).toBeChecked();
  await ownerCheckbox.click();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toHaveCount(0);
  await expect(controls.getByRole("button", { name: "Show all columns" })).toBeEnabled();

  await controls.getByRole("button", { name: "Show all columns" }).click();
  await expect(page.locator('[role="columnheader"][data-column-id="owner"]')).toBeVisible();
  await search.fill("missing column");
  await expect(controls.getByText("No columns found")).toBeVisible();

  await search.fill("");
  const columnCheckboxes = controls.getByRole("checkbox");
  const columnCount = await columnCheckboxes.count();
  for (let index = 0; index < columnCount - 1; index += 1) {
    await columnCheckboxes.nth(index).uncheck();
  }
  await expect(columnCheckboxes.nth(columnCount - 1)).toBeChecked();
  await expect(columnCheckboxes.nth(columnCount - 1)).toBeDisabled();
  await expect(controls.getByRole("status")).toHaveText(`1 of ${columnCount} columns visible`);
  await controls.getByRole("button", { name: "Show all columns" }).click();
});

test("react data grid changes row density from the shared controls", async ({ page }) => {
  await page.goto("/");

  const grid = page.locator('[data-open-grid="true"]');
  const controls = page.getByRole("group", { name: "Row density" });
  const firstCell = grid.locator('[role="gridcell"][data-row-id]').first();
  await expect(grid).toHaveAttribute("data-density", "standard");
  await expect(controls.getByRole("button", { name: "Use standard density" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("40px");

  await controls.getByRole("button", { name: "Use compact density" }).click();
  await expect(grid).toHaveAttribute("data-density", "compact");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("32px");

  await controls.getByRole("button", { name: "Use comfortable density" }).click();
  await expect(grid).toHaveAttribute("data-density", "comfortable");
  await expect.poll(async () => firstCell.evaluate((element) => getComputedStyle(element).minHeight)).toBe("48px");
});

test("react data grid restores and resets persisted product preferences", async ({ page }) => {
  await page.goto("/");

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

test("react data grid exposes richer header action menus", async ({ page }) => {
  await page.goto("/");

  const statusHeader = page.locator('[role="columnheader"][data-column-id="status"]');
  const menuTrigger = statusHeader.getByRole("button", { name: "Open status column menu" });
  const menu = page.getByRole("menu", { name: "status column menu" });
  await menuTrigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Design tokens")).toBeVisible();
  await expect(menu.getByTestId("react-menu-custom-slot")).toHaveText("Width token: status");
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

  await expect(page.getByTestId("design-menu-action")).toHaveText("Design menu: none");
  await menuTrigger.click();
  await expect(menu).toBeVisible();
  const designWidthBefore = (await statusHeader.boundingBox())?.width ?? 0;
  await menu.getByRole("menuitem", { name: "Apply design width token" }).click();
  await expect(page.getByTestId("design-menu-action")).toHaveText("Design menu: status width token 180");
  await expect.poll(async () => (await statusHeader.boundingBox())?.width ?? 0).toBeGreaterThan(designWidthBefore);

  await menuTrigger.click();
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "Sort descending" }).click();
  await expect(statusHeader).toHaveAttribute("aria-sort", "descending");

  const beforeWidth = (await statusHeader.boundingBox())?.width ?? 0;
  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Set width 220" }).click();
  await expect.poll(async () => (await statusHeader.boundingBox())?.width ?? 0).toBeGreaterThan(beforeWidth);

  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Pin right" }).click();
  await expect(statusHeader).toHaveAttribute("data-pinned", "right");

  await menuTrigger.click();
  await menu.getByRole("menuitem", { name: "Group by column" }).click();
  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await expect(groupingPanel.locator('[data-column-id="status"]')).toContainText("Status");
  await expect(page.locator('[role="row"][data-row-id="__group__status:Overdue"]')).toHaveAttribute("data-grouped-row", "true");
});

test("react data grid disables direct header pinning controls for the active pin state", async ({ page }) => {
  await page.goto(reactServerGridUrl);

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

test("react data grid resizes a column with keyboard arrows and Home/End", async ({ page }) => {
  await page.goto("/");

  const statusHeader = page.locator('[role="columnheader"][data-column-id="status"]');
  const resizeHandle = statusHeader.locator(".og-grid__resize-handle");
  await expect(statusHeader).toBeVisible();
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

test("react data grid supports sorting, focus movement, range selection, fill handles, column reordering, clipboard copy/paste, and resizing", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status", { name: "Loading rows" })).toContainText("Refreshing invoices...");
  await page.getByRole("button", { name: "Simulate error" }).click();
  await expect(grid).toHaveAttribute("data-error", "true");
  await expect(grid).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status", { name: "Loading rows" })).toHaveCount(0);
  await expect(page.getByRole("alert", { name: "Grid error" })).toContainText("Invoice service is unavailable.");
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
  const customerFilter = grid.getByRole("searchbox", { name: "Filter Customer" });
  await expect(customerFilter).toBeVisible();
  await customerFilter.fill("Northwind");
  await expect(page.locator('[role="row"][data-row-id="INV-0002"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveCount(0);
  await expect.poll(async () => Number(await grid.getAttribute("aria-rowcount"))).toBeLessThan(1000 + headerRowCount);
  const filteredCustomerCells = await grid.locator('.og-grid__body [role="gridcell"][data-column-id="customer"]').allTextContents();
  expect(filteredCustomerCells.length).toBeGreaterThan(0);
  expect(filteredCustomerCells.every((text) => text.includes("Northwind"))).toBe(true);
  await customerFilter.fill("");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const pageSize = pagination.getByRole("combobox", { name: "Rows per page" });
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 1");
  await pageSize.selectOption("25");
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 40");
  await pagination.getByRole("button", { name: "Next page" }).click();
  await expect(pagination.getByRole("status")).toHaveText("Page 2 of 40");
  await expect(page.locator('[role="row"][data-row-id="INV-0026"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveCount(0);
  const quickFilter = page.getByRole("searchbox", { name: "Search all rows" });
  await quickFilter.fill("Northwind");
  await expect(pagination.getByRole("status")).toHaveText(/^Page 1 of /);
  await expect(page.locator('[role="row"][data-row-id="INV-0002"]')).toBeVisible();
  await page.getByRole("button", { name: "Clear row search" }).click();
  await expect(quickFilter).toHaveValue("");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
  await pageSize.selectOption("1000");
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 1");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Timeline" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Invoice/ })).toHaveAttribute("aria-sort", "none");

  const scroller = page.locator(".og-grid__scroller");
  await scroller.evaluate((element) => {
    element.scrollTop = 20_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="row"][data-row-id="INV-0500"]')).toBeVisible();
  const stickyVerticalBounds = await getStickyVirtualizedBounds(page);
  expect(Math.abs(stickyVerticalBounds.headerTop - stickyVerticalBounds.scrollerTop)).toBeLessThan(2);
  expect(stickyVerticalBounds.idCellLeft - stickyVerticalBounds.scrollerLeft).toBeLessThan(2);
  expect(Math.abs(stickyVerticalBounds.amountCellRight - stickyVerticalBounds.scrollerRight)).toBeLessThan(2);
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();

  await page.locator('[role="columnheader"][data-column-id="amount"] .og-grid__header-button').click();
  await expect(page.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "ascending");

  const pinnedBefore = await getPinnedBounds(page);
  expect(pinnedBefore.idLeft - pinnedBefore.scrollerLeft).toBeLessThan(2);
  expect(Math.abs(pinnedBefore.amountRight - pinnedBefore.scrollerRight)).toBeLessThan(2);
  await expect(page.locator('[role="columnheader"][data-column-id="id"]')).toHaveAttribute("data-pinned", "left");

  const pinnedCustomerHeader = page.locator('[role="columnheader"][data-column-id="customer"]');
  const customerMenu = page.getByRole("menu", { name: "customer column menu" });
  await pinnedCustomerHeader.getByRole("button", { name: "Open customer column menu" }).click();
  await customerMenu.getByRole("menuitem", { name: "Pin left" }).click();
  await expect(pinnedCustomerHeader).toHaveAttribute("data-pinned", "left");
  const customerPinnedBeforeScroll = await getColumnHeaderBounds(page, "customer");
  expect(customerPinnedBeforeScroll.left - pinnedBefore.scrollerLeft).toBeGreaterThan(120);

  await scroller.evaluate((element) => {
    element.scrollLeft = 640;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const pinnedAfter = await getPinnedBounds(page);
  expect(Math.abs(pinnedAfter.idLeft - pinnedAfter.scrollerLeft)).toBeLessThan(2);
  expect(Math.abs(pinnedAfter.amountRight - pinnedAfter.scrollerRight)).toBeLessThan(2);
  const stickyHorizontalBounds = await getStickyVirtualizedBounds(page);
  expect(Math.abs(stickyHorizontalBounds.headerTop - stickyHorizontalBounds.scrollerTop)).toBeLessThan(2);
  expect(stickyHorizontalBounds.idCellLeft - stickyHorizontalBounds.scrollerLeft).toBeLessThan(2);
  expect(Math.abs(stickyHorizontalBounds.amountCellRight - stickyHorizontalBounds.scrollerRight)).toBeLessThan(2);
  const customerPinnedAfterScroll = await getColumnHeaderBounds(page, "customer");
  expect(Math.abs(customerPinnedAfterScroll.left - customerPinnedBeforeScroll.left)).toBeLessThan(2);

  await pinnedCustomerHeader.getByRole("button", { name: "Open customer column menu" }).click();
  await customerMenu.getByRole("menuitem", { name: "Unpin" }).click();

  await scroller.evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(pinnedCustomerHeader).not.toHaveAttribute("data-pinned", "left");

  await grid.focus();
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");
  const keyboardSelectedFirstRow = page.locator('[role="row"][data-row-id="INV-0001"]');
  await page.keyboard.press("Space");
  await expect(keyboardSelectedFirstRow).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(keyboardSelectedFirstRow).not.toHaveAttribute("data-selected", "true");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "customer");

  await page.keyboard.press("Enter");
  const customerCell = page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="customer"]');
  const customerEditor = customerCell.locator(".og-grid__cell-editor");
  await expect(customerCell).toHaveAttribute("data-editing", "true");
  await expect(customerEditor).toBeFocused();
  await customerEditor.fill("No");
  await customerEditor.press("Enter");
  await expect(customerCell).toHaveAttribute("data-validation-invalid", "true");
  await expect(customerEditor).toHaveAttribute("aria-invalid", "true");
  await expect(customerCell.getByRole("alert")).toContainText("Customer must be at least 3 characters");
  await expect(customerEditor).toBeVisible();
  await expect(page.getByTestId("react-server-edit-status")).toHaveText("Server edit: idle");
  await customerEditor.fill("Acme Labs Edited");
  await customerEditor.press("Enter");
  await expect(page.getByTestId("react-server-edit-status")).toHaveText("Server edit: saving INV-0001 customer");
  await expect(customerEditor).toBeVisible();
  await expect(page.getByTestId("react-server-edit-status")).toHaveText("Server edit: saved INV-0001 customer = Acme Labs Edited");
  await expect(customerEditor).toHaveCount(0);
  await expect(customerCell).toContainText("Acme Labs Edited");

  await page.keyboard.press("Shift+ArrowRight");
  const statusCell = page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="status"]');
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "status");
  await expect(customerCell).toHaveAttribute("data-range-selected", "true");
  await expect(statusCell).toHaveAttribute("data-range-selected", "true");
  await page.keyboard.press("ControlOrMeta+C");
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toBe("Acme Labs Edited\tPaid");

  await page.keyboard.press("ArrowLeft");
  await expect(customerCell).not.toHaveAttribute("data-range-selected", "true");
  await expect(statusCell).not.toHaveAttribute("data-range-selected", "true");
  await page.evaluate(() => navigator.clipboard.writeText("Server Pasted Customer"));
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByTestId("react-server-edit-status")).toHaveText("Server paste: saving INV-0001 customer");
  await expect(page.getByTestId("react-server-edit-status")).toHaveText("Server paste: saved INV-0001 customer = Server Pasted Customer");
  await expect(customerCell).toContainText("Server Pasted Customer");
  await expect(page.getByLabel("Paste summary")).toContainText("Attempted 1");
  await expect(page.getByLabel("Paste summary")).toContainText("Committed 0");
  await expect(page.getByLabel("Paste summary")).toContainText("Skipped 1");
  await statusCell.dblclick();
  const statusEditor = statusCell.locator("select.og-grid__cell-editor");
  await expect(statusEditor).toBeFocused();
  await statusEditor.selectOption("Overdue");
  await statusEditor.press("Enter");
  await expect(statusEditor).toHaveCount(0);
  await expect(statusCell).toContainText("Overdue");
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(statusCell).toContainText("Paid");
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(statusCell).toContainText("Overdue");
  const undoEditButton = page.getByRole("button", { name: "Undo edit" });
  const redoEditButton = page.getByRole("button", { name: "Redo edit" });
  await expect(undoEditButton).toBeEnabled();
  await undoEditButton.click();
  await expect(statusCell).toContainText("Paid");
  await expect(redoEditButton).toBeEnabled();
  await redoEditButton.click();
  await expect(statusCell).toContainText("Overdue");
  await dragBetweenCells(customerCell, statusCell);
  await expect(customerCell).toHaveAttribute("data-range-selected", "true");
  await expect(statusCell).toHaveAttribute("data-range-selected", "true");
  await page.keyboard.press("ControlOrMeta+C");
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toBe("Server Pasted Customer\tOverdue");
  await page.keyboard.press("ArrowLeft");
  await expect(customerCell).not.toHaveAttribute("data-range-selected", "true");
  await expect(statusCell).not.toHaveAttribute("data-range-selected", "true");
  await customerCell.click();
  const secondCustomerCell = page.locator('[role="gridcell"][data-row-id="INV-0002"][data-column-id="customer"]');
  await dragBetweenLocators(customerCell.locator(".og-grid__fill-handle"), secondCustomerCell);
  await expect(secondCustomerCell).toContainText("Server Pasted Customer");

  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "metric3");
  await expect.poll(async () => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await page.keyboard.press("Home");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");

  await page.keyboard.press("ControlOrMeta+End");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-1000");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "amount");

  await page.keyboard.press("ControlOrMeta+Home");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-0001");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");

  await page.keyboard.press("PageDown");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-1000");

  await page.keyboard.press("PageUp");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-0001");

  await page.keyboard.press("Shift+End");
  const firstIdCell = page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="id"]');
  const firstAmountCell = page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="amount"]');
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "amount");
  await expect(firstIdCell).toHaveAttribute("data-range-selected", "true");
  await expect(firstAmountCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+Home");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");
  await expect(firstIdCell).toHaveAttribute("data-range-selected", "true");
  await expect(firstAmountCell).not.toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+PageDown");
  const lastIdCell = page.locator('[role="gridcell"][data-row-id="INV-1000"][data-column-id="id"]');
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-1000");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");
  await expect(lastIdCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+ControlOrMeta+End");
  const lastAmountCell = page.locator('[role="gridcell"][data-row-id="INV-1000"][data-column-id="amount"]');
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-1000");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "amount");
  await expect(lastAmountCell).toHaveAttribute("data-range-selected", "true");

  await page.keyboard.press("Shift+ControlOrMeta+Home");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-row-id", "INV-0001");
  await expect(page.locator('[role="gridcell"][data-focused="true"]')).toHaveAttribute("data-column-id", "id");
  await expect(firstIdCell).toHaveAttribute("data-range-selected", "true");

  await scroller.evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect.poll(async () => scroller.evaluate((element) => element.scrollLeft)).toBe(0);
  await expect(page.locator('[role="columnheader"][data-column-id="customer"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toHaveCount(0);

  const statusHeader = page.locator('[role="columnheader"][data-column-id="status"]');
  const customerHeader = page.locator('[role="columnheader"][data-column-id="customer"]');
  await statusHeader.locator(".og-grid__header-button").focus();
  await page.keyboard.press("Shift+Alt+ArrowLeft");
  await expect.poll(async () => getColumnHeaderLeft(page, "status")).toBeLessThan(await getColumnHeaderLeft(page, "customer"));
  await statusHeader.locator(".og-grid__header-button").focus();
  await page.keyboard.press("Shift+Alt+ArrowRight");
  await expect.poll(async () => getColumnHeaderLeft(page, "customer")).toBeLessThan(await getColumnHeaderLeft(page, "status"));
  await dragBetweenLocators(customerHeader.locator(".og-grid__header-button"), statusHeader.locator(".og-grid__header-button"));
  await expect.poll(async () => getColumnHeaderLeft(page, "status")).toBeLessThan(await getColumnHeaderLeft(page, "customer"));
  await dragBetweenLocators(customerHeader.locator(".og-grid__header-button"), statusHeader.locator(".og-grid__header-button"));
  await expect.poll(async () => getColumnHeaderLeft(page, "customer")).toBeLessThan(await getColumnHeaderLeft(page, "status"));

  const firstRow = page.locator('[role="row"][data-row-id="INV-0001"]');
  await page.locator('[role="gridcell"][data-row-id="INV-0001"][data-column-id="id"]').click();
  await expect(firstRow).toHaveAttribute("data-selected", "true");

  const beforeWidth = (await customerHeader.boundingBox())?.width ?? 0;
  const resizeHandle = customerHeader.locator(".og-grid__resize-handle");
  await expect(resizeHandle).toBeVisible();
  await expect(resizeHandle).toHaveAttribute("aria-orientation", "vertical");
  await expect(resizeHandle).toHaveAttribute("aria-label", "Resize customer column");
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
  }, startX + 64);
  await page.evaluate((clientX) => {
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX }));
  }, startX + 64);
  await expect.poll(async () => (await customerHeader.boundingBox())?.width ?? 0).toBeGreaterThan(beforeWidth);
  const afterPointerWidth = (await customerHeader.boundingBox())?.width ?? beforeWidth;

  await resizeHandle.focus();
  await expect(resizeHandle).toBeFocused();
  const beforeKeyboardValue = Number(await resizeHandle.getAttribute("aria-valuenow"));
  await resizeHandle.press("ArrowRight");
  await expect.poll(async () => Number(await resizeHandle.getAttribute("aria-valuenow"))).toBeGreaterThan(beforeKeyboardValue);

  await scroller.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="customer"]')).toHaveCount(0);
  const metric24Bounds = await getColumnAlignmentBounds(page, "metric24");
  expect(Math.abs(metric24Bounds.headerLeft - metric24Bounds.cellLeft)).toBeLessThan(2);
  expect(Math.abs(metric24Bounds.headerWidth - metric24Bounds.cellWidth)).toBeLessThan(2);

  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);
});

test("react data grid renders grouped rows and expansion controls", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Group status" }).click();

  const paidGroup = page.locator('[role="row"][data-row-id="__group__status:Paid"]');
  await expect(paidGroup).toHaveAttribute("data-grouped-row", "true");
  await expect(paidGroup).toContainText("status: Paid");
  await expect(paidGroup).toContainText("250");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveCount(0);

  const toggle = paidGroup.locator(".og-grid__group-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(paidGroup).toHaveAttribute("data-expanded", "true");
  await expect(paidGroup).not.toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(paidGroup).not.toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(paidGroup).not.toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
  await page.locator(".og-grid__scroller").evaluate((element) => {
    element.scrollTop = 10_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const paidFooter = page.locator('[role="row"][data-row-id="__group__status:Paid>__footer__"]');
  await expect(paidFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(paidFooter).toContainText("Total Paid");
  await expect(paidFooter).toContainText("$17,356,500");
  await page.locator(".og-grid__scroller").evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await paidGroup.locator(".og-grid__group-label").click();
  await expect(paidGroup).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Ungroup status" }).click();
  await expect(page.locator('[role="row"][data-grouped-row="true"]')).toHaveCount(0);
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
});

test("react data grid selects leaf rows from grouping-panel grouped rows", async ({ page }) => {
  await page.goto("/");

  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);

  const paidGroup = page.locator('[role="row"][data-row-id="__group__status:Paid"]');
  await expect(paidGroup).toHaveAttribute("data-grouped-row", "true");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveCount(0);

  await paidGroup.locator(".og-grid__group-label").click();
  await expect(paidGroup).toHaveAttribute("data-selected", "true");

  await paidGroup.locator(".og-grid__group-toggle").click();
  await expect(paidGroup).toHaveAttribute("data-expanded", "true");
  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toHaveAttribute("data-selected", "true");
});

test("react data grid keeps grouped virtualization bounded at aggregate footers", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Group status" }).click();

  const scroller = page.locator(".og-grid__scroller");
  const paidGroup = page.locator('[role="row"][data-row-id="__group__status:Paid"]');
  await expect(paidGroup).toHaveAttribute("data-grouped-row", "true");
  await paidGroup.locator(".og-grid__group-toggle").click();
  await expect(paidGroup).toHaveAttribute("data-expanded", "true");

  await scroller.evaluate((element) => {
    element.scrollTop = 10_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const paidFooter = page.locator('[role="row"][data-row-id="__group__status:Paid>__footer__"]');
  await expect(paidFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(paidFooter).toContainText("Total Paid");

  const stats = await getVirtualizedRenderStats(page);
  expect(stats.rowCount).toBeLessThan(80);
  expect(stats.firstVirtualRowIndex).toBeGreaterThan(100);
  expect(stats.lastVirtualRowIndex).toBeGreaterThan(stats.firstVirtualRowIndex);

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(paidGroup).toHaveAttribute("data-expanded", "true");
});

test("react data grid groups columns from the grouping panel", async ({ page }) => {
  await page.goto("/");

  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await expect(groupingPanel).toBeVisible();
  await expect(groupingPanel).toContainText("Drag column headers here to group");

  const ownerHeader = page.locator('[role="columnheader"][data-column-id="owner"]');
  await dragBetweenLocators(ownerHeader.locator(".og-grid__header-button"), groupingPanel);

  await expect(groupingPanel.locator('[data-column-id="owner"]')).toContainText("Owner");
  const minaGroup = page.locator('[role="row"][data-row-id="__group__owner:Mina"]');
  await expect(minaGroup).toHaveAttribute("data-grouped-row", "true");
  await expect(minaGroup).toContainText("owner: Mina");
  await minaGroup.locator(".og-grid__group-toggle").click();
  await page.locator(".og-grid__scroller").evaluate((element) => {
    element.scrollTop = 8_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const minaFooter = page.locator('[role="row"][data-row-id="__group__owner:Mina>__footer__"]');
  await expect(minaFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(minaFooter).toContainText("Total Mina");
  await page.locator(".og-grid__scroller").evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const statusHeader = page.locator('[role="columnheader"][data-column-id="status"]');
  await dragBetweenLocators(statusHeader.locator(".og-grid__header-button"), groupingPanel);
  const groupingChips = groupingPanel.locator(".og-grid__grouping-chip");
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "owner");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "status");
  await groupingPanel.getByRole("button", { name: "Move status grouping left" }).click();
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "status");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "owner");
  await expect(page.locator('[role="row"][data-row-id="__group__status:Paid"]')).toHaveAttribute("data-grouped-row", "true");

  await groupingPanel.getByRole("button", { name: "Remove status grouping" }).click();
  await groupingPanel.getByRole("button", { name: "Remove owner grouping" }).click();

  await expect(page.locator('[role="row"][data-grouped-row="true"]')).toHaveCount(0);
  await expect(groupingPanel).toContainText("Drag column headers here to group");
});

test("react data grid keeps grouping panel reorder virtualization bounded at aggregate footers", async ({ page }) => {
  await page.goto("/");

  const scroller = page.locator(".og-grid__scroller");
  const groupingPanel = page.locator(".og-grid__grouping-panel");

  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
  await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);

  const groupingChips = groupingPanel.locator(".og-grid__grouping-chip");
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "owner");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "status");

  await groupingPanel.getByRole("button", { name: "Move status grouping left" }).click();
  await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "status");
  await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "owner");

  const paidGroup = page.locator('[role="row"][data-row-id="__group__status:Paid"]');
  await expect(paidGroup).toHaveAttribute("data-grouped-row", "true");
  await paidGroup.locator(".og-grid__group-toggle").click();
  await expect(paidGroup).toHaveAttribute("data-expanded", "true");

  await scroller.evaluate((element) => {
    element.scrollTop = 10_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const paidFooter = page.locator('[role="row"][data-row-id="__group__status:Paid>__footer__"]');
  await expect(paidFooter).toHaveAttribute("data-group-footer-row", "true");
  await expect(paidFooter).toContainText("Total Paid");

  const stats = await getVirtualizedRenderStats(page);
  expect(stats.rowCount).toBeLessThan(80);
  expect(stats.lastVirtualRowIndex).toBeGreaterThan(stats.firstVirtualRowIndex);
});

test("react data grid renders virtualized tree rows with descendant selection", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Use tree data" }).click();

  const grid = page.getByRole("grid");
  const scroller = page.locator(".og-grid__scroller");
  const lazyRoot = page.locator('[role="row"][data-row-id="TREE-LAZY"]');
  const lazyChild = page.locator('[role="row"][data-row-id="TREE-LAZY-LINE-1"]');
  const root = page.locator('[role="row"][data-row-id="TREE-001"]');
  const firstChild = page.locator('[role="row"][data-row-id="TREE-001-LINE-1"]');
  const lastChild = page.locator('[role="row"][data-row-id="TREE-001-LINE-6"]');
  await expect(grid).toBeVisible();
  await expect(lazyRoot).toBeVisible();
  await expect(lazyRoot).toHaveAttribute("data-expanded", "false");
  await expect(lazyChild).toHaveCount(0);

  const lazyToggle = lazyRoot.locator(".og-grid__group-toggle");
  await expect(lazyToggle).toHaveAttribute("aria-expanded", "false");
  await lazyToggle.click();

  await expect(lazyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(lazyRoot).toHaveAttribute("data-expanded", "true");
  await expect(lazyChild).toBeVisible();
  await lazyRoot.locator(".og-grid__group-label").click();
  await expect(lazyRoot).toHaveAttribute("data-selected", "true");
  await expect(lazyChild).toHaveAttribute("data-selected", "true");

  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-expanded", "false");
  await expect(firstChild).toHaveCount(0);
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);

  const toggle = root.locator(".og-grid__group-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(root).toHaveAttribute("data-expanded", "true");
  await expect(firstChild).toBeVisible();
  await expect(lastChild).toBeVisible();

  await root.locator(".og-grid__group-label").click();
  await expect(root).toHaveAttribute("data-selected", "true");
  await expect(firstChild).toHaveAttribute("data-selected", "true");
  await expect(lastChild).toHaveAttribute("data-selected", "true");

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight;
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(page.locator('[role="row"][data-row-id="TREE-180"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toBeVisible();
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);

  const stats = await getVirtualizedRenderStats(page);
  expect(stats.firstVirtualRowIndex).toBeGreaterThan(100);
  expect(stats.lastVirtualRowIndex).toBeGreaterThan(170);

  const pinnedBounds = await getPinnedBounds(page);
  expect(Math.abs(pinnedBounds.idLeft - pinnedBounds.scrollerLeft)).toBeLessThan(2);
  expect(Math.abs(pinnedBounds.amountRight - pinnedBounds.scrollerRight)).toBeLessThan(2);
});

test("react data grid keeps large virtualized layout stable at scroll extremes", async ({ page }) => {
  await page.goto("/");

  const grid = page.getByRole("grid");
  const scroller = page.locator(".og-grid__scroller");
  await expect(grid).toBeVisible();
  await expect.poll(async () => page.locator('[role="row"][data-row-id]').count()).toBeLessThan(80);
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toHaveCount(0);

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight;
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(page.locator('[role="row"][data-row-id="INV-1000"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="customer"]')).toHaveCount(0);

  const bottomRightStats = await getVirtualizedRenderStats(page);
  expect(bottomRightStats.rowCount).toBeLessThan(80);
  expect(bottomRightStats.columnHeaderCount).toBeLessThan(25);
  expect(bottomRightStats.firstVirtualRowIndex).toBeGreaterThan(900);
  expect(bottomRightStats.lastVirtualRowIndex).toBe(999);

  const pinnedBottomRight = await getPinnedBounds(page);
  expect(Math.abs(pinnedBottomRight.idLeft - pinnedBottomRight.scrollerLeft)).toBeLessThan(2);
  expect(Math.abs(pinnedBottomRight.amountRight - pinnedBottomRight.scrollerRight)).toBeLessThan(2);

  const stickyBottomRight = await getStickyVirtualizedBounds(page);
  expect(Math.abs(stickyBottomRight.headerTop - stickyBottomRight.scrollerTop)).toBeLessThan(2);
  expect(stickyBottomRight.idCellLeft - stickyBottomRight.scrollerLeft).toBeLessThan(2);
  expect(Math.abs(stickyBottomRight.amountCellRight - stickyBottomRight.scrollerRight)).toBeLessThan(2);

  const metric24Bounds = await getColumnAlignmentBounds(page, "metric24");
  expect(Math.abs(metric24Bounds.headerLeft - metric24Bounds.cellLeft)).toBeLessThan(2);
  expect(Math.abs(metric24Bounds.headerWidth - metric24Bounds.cellWidth)).toBeLessThan(2);

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(page.locator('[role="row"][data-row-id="INV-0001"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="customer"]')).toBeVisible();
  await expect(page.locator('[role="columnheader"][data-column-id="metric24"]')).toHaveCount(0);
});

async function dragBetweenCells(startCell: Locator, endCell: Locator) {
  await dragBetweenLocators(startCell, endCell);
}

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

async function getColumnHeaderLeft(page: import("@playwright/test").Page, columnId: string): Promise<number> {
  return page.locator(`[role="columnheader"][data-column-id="${columnId}"]`).evaluate((element) => {
    return element.getBoundingClientRect().left;
  });
}

async function getColumnHeaderBounds(page: import("@playwright/test").Page, columnId: string): Promise<{ left: number; right: number }> {
  return page.locator(`[role="columnheader"][data-column-id="${columnId}"]`).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right };
  });
}

async function getPinnedBounds(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector(".og-grid__scroller");
    const id = document.querySelector('[role="columnheader"][data-column-id="id"]');
    const amount = document.querySelector('[role="columnheader"][data-column-id="amount"]');

    if (!scroller || !id || !amount) {
      throw new Error("Pinned grid elements were not found");
    }

    const scrollerBox = scroller.getBoundingClientRect();
    const idBox = id.getBoundingClientRect();
    const amountBox = amount.getBoundingClientRect();

    return {
      scrollerLeft: scrollerBox.left,
      scrollerRight: scrollerBox.right,
      idLeft: idBox.left,
      amountRight: amountBox.right,
    };
  });
}

async function getStickyVirtualizedBounds(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector(".og-grid__scroller");
    const header = document.querySelector(".og-grid__header");
    const idCell = document.querySelector('[role="gridcell"][data-column-id="id"]');
    const amountCell = document.querySelector('[role="gridcell"][data-column-id="amount"]');

    if (!scroller || !header || !idCell || !amountCell) {
      throw new Error("Sticky virtualized grid elements were not found");
    }

    const scrollerBox = scroller.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    const idCellBox = idCell.getBoundingClientRect();
    const amountCellBox = amountCell.getBoundingClientRect();

    return {
      scrollerTop: scrollerBox.top,
      scrollerLeft: scrollerBox.left,
      scrollerRight: scrollerBox.right,
      headerTop: headerBox.top,
      idCellLeft: idCellBox.left,
      amountCellRight: amountCellBox.right,
    };
  });
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
      columnHeaderCount: document.querySelectorAll('[role="columnheader"][data-column-id]').length,
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
