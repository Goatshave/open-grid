export type BenchmarkCellValue = string | number;

export interface BenchmarkRow {
  id: string;
  [columnId: string]: BenchmarkCellValue;
}

export type BenchmarkColumnKind = "id" | "category" | "number" | "date";

export interface BenchmarkColumn {
  id: string;
  label: string;
  kind: BenchmarkColumnKind;
  sortable: true;
  filterable: true;
  groupable: boolean;
}

export interface BenchmarkProfile {
  id: "small-interactive" | "standard-client" | "wide-client" | "large-client" | "stress-client" | "massive-virtual";
  label: string;
  rowCount: number;
  columnCount: number;
  purpose: string;
}

export interface BenchmarkDatasetOptions {
  rowCount: number;
  columnCount: number;
  seed?: number;
}

export interface BenchmarkDataset {
  generatorVersion: number;
  seed: number;
  rowCount: number;
  columnCount: number;
  columns: BenchmarkColumn[];
  rows: BenchmarkRow[];
}

export const BENCHMARK_GENERATOR_VERSION: 1;
export const BENCHMARK_DEFAULT_SEED: number;
export const BENCHMARK_PROFILES: readonly BenchmarkProfile[];

export function getBenchmarkProfile(id: BenchmarkProfile["id"]): BenchmarkProfile;
export function createBenchmarkColumns(columnCount: number): BenchmarkColumn[];
export function createBenchmarkRow(rowIndex: number, columnCount: number, seed?: number): BenchmarkRow;
export function createBenchmarkDataset(options: BenchmarkDatasetOptions): BenchmarkDataset;
export function createBenchmarkAllRowSelection(rowCount: number): Record<string, true>;
export function fingerprintBenchmarkDataset(dataset: BenchmarkDataset): string;
