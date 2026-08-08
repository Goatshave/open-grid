import { expect, test, type Page } from "@playwright/test";

const actions = ["page", "sort", "filter", "cancel", "group", "tree", "patch"] as const;

test("commits deterministic server query, cancellation, grouping, tree, and patch workloads", async ({ page }) => {
  await page.goto("http://127.0.0.1:4307/?profile=standard-client");
  await expect(page.locator("html")).toHaveAttribute("data-server-benchmark-ready", "true");

  const identity = await page.evaluate(() => ({
    version: window.__OPEN_GRID_SERVER_BENCHMARK__?.version,
    profileId: window.__OPEN_GRID_SERVER_BENCHMARK__?.profileId,
    fingerprint: window.__OPEN_GRID_SERVER_BENCHMARK__?.fixtureFingerprint,
    delayMs: window.__OPEN_GRID_SERVER_BENCHMARK__?.configuredDelayMs,
    actions: window.__OPEN_GRID_SERVER_BENCHMARK__?.actions,
  }));
  expect(identity).toEqual({
    version: 1,
    profileId: "standard-client",
    fingerprint: "server-v1:10000:SBT-0001:SBT-10000:1000",
    delayMs: 40,
    actions,
  });

  let snapshot = await runAction(page, "page");
  expect(snapshot.pageIndex).toBe(3);
  expect(snapshot.totalRows).toBe(10_000);

  snapshot = await runAction(page, "sort");
  expect(snapshot.sorting).toBe("value:desc");
  expect(snapshot.pageIndex).toBe(0);

  snapshot = await runAction(page, "filter");
  expect(snapshot.filter).toBe("Orbit");
  expect(snapshot.totalRows).toBeGreaterThan(0);
  expect(snapshot.totalRows).toBeLessThan(10_000);

  const abortedBefore = snapshot.transport.aborted;
  snapshot = await runAction(page, "cancel");
  expect(snapshot.filter).toBe("Northwind");
  expect(snapshot.transport.aborted).toBe(abortedBefore + 1);
  expect(snapshot.transport.inFlight).toBe(0);
  expect(snapshot.staleResponses).toBe(0);

  snapshot = await runAction(page, "group");
  expect(snapshot.mode).toBe("group");
  expect(snapshot.sorting).toBe("value:desc");
  expect(snapshot.displayedRows).toBeGreaterThan(4);

  const completedBeforeTree = snapshot.transport.completed;
  snapshot = await runAction(page, "tree");
  expect(snapshot.mode).toBe("tree");
  expect(snapshot.transport.completed).toBe(completedBeforeTree + 2);
  expect(snapshot.displayedRows).toBe(29);

  const signatureBeforePatch = snapshot.mountedRowSignature;
  snapshot = await runAction(page, "patch");
  expect(snapshot.mode).toBe("tree");
  expect(snapshot.revision).toBe(1);
  expect(snapshot.mountedRowSignature).toBe(signatureBeforePatch);
  expect(snapshot.transport.inFlight).toBe(0);
  expect(snapshot.mountedRows).toBeGreaterThan(0);
  expect(snapshot.mountedCells).toBeGreaterThan(0);
});

async function runAction(page: Page, action: typeof actions[number]) {
  const result = await page.evaluate((selectedAction) => window.__OPEN_GRID_SERVER_BENCHMARK__!.measureAction(selectedAction), action);
  expect(result.action).toBe(action);
  expect(result.durationMs).toBeGreaterThanOrEqual(35);
  expect(result.snapshot.operation).toBe(action);
  return result.snapshot;
}

declare global {
  interface Window {
    __OPEN_GRID_SERVER_BENCHMARK__?: {
      version: number;
      ready: boolean;
      profileId: string;
      fixtureFingerprint: string;
      configuredDelayMs: number;
      actions: readonly string[];
      getSnapshot(): ServerSnapshot;
      measureAction(action: typeof actions[number]): Promise<{ action: string; durationMs: number; snapshot: ServerSnapshot }>;
    };
  }
}

interface ServerSnapshot {
  mode: string;
  operation: string;
  revision: number;
  totalRows: number;
  displayedRows: number;
  mountedRows: number;
  mountedCells: number;
  mountedRowSignature: string;
  sorting: string;
  filter: string;
  pageIndex: number;
  transport: { started: number; completed: number; aborted: number; inFlight: number };
  staleResponses: number;
}
