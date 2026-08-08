import { BENCHMARK_DEFAULT_SEED, getBenchmarkProfile } from "./index.mjs";

const DEFAULT_PROFILE_ID = "standard-client";
export const BENCHMARK_DEEP_SCROLL_TOP = 120_000;

const DEFAULT_ACTION_FRAME_LIMIT = 120;
const EVENT_TIMING_DURATION_THRESHOLD_MS = 16;
const EVENT_TIMING_START_TOLERANCE_MS = 2;
const MAIN_THREAD_DURATION_METRICS = Object.freeze({
  task: "TaskDuration",
  script: "ScriptDuration",
  style: "RecalcStyleDuration",
  layout: "LayoutDuration",
  taskOther: "TaskOtherDuration",
  v8Compile: "V8CompileDuration",
});

export function readBenchmarkMainThreadTaskMs(protocolMetrics) {
  return readBenchmarkMainThreadDurationsMs(protocolMetrics).task;
}

export function readBenchmarkMainThreadDurationsMs(protocolMetrics) {
  const metrics = protocolMetrics?.metrics;
  if (!Array.isArray(metrics)) {
    throw new TypeError("benchmark performance metrics must contain a metrics array");
  }
  const result = {};
  for (const [field, metricName] of Object.entries(MAIN_THREAD_DURATION_METRICS)) {
    const matches = metrics.filter((metric) => metric?.name === metricName);
    if (matches.length !== 1 || !Number.isFinite(matches[0].value) || matches[0].value < 0) {
      throw new TypeError(`benchmark performance metrics must contain one non-negative ${metricName}`);
    }
    result[field] = matches[0].value * 1_000;
  }
  return result;
}

export function getBenchmarkMainThreadTaskDeltaMs(startMs, endMs) {
  if (![startMs, endMs].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new TypeError("benchmark main-thread task counters must be non-negative finite numbers");
  }
  if (endMs < startMs) {
    throw new RangeError("benchmark main-thread task counter must be monotonic");
  }
  return endMs - startMs;
}

export function getBenchmarkMainThreadDurationDeltasMs(start, end) {
  const result = {};
  for (const field of Object.keys(MAIN_THREAD_DURATION_METRICS)) {
    result[field] = getBenchmarkMainThreadTaskDeltaMs(start?.[field], end?.[field]);
  }
  return result;
}

export function measureFrameAlignedAction(run, options = {}) {
  return measureFrameAlignedActionDetails(run, options).then((measurement) => measurement.paintMs);
}

export function measureFrameAlignedActionDetails(run, options = {}) {
  if (typeof run !== "function") {
    throw new TypeError("benchmark action must be a function");
  }
  const timing = options.timing ?? globalThis;
  const isComplete = options.isComplete ?? (() => true);
  const frameLimit = options.frameLimit ?? DEFAULT_ACTION_FRAME_LIMIT;
  if (typeof timing.requestAnimationFrame !== "function" || typeof timing.performance?.now !== "function") {
    throw new TypeError("benchmark timing requires requestAnimationFrame and performance.now");
  }
  if (typeof isComplete !== "function") {
    throw new TypeError("benchmark completion check must be a function");
  }
  if (!Number.isSafeInteger(frameLimit) || frameLimit < 1) {
    throw new RangeError("benchmark frame limit must be a positive integer");
  }

  const createMutationObserver = options.createMutationObserver ?? defaultMutationObserverFactory();
  const observationTarget = options.observationTarget ?? timing.document?.documentElement ?? globalThis.document?.documentElement ?? null;
  if (createMutationObserver !== null && typeof createMutationObserver !== "function") {
    throw new TypeError("benchmark mutation observer factory must be a function or null");
  }

  return new Promise((resolve, reject) => {
    timing.requestAnimationFrame(() => {
      const start = timing.performance.now();
      let commitMs = null;
      let settled = false;
      let observer = null;

      const cleanup = () => observer?.disconnect();
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const checkCompletion = (completionSource) => {
        if (settled || commitMs !== null) return false;
        const observedAt = timing.performance.now();
        let complete;
        try {
          complete = isComplete();
        } catch (error) {
          fail(error);
          return false;
        }
        if (!complete) return false;
        commitMs = observedAt - start;
        cleanup();
        timing.requestAnimationFrame(() => {
          if (settled) return;
          settled = true;
          resolve({
            commitMs,
            paintMs: timing.performance.now() - start,
            completionSource,
          });
        });
        return true;
      };

      if (createMutationObserver && observationTarget) {
        try {
          observer = createMutationObserver(() => {
            observer?.disconnect();
            checkCompletion("mutation");
          });
          if (!observer || typeof observer.observe !== "function" || typeof observer.disconnect !== "function") {
            throw new TypeError("benchmark mutation observer factory must return an observer");
          }
          observer.observe(observationTarget, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
          });
        } catch (error) {
          fail(error);
          return;
        }
      }

      try {
        run(start);
      } catch (error) {
        fail(error);
        return;
      }

      if (checkCompletion("synchronous")) return;

      let observedFrames = 0;
      const pollCompletion = () => timing.requestAnimationFrame(() => {
        if (settled || commitMs !== null) return;
        observedFrames += 1;
        if (!checkCompletion("frame")) {
          if (observedFrames >= frameLimit) {
            fail(new Error(`benchmark action did not commit within ${frameLimit} frames`));
            return;
          }
          pollCompletion();
        }
      });
      pollCompletion();
    });
  });
}

