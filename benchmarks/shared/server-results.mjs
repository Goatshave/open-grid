export const SERVER_BENCHMARK_RESULT_SCHEMA_VERSION = 1;

export const SERVER_BENCHMARK_METRICS = Object.freeze({
  initialReadyMs: metric("Initial ready", 1),
  pageMs: metric("Page query to paint", 1),
  sortMs: metric("Sort query to paint", 1),
  filterMs: metric("Filter query to paint", 1),
  cancelMs: metric("Latest-wins cancellation to paint", 1),
  groupMs: metric("Server grouping to paint", 1),
  treeMs: metric("Tree root + children to paint", 2),
  patchMs: metric("Incremental patch to paint", 1),
});

export function summarizeServerBenchmarkRuns(runs, configuredDelayMs) {
  if (!Array.isArray(runs) || runs.length === 0) throw new RangeError("at least one server benchmark run is required");
  if (!Number.isFinite(configuredDelayMs) || configuredDelayMs < 0) throw new RangeError("configured server delay must be non-negative");
  return Object.fromEntries(Object.entries(SERVER_BENCHMARK_METRICS).map(([id, definition]) => {
    const values = runs.map((run) => {
      const value = run.metrics?.[id];
      if (!Number.isFinite(value) || value < 0) throw new TypeError(`${id} must be a non-negative finite number`);
      return value;
    }).sort((left, right) => left - right);
    const median = percentile(values, 0.5);
    const p95 = percentile(values, 0.95);
    const transportMs = definition.roundTrips * configuredDelayMs;
    return [id, {
      median,
      p95,
      min: values[0],
      max: values.at(-1),
      transportMs,
      medianClientOverheadMs: Math.max(0, median - transportMs),
    }];
  }));
}

export function formatServerBenchmarkMarkdown(result) {
  const lines = [
    "# Open Grid Controlled Server Benchmark",
    "",
    `- Created: ${result.createdAt}`,
    `- Profile: ${result.config.profileId}`,
    `- Recorded runs: ${result.config.runs}`,
    `- Deterministic transport delay: ${result.config.delayMs.toFixed(2)} ms per request`,
    `- Browser: ${result.environment.browser}`,
    `- Platform: ${result.environment.platform}`,
    `- Revision: ${result.environment.gitRevision}${result.environment.gitDirty ? " (dirty)" : ""}`,
    "- Status: observational server regression baseline; not a cross-product claim",
    "",
    "| Workload | median / p95 | transport floor | median client overhead |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const [id, definition] of Object.entries(SERVER_BENCHMARK_METRICS)) {
    const summary = result.summary[id];
    lines.push(`| ${definition.label} | ${formatMs(summary.median)} / ${formatMs(summary.p95)} | ${formatMs(summary.transportMs)} | ${formatMs(summary.medianClientOverheadMs)} |`);
  }
  lines.push(
    "",
    `Final transport totals per run: ${result.validation.completed} completed, ${result.validation.aborted} aborted, ${result.validation.staleResponses} stale responses, ${result.validation.inFlight} in flight.`,
    "",
    "Raw per-run action snapshots and environment metadata are available in the adjacent JSON artifact.",
    "",
  );
  return lines.join("\n");
}

function metric(label, roundTrips) {
  return Object.freeze({ label, roundTrips });
}

function percentile(sortedValues, quantile) {
  return sortedValues[Math.max(0, Math.ceil(sortedValues.length * quantile) - 1)];
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}
