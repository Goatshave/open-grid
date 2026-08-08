import { expect, test, type Locator, type Page } from "@playwright/test";
import { getPlaywrightUiSmokeTargets } from "../scripts/ui-smoke-targets.mjs";

const mobileViewport = { width: 390, height: 844 };

for (const example of getPlaywrightUiSmokeTargets()) {
  test(`${example.framework} reference UI reflows at 390px without trapping grid overflow`, async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto(example.url);

    const grid = page.locator("[data-open-grid]").first();
    const scroller = page.locator(".og-grid__scroller").first();
    const columnManagementToggle = page.getByRole("button", { name: "Manage columns" });
    await expect(grid).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    await expect(columnManagementToggle).toHaveAttribute("aria-expanded", "false");

    const gridBox = await grid.boundingBox();
    expect(gridBox).not.toBeNull();
    expect(gridBox?.y ?? mobileViewport.height).toBeLessThan(mobileViewport.height);

    expect(await getDocumentOverflow(page)).toBeLessThanOrEqual(1);
    await expectControlsInsideViewport([
      page.getByRole("button", { name: "Export CSV" }),
      columnManagementToggle,
      page.getByRole("search", { name: "Search grid rows" }),
    ]);

    await columnManagementToggle.click();
    await expect(page.getByLabel("Column management")).toBeVisible();
    await expect(columnManagementToggle).toHaveAttribute("aria-expanded", "true");
    await expectProductControlsFitViewport(page, mobileViewport.width);
    expect(await getDocumentOverflow(page)).toBeLessThanOrEqual(1);
    await columnManagementToggle.click();

    const horizontalScroll = await scroller.evaluate((element) => {
      const maximum = element.scrollWidth - element.clientWidth;
      element.scrollLeft = maximum;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      return {
        clientWidth: element.clientWidth,
        maximum,
        position: element.scrollLeft,
      };
    });

    expect(horizontalScroll.clientWidth).toBeGreaterThan(0);
    expect(horizontalScroll.maximum).toBeGreaterThan(0);
    expect(horizontalScroll.position).toBeGreaterThan(0);
    expect(await getDocumentOverflow(page)).toBeLessThanOrEqual(1);
  });

  test(`${example.framework} reference UI supports the 200% equivalent reflow viewport`, async ({ browser }) => {
    const zoomViewport = example.smokeCheck.zoomEquivalentViewport;
    const context = await browser.newContext({
      viewport: { width: zoomViewport.width, height: zoomViewport.height },
      deviceScaleFactor: zoomViewport.deviceScaleFactor,
    });
    const zoomPage = await context.newPage();

    try {
      await zoomPage.goto(example.url);
      await expect.poll(() => zoomPage.evaluate(() => window.devicePixelRatio)).toBe(zoomViewport.deviceScaleFactor);

      const grid = zoomPage.locator("[data-open-grid]").first();
      const scroller = zoomPage.locator(".og-grid__scroller").first();
      const columnManagementToggle = zoomPage.getByRole("button", { name: "Manage columns" });
      await expect(grid).toBeVisible();
      await expect(columnManagementToggle).toHaveAttribute("aria-expanded", "false");

      const gridBox = await grid.boundingBox();
      expect(gridBox).not.toBeNull();
      expect(gridBox!.y).toBeLessThan(zoomViewport.height);
      await expectProductControlsFitViewport(zoomPage, zoomViewport.width);

      await columnManagementToggle.click();
      await expect(zoomPage.getByLabel("Column management")).toBeVisible();
      await expect(columnManagementToggle).toHaveAttribute("aria-expanded", "true");
      await expectProductControlsFitViewport(zoomPage, zoomViewport.width);
      await columnManagementToggle.click();

      const horizontalScroll = await scroller.evaluate((element) => {
        const maximum = element.scrollWidth - element.clientWidth;
        element.scrollLeft = maximum;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
        return { maximum, position: element.scrollLeft };
      });
      expect(horizontalScroll.maximum).toBeGreaterThan(0);
      expect(horizontalScroll.position).toBeGreaterThan(0);
      expect(await getDocumentOverflow(zoomPage)).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
    }
  });

  test(`${example.framework} reference UI preserves focus and state cues in forced colors`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto(example.url);

    const grid = page.locator("[data-open-grid]").first();
    await expect(grid).toBeVisible();
    await expect.poll(() => page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);

    const markerCheck = example.smokeCheck.semanticMarkers[0];
    const markerValue = markerCheck.values[0];
    const semanticMarkerCell = page.locator(
      `[role="gridcell"][data-row-id="${markerValue.rowId}"][data-column-id="${markerCheck.columnId}"]`,
    );
    await expect(semanticMarkerCell).toHaveText(markerValue.text);
    expect((await semanticMarkerCell.getAttribute("class"))?.split(/\s+/)).toContain(markerValue.className);
    const forcedColorMarkerStyle = await semanticMarkerCell.evaluate((element) => {
      const marker = getComputedStyle(element, "::before");
      return {
        backgroundColor: marker.backgroundColor,
        borderStyle: marker.borderStyle,
        height: marker.height,
        width: marker.width,
      };
    });
    expect(forcedColorMarkerStyle).toMatchObject({ borderStyle: "solid", height: "7px", width: "7px" });
    expect(forcedColorMarkerStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

    await grid.locator('[role="gridcell"][data-row-id]').first().click();
    const focusedCell = page.locator('[role="gridcell"][data-focused="true"]');
    await expect(focusedCell).toBeVisible();
    const initialColumnId = await focusedCell.getAttribute("data-column-id");

    await page.keyboard.press("ArrowRight");
    await expect(focusedCell).not.toHaveAttribute("data-column-id", initialColumnId ?? "");
    const focusOutline = await getOutline(focusedCell);
    expect(focusOutline.style).toBe("solid");
    expect(focusOutline.width).toBeGreaterThanOrEqual(1);
    expect(focusOutline.color).not.toBe("rgba(0, 0, 0, 0)");

    const selectedRow = page.locator('.og-grid__row[data-selected="true"]').first();
    await expect(selectedRow).toBeVisible();
    await page.keyboard.press("Space");
    await expect(selectedRow).not.toBeVisible();
    await page.keyboard.press("Space");
    await expect(selectedRow).toBeVisible();
    const selectedCellOutline = await getOutline(selectedRow.locator(".og-grid__cell").first());
    expect(selectedCellOutline.style).toBe("solid");
    expect(selectedCellOutline.width).toBeGreaterThanOrEqual(1);

    const disabledControl = page.locator(".og-grid button:disabled").first();
    await expect(disabledControl).toBeVisible();
    const disabledStyle = await disabledControl.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        opacity: Number(style.opacity),
      };
    });
    expect(disabledStyle).toEqual({ outlineStyle: "solid", outlineWidth: 1, opacity: 1 });

    await page.getByRole("button", { name: "Refresh data" }).click();
    const loadingOverlay = page.getByRole("status", { name: "Loading rows" });
    await expect(loadingOverlay).toContainText(example.stateCheck.loadingText);
    const loadingStyle = await getStateStyle(loadingOverlay);
    expect(loadingStyle.borderStyle).toBe("solid");
    expect(loadingStyle.borderWidth).toBeGreaterThanOrEqual(1);
    expect(loadingStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await expect(loadingOverlay.locator(".og-grid__loading-spinner")).toHaveCSS("animation-name", "none");

    await page.getByRole("button", { name: "Simulate error" }).click();
    const errorOverlay = page.getByRole("alert", { name: "Grid error" });
    await expect(errorOverlay).toContainText(example.stateCheck.errorText);
    const errorStyle = await getStateStyle(errorOverlay);
    expect(errorStyle.borderStyle).toBe("solid");
    expect(errorStyle.borderWidth).toBeGreaterThan(loadingStyle.borderWidth);
    expect(errorStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await expect(loadingOverlay).toHaveCount(0);

    const retry = page.getByRole("button", { name: "Retry loading rows" });
    await retry.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(retry).toBeFocused();
    const retryOutline = await getOutline(retry);
    expect(retryOutline.style).toBe("solid");
    expect(retryOutline.width).toBeGreaterThanOrEqual(2);
    await retry.click();
    await expect(loadingOverlay).toContainText(example.stateCheck.loadingText);
    await page.getByRole("button", { name: "Finish refresh" }).click();
    await expect(loadingOverlay).toHaveCount(0);

    const invalidCell = page.locator(
      `[role="gridcell"][data-row-id="${example.stateCheck.editableRowId}"][data-column-id="${example.stateCheck.editableColumnId}"]`,
    );
    await invalidCell.dblclick();
    const editor = invalidCell.locator(".og-grid__cell-editor");
    await editor.fill(example.stateCheck.invalidEditValue);
    await editor.press("Enter");
    await expect(invalidCell).toHaveAttribute("data-validation-invalid", "true");
    await expect(editor).toHaveAttribute("aria-invalid", "true");
    const validationMessage = invalidCell.getByRole("alert");
    await expect(validationMessage).toContainText(example.stateCheck.validationMessage);
    const validationOutline = await getOutline(invalidCell);
    expect(validationOutline.style).toBe("solid");
    expect(validationOutline.width).toBeGreaterThanOrEqual(1);
    const validationStyle = await validationMessage.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    expect(validationStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(validationStyle.color).not.toBe(validationStyle.backgroundColor);
  });
}

