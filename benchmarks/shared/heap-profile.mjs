export const BENCHMARK_HEAP_PROFILE_SCHEMA_VERSION = 2;

export function summarizeHeapSnapshot(snapshot) {
  const meta = snapshot?.snapshot?.meta;
  const nodeFields = meta?.node_fields;
  const nodeTypes = meta?.node_types;
  const nodes = snapshot?.nodes;
  const strings = snapshot?.strings;

  if (!Array.isArray(nodeFields) || !Array.isArray(nodeTypes) || !Array.isArray(nodes) || !Array.isArray(strings)) {
    throw new TypeError("heap snapshot must include V8 node metadata, nodes, and strings");
  }

  const typeIndex = nodeFields.indexOf("type");
  const nameIndex = nodeFields.indexOf("name");
  const selfSizeIndex = nodeFields.indexOf("self_size");
  const typeNames = nodeTypes[typeIndex];

  if (typeIndex < 0 || nameIndex < 0 || selfSizeIndex < 0 || !Array.isArray(typeNames) || nodeFields.length === 0) {
    throw new TypeError("heap snapshot node metadata is missing type, name, or self_size");
  }
  if (nodes.length % nodeFields.length !== 0) {
    throw new TypeError("heap snapshot node data must align with node_fields");
  }

  const types = new Map();
  const groups = new Map();

  for (let offset = 0; offset < nodes.length; offset += nodeFields.length) {
    const type = typeNames[nodes[offset + typeIndex]];
    const rawName = strings[nodes[offset + nameIndex]];
    const selfSizeBytes = nodes[offset + selfSizeIndex];

    if (typeof type !== "string" || typeof rawName !== "string" || !Number.isFinite(selfSizeBytes) || selfSizeBytes < 0) {
      throw new TypeError("heap snapshot contains an invalid node");
    }

    increment(types, type, selfSizeBytes);
    increment(groups, `${type}\t${normalizeHeapNodeName(rawName)}`, selfSizeBytes);
  }

  return {
    nodeCount: nodes.length / nodeFields.length,
    selfSizeBytes: sumEntries(types),
    types: [...types].map(([type, value]) => ({ type, ...value })).sort(compareSizeThenKey("type")),
    groups: [...groups].map(([key, value]) => {
      const separatorIndex = key.indexOf("\t");
      return { type: key.slice(0, separatorIndex), name: key.slice(separatorIndex + 1), ...value };
    }).sort(compareSizeThenKey("name")),
  };
}

export function compareHeapSummaries(baseline, candidate) {
  validateSummary(baseline, "baseline");
  validateSummary(candidate, "candidate");

  return {
    nodeCountDelta: candidate.nodeCount - baseline.nodeCount,
    selfSizeBytesDelta: candidate.selfSizeBytes - baseline.selfSizeBytes,
    typeDeltas: compareEntries(baseline.types, candidate.types, (entry) => entry.type),
    groupDeltas: compareEntries(baseline.groups, candidate.groups, (entry) => `${entry.type}\t${entry.name}`),
  };
}

