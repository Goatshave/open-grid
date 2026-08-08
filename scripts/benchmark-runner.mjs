import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { BENCHMARK_DEEP_SCROLL_TOP, getBenchmarkDeepScrollMinimum, getBenchmarkMainThreadTaskDeltaMs, prepareBenchmarkEventActionMeasurement, readBenchmarkEventActionMeasurement, readBenchmarkInitializationMetrics, readBenchmarkMainThreadTaskMs } from "../benchmarks/shared/browser.mjs";
import { createBenchmarkMatrix, formatBenchmarkMatrixMarkdown } from "../benchmarks/shared/matrix.mjs";
import { readBenchmarkProfileCheckpoint, writeBenchmarkProfileCheckpoint } from "../benchmarks/shared/profile-checkpoint.mjs";
import { BENCHMARK_MEASUREMENT_PREPARATION, BENCHMARK_RESULT_SCHEMA_VERSION, formatBenchmarkMarkdown, summarizeBenchmarkRuns } from "../benchmarks/shared/results.mjs";
import { createBenchmarkSourceFingerprint } from "../benchmarks/shared/source-fingerprint.mjs";
import { BENCHMARK_PROFILES, getBenchmarkProfile } from "../benchmarks/shared/index.mjs";
import { startBenchmarkPreview, stopBenchmarkPreview } from "./benchmark-preview-process.mjs";

const MULTI_SORT_RULES = Object.freeze([
  Object.freeze({ columnId: "column_2", direction: "asc" }),
  Object.freeze({ columnId: "column_5", direction: "asc" }),
]);
const MULTI_FILTER_RULES = Object.freeze([
  Object.freeze({ columnId: "column_2", value: "Blocked" }),
  Object.freeze({ columnId: "column_4", value: "APAC" }),
]);
const HEAP_WORKLOAD_TIMEOUT_MS = 10 * 60_000;
const ISOLATED_RUN_TIMEOUT_MS = 12 * 60_000;
const BENCHMARK_RUN_ATTEMPTS = 3;
const comparisonTargets = [
  target("open-grid", "@open-grid/benchmark-open-grid-react", 4301, manifestVersion("package.json")),
];
const frameworkTargets = [
  target("open-grid-react-full", "@open-grid/benchmark-open-grid-react-full", 4306, manifestVersion("packages/react-ui/package.json")),
  target("open-grid-vue", "@open-grid/benchmark-open-grid-vue", 4304, manifestVersion("packages/vue-ui/package.json")),
  target("open-grid-svelte", "@open-grid/benchmark-open-grid-svelte", 4305, manifestVersion("packages/svelte-ui/package.json")),
];

let options;
try {
  options = parseArgs(process.argv.slice(2));
  options.profileIds.forEach(getBenchmarkProfile);
} catch (error) {
  console.error(`Benchmark measurement failed: ${error.message}`);
  process.exit(1);
}
const targets = options.suite === "framework" ? frameworkTargets : comparisonTargets;

const children = [];
let browser;

try {
  for (const benchmarkTarget of targets) {
    children.push(startBenchmarkPreview(benchmarkTarget.packageName));
  }
  await Promise.all(targets.map((benchmarkTarget) => waitForUrl(benchmarkTarget.url)));

  browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
  const browserVersion = await browser.version();
  await browser.close();
  browser = undefined;
  const environment = {
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
    browser: browserVersion,
    gitRevision: gitOutput(["rev-parse", "HEAD"]) || "unknown",
    gitDirty: gitOutput(["status", "--porcelain"]).length > 0,
    sourceFingerprint: sourceFingerprint(),
  };
  const results = [];
  for (const profileId of options.profileIds) {
    console.log(`Benchmark profile: ${profileId}`);
    const checkpointPath = options.checkpointDir ? join(options.checkpointDir, `${options.suite}-${profileId}.json`) : null;
    const checkpoint = checkpointPath && options.resume
      ? readBenchmarkProfileCheckpoint(checkpointPath, {
        suite: options.suite,
        profileId,
        runs: options.runs,
        warmups: options.warmups,
        environment,
        implementations: targets.map(({ id, version }) => ({ id, version })),
      })
      : null;
    if (checkpoint?.status === "reused") {
      console.log(`Reusing checkpoint: ${checkpointPath}`);
      results.push(checkpoint.result);
      continue;
    }
    if (checkpoint?.status === "incompatible") {
      console.log(`Ignoring incompatible checkpoint: ${checkpoint.reason}`);
    }
    const profileResult = await measureProfile(profileId, options, environment);
    if (checkpointPath) {
      writeBenchmarkProfileCheckpoint(checkpointPath, profileResult);
      console.log(`Profile checkpoint: ${checkpointPath}`);
    }
    results.push(profileResult);
  }
  const result = results.length === 1 ? results[0] : createBenchmarkMatrix(results);
  const markdown = results.length === 1 ? formatBenchmarkMarkdown(result) : formatBenchmarkMatrixMarkdown(result);

  writeArtifact(options.jsonOut, `${JSON.stringify(result, null, 2)}\n`);
  writeArtifact(options.markdownOut, markdown);
  console.log(`Raw results: ${options.jsonOut}`);
  console.log(`Summary: ${options.markdownOut}`);
} catch (error) {
  console.error(`Benchmark measurement failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await Promise.all(children.map(stopBenchmarkPreview));
}

async function measureProfile(profileId, runOptions, environment) {
  const runsByImplementation = new Map(targets.map((benchmarkTarget) => [benchmarkTarget.id, []]));
  const totalRuns = runOptions.warmups + runOptions.runs;
  for (let index = 0; index < totalRuns; index += 1) {
    const roundTargets = rotateTargets(targets, index % targets.length);
    for (const benchmarkTarget of roundTargets) {
      const warmup = index < runOptions.warmups;
      console.log(`Measuring ${benchmarkTarget.id}: ${warmup ? "warm-up" : "run"} ${warmup ? index + 1 : index - runOptions.warmups + 1}/${warmup ? runOptions.warmups : runOptions.runs}`);
      runsByImplementation.get(benchmarkTarget.id).push(await measureIsolatedRun(benchmarkTarget, profileId, index, warmup));
    }
  }
  const implementations = targets.map((benchmarkTarget) => {
    const runs = runsByImplementation.get(benchmarkTarget.id);
    return {
      id: benchmarkTarget.id,
      version: benchmarkTarget.version,
      url: benchmarkTarget.url,
      runs,
      summary: summarizeBenchmarkRuns(runs),
    };
  });

  const datasetFingerprints = new Set(implementations.flatMap((implementation) => implementation.runs.map((run) => run.datasetFingerprint)));
  if (datasetFingerprints.size !== 1) {
    throw new Error(`comparison applications produced different datasets: ${[...datasetFingerprints].join(", ")}`);
  }

  return {
    schemaVersion: BENCHMARK_RESULT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    status: "observational",
    datasetFingerprint: [...datasetFingerprints][0],
    config: { suite: runOptions.suite, profileId, runs: runOptions.runs, warmups: runOptions.warmups },
    environment,
    implementations,
  };
}

async function measureIsolatedRun(benchmarkTarget, profileId, index, warmup) {
  let lastError;
  for (let attempt = 1; attempt <= BENCHMARK_RUN_ATTEMPTS; attempt += 1) {
    const activeBrowser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
    const activeHeapBrowser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
    try {
      return await withTimeout(
        measureRun(activeBrowser, activeHeapBrowser, benchmarkTarget, profileId, index, warmup),
        ISOLATED_RUN_TIMEOUT_MS,
        `isolated benchmark run timed out: ${benchmarkTarget.id}/${profileId}`,
      );
    } catch (error) {
      lastError = error;
      if (attempt < BENCHMARK_RUN_ATTEMPTS) {
        console.warn(`Retrying ${benchmarkTarget.id}/${profileId} after attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      await activeBrowser.close();
      await activeHeapBrowser.close();
    }
  }
  throw lastError;
}

