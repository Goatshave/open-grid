export type ServerMutationFailure = "error" | "validation-error" | "conflict";
export type ServerMutationStatus = "idle" | "queued" | "saving" | "success" | ServerMutationFailure;

export interface ServerMutationContext<TKey, TData> {
  readonly key: TKey;
  readonly mutationId: number;
  /** Stable across retries. The transport/server must enforce idempotency. */
  readonly operationId: string;
  readonly previousData: TData | undefined;
}

export interface ServerMutationState<TInput, TData> {
  readonly status: ServerMutationStatus;
  readonly mutationId: number | null;
  readonly operationId: string | null;
  readonly input: TInput | undefined;
  readonly data: TData | undefined;
  readonly error: unknown;
  readonly pendingCount: number;
}

export type ServerMutationResult<TData> =
  | { readonly status: "success"; readonly mutationId: number; readonly operationId: string; readonly data: TData; readonly isCurrent: boolean }
  | { readonly status: ServerMutationFailure; readonly mutationId: number; readonly operationId: string; readonly error: unknown; readonly isCurrent: boolean }
  | { readonly status: "cancelled"; readonly mutationId: number; readonly operationId: string; readonly isCurrent: false };

export interface ServerMutationCoordinatorOptions<TKey, TInput, TData> {
  getKey: (input: TInput) => TKey;
  mutate: (input: TInput, context: ServerMutationContext<TKey, TData>) => TData | Promise<TData>;
  classifyError?: (error: unknown) => ServerMutationFailure;
  createOperationId?: () => string;
  onListenerError?: (error: unknown) => void;
}

export interface ServerMutationCoordinator<TKey, TInput, TData> {
  run: (input: TInput) => Promise<ServerMutationResult<TData>>;
  runAll: (inputs: readonly TInput[]) => Promise<ServerMutationResult<TData>[]>;
  retry: (key: TKey) => Promise<ServerMutationResult<TData>> | null;
  retryFailed: () => Promise<ServerMutationResult<TData>[]>;
  getState: (key: TKey) => ServerMutationState<TInput, TData>;
  getStates: () => ReadonlyMap<TKey, ServerMutationState<TInput, TData>>;
  isCurrent: (key: TKey, mutationId: number) => boolean;
  subscribe: (listener: (key: TKey, state: ServerMutationState<TInput, TData>) => void) => () => void;
  /** Forget settled work, optionally replacing the acknowledged server value. */
  reset: (key: TKey, data?: TData) => boolean;
  /** Discard queued writes; an already-started server write is not rolled back. */
  dispose: () => void;
}

interface MutationJob<TInput, TData> {
  id: number;
  operationId: string;
  input: TInput;
  status: Exclude<ServerMutationStatus, "idle">;
  error: unknown;
  resolve: (result: ServerMutationResult<TData>) => void;
}

interface MutationLane<TInput, TData> {
  latest: MutationJob<TInput, TData> | undefined;
  active: MutationJob<TInput, TData> | undefined;
  queue: MutationJob<TInput, TData>[];
  data: TData | undefined;
}

