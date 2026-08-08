import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import {
  defaultUiSmokeOpenWaitTimeoutMs,
  formatPnpmCommand,
  formatUiSmokeOpenCommand,
  uiSmokeTargets,
} from "./ui-smoke-targets.mjs";
import { getUiSmokeSourceState } from "./ui-smoke-source-state.mjs";

let args;
let selectedTargets;

try {
  args = parseArgs(process.argv.slice(2));
  selectedTargets = selectTargets(args.framework);
} catch (error) {
  console.error(`UI smoke preview failed: ${error.message}`);
  process.exit(1);
}

if (args.report) {
  try {
    const source = getUiSmokeSourceState();
    const reportOutput = args.json
      ? createInspectionReportJson(selectedTargets, source)
      : createInspectionReportMarkdown(selectedTargets, source);
    writeReportOutput(reportOutput);
    console.log(reportOutput);
    process.exit(0);
  } catch (error) {
    console.error(`UI smoke preview failed: unable to capture source state: ${error.message}`);
    process.exit(1);
  }
}

if (args.list || args.markdown) {
  if (args.json) {
    printTargetsJson(selectedTargets);
  } else if (args.markdown) {
    printTargetsMarkdown(selectedTargets);
  } else {
    printTargets(selectedTargets);
  }
  process.exit(0);
}

if (args.json) {
  printTargetsJson(selectedTargets);
  process.exit(0);
}

if (args.markdown) {
  printTargetsMarkdown(selectedTargets);
  process.exit(0);
}

let previewChildren = [];

try {
  if (!args.skipBuild) {
    for (const target of selectedTargets) {
      for (const command of target.buildCommands) {
        await runPnpm(command);
      }
    }
  }

  previewChildren = selectedTargets.map((target) => startPreview(target));
  const previewExit = waitForPreviewExit(previewChildren);
  previewExit.catch(() => {});
  if (args.open) {
    await waitForTargetsReady(selectedTargets, args.waitTimeoutMs);
  }
  printTargets(selectedTargets);
  if (args.open) {
    await openTargets(selectedTargets);
  }
  console.log("");
  console.log("Press Ctrl+C to stop all preview servers.");
  await previewExit;
} catch (error) {
  stopPreviewChildren(previewChildren, "SIGTERM");
  console.error(`UI smoke preview failed: ${error.message}`);
  process.exitCode = 1;
}

function printTargets(targets) {
  console.log("UI smoke preview targets:");
  for (const target of targets) {
    console.log(`- ${target.framework}: ${target.url}`);
    console.log(`  build: ${target.buildCommands.map(formatPnpmCommand).join(" && ")}`);
    console.log(`  preview: ${formatPnpmCommand(target.previewCommand)}`);
    console.log(`  open: ${formatUiSmokeOpenCommand(target)}`);
    console.log(`  open wait timeout: ${args.waitTimeoutMs}ms`);
    console.log("  smoke assertions:");
    console.log(`  - grid accessible label: ${target.smokeCheck.gridLabel}`);
    console.log(`  - primary column id: ${target.smokeCheck.primaryColumnId}`);
    console.log(`  - primary column label: ${target.smokeCheck.primaryColumnLabel}`);
    console.log(`  - managed column count: ${target.smokeCheck.managedColumnCount}`);
    console.log(`  - direct header pinning controls: ${target.smokeCheck.headerControls.directPinningControls ? "shown" : "hidden"}`);
    console.log(`  - header action menu: ${target.smokeCheck.headerControls.actionMenu ? "shown" : "hidden"}`);
    console.log(`  - semantic cell markers: ${formatSemanticMarkers(target.smokeCheck.semanticMarkers)}`);
    console.log(`  - light product theme: accent ${target.smokeCheck.productThemeTokens.light.accent}, focus ${target.smokeCheck.productThemeTokens.light.focus}, radius ${target.smokeCheck.productThemeTokens.light.radiusLarge}`);
    console.log(`  - dark product theme: accent ${target.smokeCheck.productThemeTokens.dark.accent}, focus ${target.smokeCheck.productThemeTokens.dark.focus}, radius ${target.smokeCheck.productThemeTokens.dark.radiusLarge}`);
    console.log(`  - minimum deep-scroll row index: ${target.smokeCheck.minimumDeepScrollRowIndex}`);
    console.log(`  - maximum mounted virtual rows: ${target.smokeCheck.maxRenderedRowCount}`);
    console.log(`  - 200% equivalent viewport: ${target.smokeCheck.zoomEquivalentViewport.width}x${target.smokeCheck.zoomEquivalentViewport.height} CSS px at DPR ${target.smokeCheck.zoomEquivalentViewport.deviceScaleFactor}`);
    console.log(`  - loading state text: ${target.stateCheck.loadingText}`);
    console.log(`  - error state text: ${target.stateCheck.errorText}`);
    console.log(`  - invalid edit target: ${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}`);
    console.log(`  - validation message: ${target.stateCheck.validationMessage}`);
    console.log(`  - product workflow search: ${target.workflowCheck.searchQuery} -> ${target.workflowCheck.filteredRowId}`);
    console.log(`  - product workflow edit: ${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId} -> ${target.workflowCheck.validEditValue}`);
    console.log(`  - persisted workflow column: ${target.workflowCheck.preferenceColumnLabel} (${target.workflowCheck.preferenceColumnId})`);
    console.log("  manual checks:");
    for (const check of target.manualChecks) {
      console.log(`  - ${check}`);
    }
    console.log("  accessibility checks:");
    for (const check of target.accessibilityChecks) {
      console.log(`  - ${check}`);
    }
  }
}

