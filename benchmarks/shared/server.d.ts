export const SERVER_BENCHMARK_DRIVER_VERSION: 1;
export const SERVER_BENCHMARK_DEFAULT_DELAY_MS: 40;

export interface ServerTransportStats {
  started: number;
  completed: number;
  aborted: number;
  inFlight: number;
}

export interface ServerTransportContext {
  requestId: number;
  signal?: AbortSignal;
  delayMs: number;
}

export interface ServerTransportTiming {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ServerTransportRequestOptions {
  signal?: AbortSignal;
  delayMs?: number;
}

export interface DeterministicServerTransport<TInput, TOutput> {
  request(input: TInput, options?: ServerTransportRequestOptions): Promise<TOutput>;
  getStats(): ServerTransportStats;
}

export function createDeterministicServerTransport<TInput, TOutput>(
  handler: (input: TInput, context: ServerTransportContext) => TOutput | Promise<TOutput>,
  options?: { delayMs?: number; timing?: ServerTransportTiming },
): DeterministicServerTransport<TInput, TOutput>;

export type LatestRequestResult<T> =
  | { status: "committed"; requestId: number; value: T }
  | { status: "aborted" | "stale"; requestId: number };

export interface LatestRequestCoordinator {
  run<T>(request: (context: { requestId: number; signal: AbortSignal }) => Promise<T>): Promise<LatestRequestResult<T>>;
  cancel(): void;
  getStats(): { sequence: number; staleResponses: number; activeRequestId: number | null };
}

export function createLatestRequestCoordinator(): LatestRequestCoordinator;
export function isAbortError(error: unknown): boolean;
