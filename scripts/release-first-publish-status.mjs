import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { uiSmokeVerificationCommandArgs } from "./release-ui-gates.mjs";

const root = process.cwd();
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`First publish status failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson("package.json");
const releaseVersion = args.version ?? rootPackage.version;

try {
  requireValidSemver(releaseVersion);
} catch (error) {
  console.error(`First publish status failed: ${error.message}`);
  process.exit(1);
}

const githubPush = args.skipGithubPush
  ? skippedGithubPushStep(args.repositoryUrl)
  : runJsonStep("githubPush", [
      "scripts/release-github-push-preflight.mjs",
      "--repository-url",
      args.repositoryUrl,
      "--json",
      ...createGithubPushAuthArgs(),
    ]);
const firstPublish = runJsonStep("firstPublish", [
  "scripts/release-first-publish-preflight.mjs",
  "--version",
  releaseVersion,
  "--tag",
  args.tag,
  "--repository-url",
  args.repositoryUrl,
  "--json",
]);

const githubPushReady = githubPush.status === 0 && githubPush.result?.ready !== false;
const firstPublishReady = firstPublish.status === 0 && !hasFailures(firstPublish.result);
const localReady = !args.skipGithubPush && githubPushReady && firstPublishReady;
const verificationReady = args.skipGithubPush ? firstPublishReady : localReady;
const manualUiSmokeTargets = firstPublish.result?.manualUiSmokeTargets ?? [];
const trustedPublisherSetup = createTrustedPublisherSetup(firstPublish.result);
const releasePublishWorkflowRun = createReleasePublishWorkflowRun(firstPublish.result);
const externalActions = compactExternalActions([
  ...(githubPush.result?.nextExternalActions ?? []),
  ...(firstPublish.result?.nextExternalActions ?? []),
  ...createExternalGithubNpmSetupActions(trustedPublisherSetup),
  releasePublishWorkflowRun?.instruction ?? "Run .github/workflows/release-publish.yml manually after the public GitHub push and npm Trusted Publisher setup are complete.",
], { hasDetailedExternalSetupActions: Boolean(trustedPublisherSetup) });
const nextVerificationCommands = createNextVerificationCommands();
const externalSetupVerification = createExternalSetupVerification(nextVerificationCommands);
const commercializationProgress = createCommercializationProgress({ firstPublishReady, githubPush, githubPushReady, localReady, releasePublishWorkflowRun, skipGithubPush: args.skipGithubPush, trustedPublisherSetup });
const commercializationNextStep = createCommercializationNextStep(commercializationProgress);

const result = {
  version: releaseVersion,
  tag: args.tag,
  repositoryUrl: args.repositoryUrl,
  githubPushSkipped: args.skipGithubPush,
  verificationReady,
  localReady,
  externalReady: false,
  ready: false,
  commercializationStatus: getCommercializationStatus({ firstPublishReady, localReady, skipGithubPush: args.skipGithubPush }),
  commercializationProgress,
  commercializationNextStep,
  trustedPublisherSetup,
  releasePublishWorkflowRun,
  blockers: [
    ...collectFailures(githubPush),
    ...collectFailures(firstPublish),
  ],
  steps: {
    githubPush,
    firstPublish,
  },
  manualUiSmokeTargets,
  remainingExternalActions: verificationReady
    ? externalActions
    : [
        "Resolve local preflight failures before treating external setup as the only remaining blocker.",
        ...externalActions,
      ],
  externalSetupVerification,
  nextVerificationCommands,
};

if (args.nextStep && args.json) {
  console.log(JSON.stringify(result.commercializationNextStep, null, 2));
} else if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (args.nextStep && args.markdown) {
  printCommercializationNextStepMarkdown(result.commercializationNextStep);
} else if (args.markdown) {
  printStatusMarkdown(result);
} else if (args.nextStep) {
  printCommercializationNextStepText(result.commercializationNextStep);
} else {
  console.log("First publish status:");
  console.log(`Repository URL: ${result.repositoryUrl}`);
  console.log(`Version: ${result.version}`);
  console.log(`npm tag: ${result.tag}`);
  console.log(`Verification readiness: ${result.verificationReady ? "ready" : "blocked"}`);
  console.log(`Local readiness: ${result.localReady ? "ready" : "blocked"}`);
  console.log(`External readiness: ${result.externalReady ? "ready" : "pending"}`);
  console.log(`Commercialization status: ${result.commercializationStatus}`);
  printCommercializationProgressText(result.commercializationProgress);
  printCommercializationNextStepText(result.commercializationNextStep);
  printTrustedPublisherSetupText(result.trustedPublisherSetup);
  printReleasePublishWorkflowRunText(result.releasePublishWorkflowRun);

  if (result.blockers.length > 0) {
    console.log("");
    console.log("Blockers:");
    for (const blocker of result.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  printManualUiSmokeTargetsText(result.manualUiSmokeTargets);

  console.log("");
  console.log("Remaining external actions:");
  for (const action of result.remainingExternalActions) {
    console.log(`- ${action}`);
  }

  console.log("");
  console.log("Next verification commands:");
  for (const command of result.nextVerificationCommands) {
    console.log(`- ${command}`);
  }
  printExternalSetupVerificationText(result.externalSetupVerification);
}

if (!result.verificationReady) {
  process.exitCode = 1;
}

function printStatusMarkdown(status) {
  console.log("# First Publish Status");
  console.log("");
  console.log(`- Repository URL: ${status.repositoryUrl}`);
  console.log(`- Version: ${status.version}`);
  console.log(`- npm tag: ${status.tag}`);
  console.log(`- Commercialization status: ${status.commercializationStatus}`);
  console.log("");
  console.log("## Readiness");
  console.log("");
  console.log(`- [${status.verificationReady ? "x" : " "}] Verification readiness`);
  console.log(`- [${status.localReady ? "x" : " "}] Local readiness`);
  console.log(`- [${status.externalReady ? "x" : " "}] External readiness`);
  console.log(`- [${status.ready ? "x" : " "}] Ready to publish`);
  printCommercializationProgressMarkdown(status.commercializationProgress);
  printCommercializationNextStepMarkdown(status.commercializationNextStep);

  if (status.blockers.length > 0) {
    console.log("");
    console.log("## Local Blockers");
    console.log("");
    for (const blocker of status.blockers) {
      console.log(`- [ ] ${blocker}`);
    }
  }

  printGithubPushDiagnostics(status.steps.githubPush?.result);
  printTrustedPublisherSetupSummary(status.trustedPublisherSetup);
  printReleasePublishWorkflowRunSummary(status.releasePublishWorkflowRun);
  printManualUiSmokeChecklist(status.manualUiSmokeTargets);

  console.log("");
  console.log("## Remaining External Actions");
  console.log("");
  for (const action of status.remainingExternalActions) {
    console.log(`- [ ] ${action}`);
  }

  console.log("");
  console.log("## Next Verification Commands");
  console.log("");
  for (const command of status.nextVerificationCommands) {
    console.log(`- [ ] \`${command}\``);
  }
  printExternalSetupVerificationMarkdown(status.externalSetupVerification);
}

