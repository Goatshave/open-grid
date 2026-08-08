export const CORE_COMPUTE_RESULT_SCHEMA_VERSION: 5;
export const CORE_COMPUTE_WORKLOAD_IDS: readonly [
  "initial-row-model",
  "numeric-sort",
  "numeric-sort-flip",
  "global-filter",
  "column-filter",
];

export interface CoreComputeSummary {
  median: number;
  p95: number;
  min: number;
  max: number;
}

export function summarizeCoreComputeDurations(values: number[]): CoreComputeSummary;
