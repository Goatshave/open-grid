import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { releaseWorkflowUiGates, uiSmokeVerificationCommandArgs } from "./release-ui-gates.mjs";
import {
  defaultUiSmokeOpenWaitTimeoutMs,
  formatPnpmCommand,
  formatUiSmokeOpenCommand,
  uiSmokeTargets,
} from "./ui-smoke-targets.mjs";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`First publish preflight failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;
try {
  requireValidSemver(releaseVersion);
} catch (error) {
  console.error(`First publish preflight failed: ${error.message}`);
  process.exit(1);
}
const expectedTag = `open-grid-v${releaseVersion}`;
const workspaceRoot = args.outDir ? undefined : mkdtempSync(join(tmpdir(), "open-grid-first-publish-"));
const outDir = resolve(root, args.outDir ?? join(workspaceRoot, "tarballs"));
const steps = [];
const failures = [];

try {
  runStep("trustedPublishing", [
    "scripts/release-trusted-publishing.mjs",
    "--version",
    releaseVersion,
    "--tag",
    args.tag,
    "--repository-url",
    args.repositoryUrl,
    "--json",
  ], { parseJson: true });
  runStep("releasePolicy", ["scripts/release-policy.mjs", "--version", releaseVersion, "--tag", expectedTag, "--json"], { parseJson: true });
  runStep("releaseCheck", ["scripts/release-check.mjs", "--json"], { parseJson: true });
  runStep("releasePlan", ["scripts/release-plan.mjs", "--version", releaseVersion, "--json"], { parseJson: true });
  runStep("releaseStage", [
    "scripts/release-stage.mjs",
    "--version",
    releaseVersion,
    "--out-dir",
    outDir,
    "--repository-url",
    args.repositoryUrl,
    "--json",
  ], { parseJson: true });
  runStep("publishDryRun", [
    "scripts/release-publish.mjs",
    "--version",
    releaseVersion,
    "--tag",
    args.tag,
    "--out-dir",
    outDir,
    "--repository-url",
    args.repositoryUrl,
    "--dry-run",
    "--json",
  ], { parseJson: true });
} finally {
  if (!args.outDir && workspaceRoot) {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

const result = {
  version: releaseVersion,
  tag: args.tag,
  repositoryUrl: args.repositoryUrl,
  releaseTag: expectedTag,
  outDir: args.outDir ? outDir : undefined,
  releaseWorkflowInputs: {
    version: releaseVersion,
    repository_url: args.repositoryUrl,
    npm_tag: args.tag,
    confirm_publish: "publish-open-grid",
    ui_smoke_report: "@.release/ui-smoke-report.json",
  },
  releaseWorkflowGates: releaseWorkflowUiGates,
  manualUiSmokeTargets: createManualUiSmokeTargets(),
  steps,
  nextExternalActions: [
    "Push the current release branch to the canonical public GitHub repository verified by pnpm release:github-push-preflight.",
    "Create or confirm the protected GitHub environment named npm for .github/workflows/release-publish.yml.",
    "Configure npm Trusted Publisher settings for every publishable package using the trustedPublishing step output.",
    "Run .github/workflows/release-publish.yml manually with the generated version, repository_url, npm_tag, confirm_publish, and completed ui_smoke_report inputs; it validates the source-bound report before pnpm e2e:smoke and pnpm e2e.",
  ],
  nextVerificationCommands: createNextVerificationCommands(),
};

if (failures.length > 0) {
  if (args.json) {
    console.log(JSON.stringify({ ...result, failures }, null, 2));
  } else if (args.markdown) {
    printMarkdownReport({ ...result, failures });
  } else {
    console.error("First publish preflight failed:");
    console.error(`Repository URL: ${args.repositoryUrl}`);
    console.error(`Release tag: ${expectedTag}`);
    console.error(`npm tag: ${args.tag}`);
    console.error("");
    printReleaseWorkflowInputs((line) => console.error(line));
    console.error("");
    printReleaseWorkflowGates((line) => console.error(line));
    console.error("");
    printManualUiSmokeTargets((line) => console.error(line), result.manualUiSmokeTargets);
    console.error("");
    printNextVerificationCommands((line) => console.error(line));
    console.error("");
    console.error("Failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exitCode = 1;
} else if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (args.markdown) {
  printMarkdownReport(result);
} else {
  console.log(`First publish preflight passed for ${releaseVersion}.`);
  console.log(`Repository URL: ${args.repositoryUrl}`);
  console.log(`Release tag: ${expectedTag}`);
  console.log(`npm tag: ${args.tag}`);
  console.log("");
  console.log("Verified steps:");
  for (const step of steps) {
    console.log(`- ${step.name}`);
  }
  console.log("");
  printReleaseWorkflowInputs((line) => console.log(line));
  console.log("");
  printReleaseWorkflowGates((line) => console.log(line));
  console.log("");
  printManualUiSmokeTargets((line) => console.log(line), result.manualUiSmokeTargets);
  console.log("");
  printNextVerificationCommands((line) => console.log(line));
  console.log("");
  console.log("Remaining external actions:");
  for (const action of result.nextExternalActions) {
    console.log(`- ${action}`);
  }
}

function printMarkdownReport(report) {
  console.log("# First Publish Preflight Report");
  console.log("");
  console.log(`- Repository URL: ${report.repositoryUrl}`);
  console.log(`- Version: ${report.version}`);
  console.log(`- Release tag: ${report.releaseTag}`);
  console.log(`- npm tag: ${report.tag}`);
  console.log(`- Result: ${report.failures?.length > 0 ? "blocked" : "passed"}`);

  if (report.failures?.length > 0) {
    console.log("");
    console.log("## Failures");
    console.log("");
    for (const failure of report.failures) {
      console.log(`- [ ] ${failure}`);
    }
  }

  console.log("");
  console.log("## Verified Steps");
  console.log("");
  for (const step of report.steps) {
    console.log(`- [x] ${step.name}`);
  }

  console.log("");
  console.log("## Release Publish Workflow Inputs");
  console.log("");
  console.log(`- [ ] version: \`${report.releaseWorkflowInputs.version}\``);
  console.log(`- [ ] repository_url: \`${report.releaseWorkflowInputs.repository_url}\``);
  console.log(`- [ ] npm_tag: \`${report.releaseWorkflowInputs.npm_tag}\``);
  console.log(`- [ ] confirm_publish: \`${report.releaseWorkflowInputs.confirm_publish}\``);
  console.log(`- [ ] ui_smoke_report: \`${report.releaseWorkflowInputs.ui_smoke_report}\``);

  console.log("");
  console.log("## Release Publish Workflow Gates");
  console.log("");
  for (const gate of report.releaseWorkflowGates) {
    console.log(`- [ ] \`${gate}\``);
  }

  console.log("");
  console.log("## Manual UI Smoke Checklist");
  for (const target of report.manualUiSmokeTargets) {
    console.log("");
    console.log(`### ${target.framework}`);
    console.log("");
    console.log(`- URL: ${target.url}`);
    console.log(`- Build: \`${target.buildCommand}\``);
    console.log(`- Preview: \`${target.previewCommand}\``);
    console.log(`- Open: \`${target.openCommand}\``);
    console.log(`- Open wait timeout: \`${target.openWaitTimeoutMs}ms\``);
    console.log(`- Grid accessible label: \`${target.smokeCheck.gridLabel}\``);
    console.log(`- Primary smoke column id: \`${target.smokeCheck.primaryColumnId}\``);
    console.log(`- Primary column label: \`${target.smokeCheck.primaryColumnLabel}\``);
    console.log(`- Managed column count assertion: \`${target.smokeCheck.managedColumnCount}\``);
    console.log(`- Minimum deep-scroll row index: \`${target.smokeCheck.minimumDeepScrollRowIndex}\``);
    console.log(`- Maximum mounted virtual rows: \`${target.smokeCheck.maxRenderedRowCount}\``);
    console.log(`- Loading state text: \`${target.stateCheck.loadingText}\``);
    console.log(`- Error state text: \`${target.stateCheck.errorText}\``);
    console.log(`- Invalid edit target: \`${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}\``);
    console.log(`- Validation message: \`${target.stateCheck.validationMessage}\``);
    console.log(`- Product workflow search: \`${target.workflowCheck.searchQuery}\` -> \`${target.workflowCheck.filteredRowId}\``);
    console.log(`- Product workflow valid edit: \`${target.workflowCheck.validEditValue}\``);
    console.log(`- Persisted workflow column: \`${target.workflowCheck.preferenceColumnLabel}\` (\`${target.workflowCheck.preferenceColumnId}\`)`);
    console.log("");
    console.log("#### Functional Checks");
    console.log("");
    for (const check of target.manualChecks) {
      console.log(`- [ ] ${check}`);
    }
    console.log("");
    console.log("#### Accessibility Checks");
    console.log("");
    for (const check of target.accessibilityChecks) {
      console.log(`- [ ] ${check}`);
    }
  }

  console.log("");
  console.log("## Remaining External Actions");
  console.log("");
  for (const action of report.nextExternalActions) {
    console.log(`- [ ] ${action}`);
  }

  console.log("");
  console.log("## Next Verification Commands");
  console.log("");
  for (const command of report.nextVerificationCommands) {
    console.log(`- [ ] \`${command}\``);
  }
}

