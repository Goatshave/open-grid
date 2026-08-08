import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");

test("manual baseline workflow records one clean six-profile Open Grid matrix", () => {
  const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "benchmark-baseline.yml"), "utf8");

  assert.match(workflow, /^name: Open Grid Performance Baseline/m);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:|push:|schedule:/);
  assert.match(workflow, /timeout-minutes: 90/);
  assert.match(workflow, /pnpm benchmark:build/);
  assert.match(workflow, /pnpm benchmark:baseline:measure/);
  assert.doesNotMatch(workflow, /benchmark:baseline:check/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /name: open-grid-baseline-\$\{\{ github\.sha \}\}/);
  assert.ok(workflow.indexOf("pnpm benchmark:build") < workflow.indexOf("pnpm benchmark:baseline:measure"));
});

test("baseline measurement balances target order and persists resumable profile checkpoints", () => {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const measure = manifest.scripts["benchmark:baseline:measure"];
  const resume = manifest.scripts["benchmark:baseline:resume"];

  assert.match(measure, /--profiles all --runs 12 --warmups 2/);
  assert.match(measure, /--checkpoint-dir \.benchmark-results\/baseline\/checkpoints/);
  assert.match(resume, /--profiles all --runs 12 --warmups 2/);
  assert.match(resume, /--checkpoint-dir \.benchmark-results\/baseline\/checkpoints --resume/);
  assert.doesNotMatch(resume, /benchmark:baseline:check/);
});

test("Open Grid runner isolates action timing from forced heap collection", () => {
  const runner = readFileSync(path.join(repoRoot, "scripts", "benchmark-runner.mjs"), "utf8");
  const timingRunStart = runner.indexOf("async function measureRun(");
  const heapRunStart = runner.indexOf("async function measureHeapAfterWorkload(");
  const timingRun = runner.slice(timingRunStart, heapRunStart);
  const heapRun = runner.slice(heapRunStart, runner.indexOf("async function measureActionDetails("));

  assert.match(runner, /const BENCHMARK_RUN_ATTEMPTS = 3/);
  assert.match(runner, /async function measureIsolatedRun/);
  assert.match(runner, /const activeHeapBrowser = await chromium\.launch/);
  assert.match(runner, /Retrying \$\{benchmarkTarget\.id\}\/\$\{profileId\}/);
  assert.match(runner, /await activeBrowser\.close\(\);[\s\S]*await activeHeapBrowser\.close\(\);/);
  assert.match(runner, /const HEAP_WORKLOAD_TIMEOUT_MS = 10 \* 60_000/);
  assert.match(runner, /const ISOLATED_RUN_TIMEOUT_MS = 12 \* 60_000/);
  assert.match(runner, /isolated benchmark run timed out/);
  assert.match(runner, /heap workload timed out/);
  assert.match(runner, /page\.waitForEvent\("crash", \{ timeout: 0 \}\)/);
  assert.match(runner, /heap workload renderer crashed/);
  assert.match(runner, /await browser\.close\(\);[\s\S]*browser = undefined;[\s\S]*Benchmark profile:/);
  assert.doesNotMatch(timingRun, /HeapProfiler\.collectGarbage/);
  assert.match(timingRun, /await context\.close\(\);[\s\S]*measureHeapAfterWorkload/);
  assert.match(heapRun, /HeapProfiler\.collectGarbage/);
  assert.match(heapRun, /driver\.version !== 15/);
  assert.match(heapRun, /\{ type: "columnVisibility", columnId: "column_10", visible: false \}/);
  assert.match(heapRun, /\{ type: "columnVisibility", columnId: "column_10", visible: true \}/);
  assert.match(heapRun, /\{ type: "columnSizing", columnId: "column_10", size: 200 \}/);
  assert.match(heapRun, /\{ type: "columnSizing", columnId: "column_10", size: 120 \}/);
  assert.match(heapRun, /\{ type: "columnOrdering", columnIds: createMovedColumnOrder\(columnCount\) \}/);
  assert.match(heapRun, /\{ type: "columnOrdering", columnIds: createDefaultColumnOrder\(columnCount\) \}/);
  assert.match(heapRun, /\{ type: "columnPinning", columnId: "column_10", pinned: true \}/);
  assert.match(heapRun, /\{ type: "columnPinning", columnId: "column_10", pinned: false \}/);
  assert.match(heapRun, /\{ type: "rowSelection", rowId: "row_0", selected: true \}/);
  assert.match(heapRun, /\{ type: "rowSelection", rowId: "row_0", selected: false \}/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnHide"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnRestore"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnResize"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnSizeRestore"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnMove"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnOrderRestore"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnPin"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "columnUnpin"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "rowSelect"\)/);
  assert.match(timingRun, /measureActionDetails\(page, cdp, "rowDeselect"\)/);
  assert.match(runner, /measurementPreparation: BENCHMARK_MEASUREMENT_PREPARATION/);
});

test("Open Grid task counters exclude the alignment frame", () => {
  const runner = readFileSync(path.join(repoRoot, "scripts", "benchmark-runner.mjs"), "utf8");
  const actionMeasurement = runner.slice(
    runner.indexOf("async function measureActionDetails("),
    runner.indexOf("function getBenchmarkActionContract("),
  );
  const runnerAlignment = actionMeasurement.indexOf("requestAnimationFrame");
  const runnerCounter = actionMeasurement.indexOf("const mainThreadTaskStartMs");

  assert.ok(runnerAlignment >= 0 && runnerCounter > runnerAlignment);
});