export function findHeapRetainingPaths(snapshot, targets, options = {}) {
  const meta = snapshot?.snapshot?.meta;
  const nodeFields = meta?.node_fields;
  const nodeTypes = meta?.node_types;
  const edgeFields = meta?.edge_fields;
  const edgeTypes = meta?.edge_types;
  const locationFields = meta?.location_fields;
  const nodes = snapshot?.nodes;
  const edges = snapshot?.edges;
  const locations = snapshot?.locations ?? [];
  const strings = snapshot?.strings;

  if (!Array.isArray(nodeFields) || !Array.isArray(nodeTypes) || !Array.isArray(edgeFields) || !Array.isArray(edgeTypes) || !Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(locations) || !Array.isArray(strings)) {
    throw new TypeError("heap snapshot must include V8 node, edge, location, and string data");
  }
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new TypeError("retaining path targets must be a non-empty array");
  }

  const nodeTypeIndex = nodeFields.indexOf("type");
  const nodeNameIndex = nodeFields.indexOf("name");
  const nodeIdIndex = nodeFields.indexOf("id");
  const nodeSelfSizeIndex = nodeFields.indexOf("self_size");
  const nodeEdgeCountIndex = nodeFields.indexOf("edge_count");
  const edgeTypeIndex = edgeFields.indexOf("type");
  const edgeNameIndex = edgeFields.indexOf("name_or_index");
  const edgeTargetIndex = edgeFields.indexOf("to_node");
  const nodeTypeNames = nodeTypes[nodeTypeIndex];
  const edgeTypeNames = edgeTypes[edgeTypeIndex];

  if ([nodeTypeIndex, nodeNameIndex, nodeIdIndex, nodeSelfSizeIndex, nodeEdgeCountIndex, edgeTypeIndex, edgeNameIndex, edgeTargetIndex].some((index) => index < 0) || !Array.isArray(nodeTypeNames) || !Array.isArray(edgeTypeNames) || nodeFields.length === 0 || edgeFields.length === 0) {
    throw new TypeError("heap snapshot metadata is missing retaining graph fields");
  }
  if (nodes.length === 0 || nodes.length % nodeFields.length !== 0) {
    throw new TypeError("heap snapshot node data must contain an aligned root node");
  }

  const maxPathsPerGroup = positiveOption(options.maxPathsPerGroup, 2, "maxPathsPerGroup");
  const maxPathDepth = positiveOption(options.maxPathDepth, 12, "maxPathDepth");
  if (maxPathDepth < 2) throw new RangeError("maxPathDepth must be at least 2");
  const scriptUrls = options.scriptUrls ?? {};
  if (scriptUrls === null || typeof scriptUrls !== "object" || Array.isArray(scriptUrls)) {
    throw new TypeError("scriptUrls must be an object keyed by script id");
  }

  const targetMap = new Map();
  for (const target of targets) {
    if (typeof target?.type !== "string" || target.type.length === 0 || typeof target?.name !== "string") {
      throw new TypeError("each retaining path target must include a type and name");
    }
    const normalizedTarget = { type: target.type, name: normalizeHeapNodeName(target.name) };
    targetMap.set(groupKey(normalizedTarget.type, normalizedTarget.name), normalizedTarget);
  }

  const nodeCount = nodes.length / nodeFields.length;
  const edgeStarts = new Uint32Array(nodeCount + 1);
  let expectedEdgeLength = 0;
  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
    edgeStarts[nodeIndex] = expectedEdgeLength;
    const edgeCount = nodes[nodeIndex * nodeFields.length + nodeEdgeCountIndex];
    if (!Number.isInteger(edgeCount) || edgeCount < 0) throw new TypeError("heap snapshot contains an invalid edge count");
    expectedEdgeLength += edgeCount * edgeFields.length;
  }
  edgeStarts[nodeCount] = expectedEdgeLength;
  if (expectedEdgeLength !== edges.length) throw new TypeError("heap snapshot edge data must align with node edge counts");

  const parentNodes = new Int32Array(nodeCount);
  const parentEdges = new Int32Array(nodeCount);
  parentNodes.fill(-1);
  parentEdges.fill(-1);
  parentNodes[0] = 0;
  const queue = new Uint32Array(nodeCount);
  let queueStart = 0;
  let queueEnd = 1;
  queue[0] = 0;

  while (queueStart < queueEnd) {
    const parentNodeIndex = queue[queueStart];
    queueStart += 1;
    for (let edgeOffset = edgeStarts[parentNodeIndex]; edgeOffset < edgeStarts[parentNodeIndex + 1]; edgeOffset += edgeFields.length) {
      const edgeType = edgeTypeNames[edges[edgeOffset + edgeTypeIndex]];
      const targetOffset = edges[edgeOffset + edgeTargetIndex];
      if (typeof edgeType !== "string" || !Number.isInteger(targetOffset) || targetOffset < 0 || targetOffset % nodeFields.length !== 0 || targetOffset >= nodes.length) {
        throw new TypeError("heap snapshot contains an invalid edge");
      }
      if (edgeType === "weak") continue;
      const targetNodeIndex = targetOffset / nodeFields.length;
      if (parentNodes[targetNodeIndex] !== -1) continue;
      parentNodes[targetNodeIndex] = parentNodeIndex;
      parentEdges[targetNodeIndex] = edgeOffset;
      queue[queueEnd] = targetNodeIndex;
      queueEnd += 1;
    }
  }

  const nodeLocations = createNodeLocationMap(meta, locations, nodeFields.length, nodeCount, scriptUrls);
  const applicationSourcePaths = new Uint8Array(nodeCount);
  for (let queueIndex = 0; queueIndex < queueEnd; queueIndex += 1) {
    const nodeIndex = queue[queueIndex];
    applicationSourcePaths[nodeIndex] = nodeLocations.get(nodeIndex)?.url !== undefined
      ? 1
      : nodeIndex === 0
        ? 0
        : applicationSourcePaths[parentNodes[nodeIndex]];
  }
  const candidates = new Map([...targetMap.keys()].map((key) => [key, []]));
  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
    const offset = nodeIndex * nodeFields.length;
    const type = nodeTypeNames[nodes[offset + nodeTypeIndex]];
    const rawName = strings[nodes[offset + nodeNameIndex]];
    const selfSizeBytes = nodes[offset + nodeSelfSizeIndex];
    const id = nodes[offset + nodeIdIndex];
    if (typeof type !== "string" || typeof rawName !== "string" || !Number.isFinite(selfSizeBytes) || selfSizeBytes < 0 || !Number.isFinite(id)) {
      throw new TypeError("heap snapshot contains an invalid retaining path node");
    }
    const key = groupKey(type, normalizeHeapNodeName(rawName));
    if (candidates.has(key)) candidates.get(key).push({
      nodeIndex,
      id,
      selfSizeBytes,
      hasApplicationSource: applicationSourcePaths[nodeIndex] === 1,
    });
  }

  return [...targetMap].map(([key, target]) => {
    const groupCandidates = candidates.get(key);
    const reachableCandidates = groupCandidates
      .filter(({ nodeIndex }) => parentNodes[nodeIndex] !== -1)
      .sort((left, right) => Number(right.hasApplicationSource) - Number(left.hasApplicationSource) || right.selfSizeBytes - left.selfSizeBytes || left.id - right.id);
    return {
      ...target,
      nodeCount: groupCandidates.length,
      reachableNodeCount: reachableCandidates.length,
      selfSizeBytes: groupCandidates.reduce((total, candidate) => total + candidate.selfSizeBytes, 0),
      paths: reachableCandidates.slice(0, maxPathsPerGroup).map((candidate) => createRetainingPath(candidate, {
        edges,
        edgeFields,
        edgeNameIndex,
        edgeTypeIndex,
        edgeTypeNames,
        maxPathDepth,
        nodeFields,
        nodeIdIndex,
        nodeLocations,
        nodeNameIndex,
        nodeSelfSizeIndex,
        nodeTypeIndex,
        nodeTypeNames,
        nodes,
        parentEdges,
        parentNodes,
        strings,
      })),
    };
  });
}

