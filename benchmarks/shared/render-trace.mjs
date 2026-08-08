export const BENCHMARK_RENDER_TRACE_SCHEMA_VERSION = 5;
export const BENCHMARK_RENDER_TRACE_ACTIONS = Object.freeze([
  "columnVisibility",
  "columnSizing",
  "columnFilter",
  "columnPinning",
  "columnLayoutWorkflow",
  "rowSelection",
  "deepScroll",
]);

const PHASE_EVENTS = Object.freeze({
  javascript: "FunctionCall",
  style: "UpdateLayoutTree",
  layout: "Layout",
  paint: "Paint",
  prePaint: "PrePaint",
  layerize: "Layerize",
});
const MAIN_THREAD_NAMES = new Set(["CrRendererMain", "RendererMain"]);
const MAIN_THREAD_TASK_EVENTS = new Set(["RunTask", "ThreadControllerImpl::RunTask"]);

export function summarizeBenchmarkRenderTrace(events, iterations) {
  if (!Array.isArray(events)) {
    throw new TypeError("render trace events must be an array");
  }
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    throw new RangeError("render trace iterations must be a positive safe integer");
  }

  const durationsByEvent = new Map(Object.values(PHASE_EVENTS).map((name) => [name, []]));
  for (const event of events) {
    if (event?.ph !== "X" || !durationsByEvent.has(event.name)) continue;
    if (!Number.isFinite(event.dur) || event.dur < 0) {
      throw new TypeError(`render trace duration for ${event.name} must be a non-negative finite number`);
    }
    durationsByEvent.get(event.name).push(event.dur / 1_000);
  }

  return Object.fromEntries(Object.entries(PHASE_EVENTS).map(([phase, eventName]) => {
    const durations = durationsByEvent.get(eventName);
    const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
    return [phase, {
      eventName,
      count: durations.length,
      totalMs,
      perIterationMs: totalMs / iterations,
      maxMs: durations.length > 0 ? Math.max(...durations) : 0,
    }];
  }));
}

export function summarizeBenchmarkMainThreadTrace(events, iterations, topGroupLimit = 12) {
  if (!Array.isArray(events)) {
    throw new TypeError("render trace events must be an array");
  }
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    throw new RangeError("render trace iterations must be a positive safe integer");
  }
  if (!Number.isSafeInteger(topGroupLimit) || topGroupLimit <= 0) {
    throw new RangeError("render trace top group limit must be a positive safe integer");
  }

  const thread = findRendererMainThread(events);
  if (!thread) {
    throw new Error("render trace is missing Chromium renderer main-thread metadata");
  }
  const completeEvents = events
    .filter((event) => event?.ph === "X"
      && event.pid === thread.pid
      && event.tid === thread.tid
      && Number.isFinite(event.ts)
      && Number.isFinite(event.dur)
      && event.dur >= 0)
    .map((event) => ({
      name: event.name,
      start: event.ts,
      end: event.ts + event.dur,
      duration: event.dur,
    }));
  const tasks = completeEvents.filter((event) => MAIN_THREAD_TASK_EVENTS.has(event.name));
  if (tasks.length === 0) {
    throw new Error("render trace is missing Chromium renderer main-thread task events");
  }

  const taskTotalUs = tasks.reduce((sum, task) => sum + task.duration, 0);
  const lifecycleIntervals = [];
  for (const event of completeEvents) {
    if (!Object.values(PHASE_EVENTS).includes(event.name)) continue;
    for (const task of tasks) {
      const start = Math.max(event.start, task.start);
      const end = Math.min(event.end, task.end);
      if (end > start) lifecycleIntervals.push({ start, end });
    }
  }
  const lifecycleUnionUs = sumIntervalUnion(lifecycleIntervals);
  const taskSelfUs = tasks.reduce((total, task) => {
    const childIntervals = completeEvents
      .filter((event) => !MAIN_THREAD_TASK_EVENTS.has(event.name)
        && event.start >= task.start
        && event.end <= task.end)
      .map((event) => ({ start: event.start, end: event.end }));
    return total + Math.max(0, task.duration - sumIntervalUnion(childIntervals));
  }, 0);

  const selfGroups = new Map();
  for (const { event, selfUs } of calculateSelfEvents(completeEvents, tasks)) {
    const group = selfGroups.get(event.name) ?? { eventName: event.name, count: 0, totalMs: 0 };
    group.count += 1;
    group.totalMs += selfUs / 1_000;
    selfGroups.set(event.name, group);
  }

  const taskTotalMs = taskTotalUs / 1_000;
  const taskSelfMs = taskSelfUs / 1_000;
  const lifecycleUnionMs = lifecycleUnionUs / 1_000;
  return {
    thread,
    tasks: {
      eventName: "RunTask",
      count: tasks.length,
      totalMs: taskTotalMs,
      perIterationMs: taskTotalMs / iterations,
      maxMs: Math.max(...tasks.map((task) => task.duration / 1_000)),
    },
    taskSelfMs,
    taskSelfPerIterationMs: taskSelfMs / iterations,
    lifecycleUnionMs,
    lifecycleUnionPerIterationMs: lifecycleUnionMs / iterations,
    outsideLifecycleMs: Math.max(0, taskTotalMs - lifecycleUnionMs),
    outsideLifecyclePerIterationMs: Math.max(0, taskTotalMs - lifecycleUnionMs) / iterations,
    topSelfEvents: [...selfGroups.values()]
      .map((group) => ({ ...group, perIterationMs: group.totalMs / iterations }))
      .sort((left, right) => right.totalMs - left.totalMs || left.eventName.localeCompare(right.eventName))
      .slice(0, topGroupLimit),
  };
}

