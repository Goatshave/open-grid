import assert from "node:assert/strict";
import test from "node:test";

import {
  getReleaseChannel,
  requirePrereleaseNpmTagPolicy,
} from "../release-version-policy.mjs";

test("release channels use the documented stable and prerelease forms", () => {
  assert.equal(getReleaseChannel("0.2.0"), "stable");
  assert.equal(getReleaseChannel("0.3.0-alpha.1"), "alpha");
  assert.equal(getReleaseChannel("0.3.0-beta.2"), "beta");
  assert.equal(getReleaseChannel("0.3.0-rc.3"), "rc");
  assert.equal(getReleaseChannel("0.3.0-rc.3+build.7"), "rc");
});

test("release channels reject undocumented prerelease identifiers", () => {
  assert.throws(
    () => getReleaseChannel("0.3.0-preview.1"),
    /prerelease versions must use alpha\.N, beta\.N, or rc\.N/,
  );
});

test("prereleases use next and cannot replace npm latest", () => {
  assert.equal(requirePrereleaseNpmTagPolicy("0.3.0-alpha.1", "next"), "alpha");
  assert.equal(requirePrereleaseNpmTagPolicy("0.3.0", "latest"), "stable");
  assert.throws(
    () => requirePrereleaseNpmTagPolicy("0.3.0-rc.1", "latest"),
    /must use npm dist-tag "next"/,
  );
});
