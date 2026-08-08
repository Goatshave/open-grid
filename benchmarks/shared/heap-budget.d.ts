export type HeapBudgetMetric = "selfSizeBytes" | "nodeCount" | "jsHeapUsedBytes";

export interface HeapBudgetLimits {
  selfSizeBytes: number;
  nodeCount: number;
  jsHeapUsedBytes: number;
}

export interface HeapBudgetImplementation {
  id: string;
  limits: HeapBudgetLimits;
}

export interface HeapBudgetComparison {
  candidateId: string;
  baselineId: string;
  metric: HeapBudgetMetric;
  maxDelta: number;
}

export interface HeapBudgetConfig {
  schemaVersion: 1;
  profileId: string;
  phase: "initial-ready" | "settled-workload";
  implementations: HeapBudgetImplementation[];
  comparisons?: HeapBudgetComparison[];
}

export interface HeapBudgetMeasurement {
  id: string;
  selfSizeBytes: number;
  nodeCount: number;
  jsHeapUsedBytes: number;
}

export interface HeapBudgetCheck {
  id: string;
  type: "absolute" | "relative";
  applicationId: string;
  baselineId?: string;
  metric: HeapBudgetMetric;
  actual: number;
  baseline?: number;
  maxDelta?: number;
  maximum: number;
  passed: boolean;
}

export interface HeapBudgetResult {
  schemaVersion: 1;
  profileId: string;
  phase: "initial-ready" | "settled-workload";
  passed: boolean;
  measurements: HeapBudgetMeasurement[];
  checks: HeapBudgetCheck[];
  failures: HeapBudgetCheck[];
}

export declare const BENCHMARK_HEAP_BUDGET_SCHEMA_VERSION: 1;
export declare function evaluateHeapBudgets(config: HeapBudgetConfig, profileResult: Record<string, unknown>): HeapBudgetResult;
export declare function validateHeapBudgetConfig(config: HeapBudgetConfig): void;
export declare function formatHeapBudgetMarkdown(result: HeapBudgetResult): string;
