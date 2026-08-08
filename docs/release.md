# Release Readiness

This project uses the workspace package version as the release version for every publishable package under `packages/*`.

## Publishable Packages

The public package set is:

- `@open-grid/core`
- `@open-grid/react`
- `@open-grid/react-ui`
- `@open-grid/vue`
- `@open-grid/vue-ui`
- `@open-grid/svelte`
- `@open-grid/svelte-ui`
- `@open-grid/virtual`
- `@open-grid/primitives`
- `@open-grid/theme`

All 16 example packages under `examples/*`, including the runnable Next.js, Nuxt, and SvelteKit server-export apps, are intentionally private and are not part of the publish set.

## Release Plan

Use the local release plan command before a publish attempt:

```bash
pnpm release:plan
pnpm release:plan -- --version 0.1.0
pnpm release:plan -- --version 0.1.0 --json
pnpm release:plan -- --version 0.1.0 --markdown
```

`pnpm release:plan` reads the publishable package manifests, validates the release version, computes a dependency-aware publish order, and reports every internal `workspace:*` dependency range that must be rewritten to the release version before packages are published. Its prepublish gate list includes the GitHub push preflight, first-publish status summary, npm Trusted Publisher setup plan, first-publish preflight, manual UI smoke checklist, manual UI inspection report, quick UI smoke test, and full e2e suite so first-publish preparation keeps the public repository push, commercialization readiness summary, external npm configuration, and browser UI checks visible from the release plan output. When `--version` is supplied explicitly, it must include a non-empty value. Use `--markdown` when publish order, prepublish gates, workspace dependency rewrites, or planning failures need to be pasted into release approval notes or handoff docs as a checklist. Non-JSON planning failure output reports the requested release version, root workspace version, package count, publish order count, prepublish gate count, and workspace dependency rewrite count before the failure list.

## Release Stage

Use the local staging command before a publish attempt:

```bash
pnpm release:stage
pnpm release:stage -- --version 0.1.0
pnpm release:stage -- --version 0.1.0 --json
pnpm release:stage -- --version 0.1.0 --out-dir .release/0.1.0
pnpm release:stage -- --version 0.1.0 --out-dir .release/0.1.0 --repository-url git+https://github.com/OWNER/REPO.git
```

`pnpm release:stage` creates publish-ready package directories in a temporary workspace, copies each package's `dist`, `README.md`, and `LICENSE`, rewrites publishable package versions and internal `workspace:*` dependency ranges to the release version, runs `npm pack` for every publishable package, reads each tarball's `package/package.json`, and verifies that no `workspace:` dependency range remains in the packed artifact. Staging fails before packing when either required metadata file is missing, and the final tarball boundary must contain `package.json`, `README.md`, `LICENSE`, and only exported `dist` artifacts. Passing `--repository-url` also injects publish metadata as `{ type: "git", url, directory }` so each tarball points back to the public monorepo and its package directory. Explicit `--version` and `--repository-url` flags must include non-empty values before staging validation runs. Without `--out-dir`, staged tarballs are removed after validation. With `--out-dir`, an explicit non-empty directory value is required and the output directory must be empty or absent; validation stops before any package is packed so existing artifacts are not overwritten. With `--json`, validation failures are reported in the JSON `failures` field so CI can parse stage blockers without scraping stderr. Non-JSON validation failure output reports the release version, repository URL when supplied, output directory, and package count before the failure list.

## Publish Dry Run

Use the local publish dry-run command after packages have been built:

```bash
pnpm release:publish-dry-run
pnpm release:publish-dry-run -- --version 0.1.0
pnpm release:publish-dry-run -- --version 0.1.0 --tag next
pnpm release:publish-dry-run -- --version 0.1.0 --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:publish-dry-run -- --version 0.1.0 --json
pnpm release:publish-dry-run -- --version 0.1.0 --repository-url git+https://github.com/OWNER/REPO.git --markdown
```

