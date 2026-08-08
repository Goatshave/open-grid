import type { BenchmarkImplementationResult } from "./results.mjs";

export interface BenchmarkProfileResult {
  schemaVersion: number;
  createdAt: string;
  status: "observational";
  datasetFingerprint: string;
  config: { suite: "comparison" | "framework"; profileId: string; runs: number; warmups: number };
  environment: Record<string, unknown> & {
    browser: string;
    platform: string;
    gitRevision: string;
    gitDirty: boolean;
    sourceFingerprint?: string;
  };
  implementations: BenchmarkImplementationResult[];
}

export interface BenchmarkMatrixResult {
  schemaVersion: number;
  createdAt: string;
  status: "observational";
  config: { suite: "comparison" | "framework"; profileIds: string[]; runs: number; warmups: number };
  environment: BenchmarkProfileResult["environment"];
  profiles: BenchmarkProfileResult[];
}

export const BENCHMARK_MATRIX_SCHEMA_VERSION: 2;
export function createBenchmarkMatrix(results: BenchmarkProfileResult[]): BenchmarkMatrixResult;
export function formatBenchmarkMatrixMarkdown(matrix: BenchmarkMatrixResult): string;