export function measureFrameAlignedScrollActionDetails(run, options = {}) {
  const timing = options.timing ?? globalThis;
  const scrollElement = options.scrollElement;
  if (!scrollElement) throw new TypeError("benchmark scroll element is required");

  let actionStartedAt = null;
  let scrollEventAt = null;
  scrollElement.addEventListener("scroll", () => {
    scrollEventAt = timing.performance.now();
  }, { capture: true, once: true, passive: true });

  return measureFrameAlignedActionDetails((startedAt) => {
    actionStartedAt = startedAt;
    run();
  }, {
    ...options,
  }).then((measurement) => {
    if (scrollEventAt === null) throw new Error("benchmark scroll event missing");
    const dispatchMs = scrollEventAt - actionStartedAt;
    return {
      ...measurement,
      scrollEventTiming: {
        dispatchMs,
        commitMs: measurement.commitMs - dispatchMs,
        paintMs: measurement.paintMs - dispatchMs,
      },
    };
  });
}

export function prepareBenchmarkEventActionMeasurement({ action, selector, eventType, frameLimit = 120, captureEventTiming = false }) {
  const durationThresholdMs = 16;
  const startToleranceMs = 2;
  // Playwright serializes this function without its module scope, so completion
  // logic used here must remain self-contained.
  const equalArrays = (left, right) => Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
  const hasDefaultColumnOrder = (columnIds) => Array.isArray(columnIds)
    && columnIds.length > 0
    && columnIds.every((columnId, index) => columnId === `column_${index}`);
  const equalSortRules = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const equalFilterRules = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const isActionComplete = (before, after) => {
    if (!before || !after || !action) return false;
    const renderedRowsChanged = before.mountedRowSignature !== after.mountedRowSignature;
    if (action.type === "sort") {
      return after.sort?.columnId === action.columnId
        && after.sort?.direction === action.direction
        && renderedRowsChanged;
    }
    if (action.type === "multiSort") {
      return !equalSortRules(before.sorting, action.rules)
        && equalSortRules(after.sorting, action.rules)
        && (action.rules.length === 0 || renderedRowsChanged);
    }
    if (action.type === "filter") {
      return after.filter === action.value
        && before.filter !== action.value
        && renderedRowsChanged;
    }
    if (action.type === "columnFilter") {
      return after.columnFilter?.columnId === action.columnId
        && after.columnFilter?.value === action.value
        && (before.columnFilter?.columnId !== action.columnId || before.columnFilter?.value !== action.value)
        && renderedRowsChanged;
    }
    if (action.type === "multiFilter") {
      return !equalFilterRules(before.columnFilters, action.rules)
        && equalFilterRules(after.columnFilters, action.rules)
        && renderedRowsChanged;
    }
    if (action.type === "columnVisibility") {
      const beforeVisible = before.visibleColumnIds.includes(action.columnId);
      const afterVisible = after.visibleColumnIds.includes(action.columnId);
      return beforeVisible !== action.visible
        && afterVisible === action.visible
        && after.visibleColumnCount === before.visibleColumnCount + (action.visible ? 1 : -1);
    }
    if (action.type === "columnSizing") {
      return before.columnSize?.columnId === action.columnId
        && after.columnSize?.columnId === action.columnId
        && before.columnSize.size !== action.size
        && after.columnSize.size === action.size;
    }
    if (action.type === "columnOrdering") {
      return !equalArrays(before.columnOrderIds, action.columnIds)
        && equalArrays(after.columnOrderIds, action.columnIds)
        && equalArrays(after.visibleColumnIds, action.columnIds);
    }
    if (action.type === "columnPinning") {
      const expectedLeft = action.pinned ? [action.columnId] : [];
      return !equalArrays(before.columnPinning?.left, expectedLeft)
        && equalArrays(after.columnPinning?.left, expectedLeft)
        && equalArrays(after.columnPinning?.right, []);
    }
    if (action.type === "rowSelection") {
      const expectedSelectedRowIds = action.selected ? [action.rowId] : [];
      return !equalArrays(before.selectedRowIds, expectedSelectedRowIds)
        && equalArrays(after.selectedRowIds, expectedSelectedRowIds)
        && after.selectedRowCount === expectedSelectedRowIds.length
        && after.allRowsSelected === false;
    }
    if (action.type === "allRowSelection") {
      return before.allRowsSelected !== action.selected
        && after.allRowsSelected === action.selected
        && after.selectedRowCount === (action.selected ? after.rowCount : 0)
        && equalArrays(after.selectedRowIds, []);
    }
    if (action.type === "clear") {
      return after.sort === null
        && equalSortRules(after.sorting, [])
        && after.filter === ""
        && after.columnFilter === null
        && equalFilterRules(after.columnFilters, [])
        && after.visibleColumnCount === after.columnCount
        && after.columnSize?.columnId === "column_10"
        && after.columnSize.size === 120
        && hasDefaultColumnOrder(after.columnOrderIds)
        && equalArrays(after.columnPinning?.left, [])
        && equalArrays(after.columnPinning?.right, [])
        && equalArrays(after.selectedRowIds, [])
        && after.selectedRowCount === 0
        && after.allRowsSelected === false
        && after.displayedRowCount === after.rowCount
        && renderedRowsChanged;
    }
    return false;
  };
  const readPresentationTiming = (entry, expectedEventStartTime) => {
    if (entry?.name !== eventType || Math.abs(entry.startTime - expectedEventStartTime) > startToleranceMs) return null;
    const values = [entry.startTime, entry.duration, entry.processingStart, entry.processingEnd];
    if (!values.every((value) => Number.isFinite(value) && value >= 0)
      || entry.duration <= 0
      || entry.processingStart < entry.startTime
      || entry.processingEnd < entry.processingStart) {
      throw new TypeError("benchmark PerformanceEventTiming entry is malformed");
    }
    if (!Number.isSafeInteger(entry.interactionId) || entry.interactionId <= 0) {
      throw new TypeError("benchmark PerformanceEventTiming interactionId must be a positive integer");
    }
    const inputDelayMs = entry.processingStart - entry.startTime;
    const processingDurationMs = entry.processingEnd - entry.processingStart;
    const presentationDelayMs = entry.duration - (entry.processingEnd - entry.startTime);
    if (presentationDelayMs < 0) {
      throw new RangeError("benchmark PerformanceEventTiming duration must include presentation delay");
    }
    return {
      durationMs: entry.duration,
      inputDelayMs,
      processingDurationMs,
      presentationDelayMs,
      interactionId: entry.interactionId,
      source: "event-timing",
    };
  };
  const driver = window.__OPEN_GRID_BENCHMARK__;
  const target = document.querySelector(selector);
  if (!driver || !target) throw new Error("benchmark event action target is unavailable");
  if (window.__OPEN_GRID_EVENT_MEASUREMENT__) throw new Error("benchmark event action measurement is already pending");
  if (captureEventTiming && eventType !== "click") {
    throw new TypeError("benchmark presentation timing currently supports click actions only");
  }
  if (captureEventTiming && (typeof PerformanceObserver !== "function" || !PerformanceObserver.supportedEntryTypes?.includes("event"))) {
    throw new Error("benchmark presentation timing requires PerformanceEventTiming support");
  }
  const readActionSnapshot = () => driver.getActionSnapshot?.(action) ?? driver.getSnapshot();
  const before = readActionSnapshot();

  window.__OPEN_GRID_EVENT_MEASUREMENT__ = new Promise((resolve, reject) => {
    let start = null;
    let commitMs = null;
    let settled = false;
    let observedFrames = 0;
    let mutationObserver;
    let eventTimingObserver;
    let resolveEventTiming;
    const eventTiming = captureEventTiming
      ? new Promise((resolveTiming) => {
          resolveEventTiming = resolveTiming;
        })
      : Promise.resolve(null);
    const timeout = setTimeout(() => fail(new Error(`benchmark event action timed out: ${JSON.stringify({
      action,
      before,
      after: readActionSnapshot(),
    })}`)), 10_000);
    const cleanup = () => {
      clearTimeout(timeout);
      mutationObserver?.disconnect();
      eventTimingObserver?.disconnect();
      target.removeEventListener(eventType, handleEvent, true);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const isComplete = () => isActionComplete(before, readActionSnapshot());
    const checkCompletion = (completionSource) => {
      if (settled || start === null || commitMs !== null || !isComplete()) return false;
      commitMs = performance.now() - start;
      mutationObserver?.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (settled) return;
        const paintMs = performance.now() - start;
        eventTiming.then((presentationTiming) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            commitMs,
            paintMs,
            completionSource,
            eventType,
            ...(presentationTiming ? { presentationTiming } : {}),
          });
        }, fail);
      }));
      return true;
    };
    const pollCompletion = () => requestAnimationFrame(() => {
      if (settled || commitMs !== null) return;
      observedFrames += 1;
      if (!checkCompletion("frame")) {
        if (observedFrames >= frameLimit) fail(new Error(`benchmark event action did not commit within ${frameLimit} frames`));
        else pollCompletion();
      }
    });
    function handleEvent(event) {
      if (!event.isTrusted) {
        fail(new Error(`benchmark ${eventType} action requires a trusted browser event`));
        return;
      }
      if (captureEventTiming && !Number.isFinite(event.timeStamp)) {
        fail(new Error(`benchmark ${eventType} action requires a finite event timestamp`));
        return;
      }
      start = performance.now();
      if (captureEventTiming) {
        eventStartTime = event.timeStamp;
      }
      if (!checkCompletion("synchronous")) pollCompletion();
    }

    let eventStartTime = null;
    if (captureEventTiming) {
      eventTimingObserver = new PerformanceObserver((list) => {
        if (eventStartTime === null) return;
        try {
          for (const entry of list.getEntries()) {
            const presentationTiming = readPresentationTiming(entry, eventStartTime);
            if (!presentationTiming) continue;
            eventTimingObserver?.disconnect();
            resolveEventTiming(presentationTiming);
            return;
          }
        } catch (error) {
          fail(error);
        }
      });
      eventTimingObserver.observe({
        type: "event",
        buffered: false,
        durationThreshold: durationThresholdMs,
      });
    }
    mutationObserver = new MutationObserver(() => checkCompletion("mutation"));
    mutationObserver.observe(document.documentElement, { attributes: true, characterData: true, childList: true, subtree: true });
    target.addEventListener(eventType, handleEvent, { capture: true, once: true, passive: true });
  });
}

