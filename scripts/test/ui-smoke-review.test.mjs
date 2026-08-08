import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getReviewProgress, validateReviewContract } from "../ui-smoke-review.mjs";
import { getUiSmokeSourceState } from "../ui-smoke-source-state.mjs";
import { uiSmokeTargets } from "../ui-smoke-targets.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const reviewScript = join(repoRoot, "scripts", "ui-smoke-review.mjs");

test("UI smoke review reports resumable progress for an untouched current template", () => {
  const source = getUiSmokeSourceState();
  const report = createReport(source);

  assert.deepEqual(validateReviewContract(report, source, true), []);
  assert.deepEqual(getReviewProgress(report, source), {
    sourceCurrent: true,
    sourceDirty: source.dirty,
    environmentCompleted: 0,
    environmentTotal: 8,
    displaySettingsConfirmed: false,
    reviewDateFresh: false,
    results: { total: 36, pass: 0, followUp: 0, todo: 36, missingEvidence: 0 },
    frameworks: uiSmokeTargets.map((target) => ({
      framework: target.framework,
      targetResult: "todo",
      functional: { total: target.manualChecks.length, pass: 0, followUp: 0, todo: target.manualChecks.length, missingEvidence: 0 },
      accessibility: { total: target.accessibilityChecks.length, pass: 0, followUp: 0, todo: target.accessibilityChecks.length, missingEvidence: 0 },
    })),
    pendingChecks: createExpectedPendingChecks(report.targets),
    readyForValidation: false,
  });
});

test("UI smoke review recognizes complete evidence and rejects stale source or checks", () => {
  const source = getUiSmokeSourceState();
  const report = createReport(source);
  report.reviewEnvironment = {
    reviewer: "Release reviewer",
    date: currentLocalDate(),
    operatingSystem: "macOS 15",
    browser: "Chrome 138",
    browserZoom: "200%",
    viewport: "390 CSS px",
    screenReader: "VoiceOver",
    forcedColorsOrHighContrast: "macOS Increase Contrast",
  };
  for (const target of report.targets) {
    completeRecord(target);
    target.manualChecks.forEach(completeRecord);
    target.accessibilityChecks.forEach(completeRecord);
  }

  const progress = getReviewProgress(report, source);
  assert.equal(progress.results.pass, 36);
  assert.equal(progress.results.todo, 0);
  assert.deepEqual(progress.pendingChecks, []);
  assert.equal(progress.reviewDateFresh, true);
  assert.equal(progress.readyForValidation, !source.dirty);

  const staleSource = structuredClone(report);
  staleSource.source.fingerprint = "sha256:stale";
  assert.match(validateReviewContract(staleSource, source, true).join("\n"), /source identity/);

  const staleCheck = structuredClone(report);
  staleCheck.targets[0].manualChecks[0].check = "Changed check";
  assert.match(validateReviewContract(staleCheck, source, true).join("\n"), /functional\[1\]: check text is stale/);
});

function currentLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("UI smoke review CLI prints machine-readable progress and guards its arguments", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-grid-ui-review-"));
  const reportFile = join(directory, "report.json");
  try {
    writeFileSync(reportFile, JSON.stringify(createReport(getUiSmokeSourceState())));
    const status = spawnSync(process.execPath, [reviewScript, "--file", reportFile, "--status", "--json", "--allow-dirty"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(status.status, 0, status.stderr);
    const progress = JSON.parse(status.stdout);
    assert.equal(progress.sourceCurrent, true);
    assert.equal(progress.results.total, 36);
    assert.equal(progress.pendingChecks.length, 33);
    assert.equal(progress.readyForValidation, false);

    const frameworkStatus = spawnSync(process.execPath, [
      reviewScript,
      "--file",
      reportFile,
      "--status",
      "--json",
      "--framework",
      "Vue",
      "--allow-dirty",
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(frameworkStatus.status, 0, frameworkStatus.stderr);
    const frameworkProgress = JSON.parse(frameworkStatus.stdout);
    assert.equal(frameworkProgress.results.total, 12);
    assert.deepEqual(frameworkProgress.frameworks.map((framework) => framework.framework), ["Vue"]);
    assert.equal(frameworkProgress.pendingChecks.length, 11);
    assert.ok(frameworkProgress.pendingChecks.every((check) => check.framework === "Vue"));
    assert.equal(frameworkProgress.readyForValidation, false);

    const textStatus = spawnSync(process.execPath, [
      reviewScript,
      "--file",
      reportFile,
      "--status",
      "--framework",
      "React",
      "--allow-dirty",
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(textStatus.status, 0, textStatus.stderr);
    assert.match(textStatus.stdout, /Pending checks:/);
    assert.match(textStatus.stdout, /React accessibility 1 \[todo\]: Use a screen reader/);
    assert.match(textStatus.stdout, /target: http:\/\/127\.0\.0\.1:4193\//);
    assert.match(textStatus.stdout, /resume React: pnpm review:smoke-ui -- --framework React/);

    const invalidJson = spawnSync(process.execPath, [reviewScript, "--json"], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(invalidJson.status, 1);
    assert.match(invalidJson.stderr, /--json can only be used with --status/);

    const invalidFramework = spawnSync(process.execPath, [
      reviewScript,
      "--file",
      reportFile,
      "--status",
      "--framework",
      "Angular",
      "--allow-dirty",
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(invalidFramework.status, 1);
    assert.match(invalidFramework.stderr, /Unknown framework.*React, Vue, or Svelte/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createReport(source) {
  return {
    report: "ui-smoke-inspection",
    source,
    reviewEnvironment: {
      reviewer: "",
      date: "",
      operatingSystem: "",
      browser: "",
      browserZoom: "",
      viewport: "",
      screenReader: "",
      forcedColorsOrHighContrast: "",
    },
    targets: uiSmokeTargets.map((target) => ({
      framework: target.framework,
      url: target.url,
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", target.framework, "--open"],
      smokeCheck: target.smokeCheck,
      stateCheck: target.stateCheck,
      workflowCheck: target.workflowCheck,
      result: "todo",
      evidence: "",
      manualChecks: target.manualChecks.map((check) => ({ check, result: "todo", evidence: "" })),
      accessibilityChecks: target.accessibilityChecks.map((check) => ({ check, result: "todo", evidence: "" })),
    })),
  };
}

function completeRecord(record) {
  record.result = "pass";
  record.evidence = "Reviewed in the stated environment.";
}

function createExpectedPendingChecks(targets) {
  return targets.flatMap((target) => [
    ...target.manualChecks.map((record, index) => ({
      framework: target.framework,
      url: target.url,
      openCommand: target.openCommand,
      category: "functional",
      checkIndex: index + 1,
      check: record.check,
      result: record.result,
      evidence: record.evidence,
    })),
    ...target.accessibilityChecks.map((record, index) => ({
      framework: target.framework,
      url: target.url,
      openCommand: target.openCommand,
      category: "accessibility",
      checkIndex: index + 1,
      check: record.check,
      result: record.result,
      evidence: record.evidence,
    })),
  ]);
}
