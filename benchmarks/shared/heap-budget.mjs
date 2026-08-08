export const BENCHMARK_HEAP_BUDGET_SCHEMA_VERSION = 1;

const METRIC_READERS = Object.freeze({
  selfSizeBytes: (implementation) => implementation.heap?.selfSizeBytes,
  nodeCount: (implementation) => implementation.heap?.nodeCount,
  jsHeapUsedBytes: (implementation) => implementation.jsHeapUsedBytes,
});

export function evaluateHeapBudgets(config, profileResult) {
  validateHeapBudgetConfig(config);
  validateHeapProfileResult(config, profileResult);

  const byId = new Map(profileResult.implementations.map((implementation) => [implementation.id, implementation]));
  const measurements = config.implementations.map((configured) => {
    const implementation = byId.get(configured.id);
    return {
      id: configured.id,
      selfSizeBytes: readMetric(implementation, "selfSizeBytes"),
      nodeCount: readMetric(implementation, "nodeCount"),
      jsHeapUsedBytes: readMetric(implementation, "jsHeapUsedBytes"),
    };
  });
  const measurementById = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  const checks = [];

  for (const implementation of config.implementations) {
    const measurement = measurementById.get(implementation.id);
    for (const [metric, maximum] of Object.entries(implementation.limits)) {
      checks.push({
        id: `${implementation.id}:${metric}`,
        type: "absolute",
        applicationId: implementation.id,
        metric,
        actual: measurement[metric],
        maximum,
        passed: measurement[metric] <= maximum,
      });
    }
  }

  for (const comparison of config.comparisons ?? []) {
    const candidate = measurementById.get(comparison.candidateId);
    const baseline = measurementById.get(comparison.baselineId);
    const maximum = baseline[comparison.metric] + comparison.maxDelta;
    checks.push({
      id: `${comparison.candidateId}:${comparison.metric}:${comparison.baselineId}`,
      type: "relative",
      applicationId: comparison.candidateId,
      baselineId: comparison.baselineId,
      metric: comparison.metric,
      actual: candidate[comparison.metric],
      baseline: baseline[comparison.metric],
      maxDelta: comparison.maxDelta,
      maximum,
      passed: candidate[comparison.metric] <= maximum,
    });
  }

  return {
    schemaVersion: BENCHMARK_HEAP_BUDGET_SCHEMA_VERSION,
    profileId: config.profileId,
    phase: config.phase,
    passed: checks.every((check) => check.passed),
    measurements,
    checks,
    failures: checks.filter((check) => !check.passed),
  };
}

export function validateHeapBudgetConfig(config) {
  if (config?.schemaVersion !== BENCHMARK_HEAP_BUDGET_SCHEMA_VERSION) {
    throw new TypeError(`heap budget schemaVersion must be ${BENCHMARK_HEAP_BUDGET_SCHEMA_VERSION}`);
  }
  if (typeof config.profileId !== "string" || config.profileId.length === 0) {
    throw new TypeError("heap budget profileId must be a non-empty string");
  }
  if (config.phase !== "initial-ready" && config.phase !== "settled-workload") {
    throw new TypeError("heap budget phase must be initial-ready or settled-workload");
  }
  if (!Array.isArray(config.implementations) || config.implementations.length === 0) {
    throw new TypeError("heap budget implementations must be a non-empty array");
  }

  const implementationIds = new Set();
  for (const implementation of config.implementations) {
    if (typeof implementation?.id !== "string" || implementation.id.length === 0 || implementationIds.has(implementation.id)) {
      throw new TypeError("heap budget implementation ids must be unique non-empty strings");
    }
    if (!implementation.limits || typeof implementation.limits !== "object") {
      throw new TypeError(`heap budget limits for ${implementation.id} are required`);
    }
    for (const metric of Object.keys(METRIC_READERS)) {
      validateBytes(implementation.limits[metric], `${implementation.id}/${metric}`);
    }
    for (const metric of Object.keys(implementation.limits)) validateMetric(metric);
    implementationIds.add(implementation.id);
  }

  if (config.comparisons !== undefined && !Array.isArray(config.comparisons)) {
    throw new TypeError("heap budget comparisons must be an array");
  }
  for (const comparison of config.comparisons ?? []) {
    if (!implementationIds.has(comparison?.candidateId) || !implementationIds.has(comparison?.baselineId) || comparison.candidateId === comparison.baselineId) {
      throw new TypeError("heap budget comparisons must reference distinct configured implementations");
    }
    validateMetric(comparison.metric);
    validateBytes(comparison.maxDelta, `${comparison.candidateId}/maxDelta`, true);
  }
}

