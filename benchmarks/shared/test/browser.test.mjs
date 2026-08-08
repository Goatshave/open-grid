import assert from "node:assert/strict";
import test from "node:test";

import { BENCHMARK_DEFAULT_SEED } from "../index.mjs";
import { createBenchmarkInitializationTracker, getBenchmarkDeepScrollMinimum, getBenchmarkMainThreadDurationDeltasMs, getBenchmarkMainThreadTaskDeltaMs, getBenchmarkSnapshotRequirements, isBenchmarkActionComplete, measureFrameAlignedAction, measureFrameAlignedActionDetails, measureFrameAlignedScrollActionDetails, prepareBenchmarkEventActionMeasurement, readBenchmarkEventActionMeasurement, readBenchmarkEventPresentationTiming, readBenchmarkInitializationMetrics, readBenchmarkMainThreadDurationsMs, readBenchmarkMainThreadTaskMs, readBenchmarkPageConfig, toggleBenchmarkSort } from "../browser.mjs";

test("normalizes monotonic CDP main-thread task counters", () => {
  const metrics = { metrics: [
    { name: "TaskDuration", value: 0.0125 },
    { name: "ScriptDuration", value: 0.003 },
    { name: "RecalcStyleDuration", value: 0.001 },
    { name: "LayoutDuration", value: 0.002 },
    { name: "TaskOtherDuration", value: 0.004 },
    { name: "V8CompileDuration", value: 0.0005 },
  ] };
  assert.equal(readBenchmarkMainThreadTaskMs(metrics), 12.5);
  assert.deepEqual(readBenchmarkMainThreadDurationsMs(metrics), {
    task: 12.5,
    script: 3,
    style: 1,
    layout: 2,
    taskOther: 4,
    v8Compile: 0.5,
  });
  const deltas = getBenchmarkMainThreadDurationDeltasMs(
    { task: 12.5, script: 3, style: 1, layout: 2, taskOther: 4, v8Compile: 0.5 },
    { task: 18.75, script: 4, style: 1.5, layout: 2.75, taskOther: 7, v8Compile: 0.6 },
  );
  assert.deepEqual({ ...deltas, v8Compile: 0.1 }, {
    task: 6.25,
    script: 1,
    style: 0.5,
    layout: 0.75,
    taskOther: 3,
    v8Compile: 0.1,
  });
  assert.ok(Math.abs(deltas.v8Compile - 0.1) < 1e-12);
  assert.equal(getBenchmarkMainThreadTaskDeltaMs(12.5, 18.75), 6.25);
  assert.throws(() => readBenchmarkMainThreadTaskMs({ metrics: [] }), /one non-negative TaskDuration/);
  assert.throws(() => readBenchmarkMainThreadTaskMs({ metrics: [
    { name: "TaskDuration", value: 1 },
    { name: "TaskDuration", value: 2 },
  ] }), /one non-negative TaskDuration/);
  assert.throws(() => getBenchmarkMainThreadTaskDeltaMs(2, 1), /monotonic/);
});

test("reads a deterministic benchmark page configuration", () => {
  const defaults = readBenchmarkPageConfig("");
  assert.equal(defaults.profile.id, "standard-client");
  assert.equal(defaults.seed, BENCHMARK_DEFAULT_SEED);

  const selected = readBenchmarkPageConfig("?profile=wide-client&seed=42");
  assert.equal(selected.profile.id, "wide-client");
  assert.equal(selected.seed, 42);
});

test("rejects unknown profiles and malformed seeds", () => {
  assert.throws(() => readBenchmarkPageConfig("?profile=unknown"), /Unknown benchmark profile/);
  assert.throws(() => readBenchmarkPageConfig("?seed=-1"), /unsigned 32-bit integer/);
  assert.throws(() => readBenchmarkPageConfig("?seed=1.5"), /unsigned 32-bit integer/);
});