export function summarizeBenchmarkTaskTiming(actionTaskDurationsMs, captureTaskDurationMs, iterations, actionLabels = []) {
  if (!Array.isArray(actionTaskDurationsMs)
    || actionTaskDurationsMs.length !== iterations
    || !actionTaskDurationsMs.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new TypeError("render trace action task durations must contain one non-negative finite value per iteration");
  }
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    throw new RangeError("render trace iterations must be a positive safe integer");
  }
  if (!Number.isFinite(captureTaskDurationMs) || captureTaskDurationMs < 0) {
    throw new TypeError("render trace capture task duration must be a non-negative finite number");
  }
  if (!Array.isArray(actionLabels)
    || (actionLabels.length !== 0 && actionLabels.length !== iterations)
    || !actionLabels.every((value) => typeof value === "string" && value.length > 0)) {
    throw new TypeError("render trace action labels must be empty or contain one non-empty string per iteration");
  }
  const sorted = [...actionTaskDurationsMs].sort((left, right) => left - right);
  const actionTotalMs = actionTaskDurationsMs.reduce((sum, value) => sum + value, 0);
  const grouped = new Map();
  for (let index = 0; index < actionLabels.length; index += 1) {
    const label = actionLabels[index];
    const durations = grouped.get(label) ?? [];
    durations.push(actionTaskDurationsMs[index]);
    grouped.set(label, durations);
  }
  return {
    actionCount: iterations,
    actionTotalMs,
    actionPerIterationMs: actionTotalMs / iterations,
    actionMedianMs: percentile(sorted, 0.5),
    actionP95Ms: percentile(sorted, 0.95),
    captureTotalMs: captureTaskDurationMs,
    outsideActionsMs: Math.max(0, captureTaskDurationMs - actionTotalMs),
    outsideActionsPerIterationMs: Math.max(0, captureTaskDurationMs - actionTotalMs) / iterations,
    groups: [...grouped.entries()].map(([id, durations]) => {
      const groupSorted = [...durations].sort((left, right) => left - right);
      const totalMs = durations.reduce((sum, value) => sum + value, 0);
      return {
        id,
        count: durations.length,
        totalMs,
        perActionMs: totalMs / durations.length,
        medianMs: percentile(groupSorted, 0.5),
        p95Ms: percentile(groupSorted, 0.95),
      };
    }),
  };
}