function printTargetsJson(targets) {
  console.log(JSON.stringify({
    waitTimeoutMs: args.waitTimeoutMs,
    targets: targets.map((target) => ({
      framework: target.framework,
      url: target.url,
      port: target.port,
      buildCommands: target.buildCommands.map((command) => ["pnpm", ...command]),
      previewCommand: ["pnpm", ...target.previewCommand],
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", target.framework, "--open"],
      smokeCheck: target.smokeCheck,
      stateCheck: target.stateCheck,
      workflowCheck: target.workflowCheck,
      manualChecks: target.manualChecks,
      accessibilityChecks: target.accessibilityChecks,
    })),
  }, null, 2));
}

function printTargetsMarkdown(targets) {
  console.log("# UI Smoke Preview Checklist");
  console.log("");
  console.log("Run `pnpm preview:smoke-ui -- --open` to open each preview URL, then mark the checks below during manual verification.");
  console.log(`Open wait timeout: \`${args.waitTimeoutMs}ms\`.`);

  for (const target of targets) {
    console.log("");
    console.log(`## ${target.framework}`);
    console.log("");
    console.log(`- URL: ${target.url}`);
    console.log(`- Build: \`${target.buildCommands.map(formatPnpmCommand).join(" && ")}\``);
    console.log(`- Preview: \`${formatPnpmCommand(target.previewCommand)}\``);
    console.log(`- Open: \`${formatUiSmokeOpenCommand(target)}\``);
    console.log(`- Open wait timeout: \`${args.waitTimeoutMs}ms\``);
    console.log(`- Grid accessible label: \`${target.smokeCheck.gridLabel}\``);
    console.log(`- Primary smoke column id: \`${target.smokeCheck.primaryColumnId}\``);
    console.log(`- Primary column label: \`${target.smokeCheck.primaryColumnLabel}\``);
    console.log(`- Managed column count assertion: \`${target.smokeCheck.managedColumnCount}\``);
    console.log(`- Direct header pinning controls: \`${target.smokeCheck.headerControls.directPinningControls ? "shown" : "hidden"}\``);
    console.log(`- Header action menu: \`${target.smokeCheck.headerControls.actionMenu ? "shown" : "hidden"}\``);
    console.log(`- Semantic cell markers: \`${formatSemanticMarkers(target.smokeCheck.semanticMarkers)}\``);
    console.log(`- Light product theme tokens: \`accent ${target.smokeCheck.productThemeTokens.light.accent}, focus ${target.smokeCheck.productThemeTokens.light.focus}, radius ${target.smokeCheck.productThemeTokens.light.radiusLarge}\``);
    console.log(`- Dark product theme tokens: \`accent ${target.smokeCheck.productThemeTokens.dark.accent}, focus ${target.smokeCheck.productThemeTokens.dark.focus}, radius ${target.smokeCheck.productThemeTokens.dark.radiusLarge}\``);
    console.log(`- Minimum deep-scroll row index: \`${target.smokeCheck.minimumDeepScrollRowIndex}\``);
    console.log(`- Maximum mounted virtual rows: \`${target.smokeCheck.maxRenderedRowCount}\``);
    console.log(`- 200% equivalent viewport: \`${target.smokeCheck.zoomEquivalentViewport.width}x${target.smokeCheck.zoomEquivalentViewport.height} CSS px at DPR ${target.smokeCheck.zoomEquivalentViewport.deviceScaleFactor}\``);
    console.log(`- Loading state text: \`${target.stateCheck.loadingText}\``);
    console.log(`- Error state text: \`${target.stateCheck.errorText}\``);
    console.log(`- Invalid edit target: \`${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}\``);
    console.log(`- Validation message: \`${target.stateCheck.validationMessage}\``);
    console.log(`- Product workflow search: \`${target.workflowCheck.searchQuery}\` -> \`${target.workflowCheck.filteredRowId}\``);
    console.log(`- Product workflow valid edit: \`${target.workflowCheck.validEditValue}\``);
    console.log(`- Persisted workflow column: \`${target.workflowCheck.preferenceColumnLabel}\` (\`${target.workflowCheck.preferenceColumnId}\`)`);
    console.log("");

    console.log("### Functional Checks");
    console.log("");
    for (const check of target.manualChecks) {
      console.log(`- [ ] ${check}`);
    }
    console.log("");
    console.log("### Accessibility Checks");
    console.log("");
    for (const check of target.accessibilityChecks) {
      console.log(`- [ ] ${check}`);
    }
  }
}

