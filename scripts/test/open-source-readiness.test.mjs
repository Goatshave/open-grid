import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");

test("public repository documentation and community files stay complete", () => {
  const requiredFiles = [
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "docs/README.md",
    "docs/index.md",
    "docs/getting-started.md",
    "docs/packages.md",
    "docs/api-stability.md",
    "docs/performance.md",
    "api-contract/README.md",
    "docs/.vitepress/config.mts",
    ".github/workflows/pages.yml",
    ".github/ISSUE_TEMPLATE/bug.yml",
    ".github/ISSUE_TEMPLATE/feature.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/pull_request_template.md",
  ];
  for (const file of requiredFiles) {
    assert.ok(existsSync(path.join(repoRoot, file)), `missing public repository file: ${file}`);
  }

  const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
  assert.match(readme, /actions\/workflows\/ci\.yml\/badge\.svg/);
  assert.match(readme, /^## Install$/m);
  assert.match(readme, /\[the documentation\]\(https:\/\/goatshave\.github\.io\/open-grid\/\)/);

  for (const directory of readdirSync(path.join(repoRoot, "packages"))) {
    const packageDirectory = path.join(repoRoot, "packages", directory);
    if (!existsSync(path.join(packageDirectory, "package.json"))) continue;
    assert.ok(existsSync(path.join(packageDirectory, "README.md")), `${directory} is missing README.md`);
    assert.ok(existsSync(path.join(packageDirectory, "LICENSE")), `${directory} is missing LICENSE`);
  }
});

test("general CI and dependency updates cover the public repository", () => {
  const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(workflow, /^name: CI$/m);
  assert.match(workflow, /^  push:$/m);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /run: pnpm check/);
  assert.match(workflow, /run: pnpm test/);
  assert.match(workflow, /run: pnpm build$/m);
  assert.match(workflow, /run: pnpm api:check/);
  assert.match(workflow, /run: pnpm compatibility:check/);
  assert.match(workflow, /run: pnpm build:examples/);
  assert.match(workflow, /run: pnpm docs:build/);
  assert.match(workflow, /run: pnpm release:check -- --json/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /run: pnpm e2e:smoke/);
  assert.match(workflow, /^  required-gate:$/m);
  assert.match(workflow, /needs:\n      - quality\n      - browser-smoke/);
  assert.match(workflow, /test "\$QUALITY_RESULT" = "success"/);
  assert.match(workflow, /test "\$UI_SMOKE_RESULT" = "success"/);

  const dependabot = readFileSync(path.join(repoRoot, ".github", "dependabot.yml"), "utf8");
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.equal((dependabot.match(/interval: weekly/g) ?? []).length, 2);
  assert.match(dependabot, /exclude-paths:\n      - "compatibility\/\*\*"/);
  assert.match(dependabot, /npm-minor-patch:[\s\S]*update-types:\n          - minor\n          - patch/);
  assert.match(dependabot, /github-actions:[\s\S]*patterns:\n          - "\*"/);
  assert.match(dependabot, /open-pull-requests-limit: 3/);
  assert.match(dependabot, /open-pull-requests-limit: 1/);
});

test("documentation Pages workflow builds and deploys the public site", () => {
  const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(workflow, /^name: Documentation Pages$/m);
  assert.match(workflow, /actions\/configure-pages@v6/);
  assert.match(workflow, /run: pnpm docs:build/);
  assert.match(workflow, /actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /name: github-pages/);
});

test("framework peer ranges match the documented 0.1 compatibility contract", () => {
  const readPackage = (directory) =>
    JSON.parse(readFileSync(path.join(repoRoot, "packages", directory, "package.json"), "utf8"));

  assert.deepEqual(readPackage("react").peerDependencies, { react: "^18.2.0 || ^19.0.0" });
  assert.deepEqual(readPackage("react-ui").peerDependencies, {
    react: "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0",
  });
  assert.deepEqual(readPackage("vue").peerDependencies, { vue: "^3.4.0" });
  assert.deepEqual(readPackage("vue-ui").peerDependencies, { vue: "^3.4.0" });
  assert.deepEqual(readPackage("svelte").peerDependencies, { svelte: "^4.2.20 || ^5.0.0" });
  assert.deepEqual(readPackage("svelte-ui").peerDependencies, { svelte: "^4.2.20 || ^5.0.0" });

  const gettingStarted = readFileSync(path.join(repoRoot, "docs", "getting-started.md"), "utf8");
  assert.match(gettingStarted, /React \| `>=18\.2\.0 <20`/);
  assert.match(gettingStarted, /Vue \| `>=3\.4\.0 <4`/);
  assert.match(gettingStarted, /Svelte \| `>=4\.2\.20 <6`/);
  assert.match(gettingStarted, /CommonJS `require\(\)`/);

  const ci = readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(ci, /run: pnpm compatibility:check/);
});

test("release workflows enforce API and staged consumer contracts", () => {
  const verification = readFileSync(path.join(repoRoot, ".github", "workflows", "release-verify.yml"), "utf8");
  const publish = readFileSync(path.join(repoRoot, ".github", "workflows", "release-publish.yml"), "utf8");

  assert.match(verification, /api-contract\/\*/);
  assert.match(verification, /scripts\/api-contract\.mjs/);
  assert.match(verification, /run: pnpm release:consumer-smoke/);
  assert.match(publish, /run: pnpm api:check/);
  assert.match(publish, /run: pnpm compatibility:check/);
  assert.match(publish, /run: pnpm release:consumer-smoke/);
});

test("release gate fails closed when change detection or required jobs fail", () => {
  const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "release-verify.yml"), "utf8");
  const gate = workflow.split("      - name: Verify required release jobs\n")[1];
  assert.ok(gate, "release gate step must exist");
  const script = gate.split("        run: |\n")[1].replace(/^          /gm, "");
  const passing = {
    CHANGES_RESULT: "success",
    RELEASE_RELATED: "true",
    ARTIFACTS_RESULT: "success",
    BROWSER_RESULT: "success",
    COMPUTE_RESULT: "success",
    E2E_RESULT: "success",
  };
  const run = (overrides) => spawnSync("bash", ["-e", "-c", script], {
    env: { ...process.env, ...passing, ...overrides },
  }).status;

  assert.equal(run({}), 0);
  assert.equal(run({ RELEASE_RELATED: "false", ARTIFACTS_RESULT: "skipped", BROWSER_RESULT: "skipped", COMPUTE_RESULT: "skipped", E2E_RESULT: "skipped" }), 0);
  for (const CHANGES_RESULT of ["failure", "cancelled", "skipped", ""]) {
    assert.notEqual(run({ CHANGES_RESULT, RELEASE_RELATED: "false" }), 0);
  }
  for (const RELEASE_RELATED of ["", "unknown"]) {
    assert.notEqual(run({ RELEASE_RELATED }), 0);
  }
  for (const job of ["ARTIFACTS_RESULT", "BROWSER_RESULT", "COMPUTE_RESULT", "E2E_RESULT"]) {
    for (const result of ["failure", "cancelled", "skipped"]) {
      assert.notEqual(run({ [job]: result }), 0, `${job}=${result} must fail`);
    }
  }
});
