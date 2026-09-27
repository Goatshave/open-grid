# API stability

Open Grid is currently pre-1.0. Public APIs can evolve, but published applications
must not be surprised by unreviewed declaration changes.

## Public surface

The public surface is the set of entry points declared by each package's `exports`
map. Source files, benchmark helpers, examples, and paths not present in an exports
map are internal and may change without a compatibility notice.

`pnpm api:check` compares every package export with `api-contract/exports.json` and
the built declarations for every typed entry point with the reviewed declaration
files in `api-contract/`. Removed exports, including CSS entry points, and stale
declaration snapshots fail the check. An intentional public change requires
`pnpm api:update`, tests for the new behavior, relevant guide updates, and an
`Unreleased` changelog entry.

## Version policy

- Versions below 1.0 are usable public releases, not automatically alpha software.
  The minor number is the compatibility boundary for documented breaking changes.
- Patch releases such as `0.1.1` contain compatible fixes. They do not remove public
  exports or make accepted inputs narrower.
- Minor releases such as `0.2.0` may add APIs. A necessary breaking change must be
  called out in the changelog and include a migration example.
- Prereleases use `alpha.N`, `beta.N`, or `rc.N` and npm dist-tag `next`. Alpha means
  the release scope is incomplete, beta means feature work is complete and integration
  feedback is still expected, and release candidate means only release-blocking fixes
  are expected before the corresponding stable version.
- Stable releases omit the prerelease suffix and are published with npm dist-tag
  `latest`. A prerelease is never published under `latest`.
- All ten packages use one fixed workspace version so consumers can keep adapter,
  renderer, core, primitive, virtual, and theme packages aligned.

## Deprecation policy

When practical, an API is marked deprecated for at least one minor release before
removal. The declaration includes `@deprecated` guidance and the documentation shows
the replacement. Immediate removal is reserved for security, data integrity, or an
API that cannot work as documented; such exceptions require explicit release notes.

Before 1.0, a minor release is still the boundary for documented breaking changes.
After 1.0, Open Grid will follow standard semantic versioning and reserve breaking
changes for major releases.
