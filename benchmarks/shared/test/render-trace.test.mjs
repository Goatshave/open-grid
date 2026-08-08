import assert from "node:assert/strict";
import test from "node:test";
import {
  BENCHMARK_RENDER_TRACE_ACTIONS,
  BENCHMARK_RENDER_TRACE_SCHEMA_VERSION,
  createBenchmarkRenderTraceAction,
  createBenchmarkTimingActionPrefix,
  formatBenchmarkRenderTraceMarkdown,
  summarizeBenchmarkMainThreadTrace,
  summarizeBenchmarkPerformanceTiming,
  summarizeBenchmarkRenderTrace,
  summarizeBenchmarkTaskTiming,
} from "../render-trace.mjs";

test("summarizes canonical browser lifecycle trace phases per iteration", () => {
  const summary = summarizeBenchmarkRenderTrace([
    { name: "FunctionCall", ph: "X", dur: 4_000 },
    { name: "FunctionCall", ph: "X", dur: 2_000 },
    { name: "UpdateLayoutTree", ph: "X", dur: 1_000 },
    { name: "Layout", ph: "X", dur: 3_000 },
    { name: "Paint", ph: "X", dur: 5_000 },
    { name: "PrePaint", ph: "X", dur: 2_000 },
    { name: "Layerize", ph: "X", dur: 1_000 },
    { name: "Paint", ph: "B", dur: 100_000 },
    { name: "Unrelated", ph: "X", dur: 100_000 },
  ], 2);

  assert.deepEqual(summary.javascript, {
    eventName: "FunctionCall",
    count: 2,
    totalMs: 6,
    perIterationMs: 3,
    maxMs: 4,
  });
  assert.equal(summary.style.perIterationMs, 0.5);
  assert.equal(summary.layout.perIterationMs, 1.5);
  assert.equal(summary.paint.perIterationMs, 2.5);
  assert.equal(summary.prePaint.perIterationMs, 1);
  assert.equal(summary.layerize.perIterationMs, 0.5);
});

test("rejects malformed trace input and formats a diagnostic report", () => {
  assert.throws(() => summarizeBenchmarkRenderTrace({}, 2), /must be an array/u);
  assert.throws(() => summarizeBenchmarkRenderTrace([], 0), /positive safe integer/u);
  assert.throws(() => summarizeBenchmarkRenderTrace([{ name: "Paint", ph: "X", dur: -1 }], 1), /non-negative finite/u);

  const phases = summarizeBenchmarkRenderTrace([], 2);
  const mainThread = summarizeBenchmarkMainThreadTrace([
    { ph: "M", name: "thread_name", pid: 1, tid: 2, args: { name: "CrRendererMain" } },
    { ph: "X", name: "RunTask", pid: 1, tid: 2, ts: 0, dur: 4_000 },
  ], 2);
  const markdown = formatBenchmarkRenderTraceMarkdown({
    schemaVersion: BENCHMARK_RENDER_TRACE_SCHEMA_VERSION,
    createdAt: "2026-07-25T00:00:00.000Z",
    status: "diagnostic",
    config: {
      profileId: "standard-client",
      action: "columnVisibility",
      trigger: "trusted",
      preparation: "timing-prefix",
      capture: "trace",
      viewport: { width: 1280, height: 800 },
      targetOrder: ["open-grid"],
      warmups: 2,
      iterations: 2,
    },
    environment: {
      browser: "Chromium 1",
      sourceFingerprint: "sha256:test",
    },
    implementations: [
      {
        id: "open-grid",
        datasetFingerprint: "dataset",
        phases,
        mainThread,
        taskTiming: summarizeBenchmarkTaskTiming([2, 3], 6, 2, ["hide", "restore"]),
        performanceTiming: summarizeBenchmarkPerformanceTiming([
          { task: 2, script: 0.8, style: 0.2, layout: 0.3, taskOther: 0.6, v8Compile: 0.1 },
          { task: 3, script: 1, style: 0.3, layout: 0.4, taskOther: 1, v8Compile: 0.1 },
        ], 2, ["hide", "restore"]),
      },
    ],
  });

  assert.match(markdown, /Open Grid Browser Render Trace/u);
  assert.match(markdown, /columnVisibility/u);
  assert.match(markdown, /0\.000ms/u);
  assert.match(markdown, /Action task/u);
  assert.match(markdown, /CDP script/u);
  assert.match(markdown, /one CDP counter boundary/u);
});

