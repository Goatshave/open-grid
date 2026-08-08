import { expect, test, type Locator } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const examples = [
  {
    framework: "vue",
    url: getE2eUrl(4183),
    heading: "Vue server-grouped tickets",
    leafRowId: "VGR-0001",
  },
  {
    framework: "svelte",
    url: getE2eUrl(4184),
    heading: "Svelte server-grouped tickets",
    leafRowId: "SGR-0001",
  },
] as const;

const allFrameworkExamples = [
  {
    framework: "react",
    url: getE2eUrl(4176),
    heading: "Server-grouped tickets",
    leafRowId: "TCK-0001",
    secondPageRowId: "TCK-0009",
    valueDescSecondPageRowId: "TCK-0232",
    highestValueRowId: "TCK-0240",
    highestAcmeValueRowId: "TCK-0235",
    highestBacklogValueRowId: "TCK-0237",
  },
  {
    framework: "vue",
    url: getE2eUrl(4183),
    heading: "Vue server-grouped tickets",
    leafRowId: "VGR-0001",
    secondPageRowId: "VGR-0009",
    valueDescSecondPageRowId: "VGR-0232",
    highestValueRowId: "VGR-0240",
    highestAcmeValueRowId: "VGR-0235",
    highestBacklogValueRowId: "VGR-0237",
  },
  {
    framework: "svelte",
    url: getE2eUrl(4184),
    heading: "Svelte server-grouped tickets",
    leafRowId: "SGR-0001",
    secondPageRowId: "SGR-0009",
    valueDescSecondPageRowId: "SGR-0232",
    highestValueRowId: "SGR-0240",
    highestAcmeValueRowId: "SGR-0235",
    highestBacklogValueRowId: "SGR-0237",
  },
] as const;

for (const example of examples) {
  test(`${example.framework} server grouping example keeps grouping and expansion in product-owned query state`, async ({ page }) => {
    await page.goto(example.url);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: none");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: status");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    await expect(backlogGroup).toBeVisible();
    await expect(backlogGroup).toContainText("status: Backlog");
    await expect(backlogGroup).toContainText("60");
    await expect(backlogGroup).toContainText("677");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);

    await page.getByRole("button", { name: "Toggle Backlog group" }).click();
    await expect(page.getByTestId(`${example.framework}-query-expanded`)).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status then owner" }).click();
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: status > owner");
    await expect(page.getByTestId(`${example.framework}-query-expanded`)).toHaveText("Expanded: none");

    await page.getByRole("button", { name: "Toggle Backlog group" }).click();
    await expect(page.getByTestId(`${example.framework}-query-expanded`)).toContainText("group:status%3DBacklog");
    const minaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(minaGroup).toContainText("owner: Mina");
    await page.getByRole("button", { name: "Toggle Backlog Mina group" }).click();
    await expect(page.getByTestId(`${example.framework}-query-expanded`)).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();
  });
}

