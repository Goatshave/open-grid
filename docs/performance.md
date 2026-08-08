# Performance Policy

Open Grid treats performance as a versioned regression contract for its own public
packages and maintained renderers. The project does not make release decisions from
third-party package behavior and does not publish broad comparative claims from CI.

## Principles

- Measure production builds with deterministic datasets and pinned tool versions.
- Validate correctness before accepting a performance observation.
- Prefer stable absolute limits and source-bound Open Grid baselines over noisy
  cross-machine timing comparisons.
- Keep raw benchmark output out of Git; CI uploads generated evidence as artifacts.
- Investigate regressions instead of raising a checked-in limit without an explicit
  explanation and reproducible command.

## Release Gates

The release workflows enforce these Open Grid-owned contracts:

| Gate | Command | Contract |
| --- | --- | --- |
| Bundle | `pnpm benchmark:bundle:run` | Absolute gzip ceilings for the minimal React and full React/Vue/Svelte benchmark builds, plus bounded framework deltas. |
| DOM structure | `pnpm benchmark:structure:run` | Mounted row/cell and document node ceilings for standard and wide workloads. |
| Framework heap | `pnpm benchmark:framework:heap:budget:run` | React/Vue/Svelte retained heap and node-count ceilings after a settled workload. |
| Core scale | `pnpm benchmark:core-filter:massive:run` | Deterministic 100,000- and 1,000,000-row core processing budgets. |
| Server | `pnpm benchmark:server:budget:run` | Controlled standard and stress server-data budgets without network variance. |
| Behavior | `pnpm benchmark:framework:e2e` | Cross-framework correctness for the same Open Grid workload and dataset. |

The checked-in JSON files under `benchmarks/` contain the active limits. A limit
change is a policy change and must be reviewed with the implementation change that
requires it. Browser or measurement-tool upgrades may require a coordinated baseline
update when repeated runs show a stable measurement-definition shift across all
renderers; unaffected metrics and relative limits should remain unchanged.

## Observational Measurements

`pnpm benchmark:run` records React, Vue, and Svelte measurements for local diagnosis.
`pnpm benchmark:baseline:run` records a longer six-profile Open Grid matrix and writes
source-bound checkpoints under `.benchmark-results/`. These commands produce raw JSON
and Markdown summaries; they do not by themselves establish a public performance
claim or block a release.

Browser timings vary with host load, browser scheduling, and frame phase. A timing
result should only inform a product decision when the source revision, environment,
dataset fingerprint, warmups, run count, raw samples, median, and p95 are retained.

## External Comparisons

External product comparisons are intentionally outside this repository and outside
the required release workflow. If a separate benchmark project is introduced later,
it must document feature equivalence, dependency versions, licensing, environment,
raw results, and known limitations. Open Grid release health must remain independent
of that project.
