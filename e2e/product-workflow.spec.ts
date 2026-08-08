import { expect, test } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

for (const example of getPlaywrightUiSmokeTargets()) {
  test(`${example.framework} reference UI completes the first-publish product workflow`, async ({ page }) => {
    await page.goto(example.url);

    const quickFilter = page.getByRole("searchbox", { name: "Search all rows" });
    await quickFilter.fill(example.workflowCheck.searchQuery);
    await expect(page.locator(`[role="row"][data-row-id="${example.workflowCheck.filteredRowId}"]`)).toBeVisible();
    await page.getByRole("button", { name: "Clear row search" }).click();
    await expect(quickFilter).toHaveValue("");

    const editableCell = page.locator(
      `[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`,
    );
    await editableCell.dblclick();
    const editor = editableCell.locator(".og-grid__cell-editor");
    await expect(editor).toBeFocused();
    await editor.fill(example.workflowCheck.validEditValue);
    await editor.press("Enter");
    await expect(editor).toHaveCount(0);
    await expect(editableCell).toContainText(example.workflowCheck.validEditValue);

    const primaryHeader = page.locator(`[role="columnheader"][data-column-id="${example.smokeCheck.primaryColumnId}"]`);
    await page.getByRole("button", { name: `Open ${example.smokeCheck.primaryColumnId} column menu` }).click();
    await page.getByRole("menu", { name: `${example.smokeCheck.primaryColumnId} column menu` }).getByRole("menuitem", { name: "Sort ascending" }).click();
    await expect(primaryHeader).toHaveAttribute("aria-sort", "ascending");

    await page.getByRole("button", { name: "Manage columns" }).click();
    const columnManagement = page.getByLabel("Column management");
    await columnManagement.getByRole("checkbox", { name: example.workflowCheck.preferenceColumnLabel }).click();
    await expect(page.locator(`[role="columnheader"][data-column-id="${example.workflowCheck.preferenceColumnId}"]`)).toHaveCount(0);
    await page.reload();

    await expect(page.locator(`[role="columnheader"][data-column-id="${example.workflowCheck.preferenceColumnId}"]`)).toHaveCount(0);
    await expect(page.locator(`[role="columnheader"][data-column-id="${example.smokeCheck.primaryColumnId}"]`)).toHaveAttribute("aria-sort", "none");
    await expect(
      page.locator(`[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`),
    ).toContainText(example.workflowCheck.originalEditValue);

    await page.getByRole("button", { name: "Manage columns" }).click();
    await page.getByLabel("Column management").getByRole("button", { name: "Reset preferences" }).click();
    await expect(page.locator(`[role="columnheader"][data-column-id="${example.workflowCheck.preferenceColumnId}"]`)).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("open-grid:reference-preferences:v1"))).toBeNull();
  });
}