function createInspectionReportJson(targets, source) {
  return JSON.stringify({
    report: "ui-smoke-inspection",
    source,
    openAllCommand: ["pnpm", "preview:smoke-ui", "--", "--open"],
    automatedFollowUpCommand: ["pnpm", "e2e:smoke"],
    waitTimeoutMs: args.waitTimeoutMs,
    reviewEnvironment: {
      reviewer: "",
      date: "",
      operatingSystem: "",
      browser: "",
      browserZoom: "",
      viewport: "",
      screenReader: "",
      forcedColorsOrHighContrast: "",
    },
    targets: targets.map((target) => ({
      framework: target.framework,
      url: target.url,
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", target.framework, "--open"],
      smokeCheck: target.smokeCheck,
      stateCheck: target.stateCheck,
      workflowCheck: target.workflowCheck,
      result: "todo",
      evidence: "",
      manualChecks: target.manualChecks.map((check) => ({
        check,
        result: "todo",
        evidence: "",
      })),
      accessibilityChecks: target.accessibilityChecks.map((check) => ({
        check,
        result: "todo",
        evidence: "",
      })),
    })),
  }, null, 2);
}

function createInspectionReportMarkdown(targets, source) {
  const lines = [
    "# UI Smoke Inspection Report",
    "",
    "Use this report after opening the selected real preview UI targets. Mark each item and add short evidence before release approval.",
    "",
    "- Open all targets: `pnpm preview:smoke-ui -- --open`",
    "- Automated follow-up: `pnpm e2e:smoke`",
    `- Open wait timeout: \`${args.waitTimeoutMs}ms\``,
    `- Source revision: \`${source.revision}\``,
    `- Workspace version: \`${source.workspaceVersion}\``,
    `- Source fingerprint: \`${source.fingerprint}\` (${source.fileCount} files)`,
    `- Relevant source tree dirty: \`${source.dirty}\``,
    "",
    "## Review Environment",
    "",
    "- Reviewer:",
    "- Date:",
    "- Operating system:",
    "- Browser:",
    "- Browser zoom:",
    "- Viewport:",
    "- Screen reader:",
    "- Forced-colors/high-contrast setup:",
  ];

  for (const target of targets) {
    lines.push(
      "",
      `## ${target.framework}`,
      "",
      `- URL: ${target.url}`,
      `- Open: \`${formatUiSmokeOpenCommand(target)}\``,
      `- Grid accessible label: \`${target.smokeCheck.gridLabel}\``,
      `- Primary smoke column id: \`${target.smokeCheck.primaryColumnId}\``,
      `- Primary column label: \`${target.smokeCheck.primaryColumnLabel}\``,
      `- Managed column count assertion: \`${target.smokeCheck.managedColumnCount}\``,
      `- Direct header pinning controls: \`${target.smokeCheck.headerControls.directPinningControls ? "shown" : "hidden"}\``,
      `- Header action menu: \`${target.smokeCheck.headerControls.actionMenu ? "shown" : "hidden"}\``,
      `- Semantic cell markers: \`${formatSemanticMarkers(target.smokeCheck.semanticMarkers)}\``,
      `- Light product theme tokens: \`accent ${target.smokeCheck.productThemeTokens.light.accent}, focus ${target.smokeCheck.productThemeTokens.light.focus}, radius ${target.smokeCheck.productThemeTokens.light.radiusLarge}\``,
      `- Dark product theme tokens: \`accent ${target.smokeCheck.productThemeTokens.dark.accent}, focus ${target.smokeCheck.productThemeTokens.dark.focus}, radius ${target.smokeCheck.productThemeTokens.dark.radiusLarge}\``,
      `- Minimum deep-scroll row index: \`${target.smokeCheck.minimumDeepScrollRowIndex}\``,
      `- Maximum mounted virtual rows: \`${target.smokeCheck.maxRenderedRowCount}\``,
      `- 200% equivalent viewport: \`${target.smokeCheck.zoomEquivalentViewport.width}x${target.smokeCheck.zoomEquivalentViewport.height} CSS px at DPR ${target.smokeCheck.zoomEquivalentViewport.deviceScaleFactor}\``,
      `- Loading state text: \`${target.stateCheck.loadingText}\``,
      `- Error state text: \`${target.stateCheck.errorText}\``,
      `- Invalid edit target: \`${target.stateCheck.editableRowId}/${target.stateCheck.editableColumnId}\``,
      `- Validation message: \`${target.stateCheck.validationMessage}\``,
      `- Product workflow search: \`${target.workflowCheck.searchQuery}\` -> \`${target.workflowCheck.filteredRowId}\``,
      `- Product workflow valid edit: \`${target.workflowCheck.validEditValue}\``,
      `- Persisted workflow column: \`${target.workflowCheck.preferenceColumnLabel}\` (\`${target.workflowCheck.preferenceColumnId}\`)`,
      "",
      "### Result",
      "",
      "- [ ] Pass",
      "- [ ] Needs follow-up",
      "- Evidence:",
      "",
      "### Functional Checks",
      "",
    );

    for (const check of target.manualChecks) {
      lines.push(`- [ ] ${check}`, "  - Evidence:");
    }

    lines.push("", "### Accessibility Checks", "");
    for (const check of target.accessibilityChecks) {
      lines.push(`- [ ] ${check}`, "  - Evidence:");
    }
  }

  return lines.join("\n");
}

