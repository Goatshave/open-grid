import assert from "node:assert/strict";
import test from "node:test";

import {
  compareHeapSummaries,
  findHeapRetainingPaths,
  formatHeapProfileMarkdown,
  normalizeHeapNodeName,
  summarizeHeapSnapshot,
} from "../heap-profile.mjs";

test("summarizes V8 heap nodes and normalizes unstable scope and origin names", () => {
  const summary = summarizeHeapSnapshot(createSnapshot([
    ["object", "system / Context / scope @123", 28],
    ["object", "system / Context / scope @456", 36],
    ["native", "Window / http://127.0.0.1:4305", 100],
    ["array", "(object elements)", 76],
  ]));

  assert.equal(summary.nodeCount, 4);
  assert.equal(summary.selfSizeBytes, 240);
  assert.deepEqual(summary.types, [
    { type: "native", count: 1, selfSizeBytes: 100 },
    { type: "object", count: 2, selfSizeBytes: 64 },
    { type: "array", count: 1, selfSizeBytes: 76 },
  ].sort((left, right) => right.selfSizeBytes - left.selfSizeBytes));
  assert.deepEqual(summary.groups.find((entry) => entry.name === "system / Context / scope"), {
    type: "object",
    name: "system / Context / scope",
    count: 2,
    selfSizeBytes: 64,
  });
  assert.equal(normalizeHeapNodeName("Window / https://example.test:4305/path"), "Window / <origin>/path");
  assert.equal(normalizeHeapNodeName(""), "(anonymous)");
});

test("compares heap summaries with signed type and normalized-group deltas", () => {
  const baseline = summarizeHeapSnapshot(createSnapshot([
    ["object", "Object", 40],
    ["array", "(object elements)", 20],
  ]));
  const candidate = summarizeHeapSnapshot(createSnapshot([
    ["object", "Object", 60],
    ["object", "Object", 40],
    ["closure", "update", 28],
  ]));
  const comparison = compareHeapSummaries(baseline, candidate);

  assert.equal(comparison.nodeCountDelta, 1);
  assert.equal(comparison.selfSizeBytesDelta, 68);
  assert.deepEqual(comparison.typeDeltas.map(({ type, countDelta, selfSizeBytesDelta }) => ({ type, countDelta, selfSizeBytesDelta })), [
    { type: "object", countDelta: 1, selfSizeBytesDelta: 60 },
    { type: "closure", countDelta: 1, selfSizeBytesDelta: 28 },
    { type: "array", countDelta: -1, selfSizeBytesDelta: -20 },
  ]);
  assert.deepEqual(comparison.groupDeltas[0], {
    type: "object",
    name: "Object",
    baselineCount: 1,
    candidateCount: 2,
    countDelta: 1,
    baselineSelfSizeBytes: 40,
    candidateSelfSizeBytes: 100,
    selfSizeBytesDelta: 60,
  });
});

test("rejects malformed snapshots and summaries", () => {
  assert.throws(() => summarizeHeapSnapshot({}), /node metadata/);
  const malformed = createSnapshot([["object", "Object", 10]]);
  malformed.nodes.pop();
  assert.throws(() => summarizeHeapSnapshot(malformed), /align/);
  assert.throws(() => compareHeapSummaries({}, {}), /baseline heap summary/);
  assert.throws(() => findHeapRetainingPaths({}, [{ type: "object", name: "Object" }]), /node, edge/);
});

test("finds bounded shortest strong retaining paths with source locations", () => {
  const paths = findHeapRetainingPaths(createGraphSnapshot(), [{ type: "array", name: "(object elements)" }], {
    maxPathsPerGroup: 2,
    maxPathDepth: 3,
    scriptUrls: { "42": "http://127.0.0.1:4305/assets/index-ABC12345.js" },
  });

  assert.equal(paths.length, 1);
  assert.equal(paths[0].nodeCount, 2);
  assert.equal(paths[0].reachableNodeCount, 1);
  assert.equal(paths[0].selfSizeBytes, 192);
  assert.equal(paths[0].paths.length, 1);
  assert.equal(paths[0].paths[0].targetSelfSizeBytes, 64);
  assert.equal(paths[0].paths[0].distance, 3);
  assert.equal(paths[0].paths[0].omittedNodeCount, 1);
  assert.deepEqual(paths[0].paths[0].nodes.map(({ type, name }) => ({ type, name })), [
    { type: "synthetic", name: "(GC roots)" },
    { type: "object", name: "Object" },
    { type: "array", name: "(object elements)" },
  ]);
  assert.deepEqual(paths[0].paths[0].nodes[1].source, {
    scriptId: 42,
    line: 5,
    column: 8,
    url: "<origin>/assets/index-ABC12345.js",
  });
  assert.equal(paths[0].paths[0].nodes[2].edgeType, "internal");
  assert.equal(paths[0].paths[0].nodes[2].edgeName, "items");
  assert.throws(() => findHeapRetainingPaths(createGraphSnapshot(), [{ type: "array", name: "(object elements)" }], { maxPathDepth: 1 }), /at least 2/);
});

