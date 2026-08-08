import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const confirmPhrase = "publish-open-grid";
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release publish failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
try {
  requireValidSemver(releaseVersion);
} catch (error) {
  console.error(`Release publish failed: ${error.message}`);
  process.exit(1);
}
const workspaceRoot = args.outDir ? undefined : mkdtempSync(join(tmpdir(), "open-grid-publish-"));
const outDir = resolve(root, args.outDir ?? join(workspaceRoot, "tarballs"));
const failures = [];
const publishResults = [];

try {
  const plan = readReleasePlan();

  if (failures.length === 0) {
    const stageResult = stageTarballs();

    if (failures.length === 0) {
      const tarballsByName = readTarballsByName(stageResult.tarballs);
      const publishQueue = [];

      for (const pkg of plan.publishOrder) {
        const tarball = tarballsByName.get(pkg.name);

        if (!tarball) {
          failures.push(`${pkg.name}: staged tarball is missing`);
          continue;
        }

        publishQueue.push({ pkg, tarball });
      }

      if (!args.dryRun || args.repositoryUrl) {
        validateActualPublishPrerequisites(publishQueue);
      }

      if (failures.length === 0) {
        for (const item of publishQueue) {
          publishResults.push(publishPackage(item.pkg, item.tarball));
        }
      }
    }
  }
} finally {
  if (!args.outDir && workspaceRoot) {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ version: releaseVersion, tag: args.tag, dryRun: args.dryRun, provenance: args.provenance, repositoryUrl: args.repositoryUrl, failures, publishResults }, null, 2));
  } else {
    console.error(args.dryRun ? "Release publish dry-run failed:" : "Release publish failed:");
    printFailureContext((line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify({ version: releaseVersion, tag: args.tag, dryRun: args.dryRun, provenance: args.provenance, repositoryUrl: args.repositoryUrl, publishResults }, null, 2));
} else {
  console.log(`${args.dryRun ? "Release publish dry-run" : "Release publish"} passed for ${publishResults.length} packages at ${releaseVersion}.`);
  console.log(`Tag: ${args.tag}`);
  if (args.repositoryUrl) {
    console.log(`Repository URL: ${args.repositoryUrl}`);
  }
  console.log(`Provenance flag: ${args.provenance ? "enabled" : "disabled"}`);
  console.log("");
  console.log("Publish order:");
  for (const [index, result] of publishResults.entries()) {
    console.log(`${index + 1}. ${result.name} (${result.filename})`);
  }
}

function printFailureContext(writeLine) {
  writeLine(`Version: ${releaseVersion}`);
  writeLine(`Tag: ${args.tag}`);
  if (args.repositoryUrl) {
    writeLine(`Repository URL: ${args.repositoryUrl}`);
  }
  writeLine(`Output directory: ${outDir}`);
  writeLine(`Dry run: ${args.dryRun ? "enabled" : "disabled"}`);
  writeLine(`Provenance flag: ${args.provenance ? "enabled" : "disabled"}`);
}

function parseArgs(argv) {
  const parsed = {
    confirm: undefined,
    dryRun: undefined,
    json: false,
    outDir: undefined,
    provenance: false,
    repositoryUrl: undefined,
    tag: "latest",
    version: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--provenance") {
      parsed.provenance = true;
    } else if (arg === "--confirm") {
      parsed.confirm = requireArgValue(argv, index, "--confirm");
      index += 1;
    } else if (arg?.startsWith("--confirm=")) {
      parsed.confirm = arg.slice("--confirm=".length);
      requireNonEmpty(parsed.confirm, "--confirm");
    } else if (arg === "--out-dir") {
      parsed.outDir = requireArgValue(argv, index, "--out-dir");
      index += 1;
    } else if (arg?.startsWith("--out-dir=")) {
      parsed.outDir = arg.slice("--out-dir=".length);
      requireNonEmpty(parsed.outDir, "--out-dir");
    } else if (arg === "--repository-url") {
      parsed.repositoryUrl = requireArgValue(argv, index, "--repository-url");
      index += 1;
    } else if (arg?.startsWith("--repository-url=")) {
      parsed.repositoryUrl = arg.slice("--repository-url=".length);
      requireNonEmpty(parsed.repositoryUrl, "--repository-url");
    } else if (arg === "--tag") {
      parsed.tag = requireArgValue(argv, index, "--tag");
      index += 1;
    } else if (arg?.startsWith("--tag=")) {
      parsed.tag = arg.slice("--tag=".length);
      requireNonEmpty(parsed.tag, "--tag");
    } else if (arg === "--version") {
      parsed.version = requireArgValue(argv, index, "--version");
      index += 1;
    } else if (arg?.startsWith("--version=")) {
      parsed.version = arg.slice("--version=".length);
      requireNonEmpty(parsed.version, "--version");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.confirm !== undefined && parsed.confirm !== confirmPhrase) {
    throw new Error(`--confirm must be ${JSON.stringify(confirmPhrase)} to run an actual publish`);
  }

  parsed.dryRun = parsed.dryRun ?? parsed.confirm !== confirmPhrase;

  requireValidNpmTag(parsed.tag);

  if (!parsed.dryRun) {
    requireNonEmpty(parsed.repositoryUrl, "--repository-url");

    if (!parsed.provenance) {
      throw new Error("--provenance is required to run an actual publish");
    }
  }

  return parsed;
}

function requireArgValue(argv, index, name) {
  const value = argv[index + 1];
  requireNonEmpty(value, name);
  return value;
}

function requireNonEmpty(value, name) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
}