function printReleaseWorkflowInputs(writeLine) {
  writeLine("Release Publish workflow inputs:");
  writeLine(`- version: ${result.releaseWorkflowInputs.version}`);
  writeLine(`- repository_url: ${result.releaseWorkflowInputs.repository_url}`);
  writeLine(`- npm_tag: ${result.releaseWorkflowInputs.npm_tag}`);
  writeLine(`- confirm_publish: ${result.releaseWorkflowInputs.confirm_publish}`);
  writeLine(`- ui_smoke_report: ${result.releaseWorkflowInputs.ui_smoke_report}`);
}

function printReleaseWorkflowGates(writeLine) {
  writeLine("Release Publish workflow UI gates:");
  for (const gate of result.releaseWorkflowGates) {
    writeLine(`- ${gate}`);
  }
}

function printManualUiSmokeTargets(writeLine, targets) {
  writeLine("Manual UI smoke targets:");
  for (const target of targets) {
    writeLine(`- ${target.framework}: ${target.url}`);
    writeLine(`  build: ${target.buildCommand}`);
    writeLine(`  preview: ${target.previewCommand}`);
    writeLine(`  open: ${target.openCommand}`);
    writeLine(`  open wait timeout: ${target.openWaitTimeoutMs}ms`);
    writeLine(`  grid accessible label: ${target.smokeCheck.gridLabel}`);
    writeLine(`  primary smoke column id: ${target.smokeCheck.primaryColumnId}`);
    writeLine(`  primary column label: ${target.smokeCheck.primaryColumnLabel}`);
    writeLine(`  managed column count assertion: ${target.smokeCheck.managedColumnCount}`);
    writeLine(`  minimum deep-scroll row index: ${target.smokeCheck.minimumDeepScrollRowIndex}`);
    writeLine(`  maximum mounted virtual rows: ${target.smokeCheck.maxRenderedRowCount}`);
    writeLine(`  loading state text: ${target.stateCheck.loadingText}`);
    writeLine(`  error state text: ${target.stateCheck.errorText}`);
    writeLine(`  invalid edit target: ${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}`);
    writeLine(`  validation message: ${target.stateCheck.validationMessage}`);
    writeLine(`  product workflow search: ${target.workflowCheck.searchQuery} -> ${target.workflowCheck.filteredRowId}`);
    writeLine(`  product workflow valid edit: ${target.workflowCheck.validEditValue}`);
    writeLine(`  persisted workflow column: ${target.workflowCheck.preferenceColumnLabel} (${target.workflowCheck.preferenceColumnId})`);
  }
}

