import { BENCHMARK_METRICS, BENCHMARK_RESULT_SCHEMA_VERSION } from "./results.mjs";

export const BENCHMARK_MATRIX_SCHEMA_VERSION = 2;

export function createBenchmarkMatrix(results) {
  if (!Array.isArray(results) || results.length < 2) {
    throw new RangeError("at least two benchmark profile results are required");
  }
  if (results.some((result) => result?.schemaVersion !== BENCHMARK_RESULT_SCHEMA_VERSION)) {
    throw new TypeError(`benchmark matrix profiles must use result schema ${BENCHMARK_RESULT_SCHEMA_VERSION}`);
  }

  const profileIds = results.map((result) => result.config?.profileId);
  if (profileIds.some((profileId) => typeof profileId !== "string") || new Set(profileIds).size !== profileIds.length) {
    throw new TypeError("benchmark matrix profile ids must be present and unique");
  }

  const first = results[0];
  for (const result of results.slice(1)) {
    for (const key of ["suite", "runs", "warmups"]) {
      if (result.config?.[key] !== first.config?.[key]) {
        throw new TypeError(`benchmark matrix ${key} must match across profiles`);
      }
    }
    for (const key of ["browser", "platform", "gitRevision", "gitDirty", "sourceFingerprint"]) {
      if (result.environment?.[key] !== first.environment?.[key]) {
        throw new TypeError(`benchmark matrix environment ${key} must match across profiles`);
      }
    }
  }

  return {
    schemaVersion: BENCHMARK_MATRIX_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    status: "observational",
    config: {
      profileIds,
      suite: first.config.suite ?? "comparison",
      runs: first.config.runs,
      warmups: first.config.warmups,
    },
    environment: first.environment,
    profiles: results,
  };
}

export function formatBenchmarkMatrixMarkdown(matrix) {
  const implementationIds = matrix.profiles[0]?.implementations?.map((implementation) => implementation.id) ?? [];
  if (implementationIds.length === 0) {
    throw new TypeError("benchmark matrix requires implementation results");
  }

  const lines = [
    "# Open Grid Comparative Benchmark Matrix",
    "",
    `- Created: ${matrix.createdAt}`,
    `- Profiles: ${matrix.config.profileIds.join(", ")}`,
    `- Suite: ${matrix.config.suite ?? "comparison"}`,
    `- Recorded runs per profile: ${matrix.config.runs}`,
    `- Warm-up runs per profile: ${matrix.config.warmups}`,
    `- Browser: ${matrix.environment.browser}`,
    `- Platform: ${matrix.environment.platform}`,
    `- Revision: ${matrix.environment.gitRevision}${matrix.environment.gitDirty ? " (dirty)" : ""}`,
    `- Source fingerprint: ${matrix.environment.sourceFingerprint ?? "unavailable"}`,
    "- Status: observational matrix; not a parity or leadership claim",
  ];

  for (const [metricId, definition] of Object.entries(BENCHMARK_METRICS)) {
    lines.push(
      "",
      `## ${definition.label}`,
      "",
      `| Profile | ${implementationIds.map((implementationId) => `${implementationId} median / p95`).join(" | ")} |`,
      `| --- | ${implementationIds.map(() => "---:").join(" | ")} |`,
    );
    for (const profile of matrix.profiles) {
      const implementationById = new Map(profile.implementations.map((implementation) => [implementation.id, implementation]));
      const values = implementationIds.map((implementationId) => {
        const summary = implementationById.get(implementationId)?.summary?.[metricId];
        if (!summary || !Number.isFinite(summary.median)) {
          throw new TypeError(`missing ${metricId} summary for ${implementationId}`);
        }
        if (!Number.isFinite(summary.p95)) {
          throw new TypeError(`missing ${metricId} p95 summary for ${implementationId}`);
        }
        return `${formatMetric(summary.median, definition.unit)} / ${formatMetric(summary.p95, definition.unit)}`;
      });
      lines.push(`| ${profile.config.profileId} | ${values.join(" | ")} |`);
    }
  }

  lines.push("", "Raw per-run values and per-profile summaries are embedded in the adjacent JSON artifact.", "");
  return lines.join("\n");
}

function formatMetric(value, unit) {
  if (unit === "bytes") return `${(value / 1024).toFixed(1)} KiB`;
  if (unit === "ms") return `${value.toFixed(2)} ms`;
  return value.toFixed(0);
}
