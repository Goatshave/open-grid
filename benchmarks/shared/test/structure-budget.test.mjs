import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateStructureBudgets,
  formatStructureBudgetMarkdown,
  validateStructureBudgetConfig,
} from "../structure-budget.mjs";

test("enforces absolute, equality, and relative structure budgets", () => {
  const config = createConfig();
  const observations = [
    observation("candidate", { domElementCount: 90, domNodeCount: 180 }),
    observation("baseline", { domElementCount: 88, domNodeCount: 176 }),
  ];
  const result = evaluateStructureBudgets(config, observations);

  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
  assert.equal(result.checks.length, 10);
  assert.match(formatStructureBudgetMarkdown(result), /candidate \| 20 \| 320 \| 90 \| 180/);

  observations[0].domNodeCount = 201;
  const failed = evaluateStructureBudgets(config, observations);
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.failures.map((failure) => failure.type), ["absolute", "relative"]);
});

test("rejects malformed contracts and incomparable observations", () => {
  assert.throws(() => validateStructureBudgetConfig({}), /schemaVersion/);
  assert.throws(() => validateStructureBudgetConfig({ schemaVersion: 1, viewport: {}, profiles: [], applications: [] }), /viewport/);
  const config = createConfig();

  assert.throws(() => evaluateStructureBudgets(config, [observation("candidate")]), /missing/);
  assert.throws(() => evaluateStructureBudgets(config, [observation("candidate"), observation("candidate")]), /duplicate/);
  assert.throws(() => evaluateStructureBudgets(config, [
    observation("candidate"),
    observation("baseline", { datasetFingerprint: "different" }),
  ]), /dataset mismatch/);
  assert.throws(() => evaluateStructureBudgets(config, [
    observation("candidate"),
    observation("baseline", { displayedRowCount: 999 }),
  ]), /logical dimensions mismatch/);

  const invalidMetric = structuredClone(config);
  invalidMetric.applications[0].limits.standard.unsupported = 1;
  assert.throws(() => validateStructureBudgetConfig(invalidMetric), /unsupported/);

  const invalidEquality = structuredClone(config);
  invalidEquality.equalities[0].applicationIds = ["candidate", "missing"];
  assert.throws(() => validateStructureBudgetConfig(invalidEquality), /distinct configured/);

  const duplicateUrl = structuredClone(config);
  duplicateUrl.applications[1].url = duplicateUrl.applications[0].url;
  assert.throws(() => validateStructureBudgetConfig(duplicateUrl), /URLs must be unique/);
});

function createConfig() {
  return {
    schemaVersion: 1,
    viewport: { width: 1280, height: 800 },
    profiles: [{ id: "standard", rowCount: 1_000, columnCount: 20 }],
    applications: ["candidate", "baseline"].map((id) => ({
      id,
      url: id === "candidate" ? "http://127.0.0.1:4301" : "http://127.0.0.1:4302",
      limits: {
        standard: {
          mountedRowCount: 21,
          mountedCellCount: 321,
          domElementCount: 100,
          domNodeCount: 200,
        },
      },
    })),
    equalities: [{
      profileId: "standard",
      applicationIds: ["candidate", "baseline"],
      metric: "mountedRowCount",
    }],
    comparisons: [{
      profileId: "standard",
      candidateId: "candidate",
      baselineId: "baseline",
      metric: "domNodeCount",
      maxDelta: 8,
    }],
  };
}

function observation(applicationId, overrides = {}) {
  return {
    applicationId,
    profileId: "standard",
    datasetFingerprint: "fixture-v1",
    rowCount: 1_000,
    columnCount: 20,
    displayedRowCount: 1_000,
    mountedRowCount: 20,
    mountedCellCount: 320,
    domElementCount: 90,
    domNodeCount: 180,
    ...overrides,
  };
}