`pnpm release:publish-dry-run` validates the resolved release version and npm dist-tag before running child release gates, creates publish-ready staged tarballs, reads the dependency-aware publish order from `pnpm release:plan`, and runs `npm publish --dry-run --access public` for every tarball in that order. Passing `--repository-url` stages tarballs with public repository metadata and verifies that every packed manifest has the matching repository URL and package directory before the npm dry-run command executes. Passing `--out-dir` reuses or writes a persistent staged tarball directory, and explicit `--out-dir` values must be non-empty before release gates run. When release planning or staging validation fails under `--json`, the dry-run output preserves the child `failures` entries and stops before later release gates or npm dry-run commands run, so CI can report the original blocker. Use `--markdown` when the final dry-run publish order, exact npm dry-run commands, or preserved failures need to be pasted into release approval notes. The guarded `pnpm release:publish -- --dry-run --json` entrypoint preserves release-plan and release-stage failures the same way before staging, reading tarballs, or running npm dry-runs. Non-JSON failure output reports the release version, npm tag, repository URL when supplied, output directory, and provenance flag before the failure list. It does not publish to npm. Use this gate to verify the final publish command shape before approving a release candidate.

## Actual Publish

Use the guarded publish command only from the protected release workflow:

```bash
pnpm release:publish -- --version 0.1.0 --dry-run
pnpm release:publish -- --version 0.1.0 --tag latest --out-dir .release/0.1.0 --repository-url git+https://github.com/OWNER/REPO.git --provenance --confirm publish-open-grid
```

`pnpm release:publish` validates the resolved release version and npm dist-tag, then defaults to dry-run mode unless the exact confirmation phrase `publish-open-grid` is supplied. Explicit `--confirm` and `--out-dir` flags must include non-empty values before release gates run. In dry-run mode it creates or reuses staged tarballs, follows the dependency-aware publish order, and runs `npm publish --dry-run --access public`. If `--repository-url` is supplied, dry-run mode also verifies that each packed package manifest has matching repository URL and package-directory metadata, then reports the verified repository URL in JSON, success text, and failure text output. Non-JSON failure output reports the release version, npm tag, repository URL when supplied, output directory, dry-run mode, and provenance flag before the failure list. In actual publish mode it requires both `--repository-url` and `--provenance`, refuses to continue if any packed package manifest is missing repository metadata or mismatches the supplied repository URL, then publishes the tarballs with `npm publish --access public --provenance` in publish order.

For actual npm publishing, use GitHub Actions trusted publishing with OIDC rather than a long-lived npm token. Configure each publishable package on npm with the trusted publisher workflow filename `release-publish.yml`, the protected environment `npm`, and the allowed action `npm publish`. The workflow must run on a GitHub-hosted runner with `id-token: write`. Provenance publishing also requires the workflow `repository_url` input to match the public source repository.

## Trusted Publishing Plan

Use the trusted publishing plan command before configuring npm package settings:

```bash
pnpm release:trusted-publishing -- --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:trusted-publishing -- --version 0.1.0 --tag next --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:trusted-publishing -- --repository-url git+https://github.com/OWNER/REPO.git --json
pnpm release:trusted-publishing -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git --markdown
```

`pnpm release:trusted-publishing` parses the public GitHub repository URL, validates the resolved release version and npm dist-tag, rejects placeholder owner/repo values, checks that `.github/workflows/release-publish.yml` has the required OIDC permission, protected `npm` environment, required `version`, `npm_tag`, `repository_url`, and `confirm_publish` inputs, release version validation, npm dist-tag validation, npm 11 installation, guarded `publish-open-grid` confirmation, a JSON-mode release readiness check, a trusted-publishing preflight call that passes the resolved workflow `version`, `npm_tag`, and `repository_url` values, repository-verified publish dry-run, quick UI smoke testing before the full e2e suite, repository-verified actual publish command, provenance publish flag, and publish command, then prints the npm Trusted Publisher settings for every publishable package. It also prints the GitHub `npm` environment that must protect the publish job and the Release Publish workflow inputs to use for the first publish, including `version`, `repository_url`, `npm_tag`, and `confirm_publish`. `--version` defaults to the current workspace version and `--tag` defaults to `latest`; the resolved version is validated either way. The Trusted Publisher setup fields default to workflow filename `release-publish.yml`, environment `npm`, and allowed action `npm publish`; if `--workflow`, `--environment`, or `--allowed-action` is supplied explicitly, it must include a non-empty value before the workflow-shape checks run. Without `--json`, workflow-shape failure output still prints the repository URL, workflow filename, environment, allowed action, and Release Publish workflow input bundle before listing failures. Use `--markdown` when configuring npm package pages so the GitHub environment, Release Publish inputs, and per-package Trusted Publisher settings are available as a checkbox handoff. Pass explicit values when preparing a non-default first publish so this output matches the Release Publish workflow inputs exactly. Use the output to configure each package on npm with provider `GitHub Actions`, the canonical GitHub organization/user and repository, workflow filename `release-publish.yml`, environment `npm`, and allowed action `npm publish`.