export function summarizeBenchmarkPerformanceTiming(actionDurations, iterations, actionLabels = []) {
  const fields = ["task", "script", "style", "layout", "taskOther", "v8Compile"];
  if (!Array.isArray(actionDurations)
    || actionDurations.length !== iterations
    || !actionDurations.every((entry) => entry
      && fields.every((field) => Number.isFinite(entry[field]) && entry[field] >= 0))) {
    throw new TypeError("render trace performance durations must contain one complete non-negative entry per iteration");
  }
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    throw new RangeError("render trace iterations must be a positive safe integer");
  }
  if (!Array.isArray(actionLabels)
    || (actionLabels.length !== 0 && actionLabels.length !== iterations)
    || !actionLabels.every((value) => typeof value === "string" && value.length > 0)) {
    throw new TypeError("render trace performance labels must be empty or contain one non-empty string per iteration");
  }

  const summarize = (entries) => Object.fromEntries(fields.map((field) => {
    const values = entries.map((entry) => entry[field]);
    const sorted = [...values].sort((left, right) => left - right);
    const totalMs = values.reduce((sum, value) => sum + value, 0);
    return [field, {
      totalMs,
      perActionMs: totalMs / values.length,
      medianMs: percentile(sorted, 0.5),
      p95Ms: percentile(sorted, 0.95),
    }];
  }));
  const grouped = new Map();
  for (let index = 0; index < actionLabels.length; index += 1) {
    const entries = grouped.get(actionLabels[index]) ?? [];
    entries.push(actionDurations[index]);
    grouped.set(actionLabels[index], entries);
  }
  return {
    actionCount: iterations,
    metrics: summarize(actionDurations),
    groups: [...grouped.entries()].map(([id, entries]) => ({
      id,
      count: entries.length,
      metrics: summarize(entries),
    })),
  };
}

export function createBenchmarkRenderTraceAction(action, index, deepScrollTop = 2_000, columnCount = 20) {
  if (!BENCHMARK_RENDER_TRACE_ACTIONS.includes(action)) {
    throw new TypeError(`unsupported render trace action: ${action}`);
  }
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError("render trace action index must be a non-negative safe integer");
  }
  if (!Number.isFinite(deepScrollTop) || deepScrollTop <= 0) {
    throw new RangeError("render trace deep scroll top must be a positive finite number");
  }
  if (!Number.isSafeInteger(columnCount) || columnCount <= 10) {
    throw new RangeError("render trace column count must be a safe integer greater than 10");
  }
  const enabled = index % 2 === 0;
  if (action === "columnVisibility") return { type: "columnVisibility", columnId: "column_10", visible: !enabled };
  if (action === "columnSizing") return { type: "columnSizing", columnId: "column_10", size: enabled ? 200 : 120 };
  if (action === "columnFilter") {
    return enabled
      ? { type: "columnFilter", columnId: "column_2", value: "Blocked" }
      : { type: "clear" };
  }
  if (action === "columnPinning") return { type: "columnPinning", columnId: "column_10", pinned: enabled };
  if (action === "columnLayoutWorkflow") {
    const defaultColumnOrder = Array.from({ length: columnCount }, (_, columnIndex) => `column_${columnIndex}`);
    const movedColumnOrder = [
      ...defaultColumnOrder.slice(0, 2),
      "column_10",
      ...defaultColumnOrder.slice(2, 10),
      ...defaultColumnOrder.slice(11),
    ];
    return [
      { type: "columnOrdering", columnIds: movedColumnOrder, traceLabel: "move" },
      { type: "columnSizing", columnId: "column_10", size: 200, traceLabel: "resize" },
      { type: "columnPinning", columnId: "column_10", pinned: true, traceLabel: "pin" },
      { type: "columnVisibility", columnId: "column_10", visible: false, traceLabel: "hide" },
      { type: "columnVisibility", columnId: "column_10", visible: true, traceLabel: "show" },
      { type: "columnPinning", columnId: "column_10", pinned: false, traceLabel: "unpin" },
      { type: "columnSizing", columnId: "column_10", size: 120, traceLabel: "sizeRestore" },
      { type: "columnOrdering", columnIds: defaultColumnOrder, traceLabel: "orderRestore" },
    ][index % 8];
  }
  if (action === "rowSelection") return { type: "rowSelection", rowId: "row_0", selected: enabled };
  return { type: "scroll", top: enabled ? deepScrollTop : 0, left: 0 };
}

