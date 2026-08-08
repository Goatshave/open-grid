export const CORE_COMPUTE_RESULT_SCHEMA_VERSION = 5;

export const CORE_COMPUTE_WORKLOAD_IDS = Object.freeze([
  "initial-row-model",
  "numeric-sort",
  "numeric-sort-flip",
  "global-filter",
  "column-filter",
]);

export function summarizeCoreComputeDurations(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("core compute durations must be a non-empty array");
  }
  const sorted = values.map((value) => {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError("core compute durations must be non-negative finite numbers");
    }
    return value;
  }).sort((left, right) => left - right);
  return {
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0],
    max: sorted.at(-1),
  };
}

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}