The root `pnpm test` command also runs `pnpm test:release`, which exercises the trusted publishing preflight against fixture workflows. The release tests verify that a guarded publish workflow produces package Trusted Publisher settings, that explicit Trusted Publisher setup overrides require values, and that missing npm dist-tag validation, confirmation, npm 11, JSON release readiness checks, provenance, confirm flags, or final publish repository URL fail before release-related pull requests merge.

## GitHub Push Preflight

Use the GitHub push preflight before the first real publish, after the release branch has been committed locally and before configuring npm Trusted Publisher settings:

```bash
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --json
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth --markdown
pnpm release:github-push-preflight -- --remote origin --branch main --repository-url git+https://github.com/OWNER/REPO.git
```

`pnpm release:github-push-preflight` does not push to GitHub. It verifies that the current directory is a git worktree, resolves the release branch, checks that the configured remote matches the canonical public GitHub repository URL, reports the matched remote transport as `ssh`, `https`, or `unknown`, requires a clean working tree, compares the branch with its remote tracking ref, reports ahead/behind counts, prints the exact `git push -u <remote> <branch>` command, emits `nextVerificationCommands` for the push and follow-up status/preflight/trusted-publishing checks, and returns structured JSON when requested. Pass `--check-auth` when the remote uses `git@github.com:<owner>/<repo>.git`; the preflight then runs `ssh-add -l` to report loaded SSH identity fingerprints, scans public key files under `~/.ssh` with `ssh-keygen -lf` to report public-key candidates, reports the paired private-key `ssh-add <path>` load command when a matching non-`.pub` file exists next to the public key, exposes those commands as the top-level `sshKeyLoadCommands` array, exposes `sshPublicKeyReviewCommands` as safe `cat <public-key>.pub` commands for copying the public key into GitHub, exposes `githubSshKeySettingsUrl` (`https://github.com/settings/keys`) and `githubSshDocsUrl` for account-side key registration, runs `ssh -o BatchMode=yes -T git@github.com`, treats GitHub's successful-authentication/no-shell message as auth-ready, and fails early when no GitHub SSH key is available. SSH-auth failures print loaded-key, public-key candidate, paired private-key load, public-key review, or agent-unavailable diagnostics, key-loading/account-key setup guidance, the direct GitHub SSH auth command to rerun, GitHub's SSH key settings URL, GitHub's SSH setup docs URL, and prepend the relevant `ssh-add` plus SSH auth retry commands to `nextVerificationCommands` before the push and npm setup rerun commands. Use `--markdown` when push readiness, failures, remote transport, SSH agent diagnostics, public-key candidates, explicit SSH key load commands, public-key review commands, GitHub SSH setup links, external actions, and next verification commands need to be pasted into an issue, release note, or handoff. Protected branch settings and repository write permissions are still external actions that only the actual `git push` can prove. After this preflight passes, continue with `pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth` so local push readiness and first-publish readiness stay summarized before npm Trusted Publisher settings are configured.

## First Publish Status

Use the first-publish status command when you need one local summary of commercialization readiness before the first public release:

```bash
pnpm release:first-publish-status -- --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:first-publish-status -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:first-publish-next-step -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:first-publish-status -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git --json
pnpm release:first-publish-status -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git --check-auth --markdown
```

