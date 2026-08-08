import { expect, test, type Page } from "@playwright/test";
import type { BenchmarkAction, BenchmarkSnapshot } from "@open-grid/benchmark-shared/browser";

const targets = [
  { implementation: "open-grid-react-full", url: "http://127.0.0.1:4306" },
  { implementation: "open-grid-vue", url: "http://127.0.0.1:4304" },
  { implementation: "open-grid-svelte", url: "http://127.0.0.1:4305" },
] as const;
const defaultColumnOrder = Array.from({ length: 20 }, (_, index) => `column_${index}`);
const movedColumnOrder = [...defaultColumnOrder.slice(0, 2), "column_10", ...defaultColumnOrder.slice(2, 10), ...defaultColumnOrder.slice(11)];
const multiSortRules = [
  { columnId: "column_2", direction: "asc" as const },
  { columnId: "column_5", direction: "asc" as const },
];
const multiFilterRules = [
  { columnId: "column_2", value: "Blocked" },
  { columnId: "column_4", value: "APAC" },
];

test("keeps React, Vue, and Svelte full-grid workloads behaviorally aligned", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pages: Page[] = [];
  try {
    for (const target of targets) {
      const page = await context.newPage();
      pages.push(page);
      await page.addInitScript(() => {
        window.__OPEN_GRID_HEADER_MEASUREMENTS__ = 0;
        const getBoundingClientRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function patchedGetBoundingClientRect() {
          if (this instanceof HTMLElement && this.classList.contains("og-grid__header-cell")) {
            window.__OPEN_GRID_HEADER_MEASUREMENTS__ += 1;
          }
          return getBoundingClientRect.call(this);
        };
      });
      await page.goto(`${target.url}/?profile=standard-client`);
      await expect(page.locator("html")).toHaveAttribute("data-benchmark-ready", "true");
    }

    const initial = await Promise.all(pages.map(readSnapshot));
    expect(new Set(initial.map((snapshot) => snapshot.implementation))).toEqual(new Set(targets.map((target) => target.implementation)));
    expect(new Set(await Promise.all(pages.map((page) => page.evaluate(() => window.__OPEN_GRID_BENCHMARK__?.datasetFingerprint)))).size).toBe(1);
    expect(await Promise.all(pages.map((page) => page.evaluate(() => window.__OPEN_GRID_BENCHMARK__?.version)))).toEqual([15, 15, 15]);
    expect(await Promise.all(pages.map((page) => page.evaluate(() => window.__OPEN_GRID_HEADER_MEASUREMENTS__)))).toEqual([0, 0, 0]);
    for (const snapshot of initial) {
      expect(snapshot.displayedRowCount).toBe(10_000);
      expect(snapshot.visibleColumnCount).toBe(20);
      expect(snapshot.columnSize).toEqual({ columnId: "column_10", size: 120 });
      expect(snapshot.columnOrderIds).toEqual(defaultColumnOrder);
      expect(snapshot.columnPinning).toEqual({ left: [], right: [] });
      expect(snapshot.selectedRowIds).toEqual([]);
      expect(snapshot.selectedRowCount).toBe(0);
      expect(snapshot.allRowsSelected).toBe(false);
      expect(snapshot.sorting).toEqual([]);
      expect(snapshot.columnFilters).toEqual([]);
      expect(snapshot.mountedRowCount).toBeGreaterThan(0);
      expect(snapshot.mountedRowCount).toBeLessThan(80);
    }

    for (const page of pages) {
      const header = page.locator('[role="columnheader"][data-column-id="column_5"]');
      const resizeHandle = header.locator(".og-grid__resize-handle");
      const initialWidth = await header.evaluate((element) => element.getBoundingClientRect().width);

      await header.locator(".og-grid__header-button").click();
      await expect(header).toHaveAttribute("aria-sort", "ascending");
      expect((await readSnapshot(page)).sort).toEqual({ columnId: "column_5", direction: "asc" });

      await resizeHandle.focus();
      await resizeHandle.press("ArrowRight");
      await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(initialWidth);
      await resizeHandle.press("ArrowLeft");
      await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().width)).toBe(initialWidth);
    }

    await measureAll(pages, { type: "clear" });
    await measureAll(pages, { type: "sort", columnId: "column_5", direction: "asc" });
    await measureAll(pages, { type: "clear" });
    await measureAll(pages, { type: "filter", value: "Blocked" });
    const filtered = await Promise.all(pages.map(readSnapshot));
    expect(new Set(filtered.map((snapshot) => snapshot.displayedRowCount)).size).toBe(1);
    expect(filtered[0]?.displayedRowCount).toBeGreaterThan(0);
    expect(filtered[0]?.displayedRowCount).toBeLessThan(10_000);
    await measureAll(pages, { type: "clear" });
    await measureAll(pages, { type: "columnFilter", columnId: "column_2", value: "Blocked" });
    const columnFiltered = await Promise.all(pages.map(readSnapshot));
    expect(columnFiltered.map((snapshot) => snapshot.displayedRowCount)).toEqual(filtered.map((snapshot) => snapshot.displayedRowCount));
    expect(columnFiltered.every((snapshot) => snapshot.columnFilter?.columnId === "column_2" && snapshot.columnFilter.value === "Blocked")).toBe(true);
    await measureAll(pages, { type: "clear" });
    await measureAll(pages, { type: "columnVisibility", columnId: "column_10", visible: false });
    expect((await Promise.all(pages.map(readSnapshot))).map((snapshot) => snapshot.visibleColumnCount)).toEqual([19, 19, 19]);
    await measureAll(pages, { type: "columnVisibility", columnId: "column_10", visible: true });
    expect((await Promise.all(pages.map(readSnapshot))).map((snapshot) => snapshot.visibleColumnCount)).toEqual([20, 20, 20]);
    await measureAll(pages, { type: "columnSizing", columnId: "column_10", size: 200 });
    expect((await Promise.all(pages.map(readSnapshot))).map((snapshot) => snapshot.columnSize.size)).toEqual([200, 200, 200]);
    await Promise.all(pages.map((page) => expect.poll(() => page.locator('[role="columnheader"][data-column-id="column_10"]').evaluate((element) => element.getBoundingClientRect().width)).toBe(200)));
    await measureAll(pages, { type: "columnSizing", columnId: "column_10", size: 120 });
    expect((await Promise.all(pages.map(readSnapshot))).map((snapshot) => snapshot.columnSize.size)).toEqual([120, 120, 120]);
    await Promise.all(pages.map((page) => expect.poll(() => page.locator('[role="columnheader"][data-column-id="column_10"]').evaluate((element) => element.getBoundingClientRect().width)).toBe(120)));
    await measureAll(pages, { type: "columnOrdering", columnIds: movedColumnOrder });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.columnOrderIds).toEqual(movedColumnOrder);
      await expect.poll(() => readRenderedColumnOrder(pages[pageIndex]!)).toEqual(movedColumnOrder.slice(0, 3));
    }
    await measureAll(pages, { type: "columnOrdering", columnIds: defaultColumnOrder });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.columnOrderIds).toEqual(defaultColumnOrder);
      await expect.poll(() => readRenderedColumnOrder(pages[pageIndex]!)).toEqual(defaultColumnOrder.slice(0, 3));
    }
    await measureAll(pages, { type: "columnPinning", columnId: "column_10", pinned: true });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.columnPinning).toEqual({ left: ["column_10"], right: [] });
      await expect.poll(() => readPinnedColumnState(pages[pageIndex]!)).toEqual({ pinned: true, atLeftEdge: true });
    }
    await measureAll(pages, { type: "columnPinning", columnId: "column_10", pinned: false });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.columnPinning).toEqual({ left: [], right: [] });
      await expect.poll(() => readPinnedColumnState(pages[pageIndex]!)).toEqual({ pinned: false, atLeftEdge: false });
    }
    await measureAll(pages, { type: "rowSelection", rowId: "row_0", selected: true });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.selectedRowIds).toEqual(["row_0"]);
      expect(snapshot.selectedRowCount).toBe(1);
      await expect.poll(() => readSelectedRowState(pages[pageIndex]!)).toBe(true);
    }
    await measureAll(pages, { type: "rowSelection", rowId: "row_0", selected: false });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.selectedRowIds).toEqual([]);
      expect(snapshot.selectedRowCount).toBe(0);
      await expect.poll(() => readSelectedRowState(pages[pageIndex]!)).toBe(false);
    }
    await measureAll(pages, { type: "allRowSelection", selected: true });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.selectedRowCount).toBe(snapshot.rowCount);
      expect(snapshot.allRowsSelected).toBe(true);
      await expect.poll(() => readMountedRowsSelectionState(pages[pageIndex]!)).toEqual({ mounted: expect.any(Number), selected: expect.any(Number), allSelected: true });
    }
    await measureAll(pages, { type: "allRowSelection", selected: false });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.selectedRowCount).toBe(0);
      expect(snapshot.allRowsSelected).toBe(false);
      await expect.poll(() => readMountedRowsSelectionState(pages[pageIndex]!)).toEqual({ mounted: expect.any(Number), selected: 0, allSelected: false });
    }
    await measureAll(pages, { type: "multiSort", rules: multiSortRules });
    const multiSorted = await Promise.all(pages.map(readSnapshot));
    for (const snapshot of multiSorted) {
      expect(snapshot.sort).toEqual(multiSortRules[0]);
      expect(snapshot.sorting).toEqual(multiSortRules);
    }
    expect(new Set(multiSorted.map((snapshot) => snapshot.firstMountedRowId)).size).toBe(1);
    await measureAll(pages, { type: "multiSort", rules: [] });
    const multiSortCleared = await Promise.all(pages.map(readSnapshot));
    for (const snapshot of multiSortCleared) {
      expect(snapshot.sort).toBeNull();
      expect(snapshot.sorting).toEqual([]);
      expect(snapshot.firstMountedRowId).toBe("row_0");
    }
    await measureAll(pages, { type: "multiFilter", rules: multiFilterRules });
    const multiFiltered = await Promise.all(pages.map(readSnapshot));
    expect(new Set(multiFiltered.map((snapshot) => snapshot.displayedRowCount)).size).toBe(1);
    expect(new Set(multiFiltered.map((snapshot) => snapshot.firstMountedRowId)).size).toBe(1);
    for (const snapshot of multiFiltered) {
      expect(snapshot.columnFilters).toEqual(multiFilterRules);
      expect(snapshot.displayedRowCount).toBeGreaterThan(0);
      expect(snapshot.displayedRowCount).toBeLessThan(snapshot.rowCount);
    }
    await measureAll(pages, { type: "multiFilter", rules: [] });
    for (const snapshot of await Promise.all(pages.map(readSnapshot))) {
      expect(snapshot.columnFilters).toEqual([]);
      expect(snapshot.displayedRowCount).toBe(snapshot.rowCount);
      expect(snapshot.firstMountedRowId).toBe("row_0");
    }
    await measureAll(pages, { type: "scroll", top: 120_000, left: 1_200 });
    for (const [pageIndex, snapshot] of (await Promise.all(pages.map(readSnapshot))).entries()) {
      expect(snapshot.scrollTop).toBeGreaterThan(100_000);
      expect(snapshot.mountedRowCount).toBeGreaterThan(0);
      expect(snapshot.mountedRowCount).toBeLessThan(80);
      const alignment = await readColumnAlignment(pages[pageIndex]!);
      expect(alignment.alignedColumnCount).toBeGreaterThan(0);
      expect(alignment.maxEdgeDelta).toBeLessThanOrEqual(1);
    }
  } finally {
    await context.close();
  }
});

