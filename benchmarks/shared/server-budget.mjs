import {
  SERVER_BENCHMARK_METRICS,
  SERVER_BENCHMARK_RESULT_SCHEMA_VERSION,
  summarizeServerBenchmarkRuns,
} from "./server-results.mjs";

export const SERVER_BENCHMARK_BUDGET_SCHEMA_VERSION = 1;

const TIMING_BASES = new Set(["total", "client-overhead"]);
const RESOURCE_METRICS = new Set([
  "jsHeapUsedBytes",
  "domNodeCount",
  "transferredBytes",
  "decodedBodyBytes",
]);
export function evaluateServerBenchmarkBudgets(config, result) {
  validateServerBenchmarkBudgetConfig(config);
  const recordedRuns = validateServerBenchmarkResult(config, result);
  const checks = [];

  for (const [metric, budget] of Object.entries(config.timing)) {
    const definition = SERVER_BENCHMARK_METRICS[metric];
    const transportMs = definition.roundTrips * config.delayMs;
    const values = recordedRuns
      .map((run) => budget.basis === "client-overhead"
        ? Math.max(0, run.metrics[metric] - transportMs)
        : run.metrics[metric])
      .sort((left, right) => left - right);
    checks.push(check(`timing:${metric}:median`, "timing", metric, "median", percentile(values, 0.5), budget.maxMedianMs, budget.basis));
    checks.push(check(`timing:${metric}:p95`, "timing", metric, "p95", percentile(values, 0.95), budget.maxP95Ms, budget.basis));
  }

  for (const [metric, budget] of Object.entries(config.resources)) {
    const values = recordedRuns.map((run) => run.resources[metric]).sort((left, right) => left - right);
    checks.push(check(`resource:${metric}:p95`, "resource", metric, "p95", percentile(values, 0.95), budget.maxP95, "absolute"));
  }

  return {
    schemaVersion: SERVER_BENCHMARK_BUDGET_SCHEMA_VERSION,
    passed: checks.every((item) => item.passed),
    checks,
    failures: checks.filter((item) => !item.passed),
  };
}

export function validateServerBenchmarkBudgetConfig(config) {
  if (config?.schemaVersion !== SERVER_BENCHMARK_BUDGET_SCHEMA_VERSION) {
    throw new TypeError(`server benchmark budget schemaVersion must be ${SERVER_BENCHMARK_BUDGET_SCHEMA_VERSION}`);
  }
  if (config.resultSchemaVersion !== SERVER_BENCHMARK_RESULT_SCHEMA_VERSION) {
    throw new TypeError(`server benchmark resultSchemaVersion must be ${SERVER_BENCHMARK_RESULT_SCHEMA_VERSION}`);
  }
  if (typeof config.profileId !== "string" || config.profileId.length === 0) {
    throw new TypeError("server benchmark budget profileId must be a non-empty string");
  }
  if (typeof config.fixtureFingerprint !== "string" || config.fixtureFingerprint.length === 0) {
    throw new TypeError("server benchmark budget fixtureFingerprint must be a non-empty string");
  }
  if (!Number.isSafeInteger(config.minimumRuns) || config.minimumRuns < 3) {
    throw new TypeError("server benchmark budget minimumRuns must be an integer of at least 3");
  }
  if (!Number.isSafeInteger(config.minimumWarmups) || config.minimumWarmups < 1) {
    throw new TypeError("server benchmark budget minimumWarmups must be a positive integer");
  }
  if (!Number.isFinite(config.delayMs) || config.delayMs < 0) {
    throw new TypeError("server benchmark budget delayMs must be a non-negative finite number");
  }
  const workloadFields = ["rowCount", "filteredRowCount", "groupedDisplayedRows", "treeRowCount", "sortFirstRowId"];
  validateExactKeys(config.workload, workloadFields, "workload");
  for (const field of ["rowCount", "filteredRowCount", "groupedDisplayedRows", "treeRowCount"]) {
    if (!Number.isSafeInteger(config.workload?.[field]) || config.workload[field] < 1) {
      throw new TypeError(`server benchmark workload ${field} must be a positive integer`);
    }
  }
  if (typeof config.workload.sortFirstRowId !== "string" || config.workload.sortFirstRowId.length === 0) {
    throw new TypeError("server benchmark workload sortFirstRowId must be a non-empty string");
  }
  if (config.workload.filteredRowCount > config.workload.rowCount || config.workload.groupedDisplayedRows < config.workload.rowCount) {
    throw new TypeError("server benchmark workload row counts are inconsistent");
  }

  validateExactKeys(config.timing, Object.keys(SERVER_BENCHMARK_METRICS), "timing");
  for (const [metric, budget] of Object.entries(config.timing)) {
    if (!TIMING_BASES.has(budget?.basis)) throw new TypeError(`server timing basis is invalid for ${metric}`);
    positiveFinite(budget.maxMedianMs, `server timing maxMedianMs for ${metric}`);
    positiveFinite(budget.maxP95Ms, `server timing maxP95Ms for ${metric}`);
    if (budget.maxP95Ms < budget.maxMedianMs) throw new TypeError(`server timing p95 budget must be at least the median budget for ${metric}`);
  }

  validateExactKeys(config.resources, [...RESOURCE_METRICS], "resource");
  for (const [metric, budget] of Object.entries(config.resources)) {
    positiveFinite(budget?.maxP95, `server resource maxP95 for ${metric}`);
  }
}