export function createBenchmarkTimingActionPrefix(action, columnCount) {
  if (!["columnFilter", "columnVisibility", "columnSizing", "columnPinning", "columnLayoutWorkflow", "rowSelection"].includes(action)) {
    throw new TypeError(`timing action prefix does not support action: ${action}`);
  }
  if (!Number.isSafeInteger(columnCount) || columnCount <= 10) {
    throw new RangeError("timing action prefix column count must be a safe integer greater than 10");
  }

  const entries = [
    { action: { type: "sort", columnId: "column_5", direction: "asc" } },
    { action: { type: "sort", columnId: "column_5", direction: "desc" } },
    { action: { type: "clear" } },
    { action: { type: "filter", value: "Blocked" } },
    { action: { type: "clear" } },
  ];
  if (action === "columnFilter") return entries;

  entries.push(
    { action: { type: "columnFilter", columnId: "column_2", value: "Blocked" } },
    { action: { type: "clear" } },
    { action: { type: "filter", value: "APAC" } },
    { action: { type: "columnFilter", columnId: "column_2", value: "Blocked" } },
    { action: { type: "sort", columnId: "column_5", direction: "asc" } },
    { action: { type: "clear" } },
    { action: { type: "filter", value: "APAC" } },
    { action: { type: "columnFilter", columnId: "column_2", value: "Blocked" } },
    { action: { type: "sort", columnId: "column_5", direction: "asc" } },
    { action: { type: "filter", value: "EMEA" }, replaceExisting: true },
    { action: { type: "columnFilter", columnId: "column_2", value: "Complete" }, replaceExisting: true },
    { action: { type: "sort", columnId: "column_5", direction: "desc" } },
    { action: { type: "clear" } },
  );
  if (action === "columnVisibility") return entries;

  entries.push(
    { action: { type: "columnVisibility", columnId: "column_10", visible: false } },
    { action: { type: "columnVisibility", columnId: "column_10", visible: true } },
  );
  if (action === "columnSizing") return entries;

  entries.push(
    { action: { type: "columnSizing", columnId: "column_10", size: 200 } },
    { action: { type: "columnSizing", columnId: "column_10", size: 120 } },
  );

  const defaultColumnOrder = Array.from({ length: columnCount }, (_, index) => `column_${index}`);
  const movedColumnOrder = [
    ...defaultColumnOrder.slice(0, 2),
    "column_10",
    ...defaultColumnOrder.slice(2, 10),
    ...defaultColumnOrder.slice(11),
  ];
  entries.push(
    { action: { type: "columnOrdering", columnIds: movedColumnOrder } },
    { action: { type: "columnOrdering", columnIds: defaultColumnOrder } },
  );
  if (action === "columnPinning") return entries;

  entries.push(
    { action: { type: "columnPinning", columnId: "column_10", pinned: true } },
    { action: { type: "columnPinning", columnId: "column_10", pinned: false } },
  );
  if (action === "columnLayoutWorkflow") return entries;

  entries.push(
    { action: { type: "columnOrdering", columnIds: movedColumnOrder } },
    { action: { type: "columnSizing", columnId: "column_10", size: 200 } },
    { action: { type: "columnPinning", columnId: "column_10", pinned: true } },
    { action: { type: "columnVisibility", columnId: "column_10", visible: false } },
    { action: { type: "columnVisibility", columnId: "column_10", visible: true } },
    { action: { type: "columnPinning", columnId: "column_10", pinned: false } },
    { action: { type: "columnSizing", columnId: "column_10", size: 120 } },
    { action: { type: "columnOrdering", columnIds: defaultColumnOrder } },
  );
  return entries;
}