`pnpm release:first-publish-status` runs the GitHub push preflight and first-publish preflight in JSON mode, then reports `githubPushSkipped`, `verificationReady`, `localReady`, `externalReady`, `ready`, `commercializationStatus`, `commercializationProgress`, `commercializationNextStep`, `trustedPublisherSetup`, `releasePublishWorkflowRun`, `externalSetupVerification`, any local blockers, `manualUiSmokeTargets`, the remaining external actions, and `nextVerificationCommands` to rerun after external GitHub/npm setup. It never pushes or publishes. Add `--next-step` or run the `pnpm release:first-publish-next-step` alias to print only the next incomplete commercialization stage, and add `--json` to emit just that stage for automation, including `completedStages`, `remainingStageCount`, `totalStages`, and `percent` so the compact output still states how much commercialization work remains. `commercializationProgress` tracks four stages: local first-publish gates, GitHub push readiness, external GitHub `npm` environment plus npm Trusted Publisher setup, and the manual `release-publish.yml` workflow run. It also exposes `currentStageId`, `nextRequiredActions`, `nextVerificationCommands`, `remainingStageCount`, and `remainingStages` with each stage's `requiredActions` and `verificationCommands`; `commercializationNextStep` lifts the first incomplete stage plus the same progress summary to the top level so release notes can state exactly how much commercialization work remains, what has to happen next, and which command proves the next stage without recalculating from the stage list. When the current stage is external GitHub/npm setup, its required actions include the GitHub environment settings URL, the Trusted Publisher package count, and the first npm package access URL to start from, and the deduplicated `remainingExternalActions` list uses the same detailed actions instead of the older generic setup placeholders. `trustedPublisherSetup` lifts the nested trusted-publishing GitHub environment, GitHub environment settings URL, Release Publish workflow inputs, package count, and per-package npm Trusted Publisher settings to the top-level status JSON; each package entry also includes the npm package URL and npm access-page URL for Trusted Publisher setup. Text output prints the environment, package count, and workflow name as a short setup summary. `releasePublishWorkflowRun` lifts the final manual workflow file, GitHub Actions URL, optional `gh workflow run` command, dispatch inputs, instruction, and workflow UI/e2e gates to the top-level status JSON; text output prints the workflow path, GitHub Actions URL, dispatch command, and confirmation input, while Markdown prints a dedicated protected workflow run checklist. `externalSetupVerification` pairs the rerun command list with success criteria to check after the GitHub push, protected GitHub environment, npm Trusted Publisher settings, and manual workflow setup are complete. `localReady: true` means the local release branch and release gates are ready; `externalReady` intentionally stays `false` because npm Trusted Publisher settings, the protected GitHub `npm` environment, repository visibility/permissions, and the manual Release Publish workflow run must be completed outside the local workspace. Use `--check-auth` to include the GitHub SSH BatchMode auth check in the local readiness summary; when SSH auth is blocked, the status command prepends the nested push preflight's `sshKeyLoadCommands` and SSH auth retry command to its own `nextVerificationCommands` before the release rerun commands. Text and Markdown output both print the React/Vue/Svelte manual UI smoke targets from first-publish preflight with each target's direct `pnpm preview:smoke-ui -- --framework <name> --open` command and default open wait timeout, so release approval can move from notes to the actual browser UI without rediscovering commands. Use `--markdown` when you need a checkbox report for release notes, PRs, or handoff docs; it also prints readiness, commercialization progress, local blockers, GitHub push SSH diagnostics, GitHub SSH key settings and setup docs links, loaded-key fingerprints, public-key candidates, public-key review commands, the trusted-publishing setup summary with GitHub environment settings and npm access-page URLs, the protected Release Publish workflow run checklist, the embedded UI checklist, deduplicated remaining external actions, next verification commands, and external setup verification success criteria in one checklist. Those next commands include `pnpm preview:smoke-ui -- --markdown` for copyable notes, `pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md` for recording actual manual inspection evidence, and `pnpm preview:smoke-ui -- --open` for opening the React/Vue/Svelte UI targets locally. Release Verification uses `--skip-github-push` only with a synthetic repository URL so CI can verify the first-publish status and first-publish preflight contract without pretending a detached CI checkout proves real push readiness; do not use that skip mode for the final local first-publish readiness decision.
When debugging SSH from a non-standard environment, `--ssh-command`, `--ssh-add-command`, `--ssh-dir`, and `--ssh-keygen-command` are forwarded to the nested GitHub push preflight so the status summary reports the same loaded-key diagnostics, public-key candidates, and explicit `sshKeyLoadCommands` as `pnpm release:github-push-preflight -- --check-auth`.

## First Publish Preflight

Use the first-publish preflight after packages have been built and after the canonical public repository URL is known:

```bash
pnpm release:first-publish-preflight -- --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:first-publish-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --json
pnpm release:first-publish-preflight -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:first-publish-preflight -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git --markdown
```

`pnpm release:first-publish-preflight` validates the resolved release version and npm dist-tag, then runs the trusted-publishing plan with the same `version`, `repository_url`, and `npm_tag` values, release policy, release readiness check in JSON mode, release plan, repository-metadata staging, and repository-verified publish dry-run in order. It stages temporary tarballs with `repository.url` and `repository.directory`, verifies the final `npm publish --dry-run --access public` command sequence from those tarballs, then reports the remaining external actions: create or confirm the protected GitHub `npm` environment, configure npm Trusted Publisher settings for every publishable package, and manually run `.github/workflows/release-publish.yml` with the generated `version`, `repository_url`, `npm_tag`, `confirm_publish`, and completed `ui_smoke_report` inputs.

The preflight reports the Release Publish workflow UI gates for the manual checklist, Markdown notes, structured JSON report generation, browser-open inspection, structured report validation, quick UI smoke, and full e2e. Its `nextVerificationCommands` preserve the same order for the final local checks to rerun after external setup. Text, Markdown, and JSON output include the React/Vue/Svelte manual smoke targets with URL, build, preview, direct open command, default open wait timeout, smoke assertions, and manual checks. When `--out-dir` is supplied for persistent staged tarball inspection, it must include a non-empty directory value before the preflight runs child release gates. With `--json`, the workflow input bundle is available as `releaseWorkflowInputs`, the UI gate list as `releaseWorkflowGates`, the manual smoke targets as `manualUiSmokeTargets`, and the rerun command list as `nextVerificationCommands`. Use `--markdown` for a copyable verification report with verified steps, failures, Release Publish inputs, UI gates, the manual UI smoke checklist, remaining external actions, and next verification commands. Failed child steps that return JSON preserve their original failure details. Text failures still include workflow inputs, UI gates, targets, and next commands before the failures. The command never publishes packages.

## Release Policy

Use the local policy command before a release candidate is tagged:

```bash
pnpm release:policy
pnpm release:policy -- --version 0.1.0 --tag open-grid-v0.1.0
pnpm release:policy -- --version 0.1.0 --tag open-grid-v0.1.0 --json
```

`pnpm release:policy` verifies that the release version is valid semver, the release tag follows `open-grid-v<version>`, every publishable package stays aligned to the root workspace version, and `CHANGELOG.md` contains a dated `## <version> - YYYY-MM-DD` section with release notes. Explicit `--version` and `--tag` flags must include non-empty values before policy checks run. Non-JSON policy failure output reports the release version, supplied tag, expected tag, changelog date when present, and package count before the failure list.

Future release versions must have their changelog section written before this command passes, and explicit `--version` or `--tag` flags must include values.

## Release Verification Workflow

The GitHub Actions workflow at `.github/workflows/release-verify.yml` runs release-only gates in CI without publishing packages. It starts for every pull request so its aggregate status can be required safely, then a native Git diff step checks whether the pull request touches the changelog, TypeScript configuration, packages, examples, e2e tests, release scripts, release documentation, Playwright configuration, benchmarks, workspace manifests, or either release workflow. Relevant changes run the verification flow against the workspace version; unrelated changes skip the expensive jobs and pass the aggregate gate immediately. General CI owns type checks, unit and release contract tests, example and documentation builds, publishable-boundary checks, and the quick React/Vue/Svelte smoke suite. Release Verification avoids repeating those checks and runs four independent jobs in parallel: release policy, readiness, planning, staging, publish dry-run, and tarball upload; Open Grid bundle, DOM structure, and framework heap budgets; massive core and browser-backed server budgets; and the full non-smoke E2E suite. A final `Release Gate` job fails unless all four relevant jobs succeed, so the PR check list retains detailed failures while exposing one stable aggregate release result. Superseded runs on the same ref are cancelled. Manual `workflow_dispatch` runs always execute the full suite and accept a semver `version` input, while pull requests use the workspace version. The release-artifact job uses a synthetic non-placeholder GitHub URL for Trusted Publisher and first-publish status validation, uploads the staged tarballs for inspection, and never treats a detached CI checkout as proof of real push readiness. Configure both `CI / Required Gate` and `Release Verification / Release Gate` as repository-wide required status checks.