export function readBenchmarkEventPresentationTiming(entry, eventType, eventStartTime) {
  if (entry?.name !== eventType || !Number.isFinite(eventStartTime) || Math.abs(entry.startTime - eventStartTime) > EVENT_TIMING_START_TOLERANCE_MS) {
    return null;
  }
  const values = [entry.startTime, entry.duration, entry.processingStart, entry.processingEnd];
  if (!values.every((value) => Number.isFinite(value) && value >= 0)
    || entry.duration <= 0
    || entry.processingStart < entry.startTime
    || entry.processingEnd < entry.processingStart) {
    throw new TypeError("benchmark PerformanceEventTiming entry is malformed");
  }
  if (!Number.isSafeInteger(entry.interactionId) || entry.interactionId <= 0) {
    throw new TypeError("benchmark PerformanceEventTiming interactionId must be a positive integer");
  }
  const inputDelayMs = entry.processingStart - entry.startTime;
  const processingDurationMs = entry.processingEnd - entry.processingStart;
  const presentationDelayMs = entry.duration - (entry.processingEnd - entry.startTime);
  if (presentationDelayMs < 0) {
    throw new RangeError("benchmark PerformanceEventTiming duration must include presentation delay");
  }
  return {
    durationMs: entry.duration,
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
    interactionId: entry.interactionId,
    source: "event-timing",
  };
}

