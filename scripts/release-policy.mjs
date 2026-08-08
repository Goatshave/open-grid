import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release policy failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
const expectedTag = `open-grid-v${releaseVersion}`;
const releaseTag = args.tag ?? expectedTag;
const packageDirs = readdirSync(join(root, "packages"))
  .map((name) => join("packages", name))
  .filter((dir) => existsSync(join(root, dir, "package.json")))
  .sort();
const failures = [];

if (!isSemver(releaseVersion)) {
  failures.push(`release version must be a valid semver version; got ${JSON.stringify(releaseVersion)}`);
}

if (releaseTag !== expectedTag) {
  failures.push(`release tag must be ${JSON.stringify(expectedTag)}; got ${JSON.stringify(releaseTag)}`);
}

if (rootPackage.version !== releaseVersion && !args.version) {
  failures.push(`root package version ${JSON.stringify(rootPackage.version)} does not match release version ${JSON.stringify(releaseVersion)}`);
}

for (const packageDir of packageDirs) {
  const manifest = readJson(join(packageDir, "package.json"));

  if (manifest.version !== rootPackage.version) {
    failures.push(`${packageDir}: package version ${JSON.stringify(manifest.version)} does not match root version ${JSON.stringify(rootPackage.version)}`);
  }
}

const changelogPath = join(root, "CHANGELOG.md");
let changelogEntry;

if (!existsSync(changelogPath)) {
  failures.push("CHANGELOG.md is required before release");
} else {
  const changelog = readFileSync(changelogPath, "utf8");
  changelogEntry = findChangelogEntry(changelog, releaseVersion);

  if (!changelogEntry) {
    failures.push(`CHANGELOG.md must include a dated "## ${releaseVersion} - YYYY-MM-DD" section`);
  } else if (changelogEntry.body.trim().length === 0) {
    failures.push(`CHANGELOG.md section for ${releaseVersion} must not be empty`);
  }
}

const result = {
  version: releaseVersion,
  tag: releaseTag,
  changelogDate: changelogEntry?.date,
  packageCount: packageDirs.length,
};

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ ...result, failures }, null, 2));
  } else {
    console.error("Release policy failed:");
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
  console.log(`Release policy passed for ${releaseVersion}.`);
  console.log(`Tag: ${releaseTag}`);
  console.log(`Changelog date: ${changelogEntry.date}`);
  console.log(`Publishable packages: ${packageDirs.length}`);
}

function printFailureContext(result, writeLine) {
  writeLine(`Version: ${result.version}`);
  writeLine(`Tag: ${result.tag}`);
  writeLine(`Expected tag: ${expectedTag}`);
  writeLine(`Changelog date: ${result.changelogDate ?? "missing"}`);
  writeLine(`Package count: ${result.packageCount}`);
}

function parseArgs(argv) {
  const parsed = { json: false, tag: undefined, version: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
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

function findChangelogEntry(changelog, version) {
  const headingPattern = new RegExp(`^## ${escapeRegExp(version)} - (\\d{4}-\\d{2}-\\d{2})\\s*$`, "m");
  const match = headingPattern.exec(changelog);

  if (!match) {
    return undefined;
  }

  const bodyStart = match.index + match[0].length;
  const nextHeadingIndex = changelog.slice(bodyStart).search(/^## /m);
  const body = nextHeadingIndex === -1 ? changelog.slice(bodyStart) : changelog.slice(bodyStart, bodyStart + nextHeadingIndex);

  return { body, date: match[1] };
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}
