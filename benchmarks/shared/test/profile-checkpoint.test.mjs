import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  readBenchmarkProfileCheckpoint,
  writeBenchmarkProfileCheckpoint,
} from "../profile-checkpoint.mjs";

test("atomically stores and reuses an identical benchmark profile checkpoint", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-checkpoint-"));
  const checkpointPath = path.join(directory, "small.json");
  const expected = createExpectation();
  const result = createResult(expected);

  writeBenchmarkProfileCheckpoint(checkpointPath, result);

  const checkpoint = readBenchmarkProfileCheckpoint(checkpointPath, expected);
  assert.equal(checkpoint.status, "reused");
  assert.deepEqual(checkpoint.result, result);
});

test("rejects stale, incomplete, and malformed benchmark profile checkpoints", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-checkpoint-"));
  const checkpointPath = path.join(directory, "small.json");
  const expected = createExpectation();

  assert.equal(readBenchmarkProfileCheckpoint(checkpointPath, expected).status, "missing");

  const stale = createResult(expected);
  stale.environment.sourceFingerprint = `sha256:${"b".repeat(64)}`;
  writeBenchmarkProfileCheckpoint(checkpointPath, stale);
  assert.match(readBenchmarkProfileCheckpoint(checkpointPath, expected).reason, /sourceFingerprint does not match/u);

  const incomplete = createResult(expected);
  incomplete.implementations[0].runs.pop();
  writeBenchmarkProfileCheckpoint(checkpointPath, incomplete);
  assert.match(readBenchmarkProfileCheckpoint(checkpointPath, expected).reason, /run count does not match/u);

  writeFileSync(checkpointPath, "{");
  assert.match(readBenchmarkProfileCheckpoint(checkpointPath, expected).reason, /cannot read checkpoint/u);
});

test("benchmark runner requires an explicit checkpoint directory for resume mode", () => {
  const missingDirectory = spawnSync(process.execPath, [
    path.resolve("scripts/benchmark-runner.mjs"),
    "--resume",
  ], { encoding: "utf8" });
  assert.equal(missingDirectory.status, 1);
  assert.match(missingDirectory.stderr, /--resume requires --checkpoint-dir/u);

  const missingValue = spawnSync(process.execPath, [
    path.resolve("scripts/benchmark-runner.mjs"),
    "--checkpoint-dir",
    "--resume",
  ], { encoding: "utf8" });
  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /--checkpoint-dir requires a value/u);
});

function createExpectation() {
  return {
    suite: "comparison",
    profileId: "small-interactive",
    runs: 2,
    warmups: 1,
    environment: {
      platform: "test",
      cpu: "test",
      logicalCpuCount: 1,
      totalMemoryBytes: 1,
      node: "v22",
      browser: "chromium",
      gitRevision: "abc123",
      gitDirty: true,
      sourceFingerprint: `sha256:${"a".repeat(64)}`,
    },
    implementations: [
      { id: "open-grid", version: "0.1.0" },
      { id: "baseline", version: "1.0.0" },
    ],
  };
}

function createResult(expected) {
  return {
    schemaVersion: 29,
    createdAt: "2026-07-24T00:00:00.000Z",
    status: "observational",
    datasetFingerprint: "dataset",
    config: {
      suite: expected.suite,
      profileId: expected.profileId,
      runs: expected.runs,
      warmups: expected.warmups,
    },
    environment: { ...expected.environment },
    implementations: expected.implementations.map((implementation) => ({
      ...implementation,
      url: "http://127.0.0.1",
      runs: Array.from({ length: expected.runs + expected.warmups }, (_, index) => ({
        warmup: index < expected.warmups,
        datasetFingerprint: "dataset",
      })),
      summary: {},
    })),
  };
}