export function readBenchmarkEventActionMeasurement() {
  const measurement = window.__OPEN_GRID_EVENT_MEASUREMENT__;
  if (!measurement) throw new Error("benchmark event action measurement is not pending");
  return measurement.finally(() => {
    delete window.__OPEN_GRID_EVENT_MEASUREMENT__;
  });
}

function defaultMutationObserverFactory() {
  if (typeof globalThis.MutationObserver !== "function") return null;
  return (callback) => new globalThis.MutationObserver(callback);
}

export function isBenchmarkActionComplete(before, after, action) {
  if (!before || !after || !action) return false;
  const renderedRowsChanged = before.mountedRowSignature !== after.mountedRowSignature;

  if (action.type === "sort") {
    return after.sort?.columnId === action.columnId
      && after.sort?.direction === action.direction
      && renderedRowsChanged;
  }
  if (action.type === "multiSort") {
    return !equalSortRules(before.sorting, action.rules)
      && equalSortRules(after.sorting, action.rules)
      && (action.rules.length === 0 || renderedRowsChanged);
  }
  if (action.type === "filter") {
    return after.filter === action.value
      && before.filter !== action.value
      && renderedRowsChanged;
  }
  if (action.type === "columnFilter") {
    return after.columnFilter?.columnId === action.columnId
      && after.columnFilter?.value === action.value
      && (before.columnFilter?.columnId !== action.columnId || before.columnFilter?.value !== action.value)
      && renderedRowsChanged;
  }
  if (action.type === "multiFilter") {
    return !equalFilterRules(before.columnFilters, action.rules)
      && equalFilterRules(after.columnFilters, action.rules)
      && renderedRowsChanged;
  }
  if (action.type === "columnVisibility") {
    const beforeVisible = before.visibleColumnIds.includes(action.columnId);
    const afterVisible = after.visibleColumnIds.includes(action.columnId);
    return beforeVisible !== action.visible
      && afterVisible === action.visible
      && after.visibleColumnCount === before.visibleColumnCount + (action.visible ? 1 : -1);
  }
  if (action.type === "columnSizing") {
    return before.columnSize?.columnId === action.columnId
      && after.columnSize?.columnId === action.columnId
      && before.columnSize.size !== action.size
      && after.columnSize.size === action.size;
  }
  if (action.type === "columnOrdering") {
    return !equalStringArrays(before.columnOrderIds, action.columnIds)
      && equalStringArrays(after.columnOrderIds, action.columnIds)
      && equalStringArrays(after.visibleColumnIds, action.columnIds);
  }
  if (action.type === "columnPinning") {
    const expectedLeft = action.pinned ? [action.columnId] : [];
    return !equalStringArrays(before.columnPinning?.left, expectedLeft)
      && equalStringArrays(after.columnPinning?.left, expectedLeft)
      && equalStringArrays(after.columnPinning?.right, []);
  }
  if (action.type === "rowSelection") {
    const expectedSelectedRowIds = action.selected ? [action.rowId] : [];
    return !equalStringArrays(before.selectedRowIds, expectedSelectedRowIds)
      && equalStringArrays(after.selectedRowIds, expectedSelectedRowIds)
      && after.selectedRowCount === expectedSelectedRowIds.length
      && after.allRowsSelected === false;
  }
  if (action.type === "allRowSelection") {
    return before.allRowsSelected !== action.selected
      && after.allRowsSelected === action.selected
      && after.selectedRowCount === (action.selected ? after.rowCount : 0)
      && equalStringArrays(after.selectedRowIds, []);
  }
  if (action.type === "clear") {
    return after.sort === null
      && equalSortRules(after.sorting, [])
      && after.filter === ""
      && after.columnFilter === null
      && equalFilterRules(after.columnFilters, [])
      && after.visibleColumnCount === after.columnCount
      && after.columnSize?.columnId === "column_10"
      && after.columnSize.size === 120
      && isDefaultColumnOrder(after.columnOrderIds)
      && equalStringArrays(after.columnPinning?.left, [])
      && equalStringArrays(after.columnPinning?.right, [])
      && equalStringArrays(after.selectedRowIds, [])
      && after.selectedRowCount === 0
      && after.allRowsSelected === false
      && after.displayedRowCount === after.rowCount
      && renderedRowsChanged;
  }
  if (action.type === "scroll") {
    const verticalComplete = action.top <= before.scrollTop || after.scrollTop > before.scrollTop;
    const horizontalComplete = action.left <= before.scrollLeft || after.scrollLeft > before.scrollLeft;
    return verticalComplete && horizontalComplete && renderedRowsChanged;
  }
  return false;
}

