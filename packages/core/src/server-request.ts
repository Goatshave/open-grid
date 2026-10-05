export type ServerRequestStatus = "idle" | "loading" | "success" | "error" | "cancelled";

export interface ServerRequestState<TData> {
  readonly status: ServerRequestStatus;
  readonly requestId: number | null;
  readonly data: TData | undefined;
  readonly error: unknown;
  readonly reason: unknown;
}

export interface ServerRequestContext<TKey> {
  readonly key: TKey;
  readonly requestId: number;
  readonly signal: AbortSignal;
}

export type ServerRequestResult<TData> =
  | { readonly status: "success"; readonly requestId: number; readonly data: TData }
  | { readonly status: "error"; readonly requestId: number; readonly error: unknown }
  | { readonly status: "cancelled" | "stale"; readonly requestId: number };

export interface ServerRequestCoordinatorOptions<TKey, TInput, TData> {
  getKey: (input: TInput) => TKey;
  request: (input: TInput, context: ServerRequestContext<TKey>) => TData | Promise<TData>;
}

export type ServerRequestListener<TKey, TData> = (key: TKey, state: ServerRequestState<TData>) => void;

export interface ServerRequestCoordinator<TKey, TInput, TData> {
  run: (input: TInput) => Promise<ServerRequestResult<TData>>;
  retry: (key: TKey) => Promise<ServerRequestResult<TData>> | null;
  cancel: (key: TKey, reason?: unknown) => boolean;
  cancelAll: (reason?: unknown) => number;
  reset: (key: TKey) => boolean;
  getState: (key: TKey) => ServerRequestState<TData>;
  subscribe: (listener: ServerRequestListener<TKey, TData>) => () => void;
  dispose: () => void;
}

interface ActiveServerRequest<TKey> {
  key: TKey;
  requestId: number;
  controller: AbortController;
  disposition: "active" | "cancelled" | "stale";
}

const idleServerRequestState = Object.freeze({
  status: "idle",
  requestId: null,
  data: undefined,
  error: undefined,
  reason: undefined,
}) satisfies ServerRequestState<never>;

export function createServerRequestCoordinator<TKey, TInput, TData>(
  options: ServerRequestCoordinatorOptions<TKey, TInput, TData>,
): ServerRequestCoordinator<TKey, TInput, TData> {
  if (typeof options?.getKey !== "function") {
    throw new TypeError("server request coordinator requires a getKey function");
  }
  if (typeof options?.request !== "function") {
    throw new TypeError("server request coordinator requires a request function");
  }

  const activeRequests = new Map<TKey, ActiveServerRequest<TKey>>();
  const lastInputs = new Map<TKey, TInput>();
  const states = new Map<TKey, ServerRequestState<TData>>();
  const listeners = new Set<ServerRequestListener<TKey, TData>>();
  let requestSequence = 0;
  let disposed = false;

  const getState = (key: TKey): ServerRequestState<TData> =>
    states.get(key) ?? (idleServerRequestState as ServerRequestState<TData>);

  const setState = (key: TKey, state: ServerRequestState<TData>) => {
    const snapshot = Object.freeze(state);
    states.set(key, snapshot);
    for (const listener of listeners) {
      listener(key, snapshot);
    }
  };

  const cancel = (key: TKey, reason?: unknown): boolean => {
    const activeRequest = activeRequests.get(key);
    if (!activeRequest) {
      return false;
    }

    activeRequest.disposition = "cancelled";
    activeRequests.delete(key);
    activeRequest.controller.abort(reason);
    const previous = getState(key);
    setState(key, {
      status: "cancelled",
      requestId: activeRequest.requestId,
      data: previous.data,
      error: undefined,
      reason,
    });
    return true;
  };

  const coordinator: ServerRequestCoordinator<TKey, TInput, TData> = {
    run: async (input) => {
      if (disposed) {
        throw new Error("server request coordinator is disposed");
      }

      const key = options.getKey(input);
      const replacedRequest = activeRequests.get(key);
      if (replacedRequest) {
        replacedRequest.disposition = "stale";
        replacedRequest.controller.abort();
      }

      const requestId = requestSequence + 1;
      const controller = new AbortController();
      const activeRequest: ActiveServerRequest<TKey> = {
        key,
        requestId,
        controller,
        disposition: "active",
      };
      requestSequence = requestId;
      activeRequests.set(key, activeRequest);
      lastInputs.set(key, input);
      setState(key, {
        status: "loading",
        requestId,
        data: getState(key).data,
        error: undefined,
        reason: undefined,
      });

      try {
        const data = await options.request(input, { key, requestId, signal: controller.signal });
        if (activeRequest.disposition !== "active" || activeRequests.get(key) !== activeRequest) {
          return { status: activeRequest.disposition === "cancelled" ? "cancelled" : "stale", requestId };
        }

        activeRequests.delete(key);
        setState(key, { status: "success", requestId, data, error: undefined, reason: undefined });
        return { status: "success", requestId, data };
      } catch (error) {
        if (activeRequest.disposition !== "active" || activeRequests.get(key) !== activeRequest) {
          return { status: activeRequest.disposition === "cancelled" ? "cancelled" : "stale", requestId };
        }

        activeRequests.delete(key);
        const previous = getState(key);
        setState(key, {
          status: "error",
          requestId,
          data: previous.data,
          error,
          reason: undefined,
        });
        return { status: "error", requestId, error };
      }
    },
    retry: (key) => (lastInputs.has(key) ? coordinator.run(lastInputs.get(key) as TInput) : null),
    cancel,
    cancelAll: (reason) => {
      let cancelledCount = 0;
      for (const key of [...activeRequests.keys()]) {
        if (cancel(key, reason)) {
          cancelledCount += 1;
        }
      }
      return cancelledCount;
    },
    reset: (key) => {
      const activeRequest = activeRequests.get(key);
      const hadState = states.has(key) || lastInputs.has(key) || Boolean(activeRequest);
      if (activeRequest) {
        activeRequest.disposition = "cancelled";
        activeRequests.delete(key);
        activeRequest.controller.abort();
      }
      states.delete(key);
      lastInputs.delete(key);
      if (hadState) {
        const state = idleServerRequestState as ServerRequestState<TData>;
        for (const listener of listeners) {
          listener(key, state);
        }
      }
      return hadState;
    },
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const activeRequest of activeRequests.values()) {
        activeRequest.disposition = "cancelled";
        activeRequest.controller.abort();
      }
      activeRequests.clear();
      lastInputs.clear();
      states.clear();
      listeners.clear();
    },
  };

  return coordinator;
}
