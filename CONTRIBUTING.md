# Contributing to Open Grid

Open Grid welcomes focused bug fixes, documentation improvements, performance
work, and features that fit the public roadmap.

## Before You Start

- Search existing issues and pull requests before opening a duplicate.
- Open an issue before making a large API, architecture, or behavior change.
- Do not include private datasets, credentials, generated benchmark output, or
  unrelated formatting changes.
- Report security vulnerabilities through the process in [SECURITY.md](SECURITY.md),
  not through a public issue.

## Local Development

Open Grid requires Node.js 22 or newer and pnpm 9.15, as declared by the root
workspace.

```bash
pnpm install
pnpm test
pnpm check
pnpm build
```

Run a maintained product example with:

```bash
pnpm dev:react
pnpm dev:vue
pnpm dev:svelte
```

The terminal prints the local URL. See [README.md](README.md) for server-side
examples and the complete validation commands.

## Pull Requests

- Keep one logical change per pull request.
- Add or update tests for behavior changes.
- Update the relevant README or `docs/` file when a public API, workflow, or
  performance contract changes.
- Add an entry under `Unreleased` in `CHANGELOG.md` for user-visible changes.
- Run `pnpm test && pnpm check` before requesting review.
- Make sure the general CI workflow passes. Changes to release or benchmark
  contracts also run the dedicated, parallel Release Verification jobs; general
  type, unit, example-build, and quick-smoke checks remain owned by CI. Use each
  workflow's `Required Gate` as the final result while retaining job-level failures
  for diagnosis.
- Include reproducible evidence for performance claims. Do not commit
  `.benchmark-results/` or `.release/` artifacts.

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