export function getBenchmarkSnapshotRequirements(action) {
  const full = action === undefined;
  const type = action?.type;
  const renderedRows = full || type === "sort" || type === "multiSort" || type === "filter"
    || type === "columnFilter" || type === "multiFilter" || type === "clear" || type === "scroll";

  return {
    sorting: full || type === "sort" || type === "multiSort" || type === "clear",
    filtering: full || type === "filter" || type === "columnFilter" || type === "multiFilter" || type === "clear",
    visibleColumns: full || type === "columnVisibility" || type === "columnOrdering" || type === "clear",
    columnSize: full || type === "columnSizing" || type === "clear",
    columnOrder: full || type === "columnOrdering" || type === "clear",
    columnPinning: full || type === "columnPinning" || type === "clear",
    selection: full || type === "rowSelection" || type === "allRowSelection" || type === "clear",
    displayedRows: full || type === "filter" || type === "columnFilter" || type === "multiFilter" || type === "clear",
    renderedRows,
    mountedCells: full,
    scrollPosition: full || type === "scroll",
  };
}

export function getBenchmarkDeepScrollMinimum(rowCount, rowHeight = 40, viewportHeight = 600) {
  if (![rowCount, rowHeight, viewportHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError("deep scroll dimensions must be positive finite numbers");
  }
  const maximumScrollTop = Math.max(0, rowCount * rowHeight - viewportHeight);
  return Math.min(BENCHMARK_DEEP_SCROLL_TOP, maximumScrollTop) * 0.8;
}

export function readBenchmarkPageConfig(search = globalThis.location?.search ?? "") {
  const parameters = new URLSearchParams(search);
  const profileId = parameters.get("profile") ?? DEFAULT_PROFILE_ID;
  const seedText = parameters.get("seed");
  const seed = seedText === null ? BENCHMARK_DEFAULT_SEED : Number(seedText);

  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("benchmark seed must be an unsigned 32-bit integer");
  }

  return { profile: getBenchmarkProfile(profileId), seed };
}

