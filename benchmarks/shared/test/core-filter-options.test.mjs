import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_BENCHMARK_WORKLOADS,
  DEFAULT_CORE_BENCHMARK_PROFILE_IDS,
  parseCoreBenchmarkOptions,
} from "../../../scripts/core-filter-benchmark-options.mjs";

test("keeps the core compute benchmark defaults stable", () => {
  const options = parseCoreBenchmarkOptions([]);

  assert.deepEqual(options.profileIds, DEFAULT_CORE_BENCHMARK_PROFILE_IDS);
  assert.deepEqual(options.workloadIds, CORE_BENCHMARK_WORKLOADS);
  assert.equal(options.runs, 200);
  assert.equal(options.warmups, 40);
});

test("selects bounded core compute profiles and workloads", () => {
  const options = parseCoreBenchmarkOptions([
    "--profiles", "massive-virtual,stress-client",
    "--workloads", "global-filter,column-filter",
    "--runs", "10",
    "--warmups", "2",
  ]);

  assert.deepEqual(options.profileIds, ["massive-virtual", "stress-client"]);
  assert.deepEqual(options.workloadIds, ["global-filter", "column-filter"]);
  assert.equal(options.runs, 10);
  assert.equal(options.warmups, 2);

  const all = parseCoreBenchmarkOptions(["--profiles", "all", "--workloads", "all"]);
  assert.equal(all.profileIds.length, 6);
  assert.deepEqual(all.workloadIds, CORE_BENCHMARK_WORKLOADS);
});

test("rejects unknown, duplicate, empty, and missing core compute selections", () => {
  assert.throws(() => parseCoreBenchmarkOptions(["--profiles", "missing"]), /unknown profile: missing/);
  assert.throws(() => parseCoreBenchmarkOptions(["--profiles", "stress-client,stress-client"]), /must not contain duplicates/);
  assert.throws(() => parseCoreBenchmarkOptions(["--workloads", "global-filter,"]), /comma-separated list/);
  assert.throws(() => parseCoreBenchmarkOptions(["--workloads"]), /requires a value/);
  assert.throws(() => parseCoreBenchmarkOptions(["--profiles", "--runs", "10"]), /requires a value/);
});
