import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const packageDocumentationBase = "https://goatshave.github.io/open-grid";
const packageBugsUrl = "https://github.com/Goatshave/open-grid/issues";
const expectedPackageManager = "pnpm@9.15.0";
const expectedNodeEngine = ">=22.0.0";
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release readiness check failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const publishablePackageDirs = readdirSync(join(root, "packages"))
  .map((name) => join("packages", name))
  .filter((dir) => existsSync(join(root, dir, "package.json")))
  .sort();
const examplePackageDirs = readdirSync(join(root, "examples"))
  .map((name) => join("examples", name))
  .filter((dir) => existsSync(join(root, dir, "package.json")))
  .sort();

const failures = [];
let packDryRunCount = 0;

requireEqual(rootPackage.private, true, "root", "workspace root must stay private");
requireEqual(rootPackage.packageManager, expectedPackageManager, "root", "packageManager should pin the release pnpm version");
requireEqual(rootPackage.engines?.node, expectedNodeEngine, "root", "engines.node should match the release Node runtime");

for (const packageDir of publishablePackageDirs) {
  const manifest = readJson(join(packageDir, "package.json"));
  const distDir = join(root, packageDir, "dist");

  requireField(manifest, "name", packageDir);
  requireField(manifest, "version", packageDir);
  requireField(manifest, "description", packageDir);
  requireArrayIncludes(manifest.keywords, "data-grid", packageDir, "keywords should include data-grid");
  requireArrayIncludes(manifest.keywords, "grid", packageDir, "keywords should include grid");
  requireArrayIncludes(manifest.keywords, "table", packageDir, "keywords should include table");
  requireEqual(
    manifest.homepage,
    expectedPackageHomepage(manifest.name),
    packageDir,
    "homepage should point to the public package documentation",
  );
  requireEqual(manifest.bugs?.url, packageBugsUrl, packageDir, "bugs.url should point to the public issue tracker");
  requireEqual(manifest.publishConfig?.access, "public", packageDir, "publishConfig.access should be public");
  requireEqual(manifest.version, rootPackage.version, packageDir, "version should match the workspace release version");
  requireEqual(manifest.license, "MIT", packageDir, "license should be MIT");
  requireEqual(manifest.type, "module", packageDir, "type should be module");
  requireValue(manifest.private !== true, packageDir, "publishable packages must not be private");
  requireValue(Boolean(manifest.exports), packageDir, "exports map is required");
  verifyExportTypes(manifest.exports, packageDir);
  requireArrayIncludes(manifest.files, "dist", packageDir, "files should include dist");
  requireArrayIncludes(manifest.files, "LICENSE", packageDir, "files should include LICENSE");
  requireValue(Object.prototype.hasOwnProperty.call(manifest, "sideEffects"), packageDir, "sideEffects must be explicit");
  requireValue(existsSync(join(root, packageDir, "LICENSE")), packageDir, "LICENSE is required for npm package licensing");
  const readmePath = join(root, packageDir, "README.md");
  requireValue(existsSync(readmePath), packageDir, "README.md is required for npm package documentation");
  if (existsSync(readmePath)) {
    verifyPackageReadme(readFileSync(readmePath, "utf8"), manifest, packageDir);
  }
  requireValue(Boolean(manifest.scripts?.build), packageDir, "build script is required");
  requireValue(Boolean(manifest.scripts?.check), packageDir, "check script is required");
  requireValue(Boolean(manifest.scripts?.test), packageDir, "test script is required");
  requireValue(Boolean(manifest.scripts?.lint), packageDir, "lint script is required");
  requireValue(existsSync(distDir) && statSync(distDir).isDirectory(), packageDir, "dist directory must exist; run pnpm build first");
  verifyPackDryRun(packageDir, manifest);
}

const result = {
  rootVersion: rootPackage.version,
  rootPackageManager: rootPackage.packageManager,
  rootNodeEngine: rootPackage.engines?.node,
  publishablePackageCount: publishablePackageDirs.length,
  examplePackageCount: examplePackageDirs.length,
  packDryRunCount,
};

