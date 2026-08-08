import assert from "node:assert/strict";
import test from "node:test";
import { getE2ePort, getE2ePortOffset, getE2eUrl, withE2ePortOffset } from "../e2e-ports.mjs";
import { getPlaywrightUiSmokeTargets, uiSmokeTargets } from "../ui-smoke-targets.mjs";

test("keeps default E2E ports unchanged without an offset", () => {
  assert.equal(getE2ePortOffset({}), 0);
  assert.equal(getE2ePort(4173, {}), 4173);
  assert.equal(getE2eUrl(4185, "/tickets", {}), "http://127.0.0.1:4185/tickets");
});

test("moves every configured server and explicit test URL by one shared offset", () => {
  const environment = { OPEN_GRID_E2E_PORT_OFFSET: "100" };
  assert.equal(getE2ePort(4173, environment), 4273);
  assert.equal(getE2eUrl(4187, "/tickets", environment), "http://127.0.0.1:4287/tickets");
  assert.equal(
    withE2ePortOffset("preview --port 4174 && HOST=127.0.0.1 PORT=4186", environment),
    "preview --port 4274 && HOST=127.0.0.1 PORT=4286",
  );
  assert.equal(getE2ePort(4193, environment), 4293);
  assert.equal(getE2eUrl(4195, "/", environment), "http://127.0.0.1:4295/");
  assert.equal(withE2ePortOffset("preview --port 4194", environment), "preview --port 4294");
});

test("moves Playwright UI smoke targets without changing canonical release targets", () => {
  const targets = getPlaywrightUiSmokeTargets({ OPEN_GRID_E2E_PORT_OFFSET: "100" });
  assert.deepEqual(targets.map((target) => target.url), [
    "http://127.0.0.1:4293/",
    "http://127.0.0.1:4294/",
    "http://127.0.0.1:4295/",
  ]);
  assert.deepEqual(targets.map((target) => target.previewCommand.at(-1)), ["4293", "4294", "4295"]);
  assert.deepEqual(uiSmokeTargets.map((target) => target.url), [
    "http://127.0.0.1:4193/",
    "http://127.0.0.1:4194/",
    "http://127.0.0.1:4195/",
  ]);
});

test("rejects invalid offsets and ports before browser servers start", () => {
  for (const offset of ["", "1.5", "-1", "not-a-number", "62000"]) {
    assert.throws(() => getE2ePortOffset({ OPEN_GRID_E2E_PORT_OFFSET: offset }), /must be a non-negative integer/);
  }
  assert.throws(() => getE2ePort(4172, {}), /between 4173 and 4187 or between 4193 and 4195/);
  assert.throws(() => getE2ePort(4188, {}), /between 4173 and 4187 or between 4193 and 4195/);
  assert.throws(() => getE2ePort(4196, {}), /between 4173 and 4187 or between 4193 and 4195/);
});
