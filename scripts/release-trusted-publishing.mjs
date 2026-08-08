import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release trusted publishing plan failed: ${error.message}`);
  process.exit(1);
}

const failures = [];
const workflowPath = join(root, ".github", "workflows", args.workflow);
const githubRepository = parseGitHubRepository(args.repositoryUrl);
const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
try {
  requireValidSemver(releaseVersion);
} catch (error) {
  console.error(`Release trusted publishing plan failed: ${error.message}`);
  process.exit(1);
}
const packages = readPublishablePackages();

if (!githubRepository) {
  failures.push(`${args.repositoryUrl}: repository URL must be a GitHub URL such as git+https://github.com/OWNER/REPO.git`);
} else if (isPlaceholderRepository(githubRepository)) {
  failures.push(`${args.repositoryUrl}: repository URL must use the canonical public owner and repository, not a placeholder`);
}

validateWorkflow();

const plan = {
  repositoryUrl: args.repositoryUrl,
  githubOwner: githubRepository?.owner,
  githubRepository: githubRepository?.repo,
  workflowFilename: args.workflow,
  environment: args.environment,
  allowedAction: args.allowedAction,
  githubEnvironment: {
    name: args.environment,
    requiredForWorkflow: args.workflow,
    purpose: "Protect npm trusted publishing and provenance release jobs before first publish.",
  },
  releaseWorkflowInputs: {
    version: releaseVersion,
    repository_url: args.repositoryUrl,
    confirm_publish: "publish-open-grid",
    npm_tag: args.tag,
    ui_smoke_report: "@.release/ui-smoke-report.json",
  },
  packageCount: packages.length,
  packages: packages.map((pkg) => ({
    name: pkg.manifest.name,
    dir: pkg.dir,
    trustedPublisher: {
      provider: "GitHub Actions",
      organizationOrUser: githubRepository?.owner,
      repository: githubRepository?.repo,
      workflow: args.workflow,
      environment: args.environment,
      allowedAction: args.allowedAction,
    },
  })),
};

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ ...plan, failures }, null, 2));
  } else if (args.markdown) {
    printPlanMarkdown(plan, failures);
  } else {
    console.error("Release trusted publishing plan failed:");
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
  printPlanMarkdown(plan);
} else {
  printPlan(plan);
}

