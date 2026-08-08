import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import process from "node:process";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import { chromium } from "@playwright/test";
import { getBenchmarkProfile } from "../benchmarks/shared/index.mjs";
import { BENCHMARK_DEEP_SCROLL_TOP } from "../benchmarks/shared/browser.mjs";
import {
  BENCHMARK_HEAP_PROFILE_SCHEMA_VERSION,
  compareHeapSummaries,
  findHeapRetainingPaths,
  formatHeapProfileMarkdown,
  summarizeHeapSnapshot,
} from "../benchmarks/shared/heap-profile.mjs";
import { startBenchmarkPreview, stopBenchmarkPreview } from "./benchmark-preview-process.mjs";

const targets = [
  target("open-grid-react-full", "@open-grid/benchmark-open-grid-react-full", 4306, "benchmarks/open-grid-react-full/dist", manifestVersion("packages/react-ui/package.json")),
  target("open-grid-vue", "@open-grid/benchmark-open-grid-vue", 4304, "benchmarks/open-grid-vue/dist", manifestVersion("packages/vue-ui/package.json")),
  target("open-grid-svelte", "@open-grid/benchmark-open-grid-svelte", 4305, "benchmarks/open-grid-svelte/dist", manifestVersion("packages/svelte-ui/package.json")),
];

let options;
try {
  options = parseArgs(process.argv.slice(2));
  getBenchmarkProfile(options.profileId);
} catch (error) {
  console.error(`Framework heap profile failed: ${error.message}`);
  process.exit(1);
}

const children = [];
let browser;

