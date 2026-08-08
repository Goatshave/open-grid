import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const vueServerSideUrl = getE2eUrl(4179);

test("vue server-side example keeps query state outside the grid and exports the full server result", async ({ page }) => {
  await page.goto(vueServerSideUrl);

  await expect(page.getByRole("heading", { name: "Vue server-side tickets" })).toBeVisible();
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("aria-rowcount", "-1");
  await expect(page.getByTestId("vue-server-export-status")).toHaveText("Server export idle");

  await page.getByRole("textbox", { name: "Account" }).fill("Acme");
  await expect(page.getByText("40 matching rows · page 1 of 2")).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="VUE-0001"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="VUE-0235"]')).toHaveCount(0);
  const headerRowCount = await grid.locator(".og-grid__header > [role='row']").count();
  const firstBodyRow = grid.locator(".og-grid__body > [role='row'][data-row-id]").first();
  await expect(firstBodyRow).toHaveAttribute("aria-rowindex", String(headerRowCount + 1));
  await page.getByRole("navigation", { name: "Vue server pagination" }).getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("40 matching rows · page 2 of 2")).toBeVisible();
  await expect(firstBodyRow).toHaveAttribute("aria-rowindex", String(headerRowCount + 26));

  await page.getByRole("button", { name: /Value/ }).click();
  await expect(page.getByRole("columnheader", { name: /Value/ })).toHaveAttribute("aria-sort", "ascending");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export server CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("vue-server-tickets.csv");
  await expect(page.getByTestId("vue-server-export-status")).toHaveText("Exported 40 server rows");

  const path = await download.path();
  expect(path).not.toBeNull();
  const text = await readFile(path as string, "utf8");
  const rows = text.trim().split("\n");

  expect(rows[0]).toBe("Ticket,Account,Owner,Status,Priority,Value,Opened");
  expect(rows).toHaveLength(41);
  expect(text).toContain("VUE-0001,Acme Labs");
  expect(text).toContain("VUE-0235,Acme Labs");
});

test("vue server-side example previews streaming export progress and cancellation", async ({ page }) => {
  await page.goto(vueServerSideUrl);

  await expect(page.getByRole("heading", { name: "Vue server-side tickets" })).toBeVisible();
  await expect(page.getByTestId("vue-server-stream-status")).toHaveText("Streaming export idle");
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeDisabled();

  await page.getByRole("textbox", { name: "Account" }).fill("Acme");
  await expect(page.getByText("40 matching rows")).toBeVisible();

  await page.getByRole("button", { name: "Preview streaming CSV" }).click();
  await expect(page.getByRole("button", { name: "Preview streaming CSV" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeEnabled();
  await expect(page.getByTestId("vue-server-stream-status")).toContainText("Streaming 5 of 40 server rows");

  await page.getByRole("button", { name: "Cancel stream" }).click();
  await expect(page.getByTestId("vue-server-stream-status")).toHaveText(/Cancelled streaming export after \d+ server rows/);
  await expect(page.getByRole("button", { name: "Preview streaming CSV" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel stream" })).toBeDisabled();
});