function formatSemanticMarkers(checks) {
  return checks.map((check) => `${check.columnId} (${check.values.map((value) => value.text).join(", ")})`).join("; ");
}

function writeReportOutput(output) {
  if (!args.outFile) {
    return;
  }

  const outputPath = resolve(args.outFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${output}\n`);
}

function runPnpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm ${args.join(" ")} exited with ${formatExit(code, signal)}`));
      }
    });
  });
}

function startPreview(target) {
  const child = spawn("pnpm", target.previewCommand, { stdio: "inherit" });
  child.target = target.framework;
  child.on("error", (error) => {
    console.error(`${target.framework} preview failed to start: ${error.message}`);
  });
  return child;
}

async function waitForTargetsReady(targets, timeoutMs) {
  await Promise.all(targets.map((target) => waitForTargetReady(target, timeoutMs)));
}

async function waitForTargetReady(target, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(target.url);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview server is still starting.
    }

    await delay(500);
  }

  throw new Error(`${target.framework} preview did not become ready at ${target.url} within ${timeoutMs}ms`);
}

function openTargets(targets) {
  console.log("");
  console.log("Opening UI smoke preview targets in the default browser:");
  return Promise.all(targets.map((target) => {
    console.log(`- ${target.framework}: ${target.url}`);
    return openUrl(target.url);
  }));
}

