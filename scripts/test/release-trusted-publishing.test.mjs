import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = join(repoRoot, "scripts", "release-trusted-publishing.mjs");
const firstPublishPreflightPath = join(repoRoot, "scripts", "release-first-publish-preflight.mjs");
const firstPublishStatusPath = join(repoRoot, "scripts", "release-first-publish-status.mjs");
const releaseCheckPath = join(repoRoot, "scripts", "release-check.mjs");
const releaseGithubPushPreflightPath = join(repoRoot, "scripts", "release-github-push-preflight.mjs");
const releasePolicyPath = join(repoRoot, "scripts", "release-policy.mjs");
const releasePlanPath = join(repoRoot, "scripts", "release-plan.mjs");
const releasePublishPath = join(repoRoot, "scripts", "release-publish.mjs");
const releasePublishDryRunPath = join(repoRoot, "scripts", "release-publish-dry-run.mjs");
const releaseStagePath = join(repoRoot, "scripts", "release-stage.mjs");
const uiSmokePreviewPath = join(repoRoot, "scripts", "ui-smoke-preview.mjs");
const uiSmokeReportCheckPath = join(repoRoot, "scripts", "ui-smoke-report-check.mjs");
const repositoryUrl = "git+https://github.com/example/open-grid.git";
const quotedRepositoryUrl = JSON.stringify(repositoryUrl);
const workflowUiSmokeValidationCommand = 'pnpm release:ui-smoke-report-check -- --version "$RELEASE_VERSION" --tag "$NPM_TAG" --repository-url "$REPOSITORY_URL" --json';
const productThemeTokenCheck = {
  light: { accent: "#155eef", focus: "#0e9384", radiusLarge: "8px" },
  dark: { accent: "#84adff", focus: "#5fe9d0", radiusLarge: "8px" },
};
const productHeaderControlCheck = {
  directPinningControls: false,
  actionMenu: true,
};
const reactSemanticMarkerChecks = [
  {
    columnId: "status",
    values: [
      { rowId: "INV-0001", text: "Paid", className: "product-cell--status-paid" },
      { rowId: "INV-0002", text: "Sent", className: "product-cell--status-sent" },
      { rowId: "INV-0003", text: "Draft", className: "product-cell--status-draft" },
      { rowId: "INV-0004", text: "Overdue", className: "product-cell--status-overdue" },
    ],
  },
  {
    columnId: "risk",
    values: [
      { rowId: "INV-0001", text: "Low", className: "product-cell--risk-low" },
      { rowId: "INV-0002", text: "Medium", className: "product-cell--risk-medium" },
      { rowId: "INV-0003", text: "High", className: "product-cell--risk-high" },
    ],
  },
];
const groupedSemanticMarkerChecks = [
  {
    columnId: "risk",
    values: [
      { rowId: "REG-001", text: "Low", className: "product-cell--risk-low" },
      { rowId: "REG-002", text: "Medium", className: "product-cell--risk-medium" },
      { rowId: "REG-003", text: "High", className: "product-cell--risk-high" },
    ],
  },
];
const reactUiSmokeCheck = {
  gridLabel: "Invoices",
  primaryColumnId: "customer",
  primaryColumnLabel: "Customer",
  managedColumnCount: "Visible 10 / 10",
  productThemeTokens: productThemeTokenCheck,
  headerControls: productHeaderControlCheck,
  semanticMarkers: reactSemanticMarkerChecks,
  minimumDeepScrollRowIndex: 100,
  maxRenderedRowCount: 80,
  zoomEquivalentViewport: { width: 640, height: 450, deviceScaleFactor: 2 },
};
const groupedUiSmokeCheck = {
  gridLabel: "Regional forecasts",
  primaryColumnId: "city",
  primaryColumnLabel: "City",
  managedColumnCount: "Visible 8 / 8",
  productThemeTokens: productThemeTokenCheck,
  headerControls: productHeaderControlCheck,
  semanticMarkers: groupedSemanticMarkerChecks,
  minimumDeepScrollRowIndex: 100,
  maxRenderedRowCount: 80,
  zoomEquivalentViewport: { width: 640, height: 450, deviceScaleFactor: 2 },
};
const reactUiStateCheck = {
  editableRowId: "INV-0001",
  editableColumnId: "customer",
  invalidEditValue: "No",
  validationMessage: "Customer must be at least 3 characters",
  loadingText: "Refreshing invoices...",
  errorText: "Invoice service is unavailable.",
};
const groupedUiStateCheck = {
  editableRowId: "REG-001",
  editableColumnId: "city",
  invalidEditValue: "No",
  validationMessage: "City must be at least 3 characters",
  loadingText: "Refreshing forecasts...",
  errorText: "Forecast service is unavailable.",
};
const reactUiWorkflowCheck = {
  searchQuery: "Northwind",
  filteredRowId: "INV-0002",
  validEditValue: "Acme Labs Reviewed",
  originalEditValue: "Acme Labs",
  preferenceColumnId: "owner",
  preferenceColumnLabel: "Owner",
};
const groupedUiWorkflowCheck = {
  searchQuery: "Tokyo",
  filteredRowId: "REG-002",
  validEditValue: "Seoul Reviewed",
  originalEditValue: "Seoul",
  preferenceColumnId: "owner",
  preferenceColumnLabel: "Owner",
};
const manualAccessibilityChecks = [
  "Use a screen reader to enter the grid and confirm its label, row and column counts, header names, and focused cell values are announced.",
  "Use only the keyboard to move through toolbar controls and the grid, open and close menus, edit a cell, and confirm focus stays visible and follows a logical order.",
  "At 200% browser zoom and at a 390 CSS pixel viewport, confirm controls reflow without overlap or clipped commands and the grid remains horizontally scrollable.",
  "With forced colors or a high-contrast theme enabled, confirm focus, selection, disabled controls, validation, loading, and error states remain distinguishable.",
];

