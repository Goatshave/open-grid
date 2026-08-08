export const uiSmokeChecklistCommand = "pnpm preview:smoke-ui -- --markdown";
export const uiSmokeReportCommand = "pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md";
export const uiSmokeJsonReportCommand = "pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json";
export const uiSmokeOpenCommand = "pnpm preview:smoke-ui -- --open";
export const uiSmokeReviewCommand = "pnpm review:smoke-ui";
export const uiSmokeReportCheckCommand = "pnpm release:ui-smoke-report-check";
export const uiSmokeAutomatedCommand = "pnpm e2e:smoke";
export const fullE2eCommand = "pnpm e2e";

export const releaseWorkflowUiGates = [
  uiSmokeChecklistCommand,
  uiSmokeReportCommand,
  uiSmokeJsonReportCommand,
  uiSmokeReviewCommand,
  uiSmokeReportCheckCommand,
  uiSmokeAutomatedCommand,
  fullE2eCommand,
];

export const uiSmokeVerificationCommands = [
  uiSmokeChecklistCommand,
  uiSmokeReportCommand,
  uiSmokeJsonReportCommand,
  uiSmokeOpenCommand,
  uiSmokeReviewCommand,
  uiSmokeReportCheckCommand,
  uiSmokeAutomatedCommand,
  fullE2eCommand,
];

export const uiSmokeVerificationCommandArgs = [
  ["pnpm", "preview:smoke-ui", "--", "--markdown"],
  ["pnpm", "preview:smoke-ui", "--", "--report", "--out-file", ".release/ui-smoke-report.md"],
  ["pnpm", "preview:smoke-ui", "--", "--report", "--json", "--out-file", ".release/ui-smoke-report.json"],
  ["pnpm", "preview:smoke-ui", "--", "--open"],
  ["pnpm", "review:smoke-ui"],
  ["pnpm", "release:ui-smoke-report-check"],
  ["pnpm", "e2e:smoke"],
  ["pnpm", "e2e"],
];
