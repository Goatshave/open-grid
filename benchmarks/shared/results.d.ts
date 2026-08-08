export type BenchmarkMetricId =
  | "initialReadyMs"
  | "initialMainThreadTaskMs"
  | "initialPreModuleMs"
  | "initialDatasetGenerationMs"
  | "initialDatasetFingerprintMs"
  | "initialAppSetupMs"
  | "initialReadinessFramesMs"
  | "initialInstrumentedReadyMs"
  | "initialObservationDelayMs"
  | "sortCommitMs"
  | "sortPaintMs"
  | "sortMainThreadTaskMs"
  | "sortPresentationMs"
  | "sortPresentationInputDelayMs"
  | "sortPresentationProcessingMs"
  | "sortPresentationDelayMs"
  | "sortFlipCommitMs"
  | "sortFlipPaintMs"
  | "sortFlipMainThreadTaskMs"
  | "filterCommitMs"
  | "filterPaintMs"
  | "filterMainThreadTaskMs"
  | "columnFilterCommitMs"
  | "columnFilterPaintMs"
  | "columnFilterMainThreadTaskMs"
  | "clearCommitMs"
  | "clearPaintMs"
  | "clearMainThreadTaskMs"
  | "clearSortCommitMs"
  | "clearSortPaintMs"
  | "clearSortMainThreadTaskMs"
  | "clearFilterCommitMs"
  | "clearFilterPaintMs"
  | "clearFilterMainThreadTaskMs"
  | "clearColumnFilterCommitMs"
  | "clearColumnFilterPaintMs"
  | "clearColumnFilterMainThreadTaskMs"
  | "workflowFilterCommitMs"
  | "workflowFilterPaintMs"
  | "workflowFilterMainThreadTaskMs"
  | "workflowColumnFilterCommitMs"
  | "workflowColumnFilterPaintMs"
  | "workflowColumnFilterMainThreadTaskMs"
  | "workflowSortCommitMs"
  | "workflowSortPaintMs"
  | "workflowSortMainThreadTaskMs"
  | "workflowClearCommitMs"
  | "workflowClearPaintMs"
  | "workflowClearMainThreadTaskMs"
  | "workflowTotalCommitMs"
  | "workflowTotalPaintMs"
  | "workflowTotalMainThreadTaskMs"
  | "refinementFilterCommitMs"
  | "refinementFilterPaintMs"
  | "refinementFilterMainThreadTaskMs"
  | "refinementColumnFilterCommitMs"
  | "refinementColumnFilterPaintMs"
  | "refinementColumnFilterMainThreadTaskMs"
  | "refinementSortCommitMs"
  | "refinementSortPaintMs"
  | "refinementSortMainThreadTaskMs"
  | "refinementFilterSwapCommitMs"
  | "refinementFilterSwapPaintMs"
  | "refinementFilterSwapMainThreadTaskMs"
  | "refinementColumnFilterSwapCommitMs"
  | "refinementColumnFilterSwapPaintMs"
  | "refinementColumnFilterSwapMainThreadTaskMs"
  | "refinementSortFlipCommitMs"
  | "refinementSortFlipPaintMs"
  | "refinementSortFlipMainThreadTaskMs"
  | "refinementClearCommitMs"
  | "refinementClearPaintMs"
  | "refinementClearMainThreadTaskMs"
  | "refinementTotalCommitMs"
  | "refinementTotalPaintMs"
  | "refinementTotalMainThreadTaskMs"
  | "columnHideCommitMs"
  | "columnHidePaintMs"
  | "columnHideMainThreadTaskMs"
  | "columnRestoreCommitMs"
  | "columnRestorePaintMs"
  | "columnRestoreMainThreadTaskMs"
  | "columnVisibilityTotalCommitMs"
  | "columnVisibilityTotalPaintMs"
  | "columnVisibilityTotalMainThreadTaskMs"
  | "columnResizeCommitMs"
  | "columnResizePaintMs"
  | "columnResizeMainThreadTaskMs"
  | "columnSizeRestoreCommitMs"
  | "columnSizeRestorePaintMs"
  | "columnSizeRestoreMainThreadTaskMs"
  | "columnSizingTotalCommitMs"
  | "columnSizingTotalPaintMs"
  | "columnSizingTotalMainThreadTaskMs"
  | "columnMoveCommitMs"
  | "columnMovePaintMs"
  | "columnMoveMainThreadTaskMs"
  | "columnOrderRestoreCommitMs"
  | "columnOrderRestorePaintMs"
  | "columnOrderRestoreMainThreadTaskMs"
  | "columnOrderingTotalCommitMs"
  | "columnOrderingTotalPaintMs"
  | "columnOrderingTotalMainThreadTaskMs"
  | "columnPinCommitMs"
  | "columnPinPaintMs"
  | "columnPinMainThreadTaskMs"
  | "columnUnpinCommitMs"
  | "columnUnpinPaintMs"
  | "columnUnpinMainThreadTaskMs"
  | "columnPinningTotalCommitMs"
  | "columnPinningTotalPaintMs"
  | "columnPinningTotalMainThreadTaskMs"
  | "layoutWorkflowTotalCommitMs"
  | "layoutWorkflowTotalPaintMs"
  | "layoutWorkflowTotalMainThreadTaskMs"
  | "rowSelectCommitMs"
  | "rowSelectPaintMs"
  | "rowSelectMainThreadTaskMs"
  | "rowDeselectCommitMs"
  | "rowDeselectPaintMs"
  | "rowDeselectMainThreadTaskMs"
  | "rowSelectionTotalCommitMs"
  | "rowSelectionTotalPaintMs"
  | "rowSelectionTotalMainThreadTaskMs"
  | "allRowsSelectCommitMs"
  | "allRowsSelectPaintMs"
  | "allRowsSelectMainThreadTaskMs"
  | "allRowsDeselectCommitMs"
  | "allRowsDeselectPaintMs"
  | "allRowsDeselectMainThreadTaskMs"
  | "allRowsSelectionTotalCommitMs"
  | "allRowsSelectionTotalPaintMs"
  | "allRowsSelectionTotalMainThreadTaskMs"
  | "multiSortApplyCommitMs"
  | "multiSortApplyPaintMs"
  | "multiSortApplyMainThreadTaskMs"
  | "multiSortClearCommitMs"
  | "multiSortClearPaintMs"
  | "multiSortClearMainThreadTaskMs"
  | "multiSortTotalCommitMs"
  | "multiSortTotalPaintMs"
  | "multiSortTotalMainThreadTaskMs"
  | "multiFilterApplyCommitMs"
  | "multiFilterApplyPaintMs"
  | "multiFilterApplyMainThreadTaskMs"
  | "multiFilterClearCommitMs"
  | "multiFilterClearPaintMs"
  | "multiFilterClearMainThreadTaskMs"
  | "multiFilterTotalCommitMs"
  | "multiFilterTotalPaintMs"
  | "multiFilterTotalMainThreadTaskMs"
  | "deepScrollCommitMs"
  | "deepScrollPaintMs"
  | "deepScrollDispatchMs"
  | "deepScrollEventCommitMs"
  | "deepScrollEventPaintMs"
  | "deepScrollMainThreadTaskMs"
  | "jsHeapUsedBytes"
  | "domElementCount"
  | "domNodeCount"
  | "transferredBytes"
  | "decodedBodyBytes"
  | "longTaskCount"
  | "longTaskDurationMs"
  | "mountedRowCount"
  | "mountedCellCount";

