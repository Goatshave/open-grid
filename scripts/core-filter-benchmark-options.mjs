import { resolve } from "node:path";
import { BENCHMARK_PROFILES } from "../benchmarks/shared/index.mjs";
import { CORE_COMPUTE_WORKLOAD_IDS } from "../benchmarks/shared/core-compute.mjs";

export const DEFAULT_CORE_BENCHMARK_PROFILE_IDS = [
  "small-interactive",
  "standard-client",
  "stress-client",
];

export const CORE_BENCHMARK_WORKLOADS = CORE_COMPUTE_WORKLOAD_IDS;

const ALL_PROFILE_IDS = BENCHMARK_PROFILES.map((profile) => profile.id);

export function parseCoreBenchmarkOptions(argv) {
  const parsed = {
    runs: 200,
    warmups: 40,
    profileIds: [...DEFAULT_CORE_BENCHMARK_PROFILE_IDS],
    workloadIds: [...CORE_BENCHMARK_WORKLOADS],
    jsonOut: resolve(".benchmark-results/core-filter/latest.json"),
    markdownOut: resolve(".benchmark-results/core-filter/latest.md"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    const value = argv[index + 1];
    if (["--runs", "--warmups", "--profiles", "--workloads", "--json-out", "--markdown-out"].includes(argument) && (value === undefined || value.startsWith("--"))) {
      throw new TypeError(`${argument} requires a value`);
    }
    if (argument === "--runs") parsed.runs = positiveInteger(value, argument);
    else if (argument === "--warmups") parsed.warmups = nonNegativeInteger(value, argument);
    else if (argument === "--profiles") parsed.profileIds = parseSelection(value, ALL_PROFILE_IDS, argument);
    else if (argument === "--workloads") parsed.workloadIds = parseSelection(value, CORE_BENCHMARK_WORKLOADS, argument);
    else if (argument === "--json-out") parsed.jsonOut = resolve(value);
    else if (argument === "--markdown-out") parsed.markdownOut = resolve(value);
    else throw new TypeError(`unknown argument: ${argument}`);
    index += 1;
  }

  return parsed;
}

function parseSelection(value, allowedValues, name) {
  if (value === "all") return [...allowedValues];
  const selected = value.split(",").map((item) => item.trim());
  if (selected.some((item) => item.length === 0)) {
    throw new TypeError(`${name} must be 'all' or a comma-separated list`);
  }
  if (new Set(selected).size !== selected.length) {
    throw new TypeError(`${name} must not contain duplicates`);
  }
  const unknown = selected.find((item) => !allowedValues.includes(item));
  if (unknown) throw new RangeError(`unknown ${name.slice(2, -1)}: ${unknown}`);
  return selected;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new RangeError(`${name} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return parsed;
}
