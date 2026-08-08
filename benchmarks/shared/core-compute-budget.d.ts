export const CORE_COMPUTE_BUDGET_SCHEMA_VERSION: 1;

export interface CoreComputeBudgetCheck {
  id: string;
  workloadId: string;
  statistic: "median" | "p95";
  baselineValue: number;
  candidateValue: number;
  rowScale: number;
  scaleRatio: number;
  normalizedRatio: number;
  maximum: number;
  passed: boolean;
}

export interface CoreComputeBudgetResult {
  schemaVersion: 1;
  passed: boolean;
  checks: CoreComputeBudgetCheck[];
  failures: CoreComputeBudgetCheck[];
}

export function evaluateCoreComputeBudgets(config: unknown, result: unknown): CoreComputeBudgetResult;
export function validateCoreComputeBudgetConfig(config: unknown): void;
export function formatCoreComputeBudgetMarkdown(result: CoreComputeBudgetResult): string;