test("manual UI smoke preview command reports the same preview targets", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--list"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const rootPackage = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.equal(rootPackage.scripts["preview:smoke-ui"], "node scripts/ui-smoke-preview.mjs");
  assert.equal(rootPackage.scripts["release:first-publish-next-step"], "node scripts/release-first-publish-status.mjs --next-step");
  assert.match(output, /UI smoke preview targets:/);
  assert.match(output, /React: http:\/\/127\.0\.0\.1:4193\//);
  assert.match(output, /build: pnpm --filter @open-grid\/react-ui build && pnpm --filter @open-grid\/example-react-basic build/);
  assert.match(output, /preview: pnpm --filter @open-grid\/example-react-basic preview --port 4193/);
  assert.match(output, /open: pnpm preview:smoke-ui -- --framework React --open/);
  assert.match(output, /open wait timeout: 30000ms/);
  assert.match(output, /200% equivalent viewport: 640x450 CSS px at DPR 2/);
  assert.match(output, /smoke assertions:/);
  assert.match(output, /grid accessible label: Invoices/);
  assert.match(output, /primary column id: customer/);
  assert.match(output, /primary column label: Customer/);
  assert.match(output, /managed column count: Visible 10 \/ 10/);
  assert.match(output, /direct header pinning controls: hidden/);
  assert.match(output, /header action menu: shown/);
  assert.match(output, /semantic cell markers: status \(Paid, Sent, Draft, Overdue\); risk \(Low, Medium, High\)/);
  assert.match(output, /light product theme: accent #155eef, focus #0e9384, radius 8px/);
  assert.match(output, /dark product theme: accent #84adff, focus #5fe9d0, radius 8px/);
  assert.match(output, /minimum deep-scroll row index: 100/);
  assert.match(output, /maximum mounted virtual rows: 80/);
  assert.match(output, /loading state text: Refreshing invoices\.\.\./);
  assert.match(output, /error state text: Invoice service is unavailable\./);
  assert.match(output, /invalid edit target: INV-0001\/customer/);
  assert.match(output, /validation message: Customer must be at least 3 characters/);
  assert.match(output, /product workflow search: Northwind -> INV-0002/);
  assert.match(output, /product workflow edit: INV-0001\/customer -> Acme Labs Reviewed/);
  assert.match(output, /persisted workflow column: Owner \(owner\)/);
  assert.match(output, /manual checks:/);
  assert.match(output, /accessibility checks:/);
  assert.match(output, /Use a screen reader to enter the grid/);
  assert.match(output, /Confirm the Customer column header is visible\./);
  assert.match(output, /Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 10 \/ 10\./);
  assert.match(output, /Vue: http:\/\/127\.0\.0\.1:4194\//);
  assert.match(output, /build: pnpm --filter @open-grid\/vue-ui build && pnpm --filter @open-grid\/example-vue-grouped build/);
  assert.match(output, /preview: pnpm --filter @open-grid\/example-vue-grouped preview --port 4194/);
  assert.match(output, /Confirm the City column header is visible\./);
  assert.match(output, /Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 8 \/ 8\./);
  assert.match(output, /Svelte: http:\/\/127\.0\.0\.1:4195\//);
  assert.match(output, /build: pnpm --filter @open-grid\/svelte-ui build && pnpm --filter @open-grid\/example-svelte-grouped build/);
  assert.match(output, /preview: pnpm --filter @open-grid\/example-svelte-grouped preview --port 4195/);
  assert.match(output, /Use Export CSV and confirm the browser starts a CSV download\./);
});

test("manual UI smoke preview command reports machine-readable preview targets", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const plan = JSON.parse(output);

  assert.equal(plan.waitTimeoutMs, 30000);
  assert.deepEqual(plan.targets, [
    {
      framework: "React",
      url: "http://127.0.0.1:4193/",
      port: 4193,
      buildCommands: [
        ["pnpm", "--filter", "@open-grid/react-ui", "build"],
        ["pnpm", "--filter", "@open-grid/example-react-basic", "build"],
      ],
      previewCommand: ["pnpm", "--filter", "@open-grid/example-react-basic", "preview", "--port", "4193"],
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", "React", "--open"],
      smokeCheck: reactUiSmokeCheck,
      stateCheck: reactUiStateCheck,
      workflowCheck: reactUiWorkflowCheck,
      manualChecks: [
        "Confirm the grid shell renders with visible rows and cells.",
        "Confirm the Customer column header is visible.",
        "Confirm Paid, Sent, Draft, Overdue, and Low, Medium, High remain readable and have distinct semantic markers.",
        "Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 10 / 10.",
        "Scroll near the bottom and confirm rows update while fewer than 80 virtual rows remain mounted.",
        "Use Export CSV and confirm the browser starts a CSV download.",
        "Complete search, ascending sort, valid edit, Owner-column persistence after reload, and Reset preferences as one uninterrupted workflow.",
      ],
      accessibilityChecks: manualAccessibilityChecks,
    },
    {
      framework: "Vue",
      url: "http://127.0.0.1:4194/",
      port: 4194,
      buildCommands: [
        ["pnpm", "--filter", "@open-grid/vue-ui", "build"],
        ["pnpm", "--filter", "@open-grid/example-vue-grouped", "build"],
      ],
      previewCommand: ["pnpm", "--filter", "@open-grid/example-vue-grouped", "preview", "--port", "4194"],
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", "Vue", "--open"],
      smokeCheck: groupedUiSmokeCheck,
      stateCheck: groupedUiStateCheck,
      workflowCheck: groupedUiWorkflowCheck,
      manualChecks: [
        "Confirm the grid shell renders with visible grouped rows and cells.",
        "Confirm the City column header is visible.",
        "Confirm Low, Medium, and High remain readable and have distinct semantic markers.",
        "Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 8 / 8.",
        "Scroll near the bottom and confirm rows update while fewer than 80 virtual rows remain mounted.",
        "Use Export CSV and confirm the browser starts a CSV download.",
        "Complete search, ascending sort, valid edit, Owner-column persistence after reload, and Reset preferences as one uninterrupted workflow.",
      ],
      accessibilityChecks: manualAccessibilityChecks,
    },
    {
      framework: "Svelte",
      url: "http://127.0.0.1:4195/",
      port: 4195,
      buildCommands: [
        ["pnpm", "--filter", "@open-grid/svelte-ui", "build"],
        ["pnpm", "--filter", "@open-grid/example-svelte-grouped", "build"],
      ],
      previewCommand: ["pnpm", "--filter", "@open-grid/example-svelte-grouped", "preview", "--port", "4195"],
      openCommand: ["pnpm", "preview:smoke-ui", "--", "--framework", "Svelte", "--open"],
      smokeCheck: groupedUiSmokeCheck,
      stateCheck: groupedUiStateCheck,
      workflowCheck: groupedUiWorkflowCheck,
      manualChecks: [
        "Confirm the grid shell renders with visible grouped rows and cells.",
        "Confirm the City column header is visible.",
        "Confirm Low, Medium, and High remain readable and have distinct semantic markers.",
        "Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 8 / 8.",
        "Scroll near the bottom and confirm rows update while fewer than 80 virtual rows remain mounted.",
        "Use Export CSV and confirm the browser starts a CSV download.",
        "Complete search, ascending sort, valid edit, Owner-column persistence after reload, and Reset preferences as one uninterrupted workflow.",
      ],
      accessibilityChecks: manualAccessibilityChecks,
    },
  ]);
});

test("manual UI smoke preview command reports a markdown checklist", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.match(output, /# UI Smoke Preview Checklist/);
  assert.match(output, /Run `pnpm preview:smoke-ui -- --open` to open each preview URL, then mark the checks below during manual verification\./);
  assert.match(output, /Open wait timeout: `30000ms`\./);
  assert.match(output, /## React/);
  assert.match(output, /- URL: http:\/\/127\.0\.0\.1:4193\//);
  assert.match(output, /- Build: `pnpm --filter @open-grid\/react-ui build && pnpm --filter @open-grid\/example-react-basic build`/);
  assert.match(output, /- Preview: `pnpm --filter @open-grid\/example-react-basic preview --port 4193`/);
  assert.match(output, /- Open: `pnpm preview:smoke-ui -- --framework React --open`/);
  assert.match(output, /- Open wait timeout: `30000ms`/);
  assert.match(output, /- Primary smoke column id: `customer`/);
  assert.match(output, /- Managed column count assertion: `Visible 10 \/ 10`/);
  assert.match(output, /- Direct header pinning controls: `hidden`/);
  assert.match(output, /- Header action menu: `shown`/);
  assert.match(output, /- Semantic cell markers: `status \(Paid, Sent, Draft, Overdue\); risk \(Low, Medium, High\)`/);
  assert.match(output, /- Minimum deep-scroll row index: `100`/);
  assert.match(output, /- Maximum mounted virtual rows: `80`/);
  assert.match(output, /- Loading state text: `Refreshing invoices\.\.\.`/);
  assert.match(output, /- Error state text: `Invoice service is unavailable\.`/);
  assert.match(output, /- Invalid edit target: `INV-0001\/customer`/);
  assert.match(output, /- Validation message: `Customer must be at least 3 characters`/);
  assert.match(output, /### Functional Checks/);
  assert.match(output, /### Accessibility Checks/);
  assert.match(output, /- \[ \] With forced colors or a high-contrast theme enabled/);
  assert.match(output, /- \[ \] Confirm the Customer column header is visible\./);
  assert.match(output, /## Vue/);
  assert.match(output, /- Primary smoke column id: `city`/);
  assert.match(output, /- Managed column count assertion: `Visible 8 \/ 8`/);
  assert.match(output, /- \[ \] Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 8 \/ 8\./);
  assert.match(output, /## Svelte/);
  assert.match(output, /- \[ \] Use Export CSV and confirm the browser starts a CSV download\./);
});

test("manual UI smoke preview command reports a manual inspection report", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--report"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.match(output, /# UI Smoke Inspection Report/);
  assert.match(output, /Use this report after opening the selected real preview UI targets\./);
  assert.match(output, /- Open all targets: `pnpm preview:smoke-ui -- --open`/);
  assert.match(output, /- Automated follow-up: `pnpm e2e:smoke`/);
  assert.match(output, /- Open wait timeout: `30000ms`/);
  assert.match(output, /- Source revision: `[0-9a-f]{40}`/);
  assert.match(output, /- Workspace version: `0\.1\.0`/);
  assert.match(output, /- Source fingerprint: `sha256:[0-9a-f]{64}` \(\d+ files\)/);
  assert.match(output, /- Relevant source tree dirty: `(true|false)`/);
  assert.match(output, /## Review Environment/);
  assert.match(output, /- Reviewer:/);
  assert.match(output, /- Browser zoom:/);
  assert.match(output, /- Viewport:/);
  assert.match(output, /- Screen reader:/);
  assert.match(output, /- Forced-colors\/high-contrast setup:/);
  assert.match(output, /## React/);
  assert.match(output, /- URL: http:\/\/127\.0\.0\.1:4193\//);
  assert.match(output, /- Open: `pnpm preview:smoke-ui -- --framework React --open`/);
  assert.match(output, /- Primary smoke column id: `customer`/);
  assert.match(output, /- Managed column count assertion: `Visible 10 \/ 10`/);
  assert.match(output, /- Minimum deep-scroll row index: `100`/);
  assert.match(output, /- Maximum mounted virtual rows: `80`/);
  assert.match(output, /- Loading state text: `Refreshing invoices\.\.\.`/);
  assert.match(output, /- Error state text: `Invoice service is unavailable\.`/);
  assert.match(output, /- Invalid edit target: `INV-0001\/customer`/);
  assert.match(output, /- Validation message: `Customer must be at least 3 characters`/);
  assert.match(output, /### Result/);
  assert.match(output, /- \[ \] Pass/);
  assert.match(output, /- \[ \] Needs follow-up/);
  assert.match(output, /### Functional Checks/);
  assert.match(output, /### Accessibility Checks/);
  assert.match(output, /- \[ \] Use a screen reader to enter the grid/);
  assert.match(output, /- \[ \] Confirm the Customer column header is visible\./);
  assert.match(output, /  - Evidence:/);
  assert.match(output, /## Vue/);
  assert.match(output, /- Managed column count assertion: `Visible 8 \/ 8`/);
  assert.match(output, /## Svelte/);
  assert.match(output, /- \[ \] Use Export CSV and confirm the browser starts a CSV download\./);
});

test("manual UI smoke preview command reports a machine-readable inspection report", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--report", "--json", "--framework", "Vue"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = JSON.parse(output);

  assert.equal(report.report, "ui-smoke-inspection");
  assert.match(report.source.revision, /^[0-9a-f]{40}$/);
  assert.equal(report.source.workspaceVersion, "0.1.0");
  assert.match(report.source.fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(typeof report.source.dirty, "boolean");
  assert.ok(report.source.fileCount > 0);
  assert.deepEqual(report.openAllCommand, ["pnpm", "preview:smoke-ui", "--", "--open"]);
  assert.deepEqual(report.automatedFollowUpCommand, ["pnpm", "e2e:smoke"]);
  assert.equal(report.waitTimeoutMs, 30000);
  assert.deepEqual(report.reviewEnvironment, {
    reviewer: "",
    date: "",
    operatingSystem: "",
    browser: "",
    browserZoom: "",
    viewport: "",
    screenReader: "",
    forcedColorsOrHighContrast: "",
  });
  assert.equal(report.targets.length, 1);
  assert.equal(report.targets[0].framework, "Vue");
  assert.equal(report.targets[0].url, "http://127.0.0.1:4194/");
  assert.deepEqual(report.targets[0].openCommand, ["pnpm", "preview:smoke-ui", "--", "--framework", "Vue", "--open"]);
  assert.deepEqual(report.targets[0].smokeCheck, groupedUiSmokeCheck);
  assert.deepEqual(report.targets[0].stateCheck, groupedUiStateCheck);
  assert.deepEqual(report.targets[0].workflowCheck, groupedUiWorkflowCheck);
  assert.equal(report.targets[0].result, "todo");
  assert.equal(report.targets[0].evidence, "");
  assert.deepEqual(report.targets[0].manualChecks[0], {
    check: "Confirm the grid shell renders with visible grouped rows and cells.",
    result: "todo",
    evidence: "",
  });
  assert.deepEqual(report.targets[0].accessibilityChecks[0], {
    check: manualAccessibilityChecks[0],
    result: "todo",
    evidence: "",
  });
});

test("manual UI smoke preview command can write an inspection report file", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-"));
  const markdownPath = join(reportDir, "nested", "ui-smoke-report.md");
  const jsonPath = join(reportDir, "ui-smoke-report.json");

  const markdownOutput = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--report", "--framework", "React", "--out-file", markdownPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const jsonOutput = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--report", "--json", "--framework", "Vue", `--out-file=${jsonPath}`],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(readFileSync(markdownPath, "utf8"), markdownOutput);
  assert.equal(readFileSync(jsonPath, "utf8"), jsonOutput);
  assert.match(markdownOutput, /## React/);
  assert.doesNotMatch(markdownOutput, /## Vue/);
  assert.equal(JSON.parse(jsonOutput).targets[0].framework, "Vue");
});

test("UI smoke report check accepts complete current release evidence", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-check-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  const report = createUiSmokeInspectionReport();
  completeUiSmokeInspectionReport(report);
  const reportText = JSON.stringify(report, null, 2);
  writeFileSync(reportPath, reportText);

  const output = execFileSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--allow-dirty"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const jsonOutput = execFileSync(
    process.execPath,
    [uiSmokeReportCheckPath, `--file=${reportPath}`, "--json", "--allow-dirty", "--max-age-days=7"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const result = JSON.parse(jsonOutput);
  const dispatchOutput = execFileSync(
    process.execPath,
    [
      uiSmokeReportCheckPath,
      `--file=${reportPath}`,
      "--json",
      "--allow-dirty",
      "--version=0.0.0",
      "--tag=latest",
      `--repository-url=${repositoryUrl}`,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const dispatchResult = JSON.parse(dispatchOutput);
  const rootPackage = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.equal(rootPackage.scripts["release:ui-smoke-report-check"], "node scripts/ui-smoke-report-check.mjs");
  assert.equal(rootPackage.scripts["review:smoke-ui"], "node scripts/ui-smoke-review.mjs");
  assert.match(output, /UI smoke report check passed for 3 targets, 21 functional checks, and 12 accessibility checks\./);
  assert.match(output, new RegExp(`Report file: ${escapeRegExp(resolve(reportPath))}`));
  assert.equal(result.ready, true);
  assert.deepEqual(result.source, report.source);
  assert.equal(result.allowDirty, true);
  assert.equal(result.maxAgeDays, 7);
  assert.equal(result.maxEncodedReportCharacters, 60_000);
  assert.equal(result.reportCharacters, reportText.length);
  assert.ok(result.encodedReportCharacters >= result.reportCharacters);
  assert.ok(result.encodedReportBytes >= result.encodedReportCharacters);
  assert.equal(result.workflowDispatchInputLimit, 65_535);
  assert.equal(result.workflowDispatchPayloadCharacters, undefined);
  assert.equal(dispatchResult.ready, true);
  assert.ok(dispatchResult.workflowDispatchPayloadCharacters > dispatchResult.encodedReportCharacters);
  assert.ok(dispatchResult.workflowDispatchPayloadCharacters <= dispatchResult.workflowDispatchInputLimit);
  assert.ok(dispatchResult.workflowDispatchPayloadBytes <= dispatchResult.workflowDispatchInputLimit);
  assert.equal(result.targetCount, 3);
  assert.equal(result.functionalCheckCount, 21);
  assert.equal(result.accessibilityCheckCount, 12);
  assert.deepEqual(result.failures, []);
});

test("UI smoke report check rejects evidence that cannot fit workflow dispatch", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-size-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  const report = createUiSmokeInspectionReport();
  completeUiSmokeInspectionReport(report);
  report.dispatchSizeProbe = "가".repeat(20_000);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const result = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--json", "--allow-dirty"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const checked = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(checked.ready, false);
  assert.ok(checked.encodedReportBytes > checked.maxEncodedReportCharacters);
  assert.ok(checked.failures.some((failure) => failure.includes("encoded UI smoke report must be at most 60000 characters and bytes")));
});

test("UI smoke report check rejects an oversized complete workflow dispatch payload", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-dispatch-size-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  const report = createUiSmokeInspectionReport();
  completeUiSmokeInspectionReport(report);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const result = spawnSync(
    process.execPath,
    [
      uiSmokeReportCheckPath,
      "--file",
      reportPath,
      "--json",
      "--allow-dirty",
      "--version",
      "0.0.0",
      "--tag",
      "latest",
      "--repository-url",
      `https://github.com/${"a".repeat(60_000)}`,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const checked = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(checked.ready, false);
  assert.ok(checked.encodedReportCharacters < checked.maxEncodedReportCharacters);
  assert.ok(checked.workflowDispatchPayloadCharacters > checked.workflowDispatchInputLimit);
  assert.ok(checked.failures.some((failure) => failure.includes("workflow dispatch inputs must be at most 65535 characters and bytes")));
});

test("UI smoke report check rejects an unfilled inspection template", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-todo-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  writeFileSync(reportPath, JSON.stringify(createUiSmokeInspectionReport(), null, 2));

  const result = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--json", "--allow-dirty"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(report.ready, false);
  assert.ok(report.failures.includes("reviewEnvironment.reviewer (reviewer) is required"));
  assert.ok(report.failures.includes("reviewEnvironment.browserZoom (browser zoom) is required"));
  assert.ok(report.failures.includes("reviewEnvironment.viewport (viewport) is required"));
  assert.ok(report.failures.includes('React: result must be "pass"; got "todo"'));
  assert.ok(report.failures.includes("React: evidence is required"));
  assert.ok(report.failures.includes('React accessibility checks[1]: result must be "pass"; got "todo"'));
});

test("UI smoke report check rejects stale source, targets, checks, and review dates", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-stale-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  const report = createUiSmokeInspectionReport();
  completeUiSmokeInspectionReport(report);
  report.source.revision = "0".repeat(40);
  report.source.workspaceVersion = "9.9.9";
  report.source.fingerprint = `sha256:${"0".repeat(64)}`;
  report.reviewEnvironment.date = "2000-01-01";
  report.reviewEnvironment.browserZoom = "175%";
  report.reviewEnvironment.viewport = "400 CSS px";
  report.targets[0].url = "http://127.0.0.1:9999/";
  report.targets[0].smokeCheck.primaryColumnId = "stale";
  report.targets[0].stateCheck.validationMessage = "Stale validation message";
  report.targets[0].workflowCheck.searchQuery = "stale";
  report.targets[0].manualChecks[0].check = "Stale check text";
  report.targets.push({ framework: "Angular" });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const result = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--allow-dirty", "--max-age-days", "7"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /source\.revision must match the current UI source state/);
  assert.match(result.stderr, /source\.workspaceVersion must match the current UI source state/);
  assert.match(result.stderr, /source\.fingerprint must match the current UI source state/);
  assert.match(result.stderr, /reviewEnvironment\.date must be no more than 7 day\(s\) old/);
  assert.match(result.stderr, /reviewEnvironment\.browserZoom must equal "200%"/);
  assert.match(result.stderr, /reviewEnvironment\.viewport must equal "390 CSS px"/);
  assert.match(result.stderr, /Angular: target is not part of the current UI smoke contract/);
  assert.match(result.stderr, /React: URL must match the current smoke target http:\/\/127\.0\.0\.1:4193\//);
  assert.match(result.stderr, /React: smokeCheck must match the current smoke target contract/);
  assert.match(result.stderr, /React: stateCheck must match the current smoke target contract/);
  assert.match(result.stderr, /React: workflowCheck must match the current smoke target contract/);
  assert.match(result.stderr, /React functional checks\[1\]: check text must match the current UI smoke contract/);
});

test("UI smoke report check rejects future review dates and dirty release approval", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-freshness-"));
  const reportPath = join(reportDir, "ui-smoke-report.json");
  const report = createUiSmokeInspectionReport();
  completeUiSmokeInspectionReport(report);
  report.reviewEnvironment.date = "2999-01-01";
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const future = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--allow-dirty"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(future.status, 1);
  assert.match(future.stderr, /reviewEnvironment\.date cannot be in the future/);

  report.reviewEnvironment.date = currentLocalDate();
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const releaseApproval = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", reportPath, "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const result = JSON.parse(releaseApproval.stdout);

  assert.equal(result.ready, !report.source.dirty);
  assert.equal(releaseApproval.status, report.source.dirty ? 1 : 0);
  if (report.source.dirty) {
    assert.ok(result.failures.includes("release approval requires a clean relevant source tree; regenerate after committing UI source changes"));
  }
});

test("UI smoke report check reports missing, malformed, and invalid arguments", () => {
  const reportDir = mkdtempSync(join(tmpdir(), "open-grid-ui-smoke-report-invalid-"));
  const malformedPath = join(reportDir, "malformed.json");
  writeFileSync(malformedPath, "{not-json\n");

  const missing = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", join(reportDir, "missing.json")],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const malformed = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", malformedPath, "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const missingValue = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--file", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const unknown = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--bogus"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const invalidMaxAge = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--max-age-days=-1"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const incompleteReleaseContext = spawnSync(
    process.execPath,
    [uiSmokeReportCheckPath, "--version", "0.0.0"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /report file does not exist/);
  assert.equal(malformed.status, 1);
  assert.match(JSON.parse(malformed.stdout).failures[0], /report file is not valid JSON/);
  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /UI smoke report check failed: --file requires a value/);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /UI smoke report check failed: Unknown argument: --bogus/);
  assert.equal(invalidMaxAge.status, 1);
  assert.match(invalidMaxAge.stderr, /UI smoke report check failed: --max-age-days requires a non-negative integer/);
  assert.equal(incompleteReleaseContext.status, 1);
  assert.match(incompleteReleaseContext.stderr, /UI smoke report check failed: --version, --repository-url, and --tag must be provided together/);
});

test("manual UI smoke preview command accepts browser opening in metadata modes", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--json", "--open"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const plan = JSON.parse(output);

  assert.equal(plan.targets.length, 3);
  assert.equal(plan.waitTimeoutMs, 30000);
  assert.equal(plan.targets[0].url, "http://127.0.0.1:4193/");
});

test("manual UI smoke preview command can report one framework target", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--json", "--framework", "Vue"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const plan = JSON.parse(output);

  assert.deepEqual(plan.targets.map((target) => target.framework), ["Vue"]);
  assert.equal(plan.targets[0].url, "http://127.0.0.1:4194/");
  assert.deepEqual(plan.targets[0].previewCommand, ["pnpm", "--filter", "@open-grid/example-vue-grouped", "preview", "--port", "4194"]);
  assert.deepEqual(plan.targets[0].openCommand, ["pnpm", "preview:smoke-ui", "--", "--framework", "Vue", "--open"]);
});

test("manual UI smoke preview command reports a custom open wait timeout", () => {
  const output = execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--json", "--framework=Vue", "--wait-timeout-ms", "45000"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const plan = JSON.parse(output);

  assert.equal(plan.waitTimeoutMs, 45000);
  assert.deepEqual(plan.targets.map((target) => target.framework), ["Vue"]);
});

test("manual UI smoke preview command rejects invalid open wait timeouts before starting servers", () => {
  for (const args of [
    ["--wait-timeout-ms", "0"],
    ["--wait-timeout-ms=-1"],
    ["--wait-timeout-ms=1.5"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [uiSmokePreviewPath, "--", ...args],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /UI smoke preview failed: --wait-timeout-ms requires a positive integer/);
  }
});

test("manual UI smoke preview command requires open wait timeout values", () => {
  const result = spawnSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--wait-timeout-ms", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /UI smoke preview failed: --wait-timeout-ms requires a value/);
});

test("manual UI smoke preview command only writes report files in report mode", () => {
  const result = spawnSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--out-file", join(tmpdir(), "open-grid-ui-smoke-report.md")],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /UI smoke preview failed: --out-file can only be used with --report/);
});

test("manual UI smoke preview command requires output file values", () => {
  for (const args of [
    ["--report", "--out-file"],
    ["--report", "--out-file", "--json"],
    ["--report", "--out-file="],
  ]) {
    const result = spawnSync(
      process.execPath,
      [uiSmokePreviewPath, "--", ...args],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /UI smoke preview failed: --out-file requires a value/);
  }
});

test("manual UI smoke preview command rejects invalid framework filters before starting servers", () => {
  const result = spawnSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--framework", "Angular"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /UI smoke preview failed: Unknown framework: Angular; expected one of React, Vue, Svelte/);
});

test("manual UI smoke preview command requires framework filter values", () => {
  const result = spawnSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--framework", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /UI smoke preview failed: --framework requires a value/);
});

test("manual UI smoke preview command rejects unknown arguments before starting servers", () => {
  const result = spawnSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--bogus"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /UI smoke preview failed: Unknown argument: --bogus/);
});

test("release trusted publishing plan reports package settings for the guarded publish workflow", () => {
  const workspace = createWorkspace(validPublishWorkflow());

  try {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(output);

    assert.equal(plan.githubOwner, "example");
    assert.equal(plan.githubRepository, "open-grid");
    assert.equal(plan.workflowFilename, "release-publish.yml");
    assert.equal(plan.environment, "npm");
    assert.equal(plan.allowedAction, "npm publish");
    assert.deepEqual(plan.githubEnvironment, {
      name: "npm",
      requiredForWorkflow: "release-publish.yml",
      purpose: "Protect npm trusted publishing and provenance release jobs before first publish.",
    });
    assert.deepEqual(plan.releaseWorkflowInputs, {
      version: "0.0.0",
      repository_url: repositoryUrl,
      confirm_publish: "publish-open-grid",
      npm_tag: "latest",
      ui_smoke_report: "@.release/ui-smoke-report.json",
    });
    assert.deepEqual(
      plan.packages.map((pkg) => pkg.name),
      ["@open-grid/core", "@open-grid/react"],
    );
    assert.deepEqual(plan.packages[0].trustedPublisher, {
      provider: "GitHub Actions",
      organizationOrUser: "example",
      repository: "open-grid",
      workflow: "release-publish.yml",
      environment: "npm",
      allowedAction: "npm publish",
    });
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan reports a markdown setup checklist", () => {
  const workspace = createWorkspace(validPublishWorkflow());

  try {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "--", "--version", "1.2.3", "--tag", "next", "--repository-url", repositoryUrl, "--markdown"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.match(output, /# Trusted Publishing Setup Checklist/);
    assert.match(output, new RegExp(`- Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(output, /- GitHub repository: example\/open-grid/);
    assert.match(output, /- Workflow: release-publish\.yml/);
    assert.match(output, /- Environment: npm/);
    assert.match(output, /- Allowed action: npm publish/);
    assert.match(output, /## GitHub Environment/);
    assert.match(output, /- \[ \] Create or confirm environment `npm`\./);
    assert.match(output, /- \[ \] Require it for `release-publish\.yml`\./);
    assert.match(output, /## Release Publish Workflow Inputs/);
    assert.match(output, /- \[ \] version: `1\.2\.3`/);
    assert.match(output, new RegExp(`- \\[ \\] repository_url: \`${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``));
    assert.match(output, /- \[ \] npm_tag: `next`/);
    assert.match(output, /- \[ \] confirm_publish: `publish-open-grid`/);
    assert.match(output, /- \[ \] ui_smoke_report: `@\.release\/ui-smoke-report\.json`/);
    assert.match(output, /## npm Trusted Publishers/);
    assert.match(output, /### @open-grid\/core/);
    assert.match(output, /- \[ \] Provider: `GitHub Actions`/);
    assert.match(output, /- \[ \] GitHub organization\/user: `example`/);
    assert.match(output, /- \[ \] GitHub repository: `open-grid`/);
    assert.match(output, /- \[ \] Workflow filename: `release-publish\.yml`/);
    assert.match(output, /### @open-grid\/react/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release workflows run readiness and all benchmark budget checks", () => {
  const releaseVerifyWorkflow = readFileSync(join(repoRoot, ".github", "workflows", "release-verify.yml"), "utf8");
  const releasePublishWorkflow = readFileSync(join(repoRoot, ".github", "workflows", "release-publish.yml"), "utf8");

  assert.match(releaseVerifyWorkflow, /pnpm release:check -- --json/);
  assert.match(releaseVerifyWorkflow, /pnpm benchmark:bundle:run/);
  assert.match(releaseVerifyWorkflow, /pnpm benchmark:structure:e2e/);
  assert.match(releaseVerifyWorkflow, /pnpm benchmark:framework:heap:budget:measure && pnpm benchmark:framework:heap:budget:check/);
  assert.doesNotMatch(releaseVerifyWorkflow, /benchmark:timing/);
  assert.match(releaseVerifyWorkflow, /pnpm benchmark:core-filter:massive:run/);
  assert.match(releaseVerifyWorkflow, /pnpm benchmark:server:budget:run/);
  assert.match(releaseVerifyWorkflow, /pull_request:\s*$/m);
  assert.doesNotMatch(releaseVerifyWorkflow, /pull_request:\s*\n\s+paths:/);
  assert.match(releaseVerifyWorkflow, /^  changes:$/m);
  assert.match(releaseVerifyWorkflow, /git diff --name-only "\$BASE_SHA" "\$HEAD_SHA"/);
  assert.match(releaseVerifyWorkflow, /benchmarks\/\*/);
  assert.match(releaseVerifyWorkflow, /scripts\/benchmark-\*\.mjs/);
  assert.match(releaseVerifyWorkflow, /scripts\/server-benchmark-\*\.mjs/);
  assert.match(releaseVerifyWorkflow, /playwright\.\*\.config\.ts/);
  assert.match(releaseVerifyWorkflow, /if: needs\.changes\.outputs\.release == 'true'/);
  assert.match(releaseVerifyWorkflow, /pnpm release:first-publish-status -- --version "\$RELEASE_VERSION" --repository-url git\+https:\/\/github\.com\/example\/open-grid\.git --skip-github-push --json/);
  assert.match(releaseVerifyWorkflow, /concurrency:[\s\S]*?cancel-in-progress: true/);
  assert.match(releaseVerifyWorkflow, /^  release-artifacts:$/m);
  assert.match(releaseVerifyWorkflow, /^  browser-budgets:$/m);
  assert.match(releaseVerifyWorkflow, /^  compute-budgets:$/m);
  assert.match(releaseVerifyWorkflow, /^  full-e2e:$/m);
  assert.match(releaseVerifyWorkflow, /^  required-gate:$/m);
  assert.match(releaseVerifyWorkflow, /name: Release Gate/);
  assert.match(releaseVerifyWorkflow, /RELEASE_RELATED: \$\{\{ needs\.changes\.outputs\.release \}\}/);
  assert.match(releaseVerifyWorkflow, /if \[ "\$RELEASE_RELATED" != "true" \]; then\s+exit 0/);
  assert.match(releaseVerifyWorkflow, /test "\$ARTIFACTS_RESULT" = "success"/);
  assert.match(releaseVerifyWorkflow, /test "\$BROWSER_RESULT" = "success"/);
  assert.match(releaseVerifyWorkflow, /test "\$COMPUTE_RESULT" = "success"/);
  assert.match(releaseVerifyWorkflow, /test "\$E2E_RESULT" = "success"/);
  assert.match(
    releaseVerifyWorkflow,
    /compute-budgets:[\s\S]*?pnpm exec playwright install --with-deps chromium[\s\S]*?pnpm benchmark:server:budget:run/,
  );
  assert.doesNotMatch(releaseVerifyWorkflow, /run: pnpm check$/m);
  assert.doesNotMatch(releaseVerifyWorkflow, /run: pnpm test$/m);
  assert.doesNotMatch(releaseVerifyWorkflow, /run: pnpm build:examples$/m);
  assert.doesNotMatch(releaseVerifyWorkflow, /run: pnpm e2e:smoke$/m);
  assert.match(releasePublishWorkflow, /pnpm release:check -- --json/);
  assert.match(releasePublishWorkflow, /pnpm benchmark:bundle:run/);
  assert.match(releasePublishWorkflow, /pnpm benchmark:structure:e2e/);
  assert.match(releasePublishWorkflow, /pnpm benchmark:framework:heap:budget:measure && pnpm benchmark:framework:heap:budget:check/);
  assert.doesNotMatch(releasePublishWorkflow, /benchmark:timing/);
  assert.match(releasePublishWorkflow, /pnpm benchmark:core-filter:massive:run/);
  assert.match(releasePublishWorkflow, /pnpm benchmark:server:budget:run/);
  assert.ok(releasePublishWorkflow.indexOf("pnpm benchmark:bundle:run") < releasePublishWorkflow.indexOf("pnpm benchmark:structure:e2e"));
  assert.ok(releasePublishWorkflow.indexOf("pnpm benchmark:structure:e2e") < releasePublishWorkflow.indexOf("pnpm benchmark:framework:heap:budget:measure"));
  assert.ok(releasePublishWorkflow.indexOf("pnpm benchmark:framework:heap:budget:measure") < releasePublishWorkflow.indexOf("pnpm benchmark:core-filter:massive:run"));
  assert.ok(releasePublishWorkflow.indexOf("pnpm benchmark:core-filter:massive:run") < releasePublishWorkflow.indexOf("pnpm benchmark:server:budget:run"));
  assert.match(releasePublishWorkflow, /ui_smoke_report:[\s\S]*?required: true/);
  assert.match(releasePublishWorkflow, /UI_SMOKE_REPORT: \$\{\{ github\.event\.inputs\.ui_smoke_report \}\}/);
  assert.match(releasePublishWorkflow, /printf '%s' "\$UI_SMOKE_REPORT" > \.release\/ui-smoke-report\.json/);
  assert.match(releasePublishWorkflow, /pnpm release:ui-smoke-report-check -- --version "\$RELEASE_VERSION" --tag "\$NPM_TAG" --repository-url "\$REPOSITORY_URL" --json/);
  assert.ok(
    releasePublishWorkflow.indexOf(workflowUiSmokeValidationCommand)
      < releasePublishWorkflow.indexOf("pnpm release:publish -- --version"),
  );
  assert.match(releasePublishWorkflow, /pnpm e2e:smoke/);
});

test("release trusted publishing plan requires optional setup values before checking workflow shape", () => {
  const cases = [
    { args: ["--workflow", "--json"], option: "--workflow" },
    { args: ["--workflow=", "--json"], option: "--workflow" },
    { args: ["--environment", "--json"], option: "--environment" },
    { args: ["--environment=", "--json"], option: "--environment" },
    { args: ["--allowed-action", "--json"], option: "--allowed-action" },
    { args: ["--allowed-action=", "--json"], option: "--allowed-action" },
  ];

  for (const { args, option } of cases) {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, ...args],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Release trusted publishing plan failed: ${option} requires a value`));
  }
});

test("release trusted publishing plan rejects missing publish workflow guards", () => {
  const workspace = createWorkspace(unguardedPublishWorkflow());

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: workflow must validate npm_tag before publishing",
      "release-publish.yml: workflow must validate version before publishing",
      "release-publish.yml: workflow_dispatch must require confirm_publish",
      "release-publish.yml: workflow_dispatch must require ui_smoke_report",
      "release-publish.yml: workflow must require the publish-open-grid confirmation phrase before publishing",
      "release-publish.yml: workflow must install npm 11 for trusted publishing",
      "release-publish.yml: release readiness check must run with --json",
      "release-publish.yml: workflow must materialize and validate ui_smoke_report before publishing",
      "release-publish.yml: trusted-publishing preflight must pass --version \"$RELEASE_VERSION\", --tag \"$NPM_TAG\", and --repository-url \"$REPOSITORY_URL\"",
      "release-publish.yml: publish dry-run must pass --repository-url \"$REPOSITORY_URL\" before --dry-run",
      "release-publish.yml: workflow must run pnpm e2e:smoke before the full e2e suite",
      "release-publish.yml: publish command must pass --repository-url \"$REPOSITORY_URL\" before actual publishing",
      "release-publish.yml: publish command must include --provenance",
      "release-publish.yml: publish command must pass --confirm publish-open-grid",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan reports workflow inputs in text failure output", () => {
  const workspace = createWorkspace(unguardedPublishWorkflow());

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--version", "0.0.0", "--tag", "next", "--repository-url", repositoryUrl],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Release trusted publishing plan failed:/);
    assert.match(result.stderr, new RegExp(`Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /Workflow: release-publish\.yml/);
    assert.match(result.stderr, /Environment: npm/);
    assert.match(result.stderr, /Allowed action: npm publish/);
    assert.match(result.stderr, /Release Publish workflow inputs:/);
    assert.match(result.stderr, /- version: 0\.0\.0/);
    assert.match(result.stderr, new RegExp(`- repository_url: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /- npm_tag: next/);
    assert.match(result.stderr, /- confirm_publish: publish-open-grid/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, /workflow must validate npm_tag before publishing/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan requires json release readiness checks", () => {
  const workspace = createWorkspace(validPublishWorkflow().replace("pnpm release:check -- --json", "pnpm release:check"));

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, ["release-publish.yml: release readiness check must run with --json"]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan rejects a missing UI evidence validation gate", () => {
  const workspace = createWorkspace(
    validPublishWorkflow().replace(workflowUiSmokeValidationCommand, "echo skip-ui-evidence-validation"),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: workflow must materialize and validate ui_smoke_report before publishing",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan rejects dirty UI evidence validation", () => {
  const workspace = createWorkspace(
    validPublishWorkflow().replace(
      workflowUiSmokeValidationCommand,
      'pnpm release:ui-smoke-report-check -- --version "$RELEASE_VERSION" --tag "$NPM_TAG" --repository-url "$REPOSITORY_URL" --allow-dirty --json',
    ),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: workflow must materialize and validate ui_smoke_report before publishing",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan requires dispatch context for UI evidence validation", () => {
  const workspace = createWorkspace(
    validPublishWorkflow().replace(' --tag "$NPM_TAG"', ""),
  );

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: workflow must materialize and validate ui_smoke_report before publishing",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan rejects missing release input requirements", () => {
  const workspace = createWorkspace(missingRequiredReleaseInputsWorkflow());

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: workflow_dispatch must require version",
      "release-publish.yml: workflow_dispatch must require npm_tag",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan rejects actual publish without the repository URL", () => {
  const workspace = createWorkspace(actualPublishWithoutRepositoryUrlWorkflow());

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: publish command must pass --repository-url \"$REPOSITORY_URL\" before actual publishing",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan rejects workflow preflight without requested inputs", () => {
  const workspace = createWorkspace(trustedPublishingWithoutRequestedInputsWorkflow());

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(plan.failures, [
      "release-publish.yml: trusted-publishing preflight must pass --version \"$RELEASE_VERSION\", --tag \"$NPM_TAG\", and --repository-url \"$REPOSITORY_URL\"",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release trusted publishing plan reports requested release workflow inputs", () => {
  const workspace = createWorkspace(validPublishWorkflow());

  try {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "--", "--version", "1.2.3", "--tag", "next", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const plan = JSON.parse(output);

    assert.deepEqual(plan.releaseWorkflowInputs, {
      version: "1.2.3",
      repository_url: repositoryUrl,
      confirm_publish: "publish-open-grid",
      npm_tag: "next",
      ui_smoke_report: "@.release/ui-smoke-report.json",
    });
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish preflight requires the public repository URL before running gates", () => {
  const result = spawnSync(process.execPath, [firstPublishPreflightPath], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /First publish preflight failed: --repository-url requires a value/);
});

test("release github push preflight reports clean branch state without pushing", () => {
  const workspace = createGitPushWorkspace();

  try {
    const output = execFileSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const preflight = JSON.parse(output);

    assert.equal(preflight.ready, true);
    assert.equal(preflight.repositoryUrl, repositoryUrl);
    assert.equal(preflight.remote, "origin");
    assert.equal(preflight.branch, "main");
    assert.equal(preflight.remoteUrl, "git@github.com:example/open-grid.git");
    assert.equal(preflight.remoteTransport, "ssh");
    assert.equal(preflight.workingTreeClean, true);
    assert.equal(preflight.aheadCount, 1);
    assert.equal(preflight.behindCount, 0);
    assert.equal(preflight.pushCommand, "git push -u origin main");
    assert.match(preflight.head.subject, /prepare release branch/);
    assert.ok(preflight.nextExternalActions[0].includes("git push -u origin main"));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("release:first-publish-status")));
    assert.deepEqual(preflight.nextVerificationCommands, [
      "git push -u origin main",
      `pnpm release:github-push-preflight -- --repository-url ${quotedRepositoryUrl} --check-auth`,
      `pnpm release:first-publish-status -- --repository-url ${quotedRepositoryUrl} --check-auth`,
      `pnpm release:first-publish-preflight -- --repository-url ${quotedRepositoryUrl}`,
      `pnpm release:trusted-publishing -- --repository-url ${quotedRepositoryUrl}`,
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release github push preflight can verify GitHub SSH auth without pushing", () => {
  const workspace = createGitPushWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-ssh-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-success.sh"),
      `#!/bin/sh
echo "Hi example! You've successfully authenticated, but GitHub does not provide shell access." >&2
exit 1
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add.sh"),
      `#!/bin/sh
echo "256 SHA256:test-fingerprint open-grid@example.com (ED25519)"
exit 0
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_ed25519"), "fixture private key\n");
    writeFile(join(sshDir, "id_ed25519.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFixture open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "256 SHA256:fixture-public-key open-grid@example.com (ED25519)"
exit 0
`,
    );
    const output = execFileSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const preflight = JSON.parse(output);

    assert.equal(preflight.ready, true);
    assert.equal(preflight.authChecked, true);
    assert.equal(preflight.authReady, true);
    assert.match(preflight.authCommand, /git@github\.com/);
    assert.match(preflight.authMessage, /successfully authenticated/);
    assert.deepEqual(preflight.sshAgent, {
      available: true,
      keyCount: 1,
      fingerprints: ["256 SHA256:test-fingerprint open-grid@example.com (ED25519)"],
    });
    assert.equal(preflight.sshKeyCandidates.publicKeyCount, 1);
    assert.deepEqual(preflight.sshKeyCandidates.keys, [
      {
        file: join(sshDir, "id_ed25519.pub"),
        fingerprint: "256 SHA256:fixture-public-key open-grid@example.com (ED25519)",
        pairedPrivateKey: join(sshDir, "id_ed25519"),
        loadCommand: `${sshAddCommand} ${join(sshDir, "id_ed25519")}`,
      },
    ]);
    assert.deepEqual(preflight.sshKeyLoadCommands, [
      `${sshAddCommand} ${join(sshDir, "id_ed25519")}`,
    ]);
    assert.deepEqual(preflight.sshPublicKeyReviewCommands, [
      `cat ${join(sshDir, "id_ed25519.pub")}`,
    ]);
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("SSH authentication was checked")));
    assert.ok(preflight.nextVerificationCommands.some((command) => command.includes("release:first-publish-status")));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("release github push preflight reports a markdown push checklist", () => {
  const workspace = createGitPushWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-ssh-markdown-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-success.sh"),
      `#!/bin/sh
echo "Hi example! You've successfully authenticated, but GitHub does not provide shell access." >&2
exit 1
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add.sh"),
      `#!/bin/sh
echo "256 SHA256:test-fingerprint open-grid@example.com (ED25519)"
exit 0
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_ed25519"), "fixture private key\n");
    writeFile(join(sshDir, "id_ed25519.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFixture open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "256 SHA256:fixture-public-key open-grid@example.com (ED25519)"
exit 0
`,
    );
    const output = execFileSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--markdown"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.match(output, /# GitHub Push Preflight Report/);
    assert.match(output, new RegExp(`- Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(output, /- Remote URL: git@github\.com:example\/open-grid\.git/);
    assert.match(output, /- Remote transport: ssh/);
    assert.match(output, /- Branch: main/);
    assert.match(output, /- Result: passed/);
    assert.match(output, /- Working tree: clean/);
    assert.match(output, /- Ahead of remote: 1/);
    assert.match(output, /- SSH auth check: ready via .*git@github\.com/);
    assert.match(output, /- GitHub SSH key settings: https:\/\/github\.com\/settings\/keys/);
    assert.match(output, /- GitHub SSH setup docs: https:\/\/docs\.github\.com\/en\/authentication\/connecting-to-github-with-ssh\/adding-a-new-ssh-key-to-your-github-account/);
    assert.match(output, /## Loaded SSH Keys/);
    assert.match(output, /- \[x\] `256 SHA256:test-fingerprint open-grid@example\.com \(ED25519\)`/);
    assert.match(output, /## SSH Public Key Candidates/);
    assert.match(output, /id_ed25519\.pub: 256 SHA256:fixture-public-key open-grid@example\.com \(ED25519\)/);
    assert.match(output, /load: .*fake-ssh-add\.sh .*id_ed25519/);
    assert.match(output, /## SSH Key Load Commands/);
    assert.match(output, /- \[ \] `.*fake-ssh-add\.sh .*id_ed25519`/);
    assert.match(output, /## SSH Public Key Review Commands/);
    assert.match(output, /- \[ \] `cat .*id_ed25519\.pub`/);
    assert.match(output, /## Push Readiness/);
    assert.match(output, /- \[x\] Working tree is clean/);
    assert.match(output, /- \[x\] GitHub SSH authentication is ready/);
    assert.match(output, /- \[x\] Ready for git push -u origin main/);
    assert.match(output, /## Next External Actions/);
    assert.match(output, /- \[ \] Run git push -u origin main with GitHub credentials available\./);
    assert.match(output, /## Next Verification Commands/);
    assert.match(output, /- \[ \] `pnpm release:first-publish-status -- --repository-url/);
    assert.doesNotMatch(output, /## Failures/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("first publish status summarizes local readiness and external publish blockers", () => {
  const workspace = createFirstPublishStatusWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-status-ssh-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-success.sh"),
      `#!/bin/sh
echo "Hi example! You've successfully authenticated, but GitHub does not provide shell access." >&2
exit 1
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add.sh"),
      `#!/bin/sh
echo "256 SHA256:status-fingerprint open-grid@example.com (ED25519)"
exit 0
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_status"), "fixture private key\n");
    writeFile(join(sshDir, "id_status.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIStatus open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "256 SHA256:status-public-key open-grid@example.com (ED25519)"
exit 0
`,
    );
    const output = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const status = JSON.parse(output);

    assert.equal(status.localReady, true);
    assert.equal(status.externalReady, false);
    assert.equal(status.ready, false);
    assert.match(status.commercializationStatus, /Local release gates are ready/);
    assert.deepEqual(status.commercializationProgress, {
      completedStages: 2,
      remainingStageCount: 2,
      totalStages: 4,
      percent: 50,
      currentStageId: "externalGithubNpmSetup",
      currentStage: "External GitHub npm environment and npm Trusted Publisher setup are complete",
      nextAction: "Push the release branch, create the GitHub npm environment, configure npm Trusted Publisher settings, then run release-publish.yml.",
      nextRequiredActions: [
        "Open https://github.com/example/open-grid/settings/environments and create or confirm the protected GitHub environment named npm for release-publish.yml.",
        "Configure npm Trusted Publisher settings for 1 publishable package(s) using the trustedPublisherSetup package entries.",
        "Start with @open-grid/core at https://www.npmjs.com/package/%40open-grid%2Fcore/access, then repeat the same Trusted Publisher fields for the remaining package access URLs.",
      ],
      nextVerificationCommands: [
        'pnpm release:trusted-publishing -- --version 0.0.0 --tag latest --repository-url "git+https://github.com/example/open-grid.git"',
      ],
      stages: [
        {
          id: "localFirstPublishGates",
          label: "Local first-publish gates pass",
          completed: true,
          requiredActions: [],
          verificationCommands: [
            'pnpm release:first-publish-preflight -- --version 0.0.0 --tag latest --repository-url "git+https://github.com/example/open-grid.git"',
          ],
        },
        {
          id: "githubPushReadiness",
          label: "GitHub push readiness passes",
          completed: true,
          requiredActions: [],
          verificationCommands: [
            'pnpm release:github-push-preflight -- --repository-url "git+https://github.com/example/open-grid.git" --check-auth',
          ],
        },
        {
          id: "externalGithubNpmSetup",
          label: "External GitHub npm environment and npm Trusted Publisher setup are complete",
          completed: false,
          requiredActions: [
            "Open https://github.com/example/open-grid/settings/environments and create or confirm the protected GitHub environment named npm for release-publish.yml.",
            "Configure npm Trusted Publisher settings for 1 publishable package(s) using the trustedPublisherSetup package entries.",
            "Start with @open-grid/core at https://www.npmjs.com/package/%40open-grid%2Fcore/access, then repeat the same Trusted Publisher fields for the remaining package access URLs.",
          ],
          verificationCommands: [
            'pnpm release:trusted-publishing -- --version 0.0.0 --tag latest --repository-url "git+https://github.com/example/open-grid.git"',
          ],
        },
        {
          id: "releasePublishWorkflow",
          label: "Manual release-publish.yml workflow has run successfully",
          completed: false,
          requiredActions: [
            "Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete.",
          ],
          verificationCommands: [
            'gh workflow run release-publish.yml --repo example/open-grid -f version=0.0.0 -f repository_url="git+https://github.com/example/open-grid.git" -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@.release/ui-smoke-report.json',
          ],
        },
      ],
      remainingStages: [
        {
          id: "externalGithubNpmSetup",
          label: "External GitHub npm environment and npm Trusted Publisher setup are complete",
          completed: false,
          requiredActions: [
            "Open https://github.com/example/open-grid/settings/environments and create or confirm the protected GitHub environment named npm for release-publish.yml.",
            "Configure npm Trusted Publisher settings for 1 publishable package(s) using the trustedPublisherSetup package entries.",
            "Start with @open-grid/core at https://www.npmjs.com/package/%40open-grid%2Fcore/access, then repeat the same Trusted Publisher fields for the remaining package access URLs.",
          ],
          verificationCommands: [
            'pnpm release:trusted-publishing -- --version 0.0.0 --tag latest --repository-url "git+https://github.com/example/open-grid.git"',
          ],
        },
        {
          id: "releasePublishWorkflow",
          label: "Manual release-publish.yml workflow has run successfully",
          completed: false,
          requiredActions: [
            "Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete.",
          ],
          verificationCommands: [
            'gh workflow run release-publish.yml --repo example/open-grid -f version=0.0.0 -f repository_url="git+https://github.com/example/open-grid.git" -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@.release/ui-smoke-report.json',
          ],
        },
      ],
    });
    assert.deepEqual(status.commercializationNextStep, {
      id: "externalGithubNpmSetup",
      label: "External GitHub npm environment and npm Trusted Publisher setup are complete",
      completedStages: 2,
      remainingStageCount: 2,
      totalStages: 4,
      percent: 50,
      requiredActions: [
        "Open https://github.com/example/open-grid/settings/environments and create or confirm the protected GitHub environment named npm for release-publish.yml.",
        "Configure npm Trusted Publisher settings for 1 publishable package(s) using the trustedPublisherSetup package entries.",
        "Start with @open-grid/core at https://www.npmjs.com/package/%40open-grid%2Fcore/access, then repeat the same Trusted Publisher fields for the remaining package access URLs.",
      ],
      verificationCommands: [
        'pnpm release:trusted-publishing -- --version 0.0.0 --tag latest --repository-url "git+https://github.com/example/open-grid.git"',
      ],
    });
    assert.deepEqual(status.trustedPublisherSetup.githubEnvironment, {
      name: "npm",
      requiredForWorkflow: "release-publish.yml",
      githubSettingsUrl: "https://github.com/example/open-grid/settings/environments",
      purpose: "Protect npm trusted publishing and provenance release jobs before first publish.",
    });
    assert.deepEqual(status.trustedPublisherSetup.releaseWorkflowInputs, {
      version: "0.0.0",
      repository_url: repositoryUrl,
      confirm_publish: "publish-open-grid",
      npm_tag: "latest",
      ui_smoke_report: "@.release/ui-smoke-report.json",
    });
    assert.deepEqual(status.releasePublishWorkflowRun, {
      workflow: ".github/workflows/release-publish.yml",
      workflowFilename: "release-publish.yml",
      githubRepository: "example/open-grid",
      githubActionsUrl: "https://github.com/example/open-grid/actions/workflows/release-publish.yml",
      dispatchCommand: `gh workflow run release-publish.yml --repo example/open-grid -f version=0.0.0 -f repository_url=${quotedRepositoryUrl} -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@.release/ui-smoke-report.json`,
      instruction: "Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete.",
      inputs: {
        version: "0.0.0",
        repository_url: repositoryUrl,
        confirm_publish: "publish-open-grid",
        npm_tag: "latest",
        ui_smoke_report: "@.release/ui-smoke-report.json",
      },
      gates: [
        "pnpm preview:smoke-ui -- --markdown",
        "pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md",
        "pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json",
        "pnpm review:smoke-ui",
        "pnpm release:ui-smoke-report-check",
        "pnpm e2e:smoke",
        "pnpm e2e",
      ],
    });
    assert.equal(status.trustedPublisherSetup.packageCount, 1);
    assert.equal(status.trustedPublisherSetup.packages[0].name, "@open-grid/core");
    assert.equal(status.trustedPublisherSetup.packages[0].npmPackageUrl, "https://www.npmjs.com/package/%40open-grid%2Fcore");
    assert.equal(status.trustedPublisherSetup.packages[0].npmAccessUrl, "https://www.npmjs.com/package/%40open-grid%2Fcore/access");
    assert.deepEqual(status.trustedPublisherSetup.packages[0].trustedPublisher, {
      provider: "GitHub Actions",
      organizationOrUser: "example",
      repository: "open-grid",
      workflow: "release-publish.yml",
      environment: "npm",
      allowedAction: "npm publish",
    });
    assert.deepEqual(status.blockers, []);
    assert.equal(status.steps.githubPush.status, 0);
    assert.equal(status.steps.githubPush.result.authReady, true);
    assert.equal(status.steps.githubPush.result.githubSshKeySettingsUrl, "https://github.com/settings/keys");
    assert.equal(status.steps.githubPush.result.githubSshDocsUrl, "https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account");
    assert.deepEqual(status.steps.githubPush.result.sshAgent, {
      available: true,
      keyCount: 1,
      fingerprints: ["256 SHA256:status-fingerprint open-grid@example.com (ED25519)"],
    });
    assert.deepEqual(status.steps.githubPush.result.sshKeyCandidates.keys, [
      {
        file: join(sshDir, "id_status.pub"),
        fingerprint: "256 SHA256:status-public-key open-grid@example.com (ED25519)",
        pairedPrivateKey: join(sshDir, "id_status"),
        loadCommand: `${sshAddCommand} ${join(sshDir, "id_status")}`,
      },
    ]);
    assert.deepEqual(status.steps.githubPush.result.sshKeyLoadCommands, [
      `${sshAddCommand} ${join(sshDir, "id_status")}`,
    ]);
    assert.deepEqual(status.steps.githubPush.result.sshPublicKeyReviewCommands, [
      `cat ${join(sshDir, "id_status.pub")}`,
    ]);
    assert.equal(status.steps.firstPublish.status, 0);
    assert.equal(status.manualUiSmokeTargets.length, 3);
    assert.equal(status.manualUiSmokeTargets[0].framework, "React");
    assert.equal(status.manualUiSmokeTargets[0].url, "http://127.0.0.1:4193/");
    assert.equal(status.manualUiSmokeTargets[0].openCommand, "pnpm preview:smoke-ui -- --framework React --open");
    assert.equal(status.manualUiSmokeTargets[0].openWaitTimeoutMs, 30000);
    assert.deepEqual(status.manualUiSmokeTargets[0].smokeCheck, reactUiSmokeCheck);
    assert.deepEqual(status.manualUiSmokeTargets[0].stateCheck, reactUiStateCheck);
    assert.ok(status.manualUiSmokeTargets[0].manualChecks.some((check) => check.includes("Customer column header")));
    assert.deepEqual(status.manualUiSmokeTargets[0].accessibilityChecks, manualAccessibilityChecks);
    assert.ok(status.remainingExternalActions.includes("Open https://github.com/example/open-grid/settings/environments and create or confirm the protected GitHub environment named npm for release-publish.yml."));
    assert.ok(status.remainingExternalActions.includes("Configure npm Trusted Publisher settings for 1 publishable package(s) using the trustedPublisherSetup package entries."));
    assert.ok(status.remainingExternalActions.includes("Start with @open-grid/core at https://www.npmjs.com/package/%40open-grid%2Fcore/access, then repeat the same Trusted Publisher fields for the remaining package access URLs."));
    assert.ok(status.remainingExternalActions.some((action) => action.includes("release-publish.yml")));
    assert.ok(status.remainingExternalActions.some((action) => action.includes("git push -u origin main")));
    assert.ok(status.remainingExternalActions.some((action) => action.includes("with the generated version")));
    assert.equal(
      status.remainingExternalActions.filter((action) => action.includes("release-publish.yml manually")).length,
      1,
    );
    assert.equal(
      status.remainingExternalActions.some((action) => action.startsWith("Push the current release branch")),
      false,
    );
    assert.equal(
      status.remainingExternalActions.some((action) => action.includes("after the public GitHub push")),
      false,
    );
    assert.equal(
      status.remainingExternalActions.some((action) => action.includes("using the trustedPublishing step output")),
      false,
    );
    assert.deepEqual(status.nextVerificationCommands, [
      `pnpm release:github-push-preflight -- --repository-url ${quotedRepositoryUrl} --check-auth`,
      `pnpm release:first-publish-status -- --version 0.0.0 --tag latest --repository-url ${quotedRepositoryUrl} --check-auth`,
      `pnpm release:first-publish-preflight -- --version 0.0.0 --tag latest --repository-url ${quotedRepositoryUrl}`,
      `pnpm release:trusted-publishing -- --version 0.0.0 --tag latest --repository-url ${quotedRepositoryUrl}`,
      "pnpm preview:smoke-ui -- --markdown",
      "pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md",
      "pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json",
      "pnpm preview:smoke-ui -- --open",
      "pnpm review:smoke-ui",
      "pnpm release:ui-smoke-report-check",
      "pnpm e2e:smoke",
      "pnpm e2e",
    ]);
    assert.deepEqual(status.externalSetupVerification, {
      instruction: "Run these checks again after the GitHub push, protected GitHub npm environment, npm Trusted Publisher settings, and manual Release Publish workflow setup are complete.",
      commands: status.nextVerificationCommands,
      successCriteria: [
        "GitHub push preflight passes with --check-auth.",
        "First-publish status reports local readiness ready and no local blockers.",
        "First-publish preflight and trusted-publishing preflight pass for the same repository URL, version, and npm tag.",
        "Manual UI smoke checklist, inspection reports, structured report validation, browser-open inspection, quick e2e smoke, and full e2e pass before the Release Publish workflow run.",
      ],
    });
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("first publish status can verify CI first-publish gates without GitHub push state", () => {
  const workspace = createFirstPublishStatusWorkspace();

  try {
    const output = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--skip-github-push", "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const status = JSON.parse(output);

    assert.equal(status.githubPushSkipped, true);
    assert.equal(status.verificationReady, true);
    assert.equal(status.localReady, false);
    assert.equal(status.externalReady, false);
    assert.equal(status.ready, false);
    assert.match(status.commercializationStatus, /GitHub push readiness was skipped/);
    assert.deepEqual(status.blockers, []);
    assert.equal(status.steps.githubPush.skipped, true);
    assert.equal(status.steps.firstPublish.status, 0);
    assert.ok(status.remainingExternalActions.some((action) => action.includes("release:github-push-preflight")));
    assert.ok(status.nextVerificationCommands.some((command) => command.includes("release:github-push-preflight")));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish status can print only the next commercialization step", () => {
  const workspace = createFirstPublishStatusWorkspace();

  try {
    const jsonOutput = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--skip-github-push", "--next-step", "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const nextStep = JSON.parse(jsonOutput);

    assert.deepEqual(nextStep, {
      id: "githubPushReadiness",
      label: "Real GitHub push readiness is checked outside CI skip mode",
      completedStages: 1,
      remainingStageCount: 3,
      totalStages: 4,
      percent: 25,
      requiredActions: [
        "Run a real local GitHub push preflight without --skip-github-push before first publish.",
      ],
      verificationCommands: [
        'pnpm release:github-push-preflight -- --repository-url "git+https://github.com/example/open-grid.git" --check-auth',
      ],
    });

    const textOutput = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--skip-github-push", "--next-step"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.match(textOutput, /Next commercialization step:/);
    assert.match(textOutput, /Stage: githubPushReadiness/);
    assert.match(textOutput, /Label: Real GitHub push readiness is checked outside CI skip mode/);
    assert.match(textOutput, /Progress: 1\/4 stage\(s\), 25%/);
    assert.match(textOutput, /Remaining stages: 3/);
    assert.match(textOutput, /- Run a real local GitHub push preflight without --skip-github-push before first publish\./);
    assert.match(textOutput, /- pnpm release:github-push-preflight -- --repository-url "git\+https:\/\/github\.com\/example\/open-grid\.git" --check-auth/);
    assert.doesNotMatch(textOutput, /## GitHub Push Diagnostics/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish status reports manual UI smoke targets in text output", () => {
  const workspace = createFirstPublishStatusWorkspace();

  try {
    const output = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--skip-github-push"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.match(output, /First publish status:/);
    assert.match(output, /Verification readiness: ready/);
    assert.match(output, /Commercialization progress: 1\/4 stage\(s\), 25%/);
    assert.match(output, /Current stage: Real GitHub push readiness is checked outside CI skip mode/);
    assert.match(output, /Next action: Rerun without --skip-github-push from the local release branch before first publish\./);
    assert.match(output, /Trusted Publisher GitHub environment: npm/);
    assert.match(output, /Trusted Publisher packages: 1/);
    assert.match(output, /Release Publish workflow: release-publish\.yml/);
    assert.match(output, /Release Publish workflow run: \.github\/workflows\/release-publish\.yml/);
    assert.match(output, /Release Publish GitHub Actions URL: https:\/\/github\.com\/example\/open-grid\/actions\/workflows\/release-publish\.yml/);
    assert.match(output, /Release Publish dispatch command: gh workflow run release-publish\.yml --repo example\/open-grid -f version=0\.0\.0 -f repository_url="git\+https:\/\/github\.com\/example\/open-grid\.git" -f npm_tag=latest -f confirm_publish=publish-open-grid/);
    assert.match(output, /Release Publish confirm input: publish-open-grid/);
    assert.match(output, /Release Publish UI evidence input: @\.release\/ui-smoke-report\.json/);
    assert.match(output, /Manual UI smoke targets:/);
    assert.match(output, /- React: http:\/\/127\.0\.0\.1:4193\//);
    assert.match(output, /  open: pnpm preview:smoke-ui -- --framework React --open/);
    assert.match(output, /  open wait timeout: 30000ms/);
    assert.match(output, /  primary smoke column id: customer/);
    assert.match(output, /  managed column count assertion: Visible 10 \/ 10/);
    assert.match(output, /  loading state text: Refreshing invoices\.\.\./);
    assert.match(output, /  error state text: Invoice service is unavailable\./);
    assert.match(output, /  invalid edit target: INV-0001\/customer/);
    assert.match(output, /  validation message: Customer must be at least 3 characters/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish status reports a markdown commercialization checklist", () => {
  const workspace = createFirstPublishStatusWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-status-ssh-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-success.sh"),
      `#!/bin/sh
echo "Hi example! You've successfully authenticated, but GitHub does not provide shell access." >&2
exit 1
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add.sh"),
      `#!/bin/sh
echo "256 SHA256:status-markdown-fingerprint open-grid@example.com (ED25519)"
exit 0
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_status_markdown"), "fixture private key\n");
    writeFile(join(sshDir, "id_status_markdown.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIStatusMarkdown open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "256 SHA256:status-markdown-public-key open-grid@example.com (ED25519)"
exit 0
`,
    );
    const output = execFileSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--markdown"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.match(output, /# First Publish Status/);
    assert.match(output, new RegExp(`- Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(output, /- Version: 0\.0\.0/);
    assert.match(output, /- npm tag: latest/);
    assert.match(output, /- Commercialization status: Local release gates are ready/);
    assert.match(output, /## Readiness/);
    assert.match(output, /- \[x\] Verification readiness/);
    assert.match(output, /- \[x\] Local readiness/);
    assert.match(output, /- \[ \] External readiness/);
    assert.match(output, /- \[ \] Ready to publish/);
    assert.match(output, /## Commercialization Progress/);
    assert.match(output, /- Completed stages: 2\/4/);
    assert.match(output, /- Remaining stages: 2/);
    assert.match(output, /- Percent: 50%/);
    assert.match(output, /- Current stage id: externalGithubNpmSetup/);
    assert.match(output, /- Current stage: External GitHub npm environment and npm Trusted Publisher setup are complete/);
    assert.match(output, /- Next action: Push the release branch, create the GitHub npm environment, configure npm Trusted Publisher settings, then run release-publish\.yml\./);
    assert.match(output, /- \[x\] Local first-publish gates pass/);
    assert.match(output, /- \[x\] GitHub push readiness passes/);
    assert.match(output, /- \[ \] External GitHub npm environment and npm Trusted Publisher setup are complete/);
    assert.match(output, /  - Action: Open https:\/\/github\.com\/example\/open-grid\/settings\/environments and create or confirm the protected GitHub environment named npm for release-publish\.yml\./);
    assert.match(output, /  - Action: Configure npm Trusted Publisher settings for 1 publishable package\(s\) using the trustedPublisherSetup package entries\./);
    assert.match(output, /  - Action: Start with @open-grid\/core at https:\/\/www\.npmjs\.com\/package\/%40open-grid%2Fcore\/access, then repeat the same Trusted Publisher fields for the remaining package access URLs\./);
    assert.match(output, /  - `pnpm release:trusted-publishing -- --version 0\.0\.0 --tag latest --repository-url "git\+https:\/\/github\.com\/example\/open-grid\.git"`/);
    assert.match(output, /- \[ \] Manual release-publish\.yml workflow has run successfully/);
    assert.match(output, /  - Action: Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete\./);
    assert.match(output, /  - `gh workflow run release-publish\.yml --repo example\/open-grid -f version=0\.0\.0 -f repository_url="git\+https:\/\/github\.com\/example\/open-grid\.git" -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@\.release\/ui-smoke-report\.json`/);
    assert.match(output, /## Next Commercialization Step/);
    assert.match(output, /- Stage: `externalGithubNpmSetup`/);
    assert.match(output, /- Label: External GitHub npm environment and npm Trusted Publisher setup are complete/);
    assert.match(output, /- \[ \] Open https:\/\/github\.com\/example\/open-grid\/settings\/environments and create or confirm the protected GitHub environment named npm for release-publish\.yml\./);
    assert.match(output, /- \[ \] Configure npm Trusted Publisher settings for 1 publishable package\(s\) using the trustedPublisherSetup package entries\./);
    assert.match(output, /- \[ \] Start with @open-grid\/core at https:\/\/www\.npmjs\.com\/package\/%40open-grid%2Fcore\/access, then repeat the same Trusted Publisher fields for the remaining package access URLs\./);
    assert.match(output, /- \[ \] `pnpm release:trusted-publishing -- --version 0\.0\.0 --tag latest --repository-url "git\+https:\/\/github\.com\/example\/open-grid\.git"`/);
    assert.match(output, /## GitHub Push Diagnostics/);
    assert.match(output, /- SSH auth: ready/);
    assert.match(output, /- SSH command: `.*git@github\.com`/);
    assert.match(output, /- GitHub SSH key settings: https:\/\/github\.com\/settings\/keys/);
    assert.match(output, /- GitHub SSH setup docs: https:\/\/docs\.github\.com\/en\/authentication\/connecting-to-github-with-ssh\/adding-a-new-ssh-key-to-your-github-account/);
    assert.match(output, /- SSH message: `Hi example! You've successfully authenticated, but GitHub does not provide shell access\.`/);
    assert.match(output, /- SSH agent: 1 loaded key\(s\)/);
    assert.match(output, /- \[x\] Loaded key: `256 SHA256:status-markdown-fingerprint open-grid@example\.com \(ED25519\)`/);
    assert.match(output, /- SSH public key candidates: 1 file\(s\) in `/);
    assert.match(output, /- \[ \] Candidate: `.*id_status_markdown\.pub: 256 SHA256:status-markdown-public-key open-grid@example\.com \(ED25519\); load: /);
    assert.match(output, /load: .*fake-ssh-add\.sh .*id_status_markdown/);
    assert.match(output, /- \[ \] Load key: `.*fake-ssh-add\.sh .*id_status_markdown`/);
    assert.match(output, /- \[ \] Review public key: `cat .*id_status_markdown\.pub`/);
    assert.match(output, /## Trusted Publisher Setup Summary/);
    assert.match(output, /### GitHub Environment/);
    assert.match(output, /- Name: `npm`/);
    assert.match(output, /- Required workflow: `release-publish\.yml`/);
    assert.match(output, /- GitHub settings: https:\/\/github\.com\/example\/open-grid\/settings\/environments/);
    assert.match(output, /### Release Publish Inputs/);
    assert.match(output, /- version: `0\.0\.0`/);
    assert.match(output, new RegExp(`- repository_url: \`${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``));
    assert.match(output, /- npm_tag: `latest`/);
    assert.match(output, /- confirm_publish: `publish-open-grid`/);
    assert.match(output, /- ui_smoke_report: `@\.release\/ui-smoke-report\.json`/);
    assert.match(output, /### npm Trusted Publishers/);
    assert.match(output, /- Package count: 1/);
    assert.match(output, /- \[ \] `@open-grid\/core`: provider `GitHub Actions`, repository `example\/open-grid`, workflow `release-publish\.yml`, environment `npm`, allowed action `npm publish`, npm access https:\/\/www\.npmjs\.com\/package\/%40open-grid%2Fcore\/access/);
    assert.match(output, /## Release Publish Workflow Run/);
    assert.match(output, /- \[ \] Run the protected Release Publish workflow manually after the public GitHub push, GitHub npm environment, and npm Trusted Publisher setup are complete\./);
    assert.match(output, /- Workflow: `\.github\/workflows\/release-publish\.yml`/);
    assert.match(output, /- GitHub Actions: https:\/\/github\.com\/example\/open-grid\/actions\/workflows\/release-publish\.yml/);
    assert.match(output, /- gh command: `gh workflow run release-publish\.yml --repo example\/open-grid -f version=0\.0\.0 -f repository_url="git\+https:\/\/github\.com\/example\/open-grid\.git" -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@\.release\/ui-smoke-report\.json`/);
    assert.match(output, /- version: `0\.0\.0`/);
    assert.match(output, new RegExp(`- repository_url: \`${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``));
    assert.match(output, /- npm_tag: `latest`/);
    assert.match(output, /- confirm_publish: `publish-open-grid`/);
    assert.match(output, /- ui_smoke_report: `@\.release\/ui-smoke-report\.json`/);
    assert.match(output, /### Workflow Gates/);
    assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --markdown`/);
    assert.match(output, /- \[ \] `pnpm e2e:smoke`/);
    assert.match(output, /- \[ \] `pnpm e2e`/);
    assert.match(output, /## Manual UI Smoke Checklist/);
    assert.match(output, /### React/);
    assert.match(output, /- URL: http:\/\/127\.0\.0\.1:4193\//);
    assert.match(output, /- Build: `pnpm --filter @open-grid\/react-ui build && pnpm --filter @open-grid\/example-react-basic build`/);
    assert.match(output, /- Preview: `pnpm --filter @open-grid\/example-react-basic preview --port 4193`/);
    assert.match(output, /- Open: `pnpm preview:smoke-ui -- --framework React --open`/);
    assert.match(output, /- Open wait timeout: `30000ms`/);
    assert.match(output, /- Primary smoke column id: `customer`/);
    assert.match(output, /- Managed column count assertion: `Visible 10 \/ 10`/);
    assert.match(output, /- Loading state text: `Refreshing invoices\.\.\.`/);
    assert.match(output, /- Error state text: `Invoice service is unavailable\.`/);
    assert.match(output, /- Invalid edit target: `INV-0001\/customer`/);
    assert.match(output, /- Validation message: `Customer must be at least 3 characters`/);
    assert.match(output, /#### Functional Checks/);
    assert.match(output, /- \[ \] Confirm the Customer column header is visible\./);
    assert.match(output, /#### Accessibility Checks/);
    assert.match(output, /- \[ \] Use a screen reader to enter the grid/);
    assert.match(output, /### Vue/);
    assert.match(output, /### Svelte/);
    assert.match(output, /## Remaining External Actions/);
    assert.match(output, /- \[ \] Run git push -u origin main with GitHub credentials available\./);
    assert.match(output, /- \[ \] Open https:\/\/github\.com\/example\/open-grid\/settings\/environments and create or confirm the protected GitHub environment named npm for release-publish\.yml\./);
    assert.match(output, /- \[ \] Configure npm Trusted Publisher settings for 1 publishable package\(s\) using the trustedPublisherSetup package entries\./);
    assert.match(output, /- \[ \] Start with @open-grid\/core at https:\/\/www\.npmjs\.com\/package\/%40open-grid%2Fcore\/access, then repeat the same Trusted Publisher fields for the remaining package access URLs\./);
    assert.match(output, /- \[ \] Run \.github\/workflows\/release-publish\.yml manually with the generated version/);
    assert.match(output, /## Next Verification Commands/);
    assert.match(output, /- \[ \] `pnpm release:github-push-preflight -- --repository-url/);
    assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --report --out-file \.release\/ui-smoke-report\.md`/);
    assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --report --json --out-file \.release\/ui-smoke-report\.json`/);
    assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --open`/);
    assert.match(output, /- \[ \] `pnpm review:smoke-ui`/);
    assert.match(output, /- \[ \] `pnpm release:ui-smoke-report-check`/);
    assert.match(output, /## External Setup Verification/);
    assert.match(output, /- \[ \] Run these checks again after the GitHub push, protected GitHub npm environment, npm Trusted Publisher settings, and manual Release Publish workflow setup are complete\./);
    assert.match(output, /### Success Criteria/);
    assert.match(output, /- \[ \] GitHub push preflight passes with --check-auth\./);
    assert.match(output, /- \[ \] First-publish status reports local readiness ready and no local blockers\./);
    assert.match(output, /- \[ \] First-publish preflight and trusted-publishing preflight pass for the same repository URL, version, and npm tag\./);
    assert.match(output, /- \[ \] Manual UI smoke checklist, inspection reports, structured report validation, browser-open inspection, quick e2e smoke, and full e2e pass before the Release Publish workflow run\./);
    assert.doesNotMatch(output, /Push the current release branch/);
    assert.doesNotMatch(output, /## Local Blockers/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("first publish status rejects conflicting GitHub push options", () => {
  const result = spawnSync(
    process.execPath,
    [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--skip-github-push", "--check-auth", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /First publish status failed: --skip-github-push cannot be combined with --check-auth/);
});

test("first publish status requires SSH diagnostic option values", () => {
  const cases = [
    { args: ["--ssh-add-command", "--json"], option: "--ssh-add-command" },
    { args: ["--ssh-add-command=", "--json"], option: "--ssh-add-command" },
    { args: ["--ssh-dir", "--json"], option: "--ssh-dir" },
    { args: ["--ssh-dir=", "--json"], option: "--ssh-dir" },
    { args: ["--ssh-keygen-command", "--json"], option: "--ssh-keygen-command" },
    { args: ["--ssh-keygen-command=", "--json"], option: "--ssh-keygen-command" },
  ];

  for (const { args, option } of cases) {
    const result = spawnSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, ...args],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`First publish status failed: ${option} requires a value`));
  }
});

test("release github push preflight reports GitHub SSH auth failures", () => {
  const workspace = createGitPushWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-ssh-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-failure.sh"),
      `#!/bin/sh
echo "git@github.com: Permission denied (publickey)." >&2
exit 255
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add-empty.sh"),
      `#!/bin/sh
echo "The agent has no identities." >&2
exit 1
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_rsa"), "fixture private key\n");
    writeFile(join(sshDir, "id_rsa.pub"), "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQFixture open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "4096 SHA256:fixture-rsa-key open-grid@example.com (RSA)"
exit 0
`,
    );
    const result = spawnSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const preflight = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(preflight.ready, false);
    assert.equal(preflight.authChecked, true);
    assert.equal(preflight.authReady, false);
    assert.match(preflight.authMessage, /Permission denied/);
    assert.equal(preflight.githubSshKeySettingsUrl, "https://github.com/settings/keys");
    assert.equal(preflight.githubSshDocsUrl, "https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account");
    assert.deepEqual(preflight.sshAgent, {
      available: true,
      keyCount: 0,
      fingerprints: [],
      message: "The agent has no identities.",
    });
    assert.equal(preflight.sshKeyCandidates.publicKeyCount, 1);
    assert.equal(preflight.sshKeyCandidates.keys[0].fingerprint, "4096 SHA256:fixture-rsa-key open-grid@example.com (RSA)");
    assert.equal(preflight.sshKeyCandidates.keys[0].pairedPrivateKey, join(sshDir, "id_rsa"));
    assert.equal(preflight.sshKeyCandidates.keys[0].loadCommand, `${sshAddCommand} ${join(sshDir, "id_rsa")}`);
    assert.deepEqual(preflight.sshKeyLoadCommands, [
      `${sshAddCommand} ${join(sshDir, "id_rsa")}`,
    ]);
    assert.deepEqual(preflight.sshPublicKeyReviewCommands, [
      `cat ${join(sshDir, "id_rsa.pub")}`,
    ]);
    assert.ok(preflight.failures.some((failure) => failure.includes("SSH authentication failed")));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("No SSH identities are loaded")));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("Review sshKeyCandidates")));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("https://github.com/settings/keys")));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("docs.github.com/en/authentication/connecting-to-github-with-ssh")));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes(`Run cat ${join(sshDir, "id_rsa.pub")}`)));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes(`Run ${sshAddCommand} ${join(sshDir, "id_rsa")}`)));
    assert.ok(preflight.nextExternalActions.some((action) => action.includes("ssh -o BatchMode=yes -T git@github.com")));
    assert.deepEqual(preflight.nextVerificationCommands.slice(0, 2), [
      `${sshAddCommand} ${join(sshDir, "id_rsa")}`,
      `${sshCommand} -o BatchMode=yes -T git@github.com`,
    ]);
    assert.ok(preflight.nextVerificationCommands.some((command) => command.includes("release:github-push-preflight")));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("first publish status includes SSH recovery commands before rerun commands", () => {
  const workspace = createFirstPublishStatusWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-status-ssh-failure-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-failure.sh"),
      `#!/bin/sh
echo "git@github.com: Permission denied (publickey)." >&2
exit 255
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add-empty.sh"),
      `#!/bin/sh
echo "The agent has no identities." >&2
exit 1
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    writeFile(join(sshDir, "id_status_failure"), "fixture private key\n");
    writeFile(join(sshDir, "id_status_failure.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIStatusFailure open-grid@example.com\n");
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "256 SHA256:status-failure-public-key open-grid@example.com (ED25519)"
exit 0
`,
    );
    const result = spawnSync(
      process.execPath,
      [firstPublishStatusPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const status = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(status.localReady, false);
    assert.equal(status.steps.githubPush.result.authReady, false);
    assert.deepEqual(status.steps.githubPush.result.sshKeyLoadCommands, [
      `${sshAddCommand} ${join(sshDir, "id_status_failure")}`,
    ]);
    assert.deepEqual(status.nextVerificationCommands.slice(0, 2), [
      `${sshAddCommand} ${join(sshDir, "id_status_failure")}`,
      `${sshCommand} -o BatchMode=yes -T git@github.com`,
    ]);
    assert.ok(status.nextVerificationCommands[2].includes("release:github-push-preflight"));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("release github push preflight reports next actions in text failures", () => {
  const workspace = createGitPushWorkspace();
  const tools = mkdtempSync(join(tmpdir(), "open-grid-ssh-text-"));

  try {
    const sshCommand = writeExecutable(
      join(tools, "fake-ssh-failure.sh"),
      `#!/bin/sh
echo "git@github.com: Permission denied (publickey)." >&2
exit 255
`,
    );
    const sshAddCommand = writeExecutable(
      join(tools, "fake-ssh-add-failure.sh"),
      `#!/bin/sh
echo "Could not open a connection to your authentication agent." >&2
exit 2
`,
    );
    const sshDir = join(tools, "ssh");
    mkdirSync(sshDir);
    const sshKeygenCommand = writeExecutable(
      join(tools, "fake-ssh-keygen.sh"),
      `#!/bin/sh
echo "unused"
exit 0
`,
    );
    const result = spawnSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", repositoryUrl, "--check-auth", "--ssh-command", sshCommand, "--ssh-add-command", sshAddCommand, "--ssh-dir", sshDir, "--ssh-keygen-command", sshKeygenCommand],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /GitHub push preflight failed:/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, /SSH authentication failed/);
    assert.match(result.stderr, /Next external actions:/);
    assert.match(result.stderr, /SSH agent identities could not be listed/);
    assert.match(result.stderr, /Could not open a connection to your authentication agent/);
    assert.match(result.stderr, /SSH public key candidates: 0 public key file\(s\)/);
    assert.match(result.stderr, /ssh -o BatchMode=yes -T git@github\.com/);
    assert.match(result.stderr, /Next verification commands:/);
    assert.match(result.stderr, /pnpm release:github-push-preflight/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
    rmSync(tools, { force: true, recursive: true });
  }
});

test("release github push preflight reports dirty worktree and remote mismatches", () => {
  const workspace = createGitPushWorkspace();

  try {
    writeFile(join(workspace, "uncommitted.txt"), "dirty\n");
    const result = spawnSync(
      process.execPath,
      [releaseGithubPushPreflightPath, "--", "--repository-url", "git+https://github.com/example/other.git", "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const preflight = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(preflight.ready, false);
    assert.ok(preflight.failures.some((failure) => failure.includes("remote URL")));
    assert.ok(preflight.failures.includes("working tree must be clean before pushing the first publish branch"));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release plan includes GitHub, status, trusted-publishing, first-publish, and UI smoke gates in order", () => {
  const output = execFileSync(process.execPath, [releasePlanPath, "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const plan = JSON.parse(output);

  assert.ok(plan.gates.includes("pnpm api:check"));
  assert.ok(plan.gates.includes("pnpm compatibility:check"));
  assert.ok(plan.gates.includes("pnpm release:consumer-smoke"));
  assert.ok(plan.gates.includes("pnpm release:github-push-preflight -- --repository-url <public-git-url>"));
  assert.ok(plan.gates.includes("pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth"));
  assert.ok(plan.gates.includes("pnpm release:trusted-publishing -- --repository-url <public-git-url>"));
  assert.ok(plan.gates.includes("pnpm release:first-publish-preflight -- --repository-url <public-git-url>"));
  assert.ok(plan.gates.includes("pnpm preview:smoke-ui -- --markdown"));
  assert.ok(plan.gates.includes("pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md"));
  assert.ok(plan.gates.includes("pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json"));
  assert.ok(plan.gates.includes("pnpm review:smoke-ui"));
  assert.ok(plan.gates.includes("pnpm release:ui-smoke-report-check"));
  assert.ok(plan.gates.includes("pnpm e2e:smoke"));
  assert.ok(plan.gates.includes("pnpm e2e"));
  assert.ok(
    plan.gates.indexOf("pnpm release:github-push-preflight -- --repository-url <public-git-url>") <
      plan.gates.indexOf("pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth") <
      plan.gates.indexOf("pnpm release:trusted-publishing -- --repository-url <public-git-url>"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm release:trusted-publishing -- --repository-url <public-git-url>") <
      plan.gates.indexOf("pnpm release:first-publish-preflight -- --repository-url <public-git-url>"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm release:first-publish-preflight -- --repository-url <public-git-url>") <
      plan.gates.indexOf("pnpm preview:smoke-ui -- --markdown"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm preview:smoke-ui -- --markdown") <
      plan.gates.indexOf("pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md") <
      plan.gates.indexOf("pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json") <
      plan.gates.indexOf("pnpm review:smoke-ui"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm review:smoke-ui") < plan.gates.indexOf("pnpm release:ui-smoke-report-check"),
  );
  assert.ok(
    plan.gates.indexOf("pnpm release:ui-smoke-report-check") < plan.gates.indexOf("pnpm e2e:smoke"),
  );
  assert.ok(plan.gates.indexOf("pnpm e2e:smoke") < plan.gates.indexOf("pnpm e2e"));
});

test("release plan reports a markdown checklist", () => {
  const output = execFileSync(process.execPath, [releasePlanPath, "--", "--version", "1.2.3", "--markdown"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.match(output, /# Release Plan/);
  assert.match(output, /- Version: 1\.2\.3/);
  assert.match(output, /- Root version: 0\.1\.0/);
  assert.match(output, /- Publishable packages: 10/);
  assert.match(output, /- Result: ready/);
  assert.match(output, /## Publish Order/);
  assert.match(output, /- \[ \] 1\. `@open-grid\/core` from `packages\/core` at `1\.2\.3`/);
  assert.match(output, /## Prepublish Gates/);
  assert.match(output, /- \[ \] `pnpm release:github-push-preflight -- --repository-url <public-git-url>`/);
  assert.match(output, /- \[ \] `pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth`/);
  assert.match(output, /- \[ \] `pnpm release:trusted-publishing -- --repository-url <public-git-url>`/);
  assert.match(output, /- \[ \] `pnpm release:first-publish-preflight -- --repository-url <public-git-url>`/);
  assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --markdown`/);
  assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --report --out-file \.release\/ui-smoke-report\.md`/);
  assert.match(output, /- \[ \] `pnpm preview:smoke-ui -- --report --json --out-file \.release\/ui-smoke-report\.json`/);
  assert.match(output, /- \[ \] `pnpm review:smoke-ui`/);
  assert.match(output, /- \[ \] `pnpm release:ui-smoke-report-check`/);
  assert.match(output, /- \[ \] `pnpm e2e:smoke`/);
  assert.match(output, /## Workspace Dependency Rewrites/);
  assert.match(output, /`workspace:\*` -> `1\.2\.3`/);
  assert.doesNotMatch(output, /## Failures/);
});

test("release plan requires version values before planning", () => {
  const missingValue = spawnSync(process.execPath, [releasePlanPath, "--", "--version", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const emptyValue = spawnSync(process.execPath, [releasePlanPath, "--", "--version=", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /Release plan failed: --version requires a value/);
  assert.equal(emptyValue.status, 1);
  assert.match(emptyValue.stderr, /Release plan failed: --version requires a value/);
});

test("release plan reports markdown failures", () => {
  const result = spawnSync(
    process.execPath,
    [releasePlanPath, "--", "--version", "not-semver", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /# Release Plan/);
  assert.match(result.stdout, /- Result: blocked/);
  assert.match(result.stdout, /## Failures/);
  assert.match(result.stdout, /- \[ \] release version must be a valid semver version; got "not-semver"/);
  assert.match(result.stdout, /## Prepublish Gates/);
});

test("release plan reports release context in text failure output", () => {
  const result = spawnSync(
    process.execPath,
    [releasePlanPath, "--", "--version", "not-semver"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Release plan failed:/);
  assert.match(result.stderr, /Version: not-semver/);
  assert.match(result.stderr, /Root version: 0\.1\.0/);
  assert.match(result.stderr, /Package count: 10/);
  assert.match(result.stderr, /Publish order count: 10/);
  assert.match(result.stderr, /Prepublish gate count: 22/);
  assert.match(result.stderr, /Workspace dependency rewrite count: /);
  assert.match(result.stderr, /Failures:/);
  assert.match(result.stderr, /release version must be a valid semver version/);
});

test("release policy requires explicit version and tag values before checking policy", () => {
  const missingVersion = spawnSync(process.execPath, [releasePolicyPath, "--", "--version", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const emptyVersion = spawnSync(process.execPath, [releasePolicyPath, "--", "--version=", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const missingTag = spawnSync(process.execPath, [releasePolicyPath, "--", "--tag", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const emptyTag = spawnSync(process.execPath, [releasePolicyPath, "--", "--tag=", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(missingVersion.status, 1);
  assert.match(missingVersion.stderr, /Release policy failed: --version requires a value/);
  assert.equal(emptyVersion.status, 1);
  assert.match(emptyVersion.stderr, /Release policy failed: --version requires a value/);
  assert.equal(missingTag.status, 1);
  assert.match(missingTag.stderr, /Release policy failed: --tag requires a value/);
  assert.equal(emptyTag.status, 1);
  assert.match(emptyTag.stderr, /Release policy failed: --tag requires a value/);
});

test("release policy reports release context in text failure output", () => {
  const result = spawnSync(
    process.execPath,
    [releasePolicyPath, "--", "--version", "0.0.0", "--tag", "wrong-tag"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Release policy failed:/);
  assert.match(result.stderr, /Version: 0\.0\.0/);
  assert.match(result.stderr, /Tag: wrong-tag/);
  assert.match(result.stderr, /Expected tag: open-grid-v0\.0\.0/);
  assert.match(result.stderr, /Changelog date: 2026-07-03/);
  assert.match(result.stderr, /Package count: 10/);
  assert.match(result.stderr, /Failures:/);
  assert.match(result.stderr, /release tag must be "open-grid-v0\.0\.0"; got "wrong-tag"/);
});

test("release check reports workspace context in text failure output", () => {
  const workspace = createReadinessWorkspace();

  try {
    const result = spawnSync(process.execPath, [releaseCheckPath], {
      cwd: workspace,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Release readiness check failed:/);
    assert.match(result.stderr, /Root version: 0\.0\.0/);
    assert.match(result.stderr, /Root package manager: \(missing\)/);
    assert.match(result.stderr, /Root Node engine: \(missing\)/);
    assert.match(result.stderr, /Publishable packages: 1/);
    assert.match(result.stderr, /Example packages: 1/);
    assert.match(result.stderr, /npm pack dry-runs completed: 1/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, /root: packageManager should pin the release pnpm version/);
    assert.match(result.stderr, /root: engines\.node should match the release Node runtime/);
    assert.match(result.stderr, /packages\/core: description is required/);
    assert.match(result.stderr, /packages\/core: keywords should include data-grid/);
    assert.match(result.stderr, /packages\/core: keywords should include grid/);
    assert.match(result.stderr, /packages\/core: keywords should include table/);
    assert.match(result.stderr, /packages\/core: homepage should point to the public package documentation/);
    assert.match(result.stderr, /packages\/core: bugs\.url should point to the public issue tracker/);
    assert.match(result.stderr, /packages\/core: publishConfig\.access should be public/);
    assert.match(result.stderr, /packages\/core: JS export "\." must declare types and import conditions/);
    assert.match(result.stderr, /packages\/core: LICENSE is required for npm package licensing/);
    assert.match(result.stderr, /packages\/core: README\.md is required for npm package documentation/);
    assert.match(result.stderr, /packages\/core: pack dry-run must include LICENSE/);
    assert.match(result.stderr, /packages\/core: pack dry-run must include README\.md/);
    assert.match(result.stderr, /packages\/core: pack dry-run is missing exported file "dist\/index\.js"/);
    assert.match(result.stderr, /packages\/core: dist directory must exist; run pnpm build first/);
    assert.match(result.stderr, /examples\/basic: example packages must stay private/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release check reports readiness failures as json", () => {
  const workspace = createReadinessWorkspace();

  try {
    const result = spawnSync(process.execPath, [releaseCheckPath, "--", "--json"], {
      cwd: workspace,
      encoding: "utf8",
    });
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.equal(output.rootVersion, "0.0.0");
    assert.equal(output.rootPackageManager, undefined);
    assert.equal(output.rootNodeEngine, undefined);
    assert.equal(output.publishablePackageCount, 1);
    assert.equal(output.examplePackageCount, 1);
    assert.equal(output.packDryRunCount, 1);
    assert.ok(output.failures.some((failure) => failure.includes("root: packageManager should pin the release pnpm version")));
    assert.ok(output.failures.some((failure) => failure.includes("root: engines.node should match the release Node runtime")));
    assert.ok(output.failures.includes("packages/core: dist directory must exist; run pnpm build first"));
    assert.ok(output.failures.some((failure) => failure.includes("examples/basic: example packages must stay private")));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish preflight rejects invalid requested versions before running gates", () => {
  const result = spawnSync(
    process.execPath,
    [firstPublishPreflightPath, "--", "--version", "not-semver", "--repository-url", repositoryUrl, "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /First publish preflight failed: --version must be a valid semver version/);
});

test("first publish preflight requires output directory values before running gates", () => {
  const missingValue = spawnSync(
    process.execPath,
    [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--out-dir", "--json"],
    { encoding: "utf8" },
  );
  const emptyValue = spawnSync(
    process.execPath,
    [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--out-dir=", "--json"],
    { encoding: "utf8" },
  );

  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /First publish preflight failed: --out-dir requires a value/);
  assert.equal(emptyValue.status, 1);
  assert.match(emptyValue.stderr, /First publish preflight failed: --out-dir requires a value/);
});

test("release publish actual mode requires the public repository URL before running gates", () => {
  const result = spawnSync(
    process.execPath,
    [releasePublishPath, "--", "--confirm", "publish-open-grid", "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release publish failed: --repository-url requires a value/);
});

test("release publish actual mode requires provenance before running gates", () => {
  const result = spawnSync(
    process.execPath,
    [releasePublishPath, "--", "--repository-url", repositoryUrl, "--confirm", "publish-open-grid", "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release publish failed: --provenance is required to run an actual publish/);
});

test("release publish requires explicit confirm and output directory values before running gates", () => {
  const missingConfirm = spawnSync(process.execPath, [releasePublishPath, "--", "--confirm", "--json"], {
    encoding: "utf8",
  });
  const emptyConfirm = spawnSync(process.execPath, [releasePublishPath, "--", "--confirm=", "--json"], {
    encoding: "utf8",
  });
  const missingOutDir = spawnSync(process.execPath, [releasePublishPath, "--", "--out-dir", "--json"], {
    encoding: "utf8",
  });
  const emptyOutDir = spawnSync(process.execPath, [releasePublishPath, "--", "--out-dir=", "--json"], {
    encoding: "utf8",
  });

  assert.equal(missingConfirm.status, 1);
  assert.match(missingConfirm.stderr, /Release publish failed: --confirm requires a value/);
  assert.equal(emptyConfirm.status, 1);
  assert.match(emptyConfirm.stderr, /Release publish failed: --confirm requires a value/);
  assert.equal(missingOutDir.status, 1);
  assert.match(missingOutDir.stderr, /Release publish failed: --out-dir requires a value/);
  assert.equal(emptyOutDir.status, 1);
  assert.match(emptyOutDir.stderr, /Release publish failed: --out-dir requires a value/);
});

test("release stage requires an output directory value before staging", () => {
  const missingValue = spawnSync(process.execPath, [releaseStagePath, "--", "--out-dir", "--json"], {
    encoding: "utf8",
  });
  const emptyValue = spawnSync(process.execPath, [releaseStagePath, "--", "--out-dir=", "--json"], {
    encoding: "utf8",
  });

  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /Release stage failed: --out-dir requires a value/);
  assert.equal(emptyValue.status, 1);
  assert.match(emptyValue.stderr, /Release stage failed: --out-dir requires a value/);
});

test("release stage requires explicit version and repository URL values before staging", () => {
  const missingVersion = spawnSync(process.execPath, [releaseStagePath, "--", "--version", "--json"], {
    encoding: "utf8",
  });
  const emptyVersion = spawnSync(process.execPath, [releaseStagePath, "--", "--version=", "--json"], {
    encoding: "utf8",
  });
  const missingRepositoryUrl = spawnSync(process.execPath, [releaseStagePath, "--", "--repository-url", "--json"], {
    encoding: "utf8",
  });
  const emptyRepositoryUrl = spawnSync(process.execPath, [releaseStagePath, "--", "--repository-url=", "--json"], {
    encoding: "utf8",
  });

  assert.equal(missingVersion.status, 1);
  assert.match(missingVersion.stderr, /Release stage failed: --version requires a value/);
  assert.equal(emptyVersion.status, 1);
  assert.match(emptyVersion.stderr, /Release stage failed: --version requires a value/);
  assert.equal(missingRepositoryUrl.status, 1);
  assert.match(missingRepositoryUrl.stderr, /Release stage failed: --repository-url requires a value/);
  assert.equal(emptyRepositoryUrl.status, 1);
  assert.match(emptyRepositoryUrl.stderr, /Release stage failed: --repository-url requires a value/);
});

test("release stage reports validation failures as json", () => {
  const result = spawnSync(process.execPath, [releaseStagePath, "--", "--version", "not-semver", "--json"], {
    encoding: "utf8",
  });
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(output.version, "not-semver");
  assert.equal(output.tarballCount, 0);
  assert.deepEqual(output.tarballs, []);
  assert.match(output.failures.join("\n"), /release version must be a valid semver version/);
});

test("release stage reports release context in text failure output", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-release-stage-text-failure-"));

  try {
    const result = spawnSync(
      process.execPath,
      [releaseStagePath, "--", "--version", "not-semver", "--repository-url", repositoryUrl, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Release stage failed:/);
    assert.match(result.stderr, /Version: not-semver/);
    assert.match(result.stderr, new RegExp(`Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, new RegExp(`Output directory: ${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /Package count: 10/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, /release version must be a valid semver version/);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("release stage includes package documentation and license files in publish tarballs", () => {
  const workspace = createReleaseStageWorkspace();
  const outDir = join(workspace, "tarballs");

  try {
    const result = spawnSync(
      process.execPath,
      [releaseStagePath, "--", "--version", "0.1.0", "--repository-url", repositoryUrl, "--out-dir", outDir, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.tarballCount, 1);
    assert.deepEqual(output.tarballs[0].files, ["LICENSE", "README.md", "dist/index.d.ts", "dist/index.js", "package.json"]);

    const packedFiles = execFileSync("tar", ["-tf", output.tarballs[0].path], { encoding: "utf8" });
    assert.match(packedFiles, /package\/LICENSE/);
    assert.match(packedFiles, /package\/README\.md/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release stage rejects packages missing required metadata files", () => {
  const workspace = createReleaseStageWorkspace();

  try {
    rmSync(join(workspace, "packages", "core", "README.md"));
    const result = spawnSync(process.execPath, [releaseStagePath, "--", "--json"], {
      cwd: workspace,
      encoding: "utf8",
    });
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(output.tarballCount, 0);
    assert.match(output.failures.join("\n"), /packages\/core: README\.md is required in staged release artifacts/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release stage does not pack into a non-empty output directory", () => {
  const workspace = createReleaseStageWorkspace();
  const outDir = join(workspace, "tarballs");
  const existingArtifact = join(outDir, "existing.tgz");

  try {
    writeFile(existingArtifact, "keep-existing-artifact\n");
    const result = spawnSync(process.execPath, [releaseStagePath, "--", "--out-dir", outDir, "--json"], {
      cwd: workspace,
      encoding: "utf8",
    });
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(output.tarballCount, 0);
    assert.deepEqual(output.tarballs, []);
    assert.match(output.failures.join("\n"), /output directory must be empty or absent/);
    assert.equal(readFileSync(existingArtifact, "utf8"), "keep-existing-artifact\n");
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release publish dry-run requires a repository URL value before running gates", () => {
  const missingValue = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--repository-url", "--json"], {
    encoding: "utf8",
  });
  const emptyValue = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--repository-url=", "--json"], {
    encoding: "utf8",
  });

  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /Release publish dry-run failed: --repository-url requires a value/);
  assert.equal(emptyValue.status, 1);
  assert.match(emptyValue.stderr, /Release publish dry-run failed: --repository-url requires a value/);
});

test("release publish dry-run requires output directory values before running gates", () => {
  const missingValue = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--out-dir", "--json"], {
    encoding: "utf8",
  });
  const emptyValue = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--out-dir=", "--json"], {
    encoding: "utf8",
  });

  assert.equal(missingValue.status, 1);
  assert.match(missingValue.stderr, /Release publish dry-run failed: --out-dir requires a value/);
  assert.equal(emptyValue.status, 1);
  assert.match(emptyValue.stderr, /Release publish dry-run failed: --out-dir requires a value/);
});

test("release publish dry-run rejects invalid requested versions before running gates", () => {
  const result = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--version", "not-semver", "--json"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release publish dry-run failed: --version must be a valid semver version/);
});

test("release publish rejects invalid requested versions before running gates", () => {
  const result = spawnSync(process.execPath, [releasePublishPath, "--", "--version", "not-semver", "--dry-run", "--json"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release publish failed: --version must be a valid semver version/);
});

test("release publish dry-run reports a markdown publish command checklist", () => {
  const result = spawnSync(
    process.execPath,
    [releasePublishDryRunPath, "--", "--version", "0.0.0", "--tag", "next", "--repository-url", repositoryUrl, "--markdown"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /# Publish Dry Run Report/);
  assert.match(result.stdout, /- Version: 0\.0\.0/);
  assert.match(result.stdout, /- npm tag: next/);
  assert.match(result.stdout, new RegExp(`- Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(result.stdout, /- Provenance flag: disabled/);
  assert.match(result.stdout, /- Result: passed/);
  assert.match(result.stdout, /- Publish result count: 10/);
  assert.match(result.stdout, /## Publish Dry Run Order/);
  assert.match(result.stdout, /- \[x\] 1\. `@open-grid\/core` `0\.0\.0` from `open-grid-core-0\.0\.0\.tgz`/);
  assert.match(result.stdout, /Command: `npm publish --dry-run --access public --tag next/);
  assert.doesNotMatch(result.stdout, /## Failures/);
});

test("release publish reports repository URL in json output", () => {
  const result = spawnSync(
    process.execPath,
    [releasePublishPath, "--", "--version", "0.0.0", "--tag", "next", "--repository-url", repositoryUrl, "--dry-run", "--json"],
    { encoding: "utf8" },
  );
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(output.repositoryUrl, repositoryUrl);
  assert.equal(output.publishResults.length, 10);
});

test("release publish dry-run reports markdown failures", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-publish-dry-run-markdown-failure-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [releasePublishDryRunPath, "--", "--version", "0.0.0", "--out-dir", outDir, "--repository-url", repositoryUrl, "--markdown"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /# Publish Dry Run Report/);
    assert.match(result.stdout, /- Result: blocked/);
    assert.match(result.stdout, /## Failures/);
    assert.match(result.stdout, new RegExp(`${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: output directory must be empty or absent`));
    assert.match(result.stdout, /## Publish Dry Run Order/);
    assert.match(result.stdout, /- \[ \] No publish dry-run commands were executed\./);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("release publish reports release context in text failure output", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-release-publish-text-failure-"));
  const mismatchedRepositoryUrl = "git+https://github.com/example/other.git";

  try {
    const stageResult = spawnSync(
      process.execPath,
      [releaseStagePath, "--", "--version", "0.0.0", "--repository-url", repositoryUrl, "--out-dir", outDir, "--json"],
      { encoding: "utf8" },
    );
    const result = spawnSync(
      process.execPath,
      [releasePublishPath, "--", "--version", "0.0.0", "--tag", "next", "--out-dir", outDir, "--repository-url", mismatchedRepositoryUrl, "--dry-run"],
      { encoding: "utf8" },
    );

    assert.equal(stageResult.status, 0);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release publish dry-run failed:/);
    assert.match(result.stderr, /Version: 0\.0\.0/);
    assert.match(result.stderr, /Tag: next/);
    assert.match(result.stderr, new RegExp(`Repository URL: ${mismatchedRepositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, new RegExp(`Output directory: ${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /Dry run: enabled/);
    assert.match(result.stderr, /Provenance flag: disabled/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, /package repository URL must match --repository-url/);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("release publish dry-run preserves stage json failures", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-release-dry-run-out-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--out-dir", outDir, "--json"], {
      encoding: "utf8",
    });
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.deepEqual(output.publishResults, []);
    assert.equal(output.failures.length, 1);
    assert.equal(output.failures[0], `${outDir}: output directory must be empty or absent`);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("guarded release publish preserves stage json failures", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-release-publish-stage-out-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [releasePublishPath, "--", "--out-dir", outDir, "--dry-run", "--json"],
      { encoding: "utf8" },
    );
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.deepEqual(output.publishResults, []);
    assert.deepEqual(output.failures, [`${outDir}: output directory must be empty or absent`]);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("release publish entrypoints preserve release plan json failures", () => {
  const workspace = createPublishPlanFailureWorkspace();
  const cases = [
    { name: "publish dry-run", command: [releasePublishDryRunPath, "--", "--json"] },
    { name: "guarded publish dry-run", command: [releasePublishPath, "--", "--dry-run", "--json"] },
  ];

  try {
    for (const { command, name } of cases) {
      const result = spawnSync(process.execPath, command, {
        cwd: workspace,
        encoding: "utf8",
      });
      const output = JSON.parse(result.stdout);

      assert.equal(result.status, 1, name);
      assert.equal(result.stderr, "", name);
      assert.deepEqual(output.publishResults, [], name);
      assert.deepEqual(output.failures, ["packages/core: publishable package must not be private"], name);
    }
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release publish dry-run reports release context in text failure output", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-release-dry-run-text-failure-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [releasePublishDryRunPath, "--", "--version", "0.0.0", "--tag", "next", "--repository-url", repositoryUrl, "--out-dir", outDir],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Release publish dry-run failed:/);
    assert.match(result.stderr, /Version: 0\.0\.0/);
    assert.match(result.stderr, /Tag: next/);
    assert.match(result.stderr, new RegExp(`Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, new RegExp(`Output directory: ${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /Provenance flag: disabled/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, new RegExp(`${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: output directory must be empty or absent`));
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("first publish preflight preserves stage json failures", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-first-publish-out-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--tag", "next", "--out-dir", outDir, "--json"],
      { encoding: "utf8" },
    );
    const output = JSON.parse(result.stdout);
    const trustedPublishing = output.steps.find((step) => step.name === "trustedPublishing");
    const releaseStage = output.steps.find((step) => step.name === "releaseStage");

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.equal(output.failures.length, 1);
    assert.equal(output.failures[0], `${outDir}: output directory must be empty or absent`);
    assert.deepEqual(output.releaseWorkflowInputs, {
      version: "0.1.0",
      repository_url: repositoryUrl,
      npm_tag: "next",
      confirm_publish: "publish-open-grid",
      ui_smoke_report: "@.release/ui-smoke-report.json",
    });
    assert.deepEqual(output.releaseWorkflowGates, [
      "pnpm preview:smoke-ui -- --markdown",
      "pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md",
      "pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json",
      "pnpm review:smoke-ui",
      "pnpm release:ui-smoke-report-check",
      "pnpm e2e:smoke",
      "pnpm e2e",
    ]);
    assert.equal(output.manualUiSmokeTargets.length, 3);
    assert.deepEqual(output.manualUiSmokeTargets[0], {
      framework: "React",
      url: "http://127.0.0.1:4193/",
      buildCommand: "pnpm --filter @open-grid/react-ui build && pnpm --filter @open-grid/example-react-basic build",
      previewCommand: "pnpm --filter @open-grid/example-react-basic preview --port 4193",
      openCommand: "pnpm preview:smoke-ui -- --framework React --open",
      openWaitTimeoutMs: 30000,
      smokeCheck: reactUiSmokeCheck,
      stateCheck: reactUiStateCheck,
      workflowCheck: reactUiWorkflowCheck,
      manualChecks: [
        "Confirm the grid shell renders with visible rows and cells.",
        "Confirm the Customer column header is visible.",
        "Confirm Paid, Sent, Draft, Overdue, and Low, Medium, High remain readable and have distinct semantic markers.",
        "Confirm Column management starts collapsed, opens from Manage columns, and reads Visible 10 / 10.",
        "Scroll near the bottom and confirm rows update while fewer than 80 virtual rows remain mounted.",
        "Use Export CSV and confirm the browser starts a CSV download.",
        "Complete search, ascending sort, valid edit, Owner-column persistence after reload, and Reset preferences as one uninterrupted workflow.",
      ],
      accessibilityChecks: manualAccessibilityChecks,
    });
    assert.deepEqual(output.nextVerificationCommands, [
      `pnpm release:first-publish-status -- --version 0.1.0 --tag next --repository-url ${quotedRepositoryUrl} --check-auth`,
      `pnpm release:first-publish-preflight -- --version 0.1.0 --tag next --repository-url ${quotedRepositoryUrl}`,
      `pnpm release:trusted-publishing -- --version 0.1.0 --tag next --repository-url ${quotedRepositoryUrl}`,
      "pnpm preview:smoke-ui -- --markdown",
      "pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md",
      "pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json",
      "pnpm preview:smoke-ui -- --open",
      "pnpm review:smoke-ui",
      "pnpm release:ui-smoke-report-check",
      "pnpm e2e:smoke",
      "pnpm e2e",
    ]);
    assert.ok(trustedPublishing);
    assert.deepEqual(trustedPublishing.result.releaseWorkflowInputs, output.releaseWorkflowInputs);
    assert.ok(releaseStage);
    assert.deepEqual(releaseStage.result.failures, output.failures);
    assert.equal(output.steps.some((step) => step.name === "publishDryRun"), false);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("first publish preflight preserves release check json failures", () => {
  const workspace = createFirstPublishReadinessFailureWorkspace();

  try {
    const result = spawnSync(
      process.execPath,
      [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );
    const output = JSON.parse(result.stdout);
    const releaseCheck = output.steps.find((step) => step.name === "releaseCheck");

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.ok(releaseCheck);
    assert.equal(releaseCheck.result.rootVersion, "0.0.0");
    assert.equal(releaseCheck.result.publishablePackageCount, 1);
    assert.equal(releaseCheck.result.examplePackageCount, 1);
    assert.equal(releaseCheck.result.packDryRunCount, 1);
    assert.deepEqual(output.failures, releaseCheck.result.failures);
    assert.ok(output.failures.some((failure) => failure.includes("README.md must include an npm install command for @open-grid/core")));
    assert.ok(output.failures.some((failure) => failure.includes("examples/basic: example packages must stay private")));
    assert.equal(output.steps.some((step) => step.name === "releasePlan"), false);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish preflight reports workflow inputs in text failure output", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-first-publish-text-failure-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--tag", "next", "--out-dir", outDir],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /First publish preflight failed:/);
    assert.match(result.stderr, new RegExp(`Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /Release Publish workflow inputs:/);
    assert.match(result.stderr, /- version: 0\.1\.0/);
    assert.match(result.stderr, new RegExp(`- repository_url: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stderr, /- npm_tag: next/);
    assert.match(result.stderr, /- confirm_publish: publish-open-grid/);
    assert.match(result.stderr, /- ui_smoke_report: @\.release\/ui-smoke-report\.json/);
    assert.match(result.stderr, /Release Publish workflow UI gates:/);
    assert.match(result.stderr, /- pnpm preview:smoke-ui -- --markdown/);
    assert.match(result.stderr, /- pnpm e2e:smoke/);
    assert.match(result.stderr, /- pnpm e2e/);
    assert.match(result.stderr, /Manual UI smoke targets:/);
    assert.match(result.stderr, /- React: http:\/\/127\.0\.0\.1:4193\//);
    assert.match(result.stderr, /  open: pnpm preview:smoke-ui -- --framework React --open/);
    assert.match(result.stderr, /  open wait timeout: 30000ms/);
    assert.match(result.stderr, /  loading state text: Refreshing invoices\.\.\./);
    assert.match(result.stderr, /  error state text: Invoice service is unavailable\./);
    assert.match(result.stderr, /  invalid edit target: INV-0001\/customer/);
    assert.match(result.stderr, /  validation message: Customer must be at least 3 characters/);
    assert.match(result.stderr, /Next verification commands:/);
    assert.match(result.stderr, /pnpm release:first-publish-status -- --version 0\.1\.0 --tag next/);
    assert.match(result.stderr, /pnpm release:first-publish-preflight -- --version 0\.1\.0 --tag next/);
    assert.match(result.stderr, /pnpm release:trusted-publishing -- --version 0\.1\.0 --tag next/);
    assert.match(result.stderr, /pnpm preview:smoke-ui -- --markdown/);
    assert.match(result.stderr, /Failures:/);
    assert.match(result.stderr, new RegExp(`${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: output directory must be empty or absent`));
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("first publish preflight reports a markdown verification report", () => {
  const outDir = mkdtempSync(join(tmpdir(), "open-grid-first-publish-markdown-"));
  writeFile(join(outDir, "existing.txt"), "existing\n");

  try {
    const result = spawnSync(
      process.execPath,
      [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--tag", "next", "--out-dir", outDir, "--markdown"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /# First Publish Preflight Report/);
    assert.match(result.stdout, new RegExp(`- Repository URL: ${repositoryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(result.stdout, /- Version: 0\.1\.0/);
    assert.match(result.stdout, /- Release tag: open-grid-v0\.1\.0/);
    assert.match(result.stdout, /- npm tag: next/);
    assert.match(result.stdout, /- Result: blocked/);
    assert.match(result.stdout, /## Failures/);
    assert.match(result.stdout, new RegExp(`- \\[ \\] ${outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: output directory must be empty or absent`));
    assert.match(result.stdout, /## Verified Steps/);
    assert.match(result.stdout, /- \[x\] trustedPublishing/);
    assert.match(result.stdout, /- \[x\] releasePolicy/);
    assert.match(result.stdout, /- \[x\] releaseCheck/);
    assert.match(result.stdout, /- \[x\] releasePlan/);
    assert.match(result.stdout, /- \[x\] releaseStage/);
    assert.doesNotMatch(result.stdout, /- \[x\] publishDryRun/);
    assert.match(result.stdout, /## Release Publish Workflow Inputs/);
    assert.match(result.stdout, /- \[ \] version: `0\.1\.0`/);
    assert.match(result.stdout, /- \[ \] npm_tag: `next`/);
    assert.match(result.stdout, /- \[ \] confirm_publish: `publish-open-grid`/);
    assert.match(result.stdout, /- \[ \] ui_smoke_report: `@\.release\/ui-smoke-report\.json`/);
    assert.match(result.stdout, /## Release Publish Workflow Gates/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --markdown`/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --report --out-file \.release\/ui-smoke-report\.md`/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --report --json --out-file \.release\/ui-smoke-report\.json`/);
    assert.match(result.stdout, /- \[ \] `pnpm review:smoke-ui`/);
    assert.match(result.stdout, /- \[ \] `pnpm release:ui-smoke-report-check`/);
    assert.match(result.stdout, /- \[ \] `pnpm e2e:smoke`/);
    assert.match(result.stdout, /- \[ \] `pnpm e2e`/);
    assert.match(result.stdout, /## Manual UI Smoke Checklist/);
    assert.match(result.stdout, /### React/);
    assert.match(result.stdout, /- URL: http:\/\/127\.0\.0\.1:4193\//);
    assert.match(result.stdout, /- Build: `pnpm --filter @open-grid\/react-ui build && pnpm --filter @open-grid\/example-react-basic build`/);
    assert.match(result.stdout, /- Preview: `pnpm --filter @open-grid\/example-react-basic preview --port 4193`/);
    assert.match(result.stdout, /- Open: `pnpm preview:smoke-ui -- --framework React --open`/);
    assert.match(result.stdout, /- Open wait timeout: `30000ms`/);
    assert.match(result.stdout, /- Primary smoke column id: `customer`/);
    assert.match(result.stdout, /- Managed column count assertion: `Visible 10 \/ 10`/);
    assert.match(result.stdout, /- Loading state text: `Refreshing invoices\.\.\.`/);
    assert.match(result.stdout, /- Error state text: `Invoice service is unavailable\.`/);
    assert.match(result.stdout, /- Invalid edit target: `INV-0001\/customer`/);
    assert.match(result.stdout, /- Validation message: `Customer must be at least 3 characters`/);
    assert.match(result.stdout, /#### Functional Checks/);
    assert.match(result.stdout, /- \[ \] Confirm the Customer column header is visible\./);
    assert.match(result.stdout, /#### Accessibility Checks/);
    assert.match(result.stdout, /- \[ \] Use a screen reader to enter the grid/);
    assert.match(result.stdout, /### Vue/);
    assert.match(result.stdout, /- Primary smoke column id: `city`/);
    assert.match(result.stdout, /- Managed column count assertion: `Visible 8 \/ 8`/);
    assert.match(result.stdout, /- Loading state text: `Refreshing forecasts\.\.\.`/);
    assert.match(result.stdout, /- Error state text: `Forecast service is unavailable\.`/);
    assert.match(result.stdout, /- Invalid edit target: `REG-001\/city`/);
    assert.match(result.stdout, /- Validation message: `City must be at least 3 characters`/);
    assert.match(result.stdout, /### Svelte/);
    assert.match(result.stdout, /## Next Verification Commands/);
    assert.match(result.stdout, /- \[ \] `pnpm release:first-publish-status -- --version 0\.1\.0 --tag next/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --report --out-file \.release\/ui-smoke-report\.md`/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --report --json --out-file \.release\/ui-smoke-report\.json`/);
    assert.match(result.stdout, /- \[ \] `pnpm preview:smoke-ui -- --open`/);
    assert.match(result.stdout, /- \[ \] `pnpm review:smoke-ui`/);
    assert.match(result.stdout, /- \[ \] `pnpm release:ui-smoke-report-check`/);
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
});

test("release publish commands reject version-like npm dist-tags before running gates", () => {
  const publishDryRun = spawnSync(
    process.execPath,
    [releasePublishDryRunPath, "--", "--tag", "1.0.0", "--json"],
    { encoding: "utf8" },
  );
  const guardedPublish = spawnSync(
    process.execPath,
    [releasePublishPath, "--", "--tag", "v1", "--dry-run", "--json"],
    { encoding: "utf8" },
  );
  const firstPublishPreflight = spawnSync(
    process.execPath,
    [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--tag", "2-next", "--json"],
    { encoding: "utf8" },
  );
  const trustedPublishing = spawnSync(
    process.execPath,
    [scriptPath, "--", "--repository-url", repositoryUrl, "--tag", "3-next", "--json"],
    { encoding: "utf8" },
  );

  assert.equal(publishDryRun.status, 1);
  assert.match(publishDryRun.stderr, /Release publish dry-run failed: --tag must be a valid npm dist-tag/);
  assert.equal(guardedPublish.status, 1);
  assert.match(guardedPublish.stderr, /Release publish failed: --tag must be a valid npm dist-tag/);
  assert.equal(firstPublishPreflight.status, 1);
  assert.match(firstPublishPreflight.stderr, /First publish preflight failed: --tag must be a valid npm dist-tag/);
  assert.equal(trustedPublishing.status, 1);
  assert.match(trustedPublishing.stderr, /Release trusted publishing plan failed: --tag must be a valid npm dist-tag/);
});

test("release trusted publishing rejects invalid requested versions before running gates", () => {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--", "--version", "not-semver", "--repository-url", repositoryUrl, "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release trusted publishing plan failed: --version must be a valid semver version/);
});

test("release trusted publishing rejects invalid root versions before running gates", () => {
  const workspace = createWorkspace(validPublishWorkflow(), { rootVersion: "not-semver" });

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release trusted publishing plan failed: --version must be a valid semver version/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("first publish preflight rejects invalid root versions before running gates", () => {
  const workspace = createWorkspace(validPublishWorkflow(), { rootVersion: "not-semver" });

  try {
    const result = spawnSync(
      process.execPath,
      [firstPublishPreflightPath, "--", "--repository-url", repositoryUrl, "--json"],
      { cwd: workspace, encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /First publish preflight failed: --version must be a valid semver version/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release publish dry-run rejects invalid root versions before running gates", () => {
  const workspace = createWorkspace(validPublishWorkflow(), { rootVersion: "not-semver" });

  try {
    const result = spawnSync(process.execPath, [releasePublishDryRunPath, "--", "--json"], {
      cwd: workspace,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release publish dry-run failed: --version must be a valid semver version/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("release publish rejects invalid root versions before running gates", () => {
  const workspace = createWorkspace(validPublishWorkflow(), { rootVersion: "not-semver" });

  try {
    const result = spawnSync(process.execPath, [releasePublishPath, "--", "--dry-run", "--json"], {
      cwd: workspace,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release publish failed: --version must be a valid semver version/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

function createUiSmokeInspectionReport() {
  return JSON.parse(execFileSync(
    process.execPath,
    [uiSmokePreviewPath, "--", "--report", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  ));
}

function completeUiSmokeInspectionReport(report) {
  report.reviewEnvironment = {
    reviewer: "Release Reviewer",
    date: currentLocalDate(),
    operatingSystem: "Windows 11 24H2",
    browser: "Chrome 138",
    browserZoom: "200%",
    viewport: "390 CSS px",
    screenReader: "NVDA 2025.1",
    forcedColorsOrHighContrast: "Windows High Contrast Black",
  };

  for (const target of report.targets) {
    target.result = "pass";
    target.evidence = `${target.framework} primary workflows completed.`;
    for (const item of [...target.manualChecks, ...target.accessibilityChecks]) {
      item.result = "pass";
      item.evidence = `${target.framework}: observed ${item.check}`;
    }
  }
}

function currentLocalDate() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createWorkspace(workflow, options = {}) {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-release-trusted-"));
  const rootVersion = options.rootVersion ?? "0.0.0";

  writeJson(join(workspace, "package.json"), { name: "fixture", private: true, version: rootVersion });
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    version: rootVersion,
  });
  writeJson(join(workspace, "packages", "react", "package.json"), {
    name: "@open-grid/react",
    version: rootVersion,
  });
  writeFile(join(workspace, ".github", "workflows", "release-publish.yml"), workflow);

  return workspace;
}

function createGitPushWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-github-push-"));

  execFileSync("git", ["init", "-b", "main"], { cwd: workspace, stdio: "ignore" });
  writeJson(join(workspace, "package.json"), { name: "fixture", private: true, version: "0.0.0" });
  execFileSync("git", ["add", "package.json"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Open Grid", "-c", "user.email=open-grid@example.com", "commit", "-m", "initial release base"], {
    cwd: workspace,
    stdio: "ignore",
  });
  const remoteBase = execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();

  writeFile(join(workspace, "README.md"), "# Fixture\n");
  execFileSync("git", ["add", "README.md"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Open Grid", "-c", "user.email=open-grid@example.com", "commit", "-m", "prepare release branch"], {
    cwd: workspace,
    stdio: "ignore",
  });
  execFileSync("git", ["remote", "add", "origin", "git@github.com:example/open-grid.git"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", remoteBase], { cwd: workspace, stdio: "ignore" });

  return workspace;
}

function createFirstPublishStatusWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-first-publish-status-"));

  cpSync(join(repoRoot, "scripts"), join(workspace, "scripts"), { recursive: true });
  writeJson(join(workspace, "package.json"), {
    name: "fixture",
    private: true,
    version: "0.0.0",
    packageManager: "pnpm@9.15.0",
    engines: {
      node: ">=22.0.0",
    },
    scripts: {
      "release:first-publish-status": "node scripts/release-first-publish-status.mjs",
    },
  });
  writeFile(join(workspace, "CHANGELOG.md"), "# Changelog\n\n## 0.0.0 - 2026-07-04\n\n- Fixture release.\n");
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    version: "0.0.0",
    description: "Fixture data grid package.",
    keywords: ["data-grid", "grid", "table"],
    homepage: "https://goatshave.github.io/open-grid/packages#core",
    bugs: {
      url: "https://github.com/Goatshave/open-grid/issues",
    },
    publishConfig: {
      access: "public",
    },
    license: "MIT",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
    files: ["dist", "LICENSE"],
    sideEffects: false,
    scripts: {
      build: "echo build",
      check: "echo check",
      lint: "echo lint",
      test: "echo test",
    },
  });
  writeFile(join(workspace, "packages", "core", "dist", "index.js"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "dist", "index.d.ts"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "LICENSE"), "MIT License\n");
  writeFile(join(workspace, "packages", "core", "README.md"), "# @open-grid/core\n\n```bash\nnpm install @open-grid/core\n```\n");
  mkdirSync(join(workspace, "examples"), { recursive: true });
  writeFile(join(workspace, ".github", "workflows", "release-publish.yml"), validPublishWorkflow());

  execFileSync("git", ["init", "-b", "main"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Open Grid", "-c", "user.email=open-grid@example.com", "commit", "-m", "initial release base"], {
    cwd: workspace,
    stdio: "ignore",
  });
  const remoteBase = execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();

  writeFile(join(workspace, "README.md"), "# Fixture\n");
  execFileSync("git", ["add", "README.md"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Open Grid", "-c", "user.email=open-grid@example.com", "commit", "-m", "prepare release branch"], {
    cwd: workspace,
    stdio: "ignore",
  });
  execFileSync("git", ["remote", "add", "origin", "git@github.com:example/open-grid.git"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", remoteBase], { cwd: workspace, stdio: "ignore" });

  return workspace;
}

function createReadinessWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-release-check-"));

  writeJson(join(workspace, "package.json"), { name: "fixture", private: true, version: "0.0.0" });
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    version: "0.0.0",
    license: "MIT",
    type: "module",
    exports: "./dist/index.js",
    files: ["dist", "LICENSE"],
    sideEffects: false,
    scripts: {
      build: "echo build",
      check: "echo check",
      lint: "echo lint",
      test: "echo test",
    },
  });
  writeJson(join(workspace, "examples", "basic", "package.json"), {
    name: "@open-grid/example-basic",
    private: false,
    scripts: {},
  });

  return workspace;
}

function createReleaseStageWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-release-stage-"));

  writeJson(join(workspace, "package.json"), {
    name: "fixture",
    private: true,
    version: "0.0.0",
  });
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    version: "0.0.0",
    description: "Fixture data grid package.",
    license: "MIT",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
    files: ["dist", "LICENSE"],
    sideEffects: false,
  });
  writeFile(join(workspace, "packages", "core", "dist", "index.js"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "dist", "index.d.ts"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "LICENSE"), "MIT License\n");
  writeFile(join(workspace, "packages", "core", "README.md"), "# @open-grid/core\n");

  return workspace;
}

function createFirstPublishReadinessFailureWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-first-publish-check-"));

  cpSync(join(repoRoot, "scripts"), join(workspace, "scripts"), { recursive: true });
  writeJson(join(workspace, "package.json"), {
    name: "fixture",
    private: true,
    version: "0.0.0",
    packageManager: "pnpm@9.15.0",
    engines: {
      node: ">=22.0.0",
    },
  });
  writeFile(join(workspace, "CHANGELOG.md"), "# Changelog\n\n## 0.0.0 - 2026-07-04\n\n- Fixture release.\n");
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    version: "0.0.0",
    description: "Fixture data grid package.",
    keywords: ["data-grid", "grid", "table"],
    homepage: "https://goatshave.github.io/open-grid/packages#core",
    bugs: {
      url: "https://github.com/Goatshave/open-grid/issues",
    },
    publishConfig: {
      access: "public",
    },
    license: "MIT",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
    files: ["dist"],
    sideEffects: false,
    scripts: {
      build: "echo build",
      check: "echo check",
      lint: "echo lint",
      test: "echo test",
    },
  });
  writeFile(join(workspace, "packages", "core", "dist", "index.js"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "dist", "index.d.ts"), "export {};\n");
  writeFile(join(workspace, "packages", "core", "LICENSE"), "MIT License\n");
  writeFile(join(workspace, "packages", "core", "README.md"), "# @open-grid/core\n");
  writeJson(join(workspace, "examples", "basic", "package.json"), {
    name: "@open-grid/example-basic",
    private: false,
    scripts: {
      build: "echo build",
    },
  });
  writeFile(join(workspace, ".github", "workflows", "release-publish.yml"), validPublishWorkflow());

  return workspace;
}

function createPublishPlanFailureWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "open-grid-publish-plan-"));

  cpSync(join(repoRoot, "scripts"), join(workspace, "scripts"), { recursive: true });
  writeJson(join(workspace, "package.json"), { name: "fixture", private: true, version: "0.0.0" });
  writeJson(join(workspace, "packages", "core", "package.json"), {
    name: "@open-grid/core",
    private: true,
    version: "0.0.0",
  });

  return workspace;
}

function writeJson(path, value) {
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function writeExecutable(path, value) {
  writeFile(path, value);
  chmodSync(path, 0o755);
  return path;
}

function validPublishWorkflow() {
  return `name: Release Publish

on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        type: string
      npm_tag:
        required: true
        type: string
      repository_url:
        required: true
        type: string
      confirm_publish:
        required: true
        type: string
      ui_smoke_report:
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - run: npm install -g npm@11
      - run: |
          [[ "$RELEASE_VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$ ]]
      - run: |
          [[ "$NPM_TAG" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]
          [[ ! "$NPM_TAG" =~ ^v?[0-9] ]]
      - run: test "\${{ github.event.inputs.confirm_publish }}" = "publish-open-grid"
      - env:
          UI_SMOKE_REPORT: \${{ github.event.inputs.ui_smoke_report }}
        run: |
          mkdir -p .release
          printf '%s' "$UI_SMOKE_REPORT" > .release/ui-smoke-report.json
      - run: ${workflowUiSmokeValidationCommand}
      - run: pnpm release:check -- --json
      - run: pnpm release:trusted-publishing -- --version "$RELEASE_VERSION" --tag "$NPM_TAG" --repository-url "$REPOSITORY_URL" --json
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --dry-run
      - run: pnpm e2e:smoke
      - run: pnpm e2e
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --provenance --confirm publish-open-grid
`;
}

function unguardedPublishWorkflow() {
  return `name: Release Publish

on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        type: string
      npm_tag:
        required: true
        type: string
      repository_url:
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL"
`;
}

function actualPublishWithoutRepositoryUrlWorkflow() {
  return `name: Release Publish

on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        type: string
      npm_tag:
        required: true
        type: string
      repository_url:
        required: true
        type: string
      confirm_publish:
        required: true
        type: string
      ui_smoke_report:
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - run: npm install -g npm@11
      - run: |
          [[ "$RELEASE_VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$ ]]
      - run: |
          [[ "$NPM_TAG" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]
          [[ ! "$NPM_TAG" =~ ^v?[0-9] ]]
      - run: test "\${{ github.event.inputs.confirm_publish }}" = "publish-open-grid"
      - env:
          UI_SMOKE_REPORT: \${{ github.event.inputs.ui_smoke_report }}
        run: |
          mkdir -p .release
          printf '%s' "$UI_SMOKE_REPORT" > .release/ui-smoke-report.json
      - run: ${workflowUiSmokeValidationCommand}
      - run: pnpm release:check -- --json
      - run: pnpm release:trusted-publishing -- --version "$RELEASE_VERSION" --tag "$NPM_TAG" --repository-url "$REPOSITORY_URL" --json
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --dry-run
      - run: pnpm e2e:smoke
      - run: pnpm e2e
      - run: pnpm release:publish -- --provenance --confirm publish-open-grid
`;
}

function trustedPublishingWithoutRequestedInputsWorkflow() {
  return `name: Release Publish

on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        type: string
      npm_tag:
        required: true
        type: string
      repository_url:
        required: true
        type: string
      confirm_publish:
        required: true
        type: string
      ui_smoke_report:
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - run: npm install -g npm@11
      - run: |
          [[ "$RELEASE_VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$ ]]
      - run: |
          [[ "$NPM_TAG" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]
          [[ ! "$NPM_TAG" =~ ^v?[0-9] ]]
      - run: test "\${{ github.event.inputs.confirm_publish }}" = "publish-open-grid"
      - env:
          UI_SMOKE_REPORT: \${{ github.event.inputs.ui_smoke_report }}
        run: |
          mkdir -p .release
          printf '%s' "$UI_SMOKE_REPORT" > .release/ui-smoke-report.json
      - run: ${workflowUiSmokeValidationCommand}
      - run: pnpm release:check -- --json
      - run: pnpm release:trusted-publishing -- --repository-url "$REPOSITORY_URL" --json
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --dry-run
      - run: pnpm e2e:smoke
      - run: pnpm e2e
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --provenance --confirm publish-open-grid
`;
}

function missingRequiredReleaseInputsWorkflow() {
  return `name: Release Publish

on:
  workflow_dispatch:
    inputs:
      version:
        required: false
        type: string
      npm_tag:
        type: string
      repository_url:
        required: true
        type: string
      confirm_publish:
        required: true
        type: string
      ui_smoke_report:
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - run: npm install -g npm@11
      - run: |
          [[ "$RELEASE_VERSION" =~ ^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$ ]]
      - run: |
          [[ "$NPM_TAG" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]
          [[ ! "$NPM_TAG" =~ ^v?[0-9] ]]
      - run: test "\${{ github.event.inputs.confirm_publish }}" = "publish-open-grid"
      - env:
          UI_SMOKE_REPORT: \${{ github.event.inputs.ui_smoke_report }}
        run: |
          mkdir -p .release
          printf '%s' "$UI_SMOKE_REPORT" > .release/ui-smoke-report.json
      - run: ${workflowUiSmokeValidationCommand}
      - run: pnpm release:check -- --json
      - run: pnpm release:trusted-publishing -- --version "$RELEASE_VERSION" --tag "$NPM_TAG" --repository-url "$REPOSITORY_URL" --json
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --dry-run
      - run: pnpm e2e:smoke
      - run: pnpm e2e
      - run: pnpm release:publish -- --repository-url "$REPOSITORY_URL" --provenance --confirm publish-open-grid
`;
}
