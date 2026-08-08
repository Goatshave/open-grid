export const BENCHMARK_RESULT_SCHEMA_VERSION = 29;

export const BENCHMARK_MEASUREMENT_PREPARATION = Object.freeze({
  actionTiming: "post-frame-isolated-gc",
  heap: "separate-browser-post-workload-forced-gc",
});

export const BENCHMARK_METRICS = Object.freeze({
  initialReadyMs: metric("Initial ready", "ms"),
  initialMainThreadTaskMs: metric("Initial main-thread task time", "ms"),
  initialPreModuleMs: metric("Initial navigation and module setup", "ms"),
  initialDatasetGenerationMs: metric("Initial dataset generation", "ms"),
  initialDatasetFingerprintMs: metric("Initial dataset fingerprint", "ms"),
  initialAppSetupMs: metric("Initial product and framework setup", "ms"),
  initialReadinessFramesMs: metric("Initial readiness frames", "ms"),
  initialInstrumentedReadyMs: metric("Initial instrumented ready", "ms"),
  initialObservationDelayMs: metric("Initial automation observation delay", "ms"),
  sortCommitMs: metric("Sort to DOM commit", "ms"),
  sortPaintMs: metric("Sort to paint", "ms"),
  sortMainThreadTaskMs: metric("Sort main-thread task time", "ms"),
  sortPresentationMs: metric("Sort interaction to next paint", "ms"),
  sortPresentationInputDelayMs: metric("Sort presentation input delay", "ms"),
  sortPresentationProcessingMs: metric("Sort presentation processing duration", "ms"),
  sortPresentationDelayMs: metric("Sort presentation delay", "ms"),
  sortFlipCommitMs: metric("Sort direction flip to DOM commit", "ms"),
  sortFlipPaintMs: metric("Sort direction flip to paint", "ms"),
  sortFlipMainThreadTaskMs: metric("Sort direction flip main-thread task time", "ms"),
  filterCommitMs: metric("Filter to DOM commit", "ms"),
  filterPaintMs: metric("Filter to paint", "ms"),
  filterMainThreadTaskMs: metric("Filter main-thread task time", "ms"),
  columnFilterCommitMs: metric("Column filter to DOM commit", "ms"),
  columnFilterPaintMs: metric("Column filter to paint", "ms"),
  columnFilterMainThreadTaskMs: metric("Column filter main-thread task time", "ms"),
  clearCommitMs: metric("Clear to DOM commit (worst)", "ms"),
  clearPaintMs: metric("Clear to paint (worst)", "ms"),
  clearMainThreadTaskMs: metric("Clear main-thread task time (worst)", "ms"),
  clearSortCommitMs: metric("Clear sort to DOM commit", "ms"),
  clearSortPaintMs: metric("Clear sort to paint", "ms"),
  clearSortMainThreadTaskMs: metric("Clear sort main-thread task time", "ms"),
  clearFilterCommitMs: metric("Clear filter to DOM commit", "ms"),
  clearFilterPaintMs: metric("Clear filter to paint", "ms"),
  clearFilterMainThreadTaskMs: metric("Clear filter main-thread task time", "ms"),
  clearColumnFilterCommitMs: metric("Clear column filter to DOM commit", "ms"),
  clearColumnFilterPaintMs: metric("Clear column filter to paint", "ms"),
  clearColumnFilterMainThreadTaskMs: metric("Clear column filter main-thread task time", "ms"),
  workflowFilterCommitMs: metric("Analysis workflow global filter to DOM commit", "ms"),
  workflowFilterPaintMs: metric("Analysis workflow global filter to paint", "ms"),
  workflowFilterMainThreadTaskMs: metric("Analysis workflow global filter main-thread task time", "ms"),
  workflowColumnFilterCommitMs: metric("Analysis workflow column filter to DOM commit", "ms"),
  workflowColumnFilterPaintMs: metric("Analysis workflow column filter to paint", "ms"),
  workflowColumnFilterMainThreadTaskMs: metric("Analysis workflow column filter main-thread task time", "ms"),
  workflowSortCommitMs: metric("Analysis workflow filtered sort to DOM commit", "ms"),
  workflowSortPaintMs: metric("Analysis workflow filtered sort to paint", "ms"),
  workflowSortMainThreadTaskMs: metric("Analysis workflow filtered sort main-thread task time", "ms"),
  workflowClearCommitMs: metric("Analysis workflow clear to DOM commit", "ms"),
  workflowClearPaintMs: metric("Analysis workflow clear to paint", "ms"),
  workflowClearMainThreadTaskMs: metric("Analysis workflow clear main-thread task time", "ms"),
  workflowTotalCommitMs: metric("Analysis workflow total DOM commit latency", "ms"),
  workflowTotalPaintMs: metric("Analysis workflow total paint latency", "ms"),
  workflowTotalMainThreadTaskMs: metric("Analysis workflow total main-thread task time", "ms"),
  refinementFilterCommitMs: metric("Refinement workflow global filter to DOM commit", "ms"),
  refinementFilterPaintMs: metric("Refinement workflow global filter to paint", "ms"),
  refinementFilterMainThreadTaskMs: metric("Refinement workflow global filter main-thread task time", "ms"),
  refinementColumnFilterCommitMs: metric("Refinement workflow column filter to DOM commit", "ms"),
  refinementColumnFilterPaintMs: metric("Refinement workflow column filter to paint", "ms"),
  refinementColumnFilterMainThreadTaskMs: metric("Refinement workflow column filter main-thread task time", "ms"),
  refinementSortCommitMs: metric("Refinement workflow filtered sort to DOM commit", "ms"),
  refinementSortPaintMs: metric("Refinement workflow filtered sort to paint", "ms"),
  refinementSortMainThreadTaskMs: metric("Refinement workflow filtered sort main-thread task time", "ms"),
  refinementFilterSwapCommitMs: metric("Refinement workflow query replacement to DOM commit", "ms"),
  refinementFilterSwapPaintMs: metric("Refinement workflow query replacement to paint", "ms"),
  refinementFilterSwapMainThreadTaskMs: metric("Refinement workflow query replacement main-thread task time", "ms"),
  refinementColumnFilterSwapCommitMs: metric("Refinement workflow status replacement to DOM commit", "ms"),
  refinementColumnFilterSwapPaintMs: metric("Refinement workflow status replacement to paint", "ms"),
  refinementColumnFilterSwapMainThreadTaskMs: metric("Refinement workflow status replacement main-thread task time", "ms"),
  refinementSortFlipCommitMs: metric("Refinement workflow sort flip to DOM commit", "ms"),
  refinementSortFlipPaintMs: metric("Refinement workflow sort flip to paint", "ms"),
  refinementSortFlipMainThreadTaskMs: metric("Refinement workflow sort flip main-thread task time", "ms"),
  refinementClearCommitMs: metric("Refinement workflow clear to DOM commit", "ms"),
  refinementClearPaintMs: metric("Refinement workflow clear to paint", "ms"),
  refinementClearMainThreadTaskMs: metric("Refinement workflow clear main-thread task time", "ms"),
  refinementTotalCommitMs: metric("Refinement workflow total DOM commit latency", "ms"),
  refinementTotalPaintMs: metric("Refinement workflow total paint latency", "ms"),
  refinementTotalMainThreadTaskMs: metric("Refinement workflow total main-thread task time", "ms"),
  columnHideCommitMs: metric("Column hide to DOM commit", "ms"),
  columnHidePaintMs: metric("Column hide to paint", "ms"),
  columnHideMainThreadTaskMs: metric("Column hide main-thread task time", "ms"),
  columnRestoreCommitMs: metric("Column restore to DOM commit", "ms"),
  columnRestorePaintMs: metric("Column restore to paint", "ms"),
  columnRestoreMainThreadTaskMs: metric("Column restore main-thread task time", "ms"),
  columnVisibilityTotalCommitMs: metric("Column visibility workflow total DOM commit latency", "ms"),
  columnVisibilityTotalPaintMs: metric("Column visibility workflow total paint latency", "ms"),
  columnVisibilityTotalMainThreadTaskMs: metric("Column visibility workflow total main-thread task time", "ms"),
  columnResizeCommitMs: metric("Column resize to DOM commit", "ms"),
  columnResizePaintMs: metric("Column resize to paint", "ms"),
  columnResizeMainThreadTaskMs: metric("Column resize main-thread task time", "ms"),
  columnSizeRestoreCommitMs: metric("Column size restore to DOM commit", "ms"),
  columnSizeRestorePaintMs: metric("Column size restore to paint", "ms"),
  columnSizeRestoreMainThreadTaskMs: metric("Column size restore main-thread task time", "ms"),
  columnSizingTotalCommitMs: metric("Column sizing workflow total DOM commit latency", "ms"),
  columnSizingTotalPaintMs: metric("Column sizing workflow total paint latency", "ms"),
  columnSizingTotalMainThreadTaskMs: metric("Column sizing workflow total main-thread task time", "ms"),
  columnMoveCommitMs: metric("Column move to DOM commit", "ms"),
  columnMovePaintMs: metric("Column move to paint", "ms"),
  columnMoveMainThreadTaskMs: metric("Column move main-thread task time", "ms"),
  columnOrderRestoreCommitMs: metric("Column order restore to DOM commit", "ms"),
  columnOrderRestorePaintMs: metric("Column order restore to paint", "ms"),
  columnOrderRestoreMainThreadTaskMs: metric("Column order restore main-thread task time", "ms"),
  columnOrderingTotalCommitMs: metric("Column ordering workflow total DOM commit latency", "ms"),
  columnOrderingTotalPaintMs: metric("Column ordering workflow total paint latency", "ms"),
  columnOrderingTotalMainThreadTaskMs: metric("Column ordering workflow total main-thread task time", "ms"),
  columnPinCommitMs: metric("Column pin DOM commit latency", "ms"),
  columnPinPaintMs: metric("Column pin paint latency", "ms"),
  columnPinMainThreadTaskMs: metric("Column pin main-thread task time", "ms"),
  columnUnpinCommitMs: metric("Column unpin DOM commit latency", "ms"),
  columnUnpinPaintMs: metric("Column unpin paint latency", "ms"),
  columnUnpinMainThreadTaskMs: metric("Column unpin main-thread task time", "ms"),
  columnPinningTotalCommitMs: metric("Column pinning workflow total DOM commit latency", "ms"),
  columnPinningTotalPaintMs: metric("Column pinning workflow total paint latency", "ms"),
  columnPinningTotalMainThreadTaskMs: metric("Column pinning workflow total main-thread task time", "ms"),
  layoutWorkflowTotalCommitMs: metric("Layout workspace workflow total DOM commit latency", "ms"),
  layoutWorkflowTotalPaintMs: metric("Layout workspace workflow total paint latency", "ms"),
  layoutWorkflowTotalMainThreadTaskMs: metric("Layout workspace workflow total main-thread task time", "ms"),
  rowSelectCommitMs: metric("Row select DOM commit latency", "ms"),
  rowSelectPaintMs: metric("Row select paint latency", "ms"),
  rowSelectMainThreadTaskMs: metric("Row select main-thread task time", "ms"),
  rowDeselectCommitMs: metric("Row deselect DOM commit latency", "ms"),
  rowDeselectPaintMs: metric("Row deselect paint latency", "ms"),
  rowDeselectMainThreadTaskMs: metric("Row deselect main-thread task time", "ms"),
  rowSelectionTotalCommitMs: metric("Row selection workflow total DOM commit latency", "ms"),
  rowSelectionTotalPaintMs: metric("Row selection workflow total paint latency", "ms"),
  rowSelectionTotalMainThreadTaskMs: metric("Row selection workflow total main-thread task time", "ms"),
  allRowsSelectCommitMs: metric("All-row select DOM commit latency", "ms"),
  allRowsSelectPaintMs: metric("All-row select paint latency", "ms"),
  allRowsSelectMainThreadTaskMs: metric("All-row select main-thread task time", "ms"),
  allRowsDeselectCommitMs: metric("All-row deselect DOM commit latency", "ms"),
  allRowsDeselectPaintMs: metric("All-row deselect paint latency", "ms"),
  allRowsDeselectMainThreadTaskMs: metric("All-row deselect main-thread task time", "ms"),
  allRowsSelectionTotalCommitMs: metric("All-row selection workflow total DOM commit latency", "ms"),
  allRowsSelectionTotalPaintMs: metric("All-row selection workflow total paint latency", "ms"),
  allRowsSelectionTotalMainThreadTaskMs: metric("All-row selection workflow total main-thread task time", "ms"),
  multiSortApplyCommitMs: metric("Multi-column sort apply DOM commit latency", "ms"),
  multiSortApplyPaintMs: metric("Multi-column sort apply paint latency", "ms"),
  multiSortApplyMainThreadTaskMs: metric("Multi-column sort apply main-thread task time", "ms"),
  multiSortClearCommitMs: metric("Multi-column sort clear DOM commit latency", "ms"),
  multiSortClearPaintMs: metric("Multi-column sort clear paint latency", "ms"),
  multiSortClearMainThreadTaskMs: metric("Multi-column sort clear main-thread task time", "ms"),
  multiSortTotalCommitMs: metric("Multi-column sort workflow total DOM commit latency", "ms"),
  multiSortTotalPaintMs: metric("Multi-column sort workflow total paint latency", "ms"),
  multiSortTotalMainThreadTaskMs: metric("Multi-column sort workflow total main-thread task time", "ms"),
  multiFilterApplyCommitMs: metric("Multi-column filter apply DOM commit latency", "ms"),
  multiFilterApplyPaintMs: metric("Multi-column filter apply paint latency", "ms"),
  multiFilterApplyMainThreadTaskMs: metric("Multi-column filter apply main-thread task time", "ms"),
  multiFilterClearCommitMs: metric("Multi-column filter clear DOM commit latency", "ms"),
  multiFilterClearPaintMs: metric("Multi-column filter clear paint latency", "ms"),
  multiFilterClearMainThreadTaskMs: metric("Multi-column filter clear main-thread task time", "ms"),
  multiFilterTotalCommitMs: metric("Multi-column filter workflow total DOM commit latency", "ms"),
  multiFilterTotalPaintMs: metric("Multi-column filter workflow total paint latency", "ms"),
  multiFilterTotalMainThreadTaskMs: metric("Multi-column filter workflow total main-thread task time", "ms"),
  deepScrollCommitMs: metric("Deep scroll to DOM commit", "ms"),
  deepScrollPaintMs: metric("Deep scroll to paint", "ms"),
  deepScrollDispatchMs: metric("Deep scroll trigger to event", "ms"),
  deepScrollEventCommitMs: metric("Deep scroll event to DOM commit", "ms"),
  deepScrollEventPaintMs: metric("Deep scroll event to paint", "ms"),
  deepScrollMainThreadTaskMs: metric("Deep scroll main-thread task time", "ms"),
  jsHeapUsedBytes: metric("JS heap used", "bytes"),
  domElementCount: metric("DOM elements", "count"),
  domNodeCount: metric("Document nodes", "count"),
  transferredBytes: metric("Transferred", "bytes"),
  decodedBodyBytes: metric("Decoded resources", "bytes"),
  longTaskCount: metric("Long tasks", "count"),
  longTaskDurationMs: metric("Long-task duration", "ms"),
  mountedRowCount: metric("Mounted rows", "count"),
  mountedCellCount: metric("Mounted cells", "count"),
});