export function formatServerBenchmarkBudgetMarkdown(result) {
  if (!result || !Array.isArray(result.checks)) throw new TypeError("server benchmark budget result must include checks");
  const lines = [
    "# Open Grid Server Benchmark Budget",
    "",
    `- Status: ${result.passed ? "passed" : "failed"}`,
    `- Schema: ${result.schemaVersion}`,
    "",
    "| Check | Basis | Value | Maximum | Status |",
    "| --- | --- | ---: | ---: | --- |",
    ...result.checks.map((item) => `| ${item.id} | ${item.basis} | ${formatValue(item)} | ${formatMaximum(item)} | ${item.passed ? "pass" : "fail"} |`),
  ];
  return `${lines.join("\n")}\n`;
}

function validateServerBenchmarkResult(config, result) {
  if (result?.schemaVersion !== config.resultSchemaVersion || result.status !== "observational") {
    throw new TypeError("server benchmark result schema or status does not match the budget");
  }
  if (result.config?.profileId !== config.profileId || result.config?.delayMs !== config.delayMs) {
    throw new TypeError("server benchmark result profile or delay does not match the budget");
  }
  if (!Number.isSafeInteger(result.config.runs) || result.config.runs < config.minimumRuns
    || !Number.isSafeInteger(result.config.warmups) || result.config.warmups < config.minimumWarmups) {
    throw new TypeError("server benchmark result does not satisfy the required runs and warmups");
  }
  if (result.fixtureFingerprint !== config.fixtureFingerprint || !Array.isArray(result.runs)) {
    throw new TypeError("server benchmark fixture or runs do not match the budget");
  }
  const expectedRunCount = result.config.runs + result.config.warmups;
  if (result.runs.length !== expectedRunCount) throw new TypeError("server benchmark run count does not match its configuration");

  const actionContracts = createActionContracts(config.workload);
  for (let index = 0; index < result.runs.length; index += 1) {
    const run = result.runs[index];
    if (run?.index !== index || run.warmup !== (index < result.config.warmups)) {
      throw new TypeError("server benchmark run indexes or warm-up markers are invalid");
    }
    if (run.configuredDelayMs !== config.delayMs || run.fixtureFingerprint !== config.fixtureFingerprint) {
      throw new TypeError("server benchmark run identity does not match the budget");
    }
    for (const metric of Object.keys(SERVER_BENCHMARK_METRICS)) readNonNegative(run.metrics?.[metric], `server run metric ${metric}`);
    for (const metric of RESOURCE_METRICS) readNonNegative(run.resources?.[metric], `server run resource ${metric}`);
    validateActionSnapshots(run.actionSnapshots, actionContracts);
    validateFinalSnapshot(run.finalSnapshot, actionContracts);
  }

  const recordedRuns = result.runs.filter((run) => !run.warmup);
  const recomputedSummary = summarizeServerBenchmarkRuns(recordedRuns, config.delayMs);
  validateSummary(result.summary, recomputedSummary);
  const expectedValidation = { started: 10, completed: 9, aborted: 1, inFlight: 0, staleResponses: 0 };
  for (const [field, expected] of Object.entries(expectedValidation)) {
    if (result.validation?.[field] !== expected) throw new TypeError(`server benchmark validation ${field} is invalid`);
  }
  return recordedRuns;
}

