import assert from "node:assert/strict";
import test from "node:test";

import {
  BENCHMARK_DEFAULT_SEED,
  BENCHMARK_GENERATOR_VERSION,
  BENCHMARK_PROFILES,
  createBenchmarkAllRowSelection,
  createBenchmarkColumns,
  createBenchmarkDataset,
  createBenchmarkRow,
  fingerprintBenchmarkDataset,
  getBenchmarkProfile,
} from "../index.mjs";

test("defines the documented workload matrix", () => {
  assert.deepEqual(
    BENCHMARK_PROFILES.map(({ id, rowCount, columnCount }) => ({ id, rowCount, columnCount })),
    [
      { id: "small-interactive", rowCount: 1_000, columnCount: 20 },
      { id: "standard-client", rowCount: 10_000, columnCount: 20 },
      { id: "wide-client", rowCount: 10_000, columnCount: 100 },
      { id: "large-client", rowCount: 50_000, columnCount: 50 },
      { id: "stress-client", rowCount: 100_000, columnCount: 20 },
      { id: "massive-virtual", rowCount: 1_000_000, columnCount: 20 },
    ],
  );
  assert.equal(getBenchmarkProfile("wide-client").columnCount, 100);
  assert.throws(() => getBenchmarkProfile("missing"), /Unknown benchmark profile/);
});

test("creates stable columns with explicit comparison capabilities", () => {
  const columns = createBenchmarkColumns(12);
  assert.equal(columns.length, 12);
  assert.deepEqual(columns[1], {
    id: "column_1",
    label: "Group",
    kind: "category",
    sortable: true,
    filterable: true,
    groupable: true,
  });
  assert.equal(columns[9].label, "Metric 1");
  assert.equal(columns[9].groupable, false);
});

test("creates deterministic all-row selection without materializing row data", () => {
  assert.deepEqual(createBenchmarkAllRowSelection(3), {
    row_0: true,
    row_1: true,
    row_2: true,
  });
  assert.throws(() => createBenchmarkAllRowSelection(0), /rowCount must be a positive safe integer/);
});

test("generates identical rows for the same seed and different rows for another seed", () => {
  const first = createBenchmarkRow(42, 20, BENCHMARK_DEFAULT_SEED);
  const second = createBenchmarkRow(42, 20, BENCHMARK_DEFAULT_SEED);
  const changed = createBenchmarkRow(42, 20, 123);

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, changed);
  assert.equal(first.id, "row_42");
  assert.equal(first.column_0, "ITEM-0000043");
  assert.match(first.column_8, /^20\d\d-\d\d-\d\d$/);
});

test("fingerprints the complete generated data and generator contract", () => {
  const first = createBenchmarkDataset({ rowCount: 128, columnCount: 20 });
  const second = createBenchmarkDataset({ rowCount: 128, columnCount: 20 });
  const changed = createBenchmarkDataset({ rowCount: 128, columnCount: 20, seed: 123 });

  assert.equal(first.generatorVersion, BENCHMARK_GENERATOR_VERSION);
  assert.equal(first.rows.length, 128);
  assert.equal(Object.keys(first.rows[0]).length, 21);
  assert.equal(fingerprintBenchmarkDataset(first), fingerprintBenchmarkDataset(second));
  assert.notEqual(fingerprintBenchmarkDataset(first), fingerprintBenchmarkDataset(changed));
});

test("rejects invalid dimensions, indexes, seeds, and dataset values", () => {
  assert.throws(() => createBenchmarkColumns(0), /positive safe integer/);
  assert.throws(() => createBenchmarkDataset({ rowCount: -1, columnCount: 20 }), /positive safe integer/);
  assert.throws(() => createBenchmarkRow(-1, 20), /non-negative safe integer/);
  assert.throws(() => createBenchmarkRow(0, 20, -1), /unsigned 32-bit integer/);
  assert.throws(() => fingerprintBenchmarkDataset(null), /createBenchmarkDataset/);
});