async function measureRun(activeBrowser, activeHeapBrowser, benchmarkTarget, profileId, index, warmup) {
  const profile = getBenchmarkProfile(profileId);
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Performance.enable");
  const initialMainThreadTaskStartMs = await readMainThreadTaskMs(cdp);
  await page.addInitScript(() => {
    window.__OPEN_GRID_LONG_TASKS__ = [];
    new PerformanceObserver((list) => {
      window.__OPEN_GRID_LONG_TASKS__.push(...list.getEntries().map((entry) => ({ startTime: entry.startTime, duration: entry.duration })));
    }).observe({ type: "longtask", buffered: true });
  });

  let runResult;
  try {
    await page.goto(`${benchmarkTarget.url}/?profile=${profileId}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => window.__OPEN_GRID_BENCHMARK__?.ready === true, undefined, { timeout: 120_000 });
    const initialReady = await page.evaluate(() => ({
      observedReadyMs: performance.now(),
      initialization: window.__OPEN_GRID_BENCHMARK__.initialization,
    }));
    const initialReadyMs = initialReady.observedReadyMs;
    const initialMetrics = readBenchmarkInitializationMetrics(initialReady.initialization, initialReadyMs);
    const initialMainThreadTaskMs = getBenchmarkMainThreadTaskDeltaMs(initialMainThreadTaskStartMs, await readMainThreadTaskMs(cdp));
    const sortMeasurement = await measureActionDetails(page, cdp, "sort");
    if (!sortMeasurement.presentationTiming) {
      throw new Error("cold-sort measurement did not report PerformanceEventTiming presentation data");
    }
    await assertPageState(page, (snapshot) => snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "asc", "amount sort");
    const sortFlipMeasurement = await measureActionDetails(page, cdp, "sortFlip");
    await assertPageState(page, (snapshot) => snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "desc", "amount sort direction flip");
    const clearAfterSortMeasurement = await measureActionDetails(page, cdp, "clear");
    await assertPageState(page, (snapshot) => snapshot.sort === null, "sort clear");
    const filterMeasurement = await measureActionDetails(page, cdp, "filter");
    await assertPageState(page, (snapshot) => snapshot.filter === "Blocked" && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < snapshot.rowCount, "quick filter");
    const clearAfterFilterMeasurement = await measureActionDetails(page, cdp, "clear");
    await assertPageState(page, (snapshot) => snapshot.filter === "" && snapshot.displayedRowCount === snapshot.rowCount, "filter clear");
    const columnFilterMeasurement = await measureActionDetails(page, cdp, "columnFilter");
    await assertPageState(page, (snapshot) => snapshot.columnFilter?.columnId === "column_2" && snapshot.columnFilter?.value === "Blocked" && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < snapshot.rowCount, "column filter");
    const clearAfterColumnFilterMeasurement = await measureActionDetails(page, cdp, "clear");
    await assertPageState(page, (snapshot) => snapshot.columnFilter === null && snapshot.displayedRowCount === snapshot.rowCount, "column filter clear");
    const workflowFilterMeasurement = await measureActionDetails(page, cdp, "workflowFilter");
    const workflowFilterSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.sort === null && snapshot.columnFilter === null && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < snapshot.rowCount, "analysis workflow global filter");
    const workflowColumnFilterMeasurement = await measureActionDetails(page, cdp, "workflowColumnFilter");
    const workflowColumnFilterSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.columnFilter?.columnId === "column_2" && snapshot.columnFilter?.value === "Blocked" && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < workflowFilterSnapshot.displayedRowCount, "analysis workflow combined filters");
    const workflowSortMeasurement = await measureActionDetails(page, cdp, "workflowSort");
    const workflowSortSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.columnFilter?.value === "Blocked" && snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "asc" && snapshot.displayedRowCount === workflowColumnFilterSnapshot.displayedRowCount && typeof snapshot.firstMountedRowId === "string", "analysis workflow filtered sort");
    const workflowClearMeasurement = await measureActionDetails(page, cdp, "workflowClear");
    const workflowClearSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "" && snapshot.columnFilter === null && snapshot.sort === null && snapshot.displayedRowCount === snapshot.rowCount, "analysis workflow clear");
    const refinementFilterMeasurement = await measureActionDetails(page, cdp, "refinementFilter");
    const refinementFilterSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.sort === null && snapshot.columnFilter === null && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < snapshot.rowCount, "refinement workflow global filter");
    const refinementColumnFilterMeasurement = await measureActionDetails(page, cdp, "refinementColumnFilter");
    const refinementColumnFilterSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.columnFilter?.columnId === "column_2" && snapshot.columnFilter?.value === "Blocked" && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < refinementFilterSnapshot.displayedRowCount, "refinement workflow combined filters");
    const refinementSortMeasurement = await measureActionDetails(page, cdp, "refinementSort");
    const refinementSortSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "APAC" && snapshot.columnFilter?.value === "Blocked" && snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "asc" && snapshot.displayedRowCount === refinementColumnFilterSnapshot.displayedRowCount && typeof snapshot.firstMountedRowId === "string", "refinement workflow ascending sort");
    const refinementFilterSwapMeasurement = await measureActionDetails(page, cdp, "refinementFilterSwap");
    const refinementFilterSwapSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "EMEA" && snapshot.columnFilter?.value === "Blocked" && snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "asc" && snapshot.displayedRowCount > 0 && typeof snapshot.firstMountedRowId === "string", "refinement workflow query replacement");
    const refinementColumnFilterSwapMeasurement = await measureActionDetails(page, cdp, "refinementColumnFilterSwap");
    const refinementColumnFilterSwapSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "EMEA" && snapshot.columnFilter?.value === "Complete" && snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "asc" && snapshot.displayedRowCount > 0 && typeof snapshot.firstMountedRowId === "string", "refinement workflow status replacement");
    const refinementSortFlipMeasurement = await measureActionDetails(page, cdp, "refinementSortFlip");
    const refinementSortFlipSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "EMEA" && snapshot.columnFilter?.value === "Complete" && snapshot.sort?.columnId === "column_5" && snapshot.sort?.direction === "desc" && snapshot.displayedRowCount === refinementColumnFilterSwapSnapshot.displayedRowCount && typeof snapshot.firstMountedRowId === "string", "refinement workflow descending sort");
    const refinementClearMeasurement = await measureActionDetails(page, cdp, "refinementClear");
    const refinementClearSnapshot = await assertPageState(page, (snapshot) => snapshot.filter === "" && snapshot.columnFilter === null && snapshot.sort === null && snapshot.displayedRowCount === snapshot.rowCount, "refinement workflow clear");
    const columnHideMeasurement = await measureActionDetails(page, cdp, "columnHide");
    const columnHiddenSnapshot = await assertPageState(page, (snapshot) => snapshot.visibleColumnCount === snapshot.columnCount - 1 && !snapshot.visibleColumnIds.includes("column_10"), "column visibility hide");
    const columnRestoreMeasurement = await measureActionDetails(page, cdp, "columnRestore");
    const columnRestoredSnapshot = await assertPageState(page, (snapshot) => snapshot.visibleColumnCount === snapshot.columnCount && snapshot.visibleColumnIds.includes("column_10"), "column visibility restore");
    const columnResizeMeasurement = await measureActionDetails(page, cdp, "columnResize");
    const columnResizedSnapshot = await assertPageState(page, (snapshot) => snapshot.columnSize?.columnId === "column_10" && snapshot.columnSize.size === 200, "column sizing resize");
    const columnSizeRestoreMeasurement = await measureActionDetails(page, cdp, "columnSizeRestore");
    const columnSizeRestoredSnapshot = await assertPageState(page, (snapshot) => snapshot.columnSize?.columnId === "column_10" && snapshot.columnSize.size === 120, "column sizing restore");
    const movedColumnOrder = createMovedColumnOrder(profile.columnCount);
    const defaultColumnOrder = createDefaultColumnOrder(profile.columnCount);
    const columnMoveMeasurement = await measureActionDetails(page, cdp, "columnMove");
    const columnMovedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.columnOrderIds, movedColumnOrder), "column ordering move");
    const columnOrderRestoreMeasurement = await measureActionDetails(page, cdp, "columnOrderRestore");
    const columnOrderRestoredSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.columnOrderIds, defaultColumnOrder), "column ordering restore");
    const columnPinMeasurement = await measureActionDetails(page, cdp, "columnPin");
    const columnPinnedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.columnPinning?.left, ["column_10"]) && equalStringArrays(snapshot.columnPinning?.right, []), "column pinning pin");
    const columnUnpinMeasurement = await measureActionDetails(page, cdp, "columnUnpin");
    const columnUnpinnedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.columnPinning?.left, []) && equalStringArrays(snapshot.columnPinning?.right, []), "column pinning unpin");
    const layoutWorkflowMoveMeasurement = await measureActionDetails(page, cdp, "columnMove");
    const layoutWorkflowMovedSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 120
      && equalStringArrays(snapshot.columnPinning?.left, [])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow move");
    const layoutWorkflowResizeMeasurement = await measureActionDetails(page, cdp, "columnResize");
    const layoutWorkflowResizedSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 200
      && equalStringArrays(snapshot.columnPinning?.left, [])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow resize");
    const layoutWorkflowPinMeasurement = await measureActionDetails(page, cdp, "columnPin");
    const layoutWorkflowPinnedSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 200
      && equalStringArrays(snapshot.columnPinning?.left, ["column_10"])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow pin");
    const layoutWorkflowHideMeasurement = await measureActionDetails(page, cdp, "columnHide");
    const layoutWorkflowHiddenSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 200
      && equalStringArrays(snapshot.columnPinning?.left, ["column_10"])
      && snapshot.visibleColumnCount === snapshot.columnCount - 1
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder.filter((columnId) => columnId !== "column_10")), "layout workflow hide");
    const layoutWorkflowShowMeasurement = await measureActionDetails(page, cdp, "columnRestore");
    const layoutWorkflowShownSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 200
      && equalStringArrays(snapshot.columnPinning?.left, ["column_10"])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow show");
    const layoutWorkflowUnpinMeasurement = await measureActionDetails(page, cdp, "columnUnpin");
    const layoutWorkflowUnpinnedSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 200
      && equalStringArrays(snapshot.columnPinning?.left, [])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow unpin");
    const layoutWorkflowSizeRestoreMeasurement = await measureActionDetails(page, cdp, "columnSizeRestore");
    const layoutWorkflowSizeRestoredSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, movedColumnOrder)
      && snapshot.columnSize?.size === 120
      && equalStringArrays(snapshot.columnPinning?.left, [])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow size restore");
    const layoutWorkflowOrderRestoreMeasurement = await measureActionDetails(page, cdp, "columnOrderRestore");
    const layoutWorkflowOrderRestoredSnapshot = await assertPageState(page, (snapshot) =>
      equalStringArrays(snapshot.columnOrderIds, defaultColumnOrder)
      && snapshot.columnSize?.size === 120
      && equalStringArrays(snapshot.columnPinning?.left, [])
      && snapshot.visibleColumnCount === snapshot.columnCount
      && sameStringSet(snapshot.visibleColumnIds, defaultColumnOrder), "layout workflow order restore");
    const layoutWorkflowMeasurements = {
      move: layoutWorkflowMoveMeasurement,
      resize: layoutWorkflowResizeMeasurement,
      pin: layoutWorkflowPinMeasurement,
      hide: layoutWorkflowHideMeasurement,
      show: layoutWorkflowShowMeasurement,
      unpin: layoutWorkflowUnpinMeasurement,
      sizeRestore: layoutWorkflowSizeRestoreMeasurement,
      orderRestore: layoutWorkflowOrderRestoreMeasurement,
    };
    const rowSelectMeasurement = await measureActionDetails(page, cdp, "rowSelect");
    const rowSelectedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.selectedRowIds, ["row_0"]), "row selection select");
    const rowDeselectMeasurement = await measureActionDetails(page, cdp, "rowDeselect");
    const rowDeselectedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.selectedRowIds, []) && snapshot.selectedRowCount === 0 && snapshot.allRowsSelected === false, "row selection deselect");
    const allRowsSelectMeasurement = await measureActionDetails(page, cdp, "allRowsSelect");
    const allRowsSelectedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.selectedRowIds, []) && snapshot.selectedRowCount === snapshot.rowCount && snapshot.allRowsSelected === true, "all-row selection select");
    const allRowsDeselectMeasurement = await measureActionDetails(page, cdp, "allRowsDeselect");
    const allRowsDeselectedSnapshot = await assertPageState(page, (snapshot) => equalStringArrays(snapshot.selectedRowIds, []) && snapshot.selectedRowCount === 0 && snapshot.allRowsSelected === false, "all-row selection deselect");
    const multiSortApplyMeasurement = await measureActionDetails(page, cdp, "multiSortApply");
    const multiSortAppliedSnapshot = await assertPageState(page, (snapshot) => equalSortRules(snapshot.sorting, MULTI_SORT_RULES), "multi-column sort apply");
    const multiSortClearMeasurement = await measureActionDetails(page, cdp, "multiSortClear");
    const multiSortClearedSnapshot = await assertPageState(page, (snapshot) => equalSortRules(snapshot.sorting, []), "multi-column sort clear");
    const multiFilterApplyMeasurement = await measureActionDetails(page, cdp, "multiFilterApply");
    const multiFilterAppliedSnapshot = await assertPageState(page, (snapshot) => equalFilterRules(snapshot.columnFilters, MULTI_FILTER_RULES) && snapshot.displayedRowCount > 0 && snapshot.displayedRowCount < snapshot.rowCount, "multi-column filter apply");
    const multiFilterClearMeasurement = await measureActionDetails(page, cdp, "multiFilterClear");
    const multiFilterClearedSnapshot = await assertPageState(page, (snapshot) => equalFilterRules(snapshot.columnFilters, []) && snapshot.displayedRowCount === snapshot.rowCount, "multi-column filter clear");
    const deepScrollMeasurement = await measureActionDetails(page, cdp, "scroll");
    if (!deepScrollMeasurement.scrollEventTiming) {
      throw new Error("deep scroll measurement did not report scroll-event timing");
    }
    const minimumDeepScrollTop = getBenchmarkDeepScrollMinimum(profile.rowCount);
    await assertPageState(page, (snapshot) => snapshot.scrollTop >= minimumDeepScrollTop && snapshot.mountedRowCount > 0 && snapshot.mountedRowCount < 80, "deep virtual scroll");
    const driverState = await page.evaluate(() => ({
      datasetFingerprint: window.__OPEN_GRID_BENCHMARK__.datasetFingerprint,
      snapshot: window.__OPEN_GRID_BENCHMARK__.getSnapshot(),
    }));
    const resources = await page.evaluate(() => [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")].map((entry) => ({
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize,
    })));
    const longTasks = await page.evaluate(() => window.__OPEN_GRID_LONG_TASKS__ ?? []);
    runResult = {
      index,
      warmup,
      datasetFingerprint: driverState.datasetFingerprint,
      measurementPreparation: BENCHMARK_MEASUREMENT_PREPARATION,
      metrics: {
        initialReadyMs,
        initialMainThreadTaskMs,
        ...initialMetrics,
        sortCommitMs: sortMeasurement.commitMs,
        sortPaintMs: sortMeasurement.paintMs,
        sortMainThreadTaskMs: sortMeasurement.mainThreadTaskMs,
        sortPresentationMs: sortMeasurement.presentationTiming.durationMs,
        sortPresentationInputDelayMs: sortMeasurement.presentationTiming.inputDelayMs,
        sortPresentationProcessingMs: sortMeasurement.presentationTiming.processingDurationMs,
        sortPresentationDelayMs: sortMeasurement.presentationTiming.presentationDelayMs,
        sortFlipCommitMs: sortFlipMeasurement.commitMs,
        sortFlipPaintMs: sortFlipMeasurement.paintMs,
        sortFlipMainThreadTaskMs: sortFlipMeasurement.mainThreadTaskMs,
        filterCommitMs: filterMeasurement.commitMs,
        filterPaintMs: filterMeasurement.paintMs,
        filterMainThreadTaskMs: filterMeasurement.mainThreadTaskMs,
        columnFilterCommitMs: columnFilterMeasurement.commitMs,
        columnFilterPaintMs: columnFilterMeasurement.paintMs,
        columnFilterMainThreadTaskMs: columnFilterMeasurement.mainThreadTaskMs,
        clearCommitMs: Math.max(clearAfterSortMeasurement.commitMs, clearAfterFilterMeasurement.commitMs, clearAfterColumnFilterMeasurement.commitMs),
        clearPaintMs: Math.max(clearAfterSortMeasurement.paintMs, clearAfterFilterMeasurement.paintMs, clearAfterColumnFilterMeasurement.paintMs),
        clearMainThreadTaskMs: Math.max(clearAfterSortMeasurement.mainThreadTaskMs, clearAfterFilterMeasurement.mainThreadTaskMs, clearAfterColumnFilterMeasurement.mainThreadTaskMs),
        clearSortCommitMs: clearAfterSortMeasurement.commitMs,
        clearSortPaintMs: clearAfterSortMeasurement.paintMs,
        clearSortMainThreadTaskMs: clearAfterSortMeasurement.mainThreadTaskMs,
        clearFilterCommitMs: clearAfterFilterMeasurement.commitMs,
        clearFilterPaintMs: clearAfterFilterMeasurement.paintMs,
        clearFilterMainThreadTaskMs: clearAfterFilterMeasurement.mainThreadTaskMs,
        clearColumnFilterCommitMs: clearAfterColumnFilterMeasurement.commitMs,
        clearColumnFilterPaintMs: clearAfterColumnFilterMeasurement.paintMs,
        clearColumnFilterMainThreadTaskMs: clearAfterColumnFilterMeasurement.mainThreadTaskMs,
        workflowFilterCommitMs: workflowFilterMeasurement.commitMs,
        workflowFilterPaintMs: workflowFilterMeasurement.paintMs,
        workflowFilterMainThreadTaskMs: workflowFilterMeasurement.mainThreadTaskMs,
        workflowColumnFilterCommitMs: workflowColumnFilterMeasurement.commitMs,
        workflowColumnFilterPaintMs: workflowColumnFilterMeasurement.paintMs,
        workflowColumnFilterMainThreadTaskMs: workflowColumnFilterMeasurement.mainThreadTaskMs,
        workflowSortCommitMs: workflowSortMeasurement.commitMs,
        workflowSortPaintMs: workflowSortMeasurement.paintMs,
        workflowSortMainThreadTaskMs: workflowSortMeasurement.mainThreadTaskMs,
        workflowClearCommitMs: workflowClearMeasurement.commitMs,
        workflowClearPaintMs: workflowClearMeasurement.paintMs,
        workflowClearMainThreadTaskMs: workflowClearMeasurement.mainThreadTaskMs,
        workflowTotalCommitMs: workflowFilterMeasurement.commitMs + workflowColumnFilterMeasurement.commitMs + workflowSortMeasurement.commitMs + workflowClearMeasurement.commitMs,
        workflowTotalPaintMs: workflowFilterMeasurement.paintMs + workflowColumnFilterMeasurement.paintMs + workflowSortMeasurement.paintMs + workflowClearMeasurement.paintMs,
        workflowTotalMainThreadTaskMs: workflowFilterMeasurement.mainThreadTaskMs + workflowColumnFilterMeasurement.mainThreadTaskMs + workflowSortMeasurement.mainThreadTaskMs + workflowClearMeasurement.mainThreadTaskMs,
        refinementFilterCommitMs: refinementFilterMeasurement.commitMs,
        refinementFilterPaintMs: refinementFilterMeasurement.paintMs,
        refinementFilterMainThreadTaskMs: refinementFilterMeasurement.mainThreadTaskMs,
        refinementColumnFilterCommitMs: refinementColumnFilterMeasurement.commitMs,
        refinementColumnFilterPaintMs: refinementColumnFilterMeasurement.paintMs,
        refinementColumnFilterMainThreadTaskMs: refinementColumnFilterMeasurement.mainThreadTaskMs,
        refinementSortCommitMs: refinementSortMeasurement.commitMs,
        refinementSortPaintMs: refinementSortMeasurement.paintMs,
        refinementSortMainThreadTaskMs: refinementSortMeasurement.mainThreadTaskMs,
        refinementFilterSwapCommitMs: refinementFilterSwapMeasurement.commitMs,
        refinementFilterSwapPaintMs: refinementFilterSwapMeasurement.paintMs,
        refinementFilterSwapMainThreadTaskMs: refinementFilterSwapMeasurement.mainThreadTaskMs,
        refinementColumnFilterSwapCommitMs: refinementColumnFilterSwapMeasurement.commitMs,
        refinementColumnFilterSwapPaintMs: refinementColumnFilterSwapMeasurement.paintMs,
        refinementColumnFilterSwapMainThreadTaskMs: refinementColumnFilterSwapMeasurement.mainThreadTaskMs,
        refinementSortFlipCommitMs: refinementSortFlipMeasurement.commitMs,
        refinementSortFlipPaintMs: refinementSortFlipMeasurement.paintMs,
        refinementSortFlipMainThreadTaskMs: refinementSortFlipMeasurement.mainThreadTaskMs,
        refinementClearCommitMs: refinementClearMeasurement.commitMs,
        refinementClearPaintMs: refinementClearMeasurement.paintMs,
        refinementClearMainThreadTaskMs: refinementClearMeasurement.mainThreadTaskMs,
        refinementTotalCommitMs: refinementFilterMeasurement.commitMs + refinementColumnFilterMeasurement.commitMs + refinementSortMeasurement.commitMs + refinementFilterSwapMeasurement.commitMs + refinementColumnFilterSwapMeasurement.commitMs + refinementSortFlipMeasurement.commitMs + refinementClearMeasurement.commitMs,
        refinementTotalPaintMs: refinementFilterMeasurement.paintMs + refinementColumnFilterMeasurement.paintMs + refinementSortMeasurement.paintMs + refinementFilterSwapMeasurement.paintMs + refinementColumnFilterSwapMeasurement.paintMs + refinementSortFlipMeasurement.paintMs + refinementClearMeasurement.paintMs,
        refinementTotalMainThreadTaskMs: refinementFilterMeasurement.mainThreadTaskMs + refinementColumnFilterMeasurement.mainThreadTaskMs + refinementSortMeasurement.mainThreadTaskMs + refinementFilterSwapMeasurement.mainThreadTaskMs + refinementColumnFilterSwapMeasurement.mainThreadTaskMs + refinementSortFlipMeasurement.mainThreadTaskMs + refinementClearMeasurement.mainThreadTaskMs,
        columnHideCommitMs: columnHideMeasurement.commitMs,
        columnHidePaintMs: columnHideMeasurement.paintMs,
        columnHideMainThreadTaskMs: columnHideMeasurement.mainThreadTaskMs,
        columnRestoreCommitMs: columnRestoreMeasurement.commitMs,
        columnRestorePaintMs: columnRestoreMeasurement.paintMs,
        columnRestoreMainThreadTaskMs: columnRestoreMeasurement.mainThreadTaskMs,
        columnVisibilityTotalCommitMs: columnHideMeasurement.commitMs + columnRestoreMeasurement.commitMs,
        columnVisibilityTotalPaintMs: columnHideMeasurement.paintMs + columnRestoreMeasurement.paintMs,
        columnVisibilityTotalMainThreadTaskMs: columnHideMeasurement.mainThreadTaskMs + columnRestoreMeasurement.mainThreadTaskMs,
        columnResizeCommitMs: columnResizeMeasurement.commitMs,
        columnResizePaintMs: columnResizeMeasurement.paintMs,
        columnResizeMainThreadTaskMs: columnResizeMeasurement.mainThreadTaskMs,
        columnSizeRestoreCommitMs: columnSizeRestoreMeasurement.commitMs,
        columnSizeRestorePaintMs: columnSizeRestoreMeasurement.paintMs,
        columnSizeRestoreMainThreadTaskMs: columnSizeRestoreMeasurement.mainThreadTaskMs,
        columnSizingTotalCommitMs: columnResizeMeasurement.commitMs + columnSizeRestoreMeasurement.commitMs,
        columnSizingTotalPaintMs: columnResizeMeasurement.paintMs + columnSizeRestoreMeasurement.paintMs,
        columnSizingTotalMainThreadTaskMs: columnResizeMeasurement.mainThreadTaskMs + columnSizeRestoreMeasurement.mainThreadTaskMs,
        columnMoveCommitMs: columnMoveMeasurement.commitMs,
        columnMovePaintMs: columnMoveMeasurement.paintMs,
        columnMoveMainThreadTaskMs: columnMoveMeasurement.mainThreadTaskMs,
        columnOrderRestoreCommitMs: columnOrderRestoreMeasurement.commitMs,
        columnOrderRestorePaintMs: columnOrderRestoreMeasurement.paintMs,
        columnOrderRestoreMainThreadTaskMs: columnOrderRestoreMeasurement.mainThreadTaskMs,
        columnOrderingTotalCommitMs: columnMoveMeasurement.commitMs + columnOrderRestoreMeasurement.commitMs,
        columnOrderingTotalPaintMs: columnMoveMeasurement.paintMs + columnOrderRestoreMeasurement.paintMs,
        columnOrderingTotalMainThreadTaskMs: columnMoveMeasurement.mainThreadTaskMs + columnOrderRestoreMeasurement.mainThreadTaskMs,
        columnPinCommitMs: columnPinMeasurement.commitMs,
        columnPinPaintMs: columnPinMeasurement.paintMs,
        columnPinMainThreadTaskMs: columnPinMeasurement.mainThreadTaskMs,
        columnUnpinCommitMs: columnUnpinMeasurement.commitMs,
        columnUnpinPaintMs: columnUnpinMeasurement.paintMs,
        columnUnpinMainThreadTaskMs: columnUnpinMeasurement.mainThreadTaskMs,
        columnPinningTotalCommitMs: columnPinMeasurement.commitMs + columnUnpinMeasurement.commitMs,
        columnPinningTotalPaintMs: columnPinMeasurement.paintMs + columnUnpinMeasurement.paintMs,
        columnPinningTotalMainThreadTaskMs: columnPinMeasurement.mainThreadTaskMs + columnUnpinMeasurement.mainThreadTaskMs,
        layoutWorkflowTotalCommitMs: sumActionMeasurements(layoutWorkflowMeasurements, "commitMs"),
        layoutWorkflowTotalPaintMs: sumActionMeasurements(layoutWorkflowMeasurements, "paintMs"),
        layoutWorkflowTotalMainThreadTaskMs: sumActionMeasurements(layoutWorkflowMeasurements, "mainThreadTaskMs"),
        rowSelectCommitMs: rowSelectMeasurement.commitMs,
        rowSelectPaintMs: rowSelectMeasurement.paintMs,
        rowSelectMainThreadTaskMs: rowSelectMeasurement.mainThreadTaskMs,
        rowDeselectCommitMs: rowDeselectMeasurement.commitMs,
        rowDeselectPaintMs: rowDeselectMeasurement.paintMs,
        rowDeselectMainThreadTaskMs: rowDeselectMeasurement.mainThreadTaskMs,
        rowSelectionTotalCommitMs: rowSelectMeasurement.commitMs + rowDeselectMeasurement.commitMs,
        rowSelectionTotalPaintMs: rowSelectMeasurement.paintMs + rowDeselectMeasurement.paintMs,
        rowSelectionTotalMainThreadTaskMs: rowSelectMeasurement.mainThreadTaskMs + rowDeselectMeasurement.mainThreadTaskMs,
        allRowsSelectCommitMs: allRowsSelectMeasurement.commitMs,
        allRowsSelectPaintMs: allRowsSelectMeasurement.paintMs,
        allRowsSelectMainThreadTaskMs: allRowsSelectMeasurement.mainThreadTaskMs,
        allRowsDeselectCommitMs: allRowsDeselectMeasurement.commitMs,
        allRowsDeselectPaintMs: allRowsDeselectMeasurement.paintMs,
        allRowsDeselectMainThreadTaskMs: allRowsDeselectMeasurement.mainThreadTaskMs,
        allRowsSelectionTotalCommitMs: allRowsSelectMeasurement.commitMs + allRowsDeselectMeasurement.commitMs,
        allRowsSelectionTotalPaintMs: allRowsSelectMeasurement.paintMs + allRowsDeselectMeasurement.paintMs,
        allRowsSelectionTotalMainThreadTaskMs: allRowsSelectMeasurement.mainThreadTaskMs + allRowsDeselectMeasurement.mainThreadTaskMs,
        multiSortApplyCommitMs: multiSortApplyMeasurement.commitMs,
        multiSortApplyPaintMs: multiSortApplyMeasurement.paintMs,
        multiSortApplyMainThreadTaskMs: multiSortApplyMeasurement.mainThreadTaskMs,
        multiSortClearCommitMs: multiSortClearMeasurement.commitMs,
        multiSortClearPaintMs: multiSortClearMeasurement.paintMs,
        multiSortClearMainThreadTaskMs: multiSortClearMeasurement.mainThreadTaskMs,
        multiSortTotalCommitMs: multiSortApplyMeasurement.commitMs + multiSortClearMeasurement.commitMs,
        multiSortTotalPaintMs: multiSortApplyMeasurement.paintMs + multiSortClearMeasurement.paintMs,
        multiSortTotalMainThreadTaskMs: multiSortApplyMeasurement.mainThreadTaskMs + multiSortClearMeasurement.mainThreadTaskMs,
        multiFilterApplyCommitMs: multiFilterApplyMeasurement.commitMs,
        multiFilterApplyPaintMs: multiFilterApplyMeasurement.paintMs,
        multiFilterApplyMainThreadTaskMs: multiFilterApplyMeasurement.mainThreadTaskMs,
        multiFilterClearCommitMs: multiFilterClearMeasurement.commitMs,
        multiFilterClearPaintMs: multiFilterClearMeasurement.paintMs,
        multiFilterClearMainThreadTaskMs: multiFilterClearMeasurement.mainThreadTaskMs,
        multiFilterTotalCommitMs: multiFilterApplyMeasurement.commitMs + multiFilterClearMeasurement.commitMs,
        multiFilterTotalPaintMs: multiFilterApplyMeasurement.paintMs + multiFilterClearMeasurement.paintMs,
        multiFilterTotalMainThreadTaskMs: multiFilterApplyMeasurement.mainThreadTaskMs + multiFilterClearMeasurement.mainThreadTaskMs,
        deepScrollCommitMs: deepScrollMeasurement.commitMs,
        deepScrollPaintMs: deepScrollMeasurement.paintMs,
        deepScrollDispatchMs: deepScrollMeasurement.scrollEventTiming.dispatchMs,
        deepScrollEventCommitMs: deepScrollMeasurement.scrollEventTiming.commitMs,
        deepScrollEventPaintMs: deepScrollMeasurement.scrollEventTiming.paintMs,
        deepScrollMainThreadTaskMs: deepScrollMeasurement.mainThreadTaskMs,
        jsHeapUsedBytes: 0,
        domElementCount: await page.locator("*").count(),
        domNodeCount: await page.evaluate(() => {
          const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
          let count = 0;
          while (walker.nextNode()) count += 1;
          return count;
        }),
        transferredBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        decodedBodyBytes: resources.reduce((sum, resource) => sum + resource.decodedBodySize, 0),
        longTaskCount: longTasks.length,
        longTaskDurationMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
        mountedRowCount: driverState.snapshot.mountedRowCount,
        mountedCellCount: driverState.snapshot.mountedCellCount,
      },
      completionSources: {
        sort: sortMeasurement.completionSource,
        sortFlip: sortFlipMeasurement.completionSource,
        clearSort: clearAfterSortMeasurement.completionSource,
        filter: filterMeasurement.completionSource,
        clearFilter: clearAfterFilterMeasurement.completionSource,
        columnFilter: columnFilterMeasurement.completionSource,
        clearColumnFilter: clearAfterColumnFilterMeasurement.completionSource,
        workflowFilter: workflowFilterMeasurement.completionSource,
        workflowColumnFilter: workflowColumnFilterMeasurement.completionSource,
        workflowSort: workflowSortMeasurement.completionSource,
        workflowClear: workflowClearMeasurement.completionSource,
        refinementFilter: refinementFilterMeasurement.completionSource,
        refinementColumnFilter: refinementColumnFilterMeasurement.completionSource,
        refinementSort: refinementSortMeasurement.completionSource,
        refinementFilterSwap: refinementFilterSwapMeasurement.completionSource,
        refinementColumnFilterSwap: refinementColumnFilterSwapMeasurement.completionSource,
        refinementSortFlip: refinementSortFlipMeasurement.completionSource,
        refinementClear: refinementClearMeasurement.completionSource,
        columnHide: columnHideMeasurement.completionSource,
        columnRestore: columnRestoreMeasurement.completionSource,
        columnResize: columnResizeMeasurement.completionSource,
        columnSizeRestore: columnSizeRestoreMeasurement.completionSource,
        columnMove: columnMoveMeasurement.completionSource,
        columnOrderRestore: columnOrderRestoreMeasurement.completionSource,
        columnPin: columnPinMeasurement.completionSource,
        columnUnpin: columnUnpinMeasurement.completionSource,
        layoutWorkflowMove: layoutWorkflowMoveMeasurement.completionSource,
        layoutWorkflowResize: layoutWorkflowResizeMeasurement.completionSource,
        layoutWorkflowPin: layoutWorkflowPinMeasurement.completionSource,
        layoutWorkflowHide: layoutWorkflowHideMeasurement.completionSource,
        layoutWorkflowShow: layoutWorkflowShowMeasurement.completionSource,
        layoutWorkflowUnpin: layoutWorkflowUnpinMeasurement.completionSource,
        layoutWorkflowSizeRestore: layoutWorkflowSizeRestoreMeasurement.completionSource,
        layoutWorkflowOrderRestore: layoutWorkflowOrderRestoreMeasurement.completionSource,
        rowSelect: rowSelectMeasurement.completionSource,
        rowDeselect: rowDeselectMeasurement.completionSource,
        allRowsSelect: allRowsSelectMeasurement.completionSource,
        allRowsDeselect: allRowsDeselectMeasurement.completionSource,
        multiSortApply: multiSortApplyMeasurement.completionSource,
        multiSortClear: multiSortClearMeasurement.completionSource,
        multiFilterApply: multiFilterApplyMeasurement.completionSource,
        multiFilterClear: multiFilterClearMeasurement.completionSource,
        deepScroll: deepScrollMeasurement.completionSource,
      },
      interactionSources: {
        sort: sortMeasurement.eventType,
        sortFlip: sortFlipMeasurement.eventType,
        clearSort: clearAfterSortMeasurement.eventType,
        filter: filterMeasurement.eventType,
        clearFilter: clearAfterFilterMeasurement.eventType,
        columnFilter: columnFilterMeasurement.eventType,
        clearColumnFilter: clearAfterColumnFilterMeasurement.eventType,
        workflowFilter: workflowFilterMeasurement.eventType,
        workflowColumnFilter: workflowColumnFilterMeasurement.eventType,
        workflowSort: workflowSortMeasurement.eventType,
        workflowClear: workflowClearMeasurement.eventType,
        refinementFilter: refinementFilterMeasurement.eventType,
        refinementColumnFilter: refinementColumnFilterMeasurement.eventType,
        refinementSort: refinementSortMeasurement.eventType,
        refinementFilterSwap: refinementFilterSwapMeasurement.eventType,
        refinementColumnFilterSwap: refinementColumnFilterSwapMeasurement.eventType,
        refinementSortFlip: refinementSortFlipMeasurement.eventType,
        refinementClear: refinementClearMeasurement.eventType,
        columnHide: columnHideMeasurement.eventType,
        columnRestore: columnRestoreMeasurement.eventType,
        columnResize: columnResizeMeasurement.eventType,
        columnSizeRestore: columnSizeRestoreMeasurement.eventType,
        columnMove: columnMoveMeasurement.eventType,
        columnOrderRestore: columnOrderRestoreMeasurement.eventType,
        columnPin: columnPinMeasurement.eventType,
        columnUnpin: columnUnpinMeasurement.eventType,
        layoutWorkflowMove: layoutWorkflowMoveMeasurement.eventType,
        layoutWorkflowResize: layoutWorkflowResizeMeasurement.eventType,
        layoutWorkflowPin: layoutWorkflowPinMeasurement.eventType,
        layoutWorkflowHide: layoutWorkflowHideMeasurement.eventType,
        layoutWorkflowShow: layoutWorkflowShowMeasurement.eventType,
        layoutWorkflowUnpin: layoutWorkflowUnpinMeasurement.eventType,
        layoutWorkflowSizeRestore: layoutWorkflowSizeRestoreMeasurement.eventType,
        layoutWorkflowOrderRestore: layoutWorkflowOrderRestoreMeasurement.eventType,
        rowSelect: rowSelectMeasurement.eventType,
        rowDeselect: rowDeselectMeasurement.eventType,
        allRowsSelect: allRowsSelectMeasurement.eventType,
        allRowsDeselect: allRowsDeselectMeasurement.eventType,
        multiSortApply: multiSortApplyMeasurement.eventType,
        multiSortClear: multiSortClearMeasurement.eventType,
        multiFilterApply: multiFilterApplyMeasurement.eventType,
        multiFilterClear: multiFilterClearMeasurement.eventType,
        deepScroll: "scroll",
      },
      presentationSources: {
        sort: {
          source: sortMeasurement.presentationTiming.source,
          eventType: sortMeasurement.eventType,
          interactionId: sortMeasurement.presentationTiming.interactionId,
          durationThresholdMs: 16,
        },
      },
      interactionPhase: "post-animation-frame",
      workflowSnapshots: {
        filter: workflowFilterSnapshot,
        columnFilter: workflowColumnFilterSnapshot,
        sort: workflowSortSnapshot,
        clear: workflowClearSnapshot,
      },
      refinementSnapshots: {
        filter: refinementFilterSnapshot,
        columnFilter: refinementColumnFilterSnapshot,
        sort: refinementSortSnapshot,
        filterSwap: refinementFilterSwapSnapshot,
        columnFilterSwap: refinementColumnFilterSwapSnapshot,
        sortFlip: refinementSortFlipSnapshot,
        clear: refinementClearSnapshot,
      },
      columnVisibilitySnapshots: {
        hidden: columnHiddenSnapshot,
        restored: columnRestoredSnapshot,
      },
      columnSizingSnapshots: {
        resized: columnResizedSnapshot,
        restored: columnSizeRestoredSnapshot,
      },
      columnOrderingSnapshots: {
        moved: columnMovedSnapshot,
        restored: columnOrderRestoredSnapshot,
      },
      columnPinningSnapshots: {
        pinned: columnPinnedSnapshot,
        unpinned: columnUnpinnedSnapshot,
      },
      layoutWorkflowMeasurements,
      layoutWorkflowSnapshots: {
        moved: layoutWorkflowMovedSnapshot,
        resized: layoutWorkflowResizedSnapshot,
        pinned: layoutWorkflowPinnedSnapshot,
        hidden: layoutWorkflowHiddenSnapshot,
        shown: layoutWorkflowShownSnapshot,
        unpinned: layoutWorkflowUnpinnedSnapshot,
        sizeRestored: layoutWorkflowSizeRestoredSnapshot,
        orderRestored: layoutWorkflowOrderRestoredSnapshot,
      },
      rowSelectionSnapshots: {
        selected: rowSelectedSnapshot,
        deselected: rowDeselectedSnapshot,
      },
      allRowsSelectionSnapshots: {
        selected: allRowsSelectedSnapshot,
        deselected: allRowsDeselectedSnapshot,
      },
      multiSortSnapshots: {
        applied: multiSortAppliedSnapshot,
        cleared: multiSortClearedSnapshot,
      },
      multiFilterSnapshots: {
        applied: multiFilterAppliedSnapshot,
        cleared: multiFilterClearedSnapshot,
      },
      snapshot: driverState.snapshot,
    };
  } finally {
    await context.close();
  }
  runResult.metrics.jsHeapUsedBytes = await measureHeapAfterWorkload(activeHeapBrowser, benchmarkTarget, profileId, runResult.datasetFingerprint);
  return runResult;
}

async function measureHeapAfterWorkload(activeBrowser, benchmarkTarget, profileId, expectedFingerprint) {
  const profile = getBenchmarkProfile(profileId);
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Performance.enable");

  try {
    await page.goto(`${benchmarkTarget.url}/?profile=${profileId}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => window.__OPEN_GRID_BENCHMARK__?.ready === true, undefined, { timeout: 120_000 });
    const workloadState = await withTimeout(Promise.race([
      page.evaluate(async ({ actions }) => {
        const driver = window.__OPEN_GRID_BENCHMARK__;
        if (driver.version !== 15 || typeof driver.measureActionDetails !== "function") {
          throw new Error("benchmark driver version 15 with detailed action timing is required");
        }
        for (const action of actions) await driver.measureActionDetails(action);
        return { datasetFingerprint: driver.datasetFingerprint, snapshot: driver.getSnapshot() };
      }, { actions: createHeapWorkloadActions(profile.columnCount) }),
      page.waitForEvent("crash", { timeout: 0 }).then(() => {
        throw new Error(`heap workload renderer crashed: ${benchmarkTarget.id}/${profileId}`);
      }),
    ]), HEAP_WORKLOAD_TIMEOUT_MS,
    `heap workload timed out: ${benchmarkTarget.id}/${profileId}`);
    const minimumDeepScrollTop = getBenchmarkDeepScrollMinimum(profile.rowCount);
    if (workloadState.datasetFingerprint !== expectedFingerprint
      || workloadState.snapshot.rowCount !== profile.rowCount
      || workloadState.snapshot.displayedRowCount !== profile.rowCount
      || !equalStringArrays(workloadState.snapshot.selectedRowIds, [])
      || workloadState.snapshot.selectedRowCount !== 0
      || workloadState.snapshot.allRowsSelected !== false
      || !equalSortRules(workloadState.snapshot.sorting, [])
      || workloadState.snapshot.scrollTop < minimumDeepScrollTop
      || workloadState.snapshot.mountedRowCount <= 0
      || workloadState.snapshot.mountedRowCount >= 80) {
      throw new Error(`heap workload did not reach the comparable final state: ${benchmarkTarget.id}/${profileId}`);
    }
    await cdp.send("HeapProfiler.collectGarbage");
    const performanceMetrics = await cdp.send("Performance.getMetrics");
    const jsHeapUsedBytes = performanceMetrics.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value;
    if (!Number.isFinite(jsHeapUsedBytes) || jsHeapUsedBytes <= 0) {
      throw new Error(`heap workload did not report JSHeapUsedSize: ${benchmarkTarget.id}/${profileId}`);
    }
    return jsHeapUsedBytes;
  } finally {
    await context.close();
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function createHeapWorkloadActions(columnCount) {
  return [
    { type: "sort", columnId: "column_5", direction: "asc" },
    { type: "sort", columnId: "column_5", direction: "desc" },
    { type: "clear" },
    { type: "filter", value: "Blocked" },
    { type: "clear" },
    { type: "columnFilter", columnId: "column_2", value: "Blocked" },
    { type: "clear" },
    { type: "filter", value: "APAC" },
    { type: "columnFilter", columnId: "column_2", value: "Blocked" },
    { type: "sort", columnId: "column_5", direction: "asc" },
    { type: "clear" },
    { type: "filter", value: "APAC" },
    { type: "columnFilter", columnId: "column_2", value: "Blocked" },
    { type: "sort", columnId: "column_5", direction: "asc" },
    { type: "filter", value: "EMEA" },
    { type: "columnFilter", columnId: "column_2", value: "Complete" },
    { type: "sort", columnId: "column_5", direction: "desc" },
    { type: "clear" },
    { type: "columnVisibility", columnId: "column_10", visible: false },
    { type: "columnVisibility", columnId: "column_10", visible: true },
    { type: "columnSizing", columnId: "column_10", size: 200 },
    { type: "columnSizing", columnId: "column_10", size: 120 },
    { type: "columnOrdering", columnIds: createMovedColumnOrder(columnCount) },
    { type: "columnOrdering", columnIds: createDefaultColumnOrder(columnCount) },
    { type: "columnPinning", columnId: "column_10", pinned: true },
    { type: "columnPinning", columnId: "column_10", pinned: false },
    { type: "columnOrdering", columnIds: createMovedColumnOrder(columnCount) },
    { type: "columnSizing", columnId: "column_10", size: 200 },
    { type: "columnPinning", columnId: "column_10", pinned: true },
    { type: "columnVisibility", columnId: "column_10", visible: false },
    { type: "columnVisibility", columnId: "column_10", visible: true },
    { type: "columnPinning", columnId: "column_10", pinned: false },
    { type: "columnSizing", columnId: "column_10", size: 120 },
    { type: "columnOrdering", columnIds: createDefaultColumnOrder(columnCount) },
    { type: "rowSelection", rowId: "row_0", selected: true },
    { type: "rowSelection", rowId: "row_0", selected: false },
    { type: "allRowSelection", selected: true },
    { type: "allRowSelection", selected: false },
    { type: "multiSort", rules: MULTI_SORT_RULES },
    { type: "multiSort", rules: [] },
    { type: "multiFilter", rules: MULTI_FILTER_RULES },
    { type: "multiFilter", rules: [] },
    { type: "scroll", top: BENCHMARK_DEEP_SCROLL_TOP, left: 1_200 },
  ];
}

function sumActionMeasurements(measurements, field) {
  return Object.values(measurements).reduce((total, measurement) => total + measurement[field], 0);
}

async function measureActionDetails(page, cdp, action) {
  if (action !== "scroll") {
    const columnCount = action === "columnMove" || action === "columnOrderRestore"
      ? await page.evaluate(() => window.__OPEN_GRID_BENCHMARK__.getSnapshot().columnCount)
      : undefined;
    const contract = getBenchmarkActionContract(action, columnCount);
    const target = page.locator(contract.selector);
    let clickPoint;
    if (contract.eventType === "input") {
      await target.focus();
      if (contract.replaceExisting) await page.keyboard.press("ControlOrMeta+A");
    } else {
      const box = await target.boundingBox();
      if (!box) throw new Error(`benchmark ${action} target is not visible`);
      clickPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }
    await page.evaluate(prepareBenchmarkEventActionMeasurement, {
      ...contract,
      captureEventTiming: action === "sort",
    });
    await page.evaluate(() => new Promise((resolvePromise) => requestAnimationFrame(() => resolvePromise())));
    const mainThreadTaskStartMs = await readMainThreadTaskMs(cdp);
    if (contract.eventType === "input") await page.keyboard.insertText(contract.text);
    else await page.mouse.click(clickPoint.x, clickPoint.y);
    let measurement;
    try {
      measurement = await page.evaluate(readBenchmarkEventActionMeasurement);
    } catch (error) {
      const snapshot = await page.evaluate(() => window.__OPEN_GRID_BENCHMARK__?.getSnapshot());
      throw new Error(`benchmark ${action} measurement failed: ${error instanceof Error ? error.message : String(error)}: ${JSON.stringify({ expected: contract.action, snapshot })}`, { cause: error });
    }
    return {
      ...measurement,
      mainThreadTaskMs: getBenchmarkMainThreadTaskDeltaMs(mainThreadTaskStartMs, await readMainThreadTaskMs(cdp)),
    };
  }
  const mainThreadTaskStartMs = await readMainThreadTaskMs(cdp);
  const measurement = await page.evaluate(async ({ deepScrollTop }) => {
    const driver = window.__OPEN_GRID_BENCHMARK__;
    if (driver.version !== 15 || typeof driver.measureActionDetails !== "function") {
      throw new Error("benchmark driver version 15 with detailed action timing is required");
    }
    return driver.measureActionDetails({ type: "scroll", top: deepScrollTop, left: 1_200 });
  }, { deepScrollTop: BENCHMARK_DEEP_SCROLL_TOP });
  return {
    ...measurement,
    mainThreadTaskMs: getBenchmarkMainThreadTaskDeltaMs(mainThreadTaskStartMs, await readMainThreadTaskMs(cdp)),
  };
}

function getBenchmarkActionContract(action, columnCount) {
  if (action === "filter" || action === "workflowFilter" || action === "refinementFilter" || action === "refinementFilterSwap") {
    const value = action === "filter" ? "Blocked" : action === "refinementFilterSwap" ? "EMEA" : "APAC";
    return { action: { type: "filter", value }, selector: '[data-benchmark-action="quick-filter"]', eventType: "input", text: value, replaceExisting: action === "refinementFilterSwap" };
  }
  if (action === "columnFilter" || action === "workflowColumnFilter" || action === "refinementColumnFilter" || action === "refinementColumnFilterSwap") {
    const value = action === "refinementColumnFilterSwap" ? "Complete" : "Blocked";
    return { action: { type: "columnFilter", columnId: "column_2", value }, selector: '[data-benchmark-action="column-filter"]', eventType: "input", text: value, replaceExisting: action === "refinementColumnFilterSwap" };
  }
  if (action === "sort" || action === "sortFlip" || action === "workflowSort" || action === "refinementSort" || action === "refinementSortFlip") {
    return { action: { type: "sort", columnId: "column_5", direction: action === "sortFlip" || action === "refinementSortFlip" ? "desc" : "asc" }, selector: '[data-benchmark-action="sort"]', eventType: "click" };
  }
  if (action === "clear" || action === "workflowClear" || action === "refinementClear") {
    return { action: { type: "clear" }, selector: '[data-benchmark-action="clear"]', eventType: "click" };
  }
  if (action === "columnHide" || action === "columnRestore") {
    return { action: { type: "columnVisibility", columnId: "column_10", visible: action === "columnRestore" }, selector: '[data-benchmark-action="column-visibility"]', eventType: "click" };
  }
  if (action === "columnResize" || action === "columnSizeRestore") {
    return { action: { type: "columnSizing", columnId: "column_10", size: action === "columnResize" ? 200 : 120 }, selector: '[data-benchmark-action="column-sizing"]', eventType: "click" };
  }
  if (action === "columnMove" || action === "columnOrderRestore") {
    if (!Number.isSafeInteger(columnCount) || columnCount < 10) {
      throw new RangeError(`column ordering measurement requires at least 10 columns: ${String(columnCount)}`);
    }
    return {
      action: { type: "columnOrdering", columnIds: action === "columnMove" ? createMovedColumnOrder(columnCount) : createDefaultColumnOrder(columnCount) },
      selector: '[data-benchmark-action="column-ordering"]',
      eventType: "click",
    };
  }
  if (action === "columnPin" || action === "columnUnpin") {
    return {
      action: { type: "columnPinning", columnId: "column_10", pinned: action === "columnPin" },
      selector: '[data-benchmark-action="column-pinning"]',
      eventType: "click",
    };
  }
  if (action === "rowSelect" || action === "rowDeselect") {
    return {
      action: { type: "rowSelection", rowId: "row_0", selected: action === "rowSelect" },
      selector: '[data-benchmark-action="row-selection"]',
      eventType: "click",
    };
  }
  if (action === "allRowsSelect" || action === "allRowsDeselect") {
    return {
      action: { type: "allRowSelection", selected: action === "allRowsSelect" },
      selector: '[data-benchmark-action="all-row-selection"]',
      eventType: "click",
    };
  }
  if (action === "multiSortApply" || action === "multiSortClear") {
    return {
      action: { type: "multiSort", rules: action === "multiSortApply" ? MULTI_SORT_RULES : [] },
      selector: '[data-benchmark-action="multi-sort"]',
      eventType: "click",
    };
  }
  if (action === "multiFilterApply" || action === "multiFilterClear") {
    return {
      action: { type: "multiFilter", rules: action === "multiFilterApply" ? MULTI_FILTER_RULES : [] },
      selector: '[data-benchmark-action="multi-filter"]',
      eventType: "click",
    };
  }
  throw new TypeError(`unknown benchmark measurement action: ${action}`);
}

function createDefaultColumnOrder(columnCount) {
  return Array.from({ length: columnCount }, (_, index) => `column_${index}`);
}

function createMovedColumnOrder(columnCount) {
  const columnIds = createDefaultColumnOrder(columnCount);
  return [...columnIds.slice(0, 2), "column_10", ...columnIds.slice(2, 10), ...columnIds.slice(11)];
}

function equalStringArrays(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameStringSet(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && new Set(left).size === left.length
    && left.every((value) => right.includes(value));
}

function equalSortRules(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((rule, index) => rule?.columnId === right[index]?.columnId && rule?.direction === right[index]?.direction);
}

function equalFilterRules(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((rule, index) => rule?.columnId === right[index]?.columnId && rule?.value === right[index]?.value);
}

async function readMainThreadTaskMs(cdp) {
  return readBenchmarkMainThreadTaskMs(await cdp.send("Performance.getMetrics"));
}

async function assertPageState(page, predicate, description) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const snapshot = await page.evaluate(() => window.__OPEN_GRID_BENCHMARK__.getSnapshot());
    if (predicate(snapshot)) return snapshot;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  throw new Error(`benchmark action did not reach the expected state: ${description}`);
}

function parseArgs(argv) {
  const parsed = {
    suite: "comparison",
    profileIds: ["standard-client"],
    runs: 5,
    warmups: 1,
    checkpointDir: null,
    resume: false,
    jsonOut: resolve(".benchmark-results/latest.json"),
    markdownOut: resolve(".benchmark-results/latest.md"),
  };
  let profileSelection;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    const value = argv[index + 1];
    if (argument === "--resume") {
      parsed.resume = true;
      continue;
    }
    if (
      ["--suite", "--profile", "--profiles", "--runs", "--warmups", "--checkpoint-dir", "--json-out", "--markdown-out"].includes(argument)
      && (value === undefined || value.startsWith("--"))
    ) {
      throw new TypeError(`${argument} requires a value`);
    }
    if (argument === "--suite") {
      if (value !== "comparison" && value !== "framework") throw new RangeError("--suite must be comparison or framework");
      parsed.suite = value;
    }
    else if (argument === "--profile" || argument === "--profiles") {
      if (profileSelection) throw new TypeError(`${argument} cannot be combined with ${profileSelection}`);
      profileSelection = argument;
      parsed.profileIds = argument === "--profiles" ? parseProfileIds(value) : [value];
    }
    else if (argument === "--runs") parsed.runs = positiveInteger(value, argument);
    else if (argument === "--warmups") parsed.warmups = nonNegativeInteger(value, argument);
    else if (argument === "--checkpoint-dir") parsed.checkpointDir = resolve(value);
    else if (argument === "--json-out") parsed.jsonOut = resolve(value);
    else if (argument === "--markdown-out") parsed.markdownOut = resolve(value);
    else throw new TypeError(`unknown argument: ${argument}`);
    index += 1;
  }
  if (parsed.resume && !parsed.checkpointDir) {
    throw new TypeError("--resume requires --checkpoint-dir");
  }
  return parsed;
}

function parseProfileIds(value) {
  if (value === "all") return BENCHMARK_PROFILES.map((profile) => profile.id);
  const profileIds = value.split(",").map((profileId) => profileId.trim());
  if (profileIds.some((profileId) => profileId.length === 0)) {
    throw new TypeError("--profiles must be 'all' or a comma-separated profile list");
  }
  if (new Set(profileIds).size !== profileIds.length) {
    throw new TypeError("--profiles must not contain duplicate profile ids");
  }
  return profileIds;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new RangeError(`${name} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return parsed;
}

function target(id, packageName, port, version) {
  return { id, packageName, url: `http://127.0.0.1:${port}`, version };
}

function rotateTargets(values, offset) {
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function manifestVersion(manifestPath) {
  const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
  return manifest.version;
}

async function waitForUrl(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`preview did not become ready: ${url}`);
}

function writeArtifact(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

function gitOutput(args) {
  return spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
}

function sourceFingerprint() {
  try {
    return createBenchmarkSourceFingerprint();
  } catch {
    return "unavailable";
  }
}