async function expectProductControlsFitViewport(page: Page, viewportWidth: number) {
  const layout = await page.evaluate((width) => {
    const controls = [...document.querySelectorAll<HTMLElement>("button,input,select")].filter(
      (element) => element.checkVisibility() && !element.closest('[role="grid"]'),
    );
    const clipped = controls
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > width + 1;
      })
      .map((element) => element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName);
    const overlaps: string[][] = [];

    for (let index = 0; index < controls.length; index += 1) {
      const first = controls[index];
      const firstBox = first.getBoundingClientRect();
      for (let comparisonIndex = index + 1; comparisonIndex < controls.length; comparisonIndex += 1) {
        const second = controls[comparisonIndex];
        const secondBox = second.getBoundingClientRect();
        const overlapWidth = Math.min(firstBox.right, secondBox.right) - Math.max(firstBox.left, secondBox.left);
        const overlapHeight = Math.min(firstBox.bottom, secondBox.bottom) - Math.max(firstBox.top, secondBox.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          overlaps.push([
            first.getAttribute("aria-label") || first.textContent?.trim() || first.tagName,
            second.getAttribute("aria-label") || second.textContent?.trim() || second.tagName,
          ]);
        }
      }
    }

    return { clipped, overlaps };
  }, viewportWidth);

  expect(layout.clipped).toEqual([]);
  expect(layout.overlaps).toEqual([]);
  expect(await getDocumentOverflow(page)).toBeLessThanOrEqual(1);
}

async function expectControlsInsideViewport(controls: Locator[]) {
  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(mobileViewport.width);
  }
}

async function getDocumentOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function getOutline(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.outlineColor,
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
}

async function getStateStyle(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderStyle: style.borderStyle,
      borderWidth: Number.parseFloat(style.borderWidth),
    };
  });
}