export function formatBenchmarkRenderTraceMarkdown(result) {
  validateRenderTraceResult(result);
  const lines = [
    "# Open Grid Browser Render Trace",
    "",
    `- Status: ${result.status}`,
    `- Profile: ${result.config.profileId}`,
    `- Action: ${result.config.action}`,
    `- Trigger: ${result.config.trigger}`,
    `- Preparation: ${result.config.preparation}`,
    `- Capture: ${result.config.capture}`,
    `- Viewport: ${result.config.viewport.width}x${result.config.viewport.height}`,
    `- Target order: ${result.config.targetOrder.join(", ")}`,
    `- Warm-ups: ${result.config.warmups}`,
    `- Recorded iterations: ${result.config.iterations}`,
    `- Browser: ${result.environment.browser}`,
    `- Source fingerprint: \`${result.environment.sourceFingerprint}\``,
  ];

  if (result.config.capture === "trace") {
    lines.push(
      "",
      "| Implementation | JavaScript | Style | Layout | Paint | Pre-paint | Layerize |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const implementation of result.implementations) {
      const phase = implementation.phases;
      lines.push(`| ${implementation.id} | ${formatMs(phase.javascript.perIterationMs)} | ${formatMs(phase.style.perIterationMs)} | ${formatMs(phase.layout.perIterationMs)} | ${formatMs(phase.paint.perIterationMs)} | ${formatMs(phase.prePaint.perIterationMs)} | ${formatMs(phase.layerize.perIterationMs)} |`);
    }

    lines.push(
      "",
      "| Implementation | Action task | Trace task | Task self | Lifecycle union | Outside lifecycle | Outside actions |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const implementation of result.implementations) {
      const main = implementation.mainThread;
      const task = implementation.taskTiming;
      lines.push(`| ${implementation.id} | ${formatOptionalMs(task?.actionPerIterationMs)} | ${formatMs(main.tasks.perIterationMs)} | ${formatMs(main.taskSelfPerIterationMs)} | ${formatMs(main.lifecycleUnionPerIterationMs)} | ${formatMs(main.outsideLifecyclePerIterationMs)} | ${formatOptionalMs(task?.outsideActionsPerIterationMs)} |`);
    }
  } else {
    lines.push(
      "",
      "| Implementation | Action task | Outside actions |",
      "| --- | ---: | ---: |",
    );
    for (const implementation of result.implementations) {
      const task = implementation.taskTiming;
      lines.push(`| ${implementation.id} | ${formatOptionalMs(task?.actionPerIterationMs)} | ${formatOptionalMs(task?.outsideActionsPerIterationMs)} |`);
    }
  }

  lines.push(
    "",
    "| Implementation | CDP script | CDP style | CDP layout | CDP task other | CDP compile |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const implementation of result.implementations) {
    const metrics = implementation.performanceTiming.metrics;
    lines.push(`| ${implementation.id} | ${formatMs(metrics.script.perActionMs)} | ${formatMs(metrics.style.perActionMs)} | ${formatMs(metrics.layout.perActionMs)} | ${formatMs(metrics.taskOther.perActionMs)} | ${formatMs(metrics.v8Compile.perActionMs)} |`);
  }

  const hasTaskGroups = result.implementations.some((implementation) => implementation.taskTiming?.groups?.length > 0);
  if (hasTaskGroups) {
    lines.push("", "Action task groups:");
    for (const implementation of result.implementations) {
      const groups = implementation.taskTiming?.groups
        ?.map((group) => `${group.id} median ${formatMs(group.medianMs)} / p95 ${formatMs(group.p95Ms)}`)
        .join(", ");
      lines.push(`- ${implementation.id}: ${groups || "none"}`);
    }
  }

  lines.push("", "Action performance groups:");
  for (const implementation of result.implementations) {
    const groups = implementation.performanceTiming.groups.map((group) => {
      const metrics = group.metrics;
      return `${group.id} task/script/style/layout/other ${formatMs(metrics.task.medianMs)}/${formatMs(metrics.script.medianMs)}/${formatMs(metrics.style.medianMs)}/${formatMs(metrics.layout.medianMs)}/${formatMs(metrics.taskOther.medianMs)}`;
    }).join(", ");
    lines.push(`- ${implementation.id}: ${groups || "none"}`);
  }

  if (result.config.capture === "trace") {
    lines.push("", "Top renderer-main self-time groups:");
    for (const implementation of result.implementations) {
      const groups = implementation.mainThread.topSelfEvents
        .slice(0, 6)
        .map((group) => `${group.eventName} ${formatMs(group.perIterationMs)}`)
        .join(", ");
      lines.push(`- ${implementation.id}: ${groups || "none"}`);
    }
  }

  lines.push(
    "",
    result.config.capture === "trace"
      ? "Phase values are independent trace-event totals and can overlap. Lifecycle union removes overlap inside renderer-main tasks. Action task values use one CDP counter boundary per driver or trusted interaction. This diagnostic does not replace release budgets."
      : "Counter capture disables Chromium tracing and uses only the same CDP performance-counter boundaries as the release runner. This diagnostic does not replace release budgets.",
    "",
  );
  return lines.join("\n");
}