function printCommercializationProgressText(progress) {
  console.log(`Commercialization progress: ${progress.completedStages}/${progress.totalStages} stage(s), ${progress.percent}%`);
  console.log(`Remaining stages: ${progress.remainingStageCount}`);
  console.log(`Current stage id: ${progress.currentStageId}`);
  console.log(`Current stage: ${progress.currentStage}`);
  if (progress.nextAction) {
    console.log(`Next action: ${progress.nextAction}`);
  }
  if (progress.nextRequiredActions.length > 0) {
    console.log("Next required actions:");
    for (const action of progress.nextRequiredActions) {
      console.log(`- ${action}`);
    }
  }
  if (progress.nextVerificationCommands.length > 0) {
    console.log("Next verification commands:");
    for (const command of progress.nextVerificationCommands) {
      console.log(`- ${command}`);
    }
  }
  if (progress.remainingStages.length > 0) {
    console.log("Remaining stage verification commands:");
    for (const stage of progress.remainingStages) {
      console.log(`- ${stage.label}`);
      for (const action of stage.requiredActions) {
        console.log(`  action: ${action}`);
      }
      for (const command of stage.verificationCommands) {
        console.log(`  - ${command}`);
      }
    }
  }
}

function printCommercializationProgressMarkdown(progress) {
  console.log("");
  console.log("## Commercialization Progress");
  console.log("");
  console.log(`- Completed stages: ${progress.completedStages}/${progress.totalStages}`);
  console.log(`- Remaining stages: ${progress.remainingStageCount}`);
  console.log(`- Percent: ${progress.percent}%`);
  console.log(`- Current stage id: ${progress.currentStageId}`);
  console.log(`- Current stage: ${progress.currentStage}`);
  if (progress.nextAction) {
    console.log(`- Next action: ${progress.nextAction}`);
  }
  for (const stage of progress.stages) {
    console.log(`- [${stage.completed ? "x" : " "}] ${stage.label}`);
    if (!stage.completed) {
      for (const action of stage.requiredActions) {
        console.log(`  - Action: ${action}`);
      }
      for (const command of stage.verificationCommands) {
        console.log(`  - \`${command}\``);
      }
    }
  }
}

function printCommercializationNextStepText(nextStep) {
  if (!nextStep) {
    return;
  }

  console.log("");
  console.log("Next commercialization step:");
  console.log(`Stage: ${nextStep.id}`);
  console.log(`Label: ${nextStep.label}`);
  console.log(`Progress: ${nextStep.completedStages}/${nextStep.totalStages} stage(s), ${nextStep.percent}%`);
  console.log(`Remaining stages: ${nextStep.remainingStageCount}`);
  for (const action of nextStep.requiredActions) {
    console.log(`- ${action}`);
  }
  for (const command of nextStep.verificationCommands) {
    console.log(`- ${command}`);
  }
}