try {
  for (const benchmarkTarget of targets) children.push(startBenchmarkPreview(benchmarkTarget.packageName));
  await Promise.all(targets.map((benchmarkTarget) => waitForUrl(benchmarkTarget.url)));
  browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });

  const implementations = [];
  const fullSummaries = new Map();
  const retainerGroups = new Map();
  for (const benchmarkTarget of targets) {
    console.log(`Profiling ${benchmarkTarget.id}: ${options.profileId} ${options.phase}`);
    const profiled = await profileTarget(
      browser,
      benchmarkTarget,
      options,
      benchmarkTarget.id === "open-grid-svelte" ? fullSummaries.get("open-grid-vue") : undefined,
    );
    const { retainerGroups: implementationRetainerGroups, ...implementation } = profiled;
    fullSummaries.set(implementation.id, implementation.heap);
    if (implementationRetainerGroups.length > 0) retainerGroups.set(implementation.id, implementationRetainerGroups);
    implementations.push({
      ...implementation,
      heap: { ...implementation.heap, groups: implementation.heap.groups.slice(0, options.topGroups) },
    });
  }
  const datasetFingerprint = assertComparableImplementations(implementations);

  const comparisons = [
    createComparison("open-grid-vue", "open-grid-svelte"),
    createComparison("open-grid-react-full", "open-grid-svelte"),
  ];
  const result = {
    schemaVersion: BENCHMARK_HEAP_PROFILE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    datasetFingerprint,
    config: {
      profileId: options.profileId,
      phase: options.phase,
      topGroups: options.topGroups,
      retainerGroups: options.retainerGroups,
      retainerPaths: options.retainerPaths,
      retainerDepth: options.retainerDepth,
    },
    environment: {
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? "unknown",
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      node: process.version,
      browser: await browser.version(),
      gitRevision: gitOutput(["rev-parse", "HEAD"]) || "unknown",
      gitDirty: gitOutput(["status", "--porcelain"]).length > 0,
    },
    implementations,
    comparisons,
  };

  writeArtifact(options.jsonOut, `${JSON.stringify(result, null, 2)}\n`);
  writeArtifact(options.markdownOut, formatHeapProfileMarkdown(result));
  console.log(`Heap profile: ${options.jsonOut}`);
  console.log(`Summary: ${options.markdownOut}`);

  function createComparison(baselineId, candidateId) {
    const comparison = compareHeapSummaries(fullSummaries.get(baselineId), fullSummaries.get(candidateId));
    return {
      baselineId,
      candidateId,
      nodeCountDelta: comparison.nodeCountDelta,
      selfSizeBytesDelta: comparison.selfSizeBytesDelta,
      typeDeltas: comparison.typeDeltas,
      positiveGroupDeltas: comparison.groupDeltas
        .filter((entry) => entry.selfSizeBytesDelta > 0)
        .slice(0, options.topGroups),
      retainerGroups: baselineId === "open-grid-vue" ? retainerGroups.get(candidateId) ?? [] : [],
    };
  }
} catch (error) {
  console.error(`Framework heap profile failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await Promise.all(children.map(stopBenchmarkPreview));
}

function assertComparableImplementations(implementations) {
  const fingerprints = new Set(implementations.map((implementation) => implementation.datasetFingerprint));
  if (fingerprints.size !== 1) {
    throw new Error(`framework heap profiles produced different datasets: ${[...fingerprints].join(", ")}`);
  }

  for (const field of ["rowCount", "columnCount", "displayedRowCount", "mountedRowCount", "mountedCellCount"]) {
    const values = new Set(implementations.map((implementation) => implementation.snapshot[field]));
    if (values.size !== 1) {
      throw new Error(`framework heap profiles produced different ${field} values: ${[...values].join(", ")}`);
    }
  }

  return [...fingerprints][0];
}

async function profileTarget(activeBrowser, benchmarkTarget, profileOptions, retainerBaseline) {
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const scriptUrls = {};
  cdp.on("Debugger.scriptParsed", ({ scriptId, url }) => {
    if (url.length > 0) scriptUrls[scriptId] = url;
  });
  await cdp.send("Debugger.enable");
  await cdp.send("Performance.enable");

  try {
    await page.goto(`${benchmarkTarget.url}/?profile=${profileOptions.profileId}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => window.__OPEN_GRID_BENCHMARK__?.ready === true, undefined, { timeout: 120_000 });

    if (profileOptions.phase === "settled-workload") {
      for (const action of ["sort", "clear", "filter", "clear", "scroll"]) {
        await page.evaluate(
          ({ selectedAction, deepScrollTop }) => {
            const driver = window.__OPEN_GRID_BENCHMARK__;
            if (selectedAction === "sort") return driver.measureAction({ type: "sort", columnId: "column_5", direction: "asc" });
            if (selectedAction === "filter") return driver.measureAction({ type: "filter", value: "Blocked" });
            if (selectedAction === "clear") return driver.measureAction({ type: "clear" });
            if (selectedAction === "scroll") return driver.measureAction({ type: "scroll", top: deepScrollTop, left: 1_200 });
            throw new TypeError(`unknown benchmark action: ${selectedAction}`);
          },
          { selectedAction: action, deepScrollTop: BENCHMARK_DEEP_SCROLL_TOP },
        );
      }
    }

    const driver = await page.evaluate(() => ({
      datasetFingerprint: window.__OPEN_GRID_BENCHMARK__.datasetFingerprint,
      snapshot: window.__OPEN_GRID_BENCHMARK__.getSnapshot(),
    }));
    await cdp.send("HeapProfiler.collectGarbage");
    const chunks = [];
    cdp.on("HeapProfiler.addHeapSnapshotChunk", ({ chunk }) => chunks.push(chunk));
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    const heapSnapshot = JSON.parse(chunks.join(""));
    const heap = summarizeHeapSnapshot(heapSnapshot);
    const retainerTargets = retainerBaseline === undefined
      ? []
      : compareHeapSummaries(retainerBaseline, heap).groupDeltas
        .filter((entry) => entry.selfSizeBytesDelta > 0)
        .slice(0, profileOptions.retainerGroups);
    const retainerPathGroups = retainerTargets.length === 0
      ? []
      : findHeapRetainingPaths(heapSnapshot, retainerTargets, {
        maxPathsPerGroup: profileOptions.retainerPaths,
        maxPathDepth: profileOptions.retainerDepth,
        scriptUrls,
      }).map((group) => mapRetainerGroupSources(group, benchmarkTarget.distDir));
    const retainerDeltaByGroup = new Map(retainerTargets.map((target) => [`${target.type}\t${target.name}`, target]));
    const performanceMetrics = await cdp.send("Performance.getMetrics");
    const metrics = new Map(performanceMetrics.metrics.map((metric) => [metric.name, metric.value]));

    return {
      id: benchmarkTarget.id,
      version: benchmarkTarget.version,
      url: benchmarkTarget.url,
      datasetFingerprint: driver.datasetFingerprint,
      snapshot: driver.snapshot,
      jsHeapUsedBytes: metrics.get("JSHeapUsedSize") ?? 0,
      domElementCount: await page.locator("*").count(),
      domNodeCount: await page.evaluate(() => {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
        let count = 0;
        while (walker.nextNode()) count += 1;
        return count;
      }),
      heap,
      retainerGroups: retainerPathGroups.map((group) => {
        const delta = retainerDeltaByGroup.get(`${group.type}\t${group.name}`);
        return { ...group, countDelta: delta.countDelta, selfSizeBytesDelta: delta.selfSizeBytesDelta };
      }),
    };
  } finally {
    await context.close();
  }
}

