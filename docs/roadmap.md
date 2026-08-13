# Roadmap

Open Grid is an MIT-licensed, multi-framework data grid foundation. The roadmap is
organized around public API quality, renderer consistency, accessibility, performance
regression safety, and dependable releases.

## 0.1.0 Release

- [x] Framework-agnostic core with React, Vue, and Svelte adapters.
- [x] Maintained styled UI packages and unstyled primitive contracts.
- [x] Sorting, filtering, grouping, tree data, selection, editing, clipboard, export,
  pagination, column management, and row/column virtualization.
- [x] Server-side, grouping, tree, and export examples.
- [x] Package metadata, npm pack validation, release planning, dry-run, and guarded
  publish workflows.
- [x] Public README, documentation site, contribution guide, conduct policy, security
  policy, issue templates, and pull-request template.
- [x] Required aggregate CI and release gates with expensive release work skipped for
  unrelated changes.
- [x] Open Grid-owned bundle, DOM, heap, core-scale, server, browser behavior, and
  accessibility regression coverage.
- [x] Complete the first npm publication and continuously verify package installation,
  ESM imports, TypeScript use, and a Svelte build from a clean external project.
- [x] Complete the first GitHub Pages deployment from `main`.

## Release-quality hardening

- [x] Publish the pre-1.0 compatibility and deprecation policy and check generated
  declaration contracts in CI.
- [x] Separate required package-owned bundle budgets from diagnostic framework app
  bundle measurements.
- [x] Install staged tarballs into a temporary external project before release and
  verify imports, types, and framework compilation.
- [x] Keep React 18/19, Vue 3.4+, and Svelte 4.2.20/5 compatibility checks explicit.
- [x] Add direct React adapter and Vue UI rendering tests instead of allowing empty
  package test suites.

## 0.2.0 Direction

- [x] Define instance-scoped localization contracts for built-in labels, status text,
  controls, and accessibility labels across React, Vue, Svelte, and primitives.
- Expand typed custom renderer parity across React, Vue, and Svelte.
- Add product toolbar and loading, error, and empty-state composition points without
  coupling product UI to the grid core.
- Version persisted preference migrations and document upgrade behavior.
- Expand task-oriented API reference and integration examples from user reports.
- Continue keyboard, screen-reader, forced-colors, mobile reflow, server-data, and
  export improvements where real integration evidence identifies a gap.

## Performance Direction

Release decisions use only Open Grid-owned measurements. Deterministic bundle, DOM,
heap, core, server, and cross-framework behavior gates remain mandatory. Longer
browser timing matrices are diagnostic until a stable source-bound baseline policy is
accepted. See [Performance Policy](performance.md).

Any future external comparison belongs in an independent benchmark project so this
repository, its dependency graph, and its release health remain focused on Open Grid.