for (const example of examples) {
  test(`${example.framework} server grouping panel updates product-owned query state`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    await expect(groupingPanel).toContainText("Drag column headers here to group");
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: none");

    const ownerHeader = page.locator('[role="columnheader"][data-column-id="owner"]');
    await dragBetweenLocators(ownerHeader.getByRole("button"), groupingPanel);

    await expect(groupingPanel.locator('[data-column-id="owner"]')).toContainText("Owner");
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: owner");

    const minaGroup = page.locator('[role="row"][data-row-id="group:owner%3DMina"]');
    await expect(minaGroup).toBeVisible();
    await expect(minaGroup).toContainText("owner: Mina");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);
    await expect(minaGroup.locator(".og-grid__group-toggle")).toHaveAttribute("aria-expanded", "false");
    await minaGroup.locator(".og-grid__group-toggle").click();
    await expect(page.getByTestId(`${example.framework}-query-expanded`)).toContainText("group:owner%3DMina");
    await expect(minaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Remove owner grouping" }).click();
    await expect(page.getByTestId(`${example.framework}-query-grouping`)).toHaveText("Grouping: none");
    await expect(page.locator('[role="row"][data-row-id="group:owner%3DMina"]')).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel reorders product-owned grouping depth`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    await expect(groupingPanel).toContainText("Drag column headers here to group");
    await expect(groupingState).toHaveText("Grouping: none");

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);
    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);

    const groupingChips = groupingPanel.locator(".og-grid__grouping-chip");
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "status");
    await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "owner");
    await expect(page.locator('[role="row"][data-row-id="group:status%3DBacklog"]')).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Move owner grouping left" }).click();
    await expect(groupingState).toHaveText("Grouping: owner > status");
    await expect(groupingChips.nth(0)).toHaveAttribute("data-column-id", "owner");
    await expect(groupingChips.nth(1)).toHaveAttribute("data-column-id", "status");
    await expect(page.locator('[role="row"][data-row-id="group:owner%3DMina"]')).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Remove status grouping" }).click();
    await expect(groupingState).toHaveText("Grouping: owner");
    await expect(page.locator('[role="row"][data-row-id="group:owner%3DMina"]')).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel reorder clears stale expansion in product-owned query state`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);
    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(pageState).toHaveText("Page: 1");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toBeVisible();
    await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Move owner grouping left" }).click();
    await expect(groupingState).toHaveText("Grouping: owner > status");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.locator('[role="row"][data-row-id="group:status%3DBacklog"]')).toHaveCount(0);
    await expect(page.locator('[role="row"][data-row-id="group:owner%3DMina"]')).toHaveAttribute("data-expanded", "false");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel reorder preserves filtered sorting`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);
    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const waitingGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting"]');
    const waitingMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting/owner%3DMina"]');
    await expect(waitingGroup).toBeVisible();
    await waitingGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DWaiting");
    await expect(waitingMinaGroup).toBeVisible();
    await waitingMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DWaiting/owner%3DMina");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Move owner grouping left" }).click();
    await expect(groupingState).toHaveText("Grouping: owner > status");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("1 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const minaGroup = page.locator('[role="row"][data-row-id="group:owner%3DMina"]');
    const minaWaitingGroup = page.locator('[role="row"][data-row-id="group:owner%3DMina/status%3DWaiting"]');
    await expect(waitingGroup).toHaveCount(0);
    await expect(waitingMinaGroup).toHaveCount(0);
    await expect(minaGroup).toBeVisible();
    await expect(minaGroup).toContainText("owner: Mina");
    await expect(minaGroup).toContainText("40");
    await minaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:owner%3DMina");
    await expect(minaWaitingGroup).toBeVisible();
    await minaWaitingGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:owner%3DMina/status%3DWaiting");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel nested removal clears stale expansion in product-owned query state`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);
    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(pageState).toHaveText("Page: 1");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toBeVisible();
    await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Remove owner grouping" }).click();
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(backlogMinaGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel resets nested stale expansion and pagination when grouping changes`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="status"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="owner"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);

    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toBeVisible();
    await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await dragBetweenLocators(page.locator('[role="columnheader"][data-column-id="priority"] .og-grid__header-button'), groupingPanel);
    await expect(groupingState).toHaveText("Grouping: status > owner > priority");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(backlogMinaGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping toolbar clear resets nested stale expansion and pagination`, async ({ page }) => {
    await page.goto(example.url);

    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");

    await page.getByRole("button", { name: "Group status then owner" }).click();
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(pageState).toHaveText("Page: 1");
    await expect(expandedState).toHaveText("Expanded: none");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toBeVisible();
    await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Clear grouping" }).click();
    await expect(groupingState).toHaveText("Grouping: none");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(pageState).toHaveText("Page: 1");
    await expect(backlogGroup).toHaveCount(0);
    await expect(backlogMinaGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.secondPageRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping example keeps filtering and pagination in the server query`, async ({ page }) => {
    await page.goto(example.url);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await expect(page.getByText("240 matching leaf rows")).toBeVisible();
    await expect(page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`)).toHaveText("Page: 1");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`)).toHaveText("Page: 2");
    await expect(page.locator(`[role="row"][data-row-id="${example.secondPageRowId}"]`)).toBeVisible();

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("page 1 of 5")).toBeVisible();
    await expect(page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`)).toHaveText("Page: 1");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();
    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    await expect(backlogGroup).toBeVisible();
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(backlogGroup).toContainText("status: Backlog");
    await expect(backlogGroup).toContainText("20");
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping sorting preserves product-owned pagination`, async ({ page }) => {
    await page.goto(example.url);

    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await expect(sortingState).toHaveText("Sorting: none");
    await expect(pageState).toHaveText("Page: 1");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");
    await expect(page.locator(`[role="row"][data-row-id="${example.secondPageRowId}"]`)).toBeVisible();

    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:asc");
    await expect(pageState).toHaveText("Page: 2");
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 2");
    await expect(page.locator(`[role="row"][data-row-id="${example.valueDescSecondPageRowId}"]`)).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestValueRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping expanded rows keep server pagination bounded`, async ({ page }) => {
    await page.goto(example.url);

    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(page.getByText("4 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();
    await expect(page.getByText("4 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping filters preserve sorting and reset pagination`, async ({ page }) => {
    await page.goto(example.url);

    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:asc");
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");
    await expect(page.locator(`[role="row"][data-row-id="${example.valueDescSecondPageRowId}"]`)).toBeVisible();

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("page 1 of 5")).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestValueRowId}"]`)).toHaveCount(0);
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping preserves filtered sorting through grouping`, async ({ page }) => {
    await page.goto(example.url);

    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const waitingGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting"]');
    await expect(waitingGroup).toBeVisible();
    await expect(waitingGroup).toContainText("status: Waiting");
    await expect(waitingGroup).toContainText("20");
    await waitingGroup.locator(".og-grid__group-toggle").click();
    await expect(waitingGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping clear preserves filtered sorting in flat rows`, async ({ page }) => {
    await page.goto(example.url);

    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("40 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 5")).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const waitingGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting"]');
    await expect(waitingGroup).toBeVisible();
    await waitingGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DWaiting");
    await expect(waitingGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Clear grouping" }).click();
    await expect(groupingState).toHaveText("Grouping: none");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("40 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 5")).toBeVisible();
    await expect(waitingGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping panel removal preserves filtered sorting in flat rows`, async ({ page }) => {
    await page.goto(example.url);

    const groupingPanel = page.locator(".og-grid__grouping-panel");
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(groupingPanel.locator('[data-column-id="status"]')).toContainText("Status");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const waitingGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting"]');
    await expect(waitingGroup).toBeVisible();
    await waitingGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DWaiting");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await groupingPanel.getByRole("button", { name: "Remove status grouping" }).click();
    await expect(groupingState).toHaveText("Grouping: none");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(groupingPanel).toContainText("Drag column headers here to group");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("40 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 5")).toBeVisible();
    await expect(waitingGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping filter clear restores sorted full grouped rows`, async ({ page }) => {
    await page.goto(example.url);

    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await valueHeaderButton.click();
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(groupingState).toHaveText("Grouping: status");
    const waitingGroup = page.locator('[role="row"][data-row-id="group:status%3DWaiting"]');
    await expect(waitingGroup).toBeVisible();
    await waitingGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DWaiting");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toBeVisible();

    await page.getByPlaceholder("Filter account").fill("");
    await expect(groupingState).toHaveText("Grouping: status");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(pageState).toHaveText("Page: 1");
    await expect(page.getByText("240 matching leaf rows")).toBeVisible();
    await expect(page.getByText("4 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();

    const resolvedGroup = page.locator('[role="row"][data-row-id="group:status%3DResolved"]');
    await expect(resolvedGroup).toBeVisible();
    await expect(resolvedGroup).toContainText("status: Resolved");
    await expect(resolvedGroup).toContainText("60");
    await expect(waitingGroup).toHaveAttribute("data-expanded", "false");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestAcmeValueRowId}"]`)).toHaveCount(0);

    await resolvedGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DResolved");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestValueRowId}"]`)).toBeVisible();
  });
}

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping filter changes clear stale expansion in product-owned query state`, async ({ page }) => {
    await page.goto(example.url);

    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const pageState = page.getByTestId(example.framework === "react" ? "query-page" : `${example.framework}-query-page`);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(pageState).toHaveText("Page: 2");

    await page.getByRole("button", { name: "Group status then owner" }).click();
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(pageState).toHaveText("Page: 1");
    await expect(expandedState).toHaveText("Expanded: none");

    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');
    await expect(backlogGroup).toBeVisible();
    await backlogGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toBeVisible();
    await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByPlaceholder("Filter account").fill("Acme");
    await expect(page.getByText("40 matching leaf rows")).toBeVisible();
    await expect(page.getByText("2 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();
    await expect(pageState).toHaveText("Page: 1");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(backlogMinaGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);

    await page.getByPlaceholder("Filter account").fill("");
    await expect(page.getByText("240 matching leaf rows")).toBeVisible();
    await expect(page.getByText("4 server rows")).toBeVisible();
    await expect(page.getByText("page 1 of 1")).toBeVisible();
    await expect(pageState).toHaveText("Page: 1");
    await expect(expandedState).toHaveText("Expanded: none");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "false");
    await expect(backlogMinaGroup).toHaveCount(0);
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toHaveCount(0);
  });
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

for (const example of allFrameworkExamples) {
  test(`${example.framework} server grouping example keeps sorting in the server query through grouping`, async ({ page }) => {
    await page.goto(example.url);

    await expect(page.getByRole("heading", { name: example.heading })).toBeVisible();
    const groupingState = page.getByTestId(example.framework === "react" ? "query-grouping" : `${example.framework}-query-grouping`);
    const expandedState = page.getByTestId(example.framework === "react" ? "query-expanded" : `${example.framework}-query-expanded`);
    const sortingState = page.getByTestId(example.framework === "react" ? "query-sorting" : `${example.framework}-query-sorting`);
    const valueHeaderButton = page.locator('[role="columnheader"][data-column-id="value"] .og-grid__header-button');
    const backlogGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog"]');
    const backlogMinaGroup = page.locator('[role="row"][data-row-id="group:status%3DBacklog/owner%3DMina"]');

    await expect(sortingState).toHaveText("Sorting: none");
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:asc");
    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(page.locator(`[role="row"][data-row-id="${example.highestValueRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status", exact: true }).click();
    await expect(sortingState).toHaveText("Sorting: value:desc");
    await expect(backlogGroup).toBeVisible();
    await expect(backlogGroup).toContainText("status: Backlog");
    if (example.framework === "react") {
      await backlogGroup.locator(".og-grid__group-toggle").click();
    } else {
      await page.getByRole("button", { name: "Toggle Backlog group" }).click();
    }
    await expect(page.locator(`[role="row"][data-row-id="${example.highestBacklogValueRowId}"]`)).toBeVisible();

    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: none");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "Group status then owner" }).click();
    await expect(groupingState).toHaveText("Grouping: status > owner");
    await expect(expandedState).toHaveText("Expanded: none");
    if (example.framework === "react") {
      await backlogGroup.locator(".og-grid__group-toggle").click();
    } else {
      await page.getByRole("button", { name: "Toggle Backlog group" }).click();
    }
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(expandedState).toContainText("group:status%3DBacklog");
    if (example.framework === "react") {
      await backlogMinaGroup.locator(".og-grid__group-toggle").click();
    } else {
      await page.getByRole("button", { name: "Toggle Backlog Mina group" }).click();
    }
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();

    await valueHeaderButton.click();
    await expect(sortingState).toHaveText("Sorting: value:asc");
    await expect(backlogGroup).toHaveAttribute("data-expanded", "true");
    await expect(backlogMinaGroup).toHaveAttribute("data-expanded", "true");
    await expect(expandedState).toContainText("group:status%3DBacklog");
    await expect(expandedState).toContainText("group:status%3DBacklog/owner%3DMina");
    await expect(page.locator(`[role="row"][data-row-id="${example.leafRowId}"]`)).toBeVisible();
  });
}
