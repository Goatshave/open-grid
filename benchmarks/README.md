# Open Grid Benchmarks

This directory contains private workspace applications and deterministic fixtures for
Open Grid regression testing. Nothing under `benchmarks/` is published to npm.

## Applications

| Renderer | Package | Local URL |
| --- | --- | --- |
| Minimal React virtual grid | `@open-grid/benchmark-open-grid-react` | `http://127.0.0.1:4301` |
| Full React grid | `@open-grid/benchmark-open-grid-react-full` | `http://127.0.0.1:4306` |
| Full Vue grid | `@open-grid/benchmark-open-grid-vue` | `http://127.0.0.1:4304` |
| Full Svelte grid | `@open-grid/benchmark-open-grid-svelte` | `http://127.0.0.1:4305` |
| Controlled React server grid | `@open-grid/benchmark-open-grid-react-server` | `http://127.0.0.1:4307` |

The browser applications use the same deterministic fixture generator, logical grid
dimensions, viewport, row and column sizes, and versioned benchmark driver. Framework
behavior tests verify matching datasets and state transitions before measurements are
accepted.

## Required Gates

```bash
pnpm benchmark:test
pnpm benchmark:bundle:run
pnpm benchmark:structure:run
pnpm benchmark:framework:e2e
pnpm benchmark:framework:heap:budget:run
pnpm benchmark:core-filter:massive:run
pnpm benchmark:server:budget:run
```

- `bundle:run` enforces absolute production gzip ceilings and bounded internal
  framework deltas.
- `structure:run` enforces mounted work and DOM ceilings for standard and wide
  profiles.
- `framework:e2e` verifies equivalent React, Vue, and Svelte behavior.
- `framework:heap:budget:run` enforces settled-workload memory ceilings.
- `core-filter:massive:run` covers deterministic 100,000- and 1,000,000-row core
  processing with two warmups and 20 recorded runs so p95 is not determined by one
  outlier. Per-row scaling ceilings remain `2.0x` for row-model and filter workloads,
  while numeric sorting uses `2.5x` and repeated direction flips use `3.0x` to account
  for the stable allocation and garbage-collection cost observed at one million rows.
  These workload-specific ceilings still reject quadratic growth.
- `server:budget:run` covers controlled standard and stress server workloads.

## Diagnostic Measurements

```bash
pnpm benchmark:run
pnpm benchmark:matrix:run
pnpm benchmark:baseline:run
pnpm benchmark:baseline:resume
```

Diagnostic commands write JSON and Markdown beneath `.benchmark-results/`. Generated
results are ignored by Git and are not performance claims. The baseline command uses
two warmups, 12 recorded runs, source-bound checkpoints, and all six workload profiles.

Select an individual workload with `?profile=<id>`. The available profiles range from
1,000 rows to the 1,000,000-row massive virtual workload and are defined in
`benchmarks/shared/index.mjs`.

External product comparisons are deliberately excluded from this workspace. They may
be built later as an independent project with their own dependencies, methodology,
raw evidence, and maintenance lifecycle.
