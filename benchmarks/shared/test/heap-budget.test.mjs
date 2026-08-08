import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  evaluateHeapBudgets,
  formatHeapBudgetMarkdown,
  validateHeapBudgetConfig,
} from "../heap-budget.mjs";

test("enforces absolute and renderer-relative heap budgets", () => {
  const config = createConfig();
  const profile = createProfile();
  const result = evaluateHeapBudgets(config, profile);

  assert.equal(result.passed, true);
  assert.equal(result.checks.length, 9);
  assert.equal(result.failures.length, 0);
  assert.match(formatHeapBudgetMarkdown(result), /candidate \| 1\.0 KiB \| 20 \| 2\.0 KiB/);

  profile.implementations[1].heap.selfSizeBytes = 2_000;
  const failed = evaluateHeapBudgets(config, profile);
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.failures.map((failure) => failure.type), ["absolute", "relative"]);
});

test("rejects malformed heap budgets and incomparable profile results", () => {
  assert.throws(() => validateHeapBudgetConfig({}), /schemaVersion/);
  const config = createConfig();
  const duplicate = structuredClone(config);
  duplicate.implementations[1].id = "baseline";
  assert.throws(() => validateHeapBudgetConfig(duplicate), /unique/);
  const unsupported = structuredClone(config);
  unsupported.implementations[0].limits.unsupported = 1;
  assert.throws(() => validateHeapBudgetConfig(unsupported), /unsupported/);

  const missing = createProfile();
  missing.implementations.pop();
  assert.throws(() => evaluateHeapBudgets(config, missing), /missing/);
  const mismatched = createProfile();
  mismatched.implementations[1].snapshot.mountedCellCount += 1;
  assert.throws(() => evaluateHeapBudgets(config, mismatched), /mountedCellCount/);
  const wrongProfile = createProfile();
  wrongProfile.config.profileId = "wide";
  assert.throws(() => evaluateHeapBudgets(config, wrongProfile), /does not match/);
});

test("heap budget CLI reports pass and failure results", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-heap-budget-"));
  const configPath = path.join(directory, "config.json");
  const inputPath = path.join(directory, "profile.json");
  try {
    writeFileSync(configPath, JSON.stringify(createConfig()));
    writeFileSync(inputPath, JSON.stringify(createProfile()));
    const passed = runCli(configPath, inputPath);
    assert.equal(passed.status, 0);
    assert.equal(JSON.parse(passed.stdout).passed, true);

    const failedConfig = createConfig();
    failedConfig.implementations[1].limits.selfSizeBytes = 1;
    writeFileSync(configPath, JSON.stringify(failedConfig));
    const failed = runCli(configPath, inputPath);
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).passed, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createConfig() {
  return {
    schemaVersion: 1,
    profileId: "standard",
    phase: "settled-workload",
    implementations: [
      { id: "baseline", limits: { selfSizeBytes: 2_000, nodeCount: 30, jsHeapUsedBytes: 3_000 } },
      { id: "candidate", limits: { selfSizeBytes: 1_500, nodeCount: 25, jsHeapUsedBytes: 2_500 } },
    ],
    comparisons: [
      { candidateId: "candidate", baselineId: "baseline", metric: "selfSizeBytes", maxDelta: 100 },
      { candidateId: "candidate", baselineId: "baseline", metric: "nodeCount", maxDelta: 0 },
      { candidateId: "candidate", baselineId: "baseline", metric: "jsHeapUsedBytes", maxDelta: 100 },
    ],
  };
}

function createProfile() {
  const snapshot = {
    rowCount: 10_000,
    columnCount: 20,
    displayedRowCount: 10_000,
    mountedRowCount: 26,
    mountedCellCount: 416,
  };
  return {
    schemaVersion: 2,
    datasetFingerprint: "fixture-v1",
    config: { profileId: "standard", phase: "settled-workload" },
    implementations: [
      { id: "baseline", datasetFingerprint: "fixture-v1", snapshot: { ...snapshot }, jsHeapUsedBytes: 2_048, heap: { selfSizeBytes: 1_200, nodeCount: 22 } },
      { id: "candidate", datasetFingerprint: "fixture-v1", snapshot: { ...snapshot }, jsHeapUsedBytes: 2_048, heap: { selfSizeBytes: 1_024, nodeCount: 20 } },
    ],
  };
}

function runCli(configPath, inputPath) {
  return spawnSync(process.execPath, [
    path.resolve("scripts/benchmark-heap-budget.mjs"),
    "--config",
    configPath,
    "--input",
    inputPath,
    "--json",
  ], { encoding: "utf8" });
}