export function formatHeapProfileMarkdown(result) {
  const lines = [
    "# Open Grid Framework Heap Profile",
    "",
    `- Created: ${result.createdAt}`,
    `- Profile: ${result.config.profileId}`,
    `- Phase: ${result.config.phase}`,
    `- Dataset fingerprint: ${result.datasetFingerprint}`,
    `- Browser: ${result.environment.browser}`,
    `- Platform: ${result.environment.platform}`,
    `- Revision: ${result.environment.gitRevision}${result.environment.gitDirty ? " (dirty)" : ""}`,
    "- Status: allocation diagnostic; not a product performance claim",
    "",
    "| Renderer | V8 node self size | Nodes | JS heap used | DOM elements | Document nodes |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const implementation of result.implementations) {
    lines.push(`| ${implementation.id} | ${formatBytes(implementation.heap.selfSizeBytes)} | ${implementation.heap.nodeCount} | ${formatBytes(implementation.jsHeapUsedBytes)} | ${implementation.domElementCount} | ${implementation.domNodeCount} |`);
  }

  for (const comparison of result.comparisons) {
    lines.push(
      "",
      `## ${comparison.candidateId} versus ${comparison.baselineId}`,
      "",
      `- Self-size delta: ${formatSignedBytes(comparison.selfSizeBytesDelta)}`,
      `- Node-count delta: ${formatSignedNumber(comparison.nodeCountDelta)}`,
      "",
      "| Node type | Candidate delta | Count delta |",
      "| --- | ---: | ---: |",
    );
    for (const delta of comparison.typeDeltas) {
      lines.push(`| ${delta.type} | ${formatSignedBytes(delta.selfSizeBytesDelta)} | ${formatSignedNumber(delta.countDelta)} |`);
    }

    lines.push("", "| Largest positive retained group | Type | Candidate delta | Count delta |", "| --- | --- | ---: | ---: |");
    for (const delta of comparison.positiveGroupDeltas) {
      lines.push(`| ${escapeMarkdown(delta.name)} | ${delta.type} | ${formatSignedBytes(delta.selfSizeBytesDelta)} | ${formatSignedNumber(delta.countDelta)} |`);
    }

    if (comparison.retainerGroups?.length > 0) {
      lines.push("", "### Bounded strong retaining paths", "");
      for (const group of comparison.retainerGroups) {
        lines.push(
          `#### ${escapeMarkdown(group.name)} (${group.type})`,
          "",
          `- Candidate group: ${formatBytes(group.selfSizeBytes)} across ${group.nodeCount} nodes; ${group.reachableNodeCount} reachable through strong edges`,
        );
        for (let pathIndex = 0; pathIndex < group.paths.length; pathIndex += 1) {
          const path = group.paths[pathIndex];
          lines.push(
            `- Path ${pathIndex + 1}: target ${formatBytes(path.targetSelfSizeBytes)}, shortest distance ${path.distance}`,
            "",
            "| Incoming edge | Node | Self size | Source |",
            "| --- | --- | ---: | --- |",
          );
          for (let nodeIndex = 0; nodeIndex < path.nodes.length; nodeIndex += 1) {
            if (nodeIndex === 1 && path.omittedNodeCount > 0) {
              lines.push(`| ... | ${path.omittedNodeCount} intermediate nodes omitted | | |`);
            }
            const node = path.nodes[nodeIndex];
            const edge = node.edgeType === undefined ? "(root)" : `${node.edgeType}: ${node.edgeName}`;
            const source = node.source === undefined
              ? ""
              : node.source.originalSource === undefined
                ? `${node.source.url || `script ${node.source.scriptId}`}:${node.source.line}:${node.source.column}`
                : `${node.source.originalSource}:${node.source.originalLine}:${node.source.originalColumn}${node.source.originalName ? ` (${node.source.originalName})` : ""}`;
            lines.push(`| ${escapeMarkdown(edge)} | ${escapeMarkdown(`${node.type}: ${node.name}`)} | ${formatBytes(node.selfSizeBytes)} | ${escapeMarkdown(source)} |`);
          }
          lines.push("");
        }
      }
    }
  }

  lines.push(
    "",
    "Retaining paths are representative candidate nodes from positive aggregate groups. Separate renderer snapshots have no shared object identity, so a path narrows source investigation but does not prove that its target caused the aggregate delta.",
    "",
    "Only normalized aggregates and bounded strong retaining paths are persisted; full heap snapshot chunks are discarded after analysis.",
    "",
  );
  return lines.join("\n");
}