export function createBenchmarkInitializationTracker(timing = globalThis.performance) {
  if (typeof timing?.now !== "function") {
    throw new TypeError("benchmark initialization timing requires performance.now");
  }

  const moduleStartMs = readInitializationTimestamp(timing.now(), "module start");
  let datasetReadyMs;
  let fingerprintReadyMs;
  let driverInstalledMs;
  let readyMs;

  const mark = (name, previous, current) => {
    if (current !== undefined) throw new Error(`benchmark initialization ${name} was already marked`);
    const value = readInitializationTimestamp(timing.now(), name);
    if (value < previous) throw new RangeError(`benchmark initialization ${name} must be monotonic`);
    return value;
  };

  return {
    markDatasetReady() {
      datasetReadyMs = mark("dataset ready", moduleStartMs, datasetReadyMs);
    },
    markFingerprintReady() {
      if (datasetReadyMs === undefined) throw new Error("benchmark initialization dataset ready must be marked first");
      fingerprintReadyMs = mark("fingerprint ready", datasetReadyMs, fingerprintReadyMs);
    },
    markDriverInstalled() {
      if (fingerprintReadyMs === undefined) throw new Error("benchmark initialization fingerprint ready must be marked first");
      driverInstalledMs = mark("driver installed", fingerprintReadyMs, driverInstalledMs);
    },
    markReady() {
      if (driverInstalledMs === undefined || datasetReadyMs === undefined || fingerprintReadyMs === undefined) {
        throw new Error("benchmark initialization driver installed must be marked first");
      }
      readyMs = mark("ready", driverInstalledMs, readyMs);
      return {
        moduleStartMs,
        datasetGenerationMs: datasetReadyMs - moduleStartMs,
        datasetFingerprintMs: fingerprintReadyMs - datasetReadyMs,
        appSetupMs: driverInstalledMs - fingerprintReadyMs,
        readinessFramesMs: readyMs - driverInstalledMs,
        instrumentedReadyMs: readyMs,
      };
    },
  };
}