export interface BenchmarkRunMetrics extends Record<BenchmarkMetricId, number> {}

export interface BenchmarkRunResult {
  index: number;
  warmup: boolean;
  datasetFingerprint: string;
  measurementPreparation: {
    actionTiming: "post-frame-isolated-gc";
    heap: "separate-browser-post-workload-forced-gc";
  };
  metrics: BenchmarkRunMetrics;
  completionSources: Record<"sort" | "sortFlip" | "clearSort" | "filter" | "clearFilter" | "columnFilter" | "clearColumnFilter" | "workflowFilter" | "workflowColumnFilter" | "workflowSort" | "workflowClear" | "refinementFilter" | "refinementColumnFilter" | "refinementSort" | "refinementFilterSwap" | "refinementColumnFilterSwap" | "refinementSortFlip" | "refinementClear" | "columnHide" | "columnRestore" | "columnResize" | "columnSizeRestore" | "columnMove" | "columnOrderRestore" | "columnPin" | "columnUnpin" | "layoutWorkflowMove" | "layoutWorkflowResize" | "layoutWorkflowPin" | "layoutWorkflowHide" | "layoutWorkflowShow" | "layoutWorkflowUnpin" | "layoutWorkflowSizeRestore" | "layoutWorkflowOrderRestore" | "rowSelect" | "rowDeselect" | "allRowsSelect" | "allRowsDeselect" | "multiSortApply" | "multiSortClear" | "multiFilterApply" | "multiFilterClear" | "deepScroll", "synchronous" | "mutation" | "frame">;
  interactionSources: { sort: "click"; sortFlip: "click"; clearSort: "click"; filter: "input"; clearFilter: "click"; columnFilter: "input"; clearColumnFilter: "click"; workflowFilter: "input"; workflowColumnFilter: "input"; workflowSort: "click"; workflowClear: "click"; refinementFilter: "input"; refinementColumnFilter: "input"; refinementSort: "click"; refinementFilterSwap: "input"; refinementColumnFilterSwap: "input"; refinementSortFlip: "click"; refinementClear: "click"; columnHide: "click"; columnRestore: "click"; columnResize: "click"; columnSizeRestore: "click"; columnMove: "click"; columnOrderRestore: "click"; columnPin: "click"; columnUnpin: "click"; layoutWorkflowMove: "click"; layoutWorkflowResize: "click"; layoutWorkflowPin: "click"; layoutWorkflowHide: "click"; layoutWorkflowShow: "click"; layoutWorkflowUnpin: "click"; layoutWorkflowSizeRestore: "click"; layoutWorkflowOrderRestore: "click"; rowSelect: "click"; rowDeselect: "click"; allRowsSelect: "click"; allRowsDeselect: "click"; multiSortApply: "click"; multiSortClear: "click"; multiFilterApply: "click"; multiFilterClear: "click"; deepScroll: "scroll" };
  presentationSources: { sort: { source: "event-timing"; eventType: "click"; interactionId: number; durationThresholdMs: 16 } };
  interactionPhase: "post-animation-frame";
  workflowSnapshots: Record<"filter" | "columnFilter" | "sort" | "clear", Record<string, unknown>>;
  refinementSnapshots: Record<"filter" | "columnFilter" | "sort" | "filterSwap" | "columnFilterSwap" | "sortFlip" | "clear", Record<string, unknown>>;
  columnVisibilitySnapshots: Record<"hidden" | "restored", Record<string, unknown>>;
  columnSizingSnapshots: Record<"resized" | "restored", Record<string, unknown>>;
  columnOrderingSnapshots: Record<"moved" | "restored", Record<string, unknown>>;
  columnPinningSnapshots: Record<"pinned" | "unpinned", Record<string, unknown>>;
  layoutWorkflowMeasurements: Record<"move" | "resize" | "pin" | "hide" | "show" | "unpin" | "sizeRestore" | "orderRestore", {
    commitMs: number;
    paintMs: number;
    mainThreadTaskMs: number;
    completionSource: "synchronous" | "mutation" | "frame";
    eventType: "click";
  }>;
  layoutWorkflowSnapshots: Record<"moved" | "resized" | "pinned" | "hidden" | "shown" | "unpinned" | "sizeRestored" | "orderRestored", Record<string, unknown>>;
  rowSelectionSnapshots: Record<"selected" | "deselected", Record<string, unknown>>;
  allRowsSelectionSnapshots: Record<"selected" | "deselected", Record<string, unknown>>;
  multiSortSnapshots: Record<"applied" | "cleared", Record<string, unknown>>;
  multiFilterSnapshots: Record<"applied" | "cleared", Record<string, unknown>>;
  snapshot: Record<string, unknown>;
}

export interface BenchmarkMetricSummary {
  median: number;
  p95: number;
  min: number;
  max: number;
}

export interface BenchmarkImplementationResult {
  id: string;
  version: string;
  url: string;
  runs: BenchmarkRunResult[];
  summary: Record<BenchmarkMetricId, BenchmarkMetricSummary>;
}

export const BENCHMARK_RESULT_SCHEMA_VERSION: 29;
export const BENCHMARK_MEASUREMENT_PREPARATION: Readonly<BenchmarkRunResult["measurementPreparation"]>;
export const BENCHMARK_METRICS: Readonly<Record<BenchmarkMetricId, { label: string; unit: "ms" | "bytes" | "count"; lowerIsBetter: true }>>;

export function summarizeBenchmarkRuns(runs: BenchmarkRunResult[]): Record<BenchmarkMetricId, BenchmarkMetricSummary>;
export function formatBenchmarkMarkdown(result: Record<string, unknown> & { implementations: BenchmarkImplementationResult[] }): string;
