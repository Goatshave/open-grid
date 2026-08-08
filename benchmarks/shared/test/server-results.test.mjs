import assert from "node:assert/strict";
import test from "node:test";
import { formatServerBenchmarkMarkdown, SERVER_BENCHMARK_METRICS, summarizeServerBenchmarkRuns } from "../server-results.mjs";

const metrics = (base) => Object.fromEntries(Object.keys(SERVER_BENCHMARK_METRICS).map((id, index) => [id, base + index * 10]));

test("summarizes server timings and separates deterministic transport latency", () => {
  const summary = summarizeServerBenchmarkRuns([{ metrics: metrics(45) }, { metrics: metrics(50) }, { metrics: metrics(60) }], 40);
  assert.deepEqual(summary.pageMs, { median: 60, p95: 70, min: 55, max: 70, transportMs: 40, medianClientOverheadMs: 20 });
  assert.equal(summary.treeMs.transportMs, 80);
  assert.equal(summary.treeMs.medianClientOverheadMs, 30);
  assert.equal(summary.initialReadyMs.transportMs, 40);
  assert.equal(summary.initialReadyMs.medianClientOverheadMs, 10);
});

test("formats server result validation and observational status", () => {
  const summary = summarizeServerBenchmarkRuns([{ metrics: metrics(45) }], 40);
  const markdown = formatServerBenchmarkMarkdown({
    createdAt: "2026-07-21T00:00:00.000Z",
    config: { profileId: "standard-client", runs: 1, delayMs: 40 },
    environment: { browser: "Chromium", platform: "test", gitRevision: "abc", gitDirty: true },
    summary,
    validation: { completed: 8, aborted: 1, staleResponses: 0, inFlight: 0 },
  });
  assert.match(markdown, /Controlled Server Benchmark/);
  assert.match(markdown, /transport delay: 40\.00 ms/);
  assert.match(markdown, /8 completed, 1 aborted, 0 stale/);
  assert.match(markdown, /not a cross-product claim/);
});

test("rejects empty runs, invalid delay, and malformed metrics", () => {
  assert.throws(() => summarizeServerBenchmarkRuns([], 40), /at least one/);
  assert.throws(() => summarizeServerBenchmarkRuns([{ metrics: metrics(45) }], -1), /delay/);
  assert.throws(() => summarizeServerBenchmarkRuns([{ metrics: { ...metrics(45), pageMs: Number.NaN } }], 40), /pageMs/);
});