function printCommercializationNextStepMarkdown(nextStep) {
  if (!nextStep) {
    return;
  }

  console.log("");
  console.log("## Next Commercialization Step");
  console.log("");
  console.log(`- Stage: \`${nextStep.id}\``);
  console.log(`- Label: ${nextStep.label}`);
  console.log(`- Progress: ${nextStep.completedStages}/${nextStep.totalStages} stage(s), ${nextStep.percent}%`);
  console.log(`- Remaining stages: ${nextStep.remainingStageCount}`);
  for (const action of nextStep.requiredActions) {
    console.log(`- [ ] ${action}`);
  }
  for (const command of nextStep.verificationCommands) {
    console.log(`- [ ] \`${command}\``);
  }
}

function printTrustedPublisherSetupText(setup) {
  if (!setup) {
    return;
  }

  console.log(`Trusted Publisher GitHub environment: ${setup.githubEnvironment.name}`);
  console.log(`Trusted Publisher packages: ${setup.packageCount}`);
  console.log(`Release Publish workflow: ${setup.githubEnvironment.requiredForWorkflow}`);
}

function printExternalSetupVerificationText(verification) {
  if (!verification) {
    return;
  }

  console.log("");
  console.log("External setup verification:");
  console.log(`Instruction: ${verification.instruction}`);
  console.log("Success criteria:");
  for (const criterion of verification.successCriteria) {
    console.log(`- ${criterion}`);
  }
}

function printExternalSetupVerificationMarkdown(verification) {
  if (!verification) {
    return;
  }

  console.log("");
  console.log("## External Setup Verification");
  console.log("");
  console.log(`- [ ] ${verification.instruction}`);
  console.log("");
  console.log("### Success Criteria");
  console.log("");
  for (const criterion of verification.successCriteria) {
    console.log(`- [ ] ${criterion}`);
  }
}

function printReleasePublishWorkflowRunText(workflowRun) {
  if (!workflowRun) {
    return;
  }

  console.log(`Release Publish workflow run: ${workflowRun.workflow}`);
  if (workflowRun.githubActionsUrl) {
    console.log(`Release Publish GitHub Actions URL: ${workflowRun.githubActionsUrl}`);
  }
  if (workflowRun.dispatchCommand) {
    console.log(`Release Publish dispatch command: ${workflowRun.dispatchCommand}`);
  }
  console.log(`Release Publish confirm input: ${workflowRun.inputs.confirm_publish}`);
  console.log(`Release Publish UI evidence input: ${workflowRun.inputs.ui_smoke_report}`);
}

function printGithubPushDiagnostics(githubPush) {
  if (!githubPush?.authChecked) {
    return;
  }

  console.log("");
  console.log("## GitHub Push Diagnostics");
  console.log("");
  console.log(`- SSH auth: ${githubPush.authReady ? "ready" : "blocked"}`);
  console.log(`- SSH command: \`${githubPush.authCommand ?? "ssh -o BatchMode=yes -T git@github.com"}\``);
  if (githubPush.githubSshKeySettingsUrl) {
    console.log(`- GitHub SSH key settings: ${githubPush.githubSshKeySettingsUrl}`);
  }
  if (githubPush.githubSshDocsUrl) {
    console.log(`- GitHub SSH setup docs: ${githubPush.githubSshDocsUrl}`);
  }

  if (githubPush.authMessage) {
    console.log(`- SSH message: \`${githubPush.authMessage}\``);
  }

  if (githubPush.sshAgent) {
    console.log(`- SSH agent: ${formatSshAgentMarkdown(githubPush.sshAgent)}`);
    for (const fingerprint of githubPush.sshAgent.fingerprints ?? []) {
      console.log(`- [x] Loaded key: \`${fingerprint}\``);
    }
  }

  if (githubPush.sshKeyCandidates) {
    console.log(`- SSH public key candidates: ${githubPush.sshKeyCandidates.publicKeyCount} file(s) in \`${githubPush.sshKeyCandidates.directory}\``);
    for (const key of githubPush.sshKeyCandidates.keys ?? []) {
      const loadDetail = key.loadCommand ? `; load: ${key.loadCommand}` : "";
      const detail = key.fingerprint ? `${key.file}: ${key.fingerprint}${loadDetail}` : `${key.file}: ${key.error}${loadDetail}`;
      console.log(`- [ ] Candidate: \`${detail}\``);
    }
  }

  for (const command of githubPush.sshKeyLoadCommands ?? []) {
    console.log(`- [ ] Load key: \`${command}\``);
  }

  for (const command of githubPush.sshPublicKeyReviewCommands ?? []) {
    console.log(`- [ ] Review public key: \`${command}\``);
  }
}