function requireValidNpmTag(value) {
  if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value) || /^v?\d/.test(value)) {
    throw new Error(`--tag must be a valid npm dist-tag such as "latest", "next", or "beta"; got ${JSON.stringify(value)}`);
  }
}

function requireValidSemver(value) {
  if (!isSemver(value)) {
    throw new Error(`--version must be a valid semver version; got ${JSON.stringify(value)}`);
  }
}

function readReleasePlan() {
  let output;

  try {
    output = execFileSync("node", ["scripts/release-plan.mjs", "--version", releaseVersion, "--json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const plan = parseJsonErrorOutput(error);

    if (plan?.failures?.length > 0) {
      for (const failure of plan.failures) {
        failures.push(failure);
      }

      return plan;
    }

    failures.push(`release plan failed${formatCommandError(error)}`);
    return { publishOrder: [] };
  }

  const plan = JSON.parse(output);

  if (plan.failures?.length > 0) {
    for (const failure of plan.failures) {
      failures.push(failure);
    }
  }

  return plan;
}

function stageTarballs() {
  const existingTarballs = readExistingTarballPaths();

  if (existingTarballs.length > 0) {
    return { tarballs: existingTarballs.map((tarballPath) => ({ path: tarballPath })) };
  }

  let output;

  try {
    const command = ["scripts/release-stage.mjs", "--version", releaseVersion, "--out-dir", outDir, "--json"];

    if (args.repositoryUrl) {
      command.push("--repository-url", args.repositoryUrl);
    }

    output = execFileSync("node", command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stageResult = parseJsonErrorOutput(error);

    if (stageResult?.failures?.length > 0) {
      for (const failure of stageResult.failures) {
        failures.push(failure);
      }

      return stageResult;
    }

    failures.push(`release stage failed${formatCommandError(error)}`);
    return { tarballs: [] };
  }

  const stageResult = JSON.parse(output);

  if (stageResult.failures?.length > 0) {
    for (const failure of stageResult.failures) {
      failures.push(failure);
    }
  }

  return stageResult;
}

function readExistingTarballPaths() {
  if (!args.outDir || !existsSync(outDir)) {
    return [];
  }

  return readdirSync(outDir)
    .filter((filename) => filename.endsWith(".tgz"))
    .sort()
    .map((filename) => join(outDir, filename));
}

function readTarballsByName(tarballs) {
  const byName = new Map();
  const tarballPaths = new Set((tarballs ?? []).map((tarball) => tarball.path).filter(Boolean));

  if (tarballPaths.size === 0 && existsSync(outDir)) {
    for (const filename of readdirSync(outDir)) {
      if (filename.endsWith(".tgz")) {
        tarballPaths.add(join(outDir, filename));
      }
    }
  }

  for (const tarballPath of tarballPaths) {
    let manifest;

    try {
      const manifestOutput = execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      manifest = JSON.parse(manifestOutput);
    } catch (error) {
      failures.push(`${tarballPath}: could not read packed package manifest${formatCommandError(error)}`);
      continue;
    }

    byName.set(manifest.name, {
      manifest,
      name: manifest.name,
      version: manifest.version,
      filename: tarballPath.split("/").at(-1),
      path: tarballPath,
    });
  }

  return byName;
}

function validateActualPublishPrerequisites(publishQueue) {
  for (const { pkg, tarball } of publishQueue) {
    if (!tarball.manifest.repository) {
      failures.push(`${pkg.dir}: package repository metadata is required before trusted/provenance publishing`);
      continue;
    }

    if (args.repositoryUrl && getRepositoryUrl(tarball.manifest.repository) !== args.repositoryUrl) {
      failures.push(`${pkg.dir}: package repository URL must match --repository-url`);
    }

    if (tarball.manifest.repository?.directory !== pkg.dir) {
      failures.push(`${pkg.dir}: package repository directory must match source package directory`);
    }
  }
}

function publishPackage(pkg, tarball) {
  const command = ["publish"];

  if (args.dryRun) {
    command.push("--dry-run");
  }

  command.push("--access", "public", "--tag", args.tag);

  if (args.provenance) {
    command.push("--provenance");
  }

  command.push(tarball.path);

  try {
    const output = execFileSync("npm", command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return {
      name: pkg.name,
      version: pkg.version,
      filename: tarball.filename,
      dryRun: args.dryRun,
      command: `npm ${command.map(shellQuote).join(" ")}`,
      output: output.trim(),
    };
  } catch (error) {
    failures.push(`${pkg.name}: npm publish${args.dryRun ? " dry-run" : ""} failed${formatCommandError(error)}`);
    return {
      name: pkg.name,
      version: pkg.version,
      filename: tarball.filename,
      dryRun: args.dryRun,
      command: `npm ${command.map(shellQuote).join(" ")}`,
    };
  }
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function getRepositoryUrl(repository) {
  if (typeof repository === "string") {
    return repository;
  }

  return repository?.url;
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function formatCommandError(error) {
  const stderr = error?.stderr?.toString().trim();
  return stderr ? `: ${stderr}` : "";
}

function parseJsonErrorOutput(error) {
  const stdout = error?.stdout?.toString().trim();

  if (!stdout) {
    return undefined;
  }

  try {
    return JSON.parse(stdout);
  } catch {
    return undefined;
  }
}
