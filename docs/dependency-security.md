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

## Maintenance review on 2026-10-22–23

The original main lockfile reported 58 advisory entries (6 critical, 22 high).
Dependency PR #39 reduced this to 31 (3 critical, 10 high). The follow-up updates
Vitest to 4.1.12, removes vulnerable Tinypool dependencies, and uses corrected
versions of esbuild, source-map-js, devalue, and cookie. VitePress 1.6.4 uses the
scoped `vitepress>vite` override to Vite 6.4.5; its Vue plugin accepts Vite 6.
Package builds, framework compatibility, documentation, and examples must be
validated when changing these tool overrides.

The Nuxt example uses 4.6.2, which fixes case-variant route-rule bypass
([GHSA-vjh5-4x84-xrqp](https://github.com/advisories/GHSA-vjh5-4x84-xrqp)) and
unsafe server-island head rendering
([GHSA-xfq5-w38q-pc2x](https://github.com/advisories/GHSA-xfq5-w38q-pc2x)).

The resulting raw audit on 2026-10-23 has 18 entries: 0 critical, 5 high, 12 moderate,
1 low. All remaining entries are visible in the checked-in policy and audit output:

- Sixteen entries occur only in the Svelte 4 / Vite 5 build-only compatibility
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

## Vite advisory review on 2026-10-23

Two newly indexed advisories affect only Vite 5.4.21 in `compatibility/svelte-4`:

- [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw)
  concerns development servers using custom middleware that passes unchanged
  request URLs to `transformIndexHtml`. This fixture does not use that setup.
- [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22)
  concerns development-server file serving when project import paths match host
  filesystem paths. A build does not exercise that request-serving path.

The fixture's Vite config now rejects all `serve` commands, including dev,
middleware-mode startup and preview. Regression tests exercise the actual pinned
Vite config loader and verify that builds remain allowed. The two exceptions are
limited to Vite 5.4.21 under this fixture and expire on 2026-11-22; tests verify
that the same advisory in a maintained example still fails the audit. The fixture
retains Vite 5 to verify the Svelte 4 lower bound. VitePress uses patched Vite 6.4.5
and maintained examples use patched Vite 8.3.4.

## Expanded 0.4 review on 2026-10-24

The final development audit identified three additional advisories. They are fixed
in maintained examples without adding audit exceptions:

- The private SvelteKit export app now uses Kit 3.1.0 and adapter-node 6.0.0 for
  [enhanced-form redirect](https://github.com/advisories/GHSA-pfhg-q3qv-9q6r)
  and [prerendered cache-control injection](https://github.com/advisories/GHSA-27mw-82g8-phjj)
  fixes. Following the [Kit 3 migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3),
  its adapter configuration moves to the Vite plugin, its tsconfig extends
  `$app/tsconfig`, and only this private example moves to TypeScript 6. It requires
  Node 22.17+. The old Kit 2 cookie override is removed so Kit 3 receives its
  required cookie 2.x API. Public grid framework peer ranges and the root TypeScript toolchain
  are unchanged.
- A version-scoped override upgrades serialize-javascript 7.x below 7.1.3 to 7.1.3
  for [serialized function-body escaping](https://github.com/advisories/GHSA-m5mm-p8h7-m29v).
  This removes the affected Nuxt build-tool dependency path.

The pre-existing dated compatibility/upstream exceptions remain visible in the
policy. A passing policy audit means no unreviewed blocked paths; it does not mean
the raw audit contains no advisories.

## Reporting

Report vulnerabilities through the private GitHub channel described in
[SECURITY.md](https://github.com/Goatshave/open-grid/blob/main/SECURITY.md).
Dependabot version updates run weekly and automatic security update PRs are enabled.
Compatibility fixture pins are excluded from automated updates because they define
the supported lower bounds; their advisory exceptions are reviewed explicitly.