function printTrustedPublisherSetupSummary(setup) {
  if (!setup) {
    return;
  }

  console.log("");
  console.log("## Trusted Publisher Setup Summary");
  console.log("");

  if (setup.githubEnvironment) {
    console.log("### GitHub Environment");
    console.log("");
    console.log(`- Name: \`${setup.githubEnvironment.name}\``);
    console.log(`- Required workflow: \`${setup.githubEnvironment.requiredForWorkflow}\``);
    if (setup.githubEnvironment.githubSettingsUrl) {
      console.log(`- GitHub settings: ${setup.githubEnvironment.githubSettingsUrl}`);
    }
    console.log(`- Purpose: ${setup.githubEnvironment.purpose}`);
  }

  if (setup.releaseWorkflowInputs) {
    console.log("");
    console.log("### Release Publish Inputs");
    console.log("");
    console.log(`- version: \`${setup.releaseWorkflowInputs.version}\``);
    console.log(`- repository_url: \`${setup.releaseWorkflowInputs.repository_url}\``);
    console.log(`- npm_tag: \`${setup.releaseWorkflowInputs.npm_tag}\``);
    console.log(`- confirm_publish: \`${setup.releaseWorkflowInputs.confirm_publish}\``);
    console.log(`- ui_smoke_report: \`${setup.releaseWorkflowInputs.ui_smoke_report}\``);
  }

  if (Array.isArray(setup.packages) && setup.packages.length > 0) {
    console.log("");
    console.log("### npm Trusted Publishers");
    console.log("");
    console.log(`- Package count: ${setup.packageCount ?? setup.packages.length}`);
    for (const pkg of setup.packages) {
      const publisher = pkg.trustedPublisher;
      const accessUrl = pkg.npmAccessUrl ? `, npm access ${pkg.npmAccessUrl}` : "";
      console.log(`- [ ] \`${pkg.name}\`: provider \`${publisher.provider}\`, repository \`${publisher.organizationOrUser}/${publisher.repository}\`, workflow \`${publisher.workflow}\`, environment \`${publisher.environment}\`, allowed action \`${publisher.allowedAction}\`${accessUrl}`);
    }
  }
}

function printReleasePublishWorkflowRunSummary(workflowRun) {
  if (!workflowRun) {
    return;
  }

  console.log("");
  console.log("## Release Publish Workflow Run");
  console.log("");
  console.log(`- [ ] ${workflowRun.instruction}`);
  console.log(`- Workflow: \`${workflowRun.workflow}\``);
  if (workflowRun.githubActionsUrl) {
    console.log(`- GitHub Actions: ${workflowRun.githubActionsUrl}`);
  }
  if (workflowRun.dispatchCommand) {
    console.log(`- gh command: \`${workflowRun.dispatchCommand}\``);
  }
  console.log(`- version: \`${workflowRun.inputs.version}\``);
  console.log(`- repository_url: \`${workflowRun.inputs.repository_url}\``);
  console.log(`- npm_tag: \`${workflowRun.inputs.npm_tag}\``);
  console.log(`- confirm_publish: \`${workflowRun.inputs.confirm_publish}\``);
  console.log(`- ui_smoke_report: \`${workflowRun.inputs.ui_smoke_report}\``);

  if (Array.isArray(workflowRun.gates) && workflowRun.gates.length > 0) {
    console.log("");
    console.log("### Workflow Gates");
    console.log("");
    for (const gate of workflowRun.gates) {
      console.log(`- [ ] \`${gate}\``);
    }
  }
}

function createTrustedPublisherSetup(firstPublishResult) {
  const trustedPublishing = getStepResult(firstPublishResult, "trustedPublishing");
  if (!trustedPublishing) {
    return undefined;
  }
  const githubRepository = parseGitHubRepository(firstPublishResult.repositoryUrl ?? trustedPublishing.releaseWorkflowInputs?.repository_url);
  const githubSettingsUrl = githubRepository ? `https://github.com/${githubRepository.owner}/${githubRepository.repo}/settings/environments` : undefined;

  return {
    githubEnvironment: {
      ...trustedPublishing.githubEnvironment,
      githubSettingsUrl,
    },
    releaseWorkflowInputs: trustedPublishing.releaseWorkflowInputs,
    packageCount: trustedPublishing.packageCount ?? trustedPublishing.packages?.length ?? 0,
    packages: (trustedPublishing.packages ?? []).map((pkg) => ({
      ...pkg,
      npmPackageUrl: createNpmPackageUrl(pkg.name),
      npmAccessUrl: `${createNpmPackageUrl(pkg.name)}/access`,
    })),
  };
}

