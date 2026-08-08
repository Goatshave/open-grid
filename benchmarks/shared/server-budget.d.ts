export const SERVER_BENCHMARK_BUDGET_SCHEMA_VERSION: 1;

export interface ServerBenchmarkBudgetCheck {
  id: string;
  kind: "timing" | "resource";
  metric: string;
  statistic: "median" | "p95";
  basis: "total" | "client-overhead" | "absolute";
  value: number;
  maximum: number;
  passed: boolean;
}

export interface ServerBenchmarkBudgetResult {
  schemaVersion: 1;
  passed: boolean;
  checks: ServerBenchmarkBudgetCheck[];
  failures: ServerBenchmarkBudgetCheck[];
}

export function evaluateServerBenchmarkBudgets(config: unknown, result: unknown): ServerBenchmarkBudgetResult;
export function validateServerBenchmarkBudgetConfig(config: unknown): void;
export function formatServerBenchmarkBudgetMarkdown(result: ServerBenchmarkBudgetResult): string;
