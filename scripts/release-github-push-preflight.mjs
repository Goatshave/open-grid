import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const githubSshKeySettingsUrl = "https://github.com/settings/keys";
const githubSshDocsUrl = "https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account";
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`GitHub push preflight failed: ${error.message}`);
  process.exit(1);
}

const failures = [];
const result = {
  repositoryUrl: args.repositoryUrl,
  remote: args.remote,
  branch: args.branch,
  remoteUrl: undefined,
  remoteTransport: undefined,
  workingTreeClean: false,
  aheadCount: 0,
  behindCount: 0,
  authChecked: args.checkAuth,
  authReady: undefined,
  authCommand: args.checkAuth ? `${args.sshCommand} -o BatchMode=yes -T git@github.com` : undefined,
  authMessage: undefined,
  githubSshKeySettingsUrl,
  githubSshDocsUrl,
  sshAgent: undefined,
  sshKeyCandidates: undefined,
  sshKeyLoadCommands: [],
  sshPublicKeyReviewCommands: [],
  head: undefined,
  pushCommand: undefined,
  ready: false,
  nextExternalActions: [],
  nextVerificationCommands: [],
};

if (!runGit(["rev-parse", "--is-inside-work-tree"], { optional: true })?.trim().includes("true")) {
  failures.push(`${root}: must be inside a git worktree`);
} else {
  result.branch = args.branch ?? runGit(["branch", "--show-current"], { optional: true })?.trim();

  if (!result.branch) {
    failures.push("current git branch could not be resolved; pass --branch explicitly");
  }

  result.remoteUrl = runGit(["remote", "get-url", args.remote], { optional: true })?.trim();
  if (!result.remoteUrl) {
    failures.push(`${args.remote}: git remote is required before first publish`);
  } else if (normalizeRepositoryUrl(result.remoteUrl) !== normalizeRepositoryUrl(args.repositoryUrl)) {
    failures.push(`${args.remote}: remote URL ${JSON.stringify(result.remoteUrl)} must match --repository-url ${JSON.stringify(args.repositoryUrl)}`);
  } else {
    result.remoteTransport = getGitHubRemoteTransport(result.remoteUrl);
  }

  const porcelain = runGit(["status", "--porcelain"], { optional: true }) ?? "";
  result.workingTreeClean = porcelain.trim().length === 0;
  if (!result.workingTreeClean) {
    failures.push("working tree must be clean before pushing the first publish branch");
  }

  if (result.branch) {
    const remoteRef = `${args.remote}/${result.branch}`;
    if (!runGit(["rev-parse", "--verify", "--quiet", remoteRef], { optional: true })?.trim()) {
      failures.push(`${remoteRef}: remote tracking ref is required; run git fetch ${args.remote} ${result.branch} before this preflight`);
    } else {
      result.aheadCount = Number(runGit(["rev-list", "--count", `${remoteRef}..HEAD`], { optional: true })?.trim() ?? 0);
      result.behindCount = Number(runGit(["rev-list", "--count", `HEAD..${remoteRef}`], { optional: true })?.trim() ?? 0);

      if (result.behindCount > 0) {
        failures.push(`${result.branch}: branch is ${result.behindCount} commit(s) behind ${remoteRef}; reconcile before first publish`);
      }
    }

    result.pushCommand = `git push -u ${args.remote} ${result.branch}`;
  }

  if (args.checkAuth && result.remoteUrl) {
    result.sshAgent = readSshAgent(args.sshAddCommand);
    result.sshKeyCandidates = readPublicSshKeyCandidates(args.sshDir, args.sshKeygenCommand, args.sshAddCommand);
    result.sshKeyLoadCommands = createSshKeyLoadCommands(result.sshKeyCandidates);
    result.sshPublicKeyReviewCommands = createSshPublicKeyReviewCommands(result.sshKeyCandidates);
    if (!isGitHubSshUrl(result.remoteUrl)) {
      failures.push(`--check-auth requires a GitHub SSH remote URL; ${args.remote} is ${JSON.stringify(result.remoteUrl)}`);
      result.authReady = false;
    } else {
      const auth = runGitHubSshAuth(args.sshCommand);
      result.authReady = auth.ready;
      result.authMessage = auth.message;
      if (!auth.ready) {
        failures.push("git@github.com: SSH authentication failed; load a GitHub key into ssh-agent or configure repository access before pushing");
      }
    }
  }

  const headSha = runGit(["rev-parse", "HEAD"], { optional: true })?.trim();
  if (headSha) {
    result.head = {
      sha: headSha,
      subject: runGit(["log", "-1", "--format=%s"], { optional: true })?.trim() ?? "",
    };
  }
}

