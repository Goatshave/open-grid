import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePaths = [
  "package.json",
  "pnpm-lock.yaml",
  "playwright.config.ts",
  "playwright.smoke.config.ts",
  "packages",
  "examples/react-basic",
  "examples/vue-grouped",
  "examples/svelte-grouped",
  "e2e",
  "scripts/ui-smoke-preview.mjs",
  "scripts/ui-smoke-report-check.mjs",
  "scripts/ui-smoke-review.mjs",
  "scripts/ui-smoke-source-state.mjs",
  "scripts/ui-smoke-targets.mjs",
];

export function getUiSmokeSourceState() {
  const files = runGit([
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ...sourcePaths,
  ])
    .split("\0")
    .filter(Boolean)
    .sort();
  const fingerprint = createHash("sha256");

  for (const file of files) {
    const absolutePath = resolve(repositoryRoot, file);
    fingerprint.update(file);
    fingerprint.update("\0");
    fingerprint.update(existsSync(absolutePath) ? readFileSync(absolutePath) : "<deleted>");
    fingerprint.update("\0");
  }

  const rootPackage = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
  const dirtyOutput = runGit([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...sourcePaths,
  ]);

  return {
    revision: runGit(["rev-parse", "HEAD"]).trim(),
    workspaceVersion: rootPackage.version,
    fingerprint: `sha256:${fingerprint.digest("hex")}`,
    dirty: dirtyOutput.trim().length > 0,
    fileCount: files.length,
  };
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}
