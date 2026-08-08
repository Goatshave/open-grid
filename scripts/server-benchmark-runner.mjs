import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import {
  formatServerBenchmarkMarkdown,
  SERVER_BENCHMARK_RESULT_SCHEMA_VERSION,
  summarizeServerBenchmarkRuns,
} from "../benchmarks/shared/server-results.mjs";
import { getBenchmarkProfile } from "../benchmarks/shared/index.mjs";
import { startBenchmarkPreview, stopBenchmarkPreview } from "./benchmark-preview-process.mjs";

const target = { packageName: "@open-grid/benchmark-open-grid-react-server", url: "http://127.0.0.1:4307" };
let options;
try {
  options = parseArgs(process.argv.slice(2));
  getBenchmarkProfile(options.profileId);
} catch (error) {
  console.error(`Server benchmark failed: ${error.message}`);
  process.exit(1);
}

const preview = startBenchmarkPreview(target.packageName);
let browser;
try {
  await waitForUrl(target.url);
  browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
  const environment = {
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
    browser: await browser.version(),
    gitRevision: gitOutput(["rev-parse", "HEAD"]) || "unknown",
    gitDirty: gitOutput(["status", "--porcelain"]).length > 0,
  };
  const totalRuns = options.warmups + options.runs;
  const allRuns = [];
  for (let index = 0; index < totalRuns; index += 1) {
    const warmup = index < options.warmups;
    console.log(`Server benchmark ${warmup ? "warm-up" : "run"} ${warmup ? index + 1 : index - options.warmups + 1}/${warmup ? options.warmups : options.runs}`);
    allRuns.push(await measureRun(browser, options.profileId, index, warmup));
  }
  const runs = allRuns.filter((run) => !run.warmup);
  const delayMs = runs[0].configuredDelayMs;
  const validation = runs[0].finalSnapshot.transport;
  for (const run of runs) validateRun(run, delayMs, validation);
  const result = {
    schemaVersion: SERVER_BENCHMARK_RESULT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    status: "observational",
    config: { profileId: options.profileId, runs: options.runs, warmups: options.warmups, delayMs },
    environment,
    fixtureFingerprint: runs[0].fixtureFingerprint,
    summary: summarizeServerBenchmarkRuns(runs, delayMs),
    validation: { ...validation, staleResponses: runs[0].finalSnapshot.staleResponses },
    runs: allRuns,
  };
  writeArtifact(options.jsonOut, `${JSON.stringify(result, null, 2)}\n`);
  writeArtifact(options.markdownOut, formatServerBenchmarkMarkdown(result));
  console.log(`Raw results: ${options.jsonOut}`);
  console.log(`Summary: ${options.markdownOut}`);
} catch (error) {
  console.error(`Server benchmark failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stopBenchmarkPreview(preview);
}

async function measureRun(activeBrowser, profileId, index, warmup) {
  const context = await activeBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Performance.enable");
  try {
    await page.goto(`${target.url}/?profile=${profileId}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => window.__OPEN_GRID_SERVER_BENCHMARK__?.ready === true, undefined, { timeout: 120_000 });
    const identity = await page.evaluate(() => ({
      configuredDelayMs: window.__OPEN_GRID_SERVER_BENCHMARK__.configuredDelayMs,
      fixtureFingerprint: window.__OPEN_GRID_SERVER_BENCHMARK__.fixtureFingerprint,
    }));
    const initialReadyMs = await page.evaluate(() => performance.now());
    const actionResults = {};
    for (const action of ["page", "sort", "filter", "cancel", "group", "tree", "patch"]) {
      actionResults[action] = await page.evaluate((selectedAction) => window.__OPEN_GRID_SERVER_BENCHMARK__.measureAction(selectedAction), action);
    }
    await cdp.send("HeapProfiler.collectGarbage");
    const performanceMetrics = await cdp.send("Performance.getMetrics");
    const metricMap = new Map(performanceMetrics.metrics.map((metric) => [metric.name, metric.value]));
    const resources = await page.evaluate(() => [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")].map((entry) => ({
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize,
    })));
    const finalSnapshot = actionResults.patch.snapshot;
    return {
      index,
      warmup,
      configuredDelayMs: identity.configuredDelayMs,
      fixtureFingerprint: identity.fixtureFingerprint,
      metrics: {
        initialReadyMs,
        pageMs: actionResults.page.durationMs,
        sortMs: actionResults.sort.durationMs,
        filterMs: actionResults.filter.durationMs,
        cancelMs: actionResults.cancel.durationMs,
        groupMs: actionResults.group.durationMs,
        treeMs: actionResults.tree.durationMs,
        patchMs: actionResults.patch.durationMs,
      },
      resources: {
        jsHeapUsedBytes: metricMap.get("JSHeapUsedSize") ?? 0,
        domNodeCount: await page.locator("*").count(),
        transferredBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        decodedBodyBytes: resources.reduce((sum, resource) => sum + resource.decodedBodySize, 0),
      },
      actionSnapshots: Object.fromEntries(Object.entries(actionResults).map(([action, result]) => [action, result.snapshot])),
      finalSnapshot,
    };
  } finally {
    await context.close();
  }
}

function validateRun(run, delayMs, validation) {
  if (run.configuredDelayMs !== delayMs) throw new Error("server delay changed across runs");
  if (run.finalSnapshot.transport.completed !== validation.completed || run.finalSnapshot.transport.aborted !== 1) {
    throw new Error(`server request totals changed across runs: ${JSON.stringify(run.finalSnapshot.transport)}`);
  }
  if (run.finalSnapshot.transport.inFlight !== 0 || run.finalSnapshot.staleResponses !== 0 || run.finalSnapshot.revision !== 1) {
    throw new Error(`server run did not settle cleanly: ${JSON.stringify(run.finalSnapshot)}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    profileId: "standard-client",
    runs: 5,
    warmups: 1,
    jsonOut: resolve(".benchmark-results/server/latest.json"),
    markdownOut: resolve(".benchmark-results/server/latest.md"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    const value = argv[index + 1];
    if (["--profile", "--runs", "--warmups", "--json-out", "--markdown-out"].includes(argument) && value === undefined) throw new TypeError(`${argument} requires a value`);
    if (argument === "--profile") parsed.profileId = value;
    else if (argument === "--runs") parsed.runs = positiveInteger(value, argument);
    else if (argument === "--warmups") parsed.warmups = nonNegativeInteger(value, argument);
    else if (argument === "--json-out") parsed.jsonOut = resolve(value);
    else if (argument === "--markdown-out") parsed.markdownOut = resolve(value);
    else throw new TypeError(`unknown argument: ${argument}`);
    index += 1;
  }
  return parsed;
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
  writeFileSync(path, contents);
}

function gitOutput(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}