function validateRenderTraceResult(result) {
  if (result?.schemaVersion !== BENCHMARK_RENDER_TRACE_SCHEMA_VERSION) {
    throw new TypeError(`render trace schemaVersion must be ${BENCHMARK_RENDER_TRACE_SCHEMA_VERSION}`);
  }
  if (result.status !== "diagnostic" || !result.config || !result.environment || !Array.isArray(result.implementations)) {
    throw new TypeError("render trace result is malformed");
  }
  const config = result.config;
  if (!["driver", "trusted"].includes(config.trigger)
    || !["none", "timing-prefix", "timing-action-prefix"].includes(config.preparation)
    || !["trace", "counters"].includes(config.capture)
    || !Number.isFinite(config.viewport?.width)
    || !Number.isFinite(config.viewport?.height)
    || config.viewport.width <= 0
    || config.viewport.height <= 0
    || !Array.isArray(config.targetOrder)
    || config.targetOrder.length === 0
    || !config.targetOrder.every((id) => typeof id === "string" && id.length > 0)
    || new Set(config.targetOrder).size !== config.targetOrder.length) {
    throw new TypeError("render trace config is malformed");
  }
  for (const implementation of result.implementations) {
    if (typeof implementation?.id !== "string") {
      throw new TypeError("render trace implementation is malformed");
    }
    if (config.capture === "trace") {
      if (!implementation.phases || !implementation.mainThread) {
        throw new TypeError(`render trace lifecycle timing is missing: ${implementation.id}`);
      }
      for (const phase of Object.keys(PHASE_EVENTS)) {
        const value = implementation.phases[phase];
        if (!value || ![value.count, value.totalMs, value.perIterationMs, value.maxMs].every((entry) => Number.isFinite(entry) && entry >= 0)) {
          throw new TypeError(`render trace phase is malformed: ${implementation.id}/${phase}`);
        }
      }
      const main = implementation.mainThread;
      if (![main.tasks?.count, main.tasks?.totalMs, main.tasks?.perIterationMs, main.tasks?.maxMs,
        main.taskSelfMs, main.taskSelfPerIterationMs,
        main.lifecycleUnionMs, main.lifecycleUnionPerIterationMs,
        main.outsideLifecycleMs, main.outsideLifecyclePerIterationMs]
        .every((entry) => Number.isFinite(entry) && entry >= 0)
        || !Array.isArray(main.topSelfEvents)) {
        throw new TypeError(`render trace main-thread summary is malformed: ${implementation.id}`);
      }
    } else if (implementation.phases !== null || implementation.mainThread !== null) {
      throw new TypeError(`counter capture must not contain trace lifecycle timing: ${implementation.id}`);
    }
    const task = implementation.taskTiming;
    if (!task) {
      throw new TypeError(`render trace task timing is missing: ${implementation.id}`);
    }
    if (task && (![task.actionCount, task.actionTotalMs, task.actionPerIterationMs,
      task.actionMedianMs, task.actionP95Ms, task.captureTotalMs,
      task.outsideActionsMs, task.outsideActionsPerIterationMs]
      .every((entry) => Number.isFinite(entry) && entry >= 0)
      || !Array.isArray(task.groups)
      || !task.groups.every((group) => typeof group?.id === "string"
        && group.id.length > 0
        && [group.count, group.totalMs, group.perActionMs, group.medianMs, group.p95Ms]
          .every((entry) => Number.isFinite(entry) && entry >= 0)))) {
      throw new TypeError(`render trace task timing is malformed: ${implementation.id}`);
    }
    const performance = implementation.performanceTiming;
    const performanceFields = ["task", "script", "style", "layout", "taskOther", "v8Compile"];
    const validMetrics = (metrics) => metrics
      && performanceFields.every((field) => metrics[field]
        && [metrics[field].totalMs, metrics[field].perActionMs, metrics[field].medianMs, metrics[field].p95Ms]
          .every((entry) => Number.isFinite(entry) && entry >= 0));
    if (!performance
      || performance.actionCount !== config.iterations
      || !validMetrics(performance.metrics)
      || !Array.isArray(performance.groups)
      || !performance.groups.every((group) => typeof group?.id === "string"
        && group.id.length > 0
        && Number.isSafeInteger(group.count)
        && group.count > 0
        && validMetrics(group.metrics))) {
      throw new TypeError(`render trace performance timing is malformed: ${implementation.id}`);
    }
  }
}

