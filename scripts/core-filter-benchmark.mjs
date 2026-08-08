import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { createBenchmarkDataset, getBenchmarkProfile } from "../benchmarks/shared/index.mjs";
import {
  CORE_COMPUTE_RESULT_SCHEMA_VERSION,
  summarizeCoreComputeDurations,
} from "../benchmarks/shared/core-compute.mjs";
import { createGrid } from "../packages/core/dist/index.js";
import { parseCoreBenchmarkOptions } from "./core-filter-benchmark-options.mjs";

const QUERIES = ["Blocked", "Complete"];
const SORT_COLUMN_ID = "column_5";
const SORT_DIRECTIONS = ["asc", "desc"];

let options;
try {
  options = parseCoreBenchmarkOptions(process.argv.slice(2));
} catch (error) {
  console.error(`Core compute benchmark failed: ${error.message}`);
  process.exit(1);
}

const profiles = options.profileIds.map((profileId) => measureProfile(profileId, options));
const result = {
  schemaVersion: CORE_COMPUTE_RESULT_SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  status: "observational",
  config: {
    runs: options.runs,
    warmups: options.warmups,
    queries: QUERIES,
    sortColumnId: SORT_COLUMN_ID,
    sortDirections: SORT_DIRECTIONS,
    profileIds: options.profileIds,
    workloads: options.workloadIds,
  },
  environment: {
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    logicalCpuCount: os.cpus().length,
    node: process.version,
    coreVersion: JSON.parse(readFileSync(resolve("packages/core/package.json"), "utf8")).version,
    gitRevision: gitOutput(["rev-parse", "HEAD"]) || "unknown",
    gitDirty: gitOutput(["status", "--porcelain"]).length > 0,
  },
  profiles,
};

writeArtifact(options.jsonOut, `${JSON.stringify(result, null, 2)}\n`);
writeArtifact(options.markdownOut, formatMarkdown(result));
console.log(`Raw results: ${options.jsonOut}`);
console.log(`Summary: ${options.markdownOut}`);

function measureProfile(profileId, runOptions) {
  const profile = getBenchmarkProfile(profileId);
  const dataset = createBenchmarkDataset(profile);
  const columns = dataset.columns.map((column) => ({ accessorKey: column.id }));

  return {
    profileId,
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    workloads: runOptions.workloadIds.map((workloadId) => measureWorkload(workloadId, dataset, columns, runOptions)),
  };
}