/** Serializes writes per key. Products continue to own transport and row data. */
export function createServerMutationCoordinator<TKey, TInput, TData>(
  options: ServerMutationCoordinatorOptions<TKey, TInput, TData>,
): ServerMutationCoordinator<TKey, TInput, TData> {
  if (typeof options?.getKey !== "function" || typeof options?.mutate !== "function") {
    throw new TypeError("server mutation coordinator requires getKey and mutate functions");
  }
  const lanes = new Map<TKey, MutationLane<TInput, TData>>();
  const states = new Map<TKey, ServerMutationState<TInput, TData>>();
  const listeners = new Set<(key: TKey, state: ServerMutationState<TInput, TData>) => void>();
  const idle = Object.freeze({ status: "idle", mutationId: null, operationId: null, input: undefined,
    data: undefined, error: undefined, pendingCount: 0 }) as ServerMutationState<TInput, TData>;
  let sequence = 0;
  let disposed = false;

  const notify = (key: TKey, state: ServerMutationState<TInput, TData>) => {
    for (const listener of listeners) {
      try { listener(key, state); } catch (error) {
        if (options.onListenerError) {
          try { options.onListenerError(error); } catch (reportError) { queueMicrotask(() => { throw reportError; }); }
        } else queueMicrotask(() => { throw error; });
      }
    }
  };

  const publish = (key: TKey, lane: MutationLane<TInput, TData>) => {
    if (disposed) return;
    const job = lane.latest;
    const state = Object.freeze({
      status: job?.status ?? "idle", mutationId: job?.id ?? null,
      operationId: job?.operationId ?? null, input: job?.input,
      data: lane.data, error: job?.error,
      pendingCount: lane.queue.length + (lane.active ? 1 : 0),
    }) satisfies ServerMutationState<TInput, TData>;
    states.set(key, state);
    notify(key, state);
  };

  const drain = async (key: TKey, lane: MutationLane<TInput, TData>) => {
    if (disposed || lane.active) return;
    const job = lane.queue.shift();
    if (!job) return;
    lane.active = job;
    job.status = "saving";
    publish(key, lane);
    let result: ServerMutationResult<TData>;
    try {
      const data = await options.mutate(job.input, {
        key, mutationId: job.id, operationId: job.operationId, previousData: lane.data,
      });
      lane.data = data;
      job.status = "success";
      result = { status: "success", mutationId: job.id, operationId: job.operationId,
        data, isCurrent: !disposed && lane.latest === job };
    } catch (error) {
      let status: ServerMutationFailure = "error";
      try { status = options.classifyError?.(error) ?? "error"; } catch { /* Keep the original transport failure. */ }
      if (!["error", "validation-error", "conflict"].includes(status)) status = "error";
      job.status = status;
      job.error = error;
      result = { status, mutationId: job.id, operationId: job.operationId, error,
        isCurrent: !disposed && lane.latest === job };
    }
    lane.active = undefined;
    publish(key, lane);
    job.resolve(result);
    void drain(key, lane);
  };

  const enqueue = (key: TKey, lane: MutationLane<TInput, TData>, input: TInput, operationId: string) => {
    let resolve!: (result: ServerMutationResult<TData>) => void;
    const promise = new Promise<ServerMutationResult<TData>>((done) => { resolve = done; });
    const job: MutationJob<TInput, TData> = {
      id: ++sequence, operationId, input, status: "queued", error: undefined, resolve,
    };
    lane.latest = job;
    lane.queue.push(job);
    publish(key, lane);
    void drain(key, lane);
    return promise;
  };

  const coordinator: ServerMutationCoordinator<TKey, TInput, TData> = {
    run: (input) => {
      if (disposed) throw new Error("server mutation coordinator is disposed");
      const key = options.getKey(input);
      const operationId = options.createOperationId?.() ?? globalThis.crypto.randomUUID();
      if (typeof operationId !== "string" || !operationId.trim()) throw new TypeError("mutation operation ID must be non-empty");
      const lane = lanes.get(key) ?? { latest: undefined, active: undefined, queue: [], data: undefined };
      lanes.set(key, lane);
      return enqueue(key, lane, input, operationId);
    },
    runAll: (inputs) => Promise.all(inputs.map((input) => coordinator.run(input))),
    retry: (key) => {
      if (disposed) throw new Error("server mutation coordinator is disposed");
      const lane = lanes.get(key);
      const job = lane?.latest;
      if (!lane || !job || lane.active || lane.queue.length ||
        !["error", "validation-error", "conflict"].includes(job.status)) return null;
      return enqueue(key, lane, job.input, job.operationId);
    },
    retryFailed: () => Promise.all([...lanes.keys()].flatMap((key) => {
      const retry = coordinator.retry(key);
      return retry ? [retry] : [];
    })),
    getState: (key) => states.get(key) ?? idle,
    getStates: () => new Map(states),
    isCurrent: (key, mutationId) => !disposed && lanes.get(key)?.latest?.id === mutationId,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reset: (key, data) => {
      if (disposed) throw new Error("server mutation coordinator is disposed");
      const lane = lanes.get(key);
      if (lane?.active || lane?.queue.length) return false;
      if (data === undefined) {
        lanes.delete(key);
        states.delete(key);
        notify(key, idle);
      } else {
        const replacement = { latest: undefined, active: undefined, queue: [], data };
        lanes.set(key, replacement);
        publish(key, replacement);
      }
      return true;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const lane of lanes.values()) {
        for (const job of lane.queue.splice(0)) job.resolve({ status: "cancelled",
          mutationId: job.id, operationId: job.operationId, isCurrent: false });
      }
      lanes.clear(); states.clear(); listeners.clear();
    },
  };
  return coordinator;
}
