import assert from "node:assert/strict";
import test from "node:test";
import { createDeterministicServerTransport, createLatestRequestCoordinator } from "../server.mjs";

test("runs deterministic requests and reports transport statistics", async () => {
  const transport = createDeterministicServerTransport((value, context) => `${context.requestId}:${value}`, { delayMs: 0 });
  assert.equal(await transport.request("rows"), "1:rows");
  assert.deepEqual(transport.getStats(), { started: 1, completed: 1, aborted: 0, inFlight: 0 });
});

test("aborts delayed requests without invoking the server handler", async () => {
  let handled = false;
  const transport = createDeterministicServerTransport(() => {
    handled = true;
  }, { delayMs: 50 });
  const controller = new AbortController();
  const request = transport.request("rows", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, (error) => error?.name === "AbortError");
  assert.equal(handled, false);
  assert.deepEqual(transport.getStats(), { started: 1, completed: 0, aborted: 1, inFlight: 0 });
});

test("latest request coordinator aborts replaced work and commits only the newest value", async () => {
  const transport = createDeterministicServerTransport((value) => value, { delayMs: 10 });
  const coordinator = createLatestRequestCoordinator();
  const first = coordinator.run(({ signal }) => transport.request("old", { signal }));
  const second = coordinator.run(({ signal }) => transport.request("new", { signal, delayMs: 0 }));
  assert.deepEqual(await second, { status: "committed", requestId: 2, value: "new" });
  assert.deepEqual(await first, { status: "aborted", requestId: 1 });
  assert.equal(transport.getStats().aborted, 1);
  assert.equal(coordinator.getStats().activeRequestId, null);
});

test("rejects malformed transport inputs", async () => {
  assert.throws(() => createDeterministicServerTransport(null), /handler/);
  assert.throws(() => createDeterministicServerTransport(() => null, { delayMs: -1 }), /delay/);
  const coordinator = createLatestRequestCoordinator();
  await assert.rejects(coordinator.run(null), /request function/);
});
