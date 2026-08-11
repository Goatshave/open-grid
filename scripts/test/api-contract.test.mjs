import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const scriptPath = resolve("scripts/api-contract.mjs");

test("API contracts detect removed typed exports, CSS exports, and stale declaration snapshots", () => {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-api-contract-"));
  const packageDirectory = join(workspace, "packages", "example");

  try {
    mkdirSync(join(packageDirectory, "dist"), { recursive: true });
    writeManifest(packageDirectory, {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      "./css": "./dist/index.css",
    });
    writeFileSync(join(packageDirectory, "dist", "index.d.ts"), "export interface Example { value: string }\n");

    assert.equal(run(workspace, "--write").status, 0);
    assert.equal(run(workspace).status, 0);
    const exportsContract = JSON.parse(readFileSync(join(workspace, "api-contract", "exports.json"), "utf8"));
    assert.deepEqual(Object.keys(exportsContract.packages[0].exports), [".", "./css"]);

    writeManifest(packageDirectory, { "./css": "./dist/index.css" });
    const removedTypedExport = run(workspace);
    assert.equal(removedTypedExport.status, 1);
    assert.match(removedTypedExport.stderr, /public package exports differ/);
    assert.match(removedTypedExport.stderr, /stale API snapshot/);

    writeManifest(packageDirectory, {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    });
    const removedCssExport = run(workspace);
    assert.equal(removedCssExport.status, 1);
    assert.match(removedCssExport.stderr, /public package exports differ/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function run(workspace, ...args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd: workspace, encoding: "utf8" });
}

function writeManifest(directory, exportsMap) {
  writeFileSync(join(directory, "package.json"), `${JSON.stringify({ name: "@open-grid/example", exports: exportsMap }, null, 2)}\n`);
}
