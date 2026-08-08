import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { releaseWorkflowUiGates } from "./release-ui-gates.mjs";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release plan failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
const packageDirs = readdirSync(join(root, "packages"))
  .map((name) => join("packages", name))
  .filter((dir) => existsSync(join(root, dir, "package.json")))
  .sort();
const packages = packageDirs.map((dir) => ({ dir, manifest: readJson(join(dir, "package.json")) }));
const packageByName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
const failures = [];

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
  if (pkg.manifest.version !== rootPackage.version) {
    failures.push(`${pkg.dir}: package version ${JSON.stringify(pkg.manifest.version)} does not match root version ${JSON.stringify(rootPackage.version)}`);
  }
}

const publishOrder = resolvePublishOrder(packages, packageByName, failures);
const workspaceDependencyRewrites = collectWorkspaceDependencyRewrites(packages, packageByName);
const plan = {
  version: releaseVersion,
  rootVersion: rootPackage.version,
  packageCount: packages.length,
  publishOrder: publishOrder.map((pkg) => ({
    name: pkg.manifest.name,
    dir: pkg.dir,
    version: releaseVersion,
  })),
  workspaceDependencyRewrites,
  gates: [
    "pnpm check",
    "pnpm test",
    "pnpm build",
    "pnpm build:examples",
    "pnpm release:policy",
    "pnpm release:check",
    "pnpm release:stage",
    "pnpm release:publish-dry-run",
    "pnpm release:github-push-preflight -- --repository-url <public-git-url>",
    "pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth",
    "pnpm release:trusted-publishing -- --repository-url <public-git-url>",
    "pnpm release:first-publish-preflight -- --repository-url <public-git-url>",
    ...releaseWorkflowUiGates,
  ],
};

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ ...plan, failures }, null, 2));
  } else if (args.markdown) {
    printMarkdownPlan({ ...plan, failures });
  } else {
    console.error("Release plan failed:");
    printFailureContext(plan, (line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify(plan, null, 2));
} else if (args.markdown) {
  printMarkdownPlan(plan);
} else {
  printPlan(plan);
}

function printFailureContext(plan, writeLine) {
  writeLine(`Version: ${plan.version}`);
  writeLine(`Root version: ${plan.rootVersion}`);
  writeLine(`Package count: ${plan.packageCount}`);
  writeLine(`Publish order count: ${plan.publishOrder.length}`);
  writeLine(`Prepublish gate count: ${plan.gates.length}`);
  writeLine(`Workspace dependency rewrite count: ${plan.workspaceDependencyRewrites.length}`);
}

function parseArgs(argv) {
  const parsed = { json: false, markdown: false, version: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
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

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function resolvePublishOrder(packageList, lookup, errors) {
  const visited = new Set();
  const visiting = new Set();
  const sorted = [];

  for (const pkg of packageList) {
    visit(pkg);
  }

  return sorted;

  function visit(pkg) {
    const name = pkg.manifest.name;

    if (visited.has(name)) {
      return;
    }
    if (visiting.has(name)) {
      errors.push(`${pkg.dir}: internal package dependency cycle detected at ${name}`);
      return;
    }

    visiting.add(name);

    for (const dependencyName of getInternalDependencies(pkg.manifest, lookup)) {
      visit(lookup.get(dependencyName));
    }

    visiting.delete(name);
    visited.add(name);
    sorted.push(pkg);
  }
}

function getInternalDependencies(manifest, lookup) {
  const dependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];
  const dependencies = new Set();

  for (const field of dependencyFields) {
    for (const dependencyName of Object.keys(manifest[field] ?? {})) {
      if (lookup.has(dependencyName)) {
        dependencies.add(dependencyName);
      }
    }
  }

  return [...dependencies].sort();
}

function collectWorkspaceDependencyRewrites(packageList, lookup) {
  const dependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];
  const rewrites = [];

  for (const pkg of packageList) {
    for (const field of dependencyFields) {
      for (const [dependencyName, range] of Object.entries(pkg.manifest[field] ?? {})) {
        if (lookup.has(dependencyName) && typeof range === "string" && range.startsWith("workspace:")) {
          rewrites.push({
            package: pkg.manifest.name,
            dir: pkg.dir,
            field,
            dependency: dependencyName,
            currentRange: range,
          });
        }
      }
    }
  }

  return rewrites;
}

function printPlan(plan) {
  console.log(`Open Grid release plan for ${plan.version}`);
  console.log("");
  console.log(`Publishable packages: ${plan.packageCount}`);
  console.log("");
  console.log("Publish order:");

  for (const [index, pkg] of plan.publishOrder.entries()) {
    console.log(`${index + 1}. ${pkg.name} (${pkg.dir})`);
  }

  console.log("");
  console.log("Prepublish gates:");

  for (const gate of plan.gates) {
    console.log(`- ${gate}`);
  }

  console.log("");
  console.log("Workspace dependency rewrites required before publish:");

  if (plan.workspaceDependencyRewrites.length === 0) {
    console.log("- none");
  } else {
    for (const rewrite of plan.workspaceDependencyRewrites) {
      console.log(`- ${rewrite.package} ${rewrite.field}.${rewrite.dependency}: ${rewrite.currentRange} -> ${plan.version}`);
    }
  }
}

function printMarkdownPlan(plan) {
  console.log("# Release Plan");
  console.log("");
  console.log(`- Version: ${plan.version}`);
  console.log(`- Root version: ${plan.rootVersion}`);
  console.log(`- Publishable packages: ${plan.packageCount}`);
  console.log(`- Publish order count: ${plan.publishOrder.length}`);
  console.log(`- Prepublish gate count: ${plan.gates.length}`);
  console.log(`- Workspace dependency rewrite count: ${plan.workspaceDependencyRewrites.length}`);
  console.log(`- Result: ${plan.failures?.length > 0 ? "blocked" : "ready"}`);

  if (plan.failures?.length > 0) {
    console.log("");
    console.log("## Failures");
    console.log("");
    for (const failure of plan.failures) {
      console.log(`- [ ] ${failure}`);
    }
  }

  console.log("");
  console.log("## Publish Order");
  console.log("");
  for (const [index, pkg] of plan.publishOrder.entries()) {
    console.log(`- [ ] ${index + 1}. \`${pkg.name}\` from \`${pkg.dir}\` at \`${pkg.version}\``);
  }

  console.log("");
  console.log("## Prepublish Gates");
  console.log("");
  for (const gate of plan.gates) {
    console.log(`- [ ] \`${gate}\``);
  }

  console.log("");
  console.log("## Workspace Dependency Rewrites");
  console.log("");
  if (plan.workspaceDependencyRewrites.length === 0) {
    console.log("- [x] No workspace dependency rewrites required");
  } else {
    for (const rewrite of plan.workspaceDependencyRewrites) {
      console.log(`- [ ] \`${rewrite.package}\` \`${rewrite.field}.${rewrite.dependency}\`: \`${rewrite.currentRange}\` -> \`${plan.version}\``);
    }
  }
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}
