import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
let args;

try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Release consumer smoke failed: ${error.message}`);
  process.exit(1);
}

const rootPackage = readJson(join(root, "package.json"));
const version = args.version ?? rootPackage.version;
const workspace = realpathSync(mkdtempSync(join(tmpdir(), "open-grid-consumer-smoke-")));
const consumerRoot = join(workspace, "consumer");
const tarballDirectory = args.tarballDir ? resolve(root, args.tarballDir) : join(workspace, "tarballs");
const checks = [];

try {
  if (!isSemver(version)) {
    throw new TypeError(`version must be valid semver; got ${JSON.stringify(version)}`);
  }

  if (!args.tarballDir) {
    run(process.execPath, [
      join(scriptDirectory, "release-stage.mjs"),
      "--version",
      version,
      "--out-dir",
      tarballDirectory,
      "--repository-url",
      "git+https://github.com/Goatshave/open-grid.git",
    ]);
    checks.push("stage");
  }

  const tarballs = readTarballs(tarballDirectory, version);
  mkdirSync(join(consumerRoot, "src"), { recursive: true });
  writeConsumerFiles(consumerRoot);
  installConsumer(consumerRoot, tarballs);
  checks.push("install");

  run(process.execPath, [
    "--input-type=module",
    "--eval",
    [
      'await import("@open-grid/core")',
      'await import("@open-grid/primitives")',
      'await import("@open-grid/virtual")',
      'await import("@open-grid/theme/tokens")',
      'await import("@open-grid/react")',
      'await import("@open-grid/react-ui")',
      'await import("@open-grid/vue")',
      'await import("@open-grid/vue-ui")',
      'await import("@open-grid/svelte")',
    ].join(";"),
  ], { cwd: consumerRoot });
  checks.push("esm-imports");

  run("npm", ["exec", "--", "tsc", "--project", "tsconfig.json"], { cwd: consumerRoot });
  checks.push("types");

  run("npm", ["exec", "--", "vite", "build", "--config", "vite.config.mjs"], { cwd: consumerRoot });
  checks.push("svelte-build");

  const result = { passed: true, version, packageCount: tarballs.length, checks };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(`Release consumer smoke passed for ${tarballs.length} packages at ${version}: ${checks.join(", ")}.`);
} catch (error) {
  const result = {
    passed: false,
    version,
    packageCount: existsSync(tarballDirectory) ? readdirSync(tarballDirectory).filter((name) => name.endsWith(".tgz")).length : 0,
    checks,
    error: formatCommandError(error),
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.error(`Release consumer smoke failed: ${result.error}`);
  process.exitCode = 1;
} finally {
  if (!args.keepTemp) rmSync(workspace, { recursive: true, force: true });
  else console.error(`Consumer smoke workspace retained at ${workspace}`);
}

function parseArgs(argv) {
  const parsed = { json: false, keepTemp: false, tarballDir: undefined, version: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--json") parsed.json = true;
    else if (arg === "--keep-temp") parsed.keepTemp = true;
    else if (arg === "--tarball-dir") parsed.tarballDir = requireValue(argv, ++index, "--tarball-dir");
    else if (arg.startsWith("--tarball-dir=")) parsed.tarballDir = requireInlineValue(arg, "--tarball-dir");
    else if (arg === "--version") parsed.version = requireValue(argv, ++index, "--version");
    else if (arg.startsWith("--version=")) parsed.version = requireInlineValue(arg, "--version");
    else throw new TypeError(`unknown argument ${arg}`);
  }
  return parsed;
}

function requireValue(argv, index, label) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new TypeError(`${label} requires a value`);
  return value;
}

function requireInlineValue(arg, label) {
  const value = arg.slice(label.length + 1);
  if (!value) throw new TypeError(`${label} requires a value`);
  return value;
}

function readTarballs(directory, expectedVersion) {
  if (!existsSync(directory)) throw new TypeError(`tarball directory does not exist: ${directory}`);
  const files = readdirSync(directory).filter((name) => name.endsWith(".tgz")).sort();
  if (files.length !== 10) throw new TypeError(`expected 10 staged tarballs, found ${files.length}`);

  return files.map((name) => {
    const tarball = join(directory, name);
    const manifest = JSON.parse(execFileSync("tar", ["-xOf", tarball, "package/package.json"], { encoding: "utf8" }));
    if (manifest.version !== expectedVersion) {
      throw new TypeError(`${manifest.name ?? name} version must be ${expectedVersion}, got ${manifest.version}`);
    }
    return tarball;
  });
}

function installConsumer(directory, tarballs) {
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    ...tarballs,
    "react@19.2.8",
    "react-dom@19.2.8",
    "@types/react@19.2.18",
    "@types/react-dom@19.2.3",
    "vue@3.5.41",
    "svelte@5.56.8",
    "typescript@5.9.3",
    "vite@6.4.3",
    "@sveltejs/vite-plugin-svelte@5.1.1",
  ], { cwd: directory });
}

function writeConsumerFiles(directory) {
  writeFileSync(join(directory, "package.json"), `${JSON.stringify({ name: "open-grid-external-consumer", private: true, type: "module" }, null, 2)}\n`);
  writeFileSync(join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      skipLibCheck: false,
    },
    include: ["src/consumer.tsx"],
  }, null, 2)}\n`);
  writeFileSync(join(directory, "src", "consumer.tsx"), `
import { createColumnHelper, createGrid } from "@open-grid/core";
import { getGridProps } from "@open-grid/primitives";
import { DataGrid as ReactDataGrid } from "@open-grid/react-ui";
import type { DataGridProps as SvelteDataGridProps } from "@open-grid/svelte-ui";
import { createOpenGridThemeStyle } from "@open-grid/theme/tokens";
import { createDataGrid, type DataGridProps as VueDataGridProps } from "@open-grid/vue-ui";

interface Row { id: string; name: string }
const rows: Row[] = [{ id: "1", name: "Installed" }];
const column = createColumnHelper<Row>();
const columns = [column.accessor("name", { header: "Name" })];
const grid = createGrid({ columns, data: rows, getRowId: (row) => row.id });
getGridProps(grid, { ariaLabel: "External consumer" });
createOpenGridThemeStyle({ accent: "#087f5b" });
export const reactGrid = <ReactDataGrid columns={columns} data={rows} getRowId={(row) => row.id} localization={{ noRows: "No external rows" }} />;
export const VueGrid = createDataGrid<Row>();
export const vueGridProps: VueDataGridProps<Row> = { options: { columns, data: rows, getRowId: (row) => row.id }, localization: { noRows: "No external rows" } };
export const svelteGridProps: SvelteDataGridProps<Row> = { options: { columns, data: rows, getRowId: (row) => row.id }, localization: { noRows: "No external rows" } };
`);
  writeFileSync(join(directory, "index.html"), '<div id="app"></div><script type="module" src="/src/main.ts"></script>\n');
  writeFileSync(join(directory, "src", "main.ts"), 'import App from "./App.svelte"; new App({ target: document.getElementById("app")! });\n');
  writeFileSync(join(directory, "src", "App.svelte"), `<script lang="ts">
  import { createColumnHelper, type GridOptions } from "@open-grid/core";
  import DataGrid from "@open-grid/svelte-ui/DataGrid.svelte";
  import "@open-grid/theme/css";
  import "@open-grid/svelte-ui/css";
  interface Row { id: string; name: string }
  const column = createColumnHelper<Row>();
  const options: GridOptions<Row> = {
    columns: [column.accessor("name", { header: "Name" })],
    data: [{ id: "1", name: "Installed" }],
    getRowId: (row) => row.id,
  };
</script>
<DataGrid ariaLabel="External Svelte consumer" localization={{ noRows: "No external rows" }} {options} />
`);
  writeFileSync(join(directory, "vite.config.mjs"), `
import { svelte } from "@sveltejs/vite-plugin-svelte";
export default { root: ${JSON.stringify(directory)}, plugins: [svelte()], build: { outDir: "dist", emptyOutDir: true } };
`);
}

function run(command, commandArgs, options = {}) {
  execFileSync(command, commandArgs, { cwd: options.cwd ?? root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isSemver(value) {
  return typeof value === "string" && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function formatCommandError(error) {
  if (!(error instanceof Error)) return String(error);
  const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
  const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
  const detail = [stdout, stderr].filter(Boolean).join("\n");
  return detail ? `${error.message}\n${detail}` : error.message;
}
