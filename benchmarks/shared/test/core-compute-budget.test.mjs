import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  evaluateCoreComputeBudgets,
  formatCoreComputeBudgetMarkdown,
  validateCoreComputeBudgetConfig,
} from "../core-compute-budget.mjs";
import { CORE_COMPUTE_WORKLOAD_IDS, summarizeCoreComputeDurations } from "../core-compute.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const policy = JSON.parse(readFileSync(path.join(root, "benchmarks/core-compute-budgets.json"), "utf8"));
const FILTER_WORKLOADS = new Set(["global-filter", "column-filter"]);
const SORT_WORKLOADS = new Set(["numeric-sort", "numeric-sort-flip"]);

test("recomputes core statistics and rejects quadratic massive scaling", () => {
  const config = createConfig();
  const result = createResult(config);
  const evaluation = evaluateCoreComputeBudgets(config, result);

  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.checks.length, 10);
  assert.equal(evaluation.failures.length, 0);
  assert.match(formatCoreComputeBudgetMarkdown(evaluation), /scale:global-filter:p95/);

  const quadratic = createResult(config);
  const baseline = quadratic.profiles[0];
  const massive = quadratic.profiles[1];
  for (const workload of massive.workloads) {
    const baselineWorkload = baseline.workloads.find((item) => item.workloadId === workload.workloadId);
    for (let index = 0; index < workload.runs.length; index += 1) {
      workload.runs[index].durationMs = baselineWorkload.runs[index].durationMs * 100;
    }
    refreshSummary(workload);
  }
  const failed = evaluateCoreComputeBudgets(config, quadratic);
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.failures.map((item) => item.id), CORE_COMPUTE_WORKLOAD_IDS.flatMap((workloadId) => [
    `scale:${workloadId}:median`,
    `scale:${workloadId}:p95`,
  ]));
});

test("rejects malformed core policies, stale summaries, and incomparable runs", () => {
  assert.throws(() => validateCoreComputeBudgetConfig({}), /schemaVersion/);
  const missingWorkload = createConfig();
  delete missingWorkload.workloads["column-filter"];
  assert.throws(() => validateCoreComputeBudgetConfig(missingWorkload), /workloads keys/);
  const invalidScale = createConfig();
  invalidScale.candidateProfile.rowCount = invalidScale.baselineProfile.rowCount;
  assert.throws(() => validateCoreComputeBudgetConfig(invalidScale), /scale contract/);
  const invalidBudget = createConfig();
  invalidBudget.workloads["global-filter"].maxP95PerRowRatio = 0;
  assert.throws(() => validateCoreComputeBudgetConfig(invalidBudget), /positive finite/);

  const config = createConfig();
  const stale = createResult(config);
  stale.profiles[1].workloads[0].summary.median += 1;
  assert.throws(() => evaluateCoreComputeBudgets(config, stale), /does not match recorded runs/);

  const wrongMarker = createResult(config);
  wrongMarker.profiles[0].workloads[0].runs[0].warmup = false;
  assert.throws(() => evaluateCoreComputeBudgets(config, wrongMarker), /run markers/);

  const wrongQuery = createResult(config);
  wrongQuery.profiles[1].workloads.find((item) => item.workloadId === "global-filter").runs[0].query = "Other";
  assert.throws(() => evaluateCoreComputeBudgets(config, wrongQuery), /workload identity/);

  const insufficient = createResult(config);
  insufficient.config.runs = 2;
  assert.throws(() => evaluateCoreComputeBudgets(config, insufficient), /required runs and warmups/);
});

test("core compute budget CLI reports pass and failure results", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-core-compute-budget-"));
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
    const massiveGlobal = failedResult.profiles[1].workloads.find((item) => item.workloadId === "global-filter");
    for (const run of massiveGlobal.runs) run.durationMs *= 100;
    refreshSummary(massiveGlobal);
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
  const runs = 3;
  const warmups = 1;
  return {
    schemaVersion: config.resultSchemaVersion,
    createdAt: "2026-07-23T00:00:00.000Z",
    status: "observational",
    config: {
      runs,
      warmups,
      queries: [...config.queries],
      sortColumnId: config.sortColumnId,
      sortDirections: [...config.sortDirections],
      profileIds: [config.baselineProfile.id, config.candidateProfile.id],
      workloads: [...CORE_COMPUTE_WORKLOAD_IDS],
    },
    environment: { platform: "test", cpu: "test", logicalCpuCount: 1, node: process.version, coreVersion: "0.1.0", gitRevision: "abc", gitDirty: true },
    profiles: [
      createProfile(config.baselineProfile, runs, warmups, 10),
      createProfile(config.candidateProfile, runs, warmups, 100),
    ],
  };
}

function createProfile(profile, runs, warmups, durationBase) {
  return {
    profileId: profile.id,
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    workloads: CORE_COMPUTE_WORKLOAD_IDS.map((workloadId) => {
      const workloadRuns = Array.from({ length: runs + warmups }, (_, index) => ({
        index,
        warmup: index < warmups,
        query: FILTER_WORKLOADS.has(workloadId) ? policy.queries[index % policy.queries.length] : null,
        sortDirection: SORT_WORKLOADS.has(workloadId) ? policy.sortDirections[index % policy.sortDirections.length] : null,
        durationMs: durationBase + index,
        resultRowCount: FILTER_WORKLOADS.has(workloadId) ? Math.floor(profile.rowCount / 4) : profile.rowCount,
      }));
      const workload = { workloadId, summary: {}, runs: workloadRuns };
      refreshSummary(workload);
      return workload;
    }),
  };
}

function refreshSummary(workload) {
  workload.summary = summarizeCoreComputeDurations(workload.runs.filter((run) => !run.warmup).map((run) => run.durationMs));
}

function runCli(configPath, inputPath) {
  return spawnSync(process.execPath, [path.join(root, "scripts/benchmark-core-compute-budget.mjs"), "--config", configPath, "--input", inputPath, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
}