export function normalizeHeapNodeName(name) {
  if (name.length === 0) return "(anonymous)";
  const normalized = name
    .replace(/scope @\d+/g, "scope")
    .replace(/https?:\/\/[^/\s]+/g, "<origin>");
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157)}...`;
}

function createRetainingPath(candidate, graph) {
  const fullPath = [];
  let currentNodeIndex = candidate.nodeIndex;
  while (true) {
    fullPath.push(currentNodeIndex);
    if (currentNodeIndex === 0) break;
    currentNodeIndex = graph.parentNodes[currentNodeIndex];
  }
  fullPath.reverse();

  const omittedNodeCount = Math.max(0, fullPath.length - graph.maxPathDepth);
  const pathNodeIndexes = omittedNodeCount === 0
    ? fullPath
    : [fullPath[0], ...fullPath.slice(-(graph.maxPathDepth - 1))];

  return {
    targetNodeId: candidate.id,
    targetSelfSizeBytes: candidate.selfSizeBytes,
    distance: fullPath.length - 1,
    omittedNodeCount,
    nodes: pathNodeIndexes.map((nodeIndex) => describeRetainingNode(nodeIndex, graph)),
  };
}

function describeRetainingNode(nodeIndex, graph) {
  const nodeOffset = nodeIndex * graph.nodeFields.length;
  const type = graph.nodeTypeNames[graph.nodes[nodeOffset + graph.nodeTypeIndex]];
  const name = normalizeHeapNodeName(graph.strings[graph.nodes[nodeOffset + graph.nodeNameIndex]]);
  const edgeOffset = graph.parentEdges[nodeIndex];
  const result = {
    id: graph.nodes[nodeOffset + graph.nodeIdIndex],
    type,
    name,
    selfSizeBytes: graph.nodes[nodeOffset + graph.nodeSelfSizeIndex],
  };
  if (edgeOffset >= 0) {
    const edgeType = graph.edgeTypeNames[graph.edges[edgeOffset + graph.edgeTypeIndex]];
    const rawEdgeName = graph.edges[edgeOffset + graph.edgeNameIndex];
    const edgeName = edgeType === "element" || edgeType === "hidden"
      ? String(rawEdgeName)
      : graph.strings[rawEdgeName];
    if (typeof edgeName !== "string") throw new TypeError("heap snapshot contains an invalid edge name");
    result.edgeType = edgeType;
    result.edgeName = normalizeHeapNodeName(edgeName);
  }
  const source = graph.nodeLocations.get(nodeIndex);
  if (source !== undefined) result.source = source;
  return result;
}

function createNodeLocationMap(meta, locations, nodeFieldCount, nodeCount, scriptUrls) {
  if (locations.length === 0) return new Map();
  const fields = meta.location_fields;
  if (!Array.isArray(fields) || fields.length === 0 || locations.length % fields.length !== 0) {
    throw new TypeError("heap snapshot location data must align with location_fields");
  }
  const objectIndex = fields.indexOf("object_index");
  const scriptIdIndex = fields.indexOf("script_id");
  const lineIndex = fields.indexOf("line");
  const columnIndex = fields.indexOf("column");
  if ([objectIndex, scriptIdIndex, lineIndex, columnIndex].some((index) => index < 0)) {
    throw new TypeError("heap snapshot metadata is missing source location fields");
  }

  const result = new Map();
  for (let offset = 0; offset < locations.length; offset += fields.length) {
    const nodeOffset = locations[offset + objectIndex];
    const scriptId = locations[offset + scriptIdIndex];
    const line = locations[offset + lineIndex];
    const column = locations[offset + columnIndex];
    if (!Number.isInteger(nodeOffset) || nodeOffset < 0 || nodeOffset % nodeFieldCount !== 0 || nodeOffset / nodeFieldCount >= nodeCount || !Number.isInteger(scriptId) || !Number.isInteger(line) || line < 0 || !Number.isInteger(column) || column < 0) {
      throw new TypeError("heap snapshot contains an invalid source location");
    }
    const url = scriptUrls[String(scriptId)];
    result.set(nodeOffset / nodeFieldCount, {
      scriptId,
      line: line + 1,
      column: column + 1,
      ...(typeof url === "string" && url.length > 0 ? { url: normalizeHeapNodeName(url) } : {}),
    });
  }
  return result;
}

function positiveOption(value, defaultValue, name) {
  const resolved = value ?? defaultValue;
  if (!Number.isInteger(resolved) || resolved <= 0) throw new RangeError(`${name} must be a positive integer`);
  return resolved;
}

function groupKey(type, name) {
  return `${type}\t${name}`;
}

function increment(map, key, selfSizeBytes) {
  const value = map.get(key) ?? { count: 0, selfSizeBytes: 0 };
  value.count += 1;
  value.selfSizeBytes += selfSizeBytes;
  map.set(key, value);
}

function sumEntries(entries) {
  let total = 0;
  for (const value of entries.values()) total += value.selfSizeBytes;
  return total;
}

function compareEntries(baselineEntries, candidateEntries, getKey) {
  const baseline = new Map(baselineEntries.map((entry) => [getKey(entry), entry]));
  const candidate = new Map(candidateEntries.map((entry) => [getKey(entry), entry]));
  const keys = new Set([...baseline.keys(), ...candidate.keys()]);

  return [...keys].map((key) => {
    const baselineEntry = baseline.get(key);
    const candidateEntry = candidate.get(key);
    const entry = candidateEntry ?? baselineEntry;
    return {
      ...(entry.name === undefined ? { type: entry.type } : { type: entry.type, name: entry.name }),
      baselineCount: baselineEntry?.count ?? 0,
      candidateCount: candidateEntry?.count ?? 0,
      countDelta: (candidateEntry?.count ?? 0) - (baselineEntry?.count ?? 0),
      baselineSelfSizeBytes: baselineEntry?.selfSizeBytes ?? 0,
      candidateSelfSizeBytes: candidateEntry?.selfSizeBytes ?? 0,
      selfSizeBytesDelta: (candidateEntry?.selfSizeBytes ?? 0) - (baselineEntry?.selfSizeBytes ?? 0),
    };
  }).filter((entry) => entry.countDelta !== 0 || entry.selfSizeBytesDelta !== 0)
    .sort((left, right) => right.selfSizeBytesDelta - left.selfSizeBytesDelta || right.countDelta - left.countDelta);
}

function validateSummary(summary, label) {
  if (!Number.isInteger(summary?.nodeCount) || summary.nodeCount < 0 || !Number.isFinite(summary?.selfSizeBytes) || summary.selfSizeBytes < 0 || !Array.isArray(summary?.types) || !Array.isArray(summary?.groups)) {
    throw new TypeError(`${label} heap summary is malformed`);
  }
}

function compareSizeThenKey(key) {
  return (left, right) => right.selfSizeBytes - left.selfSizeBytes || right.count - left.count || left[key].localeCompare(right[key]);
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

function formatSignedBytes(value) {
  return `${value >= 0 ? "+" : ""}${(value / 1024).toFixed(1)} KiB`;
}

function formatSignedNumber(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function escapeMarkdown(value) {
  return value.replaceAll("|", "\\|");
}
