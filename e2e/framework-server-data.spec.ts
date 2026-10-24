import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";
import AxeBuilder from "@axe-core/playwright";

for (const target of [
  { framework: "React", port: 4178, prefix: "TCK", pagination: "Server pagination" },
  { framework: "Vue", port: 4179, prefix: "VUE", pagination: "Vue server pagination" },
  { framework: "Svelte", port: 4180, prefix: "SVL", pagination: "Svelte server pagination" },
]) {
  test.describe(`${target.framework} remote tickets`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(getE2eUrl(target.port));
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
    });

    test("retains the committed page after a failed refresh and recovers on retry", async ({ page }) => {
      await page.getByRole("navigation", { name: target.pagination, exact: true }).getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 2");
      const first = page.locator('.og-grid__body [role="row"][data-row-id]').first();
      const id = await first.getAttribute("data-row-id");
      await page.getByRole("button", { name: "Simulate load failure" }).click();
      await expect(page.getByTestId("remote-load-status")).toContainText("retained page 2");
      await expect(first).toHaveAttribute("data-row-id", id!);
      await expect(page.getByRole("navigation", { name: target.pagination, exact: true })).toContainText("Page 2 / 10");
      await page.getByRole("button", { name: "Retry load" }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 2");
    });

    test("reports export fetch failures and makes streaming export available again", async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.route("**/__open-grid/tickets?*", (route) => route.fulfill({ status: 503,
        contentType: "application/json", body: JSON.stringify({ error: "Export service unavailable" }) }));
      await page.getByRole("button", { name: "Export server CSV", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: /^Server export failed:/ })).toContainText("Export service unavailable");
      const preview = page.getByRole("button", { name: "Preview streaming CSV", exact: true });
      await preview.click();
      await expect(page.getByRole("status").filter({ hasText: /^Streaming export failed:/ })).toContainText("Export service unavailable");
      await expect(preview).toBeEnabled();
      expect(pageErrors).toEqual([]);
    });

    test("supports unknown totals without a fake row count or last-page control", async ({ page }) => {
      await page.getByRole("checkbox", { name: "Hide total count" }).check();
      await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "-1");
      await expect(page.getByRole("button", { name: "Last page", exact: true })).toBeDisabled();
      const navigation = page.getByRole("navigation", { name: target.pagination, exact: true });
      for (let index = 1; index < 10; index++) {
        await navigation.getByRole("button", { name: "Next", exact: true }).click();
        await expect(page.getByTestId("remote-load-status")).toHaveText(`Loaded page ${index + 1}`);
      }
      await expect(navigation.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
      await expect(navigation).toContainText("Page 10");
      await expect(navigation).not.toContainText(" / ");
      await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "-1");
    });

    test("combines serializable numeric, date, and multi-value filters and resets the page", async ({ page }) => {
      await page.getByRole("navigation", { name: target.pagination, exact: true }).getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 2");
      await page.getByLabel("Filter Value from", { exact: true }).fill("2000");
      await page.getByLabel("Filter Value to", { exact: true }).fill("3000");
      const values = page.locator('.og-grid__body [role="gridcell"][data-column-id="value"]');
      await expect.poll(async () => {
        const numbers = (await values.allTextContents()).map((value) => Number(value.replace(/[$,]/g, "")));
        return numbers.length > 0 && numbers.every((value) => value >= 2000 && value <= 3000);
      }).toBe(true);
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      await page.getByLabel("Filter Opened from", { exact: true }).fill("2026-01-01");
      await page.getByLabel("Filter Opened to", { exact: true }).fill("2026-12-31");
      await page.getByRole("listbox", { name: "Filter Status", exact: true }).selectOption([{ label: "Open" }, { label: "Waiting" }]);
      const statuses = page.locator('.og-grid__body [role="gridcell"][data-column-id="status"]');
      await expect.poll(async () => {
        const texts = (await statuses.allTextContents()).map((value) => value.trim());
        return texts.length > 0 && texts.every((value) => ["Open", "Waiting"].includes(value));
      }).toBe(true);
      await page.getByRole("textbox", { name: "Account", exact: true }).fill("Acme");
      await expect(page.getByLabel("Filter Value from", { exact: true })).toHaveValue("2000");
      await expect(page.getByLabel("Filter Opened to", { exact: true })).toHaveValue("2026-12-31");
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
    });

    test("ignores late filter results and handles an empty result", async ({ page }) => {
      let release!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      let started!: () => void;
      const intercepted = new Promise<void>((resolve) => { started = resolve; });
      await page.route("**/__open-grid/tickets?*", async (route) => {
        const query = JSON.parse(new URL(route.request().url()).searchParams.get("query")!);
        if (query.columnFilters[0]?.value === "Acme") {
          started(); await held;
        }
        await route.continue().catch(() => {});
      });
      const filter = page.getByRole("textbox", { name: "Account", exact: true });
      await filter.fill("Acme"); await intercepted;
      await filter.fill("Northwind");
      await expect(page.getByText("40 matching rows · page 1 of 2")).toBeVisible();
      await expect(page.locator('.og-grid__body [role="gridcell"][data-column-id="account"]').first()).toContainText("Northwind");
      release();
      await filter.fill("No account matches this");
      await expect(page.getByText("0 matching rows · page 1 of 1")).toBeVisible();
      await expect(page.getByRole("navigation", { name: target.pagination, exact: true }).getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    });

    test("retries a failed save without creating a second mutation on editor blur", async ({ page }) => {
      const requests: { operationId: string }[] = [];
      page.on("request", (request) => { if (request.url().includes("/__open-grid/edits")) requests.push(request.postDataJSON()); });
      await page.getByRole("button", { name: "Fail next save", exact: true }).click();
      const cell = page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0001"][data-column-id="account"]`);
      await cell.dblclick(); const editor = cell.locator("input.og-grid__cell-editor");
      await editor.fill("Recovered account"); await editor.press("Enter");
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 0 · Failed 1");
      await expect(editor).toHaveValue("Recovered account");
      await page.getByRole("button", { name: "Retry failed saves" }).click();
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 1 · Failed 0");
      expect(requests).toHaveLength(2); expect(requests[1]!.operationId).toBe(requests[0]!.operationId);
      await editor.press("Escape");
      await expect(cell).toContainText("Recovered account");
    });

    test("reports conflicts and reloads authoritative server values", async ({ page }) => {
      await page.getByRole("button", { name: "Conflict next save" }).click();
      const cell = page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0001"][data-column-id="account"]`);
      await cell.dblclick(); const editor = cell.locator("input.og-grid__cell-editor");
      await editor.fill("Local attempted value"); await editor.press("Enter");
      await expect(page.getByText("Revision conflict; reload server data before retrying", { exact: false })).toBeVisible();
      await page.getByRole("button", { name: "Discard edits and reload" }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      await expect(cell).toContainText("Remote account change");
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 0 · Failed 0");
    });

    test("keeps a rejected draft editable and accepts a corrected value", async ({ page }) => {
      await page.getByRole("button", { name: "Reject next save" }).click();
      const cell = page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0001"][data-column-id="account"]`);
      await cell.dblclick(); const editor = cell.locator("input.og-grid__cell-editor");
      await editor.fill("Rejected account"); await editor.press("Enter");
      await expect(page.getByTestId("server-save-summary")).toContainText("Failed 1");
      await expect(editor).toHaveValue("Rejected account");
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibility.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
      await editor.fill("Corrected account"); await editor.press("Enter");
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 1 · Failed 0");
      await expect(cell).toContainText("Corrected account");
    });

    test("connects a custom date editor to cancellation, validation, and authoritative saving", async ({ page }) => {
      const cell = page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0001"][data-column-id="openedAt"]`);
      const original = await cell.textContent();
      await cell.dblclick();
      const editor = cell.getByLabel("Edit openedAt", { exact: true });
      await editor.fill("2026-10-24");
      await cell.getByRole("button", { name: "Cancel edit" }).click();
      await expect(cell).toHaveText(original!);
      await cell.dblclick();
      await editor.fill("");
      await cell.getByRole("button", { name: "Save edit" }).click();
      await expect(editor).toHaveAttribute("aria-invalid", "true");
      await expect(editor).toBeVisible();
      await editor.fill("2026-10-24");
      await cell.getByRole("button", { name: "Save edit" }).click();
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 1 · Failed 0");
      await expect(cell).toContainText("2026-10-24");
      await page.getByRole("button", { name: "Refresh tickets", exact: true }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 1");
      await expect(cell).toContainText("2026-10-24");
    });

    test("tracks partial paste failure and retries only the failed cell", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const requests: { rowId: string }[] = [];
      page.on("request", (request) => { if (request.url().includes("/__open-grid/edits")) requests.push(request.postDataJSON()); });
      await page.getByRole("button", { name: "Fail next save", exact: true }).click();
      const cell = page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0001"][data-column-id="account"]`);
      await cell.click();
      await page.evaluate(() => navigator.clipboard.writeText("First pasted account\nSecond pasted account"));
      await page.keyboard.press("ControlOrMeta+V");
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 1 · Failed 1");
      await page.getByRole("button", { name: "Retry failed saves" }).click();
      await expect(page.getByTestId("server-save-summary")).toHaveText("Pending 0 · Saved 2 · Failed 0");
      expect(requests.filter((request) => request.rowId === `${target.prefix}-0002`)).toHaveLength(1);
      await expect(cell).toContainText("First pasted account");
      await expect(page.locator(`[role="gridcell"][data-row-id="${target.prefix}-0002"][data-column-id="account"]`)).toContainText("Second pasted account");
    });

    test("selects all query matches with exclusions across pages and applies a real server bulk action", async ({ page }) => {
      await page.getByRole("textbox", { name: "Account", exact: true }).fill("Acme");
      await expect(page.getByText("40 matching rows · page 1 of 2")).toBeVisible();
      await page.getByRole("button", { name: "Select all matching tickets" }).click();
      const first = page.locator('.og-grid__body [role="row"][data-row-id]').first();
      const excludedId = await first.getAttribute("data-row-id");
      await expect(first).toHaveAttribute("aria-selected", "true");
      await first.locator('[data-column-id="id"]').click();
      await expect(page.getByTestId("server-selection-summary")).toHaveText("All matching tickets · 1 excluded");
      const navigation = page.getByRole("navigation", { name: target.pagination, exact: true });
      await navigation.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByTestId("remote-load-status")).toHaveText("Loaded page 2");
      await expect(first).toHaveAttribute("aria-selected", "true");
      const bulkRequest = page.waitForRequest((request) => request.url().includes("/__open-grid/bulk"));
      await page.getByRole("button", { name: "Resolve selected tickets" }).click();
      const payload = (await bulkRequest).postDataJSON();
      expect(payload.selection).toMatchObject({ mode: "all-matching", excludedIds: [excludedId] });
      expect(payload.selection).not.toHaveProperty("ids");
      await expect(page.getByTestId("server-bulk-status")).toContainText("matching tickets");
      await expect.poll(async () => (await page.locator('.og-grid__body [data-column-id="status"]').allTextContents()).map((value) => value.trim()).every((value) => value === "Resolved")).toBe(true);
      await expect(page.getByTestId("server-selection-summary")).toHaveText("0 tickets selected");
      await navigation.getByRole("button", { name: "First", exact: true }).click();
      await expect(page.locator(`[role="row"][data-row-id="${excludedId}"] [data-column-id="status"]`)).toContainText("Backlog");
    });

    test("retains query-wide selection under sorting and resets it under a new filter", async ({ page }) => {
      await page.getByRole("button", { name: "Select all matching tickets" }).click();
      await page.getByRole("button", { name: "Ticket", exact: true }).click();
      await expect(page.getByTestId("server-selection-summary")).toHaveText("All matching tickets · 0 excluded");
      await page.getByRole("textbox", { name: "Account", exact: true }).fill("Northwind");
      await expect(page.getByTestId("server-selection-summary")).toHaveText("0 tickets selected");
    });

    test("retries the exact bulk operation after its successful response was lost", async ({ page }) => {
      await page.getByRole("listbox", { name: "Filter Status", exact: true }).selectOption({ label: "Open" });
      await expect(page.getByText("60 matching rows · page 1 of 3")).toBeVisible();
      await page.getByRole("button", { name: "Select all matching tickets" }).click();
      const operationIds: string[] = [];
      let first = true;
      await page.route("**/__open-grid/bulk?*", async (route) => {
        operationIds.push(route.request().postDataJSON().operationId);
        if (first) {
          first = false; await route.fetch();
          await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Response lost after server commit" }) });
        } else await route.continue();
      });
      await page.getByRole("button", { name: "Resolve selected tickets" }).click();
      await expect(page.getByTestId("server-bulk-status")).toContainText("Bulk action failed");
      await page.getByRole("button", { name: "Retry bulk action" }).click();
      await expect(page.getByTestId("server-bulk-status")).toHaveText("Resolved 60 of 60 matching tickets");
      expect(operationIds).toHaveLength(2); expect(operationIds[0]).toBe(operationIds[1]);
      await expect(page.getByText("0 matching rows · page 1 of 1")).toBeVisible();
    });
  });
}
