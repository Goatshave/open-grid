import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  evaluateServerBenchmarkBudgets,
  formatServerBenchmarkBudgetMarkdown,
  validateServerBenchmarkBudgetConfig,
} from "../server-budget.mjs";
import { SERVER_BENCHMARK_METRICS, summarizeServerBenchmarkRuns } from "../server-results.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const policy = JSON.parse(readFileSync(path.join(root, "benchmarks/server-budgets.json"), "utf8"));
const stressPolicy = JSON.parse(readFileSync(path.join(root, "benchmarks/server-stress-budgets.json"), "utf8"));

test("recomputes server statistics and enforces timing and resource budgets", () => {
  const config = createConfig();
  const result = createResult(config);
  const evaluation = evaluateServerBenchmarkBudgets(config, result);

  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.checks.length, 20);
  assert.equal(evaluation.failures.length, 0);
  assert.match(formatServerBenchmarkBudgetMarkdown(evaluation), /timing:pageMs:median/);

  const timingRegression = createResult(config);
  for (const run of timingRegression.runs.filter((item) => !item.warmup)) run.metrics.pageMs = 101;
  refreshSummary(timingRegression, config.delayMs);
  const timingFailure = evaluateServerBenchmarkBudgets(config, timingRegression);
  assert.deepEqual(timingFailure.failures.map((failure) => failure.id), ["timing:pageMs:median", "timing:pageMs:p95"]);

  const resourceRegression = createResult(config);
  resourceRegression.runs.at(-1).resources.domNodeCount = 500;
  const resourceFailure = evaluateServerBenchmarkBudgets(config, resourceRegression);
  assert.deepEqual(resourceFailure.failures.map((failure) => failure.id), ["resource:domNodeCount:p95"]);

  const stressConfig = { ...structuredClone(stressPolicy), minimumRuns: 3, minimumWarmups: 1 };
  const stressEvaluation = evaluateServerBenchmarkBudgets(stressConfig, createResult(stressConfig));
  assert.equal(stressEvaluation.passed, true);

  const quadraticRegression = createResult(stressConfig);
  for (const run of quadraticRegression.runs.filter((item) => !item.warmup)) run.metrics.groupMs = stressConfig.delayMs + 712.3;
  refreshSummary(quadraticRegression, stressConfig.delayMs);
  const scaleFailure = evaluateServerBenchmarkBudgets(stressConfig, quadraticRegression);
  assert.deepEqual(scaleFailure.failures.map((failure) => failure.id), ["timing:groupMs:median", "timing:groupMs:p95"]);
});

test("rejects malformed server policies, stale summaries, and incomparable runs", () => {
  assert.throws(() => validateServerBenchmarkBudgetConfig({}), /schemaVersion/);
  const missingMetric = createConfig();
  delete missingMetric.timing.patchMs;
  assert.throws(() => validateServerBenchmarkBudgetConfig(missingMetric), /timing keys/);
  const invalidBasis = createConfig();
  invalidBasis.timing.pageMs.basis = "transport";
  assert.throws(() => validateServerBenchmarkBudgetConfig(invalidBasis), /basis/);
  const invalidWorkload = createConfig();
  invalidWorkload.workload.rowCount = 0;
  assert.throws(() => validateServerBenchmarkBudgetConfig(invalidWorkload), /workload rowCount/);

  const config = createConfig();
  const stale = createResult(config);
  stale.summary.groupMs.median += 1;
  assert.throws(() => evaluateServerBenchmarkBudgets(config, stale), /does not match recorded runs/);

  const wrongAction = createResult(config);
  wrongAction.runs[0].actionSnapshots.cancel.filter = "Orbit";
  assert.throws(() => evaluateServerBenchmarkBudgets(config, wrongAction), /cancel\.filter/);

  const staleResponse = createResult(config);
  staleResponse.runs[0].finalSnapshot.staleResponses = 1;
  assert.throws(() => evaluateServerBenchmarkBudgets(config, staleResponse), /did not settle cleanly/);

  const wrongFingerprint = createResult(config);
  wrongFingerprint.runs[0].fixtureFingerprint = "other";
  assert.throws(() => evaluateServerBenchmarkBudgets(config, wrongFingerprint), /identity/);

  const insufficient = createResult(config);
  insufficient.config.runs = 2;
  assert.throws(() => evaluateServerBenchmarkBudgets(config, insufficient), /required runs and warmups/);
});

