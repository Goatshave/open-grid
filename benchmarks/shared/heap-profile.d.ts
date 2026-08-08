export const BENCHMARK_HEAP_PROFILE_SCHEMA_VERSION: 2;

export interface HeapSnapshotSummaryEntry {
  type: string;
  name?: string;
  count: number;
  selfSizeBytes: number;
}

export interface HeapSnapshotSummary {
  nodeCount: number;
  selfSizeBytes: number;
  types: HeapSnapshotSummaryEntry[];
  groups: HeapSnapshotSummaryEntry[];
}

export interface HeapSnapshotDeltaEntry {
  type: string;
  name?: string;
  baselineCount: number;
  candidateCount: number;
  countDelta: number;
  baselineSelfSizeBytes: number;
  candidateSelfSizeBytes: number;
  selfSizeBytesDelta: number;
}

export interface HeapSnapshotComparison {
  nodeCountDelta: number;
  selfSizeBytesDelta: number;
  typeDeltas: HeapSnapshotDeltaEntry[];
  groupDeltas: HeapSnapshotDeltaEntry[];
}

export interface HeapRetainingPathSource {
  scriptId: number;
  line: number;
  column: number;
  url?: string;
  originalSource?: string;
  originalLine?: number;
  originalColumn?: number;
  originalName?: string;
}

export interface HeapRetainingPathNode {
  id: number;
  type: string;
  name: string;
  selfSizeBytes: number;
  edgeType?: string;
  edgeName?: string;
  source?: HeapRetainingPathSource;
}

export interface HeapRetainingPath {
  targetNodeId: number;
  targetSelfSizeBytes: number;
  distance: number;
  omittedNodeCount: number;
  nodes: HeapRetainingPathNode[];
}

export interface HeapRetainingPathGroup {
  type: string;
  name: string;
  nodeCount: number;
  reachableNodeCount: number;
  selfSizeBytes: number;
  paths: HeapRetainingPath[];
}

export interface HeapRetainingPathOptions {
  maxPathsPerGroup?: number;
  maxPathDepth?: number;
  scriptUrls?: Record<string, string>;
}

export function summarizeHeapSnapshot(snapshot: unknown): HeapSnapshotSummary;
export function compareHeapSummaries(baseline: HeapSnapshotSummary, candidate: HeapSnapshotSummary): HeapSnapshotComparison;
export function findHeapRetainingPaths(snapshot: unknown, targets: Array<{ type: string; name: string }>, options?: HeapRetainingPathOptions): HeapRetainingPathGroup[];
export function formatHeapProfileMarkdown(result: Record<string, any>): string;
export function normalizeHeapNodeName(name: string): string;
