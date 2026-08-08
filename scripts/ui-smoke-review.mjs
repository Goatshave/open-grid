import { readFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { getUiSmokeSourceState } from "./ui-smoke-source-state.mjs";
import { uiSmokeTargets } from "./ui-smoke-targets.mjs";

const defaultReportFile = ".release/ui-smoke-report.json";
const environmentFields = [
  "reviewer",
  "date",
  "operatingSystem",
  "browser",
  "browserZoom",
  "viewport",
  "screenReader",
  "forcedColorsOrHighContrast",
];
const resultValues = new Set(["pass", "follow-up", "todo"]);
const maxReviewAgeDays = 7;

export async function runUiSmokeReview(argv, io = { input, output }) {
  const args = parseArgs(argv);
  const reportFile = resolve(args.file);
  const report = readReport(reportFile);
  const source = getUiSmokeSourceState();
  const contractFailures = validateReviewContract(report, source, args.allowDirty);

  if (contractFailures.length > 0) {
    throw new Error([
      ...contractFailures,
      `Regenerate the report with: pnpm preview:smoke-ui -- --report --json --out-file ${args.file}`,
    ].join("\n"));
  }

  const selectedTargets = selectTargets(report.targets, args.framework);
  if (args.status) {
    const progress = getReviewProgress(report, source, selectedTargets);
    printProgress(progress, args.json, io.output);
    return progress;
  }

  const rl = createInterface({ input: io.input, output: io.output });
  try {
    writeLine(io.output, "Open Grid manual UI review");
    writeLine(io.output, `Report: ${reportFile}`);
    writeLine(io.output, "Use pass only after performing the check in the real preview environment. Progress is saved after every item.");
    writeLine(io.output, "Result choices: pass (p), follow-up (f), todo (t). Press Enter to keep the current value.");
    writeLine(io.output, "");

    await reviewEnvironment(rl, report, reportFile);
    for (const target of selectedTargets) {
      await reviewTarget(rl, target, report, reportFile, io.output);
    }
  } finally {
    rl.close();
  }

  const progress = getReviewProgress(report, source);
  printProgress(progress, args.json, io.output);
  if (progress.readyForValidation) {
    writeLine(io.output, "Validate with: pnpm release:ui-smoke-report-check");
  } else {
    writeLine(io.output, `Resume with: pnpm review:smoke-ui -- --file ${args.file}`);
  }
  return progress;
}

export function validateReviewContract(report, source, allowDirty = false) {
  const failures = [];
  if (!isRecord(report) || report.report !== "ui-smoke-inspection") {
    return ['report must be a JSON object with report equal to "ui-smoke-inspection"'];
  }
  if (!isRecord(report.reviewEnvironment)) {
    failures.push("reviewEnvironment must be a JSON object");
  }
  if (!sameValue(report.source, source)) {
    failures.push("report source identity does not match the current UI source state");
  }
  if (!allowDirty && source.dirty) {
    failures.push("manual release review requires a clean relevant source tree; commit changes before generating the report");
  }
  if (!Array.isArray(report.targets) || report.targets.length !== uiSmokeTargets.length) {
    failures.push(`report must contain all ${uiSmokeTargets.length} current UI smoke targets`);
    return failures;
  }

  for (const expected of uiSmokeTargets) {
    const matches = report.targets.filter((target) => isRecord(target) && target.framework === expected.framework);
    if (matches.length !== 1) {
      failures.push(`${expected.framework}: report must contain exactly one target`);
      continue;
    }
    const target = matches[0];
    if (!Array.isArray(target.openCommand) || target.openCommand.some((value) => typeof value !== "string")) {
      failures.push(`${expected.framework}: openCommand must match a generated review target`);
    }
    if (target.url !== expected.url || !sameValue(target.smokeCheck, expected.smokeCheck)
      || !sameValue(target.stateCheck, expected.stateCheck) || !sameValue(target.workflowCheck, expected.workflowCheck)) {
      failures.push(`${expected.framework}: report contract is stale`);
    }
    validateResultRecord(target, `${expected.framework} overall`, failures);
    validateCheckContract(target.manualChecks, expected.manualChecks, `${expected.framework} functional`, failures);
    validateCheckContract(target.accessibilityChecks, expected.accessibilityChecks, `${expected.framework} accessibility`, failures);
  }
  return failures;
}

export function getReviewProgress(report, source = getUiSmokeSourceState(), selectedTargets) {
  const environment = isRecord(report.reviewEnvironment) ? report.reviewEnvironment : {};
  const environmentCompleted = environmentFields.filter((field) => isNonEmptyString(environment[field])).length;
  const records = [];
  const frameworks = [];
  const pendingChecks = [];
  const allTargets = Array.isArray(report.targets) ? report.targets : [];
  const targets = selectedTargets ?? allTargets;

  for (const target of targets) {
    const targetRecords = [target, ...(target.manualChecks ?? []), ...(target.accessibilityChecks ?? [])];
    records.push(...targetRecords);
    frameworks.push({
      framework: target.framework,
      targetResult: target.result,
      functional: summarizeRecords(target.manualChecks ?? []),
      accessibility: summarizeRecords(target.accessibilityChecks ?? []),
    });
    collectPendingChecks(pendingChecks, target, "functional", target.manualChecks ?? []);
    collectPendingChecks(pendingChecks, target, "accessibility", target.accessibilityChecks ?? []);
  }

  const results = summarizeRecords(records);
  const allResults = summarizeRecords(allTargets.flatMap((target) => [
    target,
    ...(target.manualChecks ?? []),
    ...(target.accessibilityChecks ?? []),
  ]));
  const sourceCurrent = sameValue(report.source, source);
  const displaySettingsConfirmed = environment.browserZoom === "200%" && environment.viewport === "390 CSS px";
  const reviewDateFresh = isFreshReviewDate(environment.date, maxReviewAgeDays);
  const readyForValidation = sourceCurrent && !source.dirty
    && environmentCompleted === environmentFields.length && displaySettingsConfirmed && reviewDateFresh
    && allResults.pass === allResults.total && allResults.missingEvidence === 0;

  return {
    sourceCurrent,
    sourceDirty: source.dirty,
    environmentCompleted,
    environmentTotal: environmentFields.length,
    displaySettingsConfirmed,
    reviewDateFresh,
    results,
    frameworks,
    pendingChecks,
    readyForValidation,
  };
}

async function reviewEnvironment(rl, report, reportFile) {
  const environment = report.reviewEnvironment;
  writeLine(rl.output, "Review environment");
  environment.reviewer = await promptText(rl, "Reviewer", environment.reviewer);
  writeReport(reportFile, report);
  environment.date = await promptText(rl, "Review date (YYYY-MM-DD)", environment.date || localDate());
  writeReport(reportFile, report);
  environment.operatingSystem = await promptText(rl, "Operating system", environment.operatingSystem || `${platform()} ${release()}`);
  writeReport(reportFile, report);
  environment.browser = await promptText(rl, "Browser and version", environment.browser);
  writeReport(reportFile, report);
  environment.screenReader = await promptText(rl, "Screen reader and version", environment.screenReader);
  writeReport(reportFile, report);
  environment.forcedColorsOrHighContrast = await promptText(
    rl,
    "Forced-colors/high-contrast setup",
    environment.forcedColorsOrHighContrast,
  );
  writeReport(reportFile, report);
  environment.browserZoom = await promptConfirmation(rl, "Actual browser zoom is set to 200%", environment.browserZoom === "200%")
    ? "200%"
    : "";
  writeReport(reportFile, report);
  environment.viewport = await promptConfirmation(rl, "Actual viewport is set to 390 CSS px", environment.viewport === "390 CSS px")
    ? "390 CSS px"
    : "";
  writeReport(reportFile, report);
  writeLine(rl.output, "");
}

async function reviewTarget(rl, target, report, reportFile, stream) {
  writeLine(stream, `${target.framework}: ${target.url}`);
  writeLine(stream, `Open command: ${target.openCommand.join(" ")}`);
  await reviewCollection(rl, target.manualChecks, `${target.framework} functional`, report, reportFile, stream);
  await reviewCollection(rl, target.accessibilityChecks, `${target.framework} accessibility`, report, reportFile, stream);
  await reviewRecord(rl, target, `${target.framework} overall`, report, reportFile, stream);
  writeLine(stream, "");
}

async function reviewCollection(rl, records, label, report, reportFile, stream) {
  for (let index = 0; index < records.length; index += 1) {
    writeLine(stream, `[${label} ${index + 1}/${records.length}] ${records[index].check}`);
    await reviewRecord(rl, records[index], label, report, reportFile, stream);
  }
}

async function reviewRecord(rl, record, label, report, reportFile, stream) {
  const previousResult = record.result;
  record.result = await promptResult(rl, `${label} result`, record.result);
  if (record.result === "todo") {
    record.evidence = "";
  } else {
    record.evidence = await promptText(rl, `${label} evidence`, record.result === previousResult ? record.evidence : "", true);
  }
  writeReport(reportFile, report);
  writeLine(stream, `Saved: ${record.result}`);
}

async function promptText(rl, label, currentValue = "", required = false) {
  while (true) {
    const current = isNonEmptyString(currentValue) ? currentValue.trim() : "";
    const answer = (await rl.question(`${label}${current ? ` [${current}]` : ""}: `)).trim();
    const value = answer || current;
    if (!required || value) return value;
    writeLine(rl.output, `${label} is required for pass or follow-up.`);
  }
}

async function promptConfirmation(rl, label, currentValue) {
  while (true) {
    const answer = (await rl.question(`${label} [${currentValue ? "Y/n" : "y/N"}]: `)).trim().toLowerCase();
    if (!answer) return currentValue;
    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
    writeLine(rl.output, "Enter y or n.");
  }
}

async function promptResult(rl, label, currentValue = "todo") {
  while (true) {
    const answer = (await rl.question(`${label} [${currentValue}]: `)).trim().toLowerCase();
    const value = answer || currentValue;
    const normalized = value === "p" ? "pass" : value === "f" ? "follow-up" : value === "t" ? "todo" : value;
    if (resultValues.has(normalized)) return normalized;
    writeLine(rl.output, "Enter pass/p, follow-up/f, or todo/t.");
  }
}

function validateCheckContract(actual, expected, label, failures) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    failures.push(`${label}: expected ${expected.length} checks`);
    return;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!isRecord(actual[index]) || actual[index].check !== expected[index]) {
      failures.push(`${label}[${index + 1}]: check text is stale`);
      continue;
    }
    validateResultRecord(actual[index], `${label}[${index + 1}]`, failures);
  }
}