function formatMs(value) {
  return `${value.toFixed(3)}ms`;
}

function formatOptionalMs(value) {
  return Number.isFinite(value) ? formatMs(value) : "n/a";
}

function findRendererMainThread(events) {
  for (const event of events) {
    if (event?.ph !== "M" || event.name !== "thread_name" || !MAIN_THREAD_NAMES.has(event.args?.name)) continue;
    if (Number.isFinite(event.pid) && Number.isFinite(event.tid)) return { pid: event.pid, tid: event.tid, name: event.args.name };
  }
  return null;
}

function sumIntervalUnion(intervals) {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((left, right) => left.start - right.start || left.end - right.end);
  let total = 0;
  let start = sorted[0].start;
  let end = sorted[0].end;
  for (let index = 1; index < sorted.length; index += 1) {
    const interval = sorted[index];
    if (interval.start <= end) {
      end = Math.max(end, interval.end);
    } else {
      total += end - start;
      start = interval.start;
      end = interval.end;
    }
  }
  return total + end - start;
}

function calculateSelfEvents(completeEvents, tasks) {
  const records = completeEvents
    .filter((event) => !MAIN_THREAD_TASK_EVENTS.has(event.name))
    .map((event) => ({ event, childIntervals: [] }))
    .sort((left, right) => left.event.start - right.event.start || right.event.end - left.event.end);
  const stack = [];
  for (const record of records) {
    while (stack.length > 0 && stack.at(-1).event.end <= record.event.start) stack.pop();
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const parent = stack[index];
      if (record.event.start >= parent.event.start && record.event.end <= parent.event.end) {
        parent.childIntervals.push({ start: record.event.start, end: record.event.end });
        break;
      }
    }
    stack.push(record);
  }

  const sortedTasks = [...tasks].sort((left, right) => left.start - right.start);
  let taskIndex = 0;
  return records.flatMap((record) => {
    while (taskIndex < sortedTasks.length && sortedTasks[taskIndex].end <= record.event.start) taskIndex += 1;
    const task = sortedTasks[taskIndex];
    if (!task || record.event.start < task.start || record.event.end > task.end) return [];
    return [{
      event: record.event,
      selfUs: Math.max(0, record.event.duration - sumIntervalUnion(record.childIntervals)),
    }];
  });
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(quantile * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