export function readBenchmarkInitializationMetrics(initialization, observedReadyMs) {
  const phaseIds = ["moduleStartMs", "datasetGenerationMs", "datasetFingerprintMs", "appSetupMs", "readinessFramesMs"];
  const values = Object.fromEntries([...phaseIds, "instrumentedReadyMs"].map((key) => {
    const value = initialization?.[key];
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`benchmark initialization ${key} must be a non-negative finite number`);
    }
    return [key, value];
  }));
  const phaseTotalMs = phaseIds.reduce((sum, key) => sum + values[key], 0);
  if (Math.abs(phaseTotalMs - values.instrumentedReadyMs) > 0.01) {
    throw new RangeError("benchmark initialization phases must sum to instrumented ready time");
  }
  const resolvedObservedReadyMs = readInitializationTimestamp(observedReadyMs, "observed ready");
  if (resolvedObservedReadyMs + 0.01 < values.instrumentedReadyMs) {
    throw new RangeError("benchmark observed ready time cannot precede instrumented ready time");
  }
  return {
    initialPreModuleMs: values.moduleStartMs,
    initialDatasetGenerationMs: values.datasetGenerationMs,
    initialDatasetFingerprintMs: values.datasetFingerprintMs,
    initialAppSetupMs: values.appSetupMs,
    initialReadinessFramesMs: values.readinessFramesMs,
    initialInstrumentedReadyMs: values.instrumentedReadyMs,
    initialObservationDelayMs: Math.max(0, resolvedObservedReadyMs - values.instrumentedReadyMs),
  };
}

function readInitializationTimestamp(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`benchmark initialization ${name} must be a non-negative finite number`);
  }
  return value;
}

export function toggleBenchmarkSort(columnId) {
  const driver = window.__OPEN_GRID_BENCHMARK__;
  if (!driver) return;
  const currentSort = driver.getSnapshot().sort;
  driver.setSort(columnId, currentSort?.columnId === columnId && currentSort.direction === "asc" ? "desc" : "asc");
}

export function installBenchmarkDriver(options) {
  if (!options.initializationTracker || typeof options.initializationTracker.markDriverInstalled !== "function" || typeof options.initializationTracker.markReady !== "function") {
    throw new TypeError("benchmark initialization tracker is required");
  }
  options.initializationTracker.markDriverInstalled();
  const measureActionDetails = (action) => {
    const readActionSnapshot = () => options.getActionSnapshot?.(action) ?? options.getSnapshot();
    const before = readActionSnapshot();
    let after = before;
    const measurementOptions = {
      isComplete: () => {
        after = readActionSnapshot();
        return isBenchmarkActionComplete(before, after, action);
      },
    };
    const measurement = action.type === "scroll"
      ? measureFrameAlignedScrollActionDetails(() => runBenchmarkAction(options, action), {
          ...measurementOptions,
          scrollElement: options.getScrollElement?.() ?? document.querySelector(".og-grid__scroller"),
        })
      : measureFrameAlignedActionDetails(() => runBenchmarkAction(options, action), measurementOptions);
    return measurement.catch((error) => {
      if (error instanceof Error && error.message.includes("did not commit")) {
        throw new Error(`${error.message}: ${JSON.stringify({ action, before, after })}`, { cause: error });
      }
      throw error;
    });
  };
  const { initializationTracker, ...driverOptions } = options;
  const driver = {
    ...driverOptions,
    version: 15,
    ready: false,
    initialization: null,
    measureAction: (action) => measureActionDetails(action).then((measurement) => measurement.paintMs),
    measureActionDetails,
  };
  window.__OPEN_GRID_BENCHMARK__ = driver;
  document.documentElement.dataset.benchmarkImplementation = options.implementation;
  document.documentElement.dataset.benchmarkProfile = options.profileId;
  document.documentElement.dataset.benchmarkReady = "false";

  let secondFrame = 0;
  const firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      driver.initialization = initializationTracker.markReady();
      driver.ready = true;
      document.documentElement.dataset.benchmarkReady = "true";
      window.dispatchEvent(new CustomEvent("open-grid-benchmark-ready", { detail: driver.getSnapshot() }));
    });
  });

  return () => {
    cancelAnimationFrame(firstFrame);
    cancelAnimationFrame(secondFrame);
    if (window.__OPEN_GRID_BENCHMARK__ === driver) {
      delete window.__OPEN_GRID_BENCHMARK__;
      delete document.documentElement.dataset.benchmarkReady;
    }
  };
}