function validateResultRecord(record, label, failures) {
  if (!resultValues.has(record.result) || typeof record.evidence !== "string") {
    failures.push(`${label}: result and evidence fields are malformed`);
  }
}

function summarizeRecords(records) {
  const summary = { total: records.length, pass: 0, followUp: 0, todo: 0, missingEvidence: 0 };
  for (const record of records) {
    if (record.result === "pass") summary.pass += 1;
    else if (record.result === "follow-up") summary.followUp += 1;
    else summary.todo += 1;
    if (record.result !== "todo" && !isNonEmptyString(record.evidence)) summary.missingEvidence += 1;
  }
  return summary;
}

function collectPendingChecks(pendingChecks, target, category, records) {
  records.forEach((record, index) => {
    if (record.result === "pass") return;
    pendingChecks.push({
      framework: target.framework,
      url: target.url,
      openCommand: target.openCommand,
      category,
      checkIndex: index + 1,
      check: record.check,
      result: record.result,
      evidence: record.evidence,
    });
  });
}

function printProgress(progress, json, stream) {
  if (json) {
    writeLine(stream, JSON.stringify(progress, null, 2));
    return;
  }
  writeLine(stream, "UI smoke review progress:");
  writeLine(stream, `- source current: ${progress.sourceCurrent ? "yes" : "no"}`);
  writeLine(stream, `- source clean: ${progress.sourceDirty ? "no" : "yes"}`);
  writeLine(stream, `- environment: ${progress.environmentCompleted}/${progress.environmentTotal}`);
  writeLine(stream, `- actual display settings confirmed: ${progress.displaySettingsConfirmed ? "yes" : "no"}`);
  writeLine(stream, `- review date fresh: ${progress.reviewDateFresh ? "yes" : "no"}`);
  writeLine(stream, `- results: ${progress.results.pass} pass, ${progress.results.followUp} follow-up, ${progress.results.todo} todo`);
  for (const framework of progress.frameworks) {
    writeLine(stream, `- ${framework.framework}: overall ${framework.targetResult}; functional ${framework.functional.pass}/${framework.functional.total}; accessibility ${framework.accessibility.pass}/${framework.accessibility.total}`);
  }
  if (progress.pendingChecks.length > 0) {
    writeLine(stream, "Pending checks:");
    for (const pending of progress.pendingChecks) {
      writeLine(stream, `- ${pending.framework} ${pending.category} ${pending.checkIndex} [${pending.result}]: ${pending.check}`);
      writeLine(stream, `  target: ${pending.url}`);
    }
    for (const framework of new Set(progress.pendingChecks.map((pending) => pending.framework))) {
      writeLine(stream, `- resume ${framework}: pnpm review:smoke-ui -- --framework ${framework}`);
    }
  }
  writeLine(stream, `- ready for validation: ${progress.readyForValidation ? "yes" : "no"}`);
}

