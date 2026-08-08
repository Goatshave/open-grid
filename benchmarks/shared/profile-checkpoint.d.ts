export interface BenchmarkCheckpointEnvironment {
  platform: string;
  cpu: string;
  logicalCpuCount: number;
  totalMemoryBytes: number;
  node: string;
  browser: string;
  gitRevision: string;
  gitDirty: boolean;
  sourceFingerprint: string;
}

export interface BenchmarkProfileCheckpointExpectation {
  suite: string;
  profileId: string;
  runs: number;
  warmups: number;
  environment: BenchmarkCheckpointEnvironment;
  implementations: Array<{ id: string; version: string }>;
}

export type BenchmarkProfileCheckpointReadResult =
  | { status: "missing" }
  | { status: "incompatible"; reason: string }
  | { status: "reused"; result: Record<string, unknown> };

export declare function readBenchmarkProfileCheckpoint(
  checkpointPath: string,
  expected: BenchmarkProfileCheckpointExpectation,
): BenchmarkProfileCheckpointReadResult;
export declare function writeBenchmarkProfileCheckpoint(
  checkpointPath: string,
  result: Record<string, unknown>,
): void;
export declare function validateBenchmarkProfileCheckpoint(
  result: Record<string, unknown>,
  expected: BenchmarkProfileCheckpointExpectation,
): void;