function createExternalSetupVerification(commands) {
  return {
    instruction: "Run these checks again after the GitHub push, protected GitHub npm environment, npm Trusted Publisher settings, and manual Release Publish workflow setup are complete.",
    commands,
    successCriteria: [
      "GitHub push preflight passes with --check-auth.",
      "First-publish status reports local readiness ready and no local blockers.",
      "First-publish preflight and trusted-publishing preflight pass for the same repository URL, version, and npm tag.",
      "Manual UI smoke checklist, inspection reports, structured report validation, browser-open inspection, quick e2e smoke, and full e2e pass before the Release Publish workflow run.",
    ],
  };
}

function createNpmPackageUrl(packageName) {
  return `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;
}

function createReleasePublishWorkflowRun(firstPublishResult) {
  if (!firstPublishResult?.releaseWorkflowInputs) {
    return undefined;
  }

  const githubRepository = parseGitHubRepository(firstPublishResult.repositoryUrl ?? firstPublishResult.releaseWorkflowInputs.repository_url);
  const workflowFilename = "release-publish.yml";

  return {
    workflow: ".github/workflows/release-publish.yml",
    workflowFilename,
    githubRepository: githubRepository ? `${githubRepository.owner}/${githubRepository.repo}` : undefined,
    githubActionsUrl: githubRepository ? `https://github.com/${githubRepository.owner}/${githubRepository.repo}/actions/workflows/${workflowFilename}` : undefined,
    dispatchCommand: githubRepository ? createWorkflowDispatchCommand({ githubRepository, workflowFilename, inputs: firstPublishResult.releaseWorkflowInputs }) : undefined,
    instruction: "Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete.",
    inputs: firstPublishResult.releaseWorkflowInputs,
    gates: firstPublishResult.releaseWorkflowGates ?? [],
  };
}

function createWorkflowDispatchCommand({ githubRepository, workflowFilename, inputs }) {
  return [
    "gh",
    "workflow",
    "run",
    workflowFilename,
    "--repo",
    `${githubRepository.owner}/${githubRepository.repo}`,
    "-f",
    `version=${inputs.version}`,
    "-f",
    `repository_url=${JSON.stringify(inputs.repository_url)}`,
    "-f",
    `npm_tag=${inputs.npm_tag}`,
    "-f",
    `confirm_publish=${inputs.confirm_publish}`,
    "-F",
    "ui_smoke_report=@.release/ui-smoke-report.json",
  ].join(" ");
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

function getStepResult(firstPublishResult, name) {
  return firstPublishResult?.steps?.find((step) => step.name === name)?.result;
}

function printManualUiSmokeChecklist(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return;
  }

  console.log("");
  console.log("## Manual UI Smoke Checklist");
  for (const target of targets) {
    console.log("");
    console.log(`### ${target.framework}`);
    console.log("");
    console.log(`- URL: ${target.url}`);
    console.log(`- Build: \`${target.buildCommand}\``);
    console.log(`- Preview: \`${target.previewCommand}\``);
    if (target.openCommand) {
      console.log(`- Open: \`${target.openCommand}\``);
    }
    if (Number.isInteger(target.openWaitTimeoutMs)) {
      console.log(`- Open wait timeout: \`${target.openWaitTimeoutMs}ms\``);
    }
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
    for (const check of target.accessibilityChecks ?? []) {
      console.log(`- [ ] ${check}`);
    }
  }
}

function printManualUiSmokeTargetsText(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return;
  }

  console.log("");
  console.log("Manual UI smoke targets:");
  for (const target of targets) {
    console.log(`- ${target.framework}: ${target.url}`);
    console.log(`  build: ${target.buildCommand}`);
    console.log(`  preview: ${target.previewCommand}`);
    if (target.openCommand) {
      console.log(`  open: ${target.openCommand}`);
    }
    if (Number.isInteger(target.openWaitTimeoutMs)) {
      console.log(`  open wait timeout: ${target.openWaitTimeoutMs}ms`);
    }
    console.log(`  grid accessible label: ${target.smokeCheck.gridLabel}`);
    console.log(`  primary smoke column id: ${target.smokeCheck.primaryColumnId}`);
    console.log(`  primary column label: ${target.smokeCheck.primaryColumnLabel}`);
    console.log(`  managed column count assertion: ${target.smokeCheck.managedColumnCount}`);
    console.log(`  minimum deep-scroll row index: ${target.smokeCheck.minimumDeepScrollRowIndex}`);
    console.log(`  maximum mounted virtual rows: ${target.smokeCheck.maxRenderedRowCount}`);
    console.log(`  loading state text: ${target.stateCheck.loadingText}`);
    console.log(`  error state text: ${target.stateCheck.errorText}`);
    console.log(`  invalid edit target: ${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}`);
    console.log(`  validation message: ${target.stateCheck.validationMessage}`);
    console.log(`  product workflow search: ${target.workflowCheck.searchQuery} -> ${target.workflowCheck.filteredRowId}`);
    console.log(`  product workflow valid edit: ${target.workflowCheck.validEditValue}`);
    console.log(`  persisted workflow column: ${target.workflowCheck.preferenceColumnLabel} (${target.workflowCheck.preferenceColumnId})`);
  }
}

