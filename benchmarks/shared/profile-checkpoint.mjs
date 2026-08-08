import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { BENCHMARK_RESULT_SCHEMA_VERSION } from "./results.mjs";

const ENVIRONMENT_IDENTITY_FIELDS = [
  "platform",
  "cpu",
  "logicalCpuCount",
  "totalMemoryBytes",
  "node",
  "browser",
  "gitRevision",
  "gitDirty",
  "sourceFingerprint",
];

export function readBenchmarkProfileCheckpoint(checkpointPath, expected) {
  let result;
  try {
    result = JSON.parse(readFileSync(checkpointPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "missing" };
    return { status: "incompatible", reason: `cannot read checkpoint: ${error.message}` };
  }

  try {
    validateBenchmarkProfileCheckpoint(result, expected);
    return { status: "reused", result };
  } catch (error) {
    return { status: "incompatible", reason: error.message };
  }
}

export function writeBenchmarkProfileCheckpoint(checkpointPath, result) {
  mkdirSync(dirname(checkpointPath), { recursive: true });
  const temporaryPath = `${checkpointPath}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(result, null, 2)}\n`);
  renameSync(temporaryPath, checkpointPath);
}

export function validateBenchmarkProfileCheckpoint(result, expected) {
  if (result?.schemaVersion !== BENCHMARK_RESULT_SCHEMA_VERSION) {
    throw new TypeError(`checkpoint result schema must be ${BENCHMARK_RESULT_SCHEMA_VERSION}`);
  }
  for (const field of ["suite", "profileId", "runs", "warmups"]) {
    if (result.config?.[field] !== expected[field]) {
      throw new TypeError(`checkpoint ${field} does not match`);
    }
  }
  for (const field of ENVIRONMENT_IDENTITY_FIELDS) {
    if (result.environment?.[field] !== expected.environment?.[field]) {
      throw new TypeError(`checkpoint environment ${field} does not match`);
    }
  }
  if (!Array.isArray(result.implementations) || result.implementations.length !== expected.implementations.length) {
    throw new TypeError("checkpoint implementations do not match");
  }
  const totalRuns = expected.runs + expected.warmups;
  for (let implementationIndex = 0; implementationIndex < expected.implementations.length; implementationIndex += 1) {
    const implementation = result.implementations[implementationIndex];
    const expectedImplementation = expected.implementations[implementationIndex];
    if (implementation?.id !== expectedImplementation.id || implementation?.version !== expectedImplementation.version) {
      throw new TypeError("checkpoint implementation identity does not match");
    }
    if (!Array.isArray(implementation.runs) || implementation.runs.length !== totalRuns) {
      throw new TypeError(`checkpoint ${implementation.id} run count does not match`);
    }
    if (implementation.runs.some((run, index) =>
      run?.warmup !== (index < expected.warmups)
      || run?.datasetFingerprint !== result.datasetFingerprint)) {
      throw new TypeError(`checkpoint ${implementation.id} run identity does not match`);
    }
    if (!implementation.summary || typeof implementation.summary !== "object") {
      throw new TypeError(`checkpoint ${implementation.id} summary is missing`);
    }
  }
  if (typeof result.datasetFingerprint !== "string" || result.datasetFingerprint.length === 0) {
    throw new TypeError("checkpoint dataset fingerprint is missing");
  }
}