test("decomposes initialization through readiness and automation observation", () => {
  let now = 5;
  const tracker = createBenchmarkInitializationTracker({ now: () => now });
  now = 15;
  tracker.markDatasetReady();
  now = 20;
  tracker.markFingerprintReady();
  now = 40;
  tracker.markDriverInstalled();
  now = 72;
  const timing = tracker.markReady();

  assert.deepEqual(timing, {
    moduleStartMs: 5,
    datasetGenerationMs: 10,
    datasetFingerprintMs: 5,
    appSetupMs: 20,
    readinessFramesMs: 32,
    instrumentedReadyMs: 72,
  });
  assert.deepEqual(readBenchmarkInitializationMetrics(timing, 75), {
    initialPreModuleMs: 5,
    initialDatasetGenerationMs: 10,
    initialDatasetFingerprintMs: 5,
    initialAppSetupMs: 20,
    initialReadinessFramesMs: 32,
    initialInstrumentedReadyMs: 72,
    initialObservationDelayMs: 3,
  });
  assert.throws(() => tracker.markReady(), /already marked/);
});

test("rejects incomplete or inconsistent initialization timing", () => {
  let now = 1;
  const tracker = createBenchmarkInitializationTracker({ now: () => now });
  assert.throws(() => tracker.markFingerprintReady(), /dataset ready/);
  assert.throws(() => readBenchmarkInitializationMetrics({
    moduleStartMs: 1,
    datasetGenerationMs: 2,
    datasetFingerprintMs: 3,
    appSetupMs: 4,
    readinessFramesMs: 5,
    instrumentedReadyMs: 99,
  }, 100), /must sum/);
  now = -1;
  assert.throws(() => tracker.markDatasetReady(), /non-negative/);
});