for (const exampleDir of examplePackageDirs) {
  const manifest = readJson(join(exampleDir, "package.json"));

  requireEqual(manifest.private, true, exampleDir, "example packages must stay private");
  requireValue(Boolean(manifest.scripts?.build), exampleDir, "example build script is required");
}

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ ...result, failures }, null, 2));
  } else {
    console.error("Release readiness check failed:");
    printFailureContext(result, (line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Release readiness check passed for ${publishablePackageDirs.length} packages and ${examplePackageDirs.length} examples, including ${packDryRunCount} npm pack dry-runs.`);
}

function printFailureContext(result, writeLine) {
  writeLine(`Root version: ${result.rootVersion}`);
  writeLine(`Root package manager: ${result.rootPackageManager ?? "(missing)"}`);
  writeLine(`Root Node engine: ${result.rootNodeEngine ?? "(missing)"}`);
  writeLine(`Publishable packages: ${result.publishablePackageCount}`);
  writeLine(`Example packages: ${result.examplePackageCount}`);
  writeLine(`npm pack dry-runs completed: ${result.packDryRunCount}`);
}

function expectedPackageHomepage(packageName) {
  const routeByPackage = {
    "@open-grid/react-ui": "react-ui",
    "@open-grid/vue-ui": "vue-ui",
    "@open-grid/svelte-ui": "svelte-ui",
  };
  const route = routeByPackage[packageName];
  if (route) return `${packageDocumentationBase}/${route}`;
  const packageId = packageName?.replace("@open-grid/", "");
  return `${packageDocumentationBase}/packages#${packageId}`;
}

function parseArgs(argv) {
  const parsed = { json: false };

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function verifyPackDryRun(packageDir, manifest) {
  let packOutput;

  try {
    packOutput = execFileSync("npm", ["pack", "--dry-run", "--json", `./${packageDir}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    failures.push(`${packageDir}: npm pack dry-run failed${formatCommandError(error)}`);
    return;
  }

  let packResults;

  try {
    packResults = JSON.parse(packOutput);
  } catch {
    failures.push(`${packageDir}: npm pack dry-run did not return JSON`);
    return;
  }

  const packResult = packResults[0];
  const packedFiles = new Set(packResult?.files?.map((file) => file.path) ?? []);

  requireEqual(packResult?.name, manifest.name, packageDir, "pack dry-run package name should match manifest name");
  requireEqual(packResult?.version, manifest.version, packageDir, "pack dry-run package version should match manifest version");
  requireValue(packedFiles.has("package.json"), packageDir, "pack dry-run must include package.json");
  requireValue(packedFiles.has("LICENSE"), packageDir, "pack dry-run must include LICENSE");
  requireValue(packedFiles.has("README.md"), packageDir, "pack dry-run must include README.md");

  for (const filePath of packedFiles) {
    requireValue(filePath === "package.json" || filePath === "LICENSE" || filePath === "README.md" || filePath.startsWith("dist/"), packageDir, `pack dry-run includes unexpected file ${JSON.stringify(filePath)}`);
  }

  for (const exportTarget of collectExportTargets(manifest.exports)) {
    requireValue(packedFiles.has(exportTarget), packageDir, `pack dry-run is missing exported file ${JSON.stringify(exportTarget)}`);
  }

  packDryRunCount += 1;
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

function verifyPackageReadme(readme, manifest, packageDir) {
  requireValue(readme.includes(`# ${manifest.name}`), packageDir, `README.md must identify ${manifest.name} in its title`);
  requireValue(readme.includes(`npm install ${manifest.name}`), packageDir, `README.md must include an npm install command for ${manifest.name}`);
}

function verifyExportTypes(value, packageDir, exportPath = ".") {
  if (typeof value === "string") {
    if (value.endsWith(".js")) {
      failures.push(`${packageDir}: JS export ${JSON.stringify(exportPath)} must declare types and import conditions`);
    }
    return;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  const isConditionMap = Object.prototype.hasOwnProperty.call(value, "import") || Object.prototype.hasOwnProperty.call(value, "types");

  if (isConditionMap) {
    const importTarget = value.import;

    if (typeof importTarget === "string" && importTarget.endsWith(".js")) {
      requireValue(typeof value.types === "string" && value.types.endsWith(".d.ts"), packageDir, `JS export ${JSON.stringify(exportPath)} must declare a .d.ts types condition`);
    }
    return;
  }

  for (const [subpath, entry] of Object.entries(value)) {
    verifyExportTypes(entry, packageDir, subpath);
  }
}

function formatCommandError(error) {
  const stderr = error?.stderr?.toString().trim();
  return stderr ? `: ${stderr}` : "";
}

function requireField(manifest, field, packageDir) {
  requireValue(Boolean(manifest[field]), packageDir, `${field} is required`);
}

function requireEqual(actual, expected, packageDir, message) {
  requireValue(actual === expected, packageDir, `${message}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function requireArrayIncludes(value, expectedItem, packageDir, message) {
  requireValue(Array.isArray(value) && value.includes(expectedItem), packageDir, message);
}

function requireValue(condition, packageDir, message) {
  if (!condition) {
    failures.push(`${packageDir}: ${message}`);
  }
}
