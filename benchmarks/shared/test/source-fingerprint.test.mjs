import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createBenchmarkSourceFingerprint } from "../source-fingerprint.mjs";

test("fingerprints tracked and untracked source while excluding ignored artifacts", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "open-grid-source-fingerprint-"));
  try {
    git(directory, "init");
    writeFileSync(path.join(directory, ".gitignore"), "dist/\n");
    writeFileSync(path.join(directory, "tracked.txt"), "tracked-v1\n");
    writeFileSync(path.join(directory, "untracked.txt"), "untracked-v1\n");
    mkdirSync(path.join(directory, "dist"));
    writeFileSync(path.join(directory, "dist", "result.json"), "ignored-v1\n");
    git(directory, "add", ".gitignore", "tracked.txt");

    const initial = createBenchmarkSourceFingerprint(directory);
    assert.match(initial, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(createBenchmarkSourceFingerprint(directory), initial);

    writeFileSync(path.join(directory, "dist", "result.json"), "ignored-v2\n");
    assert.equal(createBenchmarkSourceFingerprint(directory), initial);

    writeFileSync(path.join(directory, "untracked.txt"), "untracked-v2\n");
    const untrackedChanged = createBenchmarkSourceFingerprint(directory);
    assert.notEqual(untrackedChanged, initial);

    writeFileSync(path.join(directory, "tracked.txt"), "tracked-v2\n");
    const trackedChanged = createBenchmarkSourceFingerprint(directory);
    assert.notEqual(trackedChanged, untrackedChanged);

    unlinkSync(path.join(directory, "tracked.txt"));
    assert.notEqual(createBenchmarkSourceFingerprint(directory), trackedChanged);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function git(directory, ...args) {
  execFileSync("git", args, { cwd: directory, stdio: "ignore" });
}