## Release Publish Workflow

The GitHub Actions workflow at `.github/workflows/release-publish.yml` is a manual publish workflow. It requires and validates a semver `version`, validates the npm dist-tag, requires the public git `repository_url`, requires the exact confirmation input `publish-open-grid`, and requires the completed source-bound JSON report as `ui_smoke_report`; uses the protected `npm` environment; grants `id-token: write` for npm trusted publishing; installs npm CLI 11; materializes and validates the report without the development-only dirty-tree override; reruns the full release gates with the release readiness check in JSON mode; stages tarballs with the supplied repository URL; runs a repository-verified publish dry-run against those staged tarballs; runs `pnpm e2e:smoke` before the full e2e suite; and only then calls `pnpm release:publish -- --out-dir .release/<version> --repository-url <repository_url> --provenance --confirm publish-open-grid`.

After completing the report on the clean reviewed revision, supply the file contents through GitHub CLI:

```bash
gh workflow run release-publish.yml --repo OWNER/REPO -f version=0.1.0 -f repository_url=git+https://github.com/OWNER/REPO.git -f npm_tag=latest -f confirm_publish=publish-open-grid -F ui_smoke_report=@.release/ui-smoke-report.json
```

The workflow runs `pnpm release:trusted-publishing -- --version <version> --tag <npm_tag> --repository-url <repository_url> --json` as a preflight, but it cannot inspect npm-side package settings. It is not ready to publish until the public repository URL is known and the npm package settings have trusted publishing configured for `release-publish.yml`.

## Release Gates

Run the gates from the workspace root:

```bash
pnpm check
pnpm test
pnpm build
pnpm build:examples
pnpm test:release
pnpm release:policy
pnpm release:check
pnpm release:stage
pnpm release:publish-dry-run
pnpm release:github-push-preflight -- --repository-url <public-git-url>
pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth
pnpm release:first-publish-preflight -- --repository-url <public-git-url>
pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json
pnpm review:smoke-ui
pnpm release:ui-smoke-report-check
pnpm e2e:smoke
pnpm preview:smoke-ui -- --json
pnpm e2e
```

`pnpm release:check` should run after `pnpm build` because it verifies the workspace release environment, package manifests, built `dist` directories, npm package README and LICENSE files, and npm pack dry-run output. It checks that the workspace root stays private, pins `packageManager` to `pnpm@9.15.0`, declares `engines.node` as `>=22.0.0` to match the GitHub release workflows, and that publishable packages have aligned versions, descriptions, npm keywords for `data-grid`, `grid`, and `table`, package-specific GitHub Pages `homepage` links, public `bugs.url` links, `publishConfig.access: "public"`, MIT license metadata, ESM package type, explicit exports with `.d.ts` `types` conditions for JS exports, `files: ["dist", "LICENSE"]`, explicit `sideEffects`, required scripts, package-level `README.md` and `LICENSE` files, and existing build output. Every package README must identify its exact package name in the title and include an `npm install <package-name>` command so the npm page has a valid entry point. The check also runs `npm pack --dry-run --json` for every publishable package, checks that the dry-run artifact includes `package.json`, `LICENSE`, and `README.md`, includes only `dist/*`, `LICENSE`, `README.md`, and `package.json` package files, and contains every file referenced by the package `exports` map. It also checks that example packages remain private and buildable. Non-JSON readiness failure output reports the root workspace version, root package manager, root Node engine, publishable package count, example package count, and completed npm pack dry-run count before the failure list. With `--json`, the same readiness context is returned as `rootVersion`, `rootPackageManager`, `rootNodeEngine`, `publishablePackageCount`, `examplePackageCount`, and `packDryRunCount` alongside any `failures`.

The full Playwright configuration uses ports 4173-4187 by default, and automated UI smoke uses 4193-4195. For local verification only, `OPEN_GRID_E2E_PORT_OFFSET=<non-negative integer> pnpm e2e` moves every full-suite server, `baseURL`, and explicit framework test URL by the same amount; the same variable with `pnpm e2e:smoke` moves only the automated smoke servers and test URLs. This lets automated smoke run while the canonical manual preview remains active on 4193-4195. Invalid values and offsets that move the highest configured test port above 65535 fail before servers start. Manual preview/report targets and the canonical release workflow remain unchanged because those paths leave the variable unset.

