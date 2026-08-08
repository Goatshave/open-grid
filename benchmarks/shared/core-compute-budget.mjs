import {
  CORE_COMPUTE_RESULT_SCHEMA_VERSION,
  CORE_COMPUTE_WORKLOAD_IDS,
  summarizeCoreComputeDurations,
} from "./core-compute.mjs";

export const CORE_COMPUTE_BUDGET_SCHEMA_VERSION = 1;

const FILTER_WORKLOADS = new Set(["global-filter", "column-filter"]);
const SORT_WORKLOADS = new Set(["numeric-sort", "numeric-sort-flip"]);

export function evaluateCoreComputeBudgets(config, result) {
  validateCoreComputeBudgetConfig(config);
  const statistics = validateCoreComputeResult(config, result);
  const rowScale = config.candidateProfile.rowCount / config.baselineProfile.rowCount;
  const checks = [];

  for (const workloadId of CORE_COMPUTE_WORKLOAD_IDS) {
    const budget = config.workloads[workloadId];
    for (const statistic of ["median", "p95"]) {
      const baselineValue = statistics.get(key(config.baselineProfile.id, workloadId, statistic));
      const candidateValue = statistics.get(key(config.candidateProfile.id, workloadId, statistic));
      const scaleRatio = candidateValue / baselineValue;
      const normalizedRatio = scaleRatio / rowScale;
      const maximum = statistic === "median" ? budget.maxMedianPerRowRatio : budget.maxP95PerRowRatio;
      checks.push({
        id: `scale:${workloadId}:${statistic}`,
        workloadId,
        statistic,
        baselineValue,
        candidateValue,
        rowScale,
        scaleRatio,
        normalizedRatio,
        maximum,
        passed: normalizedRatio <= maximum,
      });
    }
  }

  return {
    schemaVersion: CORE_COMPUTE_BUDGET_SCHEMA_VERSION,
    passed: checks.every((item) => item.passed),
    checks,
    failures: checks.filter((item) => !item.passed),
  };
}

export function validateCoreComputeBudgetConfig(config) {
  if (config?.schemaVersion !== CORE_COMPUTE_BUDGET_SCHEMA_VERSION) {
    throw new TypeError(`core compute budget schemaVersion must be ${CORE_COMPUTE_BUDGET_SCHEMA_VERSION}`);
  }
  if (config.resultSchemaVersion !== CORE_COMPUTE_RESULT_SCHEMA_VERSION) {
    throw new TypeError(`core compute resultSchemaVersion must be ${CORE_COMPUTE_RESULT_SCHEMA_VERSION}`);
  }
  if (!Number.isSafeInteger(config.minimumRuns) || config.minimumRuns < 3) {
    throw new TypeError("core compute minimumRuns must be an integer of at least 3");
  }
  if (!Number.isSafeInteger(config.minimumWarmups) || config.minimumWarmups < 1) {
    throw new TypeError("core compute minimumWarmups must be a positive integer");
  }
  validateStringArray(config.queries, 2, "queries");
  validateStringArray(config.sortDirections, 2, "sortDirections");
  if (typeof config.sortColumnId !== "string" || config.sortColumnId.length === 0) {
    throw new TypeError("core compute sortColumnId must be a non-empty string");
  }
  validateProfile(config.baselineProfile, "baselineProfile");
  validateProfile(config.candidateProfile, "candidateProfile");
  if (config.baselineProfile.id === config.candidateProfile.id
    || config.candidateProfile.rowCount <= config.baselineProfile.rowCount
    || config.candidateProfile.columnCount !== config.baselineProfile.columnCount) {
    throw new TypeError("core compute profile scale contract is invalid");
  }
  validateExactKeys(config.workloads, CORE_COMPUTE_WORKLOAD_IDS, "workloads");
  for (const workloadId of CORE_COMPUTE_WORKLOAD_IDS) {
    const budget = config.workloads[workloadId];
    positiveFinite(budget?.maxMedianPerRowRatio, `maxMedianPerRowRatio for ${workloadId}`);
    positiveFinite(budget?.maxP95PerRowRatio, `maxP95PerRowRatio for ${workloadId}`);
  }
}

export function formatCoreComputeBudgetMarkdown(result) {
  if (!result || !Array.isArray(result.checks)) throw new TypeError("core compute budget result must include checks");
  const lines = [
    "# Open Grid Core Compute Scale Budget",
    "",
    `- Status: ${result.passed ? "passed" : "failed"}`,
    `- Schema: ${result.schemaVersion}`,
    "",
    "| Check | Baseline | Massive | Raw scale | Per-row scale / maximum | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...result.checks.map((item) => `| ${item.id} | ${item.baselineValue.toFixed(3)} ms | ${item.candidateValue.toFixed(3)} ms | ${item.scaleRatio.toFixed(3)}x | ${item.normalizedRatio.toFixed(3)}x / ${item.maximum.toFixed(3)}x | ${item.passed ? "pass" : "fail"} |`),
  ];
  return `${lines.join("\n")}\n`;
}

