import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const svelteServerSideUrl = getE2eUrl(4180);

test("svelte server-side example keeps query state outside the grid and exports the full server result", async ({ page }) => {
  await page.goto(svelteServerSideUrl);

  await expect(page.getByRole("heading", { name: "Svelte server-side tickets" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "-1");
  await expect(page.getByTestId("svelte-server-export-status")).toHaveText("Server export idle");

  await page.getByRole("textbox", { name: "Account" }).fill("Acme");

  await expect(page.getByText("40 matching rows · page 1 of 2")).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="SVL-0001"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="SVL-0235"]')).toHaveCount(0);
  const headerRowCount = await grid.locator(".og-grid__header > [role='row']").count();
  const firstBodyRow = grid.locator(".og-grid__body > [role='row'][data-row-id]").first();
  await expect(firstBodyRow).toHaveAttribute("aria-rowindex", String(headerRowCount + 1));
  await page.getByRole("navigation", { name: "Svelte server pagination" }).getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("40 matching rows · page 2 of 2")).toBeVisible();
  await expect(firstBodyRow).toHaveAttribute("aria-rowindex", String(headerRowCount + 26));

  await page.getByRole("button", { name: "Value", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: /Value/ })).toHaveAttribute("aria-sort", "ascending");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export server CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("svelte-server-tickets.csv");
  await expect(page.getByTestId("svelte-server-export-status")).toHaveText("Exported 40 server rows");

  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath as string, "utf8");
  const rows = csv.trim().split("\n");

  expect(rows).toHaveLength(41);
  expect(rows[0]).toBe("Ticket,Account,Owner,Status,Priority,Value,Opened");
  expect(csv).toContain("SVL-0001,Acme Labs");
  expect(csv).toContain("SVL-0235,Acme Labs");
});

test("svelte server-side example previews streaming export progress and cancellation", async ({ page }) => {
  await page.goto(svelteServerSideUrl);

  await expect(page.getByRole("heading", { name: "Svelte server-side tickets" })).toBeVisible();
  await expect(page.getByTestId("svelte-server-stream-status")).toHaveText("Streaming export idle");
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeDisabled();

  await page.getByRole("textbox", { name: "Account" }).fill("Acme");
  await expect(page.getByText("40 matching rows")).toBeVisible();

  await page.getByRole("button", { name: "Preview streaming CSV" }).click();
  await expect(page.getByRole("button", { name: "Preview streaming CSV" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeEnabled();
  await expect(page.getByTestId("svelte-server-stream-status")).toContainText("Streaming 5 of 40 server rows");

  await page.getByRole("button", { name: "Cancel stream" }).click();
  await expect(page.getByTestId("svelte-server-stream-status")).toHaveText(/Cancelled streaming export after \d+ server rows/);
  await expect(page.getByRole("button", { name: "Preview streaming CSV" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeDisabled();
});