`pnpm preview:smoke-ui` starts the same React, Vue, and Svelte preview targets used by `pnpm e2e:smoke` for manual browser inspection. Add `--open` to wait for the preview servers and open all three stable URLs, or use `--framework React|Vue|Svelte` while iterating. The preview command, Playwright smoke servers, and smoke specs share `scripts/ui-smoke-targets.mjs`, so preview URLs, commands, assertions, state checks, connected product-workflow inputs, header-control policy, and manual checks cannot drift. The first-publish header contract hides repeated direct pin-button groups while retaining each leaf header's action menu; renderer-level direct controls remain covered in the React, Vue, and Svelte server-side examples. The automated workflow searches, commits a valid async edit, sorts the edited column, persists a product-managed column choice across reload, proves sorting/edit data remain transient, and resets preferences. Manual evidence also requires column management to start collapsed, open from `Manage columns`, and report the expected visible count; the 390px regression requires the grid in the first viewport and prevents document overflow when that panel opens. `--list`, `--markdown`, and `--json` expose that contract without starting servers. `--report` creates the manual inspection form; Markdown and JSON reports include the Git revision, workspace version, relevant source file count, dirty state, SHA-256 source fingerprint from `scripts/ui-smoke-source-state.mjs`, and exact workflow contract. Persist human notes at `.release/ui-smoke-report.md` and the approval artifact at `.release/ui-smoke-report.json`. Generate the approval artifact only after the final source commit, because `pnpm release:ui-smoke-report-check` requires an exact clean source match by default. Run `pnpm review:smoke-ui` while inspecting the real targets to record environment, target, functional, and accessibility evidence without hand-editing JSON; the command validates source and target identity before prompting and saves after every item. `.release/` remains ignored local evidence. The shared Release Publish UI command sequence lives in `scripts/release-ui-gates.mjs`.

## Prepublish Notes

The manual report now contains 21 functional checks, including visible text plus distinct semantic status/risk markers. A report generated before that marker contract changed is rejected as stale. Automated shell smoke also requires the contracted marker classes and visible values, 7px dimensions, and distinct computed cues in light and dark themes. A 2026-07-20 hands-on pass completed all 21 functional checks across React, Vue, and Svelte, including real Chromium CSV downloads and the connected preference-reload workflow. The same review completed the six keyboard and zoom/reflow checks after resolving its findings. This intermediate result is not release approval: rebind the observations to the final clean revision and complete the six screen-reader and platform high-contrast checks before running the report checker.

