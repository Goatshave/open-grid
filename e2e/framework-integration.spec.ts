import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

declare global { interface Window { __integrationClipboard: string; } }

for (const [index, reference] of getPlaywrightUiSmokeTargets().entries()) {
  const remoteUrl = getE2eUrl(4178 + index);
  test.describe(`${reference.framework} integration`, () => {
    test("keeps IME confirmation separate from editing actions", async ({ page }) => {
      await page.goto(reference.url);
      const cell = page.locator(`[role="gridcell"][data-row-id="${reference.stateCheck.editableRowId}"][data-column-id="${reference.stateCheck.editableColumnId}"]`);
      await cell.dblclick(); const input = cell.locator("input.og-grid__cell-editor");
      await input.dispatchEvent("compositionstart", { data: "한" });
      await input.fill("한글 조합 확인");
      await input.dispatchEvent("keydown", { key: "Enter", isComposing: true, keyCode: 229, bubbles: true });
      await input.dispatchEvent("keydown", { key: "Escape", isComposing: true, bubbles: true });
      await expect(input).toBeFocused();
      await expect(input).toHaveValue("한글 조합 확인");
      await input.dispatchEvent("compositionend", { data: "한글 조합 확인" });
      await input.dispatchEvent("keydown", { key: "Enter", isComposing: false, keyCode: 229, bubbles: true });
      await expect(input).toBeVisible();
      await input.press("Enter");
      await expect(input).toHaveCount(0);
      await expect(cell).toContainText("한글 조합 확인");
    });

    test("custom editors validate, preserve drafts, save, and cancel without changing another cell", async ({ page }) => {
      await page.goto(remoteUrl);
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      const row = page.locator('.og-grid__body [role="row"][data-row-id]').first();
      const account = row.locator('[data-column-id="account"]');
      await account.dblclick(); const editor = account.getByLabel("Edit account", { exact: true });
      await editor.fill("x"); await editor.press("Enter");
      await expect(editor).toHaveAttribute("aria-invalid", "true");
      await expect(editor).toHaveValue("x");
      await editor.fill("Cross browser account"); await editor.press("Enter");
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 1 · Failed 0");
      await expect(account).toContainText("Cross browser account");
      const date = row.locator('[data-column-id="openedAt"]'); const original = await date.textContent();
      await date.dblclick(); await date.getByLabel("Edit openedAt", { exact: true }).fill("2026-10-24");
      await date.getByRole("button", { name: "Cancel edit" }).click();
      await expect(date).toHaveText(original!);
      await expect(account).toContainText("Cross browser account");
    });

    test("combines number, calendar, and set filters through real HTTP queries", async ({ page }) => {
      await page.goto(remoteUrl);
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      await page.getByLabel("Filter Value from", { exact: true }).fill("2000");
      await page.getByLabel("Filter Value to", { exact: true }).fill("3000");
      await page.getByLabel("Filter Opened from", { exact: true }).fill("2026-01-01");
      await page.getByLabel("Filter Opened to", { exact: true }).fill("2026-12-31");
      await page.getByRole("listbox", { name: "Filter Status", exact: true }).selectOption([{ label: "Open" }, { label: "Waiting" }]);
      await expect.poll(async () => {
        const values = (await page.locator('.og-grid__body [data-column-id="value"]').allTextContents()).map((value) => Number(value.replace(/[$,]/g, "")));
        const statuses = (await page.locator('.og-grid__body [data-column-id="status"]').allTextContents()).map((value) => value.trim());
        return values.length > 0 && values.every((value) => value >= 2000 && value <= 3000) && statuses.every((value) => ["Open", "Waiting"].includes(value));
      }).toBe(true);
      await page.getByRole("button", { name: "Clear Filter status", exact: true }).click();
      await expect(page.getByRole("listbox", { name: "Filter Status", exact: true })).toHaveValues([]);
    });

    test("keeps remote exclusions across pages, applies bulk changes, and resets for a new query", async ({ page }) => {
      await page.goto(remoteUrl);
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      await page.getByRole("button", { name: "Select all matching tickets" }).click();
      const first = page.locator('.og-grid__body [role="row"][data-row-id]').first();
      await expect(first).toHaveAttribute("aria-selected", "true");
      await first.locator('[data-column-id="id"]').click();
      await expect(page.getByTestId("server-selection-summary")).toHaveText("All matching tickets · 1 excluded");
      const nav = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Last page", exact: true }) });
      await nav.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 2");
      await expect(first).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: "Resolve selected tickets" }).click();
      await expect(page.getByTestId("server-bulk-status")).toHaveText("Resolved 179 of 239 matching tickets");
      await expect(page.getByTestId("server-selection-summary")).toHaveText("0 tickets selected");
      await page.getByRole("button", { name: "Select all matching tickets" }).click();
      await page.getByRole("textbox", { name: "Account", exact: true }).fill("Northwind");
      await expect(page.getByTestId("server-selection-summary")).toHaveText("0 tickets selected");
    });

    test("routes keyboard clipboard actions through the browser adapter and handles denial", async ({ page }) => {
      // Exercise real keyboard routing in each engine with a deterministic clipboard
      // boundary. Host clipboard permissions and OS paste menus require manual review.
      await page.addInitScript(() => {
        window.__integrationClipboard = "";
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
          writeText: async (value: string) => { window.__integrationClipboard = value; },
          readText: async () => window.__integrationClipboard,
        } });
        document.execCommand = () => false;
      });
      const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(remoteUrl);
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      const cell = page.locator('.og-grid__body [data-column-id="account"]').first();
      await cell.click(); await cell.press("ControlOrMeta+C");
      await expect.poll(() => page.evaluate(() => window.__integrationClipboard)).toBe((await cell.textContent())!.trim());
      await page.evaluate(() => { window.__integrationClipboard = "Cross browser pasted"; });
      await cell.press("ControlOrMeta+V");
      await expect(cell).toContainText("Cross browser pasted");
      await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        readText: async () => { throw new Error("Clipboard denied"); }, writeText: async () => { throw new Error("Clipboard denied"); },
      } }); });
      await cell.press("ControlOrMeta+C"); await cell.press("ControlOrMeta+V");
      await expect(cell).toContainText("Cross browser pasted");
      expect(errors).toEqual([]);
    });
  });
}
