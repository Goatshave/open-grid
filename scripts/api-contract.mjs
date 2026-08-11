import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const snapshotRoot = join(root, "api-contract");
const exportsSnapshotPath = join(snapshotRoot, "exports.json");
const write = process.argv.includes("--write");
const unknown = process.argv.slice(2).filter((arg) => arg !== "--" && arg !== "--write" && arg !== "--json");
const json = process.argv.includes("--json");

if (unknown.length > 0) {
  console.error(`API contract check failed: unknown argument ${unknown[0]}`);
  process.exit(1);
}

const contracts = collectContracts();
const failures = [];
const expectedSnapshots = new Set(contracts.map((contract) => contract.snapshotPath));
const duplicateSnapshots = contracts.filter((contract, index) =>
  contracts.findIndex((candidate) => candidate.snapshotPath === contract.snapshotPath) !== index,
);

for (const contract of duplicateSnapshots) {
  failures.push(`${contract.packageName} ${contract.exportPath}: API snapshot path collides at ${relative(root, contract.snapshotPath)}`);
}

const exportsContract = collectExportsContract();
const serializedExportsContract = `${JSON.stringify(exportsContract, null, 2)}\n`;

if (write) {
  mkdirSync(snapshotRoot, { recursive: true });
  writeFileSync(exportsSnapshotPath, serializedExportsContract);
  for (const stale of collectDeclarationSnapshots().filter((file) => !expectedSnapshots.has(file))) {
    rmSync(stale);
  }
} else {
  if (!existsSync(exportsSnapshotPath)) {
    failures.push(`missing public exports snapshot ${relative(root, exportsSnapshotPath)}`);
  } else if (normalize(readFileSync(exportsSnapshotPath, "utf8")) !== normalize(serializedExportsContract)) {
    failures.push(`public package exports differ from ${relative(root, exportsSnapshotPath)}; review the API change and run pnpm api:update`);
  }
  for (const stale of collectDeclarationSnapshots().filter((file) => !expectedSnapshots.has(file))) {
    failures.push(`stale API snapshot ${relative(root, stale)} does not match a current typed export; review the API removal and run pnpm api:update`);
  }
}

for (const contract of contracts) {
  if (!existsSync(contract.sourcePath)) {
    failures.push(`${contract.packageName} ${contract.exportPath}: missing built declaration ${relative(root, contract.sourcePath)}`);
    continue;
  }

  const declaration = normalize(readFileSync(contract.sourcePath, "utf8"));
  if (write) {
    mkdirSync(dirname(contract.snapshotPath), { recursive: true });
    writeFileSync(contract.snapshotPath, declaration);
    continue;
  }

  if (!existsSync(contract.snapshotPath)) {
    failures.push(`${contract.packageName} ${contract.exportPath}: missing API snapshot ${relative(root, contract.snapshotPath)}`);
    continue;
  }
  if (normalize(readFileSync(contract.snapshotPath, "utf8")) !== declaration) {
    failures.push(`${contract.packageName} ${contract.exportPath}: public declarations differ from ${relative(root, contract.snapshotPath)}; review the API change and run pnpm api:update`);
  }
}

const result = {
  passed: failures.length === 0,
  mode: write ? "write" : "check",
  contractCount: contracts.length,
  packageCount: exportsContract.packages.length,
  exportCount: exportsContract.packages.reduce((count, pkg) => count + Object.keys(pkg.exports).length, 0),
  failures,
};
if (json) console.log(JSON.stringify(result, null, 2));
else if (failures.length > 0) {
  console.error("API contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
} else {
  console.log(`${write ? "Updated" : "Verified"} ${contracts.length} declaration contracts and ${result.exportCount} public exports across ${result.packageCount} packages.`);
}
if (failures.length > 0) process.exitCode = 1;

function collectContracts() {
  return readdirSync(join(root, "packages"))
    .sort()
    .flatMap((directory) => {
      const manifestPath = join(root, "packages", directory, "package.json");
      if (!existsSync(manifestPath)) return [];
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      return collectTypeTargets(manifest.exports).map(({ exportPath, target }) => ({
        packageName: manifest.name,
        exportPath,
        sourcePath: join(root, "packages", directory, target.replace(/^\.\//, "")),
        snapshotPath: join(snapshotRoot, directory, snapshotName(exportPath, target)),
      }));
    });
}

function collectExportsContract() {
  return {
    schemaVersion: 1,
    packages: readdirSync(join(root, "packages"))
      .sort()
      .flatMap((directory) => {
        const manifestPath = join(root, "packages", directory, "package.json");
        if (!existsSync(manifestPath)) return [];
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        return [{ directory, name: manifest.name, exports: sortJson(manifest.exports ?? {}) }];
      }),
  };
}

function collectTypeTargets(exportsMap) {
  if (!exportsMap || typeof exportsMap !== "object") return [];
  return Object.entries(exportsMap).flatMap(([exportPath, entry]) => {
    if (typeof entry !== "object" || entry === null || typeof entry.types !== "string") return [];
    return [{ exportPath, target: entry.types }];
  });
}

function snapshotName(exportPath, target) {
  if (exportPath === ".") return "index.d.ts";
  const safePath = exportPath.replace(/^\.\//, "").replace(/[^A-Za-z0-9._-]+/g, "-");
  return target.endsWith(".svelte.d.ts") && !safePath.endsWith(".svelte") ? `${safePath}.svelte.d.ts` : `${safePath}.d.ts`;
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : entry.isFile() ? [path] : [];
  });
}

function collectDeclarationSnapshots() {
  return collectFiles(snapshotRoot).filter((file) => file.endsWith(".d.ts"));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function normalize(value) {
  return `${value.replace(/\r\n/g, "\n").trimEnd()}\n`;
}