function formatSshAgentMarkdown(sshAgent) {
  if (sshAgent.available) {
    return `${sshAgent.keyCount} loaded key(s)`;
  }

  return sshAgent.message ? `unavailable (${sshAgent.message})` : "unavailable";
}

function compactExternalActions(actions, { hasDetailedExternalSetupActions = false } = {}) {
  const uniqueActions = [...new Set(actions)];
  const hasGitPushCommand = uniqueActions.some((action) => action.startsWith("Run git push "));
  const hasSpecificReleaseWorkflowRun = uniqueActions.some((action) => (
    action.startsWith("Run .github/workflows/release-publish.yml manually with the generated ")
  ));

  return uniqueActions.filter((action) => {
    if (hasGitPushCommand && action === "Push the current release branch to the canonical public GitHub repository verified by pnpm release:github-push-preflight.") {
      return false;
    }

    if (hasSpecificReleaseWorkflowRun && action === "Run .github/workflows/release-publish.yml manually after the public GitHub push and npm Trusted Publisher setup are complete.") {
      return false;
    }

    if (hasSpecificReleaseWorkflowRun && action === "Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete.") {
      return false;
    }

    if (hasDetailedExternalSetupActions && action === "Create or confirm the protected GitHub environment named npm for .github/workflows/release-publish.yml.") {
      return false;
    }

    if (hasDetailedExternalSetupActions && action === "Configure npm Trusted Publisher settings for every publishable package using the trustedPublishing step output.") {
      return false;
    }

    return true;
  });
}

function getCommercializationStatus({ firstPublishReady, localReady, skipGithubPush }) {
  if (skipGithubPush && firstPublishReady) {
    return "First-publish gates are ready, but GitHub push readiness was skipped for CI verification; first publish still depends on a real local push preflight plus external GitHub and npm setup.";
  }

  if (localReady) {
    return "Local release gates are ready; first publish still depends on external GitHub and npm setup.";
  }

  return "Local first-publish readiness is blocked; resolve the reported local preflight failures first.";
}

function createCommercializationProgress({ firstPublishReady, githubPush, githubPushReady, localReady, releasePublishWorkflowRun, skipGithubPush, trustedPublisherSetup }) {
  const baseArgs = ["--repository-url", args.repositoryUrl];
  const releaseArgs = ["--version", releaseVersion, "--tag", args.tag, ...baseArgs];
  const stages = [
    {
      id: "localFirstPublishGates",
      label: "Local first-publish gates pass",
      completed: firstPublishReady,
      requiredActions: firstPublishReady ? [] : [
        "Resolve first-publish preflight blockers reported in local blockers, then rerun first-publish status.",
      ],
      verificationCommands: [
        formatCommand(["pnpm", "release:first-publish-preflight", "--", ...releaseArgs]),
      ],
    },
    {
      id: "githubPushReadiness",
      label: skipGithubPush ? "Real GitHub push readiness is checked outside CI skip mode" : "GitHub push readiness passes",
      completed: !skipGithubPush && githubPushReady,
      requiredActions: !skipGithubPush && githubPushReady ? [] : createGithubPushStageActions({ githubPush, skipGithubPush }),
      verificationCommands: [
        formatCommand(["pnpm", "release:github-push-preflight", "--", ...baseArgs, "--check-auth"]),
      ],
    },
    {
      id: "externalGithubNpmSetup",
      label: "External GitHub npm environment and npm Trusted Publisher setup are complete",
      completed: false,
      requiredActions: createExternalGithubNpmSetupActions(trustedPublisherSetup),
      verificationCommands: [
        formatCommand(["pnpm", "release:trusted-publishing", "--", ...releaseArgs]),
      ],
    },
    {
      id: "releasePublishWorkflow",
      label: "Manual release-publish.yml workflow has run successfully",
      completed: false,
      requiredActions: [
        releasePublishWorkflowRun?.instruction ?? "Run the protected Release Publish workflow manually after external setup is complete.",
      ],
      verificationCommands: [
        releasePublishWorkflowRun?.dispatchCommand ?? "Run .github/workflows/release-publish.yml manually from GitHub Actions after external setup is complete.",
      ],
    },
  ];
  const completedStages = stages.filter((stage) => stage.completed).length;
  const remainingStages = stages.filter((stage) => !stage.completed);
  const currentStageObject = stages.find((stage) => !stage.completed);
  const currentStageId = currentStageObject?.id ?? "published";
  const currentStage = currentStageObject?.label ?? "Published";
  const nextAction = getCommercializationNextAction({ firstPublishReady, githubPushReady, localReady, skipGithubPush });

  return {
    completedStages,
    remainingStageCount: remainingStages.length,
    totalStages: stages.length,
    percent: Math.round((completedStages / stages.length) * 100),
    currentStageId,
    currentStage,
    nextAction,
    nextRequiredActions: currentStageObject?.requiredActions ?? [],
    nextVerificationCommands: currentStageObject?.verificationCommands ?? [],
    remainingStages,
    stages,
  };
}

