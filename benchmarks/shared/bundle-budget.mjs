import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

export const BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION = 1;

const METRICS = new Set([
  "javascriptGzipBytes",
  "stylesheetGzipBytes",
  "totalGzipBytes",
]);

export function measureBundleBudgets(config, rootDirectory) {
  validateBundleBudgetConfig(config);
  if (typeof rootDirectory !== "string" || rootDirectory.length === 0) {
    throw new TypeError("bundle budget rootDirectory must be a non-empty string");
  }

  const root = path.resolve(rootDirectory);
  const measurements = config.applications.map((application) => measureApplication(root, application));
  const byId = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  const checks = [];

  for (const application of config.applications) {
    const measurement = byId.get(application.id);
    for (const [metric, maximumBytes] of Object.entries(application.limits ?? {})) {
      checks.push({
        id: `${application.id}:${metric}`,
        type: "absolute",
        applicationId: application.id,
        metric,
        actualBytes: measurement[metric],
        maximumBytes,
        passed: measurement[metric] <= maximumBytes,
      });
    }
  }

  for (const comparison of config.comparisons ?? []) {
    const candidate = byId.get(comparison.candidateId);
    const baseline = byId.get(comparison.baselineId);
    const maximumBytes = baseline[comparison.metric] + comparison.maxDeltaBytes;
    checks.push({
      id: `${comparison.candidateId}:${comparison.metric}:${comparison.baselineId}`,
      type: "relative",
      applicationId: comparison.candidateId,
      baselineId: comparison.baselineId,
      metric: comparison.metric,
      actualBytes: candidate[comparison.metric],
      baselineBytes: baseline[comparison.metric],
      maxDeltaBytes: comparison.maxDeltaBytes,
      maximumBytes,
      passed: candidate[comparison.metric] <= maximumBytes,
    });
  }

  return {
    schemaVersion: BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION,
    passed: checks.every((check) => check.passed),
    measurements,
    checks,
    failures: checks.filter((check) => !check.passed),
  };
}

export function validateBundleBudgetConfig(config) {
  if (config?.schemaVersion !== BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION) {
    throw new TypeError(`bundle budget schemaVersion must be ${BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(config.applications) || config.applications.length === 0) {
    throw new TypeError("bundle budget applications must be a non-empty array");
  }

  const ids = new Set();
  for (const application of config.applications) {
    if (typeof application?.id !== "string" || application.id.length === 0 || ids.has(application.id)) {
      throw new TypeError("bundle budget application ids must be unique non-empty strings");
    }
    if (typeof application.distDirectory !== "string" || application.distDirectory.length === 0 || path.isAbsolute(application.distDirectory)) {
      throw new TypeError(`bundle budget distDirectory for ${application.id} must be relative`);
    }
    ids.add(application.id);
    for (const [metric, maximumBytes] of Object.entries(application.limits ?? {})) {
      validateMetric(metric);
      validateBytes(maximumBytes, `${application.id} ${metric}`);
    }
  }

  if (config.comparisons !== undefined && !Array.isArray(config.comparisons)) {
    throw new TypeError("bundle budget comparisons must be an array");
  }
  for (const comparison of config.comparisons ?? []) {
    if (!ids.has(comparison?.candidateId) || !ids.has(comparison?.baselineId) || comparison.candidateId === comparison.baselineId) {
      throw new TypeError("bundle budget comparisons must reference distinct configured applications");
    }
    validateMetric(comparison.metric);
    validateDeltaBytes(comparison.maxDeltaBytes, `${comparison.candidateId} maxDeltaBytes`);
  }
}

export function formatBundleBudgetMarkdown(result) {
  if (!result || !Array.isArray(result.measurements) || !Array.isArray(result.checks)) {
    throw new TypeError("bundle budget result must include measurements and checks");
  }

  const lines = [
    "# Open Grid Bundle Budget",
    "",
    `- Status: ${result.passed ? "passed" : "failed"}`,
    `- Schema: ${result.schemaVersion}`,
    "",
    "| Application | JavaScript gzip | Stylesheet gzip | Total gzip | Files |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...result.measurements.map((measurement) =>
      `| ${measurement.id} | ${formatBytes(measurement.javascriptGzipBytes)} | ${formatBytes(measurement.stylesheetGzipBytes)} | ${formatBytes(measurement.totalGzipBytes)} | ${measurement.fileCount} |`,
    ),
    "",
    "| Check | Actual | Maximum | Status |",
    "| --- | ---: | ---: | --- |",
    ...result.checks.map((check) =>
      `| ${check.id} | ${formatBytes(check.actualBytes)} | ${formatBytes(check.maximumBytes)} | ${check.passed ? "pass" : "fail"} |`,
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function measureApplication(root, application) {
  const directory = path.resolve(root, application.distDirectory);
  if (directory !== root && !directory.startsWith(`${root}${path.sep}`)) {
    throw new TypeError(`bundle budget distDirectory for ${application.id} escapes the root`);
  }

  const files = collectFiles(directory).filter((file) => !file.endsWith(".map"));
  if (files.length === 0) {
    throw new TypeError(`bundle budget application ${application.id} has no built files`);
  }

  let javascriptGzipBytes = 0;
  let stylesheetGzipBytes = 0;
  let totalGzipBytes = 0;
  for (const file of files) {
    const gzipBytes = gzipSync(readFileSync(file), { level: 9 }).byteLength;
    totalGzipBytes += gzipBytes;
    if (file.endsWith(".js")) javascriptGzipBytes += gzipBytes;
    if (file.endsWith(".css")) stylesheetGzipBytes += gzipBytes;
  }

  return {
    id: application.id,
    fileCount: files.length,
    javascriptGzipBytes,
    stylesheetGzipBytes,
    totalGzipBytes,
  };
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

function validateMetric(metric) {
  if (!METRICS.has(metric)) throw new TypeError(`unsupported bundle budget metric: ${metric}`);
}

function validateBytes(value, label, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError(`bundle budget ${label} must be ${allowZero ? "a non-negative" : "a positive"} safe integer`);
  }
}

function validateDeltaBytes(value, label) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`bundle budget ${label} must be a safe integer`);
  }
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(2)} KiB`;
}