function validateCoreComputeResult(config, result) {
  if (result?.schemaVersion !== config.resultSchemaVersion || result.status !== "observational") {
    throw new TypeError("core compute result schema or status does not match the budget");
  }
  if (!Number.isSafeInteger(result.config?.runs) || result.config.runs < config.minimumRuns
    || !Number.isSafeInteger(result.config?.warmups) || result.config.warmups < config.minimumWarmups) {
    throw new TypeError("core compute result does not satisfy the required runs and warmups");
  }
  assertArrayEquals(result.config.profileIds, [config.baselineProfile.id, config.candidateProfile.id], "profile ids");
  assertArrayEquals(result.config.workloads, CORE_COMPUTE_WORKLOAD_IDS, "workloads");
  assertArrayEquals(result.config.queries, config.queries, "queries");
  assertArrayEquals(result.config.sortDirections, config.sortDirections, "sort directions");
  if (result.config.sortColumnId !== config.sortColumnId) throw new TypeError("core compute sort column does not match the budget");
  if (!Array.isArray(result.profiles) || result.profiles.length !== 2) {
    throw new TypeError("core compute result must contain exactly two profiles");
  }

  const statistics = new Map();
  for (const expectedProfile of [config.baselineProfile, config.candidateProfile]) {
    const profile = result.profiles.find((item) => item?.profileId === expectedProfile.id);
    if (!profile || profile.rowCount !== expectedProfile.rowCount || profile.columnCount !== expectedProfile.columnCount) {
      throw new TypeError(`core compute profile ${expectedProfile.id} dimensions do not match the budget`);
    }
    if (!Array.isArray(profile.workloads) || profile.workloads.length !== CORE_COMPUTE_WORKLOAD_IDS.length) {
      throw new TypeError(`core compute profile ${expectedProfile.id} workloads do not match the budget`);
    }
    for (const workloadId of CORE_COMPUTE_WORKLOAD_IDS) {
      const workload = profile.workloads.find((item) => item?.workloadId === workloadId);
      validateWorkload(result.config, expectedProfile, workloadId, workload);
      statistics.set(key(expectedProfile.id, workloadId, "median"), workload.summary.median);
      statistics.set(key(expectedProfile.id, workloadId, "p95"), workload.summary.p95);
    }
  }
  return statistics;
}

function validateWorkload(resultConfig, profile, workloadId, workload) {
  if (!workload || !Array.isArray(workload.runs)) throw new TypeError(`core compute ${profile.id}/${workloadId} runs are missing`);
  const expectedRunCount = resultConfig.runs + resultConfig.warmups;
  if (workload.runs.length !== expectedRunCount) throw new TypeError(`core compute ${profile.id}/${workloadId} run count is invalid`);
  for (let index = 0; index < workload.runs.length; index += 1) {
    const run = workload.runs[index];
    if (run?.index !== index || run.warmup !== (index < resultConfig.warmups)) {
      throw new TypeError(`core compute ${profile.id}/${workloadId} run markers are invalid`);
    }
    positiveFinite(run.durationMs, `duration for ${profile.id}/${workloadId}`);
    const expectedQuery = FILTER_WORKLOADS.has(workloadId) ? resultConfig.queries[index % resultConfig.queries.length] : null;
    const expectedDirection = SORT_WORKLOADS.has(workloadId) ? resultConfig.sortDirections[index % resultConfig.sortDirections.length] : null;
    if (run.query !== expectedQuery || run.sortDirection !== expectedDirection) {
      throw new TypeError(`core compute ${profile.id}/${workloadId} workload identity is invalid`);
    }
    if (!Number.isSafeInteger(run.resultRowCount) || (FILTER_WORKLOADS.has(workloadId)
      ? run.resultRowCount <= 0 || run.resultRowCount >= profile.rowCount
      : run.resultRowCount !== profile.rowCount)) {
      throw new TypeError(`core compute ${profile.id}/${workloadId} result row count is invalid`);
    }
  }
  const recorded = workload.runs.filter((run) => !run.warmup).map((run) => run.durationMs);
  const expectedSummary = summarizeCoreComputeDurations(recorded);
  for (const field of ["median", "p95", "min", "max"]) {
    if (workload.summary?.[field] !== expectedSummary[field]) {
      throw new TypeError(`core compute ${profile.id}/${workloadId} summary ${field} does not match recorded runs`);
    }
  }
}

function validateProfile(profile, label) {
  validateExactKeys(profile, ["id", "rowCount", "columnCount"], label);
  if (typeof profile.id !== "string" || profile.id.length === 0
    || !Number.isSafeInteger(profile.rowCount) || profile.rowCount < 1
    || !Number.isSafeInteger(profile.columnCount) || profile.columnCount < 1) {
    throw new TypeError(`core compute ${label} is invalid`);
  }
}

function validateStringArray(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || new Set(value).size !== length
    || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new TypeError(`core compute ${label} must contain ${length} unique non-empty strings`);
  }
}

function validateExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`core compute ${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== expectedKeys.length || keys.some((item) => !expectedKeys.includes(item))) {
    throw new TypeError(`core compute ${label} keys do not match the contract`);
  }
}

function assertArrayEquals(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
    throw new TypeError(`core compute ${label} do not match the budget`);
  }
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`core compute ${label} must be a positive finite number`);
  return value;
}

function key(profileId, workloadId, statistic) {
  return `${profileId}\t${workloadId}\t${statistic}`;
}
