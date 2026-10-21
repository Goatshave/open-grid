# Dependency security

Run `pnpm security:audit` after dependency changes. CI runs the same command before
typechecking, and Release Publish runs it before release verification. A registry
error, malformed response, expired exception, or unreviewed advisory at any severity
fails the check. `pnpm audit --json` remains available for the complete raw report.

The checker reads `security/audit-exceptions.json`. Each exception names one GHSA,
package, exact installed version, dependency-path prefix, reason, and expiry date.
The same advisory in another dependency path still fails. Exceptions must be
reviewed before 2026-11-22; a new advisory or changed version requires a fresh review.
Do not add repository-wide advisory ignores or disable the check to pass CI.

## Maintenance review on 2026-10-22

The original main lockfile reported 58 advisory entries (6 critical, 22 high).
Dependency PR #39 reduced this to 31 (3 critical, 10 high). The follow-up updates
Vitest to 4.1.12, removes vulnerable Tinypool dependencies, and uses corrected
versions of esbuild, source-map-js, devalue, and cookie. VitePress 1.6.4 uses the
scoped `vitepress>vite` override to Vite 6.4.5; its Vue plugin accepts Vite 6.
Package builds, framework compatibility, documentation, and examples must be
validated when changing these tool overrides.

The resulting raw audit has 16 entries: 0 critical, 5 high, 11 moderate. All remaining
entries are visible in the checked-in policy and the audit command output:

- Fourteen entries occur only in the Svelte 4 / Vite 5 build-only compatibility
  fixture or the Vue 3.4 typecheck-only fixture. These intentionally retain the
  documented framework lower bounds. They must not be used as deployment examples
  or exposed as development/SSR servers. Maintained examples use current runtimes.
- Two entries affect `node-forge` 1.4.0 and `braces` 3.0.3 beneath the Nuxt example's
  Nitro tooling. Neither has a patched upstream release at the review date.
  `node-forge` is used by listhen's local HTTPS certificate tooling; the maintained
  example starts local HTTP on 127.0.0.1 and uses the generated Nitro server in
  production. Glob patterns passed to the build tooling are repository-owned;
  request input must not be passed to glob expansion. Reassess these exceptions
  before enabling local HTTPS or accepting external glob patterns, and remove them
  when upstream fixes become available.

These exceptions document accepted scope; they do not mean the dependencies are
fixed. New usage outside the reviewed paths is blocked even for the same GHSA.

## Reporting

Report vulnerabilities through the private GitHub channel described in
[SECURITY.md](https://github.com/Goatshave/open-grid/blob/main/SECURITY.md).
Dependabot version updates run weekly and automatic security update PRs are enabled.
Compatibility fixture pins are excluded from automated updates because they define
the supported lower bounds; their advisory exceptions are reviewed explicitly.