test("toggles the benchmark sort through ascending and descending directions", () => {
  const originalWindow = globalThis.window;
  let sort = null;
  const calls = [];
  try {
    globalThis.window = {
      __OPEN_GRID_BENCHMARK__: {
        getSnapshot: () => ({ sort }),
        setSort: (columnId, direction) => {
          calls.push([columnId, direction]);
          sort = { columnId, direction };
        },
      },
    };

    toggleBenchmarkSort("column_5");
    toggleBenchmarkSort("column_5");

    assert.deepEqual(calls, [["column_5", "asc"], ["column_5", "desc"]]);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("scales the deep-scroll threshold to the available profile height", () => {
  assert.equal(getBenchmarkDeepScrollMinimum(1_000), 31_520);
  assert.equal(getBenchmarkDeepScrollMinimum(10_000), 96_000);
  assert.throws(() => getBenchmarkDeepScrollMinimum(0), /positive finite/);
});

test("limits commit polling snapshots to fields required by each action", () => {
  assert.deepEqual(getBenchmarkSnapshotRequirements({ type: "columnSizing", columnId: "column_10", size: 200 }), {
    sorting: false,
    filtering: false,
    visibleColumns: false,
    columnSize: true,
    columnOrder: false,
    columnPinning: false,
    selection: false,
    displayedRows: false,
    renderedRows: false,
    mountedCells: false,
    scrollPosition: false,
  });
  assert.deepEqual(getBenchmarkSnapshotRequirements({ type: "filter", value: "APAC" }), {
    sorting: false,
    filtering: true,
    visibleColumns: false,
    columnSize: false,
    columnOrder: false,
    columnPinning: false,
    selection: false,
    displayedRows: true,
    renderedRows: true,
    mountedCells: false,
    scrollPosition: false,
  });
  assert.ok(Object.values(getBenchmarkSnapshotRequirements()).every(Boolean));
});

test("aligns synchronous benchmark actions to a frame and observes the following paint", async () => {
  const callbacks = [];
  let now = 0;
  let actionTime = -1;
  const timing = {
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedAction(() => {
    actionTime = now;
  }, { timing });

  assert.equal(actionTime, -1);
  now = 16;
  flushFrame(callbacks, 16);
  assert.equal(actionTime, 16);
  now = 32;
  flushFrame(callbacks, 32);
  assert.equal(await measurement, 16);
});

test("waits for an action commit and then observes one additional paint", async () => {
  const callbacks = [];
  let now = 0;
  let complete = false;
  const timing = {
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedAction(() => undefined, { timing, isComplete: () => complete });

  now = 16;
  flushFrame(callbacks, now);
  now = 32;
  flushFrame(callbacks, now);
  complete = true;
  now = 48;
  flushFrame(callbacks, now);
  now = 64;
  flushFrame(callbacks, now);
  assert.equal(await measurement, 48);
});

test("records DOM mutation commit time separately from the following paint", async () => {
  const callbacks = [];
  const observationTarget = {};
  let now = 0;
  let complete = false;
  let observerCallback;
  let disconnected = false;
  const timing = {
    document: { documentElement: observationTarget },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedActionDetails(() => undefined, {
    timing,
    isComplete: () => complete,
    createMutationObserver: (callback) => {
      observerCallback = callback;
      return {
        observe: (target, options) => {
          assert.equal(target, observationTarget);
          assert.equal(options.subtree, true);
        },
        disconnect: () => {
          disconnected = true;
        },
      };
    },
  });

  now = 16;
  flushFrame(callbacks, now);
  complete = true;
  now = 20;
  observerCallback([], null);
  assert.equal(disconnected, true);
  now = 32;
  flushFrame(callbacks, now);
  flushFrame(callbacks, now);
  assert.deepEqual(await measurement, { commitMs: 4, paintMs: 16, completionSource: "mutation" });
});

test("separates scroll dispatch delay from event-to-commit and event-to-paint timing", async () => {
  const callbacks = [];
  const observationTarget = {};
  let now = 0;
  let complete = false;
  let observerCallback;
  let scrollCallback;
  const scrollElement = {
    addEventListener: (type, callback, options) => {
      assert.equal(type, "scroll");
      assert.deepEqual(options, { capture: true, once: true, passive: true });
      scrollCallback = callback;
    },
  };
  const timing = {
    document: { documentElement: observationTarget },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedScrollActionDetails(() => {
    now = 18;
    scrollCallback();
  }, {
    timing,
    scrollElement,
    isComplete: () => complete,
    createMutationObserver: (callback) => {
      observerCallback = callback;
      return { observe: () => undefined, disconnect: () => undefined };
    },
  });

  now = 16;
  flushFrame(callbacks, now);
  complete = true;
  now = 20;
  observerCallback([], null);
  now = 32;
  flushFrame(callbacks, now);
  flushFrame(callbacks, now);

  assert.deepEqual(await measurement, {
    commitMs: 4,
    paintMs: 16,
    completionSource: "mutation",
    scrollEventTiming: { dispatchMs: 2, commitMs: 2, paintMs: 14 },
  });
});

test("observes a paint after trusted UI events and rejects synthetic events", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalPerformance = globalThis.performance;
  const callbacks = [];
  let now = 5;
  let snapshot = benchmarkSnapshot({ mountedRowSignature: "before" });
  let eventListener;
  const target = {
    addEventListener: (_type, listener) => {
      eventListener = listener;
    },
    removeEventListener: () => undefined,
  };

  try {
    globalThis.window = {
      __OPEN_GRID_BENCHMARK__: { getSnapshot: () => snapshot },
    };
    globalThis.document = {
      documentElement: {},
      querySelector: () => target,
    };
    globalThis.MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    globalThis.requestAnimationFrame = (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    };
    globalThis.performance = { now: () => now };

    prepareBenchmarkEventActionMeasurement({
      action: { type: "sort", columnId: "column_5", direction: "asc" },
      selector: "button",
      eventType: "click",
    });
    snapshot = benchmarkSnapshot({
      mountedRowSignature: "after",
      sort: { columnId: "column_5", direction: "asc" },
    });
    eventListener({ isTrusted: true });
    const measurement = readBenchmarkEventActionMeasurement();
    let resolved = false;
    measurement.then(() => {
      resolved = true;
    });

    now = 16;
    flushFrame(callbacks, now);
    await Promise.resolve();
    assert.equal(resolved, false);
    now = 32;
    flushFrame(callbacks, now);
    assert.deepEqual(await measurement, {
      commitMs: 0,
      paintMs: 27,
      completionSource: "synchronous",
      eventType: "click",
    });

    const serializedPrepare = (0, eval)(`(${prepareBenchmarkEventActionMeasurement.toString()})`);
    const defaultColumnOrder = benchmarkSnapshot().columnOrderIds;
    const movedColumnOrder = [...defaultColumnOrder.slice(0, 2), "column_10", ...defaultColumnOrder.slice(2, 10), ...defaultColumnOrder.slice(11)];
    snapshot = benchmarkSnapshot();
    serializedPrepare({
      action: { type: "columnOrdering", columnIds: movedColumnOrder },
      selector: "button",
      eventType: "click",
    });
    snapshot = benchmarkSnapshot({ visibleColumnIds: movedColumnOrder, columnOrderIds: movedColumnOrder });
    eventListener({ isTrusted: true });
    const serializedMeasurement = readBenchmarkEventActionMeasurement();
    now = 48;
    flushFrame(callbacks, now);
    now = 64;
    flushFrame(callbacks, now);
    assert.deepEqual(await serializedMeasurement, {
      commitMs: 0,
      paintMs: 32,
      completionSource: "synchronous",
      eventType: "click",
    });

    snapshot = benchmarkSnapshot({ mountedRowSignature: "before" });
    prepareBenchmarkEventActionMeasurement({
      action: { type: "sort", columnId: "column_5", direction: "asc" },
      selector: "button",
      eventType: "click",
    });
    eventListener({ isTrusted: false });
    await assert.rejects(readBenchmarkEventActionMeasurement(), /trusted browser event/);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.MutationObserver = originalMutationObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.performance = originalPerformance;
  }
});

test("normalizes matching PerformanceEventTiming presentation components", () => {
  assert.deepEqual(readBenchmarkEventPresentationTiming({
    name: "click",
    startTime: 5,
    duration: 32,
    processingStart: 6,
    processingEnd: 10,
    interactionId: 42,
  }, "click", 5.5), {
    durationMs: 32,
    inputDelayMs: 1,
    processingDurationMs: 4,
    presentationDelayMs: 27,
    interactionId: 42,
    source: "event-timing",
  });
  assert.equal(readBenchmarkEventPresentationTiming({
    name: "pointerup",
    startTime: 5,
    duration: 32,
    processingStart: 6,
    processingEnd: 10,
    interactionId: 42,
  }, "click", 5), null);
  assert.throws(() => readBenchmarkEventPresentationTiming({
    name: "click",
    startTime: 5,
    duration: 4,
    processingStart: 6,
    processingEnd: 10,
    interactionId: 42,
  }, "click", 5), /include presentation delay/);
  assert.throws(() => readBenchmarkEventPresentationTiming({
    name: "click",
    startTime: 5,
    duration: 32,
    processingStart: 6,
    processingEnd: 10,
    interactionId: 0,
  }, "click", 5), /positive integer/);
});

test("arms Event Timing before a trusted click and waits for its next-paint entry", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;
  const originalPerformanceObserver = globalThis.PerformanceObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalPerformance = globalThis.performance;
  const callbacks = [];
  let now = 5;
  let snapshot = benchmarkSnapshot({ mountedRowSignature: "before" });
  let eventListener;
  let eventTimingCallback;
  let eventTimingOptions;
  const target = {
    addEventListener: (_type, listener) => {
      eventListener = listener;
    },
    removeEventListener: () => undefined,
  };

  try {
    globalThis.window = {
      __OPEN_GRID_BENCHMARK__: { getSnapshot: () => snapshot },
    };
    globalThis.document = { documentElement: {}, querySelector: () => target };
    globalThis.MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    globalThis.PerformanceObserver = class {
      static supportedEntryTypes = ["event"];
      constructor(callback) {
        eventTimingCallback = callback;
      }
      observe(options) {
        eventTimingOptions = options;
      }
      disconnect() {}
    };
    globalThis.requestAnimationFrame = (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    };
    globalThis.performance = { now: () => now };

    prepareBenchmarkEventActionMeasurement({
      action: { type: "sort", columnId: "column_5", direction: "asc" },
      selector: "button",
      eventType: "click",
      captureEventTiming: true,
    });
    assert.deepEqual(eventTimingOptions, { type: "event", buffered: false, durationThreshold: 16 });
    snapshot = benchmarkSnapshot({
      mountedRowSignature: "after",
      sort: { columnId: "column_5", direction: "asc" },
    });
    eventListener({ isTrusted: true, timeStamp: 5 });
    const measurement = readBenchmarkEventActionMeasurement();
    let resolved = false;
    measurement.then(() => {
      resolved = true;
    });

    now = 16;
    flushFrame(callbacks, now);
    now = 32;
    flushFrame(callbacks, now);
    await Promise.resolve();
    assert.equal(resolved, false);
    eventTimingCallback({
      getEntries: () => [{
        name: "click",
        startTime: 5,
        duration: 32,
        processingStart: 6,
        processingEnd: 10,
        interactionId: 42,
      }],
    });
    assert.deepEqual(await measurement, {
      commitMs: 0,
      paintMs: 27,
      completionSource: "synchronous",
      eventType: "click",
      presentationTiming: {
        durationMs: 32,
        inputDelayMs: 1,
        processingDurationMs: 4,
        presentationDelayMs: 27,
        interactionId: 42,
        source: "event-timing",
      },
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.MutationObserver = originalMutationObserver;
    globalThis.PerformanceObserver = originalPerformanceObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.performance = originalPerformance;
  }
});

test("recognizes committed benchmark action state and rendered rows", () => {
  const before = snapshot({ firstMountedRowId: "row-1", mountedRowSignature: "row-1|row-2" });
  assert.equal(isBenchmarkActionComplete(before, snapshot({
    firstMountedRowId: "row-2",
    mountedRowSignature: "row-2|row-3",
    sort: { columnId: "column_5", direction: "asc" },
  }), { type: "sort", columnId: "column_5", direction: "asc" }), true);
  assert.equal(isBenchmarkActionComplete(before, snapshot({
    firstMountedRowId: "row-1",
    mountedRowSignature: "row-1|row-2",
    sort: { columnId: "column_5", direction: "asc" },
  }), { type: "sort", columnId: "column_5", direction: "asc" }), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ sort: { columnId: "column_5", direction: "asc" } }),
    snapshot({
      firstMountedRowId: "row-9",
      mountedRowSignature: "row-9|row-8",
      sort: { columnId: "column_5", direction: "desc" },
    }),
    { type: "sort", columnId: "column_5", direction: "desc" },
  ), true);
  assert.equal(isBenchmarkActionComplete(before, snapshot({
    displayedRowCount: 250,
    filter: "Blocked",
    firstMountedRowId: "row-7",
    mountedRowSignature: "row-7|row-9",
  }), { type: "filter", value: "Blocked" }), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ displayedRowCount: 250, filter: "APAC", firstMountedRowId: "row-7", mountedRowSignature: "row-7|row-9" }),
    snapshot({ displayedRowCount: 300, filter: "EMEA", firstMountedRowId: "row-8", mountedRowSignature: "row-8|row-10" }),
    { type: "filter", value: "EMEA" },
  ), true);
  assert.equal(isBenchmarkActionComplete(before, snapshot({
    displayedRowCount: 250,
    columnFilter: { columnId: "column_2", value: "Blocked" },
    firstMountedRowId: "row-7",
    mountedRowSignature: "row-7|row-9",
  }), { type: "columnFilter", columnId: "column_2", value: "Blocked" }), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ displayedRowCount: 80, columnFilter: { columnId: "column_2", value: "Blocked" }, firstMountedRowId: "row-7", mountedRowSignature: "row-7|row-9" }),
    snapshot({ displayedRowCount: 90, columnFilter: { columnId: "column_2", value: "Complete" }, firstMountedRowId: "row-8", mountedRowSignature: "row-8|row-10" }),
    { type: "columnFilter", columnId: "column_2", value: "Complete" },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({
      visibleColumnCount: 19,
      visibleColumnIds: Array.from({ length: 20 }, (_, index) => `column_${index}`).filter((columnId) => columnId !== "column_10"),
    }),
    { type: "columnVisibility", columnId: "column_10", visible: false },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ visibleColumnCount: 19, visibleColumnIds: snapshot().visibleColumnIds }),
    { type: "columnVisibility", columnId: "column_10", visible: false },
  ), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({
      visibleColumnCount: 19,
      visibleColumnIds: Array.from({ length: 20 }, (_, index) => `column_${index}`).filter((columnId) => columnId !== "column_10"),
    }),
    snapshot(),
    { type: "columnVisibility", columnId: "column_10", visible: true },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ columnSize: { columnId: "column_10", size: 200 } }),
    { type: "columnSizing", columnId: "column_10", size: 200 },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot(),
    { type: "columnSizing", columnId: "column_10", size: 200 },
  ), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ columnSize: { columnId: "column_10", size: 200 } }),
    snapshot(),
    { type: "columnSizing", columnId: "column_10", size: 120 },
  ), true);
  const movedColumnOrder = [...snapshot().columnOrderIds.slice(0, 2), "column_10", ...snapshot().columnOrderIds.slice(2, 10), ...snapshot().columnOrderIds.slice(11)];
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ visibleColumnIds: movedColumnOrder, columnOrderIds: movedColumnOrder }),
    { type: "columnOrdering", columnIds: movedColumnOrder },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ columnOrderIds: movedColumnOrder }),
    { type: "columnOrdering", columnIds: movedColumnOrder },
  ), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ visibleColumnIds: movedColumnOrder, columnOrderIds: movedColumnOrder }),
    snapshot(),
    { type: "columnOrdering", columnIds: snapshot().columnOrderIds },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ columnPinning: { left: ["column_10"], right: [] } }),
    { type: "columnPinning", columnId: "column_10", pinned: true },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot(),
    { type: "columnPinning", columnId: "column_10", pinned: true },
  ), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ columnPinning: { left: ["column_10"], right: [] } }),
    snapshot(),
    { type: "columnPinning", columnId: "column_10", pinned: false },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ selectedRowIds: ["row_0"], selectedRowCount: 1 }),
    { type: "rowSelection", rowId: "row_0", selected: true },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ selectedRowIds: ["row_0"], selectedRowCount: 1 }),
    snapshot(),
    { type: "rowSelection", rowId: "row_0", selected: false },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({ selectedRowCount: 1_000, allRowsSelected: true }),
    { type: "allRowSelection", selected: true },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ selectedRowCount: 1_000, allRowsSelected: true }),
    snapshot(),
    { type: "allRowSelection", selected: false },
  ), true);
  const multiSortRules = [
    { columnId: "column_2", direction: "asc" },
    { columnId: "column_5", direction: "asc" },
  ];
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({
      firstMountedRowId: "row-8",
      mountedRowSignature: "row-8|row-9",
      sort: multiSortRules[0],
      sorting: multiSortRules,
    }),
    { type: "multiSort", rules: multiSortRules },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ sort: multiSortRules[0], sorting: multiSortRules }),
    snapshot(),
    { type: "multiSort", rules: [] },
  ), true);
  const multiFilterRules = [
    { columnId: "column_2", value: "Blocked" },
    { columnId: "column_4", value: "APAC" },
  ];
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({
      displayedRowCount: 63,
      firstMountedRowId: "row-12",
      mountedRowSignature: "row-12|row-28",
      columnFilter: multiFilterRules[0],
      columnFilters: multiFilterRules,
    }),
    { type: "multiFilter", rules: multiFilterRules },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot(),
    snapshot({
      displayedRowCount: 63,
      firstMountedRowId: "row-12",
      mountedRowSignature: "row-12|row-28",
      columnFilter: multiFilterRules[1],
      columnFilters: [...multiFilterRules].reverse(),
    }),
    { type: "multiFilter", rules: multiFilterRules },
  ), false);
  assert.equal(isBenchmarkActionComplete(
    snapshot({
      displayedRowCount: 63,
      firstMountedRowId: "row-12",
      mountedRowSignature: "row-12|row-28",
      columnFilter: multiFilterRules[0],
      columnFilters: multiFilterRules,
    }),
    snapshot(),
    { type: "multiFilter", rules: [] },
  ), true);
  assert.equal(isBenchmarkActionComplete(
    snapshot({ displayedRowCount: 250, columnFilter: { columnId: "column_2", value: "Blocked" }, columnFilters: [{ columnId: "column_2", value: "Blocked" }], firstMountedRowId: "row-7", mountedRowSignature: "row-7|row-9" }),
    snapshot({ firstMountedRowId: "row-1" }),
    { type: "clear" },
  ), true);
  assert.equal(isBenchmarkActionComplete(before, snapshot({
    firstMountedRowId: "row-50",
    mountedRowSignature: "row-50|row-51",
    scrollTop: 2_000,
    scrollLeft: 600,
  }), { type: "scroll", top: 2_000, left: 600 }), true);
});

