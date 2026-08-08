import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release stage failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
const workspaceRoot = mkdtempSync(join(tmpdir(), "open-grid-release-"));
const stageRoot = join(workspaceRoot, "stage");
const packRoot = args.outDir ? resolve(root, args.outDir) : join(workspaceRoot, "tarballs");
const packageDirs = readdirSync(join(root, "packages"))
  .map((name) => join("packages", name))
  .filter((dir) => existsSync(join(root, dir, "package.json")))
  .sort();
const packages = packageDirs.map((dir) => ({ dir, manifest: readJson(join(dir, "package.json")) }));
const packageByName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
const packageMetadataFiles = ["LICENSE", "README.md"];
const failures = [];
const tarballs = [];

try {
  validateInputs();

  if (failures.length === 0) {
    mkdirSync(stageRoot, { recursive: true });
    preparePackRoot();

    if (failures.length === 0) {
      for (const pkg of packages) {
        const stagedPackageDir = stagePackage(pkg);
        const packResult = packStagedPackage(pkg, stagedPackageDir);

        if (packResult) {
          tarballs.push(packResult);
        }
      }
    }
  }
} finally {
  if (!args.outDir) {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ version: releaseVersion, repositoryUrl: args.repositoryUrl, tarballCount: tarballs.length, tarballs, failures }, null, 2));
  } else {
    console.error("Release stage failed:");
    printFailureContext((line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify({ version: releaseVersion, repositoryUrl: args.repositoryUrl, tarballCount: tarballs.length, tarballs }, null, 2));
} else {
  console.log(`Release stage passed for ${tarballs.length} packages at ${releaseVersion}.`);
  if (args.outDir) {
    console.log(`Tarballs written to ${packRoot}`);
  } else {
    console.log("Tarballs were created in a temporary directory and removed after validation.");
  }
}

function printFailureContext(writeLine) {
  writeLine(`Version: ${releaseVersion}`);
  if (args.repositoryUrl) {
    writeLine(`Repository URL: ${args.repositoryUrl}`);
  }
  writeLine(`Output directory: ${args.outDir ? packRoot : "temporary (removed after validation)"}`);
  writeLine(`Package count: ${packages.length}`);
}

function parseArgs(argv) {
  const parsed = { json: false, outDir: undefined, repositoryUrl: undefined, version: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
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

function validateInputs() {
  if (!isSemver(releaseVersion)) {
    failures.push(`release version must be a valid semver version; got ${JSON.stringify(releaseVersion)}`);
  }

  for (const pkg of packages) {
    if (!pkg.manifest.name) {
      failures.push(`${pkg.dir}: package name is required`);
    }
    if (pkg.manifest.private === true) {
      failures.push(`${pkg.dir}: publishable package must not be private`);
    }
    if (!existsSync(join(root, pkg.dir, "dist"))) {
      failures.push(`${pkg.dir}: dist directory must exist; run pnpm build first`);
    }
    for (const fileName of packageMetadataFiles) {
      if (!existsSync(join(root, pkg.dir, fileName))) {
        failures.push(`${pkg.dir}: ${fileName} is required in staged release artifacts`);
      }
    }
  }
}

function preparePackRoot() {
  if (args.outDir && existsSync(packRoot) && readdirSync(packRoot).length > 0) {
    failures.push(`${args.outDir}: output directory must be empty or absent`);
    return;
  }

  mkdirSync(packRoot, { recursive: true });
}

function stagePackage(pkg) {
  const stagedPackageDir = join(stageRoot, packageDirectoryName(pkg.manifest.name));
  const stagedManifest = rewriteManifestForPublish(pkg.manifest);

  mkdirSync(stagedPackageDir, { recursive: true });
  cpSync(join(root, pkg.dir, "dist"), join(stagedPackageDir, "dist"), { recursive: true });
  for (const fileName of packageMetadataFiles) {
    cpSync(join(root, pkg.dir, fileName), join(stagedPackageDir, fileName));
  }
  writeFileSync(join(stagedPackageDir, "package.json"), `${JSON.stringify(stagedManifest, null, 2)}\n`);
  verifyStagedManifest(pkg, stagedPackageDir, stagedManifest);

  return stagedPackageDir;
}

function packStagedPackage(pkg, stagedPackageDir) {
  let packOutput;

  try {
    packOutput = execFileSync("npm", ["pack", "--json", stagedPackageDir, "--pack-destination", packRoot], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    failures.push(`${pkg.dir}: npm pack failed${formatCommandError(error)}`);
    return undefined;
  }

  let packResults;

  try {
    packResults = JSON.parse(packOutput);
  } catch {
    failures.push(`${pkg.dir}: npm pack did not return JSON`);
    return undefined;
  }

  const packResult = packResults[0];
  const tarballPath = join(packRoot, packResult.filename);
  const packedFiles = new Set(packResult.files?.map((file) => file.path) ?? []);

  requireValue(packResult.name === pkg.manifest.name, pkg.dir, "packed package name should match source manifest name");
  requireValue(packResult.version === releaseVersion, pkg.dir, "packed package version should match release version");
  requireValue(packedFiles.has("package.json"), pkg.dir, "packed artifact must include package.json");
  for (const fileName of packageMetadataFiles) {
    requireValue(packedFiles.has(fileName), pkg.dir, `packed artifact must include ${fileName}`);
  }

  for (const filePath of packedFiles) {
    requireValue(filePath === "package.json" || packageMetadataFiles.includes(filePath) || filePath.startsWith("dist/"), pkg.dir, `packed artifact includes unexpected file ${JSON.stringify(filePath)}`);
  }

  verifyPackedManifest(pkg, tarballPath);

  return {
    name: packResult.name,
    version: packResult.version,
    filename: packResult.filename,
    path: args.outDir ? tarballPath : undefined,
    files: packResult.files?.map((file) => file.path).sort() ?? [],
  };
}

function rewriteManifestForPublish(manifest) {
  const rewritten = JSON.parse(JSON.stringify(manifest));

  rewritten.version = releaseVersion;

  if (args.repositoryUrl) {
    rewritten.repository = {
      type: "git",
      url: args.repositoryUrl,
      directory: packageByName.get(manifest.name)?.dir,
    };
  }

  for (const field of dependencyFields()) {
    for (const [dependencyName, range] of Object.entries(rewritten[field] ?? {})) {
      if (packageByName.has(dependencyName) && typeof range === "string" && range.startsWith("workspace:")) {
        rewritten[field][dependencyName] = releaseVersion;
      }
    }
  }

  return rewritten;
}

function verifyStagedManifest(pkg, stagedPackageDir, manifest) {
  requireValue(manifest.version === releaseVersion, pkg.dir, "staged package version should match release version");
  requireValue(!manifestHasWorkspaceRanges(manifest), pkg.dir, "staged package manifest must not contain workspace: dependency ranges");

  for (const exportTarget of collectExportTargets(manifest.exports)) {
    requireValue(existsSync(join(stagedPackageDir, exportTarget)), pkg.dir, `staged package is missing exported file ${JSON.stringify(exportTarget)}`);
  }
}

function verifyPackedManifest(pkg, tarballPath) {
  let manifestOutput;

  try {
    manifestOutput = execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    failures.push(`${pkg.dir}: could not read package.json from packed tarball${formatCommandError(error)}`);
    return;
  }

  let packedManifest;

  try {
    packedManifest = JSON.parse(manifestOutput);
  } catch {
    failures.push(`${pkg.dir}: packed package.json is not valid JSON`);
    return;
  }

  requireValue(packedManifest.version === releaseVersion, pkg.dir, "packed package.json version should match release version");
  requireValue(!manifestHasWorkspaceRanges(packedManifest), pkg.dir, "packed package.json must not contain workspace: dependency ranges");

  if (args.repositoryUrl) {
    requireValue(getRepositoryUrl(packedManifest.repository) === args.repositoryUrl, pkg.dir, "packed package.json repository URL should match --repository-url");
    requireValue(packedManifest.repository?.directory === pkg.dir, pkg.dir, "packed package.json repository directory should match source package directory");
  }
}

function getRepositoryUrl(repository) {
  if (typeof repository === "string") {
    return repository;
  }

  return repository?.url;
}

function collectExportTargets(value, targets = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("./dist/")) {
      targets.add(value.slice(2));
    }
    return targets;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectExportTargets(item, targets);
    }
    return targets;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectExportTargets(item, targets);
    }
  }

  return targets;
}

function manifestHasWorkspaceRanges(manifest) {
  for (const field of dependencyFields()) {
    for (const range of Object.values(manifest[field] ?? {})) {
      if (typeof range === "string" && range.startsWith("workspace:")) {
        return true;
      }
    }
  }

  return false;
}

function dependencyFields() {
  return ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"];
}

function packageDirectoryName(packageName) {
  return packageName.replace("@", "").replace("/", "-");
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function requireValue(condition, packageDir, message) {
  if (!condition) {
    failures.push(`${packageDir}: ${message}`);
  }
}

function formatCommandError(error) {
  const stderr = error?.stderr?.toString().trim();
  return stderr ? `: ${stderr}` : "";
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}
