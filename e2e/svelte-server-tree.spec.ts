import { expect, test } from "@playwright/test";
import { getE2eUrl } from "../scripts/e2e-ports.mjs";

const svelteServerTreeUrl = getE2eUrl(4182);

test("svelte server tree example loads async children outside core and preserves expansion", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("heading", { name: "Svelte server lazy tree" })).toBeVisible();
  await expect(page.getByText("18 server portfolios · page 1 of 3")).toBeVisible();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: none");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toBeVisible();

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-loading"]')).toContainText("Loading child rows");

  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toBeVisible();

  await page.getByRole("button", { name: /Budget/ }).click();
  await expect(page.getByTestId("svelte-tree-sorting")).toHaveText("Sorting: budget:asc");
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();

  await page.getByRole("button", { name: /Budget/ }).click();
  await expect(page.getByTestId("svelte-tree-sorting")).toHaveText("Sorting: budget:desc");
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toHaveCount(0);
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toBeVisible();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();
});

test("svelte server tree example keeps loaded branches through pagination", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("heading", { name: "Svelte server lazy tree" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toHaveCount(0);
  await expect(page.getByText("18 server portfolios · page 2 of 3")).toBeVisible();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");

  await page.getByRole("button", { name: "First" }).click();
  await expect(page.getByText("18 server portfolios · page 1 of 3")).toBeVisible();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1");
});

test("svelte server tree example keeps loaded selection through collapse and re-expand", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();

  await page.locator('[role="gridcell"][data-row-id="PFL-001"][data-column-id="name"]').click();
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: none");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");
});

test("svelte server tree example refreshes loaded lazy children in product state", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Refresh PFL-001" })).toBeDisabled();

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-refreshes")).toHaveText("Refreshes: none");
  await expect(page.getByRole("button", { name: "Refresh PFL-001" })).toBeEnabled();

  await page.getByRole("button", { name: "Refresh PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-loading"]')).toContainText("Loading child rows");

  await expect(page.getByTestId("svelte-tree-refreshes")).toHaveText("Refreshes: PFL-001: 1");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (refresh 1)");
});