export function formatHeapBudgetMarkdown(result) {
  if (!result || !Array.isArray(result.measurements) || !Array.isArray(result.checks)) {
    throw new TypeError("heap budget result must include measurements and checks");
  }
  const lines = [
    "# Open Grid Heap Budget",
    "",
    `- Status: ${result.passed ? "passed" : "failed"}`,
    `- Schema: ${result.schemaVersion}`,
    `- Profile: ${result.profileId}`,
    `- Phase: ${result.phase}`,
    "",
    "| Renderer | V8 self size | V8 nodes | Browser heap |",
    "| --- | ---: | ---: | ---: |",
    ...result.measurements.map((measurement) =>
      `| ${measurement.id} | ${formatBytes(measurement.selfSizeBytes)} | ${measurement.nodeCount} | ${formatBytes(measurement.jsHeapUsedBytes)} |`,
    ),
    "",
    "| Check | Actual | Maximum | Status |",
    "| --- | ---: | ---: | --- |",
    ...result.checks.map((check) =>
      `| ${check.id} | ${formatMetric(check.actual, check.metric)} | ${formatMetric(check.maximum, check.metric)} | ${check.passed ? "pass" : "fail"} |`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function validateHeapProfileResult(config, result) {
  if (result?.schemaVersion !== 2 || result.config?.profileId !== config.profileId || result.config?.phase !== config.phase) {
    throw new TypeError("heap profile result schema, profile, or phase does not match the budget");
  }
  if (typeof result.datasetFingerprint !== "string" || result.datasetFingerprint.length === 0 || !Array.isArray(result.implementations)) {
    throw new TypeError("heap profile result must include a dataset fingerprint and implementations");
  }

  const expectedIds = new Set(config.implementations.map((implementation) => implementation.id));
  const resultIds = new Set();
  for (const implementation of result.implementations) {
    if (!expectedIds.has(implementation?.id) || resultIds.has(implementation.id)) {
      throw new TypeError("heap profile result contains an unknown or duplicate implementation");
    }
    for (const metric of Object.keys(METRIC_READERS)) readMetric(implementation, metric);
    if (!implementation.snapshot || typeof implementation.datasetFingerprint !== "string") {
      throw new TypeError(`heap profile result for ${implementation.id} is missing comparable work`);
    }
    resultIds.add(implementation.id);
  }
  if (resultIds.size !== expectedIds.size) throw new TypeError("heap profile result is missing a configured implementation");

  const fingerprints = new Set(result.implementations.map((implementation) => implementation.datasetFingerprint));
  if (fingerprints.size !== 1 || !fingerprints.has(result.datasetFingerprint)) {
    throw new TypeError("heap profile result datasets are not comparable");
  }
  for (const field of ["rowCount", "columnCount", "displayedRowCount", "mountedRowCount", "mountedCellCount"]) {
    const values = new Set(result.implementations.map((implementation) => implementation.snapshot[field]));
    if (values.size !== 1 || [...values].some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new TypeError(`heap profile result ${field} values are not comparable`);
    }
  }
}

function readMetric(implementation, metric) {
  const value = METRIC_READERS[metric](implementation);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`heap profile ${implementation?.id ?? "implementation"}/${metric} must be a non-negative safe integer`);
  }
  return value;
}

function validateMetric(metric) {
  if (!(metric in METRIC_READERS)) throw new TypeError(`unsupported heap budget metric: ${metric}`);
}

function validateBytes(value, label, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError(`heap budget ${label} must be ${allowZero ? "a non-negative" : "a positive"} safe integer`);
  }
}

function formatMetric(value, metric) {
  return metric === "nodeCount" ? String(value) : formatBytes(value);
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}
