export const SERVER_BENCHMARK_RESULT_SCHEMA_VERSION: 1;
export const SERVER_BENCHMARK_METRICS: Readonly<Record<string, Readonly<{ label: string; roundTrips: number }>>>;

export interface ServerMetricSummary {
  median: number;
  p95: number;
  min: number;
  max: number;
  transportMs: number;
  medianClientOverheadMs: number;
}

export function summarizeServerBenchmarkRuns(
  runs: readonly { metrics: Record<string, number> }[],
  configuredDelayMs: number,
): Record<string, ServerMetricSummary>;
export function formatServerBenchmarkMarkdown(result: any): string;