test("svelte server tree example bulk refreshes loaded lazy branches and preserves selection", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Refresh loaded branches" })).toBeDisabled();

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();
  await page.getByRole("button", { name: "Expand PFL-003" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toBeVisible();
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-003");
  await expect(page.getByRole("button", { name: "Refresh loaded branches" })).toBeEnabled();

  await page.locator('[role="gridcell"][data-row-id="PFL-001"][data-column-id="name"]').click();
  await page.locator('[role="gridcell"][data-row-id="PFL-003"][data-column-id="name"]').click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-003-WRK-1");

  await page.getByRole("button", { name: "Refresh loaded branches" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toContainText("PFL-001");
  await expect(page.getByTestId("svelte-tree-expanded")).toContainText("PFL-003");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: none");
  await expect(page.getByTestId("svelte-tree-loading")).toContainText("PFL-001");
  await expect(page.getByTestId("svelte-tree-loading")).toContainText("PFL-003");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-003-WRK-1");

  await expect(page.getByTestId("svelte-tree-refreshes")).toContainText("PFL-001: 1");
  await expect(page.getByTestId("svelte-tree-refreshes")).toContainText("PFL-003: 1");
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-003");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (refresh 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toContainText("Portfolio 003 / work 1 (refresh 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toHaveAttribute("data-selected", "true");
});

test("svelte server tree example commits server-owned child mutations", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Mutate PFL-001 work 1" })).toBeDisabled();
  await expect(page.getByTestId("svelte-tree-mutations")).toHaveText("Mutations: none");
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: none");

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1");
  await expect(page.getByRole("button", { name: "Mutate PFL-001 work 1" })).toBeEnabled();

  await page.getByRole("button", { name: "Mutate PFL-001 work 1" }).click();
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: PFL-001-WRK-1");
  await expect(page.getByRole("button", { name: "Mutate PFL-001 work 1" })).toBeDisabled();
  await expect(page.getByTestId("svelte-tree-mutations")).toHaveText("Mutations: PFL-001-WRK-1: 1");
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: none");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (mutated 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Blocked");

  await page.getByRole("button", { name: "Refresh PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (refresh 1) (mutated 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Blocked");
});

test("svelte server tree example merges server patches with local mutation policy", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Merge PFL-001 server patch" })).toBeDisabled();
  await expect(page.getByTestId("svelte-tree-merges")).toHaveText("Merges: none");
  await expect(page.getByTestId("svelte-tree-merge-conflicts")).toHaveText("Merge conflicts: none");

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toContainText("Portfolio 001 / work 4");
  await page.getByRole("button", { name: "Mutate PFL-001 work 1" }).click();
  await expect(page.getByTestId("svelte-tree-mutations")).toHaveText("Mutations: PFL-001-WRK-1: 1");

  await page.getByRole("button", { name: "Merge PFL-001 server patch" }).click();
  await expect(page.getByTestId("svelte-tree-merges")).toHaveText("Merges: PFL-001: 1");
  await expect(page.getByTestId("svelte-tree-merge-conflicts")).toHaveText("Merge conflicts: PFL-001-WRK-1: kept local mutation over remote merge 1");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (mutated 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toContainText("Portfolio 001 / work 4 (merged 1)");

  await page.getByRole("button", { name: "Refresh PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toContainText("Portfolio 001 / work 4 (refresh 1) (merged 1)");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toContainText("Portfolio 001 / work 1 (refresh 1) (mutated 1)");
});

test("svelte server tree example rolls back rejected optimistic child mutations", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Optimistic fail PFL-001 work 2" })).toBeDisabled();
  await expect(page.getByTestId("svelte-tree-mutation-errors")).toHaveText("Mutation errors: none");

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  const workRow = page.locator('[role="row"][data-row-id="PFL-001-WRK-2"]');
  await expect(workRow).toContainText("Portfolio 001 / work 2");
  await expect(workRow).toContainText("Planned");
  await expect(page.getByRole("button", { name: "Optimistic fail PFL-001 work 2" })).toBeEnabled();

  await page.getByRole("button", { name: "Optimistic fail PFL-001 work 2" }).click();
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: PFL-001-WRK-2");
  await expect(workRow).toContainText("Portfolio 001 / work 2 (optimistic)");
  await expect(workRow).toContainText("Blocked");

  await expect(page.getByTestId("svelte-tree-mutation-errors")).toContainText("PFL-001-WRK-2: Server rejected optimistic mutation");
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: none");
  await expect(workRow).toContainText("Portfolio 001 / work 2");
  await expect(workRow).not.toContainText("optimistic");
  await expect(workRow).toContainText("Planned");
});

test("svelte server tree example keeps paginated branch mutation conflicts in product state", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByRole("button", { name: "Conflict PFL-001 work 3" })).toBeDisabled();
  await expect(page.getByTestId("svelte-tree-mutation-errors")).toHaveText("Mutation errors: none");

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  const workRow = page.locator('[role="row"][data-row-id="PFL-001-WRK-3"]');
  await expect(workRow).toContainText("Portfolio 001 / work 3");
  await expect(page.getByRole("button", { name: "Conflict PFL-001 work 3" })).toBeEnabled();

  await page.getByRole("button", { name: "Conflict PFL-001 work 3" }).click();
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: PFL-001-WRK-3");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toHaveCount(0);
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-001");
  await expect(page.getByTestId("svelte-tree-mutation-errors")).toContainText(
    "PFL-001-WRK-3: Version conflict: PFL-001 changed after mutation snapshot 0 for PFL-001-WRK-3",
  );
  await expect(page.getByTestId("svelte-tree-mutating")).toHaveText("Mutating: none");
  await expect(page.getByRole("button", { name: "Recover PFL-001 conflict" })).toBeEnabled();

  await page.getByRole("button", { name: "Recover PFL-001 conflict" }).click();
  await expect(page.getByTestId("svelte-tree-mutation-errors")).toHaveText("Mutation errors: none");
  await expect(page.getByTestId("svelte-tree-refreshes")).toHaveText("Refreshes: PFL-001: 1");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");

  await page.getByRole("button", { name: "First" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(workRow).toContainText("Portfolio 001 / work 3 (refresh 1)");
  await expect(workRow).not.toContainText("mutated");
  await expect(page.getByTestId("svelte-tree-mutations")).toHaveText("Mutations: none");
  await expect(page.getByRole("button", { name: "Recover PFL-001 conflict" })).toBeDisabled();
});

test("svelte server tree example selects loaded descendants from expandable parents", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await page.getByRole("button", { name: "Toggle PFL-001" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toBeVisible();

  await page.locator('[role="gridcell"][data-row-id="PFL-001"][data-column-id="name"]').click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-4");

  await page.getByRole("button", { name: "Refresh PFL-001" }).click();
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-001");
  await expect(page.getByTestId("svelte-tree-loaded")).toHaveText("Loaded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-4");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toHaveCount(0);
  await page.getByRole("button", { name: "First" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: /Budget/ }).click();
  await expect(page.getByTestId("svelte-tree-sorting")).toHaveText("Sorting: budget:asc");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: /Budget/ }).click();
  await expect(page.getByTestId("svelte-tree-sorting")).toHaveText("Sorting: budget:desc");
  await expect(page.locator('[role="row"][data-row-id="PFL-001"]')).toHaveCount(0);
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-1");
  await expect(page.getByTestId("svelte-tree-selected")).toContainText("PFL-001-WRK-4");

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-001");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-1"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[role="row"][data-row-id="PFL-001-WRK-4"]')).toHaveAttribute("data-selected", "true");
});

test("svelte server tree example keeps async load errors and retries in product state", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByTestId("svelte-tree-errors")).toHaveText("Errors: none");
  await expect(page.getByRole("button", { name: "Retry PFL-002" })).toBeDisabled();

  await page.getByRole("button", { name: "Expand PFL-002" }).click();
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-002");
  await expect(page.locator('[role="row"][data-row-id="PFL-002-loading"]')).toContainText("Loading child rows");

  await expect(page.getByTestId("svelte-tree-errors")).toContainText("PFL-002: Temporary server error");
  await expect(page.getByRole("button", { name: "Retry PFL-002" })).toBeEnabled();
  await expect(page.locator('[role="row"][data-row-id="PFL-002-error"]')).toContainText("Failed to load child rows");
  await expect(page.locator('[role="row"][data-row-id="PFL-002-error"]')).toContainText("Temporary server error");

  await page.getByRole("button", { name: "Retry PFL-002" }).click();
  await expect(page.getByTestId("svelte-tree-errors")).toHaveText("Errors: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-002");
  await expect(page.locator('[role="row"][data-row-id="PFL-002-WRK-1"]')).toBeVisible();
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-002");
  await expect(page.getByRole("button", { name: "Retry PFL-002" })).toBeDisabled();
});

test("svelte server tree example cancels collapsed loads and ignores stale responses", async ({ page }) => {
  await page.goto(svelteServerTreeUrl);

  await expect(page.getByTestId("svelte-tree-cancelled")).toHaveText("Cancelled: none");

  await page.getByRole("button", { name: "Expand PFL-003" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: PFL-003");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-003");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-loading"]')).toContainText("Loading child rows");

  await page.getByRole("button", { name: "Collapse PFL-003" }).click();
  await expect(page.getByTestId("svelte-tree-expanded")).toHaveText("Expanded: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: none");
  await expect(page.getByTestId("svelte-tree-cancelled")).toContainText("PFL-003: collapsed before response");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-loading"]')).toHaveCount(0);

  await page.waitForTimeout(250);
  await expect(page.getByTestId("svelte-tree-loaded")).not.toContainText("PFL-003");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Expand PFL-003" }).click();
  await expect(page.getByTestId("svelte-tree-cancelled")).toHaveText("Cancelled: none");
  await expect(page.getByTestId("svelte-tree-loading")).toHaveText("Loading: PFL-003");
  await expect(page.locator('[role="row"][data-row-id="PFL-003-WRK-1"]')).toBeVisible();
  await expect(page.getByTestId("svelte-tree-loaded")).toContainText("PFL-003");
});