declare global {
  interface Window {
    __OPEN_GRID_HEADER_MEASUREMENTS__: number;
  }
}

function readSnapshot(page: Page): Promise<BenchmarkSnapshot> {
  return page.evaluate(() => window.__OPEN_GRID_BENCHMARK__!.getSnapshot());
}

function readColumnAlignment(page: Page): Promise<{ alignedColumnCount: number; maxEdgeDelta: number }> {
  return page.evaluate(() => {
    const firstRow = document.querySelector<HTMLElement>(".og-grid__body > .og-grid__row");
    const cells = firstRow ? [...firstRow.querySelectorAll<HTMLElement>(":scope > .og-grid__cell")] : [];
    const edgeDeltas = cells.flatMap((cell) => {
      const columnId = cell.dataset.columnId;
      const header = columnId
        ? document.querySelector<HTMLElement>(`.og-grid__header [role="columnheader"][data-column-id="${CSS.escape(columnId)}"]`)
        : null;
      if (!header) return [];
      const cellRect = cell.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      return [Math.abs(cellRect.left - headerRect.left), Math.abs(cellRect.right - headerRect.right)];
    });

    return {
      alignedColumnCount: edgeDeltas.length / 2,
      maxEdgeDelta: edgeDeltas.length > 0 ? Math.max(...edgeDeltas) : Number.POSITIVE_INFINITY,
    };
  });
}

