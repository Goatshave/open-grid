import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";

export const BENCHMARK_SOURCE_FINGERPRINT_SCHEMA_VERSION = 1;

export function createBenchmarkSourceFingerprint(rootDirectory = process.cwd()) {
  const root = resolve(rootDirectory);
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
  );
  const paths = output.toString("utf8").split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  hash.update(`open-grid-benchmark-source-v${BENCHMARK_SOURCE_FINGERPRINT_SCHEMA_VERSION}\0`);

  for (const relativePath of paths) {
    hash.update(relativePath);
    hash.update("\0");
    const absolutePath = resolve(root, relativePath);
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      hash.update("deleted\0");
      continue;
    }

    if (stats.isSymbolicLink()) {
      hash.update("symlink\0");
      hash.update(readlinkSync(absolutePath));
      hash.update("\0");
      continue;
    }
    if (!stats.isFile()) {
      hash.update("other\0");
      continue;
    }

    hash.update(stats.mode & 0o111 ? "executable\0" : "file\0");
    hash.update(readFileSync(absolutePath));
    hash.update("\0");
  }

  return `sha256:${hash.digest("hex")}`;
}