The manual inspection report separates functional checks from accessibility checks. Record the reviewer, local-calendar `YYYY-MM-DD` date, OS, browser, exact browser zoom `200%`, exact viewport `390 CSS px`, screen reader, forced-colors/high-contrast setup, and `pass` plus non-empty evidence for every target and check. The guided command accepts `pass`/`p`, `follow-up`/`f`, and `todo`/`t`, requires evidence for pass or follow-up, clears stale evidence when an item returns to todo, supports `--framework`, `--file`, and read-only `--status [--json]`, and writes through an atomic temporary file so interruption leaves the last completed item resumable. Status lists each non-passing check, canonical target URL, and framework resume command; JSON exposes structured `pendingChecks`, and framework-scoped status narrows progress without treating partial completion as whole-report approval. It does not infer or bulk-approve results. `pnpm release:ui-smoke-report-check` requires all current React/Vue/Svelte targets, those exact display settings, the exact generated source identity, a clean relevant source tree, and a review date no more than seven days old. It rejects future dates and source, URL, smoke-contract, check-text, zoom, or viewport drift. It also reserves a 60,000-character and 60,000-byte encoded report budget below GitHub's 65,535-character workflow-dispatch input limit. In Release Publish, `--version`, `--tag`, and `--repository-url` are supplied together so the checker measures the exact complete input object and rejects either character or UTF-8 byte overflow before browser or publish work starts. Use `--max-age-days <days>` to make the freshness policy stricter. `--allow-dirty` is for development-time review/checker tests only and must not be used for release approval. First-publish plan/preflight/status output carries template generation, guided review, and validation commands in order. An unfilled, oversized, source-stale, or display-setting-stale template is not release evidence. See GitHub's [workflow dispatch input limits](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs) and [`gh workflow run -F` file input](https://cli.github.com/manual/gh_workflow_run).

`pnpm e2e:smoke` first rebuilds all public packages so browser evidence cannot use stale shared primitives. It then runs Chromium accessibility-tree checks for the product-specific grid name, primary header, focused-cell value, and logical row/column count attributes; `@axe-core/playwright` WCAG A/AA scans; an actual CSV download with a non-empty Open Grid filename; a product-header policy check that direct pinning groups are absent while the action menu remains visible; contrast-aware light/dark product-token inheritance checks for accent, focus, and radius values on the semantic grid; keyboard-only toolbar focus order, Tab entry into the grid root, header-menu open/close and trigger-focus return, grid movement, and edit-cancel cell-focus return with computed two-pixel visible-focus indicators; 390px document-reflow, expanded column-manager command-boundary, and internal-grid-scroll assertions; a dedicated 640x450 CSS pixel/DPR 2 context that approximates 200% reflow and verifies initial grid visibility, product-control boundaries and non-overlap, column-panel expansion, and internal horizontal scrolling; and forced-colors focus, selection, disabled-control, loading, error, retry, and invalid-edit checks against the React, Vue, and Svelte reference pages. The product-header policy, product-theme token map, zoom-equivalent viewport, state, and accessibility-tree target contract are included in preview, report, preflight, and status metadata, and reduced motion must stop spinner animation. A 2026-07-20 hands-on pass separately verified Chrome's actual 200% host zoom, 390 CSS pixel layout, and keyboard-only workflow for every renderer. Release approval still requires actual screen-reader and platform high-contrast evidence.

- Keep `examples/*` private.
- Keep package versions aligned with the root workspace version.
- Keep internal workspace dependencies as `workspace:*` until the publish tool rewrites them for the published artifacts.
- Use `pnpm release:policy -- --version <version> --tag open-grid-v<version>` to require a matching changelog entry and tag name before release approval.
- Use `pnpm release:plan -- --version <version>` to review the publish order and internal dependency rewrites before tagging or publishing.
- Use `pnpm release:stage -- --version <version>` to verify publish-ready tarballs with rewritten internal dependency ranges before publishing.
- Use `pnpm release:publish-dry-run -- --version <version>` to verify the final `npm publish --dry-run --access public` command sequence before approval; add `--markdown` when the dry-run command list needs to be pasted into release notes.
- Use `pnpm release:github-push-preflight -- --repository-url <public-git-url>` to verify the local release branch, remote URL, clean worktree, and ahead/behind counts before pushing to GitHub; add `--check-auth --markdown` when SSH diagnostics and next actions need to be shared.
- Use `pnpm release:first-publish-status -- --repository-url <public-git-url> --check-auth` to summarize local readiness, external publish blockers, and the remaining commercialization actions without pushing or publishing.
- Use `pnpm release:first-publish-preflight -- --repository-url <public-git-url>` to run the trusted-publishing, policy, check, plan, repository staging, and repository-verified publish dry-run gates together before the first actual publish.
- Use the Release Verification workflow before a release candidate is approved; it does not publish to npm.
- Supply the public git repository URL when staging or publishing provenance-enabled tarballs so packed manifests include matching `repository.url` and `repository.directory` metadata.
- Keep `--provenance` on every actual `pnpm release:publish` invocation; the command refuses actual publish mode without it.
- Use `pnpm release:trusted-publishing -- --repository-url <public-git-url>` to generate and validate the npm Trusted Publisher settings for every publishable package.
- Configure npm trusted publishing for each publishable package before the first real publish, then use the protected Release Publish workflow with OIDC `id-token: write` instead of a long-lived npm token.
- Do not publish `examples/shared-server` or the Next.js/Nuxt/SvelteKit server-export apps; they are private framework integration, recipe, and browser-test workspaces.
- Treat `npm pack --dry-run --json` failures as release blockers; they mean the published artifact would be incomplete or would include unintended source files.
- Update `CHANGELOG.md` and the public roadmap when a full gate run changes release readiness or future work.