function createExternalGithubNpmSetupActions(trustedPublisherSetup) {
  if (!trustedPublisherSetup) {
    return [
      "Create or confirm the protected GitHub environment named npm for .github/workflows/release-publish.yml.",
      "Configure npm Trusted Publisher settings for every publishable package using the trustedPublishing step output.",
    ];
  }

  const environment = trustedPublisherSetup.githubEnvironment;
  const packages = trustedPublisherSetup.packages ?? [];
  const firstPackage = packages[0];
  const packageCount = trustedPublisherSetup.packageCount ?? packages.length;
  const actions = [
    environment?.githubSettingsUrl
      ? `Open ${environment.githubSettingsUrl} and create or confirm the protected GitHub environment named ${environment.name} for ${environment.requiredForWorkflow}.`
      : `Create or confirm the protected GitHub environment named ${environment?.name ?? "npm"} for ${environment?.requiredForWorkflow ?? ".github/workflows/release-publish.yml"}.`,
  ];

  if (packageCount > 0) {
    actions.push(`Configure npm Trusted Publisher settings for ${packageCount} publishable package(s) using the trustedPublisherSetup package entries.`);
  } else {
    actions.push("Configure npm Trusted Publisher settings for every publishable package using the trustedPublishing step output.");
  }

  if (firstPackage?.npmAccessUrl) {
    actions.push(`Start with ${firstPackage.name} at ${firstPackage.npmAccessUrl}, then repeat the same Trusted Publisher fields for the remaining package access URLs.`);
  }

  return actions;
}

function createCommercializationNextStep(progress) {
  const nextStage = progress.remainingStages[0];
  if (!nextStage) {
    return null;
  }

  return {
    id: nextStage.id,
    label: nextStage.label,
    completedStages: progress.completedStages,
    remainingStageCount: progress.remainingStageCount,
    totalStages: progress.totalStages,
    percent: progress.percent,
    requiredActions: nextStage.requiredActions,
    verificationCommands: nextStage.verificationCommands,
  };
}

function createGithubPushStageActions({ githubPush, skipGithubPush }) {
  if (skipGithubPush) {
    return [
      "Run a real local GitHub push preflight without --skip-github-push before first publish.",
    ];
  }

  const nextExternalActions = githubPush.result?.nextExternalActions ?? [];
  if (nextExternalActions.length > 0) {
    return nextExternalActions;
  }

  return [
    "Resolve GitHub push readiness blockers, including SSH authentication, then rerun the GitHub push preflight.",
  ];
}

function getCommercializationNextAction({ firstPublishReady, githubPushReady, localReady, skipGithubPush }) {
  if (!firstPublishReady) {
    return "Resolve the first-publish preflight blockers, then rerun pnpm release:first-publish-status.";
  }

  if (skipGithubPush) {
    return "Rerun without --skip-github-push from the local release branch before first publish.";
  }

  if (!githubPushReady) {
    return "Resolve GitHub push readiness blockers, then rerun pnpm release:github-push-preflight -- --check-auth.";
  }

  if (localReady) {
    return "Push the release branch, create the GitHub npm environment, configure npm Trusted Publisher settings, then run release-publish.yml.";
  }

  return "Rerun the first-publish status after resolving local blockers.";
}

function skippedGithubPushStep(repositoryUrl) {
  return {
    name: "githubPush",
    command: "skipped by --skip-github-push",
    status: 0,
    skipped: true,
    result: {
      repositoryUrl,
      ready: false,
      skipped: true,
      nextExternalActions: [
        "Run pnpm release:github-push-preflight -- --repository-url <public-git-url> --check-auth from the release branch before first publish.",
      ],
    },
  };
}

function createNextVerificationCommands() {
  const baseArgs = [
    "--repository-url",
    args.repositoryUrl,
  ];
  const releaseArgs = [
    "--version",
    releaseVersion,
    "--tag",
    args.tag,
    ...baseArgs,
  ];
  const sshRecoveryCommands = !args.skipGithubPush && githubPush.result?.authChecked && githubPush.result?.authReady === false
    ? [
        ...(githubPush.result?.sshKeyLoadCommands ?? []),
        githubPush.result?.authCommand,
      ].filter(Boolean)
    : [];

  return [
    ...sshRecoveryCommands,
    ["pnpm", "release:github-push-preflight", "--", ...baseArgs, "--check-auth"],
    ["pnpm", "release:first-publish-status", "--", ...releaseArgs, "--check-auth"],
    ["pnpm", "release:first-publish-preflight", "--", ...releaseArgs],
    ["pnpm", "release:trusted-publishing", "--", ...releaseArgs],
    ...uiSmokeVerificationCommandArgs,
  ].map(formatVerificationCommand);
}

