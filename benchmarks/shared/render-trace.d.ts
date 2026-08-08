export const BENCHMARK_RENDER_TRACE_SCHEMA_VERSION: 5;

export interface BenchmarkRenderTracePhase {
  eventName: string;
  count: number;
  totalMs: number;
  perIterationMs: number;
  maxMs: number;
}

export interface BenchmarkRenderTraceSummary {
  javascript: BenchmarkRenderTracePhase;
  style: BenchmarkRenderTracePhase;
  layout: BenchmarkRenderTracePhase;
  paint: BenchmarkRenderTracePhase;
  prePaint: BenchmarkRenderTracePhase;
  layerize: BenchmarkRenderTracePhase;
}

export interface BenchmarkMainThreadTraceSummary {
  thread: { pid: number; tid: number; name: string };
  tasks: BenchmarkRenderTracePhase;
  taskSelfMs: number;
  taskSelfPerIterationMs: number;
  lifecycleUnionMs: number;
  lifecycleUnionPerIterationMs: number;
  outsideLifecycleMs: number;
  outsideLifecyclePerIterationMs: number;
  topSelfEvents: Array<{
    eventName: string;
    count: number;
    totalMs: number;
    perIterationMs: number;
  }>;
}

export interface BenchmarkTaskTimingSummary {
  actionCount: number;
  actionTotalMs: number;
  actionPerIterationMs: number;
  actionMedianMs: number;
  actionP95Ms: number;
  captureTotalMs: number;
  outsideActionsMs: number;
  outsideActionsPerIterationMs: number;
  groups: Array<{
    id: string;
    count: number;
    totalMs: number;
    perActionMs: number;
    medianMs: number;
    p95Ms: number;
  }>;
}

export interface BenchmarkPerformanceTimingSummary {
  actionCount: number;
  metrics: Record<"task" | "script" | "style" | "layout" | "taskOther" | "v8Compile", {
    totalMs: number;
    perActionMs: number;
    medianMs: number;
    p95Ms: number;
  }>;
  groups: Array<{
    id: string;
    count: number;
    metrics: BenchmarkPerformanceTimingSummary["metrics"];
  }>;
}

export interface BenchmarkRenderTraceResult {
  schemaVersion: 5;
  createdAt: string;
  status: "diagnostic";
  config: {
    profileId: string;
    action: string;
    trigger: "driver" | "trusted";
    preparation: "none" | "timing-prefix" | "timing-action-prefix";
    capture: "trace" | "counters";
    viewport: { width: number; height: number };
    targetOrder: string[];
    warmups: number;
    iterations: number;
  };
  environment: {
    browser: string;
    sourceFingerprint: string;
  };
  implementations: Array<{
    id: string;
    datasetFingerprint: string;
    finalSnapshot: {
      visibleColumnCount: number;
      columnOrderIds: string[];
      columnSize: {
        columnId: string;
        size: number;
      };
      selectedRowCount: number;
    };
    phases: BenchmarkRenderTraceSummary | null;
    mainThread: BenchmarkMainThreadTraceSummary | null;
    taskTiming?: BenchmarkTaskTimingSummary;
    performanceTiming: BenchmarkPerformanceTimingSummary;
  }>;
}

export function summarizeBenchmarkRenderTrace(events: unknown[], iterations: number): BenchmarkRenderTraceSummary;
export function summarizeBenchmarkMainThreadTrace(events: unknown[], iterations: number, topGroupLimit?: number): BenchmarkMainThreadTraceSummary;
export function summarizeBenchmarkTaskTiming(actionTaskDurationsMs: number[], captureTaskDurationMs: number, iterations: number, actionLabels?: string[]): BenchmarkTaskTimingSummary;
export function summarizeBenchmarkPerformanceTiming(actionDurations: Array<Record<"task" | "script" | "style" | "layout" | "taskOther" | "v8Compile", number>>, iterations: number, actionLabels?: string[]): BenchmarkPerformanceTimingSummary;
export function createBenchmarkRenderTraceAction(action: string, index: number, deepScrollTop?: number, columnCount?: number): Record<string, unknown>;
export function createBenchmarkTimingActionPrefix(action: string, columnCount: number): Array<{
  action: Record<string, unknown>;
  replaceExisting?: boolean;
}>;
export function formatBenchmarkRenderTraceMarkdown(result: BenchmarkRenderTraceResult): string;
