import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluateServerBenchmarkBudgets,
  formatServerBenchmarkBudgetMarkdown,
} from "../benchmarks/shared/server-budget.mjs";

let options;
try {
  options = parseArgs(process.argv.slice(2));
  const config = JSON.parse(readFileSync(options.configPath, "utf8"));
  const result = JSON.parse(readFileSync(options.inputPath, "utf8"));
  const evaluation = evaluateServerBenchmarkBudgets(config, result);
  process.stdout.write(options.json ? `${JSON.stringify(evaluation, null, 2)}\n` : formatServerBenchmarkBudgetMarkdown(evaluation));
  if (!evaluation.passed) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (options?.json) process.stdout.write(`${JSON.stringify({ passed: false, failures: [{ message }] }, null, 2)}\n`);
  else console.error(`Server benchmark budget check failed: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    configPath: resolve("benchmarks/server-budgets.json"),
    inputPath: resolve(".benchmark-results/server/ci-budget.json"),
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--json") {
      parsed.json = true;
      continue;
    }
    if (argument !== "--config" && argument !== "--input") throw new TypeError(`unknown server budget argument: ${argument}`);
    const value = argv[index + 1];
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) throw new TypeError(`${argument} requires a value`);
    if (argument === "--config") parsed.configPath = resolve(value);
    else parsed.inputPath = resolve(value);
    index += 1;
  }
  return parsed;
}
