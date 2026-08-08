export const SERVER_BENCHMARK_DRIVER_VERSION = 1;
export const SERVER_BENCHMARK_DEFAULT_DELAY_MS = 40;

export function createDeterministicServerTransport(handler, options = {}) {
  if (typeof handler !== "function") {
    throw new TypeError("server transport handler must be a function");
  }
  const defaultDelayMs = normalizeDelay(options.delayMs ?? SERVER_BENCHMARK_DEFAULT_DELAY_MS);
  const timing = options.timing ?? globalThis;
  if (typeof timing.setTimeout !== "function" || typeof timing.clearTimeout !== "function") {
    throw new TypeError("server transport timing requires setTimeout and clearTimeout");
  }

  const stats = { started: 0, completed: 0, aborted: 0, inFlight: 0 };

  return {
    async request(input, requestOptions = {}) {
      const requestId = stats.started + 1;
      const delayMs = normalizeDelay(requestOptions.delayMs ?? defaultDelayMs);
      const signal = requestOptions.signal;
      stats.started += 1;
      stats.inFlight += 1;

      try {
        await waitForDelay(delayMs, signal, timing);
        throwIfAborted(signal);
        const result = await handler(input, { requestId, signal, delayMs });
        throwIfAborted(signal);
        stats.completed += 1;
        return result;
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          stats.aborted += 1;
          throw createAbortError();
        }
        throw error;
      } finally {
        stats.inFlight -= 1;
      }
    },
    getStats() {
      return { ...stats };
    },
  };
}

export function createLatestRequestCoordinator() {
  let current;
  let sequence = 0;
  let staleResponses = 0;

  return {
    async run(request) {
      if (typeof request !== "function") {
        throw new TypeError("latest request coordinator requires a request function");
      }
      current?.controller.abort();
      const requestId = sequence + 1;
      const controller = new AbortController();
      sequence = requestId;
      current = { requestId, controller };
      try {
        const value = await request({ requestId, signal: controller.signal });
        if (current?.requestId !== requestId) {
          staleResponses += 1;
          return { status: "stale", requestId };
        }
        return { status: "committed", requestId, value };
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return { status: "aborted", requestId };
        }
        throw error;
      } finally {
        if (current?.requestId === requestId) current = undefined;
      }
    },
    cancel() {
      current?.controller.abort();
    },
    getStats() {
      return { sequence, staleResponses, activeRequestId: current?.requestId ?? null };
    },
  };
}

export function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}

function waitForDelay(delayMs, signal, timing) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timeoutId = timing.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    function abort() {
      timing.clearTimeout(timeoutId);
      reject(createAbortError());
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function normalizeDelay(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("server transport delay must be a non-negative finite number");
  }
  return value;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

function createAbortError() {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
}