test("server benchmark budget CLI reports pass and failure results", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-server-budget-"));
  const config = createConfig();
  const configPath = path.join(directory, "config.json");
  const inputPath = path.join(directory, "result.json");
  try {
    writeFileSync(configPath, JSON.stringify(config));
    writeFileSync(inputPath, JSON.stringify(createResult(config)));
    const passed = runCli(configPath, inputPath);
    assert.equal(passed.status, 0);
    assert.equal(JSON.parse(passed.stdout).passed, true);

    const failedResult = createResult(config);
    failedResult.runs.at(-1).resources.jsHeapUsedBytes = 20_000_000;
    writeFileSync(inputPath, JSON.stringify(failedResult));
    const failed = runCli(configPath, inputPath);
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).passed, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createConfig() {
  return { ...structuredClone(policy), minimumRuns: 3, minimumWarmups: 1 };
}

function createResult(config) {
  const runs = Array.from({ length: 4 }, (_, index) => createRun(config, index, index === 0));
  const result = {
    schemaVersion: 1,
    createdAt: "2026-07-23T00:00:00.000Z",
    status: "observational",
    config: { profileId: config.profileId, runs: 3, warmups: 1, delayMs: config.delayMs },
    environment: { browser: "Chromium", platform: "test", gitRevision: "abc", gitDirty: true },
    fixtureFingerprint: config.fixtureFingerprint,
    summary: {},
    validation: { started: 10, completed: 9, aborted: 1, inFlight: 0, staleResponses: 0 },
    runs,
  };
  refreshSummary(result, config.delayMs);
  return result;
}

function createRun(config, index, warmup) {
  const metrics = Object.fromEntries(Object.keys(SERVER_BENCHMARK_METRICS).map((metric) => {
    const transport = SERVER_BENCHMARK_METRICS[metric].roundTrips * config.delayMs;
    return [metric, metric === "initialReadyMs" ? 100 + index : transport + 5 + index];
  }));
  const actionSnapshots = {
    page: snapshot("page", "flat", 0, config.workload.rowCount, 100, "", "", 3, 2, 2, 0, "SBT-0301"),
    sort: snapshot("sort", "flat", 0, config.workload.rowCount, 100, "value:desc", "", 0, 3, 3, 0, config.workload.sortFirstRowId),
    filter: snapshot("filter", "flat", 0, config.workload.filteredRowCount, 100, "", "Orbit", 0, 4, 4, 0, "SBT-0004"),
    cancel: snapshot("cancel", "flat", 0, config.workload.filteredRowCount, 100, "", "Northwind", 0, 6, 5, 1, "SBT-0002"),
    group: snapshot("group", "group", 0, config.workload.rowCount, config.workload.groupedDisplayedRows, "value:desc", "", 0, 7, 6, 1, "group:status%3DResolved"),
    tree: snapshot("tree", "tree", 0, config.workload.treeRowCount, 29, "", "", 0, 9, 8, 1, "PFL-001"),
    patch: snapshot("patch", "tree", 1, config.workload.treeRowCount, 29, "", "", 0, 10, 9, 1, "PFL-001"),
  };
  return {
    index,
    warmup,
    configuredDelayMs: config.delayMs,
    fixtureFingerprint: config.fixtureFingerprint,
    metrics,
    resources: {
      jsHeapUsedBytes: 6_000_000 + index,
      domNodeCount: 280,
      transferredBytes: 86_000,
      decodedBodyBytes: 280_000,
    },
    actionSnapshots,
    finalSnapshot: structuredClone(actionSnapshots.patch),
  };
}

function snapshot(operation, mode, revision, totalRows, displayedRows, sorting, filter, pageIndex, started, completed, aborted, firstRowId) {
  const ids = [firstRowId, ...Array.from({ length: 18 }, (_, index) => `${firstRowId}-${index + 2}`)];
  return {
    mode,
    operation,
    revision,
    totalRows,
    displayedRows,
    mountedRows: 19,
    mountedCells: 133,
    mountedRowSignature: ids.join("|"),
    sorting,
    filter,
    pageIndex,
    transport: { started, completed, aborted, inFlight: 0 },
    staleResponses: 0,
  };
}

function refreshSummary(result, delayMs) {
  result.summary = summarizeServerBenchmarkRuns(result.runs.filter((run) => !run.warmup), delayMs);
}

function runCli(configPath, inputPath) {
  return spawnSync(process.execPath, [path.join(root, "scripts/benchmark-server-budget.mjs"), "--config", configPath, "--input", inputPath, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
}
