import { expect, test, type Locator } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const serverGroupingUrl = getE2eUrl(4176);

test("react server grouping example sends grouping and expansion through product-owned query state", async ({ page }) => {
  await page.goto(serverGroupingUrl);

  await expect(page.getByRole("heading", { name: "Server-grouped tickets" })).toBeVisible();
  await expect(page.getByTestId("query-grouping")).toHaveText("Grouping: none");
  await expect(page.locator('[role="row"][data-row-id="TCK-0001"]')).toBeVisible();

  await page.getByRole("button", { name: "Group status", exact: true }).click();
  await expect(page.getByTestId("query-grouping")).toHaveText("Grouping: status");

  const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
  await expect(backlogGroup).toBeVisible();
  await expect(backlogGroup).toContainText("status: Backlog");
  await expect(backlogGroup).toContainText("60");
  await expect(backlogGroup).toContainText("$677,640");
  await expect(page.locator('[role="row"][data-row-id="TCK-0001"]')).toHaveCount(0);

  await backlogGroup.locator(".og-grid__group-toggle").click();
  await expect(page.getByTestId("query-expanded")).toContainText("group:status%3DBacklog");
  await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
  await expect(page.locator('[role="row"][data-row-id="TCK-0001"]')).toBeVisible();

  await page.getByRole("button", { name: "Group status then owner" }).click();
  await expect(page.getByTestId("query-grouping")).toHaveText("Grouping: status > owner");
  await expect(page.getByTestId("query-expanded")).toHaveText("Expanded: none");
  await expect(page.locator('[role="row"][data-row-id="group:status%3DBacklog"]')).toBeVisible();

  await page.locator('[role="row"][data-row-id="group:status%3DBacklog"] .og-grid__group-toggle').click();
  await expect(page.getByTestId("query-expanded")).toContainText("group:status%3DBacklog");
  const ownerGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
  await expect(ownerGroup).toBeVisible();
  await expect(ownerGroup).toContainText("owner: Mina");
});

test("react server grouping example updates query state from the grouping panel", async ({ page }) => {
  await page.goto(serverGroupingUrl);

  const groupingPanel = page.locator(".og-grid__grouping-panel");
  await expect(groupingPanel).toContainText("Drag column headers here to group");

  const ownerHeader = page.locator('[role="columnheader"][data-column-id="owner"]');
  await dragBetweenLocators(ownerHeader.getByRole("button"), groupingPanel);

  await expect(groupingPanel.locator('[data-column-id="owner"]')).toContainText("Owner");
  await expect(page.getByTestId("query-grouping")).toHaveText("Grouping: owner");

  const minaGroup = page.locator('[role="row"][data-row-id="group:owner%3DMina"]');
  await expect(minaGroup).toBeVisible();
  await minaGroup.locator(".og-grid__group-toggle").click();
  await expect(page.getByTestId("query-expanded")).toContainText("group:owner%3DMina");
  await expect(page.locator('[role="row"][data-row-id="TCK-0001"]')).toBeVisible();

  await groupingPanel.getByRole("button", { name: "Remove owner grouping" }).click();
  await expect(page.getByTestId("query-grouping")).toHaveText("Grouping: none");
  await expect(page.locator('[role="row"][data-row-id="group:owner%3DMina"]')).toHaveCount(0);
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
