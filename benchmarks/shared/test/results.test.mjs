import assert from "node:assert/strict";
import test from "node:test";

import { BENCHMARK_METRICS, formatBenchmarkMarkdown, summarizeBenchmarkRuns } from "../results.mjs";

test("summarizes recorded runs without including warm-ups", () => {
  const runs = [
    createRun(0, true, 999),
    createRun(1, false, 10),
    createRun(2, false, 30),
    createRun(3, false, 20),
  ];
  const summary = summarizeBenchmarkRuns(runs);
  assert.deepEqual(summary.initialReadyMs, { median: 20, p95: 30, min: 10, max: 30 });
  assert.deepEqual(summary.mountedRowCount, { median: 20, p95: 30, min: 10, max: 30 });
});

test("rejects missing recorded runs and malformed metrics", () => {
  assert.throws(() => summarizeBenchmarkRuns([createRun(0, true, 1)]), /recorded benchmark run/);
  const malformed = createRun(0, false, 1);
  malformed.metrics.filterPaintMs = Number.NaN;
  assert.throws(() => summarizeBenchmarkRuns([malformed]), /filterPaintMs/);
});

test("formats an observational markdown summary", () => {
  const implementation = {
    id: "open-grid",
    version: "0.1.0",
    url: "http://127.0.0.1:4301",
    runs: [createRun(0, false, 10)],
    summary: summarizeBenchmarkRuns([createRun(0, false, 10)]),
  };
  const markdown = formatBenchmarkMarkdown({
    createdAt: "2026-07-21T00:00:00.000Z",
    config: { suite: "comparison", profileId: "standard-client", runs: 1, warmups: 0 },
    datasetFingerprint: "fixture-123",
    environment: { browser: "Chromium", platform: "test", gitRevision: "abc", gitDirty: false },
    implementations: [implementation],
  });
  assert.match(markdown, /observational baseline; not a parity or leadership claim/);
  assert.match(markdown, /Suite: comparison/);
  assert.match(markdown, /Initial ready \| 10\.00 ms \/ 10\.00 ms/);
});

function createRun(index, warmup, value) {
  return {
    index,
    warmup,
    datasetFingerprint: "fixture-123",
    metrics: Object.fromEntries(Object.keys(BENCHMARK_METRICS).map((metricId) => [metricId, value])),
    snapshot: {},
  };
}
