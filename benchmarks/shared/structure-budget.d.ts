export type StructureBudgetMetric = "mountedRowCount" | "mountedCellCount" | "domElementCount" | "domNodeCount";

export interface StructureBudgetProfile {
  id: string;
  rowCount: number;
  columnCount: number;
}

export interface StructureBudgetLimits {
  mountedRowCount: number;
  mountedCellCount: number;
  domElementCount: number;
  domNodeCount: number;
}

export interface StructureBudgetApplication {
  id: string;
  url: string;
  limits: Record<string, StructureBudgetLimits>;
}

export interface StructureBudgetEquality {
  profileId: string;
  applicationIds: string[];
  metric: StructureBudgetMetric;
}

export interface StructureBudgetComparison {
  profileId: string;
  candidateId: string;
  baselineId: string;
  metric: StructureBudgetMetric;
  maxDelta: number;
}

export interface StructureBudgetConfig {
  schemaVersion: 1;
  viewport: { width: number; height: number };
  profiles: StructureBudgetProfile[];
  applications: StructureBudgetApplication[];
  equalities?: StructureBudgetEquality[];
  comparisons?: StructureBudgetComparison[];
}

export interface StructureBudgetObservation {
  applicationId: string;
  profileId: string;
  datasetFingerprint: string;
  rowCount: number;
  columnCount: number;
  displayedRowCount: number;
  mountedRowCount: number;
  mountedCellCount: number;
  domElementCount: number;
  domNodeCount: number;
}

export interface StructureBudgetCheck {
  id: string;
  type: "absolute" | "equality" | "relative";
  profileId: string;
  applicationId?: string;
  applicationIds?: string[];
  baselineId?: string;
  metric: StructureBudgetMetric;
  actual?: number;
  baseline?: number;
  maxDelta?: number;
  minimum?: number;
  maximum: number;
  passed: boolean;
}

export interface StructureBudgetResult {
  schemaVersion: 1;
  passed: boolean;
  observations: StructureBudgetObservation[];
  checks: StructureBudgetCheck[];
  failures: StructureBudgetCheck[];
}

export declare const BENCHMARK_STRUCTURE_BUDGET_SCHEMA_VERSION: 1;
export declare function evaluateStructureBudgets(config: StructureBudgetConfig, observations: StructureBudgetObservation[]): StructureBudgetResult;
export declare function validateStructureBudgetConfig(config: StructureBudgetConfig): void;
export declare function formatStructureBudgetMarkdown(result: StructureBudgetResult): string;