result.ready = failures.length === 0;
result.nextVerificationCommands = createNextVerificationCommands();
result.nextExternalActions = result.ready
  ? [
      result.aheadCount > 0
        ? `Run ${result.pushCommand} with GitHub credentials available.`
        : "No local commits are ahead of the remote tracking branch.",
      result.authChecked
        ? "SSH authentication was checked in BatchMode; protected branch and repository permissions are still proven by the actual git push."
        : "Optionally rerun with --check-auth to verify GitHub SSH key availability in BatchMode before pushing.",
      "Confirm the pushed repository is public or otherwise accessible to npm provenance checks.",
      "Continue with pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth using the same repository URL before configuring npm Trusted Publisher settings.",
    ]
  : createFailureExternalActions();

if (args.json) {
  console.log(JSON.stringify(failures.length > 0 ? { ...result, failures } : result, null, 2));
} else if (args.markdown) {
  printMarkdownReport(failures.length > 0 ? { ...result, failures } : result);
} else if (failures.length > 0) {
  console.error("GitHub push preflight failed:");
  printContext((line) => console.error(line));
  console.error("");
  console.error("Failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("");
  printNextActions((line) => console.error(line));
} else {
  console.log("GitHub push preflight passed.");
  printContext((line) => console.log(line));
  console.log("");
  printNextActions((line) => console.log(line));
}

if (failures.length > 0) {
  process.exitCode = 1;
}

function printContext(writeLine) {
  writeLine(`Repository URL: ${result.repositoryUrl}`);
  writeLine(`Remote: ${result.remote}`);
  writeLine(`Remote URL: ${result.remoteUrl ?? "(missing)"}`);
  writeLine(`Remote transport: ${result.remoteTransport ?? "(unknown)"}`);
  writeLine(`Branch: ${result.branch ?? "(missing)"}`);
  writeLine(`Working tree: ${result.workingTreeClean ? "clean" : "dirty"}`);
  writeLine(`Ahead of remote: ${result.aheadCount}`);
  writeLine(`Behind remote: ${result.behindCount}`);
  writeLine(`SSH auth check: ${formatAuthState()}`);
  writeLine(`GitHub SSH key settings: ${result.githubSshKeySettingsUrl}`);
  writeLine(`GitHub SSH setup docs: ${result.githubSshDocsUrl}`);
  writeLine(`SSH agent: ${formatSshAgentState()}`);
  writeLine(`SSH public key candidates: ${formatSshKeyCandidatesState()}`);
  writeLine(`Head: ${result.head ? `${result.head.sha.slice(0, 12)} ${result.head.subject}` : "(missing)"}`);
  writeLine(`Push command: ${result.pushCommand ?? "(unavailable)"}`);
}

function createNextVerificationCommands() {
  const baseArgs = [
    "--repository-url",
    args.repositoryUrl,
  ];
  const sshRecoveryCommands = result.authChecked && result.authReady === false
    ? [
        ...result.sshKeyLoadCommands,
        result.authCommand,
      ].filter(Boolean)
    : [];

  return [
    ...sshRecoveryCommands,
    ["git", "push", "-u", args.remote, result.branch ?? args.branch ?? "<branch>"],
    ["pnpm", "release:github-push-preflight", "--", ...baseArgs, "--check-auth"],
    ["pnpm", "release:first-publish-status", "--", ...baseArgs, "--check-auth"],
    ["pnpm", "release:first-publish-preflight", "--", ...baseArgs],
    ["pnpm", "release:trusted-publishing", "--", ...baseArgs],
  ].map(formatVerificationCommand);
}

function formatVerificationCommand(command) {
  return Array.isArray(command) ? formatCommand(command) : command;
}

function createFailureExternalActions() {
  const actions = [];

  if (result.authChecked && result.authReady === false) {
    if (result.sshAgent?.available === false) {
      actions.push(`SSH agent identities could not be listed: ${result.sshAgent.message || "ssh-add -l failed"}`);
    } else if (result.sshAgent?.keyCount === 0) {
      actions.push("No SSH identities are loaded in the current agent; load a GitHub SSH key before rerunning this preflight.");
      if ((result.sshKeyCandidates?.publicKeyCount ?? 0) > 0) {
        actions.push("Review sshKeyCandidates and add the matching public key to the GitHub account or load the paired private key into ssh-agent.");
        actions.push(`Open ${githubSshKeySettingsUrl} to add the matching public key if it is not already registered with the GitHub account.`);
        actions.push(`Use ${githubSshDocsUrl} for GitHub's SSH key registration steps.`);
        for (const command of result.sshPublicKeyReviewCommands) {
          actions.push(`Run ${command} to print the public key content to register with GitHub.`);
        }
        for (const command of result.sshKeyLoadCommands) {
          actions.push(`Run ${command} to load the private key paired with a discovered public key.`);
        }
      }
    } else {
      actions.push("Run ssh-add -l to confirm the loaded SSH key fingerprint matches a GitHub account key with repository write access.");
    }
    actions.push("Load a GitHub SSH key with ssh-add <path-to-private-key>, or add a public key to the GitHub account that can write to this repository.");
    actions.push("Rerun ssh -o BatchMode=yes -T git@github.com and confirm GitHub reports successful authentication before pushing.");
  } else {
    actions.push("Fix the reported git repository, remote, branch, or working-tree issue before first publish.");
  }

  actions.push("Rerun this preflight before configuring npm Trusted Publisher settings.");
  return actions;
}

function printNextActions(writeLine) {
  writeLine("Next external actions:");
  for (const action of result.nextExternalActions) {
    writeLine(`- ${action}`);
  }
  writeLine("");
  writeLine("Next verification commands:");
  for (const command of result.nextVerificationCommands) {
    writeLine(`- ${command}`);
  }
}

function printMarkdownReport(report) {
  console.log("# GitHub Push Preflight Report");
  console.log("");
  console.log(`- Repository URL: ${report.repositoryUrl}`);
  console.log(`- Remote: ${report.remote}`);
  console.log(`- Remote URL: ${report.remoteUrl ?? "(missing)"}`);
  console.log(`- Remote transport: ${report.remoteTransport ?? "(unknown)"}`);
  console.log(`- Branch: ${report.branch ?? "(missing)"}`);
  console.log(`- Result: ${report.ready ? "passed" : "blocked"}`);
  console.log(`- Working tree: ${report.workingTreeClean ? "clean" : "dirty"}`);
  console.log(`- Ahead of remote: ${report.aheadCount}`);
  console.log(`- Behind remote: ${report.behindCount}`);
  console.log(`- SSH auth check: ${formatAuthState()}`);
  console.log(`- GitHub SSH key settings: ${report.githubSshKeySettingsUrl}`);
  console.log(`- GitHub SSH setup docs: ${report.githubSshDocsUrl}`);
  console.log(`- SSH agent: ${formatSshAgentState()}`);
  console.log(`- SSH public key candidates: ${formatSshKeyCandidatesState()}`);
  console.log(`- Head: ${report.head ? `${report.head.sha.slice(0, 12)} ${report.head.subject}` : "(missing)"}`);
  console.log(`- Push command: ${report.pushCommand ?? "(unavailable)"}`);

  if (report.failures?.length > 0) {
    console.log("");
    console.log("## Failures");
    for (const failure of report.failures) {
      console.log(`- [ ] ${failure}`);
    }
  }

  if (report.authChecked && report.sshAgent?.fingerprints?.length > 0) {
    console.log("");
    console.log("## Loaded SSH Keys");
    for (const fingerprint of report.sshAgent.fingerprints) {
      console.log(`- [x] \`${fingerprint}\``);
    }
  }

  if (report.authChecked && report.sshKeyCandidates?.keys?.length > 0) {
    console.log("");
    console.log("## SSH Public Key Candidates");
    for (const key of report.sshKeyCandidates.keys) {
      const loadDetail = key.loadCommand ? `; load: ${key.loadCommand}` : "";
      const detail = key.fingerprint ? `${key.file}: ${key.fingerprint}${loadDetail}` : `${key.file}: ${key.error}${loadDetail}`;
      console.log(`- [ ] \`${detail}\``);
    }
  }

  if (report.authChecked && report.sshKeyLoadCommands?.length > 0) {
    console.log("");
    console.log("## SSH Key Load Commands");
    for (const command of report.sshKeyLoadCommands) {
      console.log(`- [ ] \`${command}\``);
    }
  }

  if (report.authChecked && report.sshPublicKeyReviewCommands?.length > 0) {
    console.log("");
    console.log("## SSH Public Key Review Commands");
    for (const command of report.sshPublicKeyReviewCommands) {
      console.log(`- [ ] \`${command}\``);
    }
  }

  console.log("");
  console.log("## Push Readiness");
  console.log(`- [${report.workingTreeClean ? "x" : " "}] Working tree is clean`);
  console.log(`- [${report.remoteUrl ? "x" : " "}] Git remote is configured`);
  console.log(`- [${report.behindCount === 0 ? "x" : " "}] Branch is not behind the remote tracking ref`);
  console.log(`- [${report.authChecked && report.authReady ? "x" : " "}] GitHub SSH authentication is ready`);
  console.log(`- [${report.ready ? "x" : " "}] Ready for ${report.pushCommand ?? "git push"}`);

  console.log("");
  console.log("## Next External Actions");
  for (const action of report.nextExternalActions) {
    console.log(`- [ ] ${action}`);
  }

  console.log("");
  console.log("## Next Verification Commands");
  for (const command of report.nextVerificationCommands) {
    console.log(`- [ ] \`${command}\``);
  }
}

function parseArgs(argv) {
  const parsed = {
    branch: undefined,
    checkAuth: false,
    json: false,
    markdown: false,
    remote: "origin",
    repositoryUrl: undefined,
    sshAddCommand: "ssh-add",
    sshCommand: "ssh",
    sshDir: join(homedir(), ".ssh"),
    sshKeygenCommand: "ssh-keygen",
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
    } else if (arg === "--branch") {
      parsed.branch = requireArgValue(argv, index, "--branch");
      index += 1;
    } else if (arg?.startsWith("--branch=")) {
      parsed.branch = arg.slice("--branch=".length);
      requireNonEmpty(parsed.branch, "--branch");
    } else if (arg === "--remote") {
      parsed.remote = requireArgValue(argv, index, "--remote");
      index += 1;
    } else if (arg?.startsWith("--remote=")) {
      parsed.remote = arg.slice("--remote=".length);
      requireNonEmpty(parsed.remote, "--remote");
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
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  requireNonEmpty(parsed.remote, "--remote");
  requireNonEmpty(parsed.repositoryUrl, "--repository-url");
  requireNonEmpty(parsed.sshAddCommand, "--ssh-add-command");
  requireNonEmpty(parsed.sshCommand, "--ssh-command");
  requireNonEmpty(parsed.sshDir, "--ssh-dir");
  requireNonEmpty(parsed.sshKeygenCommand, "--ssh-keygen-command");
  if (!parseGitHubRepository(parsed.repositoryUrl)) {
    throw new Error("--repository-url must be a GitHub URL such as git+https://github.com/OWNER/REPO.git");
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

function runGit(args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", options.optional ? "ignore" : "pipe"],
    });
  } catch (error) {
    if (options.optional) {
      return undefined;
    }
    throw error;
  }
}

function runGitHubSshAuth(sshCommand) {
  try {
    const stdout = execFileSync(sshCommand, ["-o", "BatchMode=yes", "-T", "git@github.com"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ready: true, message: stdout.trim() };
  } catch (error) {
    const message = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    return {
      ready: /successfully authenticated/i.test(message),
      message,
    };
  }
}

function readSshAgent(sshAddCommand) {
  try {
    const stdout = execFileSync(sshAddCommand, ["-l"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const fingerprints = stdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      available: true,
      keyCount: fingerprints.length,
      fingerprints,
    };
  } catch (error) {
    const message = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    const noIdentities = /agent has no identities|no identities/i.test(message);

    return {
      available: noIdentities,
      keyCount: 0,
      fingerprints: [],
      message,
    };
  }
}

function readPublicSshKeyCandidates(sshDir, sshKeygenCommand, sshAddCommand) {
  if (!existsSync(sshDir)) {
    return {
      directory: sshDir,
      publicKeyCount: 0,
      keys: [],
      message: "SSH directory does not exist.",
    };
  }

  const publicKeyFiles = readdirSync(sshDir)
    .filter((name) => name.endsWith(".pub"))
    .sort();
  const keys = publicKeyFiles.map((name) => {
    const path = join(sshDir, name);
    const pairedPrivateKey = path.endsWith(".pub") ? path.slice(0, -".pub".length) : undefined;
    const privateKeyExists = Boolean(pairedPrivateKey && existsSync(pairedPrivateKey));
    const pairedKey = privateKeyExists
      ? {
          pairedPrivateKey,
          loadCommand: formatCommand([sshAddCommand, pairedPrivateKey]),
        }
      : {};

    try {
      return {
        file: path,
        fingerprint: execFileSync(sshKeygenCommand, ["-lf", path], {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim(),
        ...pairedKey,
      };
    } catch (error) {
      return {
        file: path,
        error: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() || "ssh-keygen failed",
        ...pairedKey,
      };
    }
  });

  return {
    directory: sshDir,
    publicKeyCount: keys.length,
    keys,
  };
}

function createSshKeyLoadCommands(sshKeyCandidates) {
  return [
    ...new Set((sshKeyCandidates?.keys ?? [])
      .map((key) => key.loadCommand)
      .filter(Boolean)),
  ];
}

function createSshPublicKeyReviewCommands(sshKeyCandidates) {
  return [
    ...new Set((sshKeyCandidates?.keys ?? [])
      .map((key) => key.file ? formatCommand(["cat", key.file]) : undefined)
      .filter(Boolean)),
  ];
}

function formatAuthState() {
  if (!result.authChecked) {
    return "not checked";
  }

  if (result.authReady) {
    return `ready via ${result.authCommand}`;
  }

  return `failed via ${result.authCommand}`;
}

function formatSshAgentState() {
  if (!result.authChecked) {
    return "not checked";
  }

  if (!result.sshAgent) {
    return "not checked";
  }

  if (result.sshAgent.available) {
    return `${result.sshAgent.keyCount} loaded key(s)`;
  }

  return result.sshAgent.message ? `unavailable (${result.sshAgent.message})` : "unavailable";
}

function formatSshKeyCandidatesState() {
  if (!result.authChecked) {
    return "not checked";
  }

  if (!result.sshKeyCandidates) {
    return "not checked";
  }

  return `${result.sshKeyCandidates.publicKeyCount} public key file(s) in ${result.sshKeyCandidates.directory}`;
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function formatCommand(command) {
  return command.map(shellQuote).join(" ");
}

function normalizeRepositoryUrl(repositoryUrl) {
  const parsed = parseGitHubRepository(repositoryUrl);
  return parsed ? `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}` : repositoryUrl;
}

function isGitHubSshUrl(repositoryUrl) {
  return /^git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?$/.test(repositoryUrl.replace(/^git\+/, ""));
}

function getGitHubRemoteTransport(repositoryUrl) {
  const normalized = repositoryUrl.replace(/^git\+/, "");
  if (/^git@github\.com:/.test(normalized)) {
    return "ssh";
  }
  if (/^https:\/\/github\.com\//.test(normalized)) {
    return "https";
  }
  return "unknown";
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