function runBenchmarkAction(driver, action) {
  if (action.type === "sort") {
    driver.setSort(action.columnId, action.direction);
    return;
  }
  if (action.type === "multiSort") {
    driver.setSorting(action.rules);
    return;
  }
  if (action.type === "filter") {
    driver.setQuickFilter(action.value);
    return;
  }
  if (action.type === "columnFilter") {
    if (action.columnId !== "column_2") {
      throw new RangeError(`unsupported benchmark column filter: ${String(action.columnId)}`);
    }
    driver.setColumnFilter(action.columnId, action.value);
    return;
  }
  if (action.type === "multiFilter") {
    driver.setColumnFilters(action.rules);
    return;
  }
  if (action.type === "columnVisibility") {
    if (action.columnId !== "column_10") {
      throw new RangeError(`unsupported benchmark column visibility target: ${String(action.columnId)}`);
    }
    driver.setColumnVisible(action.columnId, action.visible);
    return;
  }
  if (action.type === "columnSizing") {
    if (action.columnId !== "column_10" || (action.size !== 120 && action.size !== 200)) {
      throw new RangeError(`unsupported benchmark column sizing target: ${String(action.columnId)}=${String(action.size)}`);
    }
    driver.setColumnSize(action.columnId, action.size);
    return;
  }
  if (action.type === "columnOrdering") {
    if (!isSupportedColumnOrder(action.columnIds)) {
      throw new RangeError(`unsupported benchmark column order: ${JSON.stringify(action.columnIds)}`);
    }
    driver.setColumnOrder(action.columnIds);
    return;
  }
  if (action.type === "columnPinning") {
    if (action.columnId !== "column_10") {
      throw new RangeError(`unsupported benchmark column pinning target: ${String(action.columnId)}`);
    }
    driver.setColumnPinned(action.columnId, action.pinned);
    return;
  }
  if (action.type === "rowSelection") {
    if (action.rowId !== "row_0") {
      throw new RangeError(`unsupported benchmark row selection target: ${String(action.rowId)}`);
    }
    driver.setRowSelected(action.rowId, action.selected);
    return;
  }
  if (action.type === "allRowSelection") {
    driver.setAllRowsSelected(action.selected);
    return;
  }
  if (action.type === "clear") {
    driver.clearState();
    return;
  }
  if (action.type === "scroll") {
    driver.scrollTo(action.top, action.left);
    return;
  }

  throw new TypeError(`unknown benchmark action: ${action.type}`);
}

function equalStringArrays(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function equalSortRules(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function equalFilterRules(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isDefaultColumnOrder(columnIds) {
  return Array.isArray(columnIds)
    && columnIds.length > 0
    && columnIds.every((columnId, index) => columnId === `column_${index}`);
}

function isSupportedColumnOrder(columnIds) {
  if (!Array.isArray(columnIds) || columnIds.length < 10) return false;
  const defaultOrder = Array.from({ length: columnIds.length }, (_, index) => `column_${index}`);
  const movedOrder = [...defaultOrder.slice(0, 2), "column_10", ...defaultOrder.slice(2, 10), ...defaultOrder.slice(11)];
  return equalStringArrays(columnIds, defaultOrder) || equalStringArrays(columnIds, movedOrder);
}
