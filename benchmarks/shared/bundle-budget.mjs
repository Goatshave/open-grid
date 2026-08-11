import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

export const BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION = 2;

const ENFORCEMENT_MODES = new Set(["required", "diagnostic"]);

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
    const enforcement = application.enforcement ?? "required";
    for (const [metric, maximumBytes] of Object.entries(application.limits ?? {})) {
      checks.push({
        id: `${application.id}:${metric}`,
        type: "absolute",
        applicationId: application.id,
        metric,
        enforcement,
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
      enforcement: comparison.enforcement ?? "required",
      actualBytes: candidate[comparison.metric],
      baselineBytes: baseline[comparison.metric],
      maxDeltaBytes: comparison.maxDeltaBytes,
      maximumBytes,
      passed: candidate[comparison.metric] <= maximumBytes,
    });
  }

  return {
    schemaVersion: BENCHMARK_BUNDLE_BUDGET_SCHEMA_VERSION,
    passed: checks.every((check) => check.enforcement !== "required" || check.passed),
    measurements,
    checks,
    failures: checks.filter((check) => check.enforcement === "required" && !check.passed),
    diagnostics: checks.filter((check) => check.enforcement === "diagnostic" && !check.passed),
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
    validateEnforcement(application.enforcement, `${application.id} enforcement`);
    validateExtensions(application.includeExtensions, `${application.id} includeExtensions`);
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
    validateEnforcement(comparison.enforcement, `${comparison.candidateId} comparison enforcement`);
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
    "| Target | Mode | JavaScript gzip | Stylesheet gzip | Total gzip | Files |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...result.measurements.map((measurement) =>
      `| ${measurement.id} | ${measurement.enforcement} | ${formatBytes(measurement.javascriptGzipBytes)} | ${formatBytes(measurement.stylesheetGzipBytes)} | ${formatBytes(measurement.totalGzipBytes)} | ${measurement.fileCount} |`,
    ),
    "",
    "| Check | Mode | Actual | Maximum | Status |",
    "| --- | --- | ---: | ---: | --- |",
    ...result.checks.map((check) =>
      `| ${check.id} | ${check.enforcement} | ${formatBytes(check.actualBytes)} | ${formatBytes(check.maximumBytes)} | ${check.passed ? "pass" : check.enforcement === "required" ? "fail" : "diagnostic"} |`,
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function measureApplication(root, application) {
  const directory = path.resolve(root, application.distDirectory);
  if (directory !== root && !directory.startsWith(`${root}${path.sep}`)) {
    throw new TypeError(`bundle budget distDirectory for ${application.id} escapes the root`);
  }

  const includedExtensions = application.includeExtensions ? new Set(application.includeExtensions) : null;
  const files = collectFiles(directory).filter((file) => {
    if (file.endsWith(".map")) return false;
    return includedExtensions === null || includedExtensions.has(path.extname(file));
  });
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
    enforcement: application.enforcement ?? "required",
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

function validateEnforcement(value, label) {
  if (value !== undefined && !ENFORCEMENT_MODES.has(value)) {
    throw new TypeError(`bundle budget ${label} must be required or diagnostic`);
  }
}

function validateExtensions(value, label) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) {
    throw new TypeError(`bundle budget ${label} must be a non-empty array of unique extensions`);
  }
  for (const extension of value) {
    if (typeof extension !== "string" || !/^\.[a-z0-9]+$/i.test(extension)) {
      throw new TypeError(`bundle budget ${label} contains an invalid extension`);
    }
  }
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(2)} KiB`;
}
