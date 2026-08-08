import type { BenchmarkProfile } from "./index.mjs";

export interface BenchmarkPageConfig {
  profile: BenchmarkProfile;
  seed: number;
}

export interface BenchmarkInitializationTiming {
  moduleStartMs: number;
  datasetGenerationMs: number;
  datasetFingerprintMs: number;
  appSetupMs: number;
  readinessFramesMs: number;
  instrumentedReadyMs: number;
}

export interface BenchmarkInitializationMetrics {
  initialPreModuleMs: number;
  initialDatasetGenerationMs: number;
  initialDatasetFingerprintMs: number;
  initialAppSetupMs: number;
  initialReadinessFramesMs: number;
  initialInstrumentedReadyMs: number;
  initialObservationDelayMs: number;
}

export interface BenchmarkInitializationTracker {
  markDatasetReady(): void;
  markFingerprintReady(): void;
  markDriverInstalled(): void;
  markReady(): BenchmarkInitializationTiming;
}

export interface BenchmarkSnapshot {
  implementation: string;
  profileId: BenchmarkProfile["id"];
  rowCount: number;
  columnCount: number;
  visibleColumnCount: number;
  visibleColumnIds: string[];
  columnSize: { columnId: "column_10"; size: number };
  columnOrderIds: string[];
  columnPinning: { left: string[]; right: string[] };
  selectedRowIds: string[];
  selectedRowCount: number;
  allRowsSelected: boolean;
  displayedRowCount: number;
  mountedRowCount: number;
  mountedCellCount: number;
  firstMountedRowId: string | null;
  mountedRowSignature: string;
  sort: { columnId: string; direction: "asc" | "desc" } | null;
  sorting: BenchmarkSortRule[];
  filter: string;
  columnFilter: { columnId: string; value: string } | null;
  columnFilters: BenchmarkFilterRule[];
  scrollTop: number;
  scrollLeft: number;
}

export interface BenchmarkSnapshotRequirements {
  sorting: boolean;
  filtering: boolean;
  visibleColumns: boolean;
  columnSize: boolean;
  columnOrder: boolean;
  columnPinning: boolean;
  selection: boolean;
  displayedRows: boolean;
  renderedRows: boolean;
  mountedCells: boolean;
  scrollPosition: boolean;
}

export interface BenchmarkSortRule {
  columnId: string;
  direction: "asc" | "desc";
}

export interface BenchmarkFilterRule {
  columnId: string;
  value: string;
}

export type BenchmarkAction =
  | { type: "sort"; columnId: string; direction: "asc" | "desc" }
  | { type: "multiSort"; rules: BenchmarkSortRule[] }
  | { type: "filter"; value: string }
  | { type: "columnFilter"; columnId: "column_2"; value: string }
  | { type: "multiFilter"; rules: BenchmarkFilterRule[] }
  | { type: "columnVisibility"; columnId: "column_10"; visible: boolean }
  | { type: "columnSizing"; columnId: "column_10"; size: 120 | 200 }
  | { type: "columnOrdering"; columnIds: string[] }
  | { type: "columnPinning"; columnId: "column_10"; pinned: boolean }
  | { type: "rowSelection"; rowId: "row_0"; selected: boolean }
  | { type: "allRowSelection"; selected: boolean }
  | { type: "clear" }
  | { type: "scroll"; top: number; left: number };

export interface BenchmarkTiming {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  performance: Pick<Performance, "now">;
  document?: Pick<Document, "documentElement">;
}

export interface BenchmarkActionMeasurement {
  commitMs: number;
  paintMs: number;
  completionSource: "synchronous" | "mutation" | "frame";
  scrollEventTiming?: {
    dispatchMs: number;
    commitMs: number;
    paintMs: number;
  };
  eventType?: "click" | "input";
  presentationTiming?: BenchmarkEventPresentationTiming;
}

export interface BenchmarkEventPresentationTiming {
  durationMs: number;
  inputDelayMs: number;
  processingDurationMs: number;
  presentationDelayMs: number;
  interactionId: number;
  source: "event-timing";
}

export interface BenchmarkMeasurementOptions {
  timing?: BenchmarkTiming;
  isComplete?: () => boolean;
  frameLimit?: number;
  createMutationObserver?: ((callback: MutationCallback) => Pick<MutationObserver, "observe" | "disconnect">) | null;
  observationTarget?: Node | null;
}

export interface BenchmarkScrollMeasurementOptions extends BenchmarkMeasurementOptions {
  scrollElement: Element;
}

