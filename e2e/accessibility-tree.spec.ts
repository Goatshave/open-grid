import { expect, test } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

interface AXValue {
  value?: unknown;
}

interface AXNode {
  role?: AXValue;
  name?: AXValue;
  properties?: Array<{ name: string; value?: AXValue }>;
}

for (const example of getPlaywrightUiSmokeTargets()) {
  test(`${example.framework} reference UI exposes the grid contract in Chromium's accessibility tree`, async ({ page }) => {
    await page.goto(example.url);

    const grid = page.getByRole("grid", { name: example.smokeCheck.gridLabel });
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount", /^(?:-1|[1-9]\d*)$/);
    await expect(grid).toHaveAttribute("aria-colcount", /^[1-9]\d*$/);

    const primaryHeader = page.locator(
      `[role="columnheader"][data-column-id="${example.smokeCheck.primaryColumnId}"]`,
    );
    await expect(primaryHeader).toBeVisible();

    const primaryCell = page.locator(
      `[role="gridcell"][data-row-id][data-column-id="${example.smokeCheck.primaryColumnId}"]`,
    ).first();
    await primaryCell.click();
    await expect(primaryCell).toBeFocused();
    const primaryCellText = (await primaryCell.innerText()).trim();
    expect(primaryCellText).not.toBe("");

    const session = await page.context().newCDPSession(page);
    const { nodes } = await session.send("Accessibility.getFullAXTree") as { nodes: AXNode[] };

    expect(findAXNode(nodes, "grid", example.smokeCheck.gridLabel)).toBeDefined();
    expect(findAXNode(nodes, "columnheader", example.smokeCheck.primaryColumnLabel)).toBeDefined();

    const focusedCell = nodes.find((node) =>
      node.role?.value === "gridcell"
      && node.properties?.some((property) => property.name === "focused" && property.value?.value === true),
    );
    expect(focusedCell?.name?.value).toBe(primaryCellText);
  });
}

function findAXNode(nodes: AXNode[], role: string, namePrefix: string) {
  return nodes.find((node) =>
    node.role?.value === role
    && typeof node.name?.value === "string"
    && node.name.value.startsWith(namePrefix),
  );
}