function parseArgs(argv) {
  const parsed = {
    allowedAction: "npm publish",
    environment: "npm",
    json: false,
    markdown: false,
    repositoryUrl: undefined,
    tag: "latest",
    version: undefined,
    workflow: "release-publish.yml",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
    } else if (arg === "--allowed-action") {
      parsed.allowedAction = requireArgValue(argv, index, "--allowed-action");
      index += 1;
    } else if (arg?.startsWith("--allowed-action=")) {
      parsed.allowedAction = arg.slice("--allowed-action=".length);
      requireNonEmpty(parsed.allowedAction, "--allowed-action");
    } else if (arg === "--environment") {
      parsed.environment = requireArgValue(argv, index, "--environment");
      index += 1;
    } else if (arg?.startsWith("--environment=")) {
      parsed.environment = arg.slice("--environment=".length);
      requireNonEmpty(parsed.environment, "--environment");
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
    } else if (arg === "--workflow") {
      parsed.workflow = requireArgValue(argv, index, "--workflow");
      index += 1;
    } else if (arg?.startsWith("--workflow=")) {
      parsed.workflow = arg.slice("--workflow=".length);
      requireNonEmpty(parsed.workflow, "--workflow");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  requireValidNpmTag(parsed.tag);
  if (parsed.version !== undefined) {
    requireValidSemver(parsed.version);
  }
  requireNonEmpty(parsed.repositoryUrl, "--repository-url");

  if (basename(parsed.workflow) !== parsed.workflow || !parsed.workflow.endsWith(".yml")) {
    throw new Error("--workflow must be a workflow filename ending in .yml");
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

function parseGitHubRepository(repositoryUrl) {
  const normalized = repositoryUrl.replace(/^git\+/, "").replace(/\.git$/, "");
  const httpsMatch = normalized.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/);

  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = normalized.match(/^git@github\.com:([^/\s]+)\/([^/\s]+)$/);

  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return undefined;
}

function isPlaceholderRepository(repository) {
  return ["OWNER", "owner"].includes(repository.owner) || ["REPO", "repo"].includes(repository.repo);
}

function readPublishablePackages() {
  const packageDirs = readdirSync(join(root, "packages"))
    .map((name) => join("packages", name))
    .filter((dir) => existsSync(join(root, dir, "package.json")))
    .sort();

  return packageDirs.map((dir) => ({ dir, manifest: readJson(join(dir, "package.json")) }));
}

function validateWorkflow() {
  if (!existsSync(workflowPath)) {
    failures.push(`.github/workflows/${args.workflow}: workflow file is required`);
    return;
  }

  const workflow = readFileSync(workflowPath, "utf8");

  if (!workflow.includes("id-token: write")) {
    failures.push(`${args.workflow}: permissions must include id-token: write for npm trusted publishing`);
  }

  if (!workflow.includes(`environment: ${args.environment}`)) {
    failures.push(`${args.workflow}: publish job must use the ${JSON.stringify(args.environment)} environment`);
  }

  if (!workflow.includes("workflow_dispatch:")) {
    failures.push(`${args.workflow}: workflow must be manually dispatchable before publishing`);
  }

  if (!workflowHasNpmDistTagGuard(workflow)) {
    failures.push(`${args.workflow}: workflow must validate npm_tag before publishing`);
  }

  if (!workflowHasReleaseVersionGuard(workflow)) {
    failures.push(`${args.workflow}: workflow must validate version before publishing`);
  }

  if (!workflowInputIsRequired(workflow, "version")) {
    failures.push(`${args.workflow}: workflow_dispatch must require version`);
  }

  if (!workflowInputIsRequired(workflow, "npm_tag")) {
    failures.push(`${args.workflow}: workflow_dispatch must require npm_tag`);
  }

  if (!workflowInputIsRequired(workflow, "repository_url")) {
    failures.push(`${args.workflow}: workflow_dispatch must require repository_url`);
  }

  if (!workflowInputIsRequired(workflow, "confirm_publish")) {
    failures.push(`${args.workflow}: workflow_dispatch must require confirm_publish`);
  }

  if (!workflowInputIsRequired(workflow, "ui_smoke_report")) {
    failures.push(`${args.workflow}: workflow_dispatch must require ui_smoke_report`);
  }

  if (!workflow.includes('test "${{ github.event.inputs.confirm_publish }}" = "publish-open-grid"')) {
    failures.push(`${args.workflow}: workflow must require the publish-open-grid confirmation phrase before publishing`);
  }

  if (!workflow.includes("npm install -g npm@11")) {
    failures.push(`${args.workflow}: workflow must install npm 11 for trusted publishing`);
  }

  if (!workflow.includes("pnpm release:publish")) {
    failures.push(`${args.workflow}: workflow must call pnpm release:publish`);
  }

  if (!workflowHasJsonReleaseCheck(workflow)) {
    failures.push(`${args.workflow}: release readiness check must run with --json`);
  }

  if (!workflowHasUiSmokeReportGate(workflow)) {
    failures.push(`${args.workflow}: workflow must materialize and validate ui_smoke_report before publishing`);
  }

  if (!workflowHasTrustedPublishingRequestedInputs(workflow)) {
    failures.push(`${args.workflow}: trusted-publishing preflight must pass --version "$RELEASE_VERSION", --tag "$NPM_TAG", and --repository-url "$REPOSITORY_URL"`);
  }

  if (!workflowHasRepositoryVerifiedPublishDryRun(workflow)) {
    failures.push(`${args.workflow}: publish dry-run must pass --repository-url "$REPOSITORY_URL" before --dry-run`);
  }

  if (!workflowHasQuickUiSmoke(workflow)) {
    failures.push(`${args.workflow}: workflow must run pnpm e2e:smoke before the full e2e suite`);
  }

  if (!workflowHasRepositoryVerifiedActualPublish(workflow)) {
    failures.push(`${args.workflow}: publish command must pass --repository-url "$REPOSITORY_URL" before actual publishing`);
  }

  if (!workflow.includes("--provenance")) {
    failures.push(`${args.workflow}: publish command must include --provenance`);
  }

  if (!workflow.includes("--confirm publish-open-grid")) {
    failures.push(`${args.workflow}: publish command must pass --confirm publish-open-grid`);
  }
}

function workflowInputIsRequired(workflow, inputName) {
  const inputStart = workflow.indexOf(`      ${inputName}:`);

  if (inputStart === -1) {
    return false;
  }

  const rest = workflow.slice(inputStart);
  const nextInputStart = rest.slice(1).search(/\n      [A-Za-z0-9_-]+:/);
  const inputBlock = nextInputStart === -1 ? rest : rest.slice(0, nextInputStart + 1);

  return inputBlock.includes("required: true");
}

function workflowHasNpmDistTagGuard(workflow) {
  return workflow.includes('[[ "$NPM_TAG" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]') && workflow.includes('[[ ! "$NPM_TAG" =~ ^v?[0-9] ]]');
}

function workflowHasReleaseVersionGuard(workflow) {
  return workflow.includes('[[ "$RELEASE_VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$ ]]');
}

function workflowHasRepositoryVerifiedPublishDryRun(workflow) {
  return workflow
    .split("\n")
    .some((line) => line.includes("pnpm release:publish") && line.includes("--repository-url \"$REPOSITORY_URL\"") && line.includes("--dry-run"));
}

function workflowHasJsonReleaseCheck(workflow) {
  return workflow
    .split("\n")
    .some((line) => line.includes("pnpm release:check") && line.includes("--json"));
}

function workflowHasUiSmokeReportGate(workflow) {
  const lines = workflow.split("\n");
  const inputEnvironment = 'UI_SMOKE_REPORT: ${{ github.event.inputs.ui_smoke_report }}';
  const materializeCommand = `printf '%s' "$UI_SMOKE_REPORT" > .release/ui-smoke-report.json`;
  const validationCommand = "pnpm release:ui-smoke-report-check";
  const validationArguments = [
    '--version "$RELEASE_VERSION"',
    '--tag "$NPM_TAG"',
    '--repository-url "$REPOSITORY_URL"',
    "--json",
  ];
  const materializeIndex = lines.findIndex((line) => line.includes(materializeCommand));
  const validationLine = lines.find((line) => line.includes(validationCommand));
  const validationIndex = lines.findIndex((line) => line.includes(validationCommand));
  const actualPublishIndex = lines.findIndex((line) => line.includes("pnpm release:publish") && line.includes("--provenance"));

  return workflow.includes(inputEnvironment)
    && materializeIndex !== -1
    && validationLine !== undefined
    && validationIndex !== -1
    && actualPublishIndex !== -1
    && materializeIndex < validationIndex
    && validationIndex < actualPublishIndex
    && validationArguments.every((argument) => validationLine.includes(argument))
    && !validationLine.includes("--allow-dirty");
}

function workflowHasQuickUiSmoke(workflow) {
  const lines = workflow.split("\n");
  const smokeIndex = lines.findIndex((line) => line.includes("pnpm e2e:smoke"));
  const e2eIndex = lines.findIndex((line) => line.includes("pnpm e2e") && !line.includes("pnpm e2e:smoke"));

  return smokeIndex !== -1 && e2eIndex !== -1 && smokeIndex < e2eIndex;
}

function workflowHasTrustedPublishingRequestedInputs(workflow) {
  return workflow
    .split("\n")
    .some((line) =>
      line.includes("pnpm release:trusted-publishing") &&
      line.includes("--version \"$RELEASE_VERSION\"") &&
      line.includes("--tag \"$NPM_TAG\"") &&
      line.includes("--repository-url \"$REPOSITORY_URL\""),
    );
}

function workflowHasRepositoryVerifiedActualPublish(workflow) {
  return workflow
    .split("\n")
    .some((line) =>
      line.includes("pnpm release:publish") &&
      line.includes("--repository-url \"$REPOSITORY_URL\"") &&
      line.includes("--provenance") &&
      line.includes("--confirm publish-open-grid") &&
      !line.includes("--dry-run"),
    );
}

function printPlan(plan) {
  console.log(`Open Grid trusted publishing plan for ${plan.githubOwner}/${plan.githubRepository}`);
  console.log("");
  console.log(`Workflow: ${plan.workflowFilename}`);
  console.log(`Environment: ${plan.environment}`);
  console.log(`Allowed action: ${plan.allowedAction}`);
  console.log(`Packages: ${plan.packageCount}`);
  console.log("");
  console.log("Configure this GitHub environment:");
  console.log(`- Environment name: ${plan.githubEnvironment.name}`);
  console.log(`- Required for workflow: ${plan.githubEnvironment.requiredForWorkflow}`);
  console.log(`- Purpose: ${plan.githubEnvironment.purpose}`);
  console.log("");
  console.log("Use these Release Publish workflow inputs for the first publish:");
  console.log(`- version: ${plan.releaseWorkflowInputs.version}`);
  console.log(`- repository_url: ${plan.releaseWorkflowInputs.repository_url}`);
  console.log(`- npm_tag: ${plan.releaseWorkflowInputs.npm_tag}`);
  console.log(`- confirm_publish: ${plan.releaseWorkflowInputs.confirm_publish}`);
  console.log(`- ui_smoke_report: ${plan.releaseWorkflowInputs.ui_smoke_report}`);
  console.log("");
  console.log("Configure these npm package trusted publishers:");

  for (const [index, pkg] of plan.packages.entries()) {
    const publisher = pkg.trustedPublisher;

    console.log(`${index + 1}. ${pkg.name}`);
    console.log(`   GitHub organization/user: ${publisher.organizationOrUser}`);
    console.log(`   GitHub repository: ${publisher.repository}`);
    console.log(`   Workflow filename: ${publisher.workflow}`);
    console.log(`   Environment: ${publisher.environment}`);
    console.log(`   Allowed action: ${publisher.allowedAction}`);
  }
}

function printPlanMarkdown(plan, failures = []) {
  console.log("# Trusted Publishing Setup Checklist");
  console.log("");
  console.log(`- Repository URL: ${plan.repositoryUrl}`);
  console.log(`- GitHub repository: ${plan.githubOwner}/${plan.githubRepository}`);
  console.log(`- Workflow: ${plan.workflowFilename}`);
  console.log(`- Environment: ${plan.environment}`);
  console.log(`- Allowed action: ${plan.allowedAction}`);
  console.log(`- Packages: ${plan.packageCount}`);

  if (failures.length > 0) {
    console.log("");
    console.log("## Preflight Failures");
    console.log("");
    for (const failure of failures) {
      console.log(`- [ ] ${failure}`);
    }
  }

  console.log("");
  console.log("## GitHub Environment");
  console.log("");
  console.log(`- [ ] Create or confirm environment \`${plan.githubEnvironment.name}\`.`);
  console.log(`- [ ] Require it for \`${plan.githubEnvironment.requiredForWorkflow}\`.`);
  console.log(`- [ ] Purpose: ${plan.githubEnvironment.purpose}`);

  console.log("");
  console.log("## Release Publish Workflow Inputs");
  console.log("");
  console.log(`- [ ] version: \`${plan.releaseWorkflowInputs.version}\``);
  console.log(`- [ ] repository_url: \`${plan.releaseWorkflowInputs.repository_url}\``);
  console.log(`- [ ] npm_tag: \`${plan.releaseWorkflowInputs.npm_tag}\``);
  console.log(`- [ ] confirm_publish: \`${plan.releaseWorkflowInputs.confirm_publish}\``);
  console.log(`- [ ] ui_smoke_report: \`${plan.releaseWorkflowInputs.ui_smoke_report}\``);

  console.log("");
  console.log("## npm Trusted Publishers");

  for (const pkg of plan.packages) {
    const publisher = pkg.trustedPublisher;

    console.log("");
    console.log(`### ${pkg.name}`);
    console.log("");
    console.log("- [ ] Provider: `GitHub Actions`");
    console.log(`- [ ] GitHub organization/user: \`${publisher.organizationOrUser}\``);
    console.log(`- [ ] GitHub repository: \`${publisher.repository}\``);
    console.log(`- [ ] Workflow filename: \`${publisher.workflow}\``);
    console.log(`- [ ] Environment: \`${publisher.environment}\``);
    console.log(`- [ ] Allowed action: \`${publisher.allowedAction}\``);
  }
}

function printFailureContext(plan, writeLine) {
  writeLine(`Repository URL: ${plan.repositoryUrl}`);
  writeLine(`Workflow: ${plan.workflowFilename}`);
  writeLine(`Environment: ${plan.environment}`);
  writeLine(`Allowed action: ${plan.allowedAction}`);
  writeLine("");
  writeLine("Release Publish workflow inputs:");
  writeLine(`- version: ${plan.releaseWorkflowInputs.version}`);
  writeLine(`- repository_url: ${plan.releaseWorkflowInputs.repository_url}`);
  writeLine(`- npm_tag: ${plan.releaseWorkflowInputs.npm_tag}`);
  writeLine(`- confirm_publish: ${plan.releaseWorkflowInputs.confirm_publish}`);
  writeLine(`- ui_smoke_report: ${plan.releaseWorkflowInputs.ui_smoke_report}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}
