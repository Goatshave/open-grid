export interface BundleBudgetLimits {
  javascriptGzipBytes?: number;
  stylesheetGzipBytes?: number;
  totalGzipBytes?: number;
}

export interface BundleBudgetApplication {
  id: string;
  distDirectory: string;
  enforcement?: "required" | "diagnostic";
  includeExtensions?: string[];
  limits?: BundleBudgetLimits;
}

export type BundleBudgetMetric = keyof BundleBudgetLimits;

export interface BundleBudgetComparison {
  candidateId: string;
  baselineId: string;
  metric: BundleBudgetMetric;
  maxDeltaBytes: number;
  enforcement?: "required" | "diagnostic";
}

export interface BundleBudgetConfig {
  schemaVersion: 2;
  applications: BundleBudgetApplication[];
  comparisons?: BundleBudgetComparison[];
}

export interface BundleBudgetMeasurement {
  id: string;
  enforcement: "required" | "diagnostic";
  fileCount: number;
  javascriptGzipBytes: number;
  stylesheetGzipBytes: number;
  totalGzipBytes: number;
}

export interface BundleBudgetCheck {
  id: string;
  type: "absolute" | "relative";
  applicationId: string;
  baselineId?: string;
  metric: BundleBudgetMetric;
  enforcement: "required" | "diagnostic";
  actualBytes: number;
  baselineBytes?: number;
  maxDeltaBytes?: number;
  maximumBytes: number;
  passed: boolean;
}

export interface BundleBudgetResult {
  schemaVersion: 2;
  passed: boolean;
  measurements: BundleBudgetMeasurement[];
  checks: BundleBudgetCheck[];
  failures: BundleBudgetCheck[];
  diagnostics: BundleBudgetCheck[];
}

export declare const BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION: 2;
export declare function measureBundleBudgets(config: BundleBudgetConfig, rootDirectory: string): BundleBudgetResult;
export declare function validateBundleBudgetConfig(config: BundleBudgetConfig): void;
export declare function formatBundleBudgetMarkdown(result: BundleBudgetResult): string;
