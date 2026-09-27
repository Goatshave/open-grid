import { describe, expect, it, vi } from "vitest";
import { createServerRequestCoordinator, type ServerRequestContext } from "../src";

interface RequestInput {
  key: string;
  value: string;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("createServerRequestCoordinator", () => {
  it("runs independent keyed requests and publishes immutable state", async () => {
    const listener = vi.fn();
    const coordinator = createServerRequestCoordinator<string, RequestInput, string>({
      getKey: (input) => input.key,
      request: async (input, context) => `${context.requestId}:${input.value}`,
    });
    coordinator.subscribe(listener);

    expect(coordinator.getState("missing")).toEqual({
      status: "idle",
      requestId: null,
      data: undefined,
      error: undefined,
      reason: undefined,
    });

    const [first, second] = await Promise.all([
      coordinator.run({ key: "alpha", value: "A" }),
      coordinator.run({ key: "beta", value: "B" }),
    ]);

    expect(first).toEqual({ status: "success", requestId: 1, data: "1:A" });
    expect(second).toEqual({ status: "success", requestId: 2, data: "2:B" });
    expect(coordinator.getState("alpha")).toMatchObject({ status: "success", data: "1:A" });
    expect(coordinator.getState("beta")).toMatchObject({ status: "success", data: "2:B" });
    expect(Object.isFrozen(coordinator.getState("alpha"))).toBe(true);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("marks replaced work stale and lets only the newest same-key request commit", async () => {
    const requests: Array<{ context: ServerRequestContext<string>; deferred: Deferred<string> }> = [];
    const coordinator = createServerRequestCoordinator<string, RequestInput, string>({
      getKey: (input) => input.key,
      request: (_input, context) => {
        const deferred = createDeferred<string>();
        requests.push({ context, deferred });
        return deferred.promise;
      },
    });

    const first = coordinator.run({ key: "rows", value: "old" });
    const second = coordinator.run({ key: "rows", value: "new" });

    expect(requests[0]?.context.signal.aborted).toBe(true);
    requests[1]?.deferred.resolve("new rows");
    expect(await second).toEqual({ status: "success", requestId: 2, data: "new rows" });

    requests[0]?.deferred.resolve("old rows");
    expect(await first).toEqual({ status: "stale", requestId: 1 });
    expect(coordinator.getState("rows")).toMatchObject({ status: "success", data: "new rows" });
  });

  it("retains committed data through loading and error states and retries the last input", async () => {
    const requests: Deferred<string>[] = [];
    const coordinator = createServerRequestCoordinator<string, RequestInput, string>({
      getKey: (input) => input.key,
      request: () => {
        const deferred = createDeferred<string>();
        requests.push(deferred);
        return deferred.promise;
      },
    });

    const initial = coordinator.run({ key: "rows", value: "query" });
    requests[0]?.resolve("cached rows");
    await initial;

    const refresh = coordinator.run({ key: "rows", value: "query" });
    expect(coordinator.getState("rows")).toMatchObject({ status: "loading", data: "cached rows" });
    const error = new Error("server unavailable");
    requests[1]?.reject(error);
    expect(await refresh).toEqual({ status: "error", requestId: 2, error });
    expect(coordinator.getState("rows")).toMatchObject({ status: "error", data: "cached rows", error });

    const retry = coordinator.retry("rows");
    expect(retry).not.toBeNull();
    expect(coordinator.getState("rows")).toMatchObject({ status: "loading", data: "cached rows" });
    requests[2]?.resolve("recovered rows");
    expect(await retry).toEqual({ status: "success", requestId: 3, data: "recovered rows" });
    expect(coordinator.retry("missing")).toBeNull();
  });

  it("cancels keyed or all active work and resets retained request state", async () => {
    const coordinator = createServerRequestCoordinator<string, RequestInput, string>({
      getKey: (input) => input.key,
      request: (_input, { signal }) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    });
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const alpha = coordinator.run({ key: "alpha", value: "A" });
    const beta = coordinator.run({ key: "beta", value: "B" });
    expect(coordinator.cancel("alpha", "collapsed")).toBe(true);
    expect(coordinator.getState("alpha")).toMatchObject({ status: "cancelled", reason: "collapsed" });
    expect(await alpha).toEqual({ status: "cancelled", requestId: 1 });
    expect(coordinator.cancel("alpha")).toBe(false);

    expect(coordinator.cancelAll("unmounted")).toBe(1);
    expect(await beta).toEqual({ status: "cancelled", requestId: 2 });
    expect(coordinator.getState("beta")).toMatchObject({ status: "cancelled", reason: "unmounted" });

    expect(coordinator.reset("alpha")).toBe(true);
    expect(coordinator.getState("alpha").status).toBe("idle");
    expect(coordinator.retry("alpha")).toBeNull();
    expect(coordinator.reset("missing")).toBe(false);
    expect(listener).toHaveBeenLastCalledWith("alpha", coordinator.getState("alpha"));
  });

  it("disposes active work and rejects future runs", async () => {
    const coordinator = createServerRequestCoordinator<string, RequestInput, string>({
      getKey: (input) => input.key,
      request: (_input, { signal }) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    });
    const request = coordinator.run({ key: "rows", value: "query" });

    coordinator.dispose();
    coordinator.dispose();

    expect(await request).toEqual({ status: "cancelled", requestId: 1 });
    await expect(coordinator.run({ key: "rows", value: "next" })).rejects.toThrow("disposed");
  });

  it("rejects missing request contract functions", () => {
    expect(() => createServerRequestCoordinator({ getKey: null, request: () => null } as never)).toThrow("getKey");
    expect(() => createServerRequestCoordinator({ getKey: () => "rows", request: null } as never)).toThrow("request");
  });
});