test("rejects invalid frame timing contracts and action failures", async () => {
  assert.throws(() => measureFrameAlignedAction(null), /action must be a function/);
  assert.throws(() => measureFrameAlignedAction(() => undefined, { timing: {} }), /timing requires/);
  const validTiming = { performance: { now: () => 0 }, requestAnimationFrame: () => 1 };
  assert.throws(() => measureFrameAlignedAction(() => undefined, { timing: validTiming, isComplete: true }), /completion check/);
  assert.throws(() => measureFrameAlignedAction(() => undefined, { timing: validTiming, frameLimit: 0 }), /frame limit/);
  assert.throws(() => measureFrameAlignedScrollActionDetails(() => undefined, { timing: validTiming }), /element is required/);

  const callbacks = [];
  const timing = {
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedAction(() => {
    throw new Error("action failed");
  }, { timing });
  flushFrame(callbacks, 16);
  await assert.rejects(measurement, /action failed/);
});

test("rejects actions that do not commit before the frame limit", async () => {
  const callbacks = [];
  const timing = {
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    },
  };
  const measurement = measureFrameAlignedAction(() => undefined, {
    timing,
    isComplete: () => false,
    frameLimit: 2,
  });
  flushFrame(callbacks, 16);
  flushFrame(callbacks, 32);
  flushFrame(callbacks, 48);
  await assert.rejects(measurement, /did not commit within 2 frames/);
});

