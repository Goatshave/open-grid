# Public API contract

This directory stores `exports.json` for every public package export, including CSS,
and reviewable declaration snapshots for every typed export. Run
`pnpm build && pnpm api:check` to detect an unintended public API change, removed
export, or stale declaration snapshot. After an intentional change has documentation,
tests, changelog notes, and the correct release classification, run `pnpm api:update`
and review the contract diff in the pull request.

The snapshots are compatibility review inputs, not additional package entry points.
The package `exports` maps and generated `dist/*.d.ts` files remain authoritative.