export function summarizeBenchmarkRuns(runs) {
  const recordedRuns = runs.filter((run) => !run.warmup);
  if (recordedRuns.length === 0) {
    throw new RangeError("at least one recorded benchmark run is required");
  }

  return Object.fromEntries(Object.keys(BENCHMARK_METRICS).map((metricId) => {
    const values = recordedRuns.map((run) => {
      const value = run.metrics?.[metricId];
      if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${metricId} must be a non-negative finite number`);
      }
      return value;
    }).sort((left, right) => left - right);

    return [metricId, {
      median: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      min: values[0],
      max: values.at(-1),
    }];
  }));
}

export function formatBenchmarkMarkdown(result) {
  const lines = [
    "# Open Grid Comparative Benchmark",
    "",
    `- Created: ${result.createdAt}`,
    `- Profile: ${result.config.profileId}`,
    `- Suite: ${result.config.suite ?? "comparison"}`,
    `- Recorded runs: ${result.config.runs}`,
    `- Warm-up runs: ${result.config.warmups}`,
    `- Dataset fingerprint: ${result.datasetFingerprint}`,
    `- Browser: ${result.environment.browser}`,
    `- Platform: ${result.environment.platform}`,
    `- Revision: ${result.environment.gitRevision}${result.environment.gitDirty ? " (dirty)" : ""}`,
    "- Status: observational baseline; not a parity or leadership claim",
    "",
    "| Metric | " + result.implementations.map((implementation) => `${implementation.id} median / p95`).join(" | ") + " |",
    "| --- | " + result.implementations.map(() => "---:").join(" | ") + " |",
  ];

  for (const [metricId, definition] of Object.entries(BENCHMARK_METRICS)) {
    const values = result.implementations.map((implementation) => {
      const summary = implementation.summary[metricId];
      return `${formatMetric(summary.median, definition.unit)} / ${formatMetric(summary.p95, definition.unit)}`;
    });
    lines.push(`| ${definition.label} | ${values.join(" | ")} |`);
  }

  lines.push("", "Raw per-run values and environment metadata are available in the adjacent JSON artifact.", "");
  return lines.join("\n");
}

function metric(label, unit) {
  return Object.freeze({ label, unit, lowerIsBetter: true });
}

function percentile(sortedValues, quantile) {
  const index = Math.max(0, Math.ceil(sortedValues.length * quantile) - 1);
  return sortedValues[index];
}

function formatMetric(value, unit) {
  if (unit === "bytes") {
    return `${(value / 1024).toFixed(1)} KiB`;
  }
  if (unit === "ms") {
    return `${value.toFixed(2)} ms`;
  }
  return value.toFixed(0);
}