function printNextVerificationCommands(writeLine) {
  writeLine("Next verification commands:");
  for (const command of result.nextVerificationCommands) {
    writeLine(`- ${command}`);
  }
}

function createManualUiSmokeTargets() {
  return uiSmokeTargets.map((target) => ({
    framework: target.framework,
    url: target.url,
    buildCommand: target.buildCommands.map(formatPnpmCommand).join(" && "),
    previewCommand: formatPnpmCommand(target.previewCommand),
    openCommand: formatUiSmokeOpenCommand(target),
    openWaitTimeoutMs: defaultUiSmokeOpenWaitTimeoutMs,
    smokeCheck: target.smokeCheck,
    stateCheck: target.stateCheck,
    workflowCheck: target.workflowCheck,
    manualChecks: target.manualChecks,
    accessibilityChecks: target.accessibilityChecks,
  }));
}

function createNextVerificationCommands() {
  const baseArgs = [
    "--version",
    releaseVersion,
    "--tag",
    args.tag,
    "--repository-url",
    args.repositoryUrl,
  ];

  return [
    ["pnpm", "release:first-publish-status", "--", ...baseArgs, "--check-auth"],
    ["pnpm", "release:first-publish-preflight", "--", ...baseArgs],
    ["pnpm", "release:trusted-publishing", "--", ...baseArgs],
    ...uiSmokeVerificationCommandArgs,
  ].map(formatCommand);
}

function parseArgs(argv) {
  const parsed = { json: false, markdown: false, outDir: undefined, repositoryUrl: undefined, tag: "latest", version: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
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
  if (parsed.version !== undefined) {
    requireValidSemver(parsed.version);
  }
  requireNonEmpty(parsed.repositoryUrl, "--repository-url");
  return parsed;
}

function runStep(name, command, options = {}) {
  if (failures.length > 0) {
    return;
  }

  try {
    const output = execFileSync(process.execPath, command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const step = { name, command: `node ${command.map(shellQuote).join(" ")}` };

    if (options.parseJson) {
      step.result = JSON.parse(output);
    } else {
      step.output = output.trim();
    }

    steps.push(step);
  } catch (error) {
    const step = { name, command: `node ${command.map(shellQuote).join(" ")}` };
    const jsonOutput = options.parseJson ? parseJsonErrorOutput(error) : undefined;

    if (jsonOutput) {
      step.result = jsonOutput;
      steps.push(step);

      if (jsonOutput.failures?.length > 0) {
        for (const failure of jsonOutput.failures) {
          failures.push(failure);
        }
        return;
      }
    }

    failures.push(`${name} failed${formatCommandError(error)}`);
  }
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

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function formatCommand(command) {
  return command.map(shellQuote).join(" ");
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
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

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}