function measureWorkload(workloadId, dataset, columns, runOptions) {
  const createBenchmarkGrid = () => createGrid({
    data: dataset.rows,
    columns,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: dataset.rowCount } },
  });
  const grid = workloadId === "initial-row-model" ? undefined : createBenchmarkGrid();
  grid?.getCoreRowModel();

  const totalRuns = runOptions.warmups + runOptions.runs;
  const runs = [];
  for (let index = 0; index < totalRuns; index += 1) {
    const query = QUERIES[index % QUERIES.length];
    const sortDirection = SORT_DIRECTIONS[index % SORT_DIRECTIONS.length];
    if (workloadId === "numeric-sort") {
      grid.setSorting([]);
      grid.getSortedRowModel();
    } else if (workloadId === "numeric-sort-flip") {
      const oppositeDesc = sortDirection === "asc";
      const currentSorting = grid.getState().sorting;
      if (currentSorting.length !== 1 || currentSorting[0]?.id !== SORT_COLUMN_ID || currentSorting[0].desc !== oppositeDesc) {
        grid.setSorting([{ id: SORT_COLUMN_ID, desc: oppositeDesc }]);
        grid.getSortedRowModel();
      }
    }
    const start = performance.now();
    let resultRowCount;
    let sortBoundaryValues;
    if (workloadId === "initial-row-model") {
      resultRowCount = createBenchmarkGrid().getRowModel().rows.length;
    } else if (workloadId === "numeric-sort" || workloadId === "numeric-sort-flip") {
      grid.setSorting([{ id: SORT_COLUMN_ID, desc: sortDirection === "desc" }]);
      const rows = grid.getSortedRowModel().rows;
      resultRowCount = rows.length;
      sortBoundaryValues = [rows[0]?.getValue(SORT_COLUMN_ID), rows.at(-1)?.getValue(SORT_COLUMN_ID)];
    } else if (workloadId === "column-filter") {
      grid.setColumnFilters([{ id: "column_2", value: query }]);
      resultRowCount = grid.getFilteredRowModel().rows.length;
    } else {
      grid.setGlobalFilter(query);
      resultRowCount = grid.getFilteredRowModel().rows.length;
    }
    const durationMs = performance.now() - start;
    if (workloadId === "initial-row-model") {
      if (resultRowCount !== dataset.rowCount) {
        throw new Error(`${profileIdForError(dataset)} ${workloadId} produced an invalid row count: ${resultRowCount}`);
      }
    } else if (workloadId === "numeric-sort" || workloadId === "numeric-sort-flip") {
      const [firstValue, lastValue] = sortBoundaryValues;
      const directionIsValid = sortDirection === "asc" ? firstValue <= lastValue : firstValue >= lastValue;
      if (resultRowCount !== dataset.rowCount || !directionIsValid) {
        throw new Error(`${profileIdForError(dataset)} ${workloadId} produced an invalid ${sortDirection} result`);
      }
    } else if (resultRowCount <= 0 || resultRowCount >= dataset.rowCount) {
      throw new Error(`${profileIdForError(dataset)} ${workloadId} query produced an invalid row count: ${resultRowCount}`);
    }
    runs.push({
      index,
      warmup: index < runOptions.warmups,
      query: workloadId === "global-filter" || workloadId === "column-filter" ? query : null,
      sortDirection: workloadId === "numeric-sort" || workloadId === "numeric-sort-flip" ? sortDirection : null,
      durationMs,
      resultRowCount,
    });
  }

  return {
    workloadId,
    summary: summarizeCoreComputeDurations(runs.filter((run) => !run.warmup).map((run) => run.durationMs)),
    runs,
  };
}

function profileIdForError(dataset) {
  return `${dataset.rowCount}-row/${dataset.columnCount}-column profile`;
}

function formatMarkdown(benchmarkResult) {
  const lines = [
    "# Open Grid Core Compute Benchmark",
    "",
    `- Created: ${benchmarkResult.createdAt}`,
    `- Recorded runs: ${benchmarkResult.config.runs}`,
    `- Warm-up runs: ${benchmarkResult.config.warmups}`,
    `- Queries: ${benchmarkResult.config.queries.join(", ")}`,
    `- Numeric sort: ${benchmarkResult.config.sortColumnId} (${benchmarkResult.config.sortDirections.join(", ")})`,
    `- Platform: ${benchmarkResult.environment.platform}`,
    `- Node: ${benchmarkResult.environment.node}`,
    `- Revision: ${benchmarkResult.environment.gitRevision}${benchmarkResult.environment.gitDirty ? " (dirty)" : ""}`,
    "- Status: observational compute-only diagnostic; not a browser paint or cross-product claim",
    "",
    `- Workloads: ${benchmarkResult.config.workloads.join(", ")}`,
    "",
    "| Profile | Workload | Rows / columns | Median | p95 |",
    "| --- | --- | ---: | ---: | ---: |",
  ];
  for (const profile of benchmarkResult.profiles) {
    for (const workload of profile.workloads) {
      lines.push(`| ${profile.profileId} | ${workload.workloadId} | ${profile.rowCount} / ${profile.columnCount} | ${workload.summary.median.toFixed(3)} ms | ${workload.summary.p95.toFixed(3)} ms |`);
    }
  }
  lines.push("", "Raw per-run values and environment metadata are available in the adjacent JSON artifact.", "");
  return lines.join("\n");
}

function writeArtifact(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

function gitOutput(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}