function snapshot(overrides = {}) {
  return {
    implementation: "open-grid",
    profileId: "standard-client",
    rowCount: 1_000,
    columnCount: 20,
    visibleColumnCount: 20,
    visibleColumnIds: Array.from({ length: 20 }, (_, index) => `column_${index}`),
    columnSize: { columnId: "column_10", size: 120 },
    columnOrderIds: Array.from({ length: 20 }, (_, index) => `column_${index}`),
    columnPinning: { left: [], right: [] },
    selectedRowIds: [],
    selectedRowCount: 0,
    allRowsSelected: false,
    displayedRowCount: 1_000,
    mountedRowCount: 20,
    mountedCellCount: 400,
    firstMountedRowId: "row-1",
    mountedRowSignature: "row-1|row-2",
    sort: null,
    sorting: [],
    filter: "",
    columnFilter: null,
    columnFilters: [],
    scrollTop: 0,
    scrollLeft: 0,
    ...overrides,
  };
}

function flushFrame(callbacks, timestamp) {
  const callback = callbacks.shift();
  assert.ok(callback, "expected a queued animation frame");
  callback(timestamp);
}

function benchmarkSnapshot(overrides = {}) {
  return {
    rowCount: 1_000,
    columnCount: 20,
    visibleColumnCount: 20,
    visibleColumnIds: Array.from({ length: 20 }, (_, index) => `column_${index}`),
    columnSize: { columnId: "column_10", size: 120 },
    columnOrderIds: Array.from({ length: 20 }, (_, index) => `column_${index}`),
    columnPinning: { left: [], right: [] },
    selectedRowIds: [],
    selectedRowCount: 0,
    allRowsSelected: false,
    displayedRowCount: 1_000,
    mountedRowSignature: "row-1|row-2",
    sort: null,
    sorting: [],
    filter: "",
    columnFilter: null,
    ...overrides,
  };
}