test("attributes renderer main-thread tasks without double-counting lifecycle overlap", () => {
  const summary = summarizeBenchmarkMainThreadTrace([
    { ph: "M", name: "thread_name", pid: 10, tid: 20, args: { name: "CrRendererMain" } },
    { ph: "M", name: "thread_name", pid: 10, tid: 21, args: { name: "Compositor" } },
    { ph: "X", name: "RunTask", pid: 10, tid: 20, ts: 0, dur: 10_000 },
    { ph: "X", name: "EventDispatch", pid: 10, tid: 20, ts: 1_000, dur: 6_000 },
    { ph: "X", name: "FunctionCall", pid: 10, tid: 20, ts: 2_000, dur: 4_000 },
    { ph: "X", name: "UpdateLayoutTree", pid: 10, tid: 20, ts: 5_000, dur: 2_000 },
    { ph: "X", name: "Paint", pid: 10, tid: 20, ts: 8_000, dur: 1_000 },
    { ph: "X", name: "RunTask", pid: 10, tid: 21, ts: 0, dur: 100_000 },
  ], 2);

  assert.deepEqual(summary.thread, { pid: 10, tid: 20, name: "CrRendererMain" });
  assert.equal(summary.tasks.totalMs, 10);
  assert.equal(summary.tasks.perIterationMs, 5);
  assert.equal(summary.taskSelfMs, 3);
  assert.equal(summary.lifecycleUnionMs, 6);
  assert.equal(summary.outsideLifecycleMs, 4);
  assert.deepEqual(summary.topSelfEvents.slice(0, 2), [
    { eventName: "FunctionCall", count: 1, totalMs: 4, perIterationMs: 2 },
    { eventName: "UpdateLayoutTree", count: 1, totalMs: 2, perIterationMs: 1 },
  ]);
  assert.throws(() => summarizeBenchmarkMainThreadTrace([], 1), /main-thread metadata/u);
  assert.throws(() => summarizeBenchmarkMainThreadTrace([
    { ph: "M", name: "thread_name", pid: 1, tid: 2, args: { name: "CrRendererMain" } },
  ], 1), /task events/u);
});

test("summarizes exact trusted-action task boundaries separately from capture overhead", () => {
  assert.deepEqual(summarizeBenchmarkTaskTiming([4, 2, 3, 9], 20, 4, ["hide", "restore", "hide", "restore"]), {
    actionCount: 4,
    actionTotalMs: 18,
    actionPerIterationMs: 4.5,
    actionMedianMs: 3,
    actionP95Ms: 9,
    captureTotalMs: 20,
    outsideActionsMs: 2,
    outsideActionsPerIterationMs: 0.5,
    groups: [
      { id: "hide", count: 2, totalMs: 7, perActionMs: 3.5, medianMs: 3, p95Ms: 4 },
      { id: "restore", count: 2, totalMs: 11, perActionMs: 5.5, medianMs: 2, p95Ms: 9 },
    ],
  });
  assert.throws(() => summarizeBenchmarkTaskTiming([1], 2, 2), /one non-negative/u);
  assert.throws(() => summarizeBenchmarkTaskTiming([1, 2], 3, 2, ["hide"]), /action labels/u);
});

test("summarizes CDP action performance counters and groups", () => {
  const summary = summarizeBenchmarkPerformanceTiming([
    { task: 4, script: 1, style: 0.2, layout: 0.4, taskOther: 2, v8Compile: 0.1 },
    { task: 3, script: 0.8, style: 0.1, layout: 0.3, taskOther: 1.5, v8Compile: 0 },
    { task: 6, script: 2, style: 0.4, layout: 0.6, taskOther: 2.5, v8Compile: 0.2 },
    { task: 2, script: 0.6, style: 0.1, layout: 0.2, taskOther: 1, v8Compile: 0 },
  ], 4, ["pin", "unpin", "pin", "unpin"]);

  assert.deepEqual(summary.metrics.task, {
    totalMs: 15,
    perActionMs: 3.75,
    medianMs: 3,
    p95Ms: 6,
  });
  assert.equal(summary.groups[0].id, "pin");
  assert.equal(summary.groups[0].metrics.script.medianMs, 1);
  assert.equal(summary.groups[1].metrics.task.p95Ms, 3);
  assert.throws(() => summarizeBenchmarkPerformanceTiming([{ task: 1 }], 1), /complete non-negative/u);
  assert.throws(() => summarizeBenchmarkPerformanceTiming([], 0), /positive safe integer|complete non-negative/u);
});