function parseArgs(argv) {
  const parsed = {
    profileId: "standard-client",
    phase: "settled-workload",
    topGroups: 20,
    retainerGroups: 5,
    retainerPaths: 2,
    retainerDepth: 12,
    jsonOut: resolve(".benchmark-results/framework/heap/latest.json"),
    markdownOut: resolve(".benchmark-results/framework/heap/latest.md"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    const value = argv[index + 1];
    if (["--profile", "--phase", "--top-groups", "--retainer-groups", "--retainer-paths", "--retainer-depth", "--json-out", "--markdown-out"].includes(argument) && value === undefined) {
      throw new TypeError(`${argument} requires a value`);
    }
    if (argument === "--profile") parsed.profileId = requireNonEmpty(value, argument);
    else if (argument === "--phase") {
      if (value !== "initial-ready" && value !== "settled-workload") throw new RangeError("--phase must be initial-ready or settled-workload");
      parsed.phase = value;
    } else if (argument === "--top-groups") parsed.topGroups = positiveInteger(value, argument);
    else if (argument === "--retainer-groups") parsed.retainerGroups = nonNegativeInteger(value, argument);
    else if (argument === "--retainer-paths") parsed.retainerPaths = positiveInteger(value, argument);
    else if (argument === "--retainer-depth") {
      parsed.retainerDepth = positiveInteger(value, argument);
      if (parsed.retainerDepth < 2) throw new RangeError("--retainer-depth must be at least 2");
    } else if (argument === "--json-out") parsed.jsonOut = resolve(requireNonEmpty(value, argument));
    else if (argument === "--markdown-out") parsed.markdownOut = resolve(requireNonEmpty(value, argument));
    else throw new TypeError(`unknown argument: ${argument}`);
    index += 1;
  }
  return parsed;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new RangeError(`${name} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return parsed;
}

function requireNonEmpty(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${name} requires a non-empty value`);
  return value;
}

function target(id, packageName, port, distDir, version) {
  return { id, packageName, url: `http://127.0.0.1:${port}`, distDir: resolve(distDir), version };
}

function mapRetainerGroupSources(group, distDir) {
  const sourceMaps = new Map();
  return {
    ...group,
    paths: group.paths.map((path) => ({
      ...path,
      nodes: path.nodes.map((node) => node.source === undefined
        ? node
        : { ...node, source: mapHeapSource(node.source, distDir, sourceMaps) }),
    })),
  };
}

function mapHeapSource(source, distDir, sourceMaps) {
  if (source.url === undefined || !source.url.startsWith("<origin>/")) return source;
  const generatedPath = source.url.slice("<origin>/".length);
  if (generatedPath.split("/").includes("..")) return source;
  const mapPath = resolve(distDir, `${generatedPath}.map`);
  if (!mapPath.startsWith(`${distDir}${sep}`) || !existsSync(mapPath)) return source;

  let traceMap = sourceMaps.get(mapPath);
  if (traceMap === undefined) {
    traceMap = new TraceMap(JSON.parse(readFileSync(mapPath, "utf8")), mapPath);
    sourceMaps.set(mapPath, traceMap);
  }
  const original = originalPositionFor(traceMap, { line: source.line, column: source.column - 1 });
  if (original.source === null || original.line === null || original.column === null) return source;

  const absoluteSource = resolve(dirname(mapPath), original.source);
  const workspaceSource = relative(process.cwd(), absoluteSource).split(sep).join("/");
  const preferredSource = preferWorkspaceSource(workspaceSource.startsWith("../") ? original.source : workspaceSource);
  return {
    ...source,
    originalSource: preferredSource,
    originalLine: original.line,
    originalColumn: original.column + 1,
    ...(original.name === null ? {} : { originalName: original.name }),
  };
}

function preferWorkspaceSource(source) {
  const sourceCandidate = source.replace(/^(packages\/[^/]+)\/dist\//, "$1/src/");
  return sourceCandidate !== source && existsSync(resolve(sourceCandidate)) ? sourceCandidate : source;
}

function manifestVersion(manifestPath) {
  return JSON.parse(readFileSync(resolve(manifestPath), "utf8")).version;
}

async function waitForUrl(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`preview did not become ready: ${url}`);
}

function writeArtifact(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

function gitOutput(args) {
  return spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
}
