import { expect, test, type Locator } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

for (const example of getPlaywrightUiSmokeTargets()) {
  test(`${example.framework} reference UI supports the primary keyboard workflow`, async ({ page }) => {
    await page.goto(example.url);

    const exportButton = page.getByRole("button", { name: "Export CSV" });
    const manageColumnsButton = page.getByRole("button", { name: "Manage columns" });
    const refreshButton = page.getByRole("button", { name: "Refresh data" });
    await exportButton.focus();
    await page.keyboard.press("Tab");
    await expect(manageColumnsButton).toBeFocused();
    await expectVisibleFocusIndicator(manageColumnsButton);
    await page.keyboard.press("Tab");
    await expect(refreshButton).toBeFocused();
    await expectVisibleFocusIndicator(refreshButton);

    const rowSearch = page.getByRole("searchbox", { name: "Search all rows" });
    const grid = page.locator("[data-open-grid]").first();
    await rowSearch.focus();
    await page.keyboard.press("Tab");
    await expect(grid).toBeFocused();
    await expectVisibleFocusIndicator(grid);

    const menuTrigger = page.getByRole("button", {
      name: `Open ${example.smokeCheck.primaryColumnId} column menu`,
    });
    const menu = page.getByRole("menu", {
      name: `${example.smokeCheck.primaryColumnId} column menu`,
    });
    await menuTrigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(menu).toBeVisible();
    const firstMenuItem = menu.getByRole("menuitem", { name: "Sort ascending" });
    await expect(firstMenuItem).toBeFocused();
    await expectVisibleFocusIndicator(firstMenuItem);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(menuTrigger).toBeFocused();

    const editableCell = page.locator(
      `[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`,
    );
    await editableCell.focus();
    await expect(editableCell).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(editableCell).not.toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(editableCell).toBeFocused();
    await expectVisibleFocusIndicator(editableCell);

    await page.keyboard.press("Enter");
    const editor = editableCell.locator(".og-grid__cell-editor");
    await expect(editor).toBeFocused();
    await expectVisibleFocusIndicator(editableCell);
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(editableCell).toBeFocused();
    await expectVisibleFocusIndicator(editableCell);
  });
}

async function expectVisibleFocusIndicator(locator: Locator) {
  const indicator = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(indicator.outlineStyle).not.toBe("none");
  expect(indicator.outlineWidth).toBeGreaterThanOrEqual(2);
}