function selectTargets(targets, framework) {
  if (!framework) return targets;
  const target = targets.find((candidate) => candidate.framework.toLowerCase() === framework.toLowerCase());
  if (!target) {
    throw new Error(`Unknown framework ${JSON.stringify(framework)}; expected React, Vue, or Svelte`);
  }
  return [target];
}

function readReport(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Report file does not exist: ${file}`);
    }
    throw new Error(`Unable to read report ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeReport(file, report) {
  mkdirSync(dirname(file), { recursive: true });
  const temporaryFile = `${file}.${process.pid}.tmp`;
  writeFileSync(temporaryFile, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(temporaryFile, file);
}

function parseArgs(argv) {
  const parsed = { allowDirty: false, file: defaultReportFile, framework: undefined, json: false, status: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--allow-dirty") parsed.allowDirty = true;
    else if (arg === "--file") parsed.file = requireArgValue(argv, index++, "--file");
    else if (arg.startsWith("--file=")) parsed.file = requireNonEmpty(arg.slice("--file=".length), "--file");
    else if (arg === "--framework") parsed.framework = requireArgValue(argv, index++, "--framework");
    else if (arg.startsWith("--framework=")) parsed.framework = requireNonEmpty(arg.slice("--framework=".length), "--framework");
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--status") parsed.status = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (parsed.json && !parsed.status) throw new Error("--json can only be used with --status");
  return parsed;
}

function requireArgValue(argv, index, name) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return requireNonEmpty(value, name);
}

function requireNonEmpty(value, name) {
  if (!value.trim()) throw new Error(`${name} requires a non-empty value`);
  return value;
}

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isFreshReviewDate(value, maxAgeDays) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const [year, month, day] = value.trim().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const ageDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function writeLine(stream, value) {
  stream.write(`${value}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runUiSmokeReview(process.argv.slice(2)).catch((error) => {
    console.error(`UI smoke review failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
