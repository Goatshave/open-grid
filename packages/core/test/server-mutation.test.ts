import { describe, expect, it } from "vitest";
import { createServerMutationCoordinator, type ServerMutationContext } from "../src";

function deferred<T>() {
  let resolve!: (data: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("server mutation coordinator", () => {
  it("does not strand queued writes when a state subscriber throws", async () => {
    const reported: unknown[] = [];
    const saves = createServerMutationCoordinator({ getKey: (value: string) => value,
      mutate: (value: string) => value, onListenerError: (error) => reported.push(error) });
    saves.subscribe(() => { throw new Error("broken subscriber"); });
    expect(await saves.run("cell")).toMatchObject({ status: "success", data: "cell" });
    expect(reported.length).toBeGreaterThan(0);
  });
  it("serializes writes to one cell, lets other cells save, and fences older completions", async () => {
    const calls: { value: string; context: ServerMutationContext<string, string>; task: ReturnType<typeof deferred<string>> }[] = [];
    const saves = createServerMutationCoordinator({
      getKey: (input: { key: string; value: string }) => input.key,
      mutate: (input, context: ServerMutationContext<string, string>) => {
        const task = deferred<string>(); calls.push({ value: input.value, context, task }); return task.promise;
      },
    });
    const first = saves.run({ key: "a", value: "old" });
    const second = saves.run({ key: "a", value: "new" });
    const other = saves.run({ key: "b", value: "independent" });
    expect(calls.map((call) => call.value)).toEqual(["old", "independent"]);
    expect(saves.getState("a")).toMatchObject({ status: "queued", pendingCount: 2 });
    calls[1]!.task.resolve("other result");
    expect(await other).toMatchObject({ status: "success", isCurrent: true });
    calls[0]!.task.resolve("old result");
    expect(await first).toMatchObject({ status: "success", isCurrent: false });
    expect(calls[2]!.context.previousData).toBe("old result");
    expect(calls[2]!.value).toBe("new");
    calls[2]!.task.resolve("new result");
    const latest = await second;
    expect(latest).toMatchObject({ status: "success", isCurrent: true });
    expect(saves.getState("a")).toMatchObject({ data: "new result", pendingCount: 0 });
    expect(Object.isFrozen(saves.getState("a"))).toBe(true);
    saves.run({ key: "a", value: "newer" });
    expect(saves.isCurrent("a", latest.mutationId)).toBe(false);
    calls[3]!.task.resolve("newer result");
    await tick();
  });

  it("classifies failures, retains accepted data, and retries only failed cells with the same operation ID", async () => {
    const attempts = new Map<string, number>();
    const ids: string[] = [];
    const saves = createServerMutationCoordinator<string, { key: string }, string>({
      getKey: (input) => input.key,
      classifyError: () => "conflict",
      mutate: (input, context) => {
        ids.push(context.operationId);
        const attempt = (attempts.get(input.key) ?? 0) + 1; attempts.set(input.key, attempt);
        if (input.key === "b" && attempt === 1) throw new Error("revision conflict");
        return input.key;
      },
    });
    const results = await saves.runAll([{ key: "a" }, { key: "b" }]);
    expect(results.map((result) => result.status)).toEqual(["success", "conflict"]);
    expect(saves.getState("b")).toMatchObject({ status: "conflict", input: { key: "b" } });
    expect(saves.retry("a")).toBeNull();
    expect(await saves.retryFailed()).toHaveLength(1);
    expect(attempts.get("a")).toBe(1);
    expect(attempts.get("b")).toBe(2);
    expect(ids[2]).toBe(ids[1]);
    expect(saves.getState("b")).toMatchObject({ status: "success", data: "b" });
  });

  it("keeps acknowledgement data after an error and supports explicit conflict resynchronization", async () => {
    let fail = false;
    const saves = createServerMutationCoordinator<string, string, number>({
      getKey: () => "cell", mutate: (_input, context) => {
        if (fail) throw new Error("offline"); return (context.previousData ?? 0) + 1;
      },
    });
    await saves.run("first"); fail = true; await saves.run("second");
    expect(saves.getState("cell")).toMatchObject({ status: "error", data: 1 });
    expect(saves.reset("cell", 9)).toBe(true);
    fail = false; await saves.run("after reload");
    expect(saves.getState("cell").data).toBe(10);
    expect(saves.reset("cell")).toBe(true);
    expect(saves.getState("cell").status).toBe("idle");
    expect(saves.getStates().size).toBe(0);
  });

  it("discards queued writes on dispose without claiming rollback of started writes", async () => {
    const active = deferred<string>(); let calls = 0; let notifications = 0;
    const saves = createServerMutationCoordinator<string, string, string>({
      getKey: () => "cell", mutate: () => { calls++; return active.promise; },
    });
    saves.subscribe(() => notifications++);
    const first = saves.run("active"); const second = saves.run("queued");
    expect(saves.reset("cell")).toBe(false);
    saves.dispose(); const before = notifications;
    expect(await second).toMatchObject({ status: "cancelled", isCurrent: false });
    active.resolve("server may have committed");
    expect(await first).toMatchObject({ status: "success", isCurrent: false });
    expect(calls).toBe(1); expect(notifications).toBe(before);
    expect(() => saves.run("later")).toThrow(/disposed/);
  });
});