export interface BenchmarkDriver {
  version: 15;
  implementation: "open-grid" | "open-grid-react-full" | "open-grid-vue" | "open-grid-svelte";
  profileId: BenchmarkProfile["id"];
  datasetFingerprint: string;
  ready: boolean;
  initialization: BenchmarkInitializationTiming | null;
  setQuickFilter(value: string): void;
  setColumnFilter(columnId: "column_2", value: string): void;
  setColumnFilters(rules: BenchmarkFilterRule[]): void;
  setColumnVisible(columnId: "column_10", visible: boolean): void;
  setColumnSize(columnId: "column_10", size: 120 | 200): void;
  setColumnOrder(columnIds: string[]): void;
  setColumnPinned(columnId: "column_10", pinned: boolean): void;
  setRowSelected(rowId: "row_0", selected: boolean): void;
  setAllRowsSelected(selected: boolean): void;
  setSort(columnId: string, direction: "asc" | "desc"): void;
  setSorting(rules: BenchmarkSortRule[]): void;
  clearState(): void;
  scrollTo(top: number, left: number): void;
  getScrollElement?(): Element | null;
  getSnapshot(): BenchmarkSnapshot;
  getActionSnapshot?(action: BenchmarkAction): BenchmarkSnapshot;
  measureAction(action: BenchmarkAction): Promise<number>;
  measureActionDetails(action: BenchmarkAction): Promise<BenchmarkActionMeasurement>;
}

export interface BenchmarkDriverOptions extends Omit<BenchmarkDriver, "version" | "ready" | "initialization" | "measureAction" | "measureActionDetails"> {
  initializationTracker: BenchmarkInitializationTracker;
}

export function getBenchmarkSnapshotRequirements(action?: BenchmarkAction): BenchmarkSnapshotRequirements;

export const BENCHMARK_DEEP_SCROLL_TOP: 120000;
export interface BenchmarkMainThreadDurations {
  task: number;
  script: number;
  style: number;
  layout: number;
  taskOther: number;
  v8Compile: number;
}
export function readBenchmarkMainThreadTaskMs(protocolMetrics: { metrics: Array<{ name: string; value: number }> }): number;
export function readBenchmarkMainThreadDurationsMs(protocolMetrics: { metrics: Array<{ name: string; value: number }> }): BenchmarkMainThreadDurations;
export function getBenchmarkMainThreadTaskDeltaMs(startMs: number, endMs: number): number;
export function getBenchmarkMainThreadDurationDeltasMs(start: BenchmarkMainThreadDurations, end: BenchmarkMainThreadDurations): BenchmarkMainThreadDurations;
export function getBenchmarkDeepScrollMinimum(rowCount: number, rowHeight?: number, viewportHeight?: number): number;
export function measureFrameAlignedAction(run: (startedAt: number) => void, options?: BenchmarkMeasurementOptions): Promise<number>;
export function measureFrameAlignedActionDetails(run: (startedAt: number) => void, options?: BenchmarkMeasurementOptions): Promise<BenchmarkActionMeasurement>;
export function measureFrameAlignedScrollActionDetails(run: () => void, options: BenchmarkScrollMeasurementOptions): Promise<BenchmarkActionMeasurement>;
export function prepareBenchmarkEventActionMeasurement(options: { action: Exclude<BenchmarkAction, { type: "scroll" }>; selector: string; eventType: "click" | "input"; frameLimit?: number; captureEventTiming?: boolean }): void;
export function readBenchmarkEventActionMeasurement(): Promise<BenchmarkActionMeasurement>;
export function readBenchmarkEventPresentationTiming(entry: Pick<PerformanceEventTiming, "name" | "startTime" | "duration" | "processingStart" | "processingEnd" | "interactionId">, eventType: string, eventStartTime: number): BenchmarkEventPresentationTiming | null;
export function isBenchmarkActionComplete(before: BenchmarkSnapshot, after: BenchmarkSnapshot, action: BenchmarkAction): boolean;
export function readBenchmarkPageConfig(search?: string): BenchmarkPageConfig;
export function createBenchmarkInitializationTracker(timing?: Pick<Performance, "now">): BenchmarkInitializationTracker;
export function readBenchmarkInitializationMetrics(initialization: BenchmarkInitializationTiming, observedReadyMs: number): BenchmarkInitializationMetrics;
export function toggleBenchmarkSort(columnId: string): void;
export function installBenchmarkDriver(options: BenchmarkDriverOptions): () => void;

declare global {
  interface Window {
    __OPEN_GRID_BENCHMARK__?: BenchmarkDriver;
    __OPEN_GRID_EVENT_MEASUREMENT__?: Promise<BenchmarkActionMeasurement>;
  }
}
