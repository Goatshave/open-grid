import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function evaluateAudit(report, policy, date = new Date().toISOString().slice(0, 10)) {
  if (!report || report.error || !report.metadata?.vulnerabilities ||
      !report.advisories || typeof report.advisories !== "object") {
    throw new Error("Audit did not return a complete advisory report");
  }
  if (!["low", "moderate", "high", "critical"].every((severity) =>
    Number.isInteger(report.metadata.vulnerabilities[severity]) &&
    report.metadata.vulnerabilities[severity] >= 0)) {
    throw new Error("Audit did not return complete vulnerability counts");
  }
  if (policy.version !== 1 || !Array.isArray(policy.exceptions)) {
    throw new Error("Invalid dependency audit policy");
  }
  for (const item of policy.exceptions) {
    if (!/^GHSA-[\w-]+$/.test(item.advisory) || !item.package || !item.version ||
        !item.pathPrefix?.endsWith(" > ") || !item.reason ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.expires)) {
      throw new Error("Invalid path-scoped audit exception");
    }
    if (item.expires <= date) throw new Error(`Audit exception expired: ${item.advisory}`);
  }
  const blocked = [];
  const accepted = [];
  for (const advisory of Object.values(report.advisories)) {
    if (!advisory.github_advisory_id || !advisory.module_name ||
        !Array.isArray(advisory.findings) || advisory.findings.length === 0) {
      throw new Error("Audit advisory is missing findings");
    }
    for (const finding of advisory.findings) {
      if (!finding.version || !Array.isArray(finding.paths) || finding.paths.length === 0) {
        throw new Error("Audit finding is missing dependency paths");
      }
      for (const path of finding.paths) {
        const record = {
          advisory: advisory.github_advisory_id,
          package: advisory.module_name,
          version: finding.version,
          severity: advisory.severity,
          path,
        };
        const exception = policy.exceptions.find((item) =>
          item.advisory === record.advisory && item.package === record.package &&
          item.version === record.version && path.startsWith(item.pathPrefix));
        (exception ? accepted : blocked).push(record);
      }
    }
  }
  if (Object.values(report.metadata.vulnerabilities).some((count) => count > 0) &&
      accepted.length + blocked.length === 0) {
    throw new Error("Audit counts contain vulnerabilities without findings");
  }
  return { passed: blocked.length === 0, totals: report.metadata.vulnerabilities, blocked, accepted };
}

function main() {
  const policy = JSON.parse(readFileSync(new URL("../security/audit-exceptions.json", import.meta.url), "utf8"));
  const child = spawnSync("pnpm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (child.error || ![0, 1].includes(child.status)) {
    throw new Error(`Unable to run dependency audit: ${child.error?.message ?? child.stderr ?? child.status}`);
  }
  const result = evaluateAudit(JSON.parse(child.stdout), policy);
  if (child.status === 1 && !Object.values(result.totals).some((count) => count > 0)) {
    throw new Error("Audit exited unsuccessfully without advisory counts");
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