test("creates alternating render-trace actions that restore every benchmark state", () => {
  assert.deepEqual(BENCHMARK_RENDER_TRACE_ACTIONS, [
    "columnVisibility",
    "columnSizing",
    "columnFilter",
    "columnPinning",
    "columnLayoutWorkflow",
    "rowSelection",
    "deepScroll",
  ]);
  assert.deepEqual(createBenchmarkRenderTraceAction("columnFilter", 0), { type: "columnFilter", columnId: "column_2", value: "Blocked" });
  assert.deepEqual(createBenchmarkRenderTraceAction("columnFilter", 1), { type: "clear" });
  assert.deepEqual(createBenchmarkRenderTraceAction("columnPinning", 0), { type: "columnPinning", columnId: "column_10", pinned: true });
  assert.deepEqual(createBenchmarkRenderTraceAction("columnPinning", 1), { type: "columnPinning", columnId: "column_10", pinned: false });
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => createBenchmarkRenderTraceAction("columnLayoutWorkflow", index, 48_000, 12)),
    [
      { type: "columnOrdering", columnIds: ["column_0", "column_1", "column_10", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8", "column_9", "column_11"], traceLabel: "move" },
      { type: "columnSizing", columnId: "column_10", size: 200, traceLabel: "resize" },
      { type: "columnPinning", columnId: "column_10", pinned: true, traceLabel: "pin" },
      { type: "columnVisibility", columnId: "column_10", visible: false, traceLabel: "hide" },
      { type: "columnVisibility", columnId: "column_10", visible: true, traceLabel: "show" },
      { type: "columnPinning", columnId: "column_10", pinned: false, traceLabel: "unpin" },
      { type: "columnSizing", columnId: "column_10", size: 120, traceLabel: "sizeRestore" },
      { type: "columnOrdering", columnIds: ["column_0", "column_1", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8", "column_9", "column_10", "column_11"], traceLabel: "orderRestore" },
    ],
  );
  assert.deepEqual(createBenchmarkRenderTraceAction("deepScroll", 0, 48_000), { type: "scroll", top: 48_000, left: 0 });
  assert.deepEqual(createBenchmarkRenderTraceAction("deepScroll", 1, 48_000), { type: "scroll", top: 0, left: 0 });
  assert.throws(() => createBenchmarkRenderTraceAction("unknown", 0), /unsupported/u);
  assert.throws(() => createBenchmarkRenderTraceAction("columnVisibility", -1), /non-negative/u);
  assert.throws(() => createBenchmarkRenderTraceAction("deepScroll", 0, 0), /positive/u);
});

test("creates exact timing-runner prefixes for layout actions", () => {
  const visibility = createBenchmarkTimingActionPrefix("columnVisibility", 20);
  const sizing = createBenchmarkTimingActionPrefix("columnSizing", 20);
  const pinning = createBenchmarkTimingActionPrefix("columnPinning", 20);
  const layoutWorkflow = createBenchmarkTimingActionPrefix("columnLayoutWorkflow", 20);
  const selection = createBenchmarkTimingActionPrefix("rowSelection", 20);

  assert.equal(visibility.length, 18);
  assert.deepEqual(sizing.slice(-2).map((entry) => entry.action), [
    { type: "columnVisibility", columnId: "column_10", visible: false },
    { type: "columnVisibility", columnId: "column_10", visible: true },
  ]);
  assert.equal(pinning.length, 24);
  assert.deepEqual(pinning.slice(-2).map((entry) => entry.action.columnIds), [
    ["column_0", "column_1", "column_10", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8", "column_9", "column_11", "column_12", "column_13", "column_14", "column_15", "column_16", "column_17", "column_18", "column_19"],
    ["column_0", "column_1", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8", "column_9", "column_10", "column_11", "column_12", "column_13", "column_14", "column_15", "column_16", "column_17", "column_18", "column_19"],
  ]);
  assert.equal(layoutWorkflow.length, 26);
  assert.deepEqual(layoutWorkflow.slice(-2).map((entry) => entry.action), [
    { type: "columnPinning", columnId: "column_10", pinned: true },
    { type: "columnPinning", columnId: "column_10", pinned: false },
  ]);
  assert.equal(selection.length, 34);
  assert.deepEqual(selection.at(-1).action.columnIds, pinning.at(-1).action.columnIds);
  assert.throws(() => createBenchmarkTimingActionPrefix("deepScroll", 20), /does not support/u);
  assert.throws(() => createBenchmarkTimingActionPrefix("columnPinning", 10), /greater than 10/u);
});
