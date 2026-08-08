import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release publish dry-run failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
try {
  requireValidSemver(releaseVersion);
} catch (error) {
  console.error(`Release publish dry-run failed: ${error.message}`);
  process.exit(1);
}
const workspaceRoot = args.outDir ? undefined : mkdtempSync(join(tmpdir(), "open-grid-publish-dry-run-"));
const outDir = resolve(root, args.outDir ?? join(workspaceRoot, "tarballs"));
const failures = [];
const publishResults = [];

try {
  const plan = readReleasePlan();

  if (failures.length === 0) {
    const stageResult = stageTarballs();

    if (failures.length === 0) {
      const tarballsByName = readTarballsByName(stageResult.tarballs);

      for (const pkg of plan.publishOrder) {
        const tarball = tarballsByName.get(pkg.name);

        if (!tarball) {
          failures.push(`${pkg.name}: staged tarball is missing`);
          continue;
        }

        publishResults.push(publishDryRun(pkg, tarball));
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
    console.log(JSON.stringify({ version: releaseVersion, tag: args.tag, repositoryUrl: args.repositoryUrl, failures, publishResults }, null, 2));
  } else if (args.markdown) {
    printMarkdownReport({ failures, publishResults });
  } else {
    console.error("Release publish dry-run failed:");
    printFailureContext((line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify({ version: releaseVersion, tag: args.tag, provenance: args.provenance, repositoryUrl: args.repositoryUrl, publishResults }, null, 2));
} else if (args.markdown) {
  printMarkdownReport({ publishResults });
} else {
  console.log(`Release publish dry-run passed for ${publishResults.length} packages at ${releaseVersion}.`);
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
  writeLine(`Provenance flag: ${args.provenance ? "enabled" : "disabled"}`);
}

function printMarkdownReport(report) {
  console.log("# Publish Dry Run Report");
  console.log("");
  console.log(`- Version: ${releaseVersion}`);
  console.log(`- npm tag: ${args.tag}`);
  console.log(`- Repository URL: ${args.repositoryUrl ?? "(not supplied)"}`);
  console.log(`- Output directory: ${outDir}`);
  console.log(`- Provenance flag: ${args.provenance ? "enabled" : "disabled"}`);
  console.log(`- Result: ${report.failures?.length > 0 ? "blocked" : "passed"}`);
  console.log(`- Publish result count: ${report.publishResults.length}`);

  if (report.failures?.length > 0) {
    console.log("");
    console.log("## Failures");
    console.log("");
    for (const failure of report.failures) {
      console.log(`- [ ] ${failure}`);
    }
  }

  console.log("");
  console.log("## Publish Dry Run Order");
  console.log("");
  if (report.publishResults.length === 0) {
    console.log("- [ ] No publish dry-run commands were executed.");
  } else {
    for (const [index, result] of report.publishResults.entries()) {
      console.log(`- [${report.failures?.length > 0 ? " " : "x"}] ${index + 1}. \`${result.name}\` \`${result.version}\` from \`${result.filename}\``);
      if (result.command) {
        console.log(`  - Command: \`${result.command}\``);
      }
    }
  }
}

function parseArgs(argv) {
  const parsed = { json: false, markdown: false, outDir: undefined, provenance: false, repositoryUrl: undefined, tag: "latest", version: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
    } else if (arg === "--provenance") {
      parsed.provenance = true;
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

  requireValidNpmTag(parsed.tag);

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

function publishDryRun(pkg, tarball) {
  const failureCount = failures.length;

  validateRepositoryMetadata(pkg, tarball);

  if (failures.length > failureCount) {
    return {
      name: pkg.name,
      version: pkg.version,
      filename: tarball.filename,
    };
  }

  const command = ["publish", "--dry-run", "--access", "public", "--tag", args.tag];

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
      command: `npm ${command.map(shellQuote).join(" ")}`,
      output: output.trim(),
    };
  } catch (error) {
    failures.push(`${pkg.name}: npm publish dry-run failed${formatCommandError(error)}`);
    return {
      name: pkg.name,
      version: pkg.version,
      filename: tarball.filename,
      command: `npm ${command.map(shellQuote).join(" ")}`,
    };
  }
}

function validateRepositoryMetadata(pkg, tarball) {
  if (!args.repositoryUrl) {
    return;
  }

  if (!tarball.manifest.repository) {
    failures.push(`${pkg.dir}: package repository metadata is required before repository-verified dry-run`);
    return;
  }

  if (getRepositoryUrl(tarball.manifest.repository) !== args.repositoryUrl) {
    failures.push(`${pkg.dir}: package repository URL must match --repository-url`);
  }

  if (tarball.manifest.repository?.directory !== pkg.dir) {
    failures.push(`${pkg.dir}: package repository directory must match source package directory`);
  }
}

function getRepositoryUrl(repository) {
  if (typeof repository === "string") {
    return repository;
  }

  return repository?.url;
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
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
