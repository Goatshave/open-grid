import assert from "node:assert/strict";
import test from "node:test";

import { createBenchmarkMatrix, formatBenchmarkMatrixMarkdown } from "../matrix.mjs";
import { BENCHMARK_METRICS, BENCHMARK_RESULT_SCHEMA_VERSION } from "../results.mjs";

test("combines comparable profile results into one matrix", () => {
  const matrix = createBenchmarkMatrix([createResult("small-interactive", 10), createResult("standard-client", 20)]);

  assert.deepEqual(matrix.config.profileIds, ["small-interactive", "standard-client"]);
  assert.equal(matrix.config.suite, "comparison");
  assert.equal(matrix.profiles.length, 2);
  assert.match(formatBenchmarkMatrixMarkdown(matrix), /observational matrix; not a parity or leadership claim/);
  assert.match(formatBenchmarkMatrixMarkdown(matrix), /\| standard-client \| 20\.00 ms \/ 20\.00 ms \| 20\.00 ms \/ 20\.00 ms \|/);
});

test("rejects duplicate profiles and incomparable execution metadata", () => {
  assert.throws(() => createBenchmarkMatrix([createResult("small-interactive", 10)]), /at least two/);
  assert.throws(
    () => createBenchmarkMatrix([createResult("small-interactive", 10), createResult("small-interactive", 20)]),
    /unique/,
  );
  const differentBrowser = createResult("standard-client", 20);
  differentBrowser.environment.browser = "Other";
  assert.throws(() => createBenchmarkMatrix([createResult("small-interactive", 10), differentBrowser]), /browser/);
  const differentSuite = createResult("standard-client", 20);
  differentSuite.config.suite = "framework";
  assert.throws(() => createBenchmarkMatrix([createResult("small-interactive", 10), differentSuite]), /suite/);
  const staleSchema = createResult("standard-client", 20);
  staleSchema.schemaVersion = BENCHMARK_RESULT_SCHEMA_VERSION - 1;
  assert.throws(() => createBenchmarkMatrix([createResult("small-interactive", 10), staleSchema]), new RegExp(`result schema ${BENCHMARK_RESULT_SCHEMA_VERSION}`));

  const missingP95 = createBenchmarkMatrix([createResult("small-interactive", 10), createResult("standard-client", 20)]);
  missingP95.profiles[0].implementations[0].summary.initialReadyMs.p95 = Number.NaN;
  assert.throws(() => formatBenchmarkMatrixMarkdown(missingP95), /p95 summary/);
});

function createResult(profileId, value) {
  const summary = Object.fromEntries(Object.keys(BENCHMARK_METRICS).map((metricId) => [metricId, {
    median: value,
    p95: value,
    min: value,
    max: value,
  }]));
  return {
    schemaVersion: BENCHMARK_RESULT_SCHEMA_VERSION,
    createdAt: "2026-07-21T00:00:00.000Z",
    status: "observational",
    datasetFingerprint: profileId,
    config: { suite: "comparison", profileId, runs: 1, warmups: 0 },
    environment: {
      browser: "Chromium",
      platform: "test",
      gitRevision: "abc",
      gitDirty: false,
    },
    implementations: ["open-grid-react-full", "open-grid-vue"].map((id) => ({ id, summary, runs: [] })),
  };
}
