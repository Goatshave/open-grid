import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("consumer smoke rejects malformed arguments before staging packages", () => {
  assertFailure(["--unknown"], /unknown argument/);
  assertFailure(["--version"], /--version requires a value/);
  assertFailure(["--version", "invalid"], /version must be valid semver/);
  assertFailure(["--tarball-dir"], /--tarball-dir requires a value/);
});

function assertFailure(args, pattern) {
  const result = spawnSync(process.execPath, ["scripts/release-consumer-smoke.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}
