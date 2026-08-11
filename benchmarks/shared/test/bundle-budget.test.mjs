import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  formatBundleBudgetMarkdown,
  measureBundleBudgets,
  validateBundleBudgetConfig,
} from "../bundle-budget.mjs";

test("measures built assets and enforces absolute and relative bundle budgets", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "open-grid-bundle-budget-"));

  try {
    writeApp(root, "candidate", "export const value=1", ".grid{display:grid}");
    writeApp(root, "baseline", "export const value='a larger baseline payload'", ".grid{display:grid;color:red}");
    const config = createConfig();
    const result = measureBundleBudgets(config, root);

    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
    assert.equal(result.measurements.length, 2);
    assert.equal(result.measurements[0].fileCount, 3);
    assert.equal(result.measurements[0].enforcement, "required");
    assert.ok(result.measurements[0].javascriptGzipBytes > 0);
    assert.ok(result.measurements[0].stylesheetGzipBytes > 0);
    assert.equal(result.checks.length, 4);
    assert.match(formatBundleBudgetMarkdown(result), /candidate:totalGzipBytes:baseline/);

    config.comparisons[0].maxDeltaBytes = -1;
    assert.equal(measureBundleBudgets(config, root).passed, true);

    config.applications[0].limits.totalGzipBytes = 1;
    const failed = measureBundleBudgets(config, root);
    assert.equal(failed.passed, false);
    assert.equal(failed.failures.length, 1);
    assert.equal(failed.failures[0].type, "absolute");

    config.applications[0].enforcement = "diagnostic";
    const diagnostic = measureBundleBudgets(config, root);
    assert.equal(diagnostic.passed, true);
    assert.equal(diagnostic.failures.length, 0);
    assert.equal(diagnostic.diagnostics.length, 1);
    assert.match(formatBundleBudgetMarkdown(diagnostic), /diagnostic/);

    config.applications[0].includeExtensions = [".js"];
    const filtered = measureBundleBudgets(config, root);
    assert.equal(filtered.measurements[0].fileCount, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects malformed bundle budget contracts and missing build output", () => {
  assert.throws(() => validateBundleBudgetConfig({}), /schemaVersion/);
  assert.throws(() => validateBundleBudgetConfig({ schemaVersion: 2, applications: [] }), /non-empty/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [
      { id: "same", distDirectory: "a" },
      { id: "same", distDirectory: "b" },
    ],
  }), /unique/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [{ id: "app", distDirectory: "dist", limits: { unsupported: 1 } }],
  }), /unsupported/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [{ id: "app", distDirectory: "dist" }],
    comparisons: [{ candidateId: "app", baselineId: "missing", metric: "totalGzipBytes", maxDeltaBytes: 0 }],
  }), /distinct configured/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [
      { id: "candidate", distDirectory: "candidate" },
      { id: "baseline", distDirectory: "baseline" },
    ],
    comparisons: [{ candidateId: "candidate", baselineId: "baseline", metric: "totalGzipBytes", maxDeltaBytes: 0.5 }],
  }), /safe integer/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [{ id: "app", distDirectory: "dist", enforcement: "optional" }],
  }), /required or diagnostic/);
  assert.throws(() => validateBundleBudgetConfig({
    schemaVersion: 2,
    applications: [{ id: "app", distDirectory: "dist", includeExtensions: ["js"] }],
  }), /invalid extension/);

  const root = mkdtempSync(path.join(os.tmpdir(), "open-grid-bundle-budget-missing-"));
  try {
    assert.throws(() => measureBundleBudgets({
      schemaVersion: 2,
      applications: [{ id: "app", distDirectory: "../outside" }],
    }, root), /escapes the root/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function createConfig() {
  return {
    schemaVersion: 2,
    applications: [
      {
        id: "candidate",
        distDirectory: "candidate/dist",
        limits: {
          javascriptGzipBytes: 1_000,
          stylesheetGzipBytes: 1_000,
          totalGzipBytes: 1_000,
        },
      },
      { id: "baseline", distDirectory: "baseline/dist" },
    ],
    comparisons: [{
      candidateId: "candidate",
      baselineId: "baseline",
      metric: "totalGzipBytes",
      maxDeltaBytes: 0,
    }],
  };
}

function writeApp(root, id, javascript, stylesheet) {
  const assets = path.join(root, id, "dist", "assets", "nested");
  mkdirSync(assets, { recursive: true });
  writeFileSync(path.join(root, id, "dist", "index.html"), "<main></main>");
  writeFileSync(path.join(assets, "index.js"), javascript);
  writeFileSync(path.join(assets, "index.css"), stylesheet);
  writeFileSync(path.join(assets, "index.js.map"), "ignored source map payload");
}
