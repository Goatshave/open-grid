import { expect, test } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

declare global { interface Window { __openGridSaveCallbacks: Array<() => void>; } }

for (const example of getPlaywrightUiSmokeTargets()) {
  test.describe(`${example.framework} asynchronous editing`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        window.__openGridSaveCallbacks = [];
        const original = window.setTimeout.bind(window);
        window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === 160 && typeof callback === "function") {
            window.__openGridSaveCallbacks.push(() => callback(...args));
            return 123456;
          }
          return original(callback, delay, ...args);
        }) as typeof window.setTimeout;
      });
      await page.goto(example.url);
    });

    test("serializes repeated saves and only closes the editor after the latest intent", async ({ page }) => {
      const cell = page.locator(`[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`);
      await cell.dblclick();
      const editor = cell.getByRole("textbox");
      await editor.fill("First saved value"); await editor.press("Enter");
      await editor.fill("Second saved value"); await editor.press("Enter");
      expect(await page.evaluate(() => window.__openGridSaveCallbacks.length)).toBe(1);
      await page.evaluate(() => window.__openGridSaveCallbacks[0]!());
      await expect.poll(() => page.evaluate(() => window.__openGridSaveCallbacks.length)).toBe(2);
      await expect(editor).toHaveValue("Second saved value");
      await expect(editor).toBeFocused();
      await page.evaluate(() => window.__openGridSaveCallbacks[1]!());
      await expect(editor).toHaveCount(0);
      await expect(cell).toContainText("Second saved value");
    });

    test("does not save or cancel during IME composition or a composition-end key", async ({ page }) => {
      const cell = page.locator(`[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`);
      await cell.dblclick(); const editor = cell.getByRole("textbox");
      await editor.dispatchEvent("compositionstart", { data: "한" });
      await editor.fill("한글 입력");
      for (const key of ["Enter", "Escape", "ArrowDown"]) {
        await editor.dispatchEvent("keydown", { key, isComposing: true, keyCode: 229, bubbles: true });
        await expect(editor).toBeFocused();
        await expect(editor).toHaveValue("한글 입력");
      }
      await editor.dispatchEvent("compositionend", { data: "한글 입력" });
      await editor.dispatchEvent("keydown", { key: "Enter", isComposing: false, keyCode: 229, bubbles: true });
      expect(await page.evaluate(() => window.__openGridSaveCallbacks.length)).toBe(0);
      await editor.press("Enter");
      expect(await page.evaluate(() => window.__openGridSaveCallbacks.length)).toBe(1);
      await page.evaluate(() => window.__openGridSaveCallbacks[0]!());
      await expect(editor).toHaveCount(0);
      await expect(cell).toContainText("한글 입력");
    });

    test("preserves a newer unsaved draft when an earlier save finishes", async ({ page }) => {
      const cell = page.locator(`[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`);
      await cell.dblclick();
      const editor = cell.getByRole("textbox");
      await editor.fill("Submitted value"); await editor.press("Enter");
      await editor.fill("New unsaved draft");
      await page.evaluate(() => window.__openGridSaveCallbacks[0]!());
      await expect(page.getByTestId(`${example.framework.toLowerCase()}-server-edit-status`)).toContainText("Server edit: saved");
      // Let row propagation and renderer effects settle before checking the draft.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(editor).toHaveValue("New unsaved draft");
      await expect(editor).toBeFocused();
      await editor.press("Escape");
      await expect(cell).toContainText("Submitted value");
      await cell.dblclick();
      await expect(editor).toHaveValue("Submitted value");
    });

    test("does not close or steal focus from a different editor", async ({ page }) => {
      const cell = page.locator(`[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`);
      await cell.dblclick();
      const editor = cell.getByRole("textbox");
      await editor.fill("Submitted value"); await editor.press("Enter"); await editor.press("Escape");
      const otherRowId = example.stateCheck.editableRowId.replace(/001$/, "002");
      const other = page.locator(`[role="gridcell"][data-row-id="${otherRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`);
      await other.dblclick();
      const otherEditor = other.getByRole("textbox");
      await otherEditor.fill("New owner draft");
      await page.evaluate(() => window.__openGridSaveCallbacks[0]!());
      await expect(cell).toContainText("Submitted value");
      await expect(otherEditor).toHaveValue("New owner draft");
      await expect(otherEditor).toBeFocused();
      await expect(page.getByTestId(`${example.framework.toLowerCase()}-server-edit-status`)).toContainText("Server edit: saved");
    });
  });
}
