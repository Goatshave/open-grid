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
- [ ] Complete the first npm publication and verify package installation from a clean
  external consumer project.
- [ ] Complete the first GitHub Pages deployment from `main`.

## After 0.1.0

- Stabilize API compatibility guarantees and publish an explicit deprecation policy.
- Expand keyboard, screen-reader, forced-colors, and mobile reflow coverage from real
  contributor and user reports.
- Improve server-data adapters, streaming export ergonomics, and framework deployment
  recipes.
- Add focused performance profiles when product behavior requires them, using Open
  Grid baselines and reviewed absolute limits.
- Improve contributor onboarding, issue triage, release notes, and automated package
  provenance.

## Performance Direction

Release decisions use only Open Grid-owned measurements. Deterministic bundle, DOM,
heap, core, server, and cross-framework behavior gates remain mandatory. Longer
browser timing matrices are diagnostic until a stable source-bound baseline policy is
accepted. See [Performance Policy](performance.md).

Any future external comparison belongs in an independent benchmark project so this
repository, its dependency graph, and its release health remain focused on Open Grid.