function formatVerificationCommand(command) {
  return Array.isArray(command) ? formatCommand(command) : command;
}

function runJsonStep(name, command) {
  try {
    const stdout = execFileSync(process.execPath, command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return {
      name,
      command: `node ${command.map(shellQuote).join(" ")}`,
      status: 0,
      result: JSON.parse(stdout),
    };
  } catch (error) {
    return {
      name,
      command: `node ${command.map(shellQuote).join(" ")}`,
      status: error.status ?? 1,
      result: parseJson(error.stdout?.toString()),
      stderr: error.stderr?.toString().trim() || undefined,
    };
  }
}

function collectFailures(step) {
  const failures = step.result?.failures ?? [];
  if (failures.length > 0) {
    return failures;
  }

  if (step.status !== 0) {
    return [`${step.name} failed${step.stderr ? `: ${step.stderr}` : ""}`];
  }

  return [];
}

function hasFailures(value) {
  return Array.isArray(value?.failures) && value.failures.length > 0;
}

function createGithubPushAuthArgs() {
  if (!args.checkAuth) {
    return [];
  }

  return [
    "--check-auth",
    "--ssh-command",
    args.sshCommand,
    "--ssh-add-command",
    args.sshAddCommand,
    "--ssh-dir",
    args.sshDir,
    "--ssh-keygen-command",
    args.sshKeygenCommand,
  ];
}

function parseArgs(argv) {
  const parsed = {
    checkAuth: false,
    json: false,
    markdown: false,
    nextStep: false,
    repositoryUrl: undefined,
    skipGithubPush: false,
    sshAddCommand: "ssh-add",
    sshCommand: "ssh",
    sshDir: join(homedir(), ".ssh"),
    sshKeygenCommand: "ssh-keygen",
    tag: "latest",
    version: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--check-auth") {
      parsed.checkAuth = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
    } else if (arg === "--next-step") {
      parsed.nextStep = true;
    } else if (arg === "--skip-github-push") {
      parsed.skipGithubPush = true;
    } else if (arg === "--repository-url") {
      parsed.repositoryUrl = requireArgValue(argv, index, "--repository-url");
      index += 1;
    } else if (arg?.startsWith("--repository-url=")) {
      parsed.repositoryUrl = arg.slice("--repository-url=".length);
      requireNonEmpty(parsed.repositoryUrl, "--repository-url");
    } else if (arg === "--ssh-command") {
      parsed.sshCommand = requireArgValue(argv, index, "--ssh-command");
      index += 1;
    } else if (arg?.startsWith("--ssh-command=")) {
      parsed.sshCommand = arg.slice("--ssh-command=".length);
      requireNonEmpty(parsed.sshCommand, "--ssh-command");
    } else if (arg === "--ssh-add-command") {
      parsed.sshAddCommand = requireArgValue(argv, index, "--ssh-add-command");
      index += 1;
    } else if (arg?.startsWith("--ssh-add-command=")) {
      parsed.sshAddCommand = arg.slice("--ssh-add-command=".length);
      requireNonEmpty(parsed.sshAddCommand, "--ssh-add-command");
    } else if (arg === "--ssh-dir") {
      parsed.sshDir = requireArgValue(argv, index, "--ssh-dir");
      index += 1;
    } else if (arg?.startsWith("--ssh-dir=")) {
      parsed.sshDir = arg.slice("--ssh-dir=".length);
      requireNonEmpty(parsed.sshDir, "--ssh-dir");
    } else if (arg === "--ssh-keygen-command") {
      parsed.sshKeygenCommand = requireArgValue(argv, index, "--ssh-keygen-command");
      index += 1;
    } else if (arg?.startsWith("--ssh-keygen-command=")) {
      parsed.sshKeygenCommand = arg.slice("--ssh-keygen-command=".length);
      requireNonEmpty(parsed.sshKeygenCommand, "--ssh-keygen-command");
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

  requireNonEmpty(parsed.repositoryUrl, "--repository-url");
  requireNonEmpty(parsed.sshAddCommand, "--ssh-add-command");
  requireNonEmpty(parsed.sshCommand, "--ssh-command");
  requireNonEmpty(parsed.sshDir, "--ssh-dir");
  requireNonEmpty(parsed.sshKeygenCommand, "--ssh-keygen-command");
  if (parsed.skipGithubPush && parsed.checkAuth) {
    throw new Error("--skip-github-push cannot be combined with --check-auth");
  }
  requireValidNpmTag(parsed.tag);
  if (parsed.version !== undefined) {
    requireValidSemver(parsed.version);
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

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function parseJson(value) {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
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
