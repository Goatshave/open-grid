import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAudit } from "../dependency-audit.mjs";

const exception = {
  advisory: "GHSA-test-test-test", package: "legacy", version: "1.0.0",
  pathPrefix: "compatibility/legacy > ", expires: "2026-11-22",
  reason: "Build-only lower-bound fixture; no deployed server.",
};
const policy = { version: 1, exceptions: [exception] };
const date = "2026-10-22";
function report(paths, version = "1.0.0") {
  return {
    metadata: { vulnerabilities: { low: 0, moderate: 0, high: 1, critical: 0 } },
    advisories: { 1: {
      github_advisory_id: exception.advisory, module_name: "legacy", severity: "high",
      findings: [{ version, paths }],
    } },
  };
}

test("an exception accepts only its exact advisory, version and fixture path", () => {
  const result = evaluateAudit(report([
    "compatibility/legacy > legacy@1.0.0",
    "examples/product > legacy@1.0.0",
  ]), policy, date);
  assert.equal(result.passed, false);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.blocked.length, 1);
  assert.equal(evaluateAudit(report(["compatibility/legacy > legacy@1.0.1"], "1.0.1"), policy, date).passed, false);
  const other = report(["compatibility/legacy > legacy@1.0.0"]);
  other.advisories[1].github_advisory_id = "GHSA-newx-newx-newx";
  assert.equal(evaluateAudit(other, policy, date).passed, false);
});

test("expired and unscoped exceptions fail closed", () => {
  assert.throws(() => evaluateAudit(report(["compatibility/legacy > legacy@1.0.0"]), policy, "2026-11-22"), /expired/);
  assert.throws(() => evaluateAudit(report(["anything"]), {
    version: 1, exceptions: [{ ...exception, pathPrefix: "" }],
  }, date), /Invalid path-scoped/);
});

test("audit errors and incomplete findings cannot produce a pass", () => {
  assert.throws(() => evaluateAudit({ error: "registry unavailable" }, policy, date), /complete advisory/);
  assert.throws(() => evaluateAudit(report([]), policy, date), /missing dependency paths/);
  const missing = report(["path"]);
  missing.advisories = {};
  assert.throws(() => evaluateAudit(missing, policy, date), /without findings/);
  assert.throws(() => evaluateAudit({ metadata: { vulnerabilities: {} }, advisories: {} }, policy, date), /complete vulnerability counts/);
  assert.equal(evaluateAudit({ metadata: { vulnerabilities: { low: 0, moderate: 0, high: 0, critical: 0 } }, advisories: {} }, policy, date).passed, true);
});