function validateSummary(summary, expectedSummary) {
  validateExactKeys(summary, Object.keys(SERVER_BENCHMARK_METRICS), "summary");
  for (const [metric, expected] of Object.entries(expectedSummary)) {
    for (const field of ["median", "p95", "min", "max", "transportMs", "medianClientOverheadMs"]) {
      const value = readNonNegative(summary[metric]?.[field], `server summary ${metric}.${field}`);
      if (Math.abs(value - expected[field]) > 1e-9) throw new TypeError(`server summary ${metric}.${field} does not match recorded runs`);
    }
  }
}

function validateActionSnapshots(snapshots, actionContracts) {
  validateExactKeys(snapshots, Object.keys(actionContracts), "action snapshot");
  for (const [actionId, contract] of Object.entries(actionContracts)) {
    const snapshot = snapshots[actionId];
    const expected = { ...contract, operation: actionId };
    for (const field of ["mode", "operation", "revision", "totalRows", "displayedRows", "sorting", "filter", "pageIndex"]) {
      if (snapshot?.[field] !== expected[field]) throw new TypeError(`server action snapshot ${actionId}.${field} is invalid`);
    }
    if (snapshot.mountedRows !== 19 || snapshot.mountedCells !== 133 || snapshot.staleResponses !== 0) {
      throw new TypeError(`server action snapshot ${actionId} mounted work is invalid`);
    }
    const signature = typeof snapshot.mountedRowSignature === "string" ? snapshot.mountedRowSignature.split("|") : [];
    if (signature.length !== snapshot.mountedRows || signature[0] !== contract.firstRowId) {
      throw new TypeError(`server action snapshot ${actionId} signature is invalid`);
    }
    for (const field of ["started", "completed", "aborted", "inFlight"]) {
      if (snapshot.transport?.[field] !== contract.transport[field]) throw new TypeError(`server action snapshot ${actionId} transport is invalid`);
    }
  }
}

function validateFinalSnapshot(snapshot, actionContracts) {
  const patch = actionContracts.patch;
  if (snapshot?.mode !== patch.mode || snapshot.operation !== "patch" || snapshot.revision !== 1
    || snapshot.transport?.started !== 10 || snapshot.transport?.completed !== 9
    || snapshot.transport?.aborted !== 1 || snapshot.transport?.inFlight !== 0
    || snapshot.staleResponses !== 0) {
    throw new TypeError("server benchmark final snapshot did not settle cleanly");
  }
}

function createActionContracts(workload) {
  return {
    page: action("flat", 0, workload.rowCount, 100, "", "", 3, 2, 2, 0, "SBT-0301"),
    sort: action("flat", 0, workload.rowCount, 100, "value:desc", "", 0, 3, 3, 0, workload.sortFirstRowId),
    filter: action("flat", 0, workload.filteredRowCount, 100, "", "Orbit", 0, 4, 4, 0, "SBT-0004"),
    cancel: action("flat", 0, workload.filteredRowCount, 100, "", "Northwind", 0, 6, 5, 1, "SBT-0002"),
    group: action("group", 0, workload.rowCount, workload.groupedDisplayedRows, "value:desc", "", 0, 7, 6, 1, "group:status%3DResolved"),
    tree: action("tree", 0, workload.treeRowCount, 29, "", "", 0, 9, 8, 1, "PFL-001"),
    patch: action("tree", 1, workload.treeRowCount, 29, "", "", 0, 10, 9, 1, "PFL-001"),
  };
}

function action(mode, revision, totalRows, displayedRows, sorting, filter, pageIndex, started, completed, aborted, firstRowId) {
  return Object.freeze({
    mode,
    revision,
    totalRows,
    displayedRows,
    sorting,
    filter,
    pageIndex,
    firstRowId,
    transport: Object.freeze({ started, completed, aborted, inFlight: 0 }),
  });
}

function check(id, kind, metric, statistic, value, maximum, basis) {
  return { id, kind, metric, statistic, basis, value, maximum, passed: value <= maximum };
}

function validateExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`server benchmark ${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    throw new TypeError(`server benchmark ${label} keys do not match the contract`);
  }
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} must be a positive finite number`);
  return value;
}

function readNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a non-negative finite number`);
  return value;
}

function percentile(sortedValues, quantile) {
  return sortedValues[Math.max(0, Math.ceil(sortedValues.length * quantile) - 1)];
}

function formatValue(item) {
  return item.kind === "timing" ? `${item.value.toFixed(2)} ms` : item.value.toLocaleString("en-US");
}

function formatMaximum(item) {
  return item.kind === "timing" ? `${item.maximum.toFixed(2)} ms` : item.maximum.toLocaleString("en-US");
}
