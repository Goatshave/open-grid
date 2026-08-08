import { readFileSync } from "node:fs";
import path from "node:path";

import { formatBundleBudgetMarkdown, measureBundleBudgets } from "../benchmarks/shared/bundle-budget.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const unknownArgs = args.filter((arg) => arg !== "--json" && arg !== "--");
if (unknownArgs.length > 0) {
  console.error(`Unknown bundle budget argument: ${unknownArgs[0]}`);
  process.exit(1);
}

const rootDirectory = process.cwd();
const configPath = path.join(rootDirectory, "benchmarks", "bundle-budgets.json");

try {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const result = measureBundleBudgets(config, rootDirectory);
  process.stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatBundleBudgetMarkdown(result));
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    process.stdout.write(`${JSON.stringify({ passed: false, failures: [{ message }] }, null, 2)}\n`);
  } else {
    console.error(`Bundle budget check failed: ${message}`);
  }
  process.exitCode = 1;
}