function readRenderedColumnOrder(page: Page): Promise<string[]> {
  return page.locator('[role="columnheader"][data-column-id]').evaluateAll((elements) => elements
    .slice(0, 3)
    .map((element) => (element as HTMLElement).dataset.columnId ?? ""));
}

function readPinnedColumnState(page: Page): Promise<{ pinned: boolean; atLeftEdge: boolean }> {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.og-grid__header [role="columnheader"][data-column-id="column_10"]');
    const scroller = document.querySelector<HTMLElement>(".og-grid__scroller");
    const pinned = header?.dataset.pinned === "left";
    return {
      pinned,
      atLeftEdge: Boolean(pinned && header && scroller && Math.abs(header.getBoundingClientRect().left - scroller.getBoundingClientRect().left) <= 1),
    };
  });
}

function readSelectedRowState(page: Page): Promise<boolean> {
  return page.locator('.og-grid__row[data-row-id="row_0"]').evaluate((row) =>
    row.getAttribute("aria-selected") === "true" || (row as HTMLElement).dataset.selected === "true");
}

function readMountedRowsSelectionState(page: Page): Promise<{ mounted: number; selected: number; allSelected: boolean }> {
  return page.locator(".og-grid__row[data-row-id]").evaluateAll((rows) => {
    const selected = rows.filter((row) => row.getAttribute("aria-selected") === "true" || (row as HTMLElement).dataset.selected === "true").length;
    return { mounted: rows.length, selected, allSelected: rows.length > 0 && selected === rows.length };
  });
}

async function measureAll(pages: Page[], action: BenchmarkAction): Promise<void> {
  const durations = await Promise.all(pages.map((page) => page.evaluate(
    (selectedAction) => window.__OPEN_GRID_BENCHMARK__!.measureAction(selectedAction),
    action,
  )));
  durations.forEach((duration) => expect(duration).toBeGreaterThan(0));
}