function openUrl(url) {
  const command = getOpenCommand(url);

  return new Promise((resolve, reject) => {
    const child = spawn(command.bin, command.args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command.bin} ${command.args.join(" ")} exited with ${formatExit(code, signal)}`));
      }
    });
  });
}

function getOpenCommand(url) {
  if (process.platform === "darwin") {
    return { bin: "open", args: [url] };
  }

  if (process.platform === "win32") {
    return { bin: "cmd", args: ["/c", "start", "", url] };
  }

  return { bin: "xdg-open", args: [url] };
}

function waitForPreviewExit(children) {
  let shuttingDown = false;

  const shutdown = (signal) => {
    shuttingDown = true;
    stopPreviewChildren(children, signal);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return new Promise((resolve, reject) => {
    let remaining = children.length;

    for (const child of children) {
      child.on("exit", (code, signal) => {
        remaining -= 1;

        if (!shuttingDown && code !== 0) {
          shutdown("SIGTERM");
          reject(new Error(`${child.target} preview exited with ${formatExit(code, signal)}`));
          return;
        }

        if (remaining === 0) {
          resolve();
        }
      });
    }
  });
}

function stopPreviewChildren(children, signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function selectTargets(framework) {
  if (!framework) {
    return uiSmokeTargets;
  }

  const target = uiSmokeTargets.find((candidate) => candidate.framework.toLowerCase() === framework.toLowerCase());
  if (!target) {
    throw new Error(`Unknown framework: ${framework}; expected one of ${uiSmokeTargets.map((candidate) => candidate.framework).join(", ")}`);
  }

  return [target];
}

function parseArgs(argv) {
  const parsed = {
    framework: undefined,
    json: false,
    list: false,
    markdown: false,
    open: false,
    outFile: undefined,
    report: false,
    skipBuild: false,
    waitTimeoutMs: defaultUiSmokeOpenWaitTimeoutMs,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--framework") {
      parsed.framework = requireArgValue(argv, index, "--framework");
      index += 1;
    } else if (arg?.startsWith("--framework=")) {
      parsed.framework = arg.slice("--framework=".length);
      requireNonEmpty(parsed.framework, "--framework");
    } else if (arg === "--list") {
      parsed.list = true;
    } else if (arg === "--markdown") {
      parsed.markdown = true;
    } else if (arg === "--open") {
      parsed.open = true;
    } else if (arg === "--out-file") {
      parsed.outFile = requireArgValue(argv, index, "--out-file");
      index += 1;
    } else if (arg?.startsWith("--out-file=")) {
      parsed.outFile = arg.slice("--out-file=".length);
      requireNonEmpty(parsed.outFile, "--out-file");
    } else if (arg === "--report") {
      parsed.report = true;
    } else if (arg === "--skip-build") {
      parsed.skipBuild = true;
    } else if (arg === "--wait-timeout-ms") {
      parsed.waitTimeoutMs = parsePositiveInteger(requireArgValue(argv, index, "--wait-timeout-ms"), "--wait-timeout-ms");
      index += 1;
    } else if (arg?.startsWith("--wait-timeout-ms=")) {
      parsed.waitTimeoutMs = parsePositiveInteger(arg.slice("--wait-timeout-ms=".length), "--wait-timeout-ms");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.outFile && !parsed.report) {
    throw new Error("--out-file can only be used with --report");
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

function parsePositiveInteger(value, name) {
  requireNonEmpty(value, name);
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} requires a positive integer`);
  }
  return Number.parseInt(value, 10);
}

function formatExit(code, signal) {
  return signal ? `signal ${signal}` : `exit code ${code}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