test("formats persisted heap diagnostics without claiming product leadership", () => {
  const summary = summarizeHeapSnapshot(createSnapshot([["object", "Object", 1024]]));
  const markdown = formatHeapProfileMarkdown({
    createdAt: "2026-07-22T00:00:00.000Z",
    datasetFingerprint: "fixture-123",
    config: { profileId: "standard-client", phase: "settled-workload" },
    environment: { browser: "Chromium", platform: "test", gitRevision: "abc", gitDirty: true },
    implementations: [{ id: "open-grid-vue", heap: summary, jsHeapUsedBytes: 2048, domElementCount: 10, domNodeCount: 20 }],
    comparisons: [{
      baselineId: "open-grid-vue",
      candidateId: "open-grid-svelte",
      selfSizeBytesDelta: 512,
      nodeCountDelta: 2,
      typeDeltas: [{ type: "object", selfSizeBytesDelta: 512, countDelta: 2 }],
      positiveGroupDeltas: [{ type: "object", name: "Object", selfSizeBytesDelta: 512, countDelta: 2 }],
      retainerGroups: [{
        type: "object",
        name: "Object",
        nodeCount: 1,
        reachableNodeCount: 1,
        selfSizeBytes: 1024,
        paths: [{
          targetNodeId: 3,
          targetSelfSizeBytes: 1024,
          distance: 1,
          omittedNodeCount: 0,
          nodes: [
            { id: 1, type: "synthetic", name: "(GC roots)", selfSizeBytes: 0 },
            { id: 3, type: "object", name: "Object", selfSizeBytes: 1024, edgeType: "property", edgeName: "value", source: { scriptId: 42, line: 5, column: 8, url: "<origin>/assets/index.js" } },
          ],
        }],
      }],
    }],
  });
  assert.match(markdown, /allocation diagnostic; not a product performance claim/);
  assert.match(markdown, /open-grid-svelte versus open-grid-vue/);
  assert.match(markdown, /\+0\.5 KiB/);
  assert.match(markdown, /Bounded strong retaining paths/);
  assert.match(markdown, /property: value/);
  assert.match(markdown, /full heap snapshot chunks are discarded/);
});

function createSnapshot(entries) {
  const typeNames = [...new Set(entries.map(([type]) => type))];
  const strings = [...new Set(entries.map(([, name]) => name))];
  return {
    snapshot: {
      meta: {
        node_fields: ["type", "name", "id", "self_size", "edge_count", "trace_node_id", "detachedness"],
        node_types: [typeNames, "string", "number", "number", "number", "number", "number"],
      },
    },
    nodes: entries.flatMap(([type, name, selfSize], index) => [typeNames.indexOf(type), strings.indexOf(name), index + 1, selfSize, 0, 0, 0]),
    strings,
  };
}

function createGraphSnapshot() {
  const nodeFields = ["type", "name", "id", "self_size", "edge_count", "trace_node_id", "detachedness"];
  const edgeFields = ["type", "name_or_index", "to_node"];
  const nodeTypes = ["synthetic", "native", "object", "array"];
  const edgeTypes = ["property", "internal", "weak"];
  const strings = ["(GC roots)", "Window / http://127.0.0.1:4305", "Object", "(object elements)", "window", "listeners", "ignored", "items"];
  const nodeEntries = [
    ["synthetic", "(GC roots)", 0, 1],
    ["native", "Window / http://127.0.0.1:4305", 16, 2],
    ["object", "Object", 24, 1],
    ["array", "(object elements)", 64, 0],
    ["array", "(object elements)", 128, 0],
  ];
  const edgeEntries = [
    ["property", "window", 1],
    ["property", "listeners", 2],
    ["weak", "ignored", 4],
    ["internal", "items", 3],
  ];

  return {
    snapshot: {
      meta: {
        node_fields: nodeFields,
        node_types: [nodeTypes, "string", "number", "number", "number", "number", "number"],
        edge_fields: edgeFields,
        edge_types: [edgeTypes, "string_or_number", "node"],
        location_fields: ["object_index", "script_id", "line", "column"],
        location_types: ["node", "number", "number", "number"],
      },
    },
    nodes: nodeEntries.flatMap(([type, name, selfSize, edgeCount], index) => [nodeTypes.indexOf(type), strings.indexOf(name), index * 2 + 1, selfSize, edgeCount, 0, 0]),
    edges: edgeEntries.flatMap(([type, name, targetNodeIndex]) => [edgeTypes.indexOf(type), strings.indexOf(name), targetNodeIndex * nodeFields.length]),
    locations: [2 * nodeFields.length, 42, 4, 7],
    strings,
  };
}
