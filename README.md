# Open Grid

[![CI](https://github.com/Goatshave/open-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/Goatshave/open-grid/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-087f5b)](https://goatshave.github.io/open-grid/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Open Grid is a production-oriented data grid foundation for React, Vue, and Svelte.

The project is intentionally split into a framework-agnostic core, thin framework adapters, and optional UI/theme layers. The core must not depend on DOM APIs or any framework runtime.

## Install

Choose the maintained UI package for your framework:

```bash
# React 18.2 or 19
npm install @open-grid/react-ui @open-grid/theme react react-dom

# Vue 3.4 or later Vue 3
npm install @open-grid/vue-ui @open-grid/theme vue

# Svelte 4 or 5
npm install @open-grid/svelte-ui @open-grid/theme svelte
```

Use `@open-grid/react`, `@open-grid/vue`, or `@open-grid/svelte` with
`@open-grid/primitives` when the application needs a fully custom renderer. Package
selection, framework guides, architecture, and performance evidence are indexed in
[the documentation](https://goatshave.github.io/open-grid/). The Markdown sources
remain available under [`docs/`](docs/index.md).

## Try It Locally

```bash
pnpm install
pnpm dev:react
```

Open the local URL printed by Vite. Use `pnpm dev:vue` or `pnpm dev:svelte` to
inspect the equivalent maintained framework UI. These examples are working product
surfaces with search, sorting, filtering, editing, selection, column management,
grouping/tree data, density and theme controls, and CSV export.

## Positioning

Open Grid aims to be:

- predictable under large client-side and server-driven workloads
- practical to ship in real products without hiding core behavior
- lightweight, transparent, and independently verifiable
- consistent across React, Vue, and Svelte
- localizable per grid instance through one typed cross-framework contract
- composable with typed framework-native cells, headers, toolbars, and query states
- friendly to design systems through CSS variables and unstyled primitives
- suitable for server-side data workflows as a first-class use case

Performance is treated as an Open Grid regression contract, not as a claim about
another project. Release checks enforce deterministic bundle ceilings, bounded DOM
work, framework heap limits, core-scale budgets through one million rows, and
controlled server-workload budgets. The browser harness can record React, Vue, and
Svelte measurements for investigation, but noisy timing observations are not used as
an automatic release claim.

The workload definitions, checked-in limits, commands, and evidence policy are
documented in [docs/performance.md](docs/performance.md) and
[benchmarks/README.md](benchmarks/README.md).

## Packages

```txt
packages/core       framework-agnostic grid engine
packages/react      React adapter
packages/react-ui   Optional styled React grid
packages/vue        Vue adapter
packages/vue-ui     Optional styled Vue grid
packages/svelte     Svelte adapter
packages/svelte-ui  Optional styled Svelte grid
packages/virtual    virtualization primitives
packages/primitives unstyled DOM prop helpers
packages/theme      CSS variables, default theme, and typed product-token adapters
```

React applications that only need fixed-height read-only analytics can import the
separately tree-shakeable `VirtualDataGrid` from `@open-grid/react-ui/virtual`;
feature-complete editing, selection, grouping, menus, resizing, clipboard, and fill
workflows remain in the standard `DataGrid` entry.

The Vue and Svelte UI packages are now started from the same core and primitive contracts as the React UI.

## Examples

```txt
examples/react-basic            React reference grid with virtualization, pinned columns, quick and column filters, page row-selection controls, pagination, loading, and error/retry controls, design-system-composable header action menus, product-owned column management, grouping, and tree data
examples/react-server-side      React reference grid with manual server-side sorting, filtering, pagination, server CSV export, and streaming export progress/cancel preview
examples/react-server-grouping  React reference grid with server-owned grouping, expansion, and query state
examples/react-server-tree      React reference grid with server-owned lazy tree expansion, async child loading, cancellation, retry, refresh, mutation, rollback, merge conflict, and recovery state
examples/shared-server          Framework reusable server CSV export, server-side ticket query, server grouping, and server tree helpers with Next.js/Nuxt/SvelteKit route, app wiring, lazy tree page/children route examples, production query/auth, deployment, hosting target, and standalone app scaffold recipes
examples/nextjs-server-export   Runnable Next.js App Router server export app with query filters and buffered/streaming CSV routes
examples/nuxt-server-export     Runnable Nuxt/Nitro server export app with query filters and buffered/streaming CSV routes
examples/sveltekit-server-export Runnable SvelteKit adapter-node server export app with query filters and buffered/streaming CSV routes
examples/vue-server-side        Vue reference grid with manual server-side sorting, filtering, pagination, server CSV export, and streaming export progress/cancel preview
examples/vue-server-grouping    Vue reference grid with server-owned grouping, expansion, and query state
examples/vue-server-tree        Vue reference grid with server-owned lazy tree expansion, async child loading, cancellation, retry, refresh, mutation, rollback, merge conflict, and recovery state
examples/vue-grouped            Styled Vue reference grid with grouped headers, pinned columns, quick and column filters, page row-selection controls, pagination, loading, and error/retry controls, design-system-composable header action menus, and product-owned column management
examples/svelte-server-side     Svelte reference grid with manual server-side sorting, filtering, pagination, server CSV export, and streaming export progress/cancel preview
examples/svelte-server-grouping Svelte reference grid with server-owned grouping, expansion, and query state
examples/svelte-server-tree     Svelte reference grid with server-owned lazy tree expansion, async child loading, cancellation, retry, refresh, mutation, rollback, merge conflict, and recovery state
examples/svelte-grouped         Styled Svelte reference grid with grouped headers, pinned columns, quick and column filters, page row-selection controls, pagination, loading, and error/retry controls, design-system-composable header action menus, product-owned column management, and virtualization
```

## Current Foundation

The first implementation includes:

- typed column definitions
- typed column helper for accessor keys, accessor functions, display columns, and group columns
- grouped column header model
- core row model
- sorting
- column and global filtering, with optional React/Vue/Svelte per-column and quick filter controls backed by shared primitive input/state helpers
- row grouping, aggregation, expansion, grouped aggregate footers, grouping-depth reorder APIs, and leaf-row-aware grouped selection in the core row pipeline
- tree data through `getSubRows` and `getRowCanExpand`, recursive filter/sort row pipelines, descendant selection mode, shared expansion state, and hierarchy expanders in React, Vue, and Svelte UI
- pagination with bounded first/previous/next/last core APIs and optional React/Vue/Svelte controls with configurable page-size options
- optional React/Vue/Svelte loading overlays with shared `aria-busy` and live status semantics, custom loading content, and preserved row rendering
- optional React/Vue/Svelte error overlays with shared alert semantics, loading precedence, custom error content, and product-owned retry callbacks
- row selection with optional React/Vue/Svelte current-page selection, mixed-state, selected-count, and clear controls backed by shared accessibility primitives
- column visibility state and runtime show/hide APIs
- column sizing with runtime resize APIs, min/max clamping, and proportional `fitColumnsToWidth(...)` redistribution for visible or product-selected columns
- preventable column resize lifecycle events
- column ordering with runtime move/reset APIs
- column pinning state and runtime pin/unpin APIs
- focus coordinate state
- cell range selection state with Shift+keyboard, pointer-drag extension, and fill handles with optional numeric/text-number series generation and max-cell safeguards
- clipboard TSV copy/paste for focused cells and selected cell ranges, including structured paste summaries, max-cell safeguards, React/Vue/Svelte product-owned paste summary UI coverage, and React/Vue/Svelte product-owned async server paste examples
- CSV/TSV export text and file metadata helpers for visible or explicit columns across page, filtered, loaded, and selected row scopes, with `maxRows` safeguards for large client exports
- cell editing state, editable column flags, select editor options, value parsers, validation hooks, validation metadata, invalid edit UI coverage, preventable edit events, opt-in bounded transaction undo/redo across direct edits, paste, and fill, and React/Vue/Svelte product-owned async server commit examples
- shared React/Vue/Svelte `onGridReady` lifecycle access with cleanup-return support for product-owned API subscriptions and toolbar commands, plus selector subscriptions that suppress unrelated product-control updates; accessible history-aware Undo2/Redo2 controls demonstrate both APIs in all three first-publish examples
- framework-neutral row and cell event contracts
- roving tabindex cell props in unstyled primitives
- product-specific `ariaLabel` support with a `Data grid` fallback across the React, Vue, and Svelte styled UI packages, plus Chromium accessibility-tree regression coverage for the first-publish examples
- loaded, filtered, and page-scoped row selection helpers, including explicit selection cleanup
- client/manual server-side modes
- server-side React example with shared server-side ticket query helpers, full-query server CSV export, and streaming export progress/cancel preview
- server-side Vue example with controlled query state, shared server-side ticket query helpers, full-query server CSV export, and streaming export progress/cancel preview
- server-side Svelte example with controlled query state, shared server-side ticket query helpers, full-query server CSV export, and streaming export progress/cancel preview
- shared server CSV export helpers for chunked row serialization, streaming route-handler `Response` creation, abandoned stream cancellation, reusable server-side ticket query helpers, reusable server grouping query helpers, reusable server tree query helpers, concrete Next.js/Nuxt/SvelteKit route examples, typed app page/load-to-route wiring examples with query-allowlisted buffered/streaming export links, typed Next.js/Nuxt/SvelteKit lazy tree page/children route examples, production query/auth export recipes with trimmed case-insensitive Bearer auth, private no-store CSV/JSON responses, CSV proxy-buffering hints, and unknown/duplicate query-key plus empty/duplicate-column rejection, framework deployment header/runtime checklists with `x-accel-buffering: no` validation and normalized hosting config path readiness, Vercel/AWS ECS/Cloudflare/Netlify/Docker/Google Cloud Run/Kubernetes/Azure Container Apps/Render/DigitalOcean App Platform/Railway/Fly.io hosting target presets, and standalone app scaffold manifests
- runnable Next.js, Nuxt, and SvelteKit server-export workspaces that render the shared ticket query model, preserve filters in buffered/streaming links, build with each framework's production server target, and pass real-browser filtering, download, response, and mobile reflow coverage
- server-driven React, Vue, and Svelte grouping examples backed by shared server grouping query helpers, with controlled grouping, expansion, sorting, filtering, and pagination query state plus Playwright coverage for grouping-panel query updates, panel-created group expansion, panel grouping-depth reorder, grouping-depth reorder expanded reset, nested grouping-depth reorder expanded reset, grouping removal expanded reset, nested grouping removal expanded reset, toolbar grouping clear expanded/page reset, grouping-change expanded/page reset, nested grouping-change expanded/page reset, filter apply/clear expanded reset, nested filter-change expanded reset, grouped filter/pagination, filter/sorting pagination reset, filtered sorting through grouping, filtered sorting clear-to-flat rows, grouping-panel filtered sorting removal, grouping-panel filtered sorting reorder, sorted grouped filter-clear restoration, expanded grouped pagination boundaries, sorting pagination persistence, sorting transitions, sorting-change expanded persistence, and nested sorting-change expanded persistence
- server-driven React, Vue, and Svelte lazy tree examples backed by shared server tree query helpers, with product-owned loading/error/retry/cancellation/single-and-bulk-refresh/mutation/rollback/merge-conflict/recovery state, stale-response guards, pagination loaded/expanded persistence, sorting page-off expanded persistence, and descendant selection with collapse/re-expand, single-refresh, bulk-refresh, and sorting page-off persistence coverage
- product-owned React, Vue, and Svelte column management examples for runtime visibility, ordering, pinning, and reset controls with hidden-column reset restoration coverage
- versioned React, Vue, and Svelte product-preference persistence helpers and reference flows for column visibility, sizing, ordering, pinning, and density, with malformed/unknown data normalization, storage-failure guards, reload restoration, and explicit reset coverage
- product-owned React, Vue, and Svelte header menu composition examples that add design-token column sizing actions, custom design-token preview slots, section labels, and separators while reusing renderer defaults
- product-owned React, Vue, and Svelte root, row, header, and cell styling through framework-native root class/style props, typed `@open-grid/theme/tokens` light/dark adapters, and `getRowClassName`, `getHeaderClassName`, and `getCellClassName` hooks, with cross-framework browser coverage proving root tokens reach the semantic grid without custom renderers
- reusable feature-level state reducers
- memoized column and row model pipelines
- cache diagnostics for row, column, layout, and selection models
- framework adapters that share the same core engine
- reactive option updates for React, Vue, and Svelte adapters
- React reference UI with grouped headers, optional drag-to-group panel, hierarchy row expanders, sorting, keyboard focus navigation, cell range selection, clipboard copy/paste with product-owned paste summary UI and a product-owned async server paste example, export download helpers, row selection, searchable built-in column visibility controls, cell editing with default text editors, select editors, and a product-owned async server commit example, pinning controls and styles, optional customizable keyboard-navigable header action menus with product-owned design-token actions, custom render slots, and non-button section items, product-owned advanced column management controls, pointer and keyboard column reordering, pointer resizing, and keyboard resizing
- Vue reference UI with grouped headers, optional drag-to-group panel, hierarchy row expanders, sorting, keyboard focus navigation, cell range selection, clipboard copy/paste with product-owned paste summary UI and a product-owned async server paste example, export download helpers, row selection, searchable built-in column visibility controls, cell editing with default text editors, validation messages, select editors, and a product-owned async server commit example, pinning controls and styles, optional customizable keyboard-navigable header action menus with product-owned design-token actions, custom render slots, and non-button section items, product-owned advanced column management controls, pointer and keyboard column reordering, column resizing, row virtualization with measured row heights and unit-safe virtual body/row styles, and column virtualization with measured center-column widths
- Svelte reference UI with grouped headers, optional drag-to-group panel, hierarchy row expanders, sorting, keyboard focus navigation, cell range selection, clipboard copy/paste with product-owned paste summary UI and a product-owned async server paste example, export download helpers, row selection, searchable built-in column visibility controls, cell editing with default text editors, validation messages, select editors, and a product-owned async server commit example, pinning controls and styles, optional customizable keyboard-navigable header action menus with product-owned design-token actions, custom component slots, and non-button section items, product-owned advanced column management controls, pointer and keyboard column reordering, column resizing, row virtualization with measured row heights, and column virtualization with measured center-column widths
- optional row virtualization powered by `@open-grid/virtual`
- measured row height cache for virtualized rows
- measured column width cache for center-column virtualization with shared ResizeObserver inline-size resolution, sized layout resolution, measured layout cache application, measured layout signature/cache sync, and measured layout recalculation; fixed-width products can explicitly disable DOM width measurement while retaining the core sized layout
- shared ResizeObserver creation, element collection observation, observed-element replacement/removal, and observer cleanup keep mounted row/column observer registration aligned across React, Vue, and Svelte
- optional center-column virtualization that keeps pinned left/right columns mounted through shared render item calculation
- React/Vue/Svelte sticky header and pinned column coverage under virtualized scrolling, including direct header pinning disabled-state coverage
- React/Vue passive scroll listener cleanup for virtualized scroller lifecycle is shared through primitives; React/Vue/Svelte scroll-frame option extraction is shared through primitives before virtual normalization; Svelte uses declarative scroll binding
- React/Vue/Svelte focused-cell restoration attempt and frame-sync cancellation guards are shared through primitives while each renderer still owns scheduling and retry timing; external scroll/resize synchronization cancels stale restore requests, restoration-owned scrolling preserves them, and Vue/Svelte restoration uses the same measured center-column layout as header/body rendering
- React/Vue/Svelte expose WAI-ARIA row coordinates from shared primitives: client-side `aria-rowcount` includes multi-row headers and the empty-state row, every header/body/cell has a one-based `aria-rowindex`, paginated body rows include the page offset, and manual server pagination reports an unknown total with `aria-rowcount="-1"` instead of guessing
- React/Vue/Svelte shared primitive grid root/focus, grid structure and body column-order markers, header cell layout, header button/sort indicator, row layout, cell layout, grouping panel, header placeholder, row selection, expander toggle/spacer, fill handle, cell editor/structural validation message/autofocus and selectable-editor text selection, React/Vue structural editor target value extraction, cell edit value parsing, focused-cell edit start guard, cell edit cancel guard, focused-cell DOM focus helpers, structural element id focus helpers, focused-cell scroll position helper, scroll-frame and focused-cell scroll element option helpers, element offset block-size fallback, virtual row/body, inline-size, group indentation, and pinned-column offset style helpers with renderer-safe object/text serialization, grid keyboard shortcut edit-state guard, cell pointer drag start guard, range/fill/header pointer drag continuation guard, range/header pointer drag end guard, header drag end action decisions and type guards, pointer drag movement state updates, post-drag cell and header click suppression state, default-prevention-only event isolation, prevented event default reflection, browser clipboard text IO and default environment adapters, browser export file downloads and default environment adapters, column resize handle, resize start sizing, pointer resize target sizing, final resize sizing, resize start/apply default-prevention guards, pointer capture target extraction and structural guard helpers, pointer move/up/cancel listener cleanup and default target adapters, structural ResizeObserver entry block-size resolution, shared ResizeObserver creation, structural dataset target guard and id lookup/setting, measured-size cache application, measured element structural target guards plus block-size-from-rect and inline-size resolution, column pinning controls/button, header menu trigger/popover/item attributes, header menu default item descriptors, header menu item type guards and custom item helpers, header menu keyboard action type guards, header menu focus target helper and structural target type guard, header menu focus utilities and direct/id-based structural trigger focus restoration helpers, grid shortcut target isolation utilities and keyboard event wrapper including contenteditable and ARIA input-role editor guards, visible/grouped column move helpers, row and column id/index lookup helpers, keyboard focus movement, focused row-selection target lookup, row-selection toggle default-prevention guard, Space row-selection toggling, grouped expander Enter/Space keyboard isolation, Shift+Home/End/Page boundary range selection, offscreen focused-cell scroll restoration under virtualization, keyboard column reorder, and keyboard resize Arrow/Home/End coverage
- React/Vue/Svelte header action menu ArrowUp/ArrowDown/Home/End/Tab keyboard navigation coverage
- React/Vue/Svelte product-owned column management reset restoration coverage
- React/Vue/Svelte built-in column visibility search, hide, live-count, show-all, no-results, and final-visible-column guard coverage
- React/Vue/Svelte controlled or uncontrolled compact/standard/comfortable density controls with shared accessibility props, CSS-variable sizing, and virtual row measurement-cache synchronization
- React/Vue/Svelte grouping-panel grouped row selection coverage
- shared initial scroll frames, row virtual range helpers, and scroll-frame normalization, with primitive scroller and focused-cell scroll option extraction for row and column virtualization
- shared center-column measured layout, render item calculation, render item keys, and spacer item guards for column virtualization
- shared grouped header render item calculation, render item keys, and spacer item guards keep virtualized header spans aligned with center-column render windows
- shared virtual row item mapping and focused-cell render-window checks for row virtualization
- large-data Playwright coverage for virtualized flat, grouped aggregate-footer, grouping-panel reorder aggregate-footer, and tree layout scenarios

## React UI Usage

```tsx
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import { createColumnHelper, DataGrid } from "@open-grid/react-ui";

interface Person {
  id: string;
  name: string;
  age: number;
  role: string;
}

const column = createColumnHelper<Person>();

const columns = [
  column.accessor("name", { header: "Name" }),
  column.accessor("age", { header: "Age" }),
  column.accessor("role", {
    header: "Role",
    enableEditing: true,
    validateEditValue: (value) => (String(value ?? "").trim() ? true : "Role is required"),
  }),
];

export function PeopleGrid({ data }: { data: Person[] }) {
  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{
        columnPinning: { left: ["name"], right: [] },
      }}
      rowVirtualization={{ enabled: true, estimateRowHeight: 40 }}
      columnVirtualization={{ enabled: true }}
      columnVisibilityControls
      densityControl
      onCellEdit={(event) => {
        if (event.phase === "commit" && !event.defaultPrevented) {
          // Update product-owned data here.
        }
      }}
    />
  );
}
```

### Styling And Product Design

The framework UI packages provide a maintained, accessible styled baseline rather than a fixed application design. Import `@open-grid/theme/css`, then override semantic `--og-*` variables on the styled grid root to map the grid to a product design system. Static themes can target `.og-grid`; product-owned runtime themes can import `createOpenGridThemeStyle` or `createOpenGridThemeCssText` from `@open-grid/theme/tokens` and pass the result through the framework's root `style` prop. The typed adapter maps ergonomic keys to the stable CSS contract and rejects unknown, empty, or declaration-breaking values. The token contract covers surface levels, borders, text, accent, focus, danger, density sizing, radii, shadows, and motion. Set `data-og-theme="dark"` on the grid or an ancestor to use the bundled dark defaults, and provide separate light/dark overrides when product colors require different contrast. The first-publish React, Vue, and Svelte examples demonstrate this theme-aware runtime integration with guarded local persistence while keeping grid layout preferences in their separate versioned payload. They also use `getCellClassName` for product-owned semantic markers: all three grids distinguish low, medium, and high risk, while React additionally distinguishes Paid, Sent, Draft, and Overdue invoice status. Text remains the primary meaning, while contrast-aware dots improve scanning in light and dark themes and collapse to a system-color cue in forced-colors mode. Their advanced column-management panel starts collapsed behind a count-aware toolbar control so the grid remains visible in the 390px first viewport. Leaf headers keep one action-menu trigger instead of repeating three direct pin buttons; pinning remains available through that menu and the product panel, while direct controls remain an opt-in renderer feature demonstrated by the server-side examples. Idle workflow diagnostics stay out of the visual layout and active edit or design-action feedback remains available through polite live regions.

Use `@open-grid/react-ui`, `@open-grid/vue-ui`, or `@open-grid/svelte-ui` when token and product-shell customization is enough. Use the thin framework adapter plus `@open-grid/primitives` when a product needs a fully custom renderer. Toolbars, summary metrics, advanced column-management panels, workflow status, and other application chrome remain product-owned; the first-publish examples demonstrate that composition with a denser operational shell and Lucide controls.

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm build:examples
pnpm dev:nextjs
pnpm dev:nuxt
pnpm dev:sveltekit
pnpm benchmark:core-filter:run
pnpm benchmark:core-filter:massive:run
pnpm e2e:renderers
pnpm e2e:smoke
pnpm preview:smoke-ui -- --json
pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json
pnpm review:smoke-ui
pnpm release:ui-smoke-report-check
pnpm release:policy
pnpm release:plan -- --markdown
pnpm release:check
pnpm release:stage
pnpm release:publish-dry-run -- --repository-url git+https://github.com/OWNER/REPO.git --markdown
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth --markdown
pnpm release:first-publish-next-step -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:first-publish-status -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth
pnpm release:trusted-publishing -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git
pnpm release:first-publish-preflight -- --version 0.1.0 --tag latest --repository-url git+https://github.com/OWNER/REPO.git
pnpm e2e
```

Contributions are governed by [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

Use `pnpm e2e:renderers` for React, Vue, and Svelte adapter regressions without starting the unrelated server-export framework examples. It rebuilds all publishable packages first so renderer applications cannot consume stale core or primitive `dist` output. The full Playwright suite keeps its canonical servers on ports 4173-4187, while automated UI smoke uses 4193-4195. When another local workspace or a running manual UI preview already owns those ports, run `OPEN_GRID_E2E_PORT_OFFSET=100 pnpm e2e` to move the full suite to 4273-4287, `OPEN_GRID_E2E_PORT_OFFSET=100 pnpm e2e:renderers` to move the renderer suite to 4273-4275, or `OPEN_GRID_E2E_PORT_OFFSET=100 pnpm e2e:smoke` to move automated smoke to 4293-4295. The offset must be a non-negative integer and cannot move the highest configured test port above 65535. Manual preview and release-evidence URLs remain fixed at 4193-4195, and release CI continues to use all default ports.

`pnpm release:stage` builds the same tarball shape used by publish commands and requires every package tarball to retain its `README.md`, `LICENSE`, exported `dist` files, and rewritten non-`workspace:` dependency metadata.

For the first GitHub push and npm setup pass, read the `nextVerificationCommands` from `pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth`, `pnpm release:first-publish-status -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth`, and `pnpm release:first-publish-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --json`; those outputs keep SSH recovery commands when auth is blocked, the push, final local status, first-publish preflight, trusted-publishing, manual UI smoke checklist, Markdown and structured JSON inspection reports, browser-open UI inspection, guided evidence recording, structured report validation, automated smoke, and full e2e gates in the order expected before the manual Release Publish workflow run.

The manual Release Publish dispatch requires the completed structured report as `ui_smoke_report`. Run it from the reviewed clean source revision with `-F ui_smoke_report=@.release/ui-smoke-report.json`; the workflow materializes that input and runs `pnpm release:ui-smoke-report-check -- --json` before any publish command. `pnpm release:first-publish-status` prints the complete `gh workflow run` command.

Use `pnpm release:first-publish-status -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth` when you want commercialization readiness, structured commercialization progress, GitHub SSH diagnostics, explicit SSH key load commands, the React/Vue/Svelte manual UI smoke targets with direct browser-open commands, remaining external GitHub/npm actions, and the next verification commands in text form. Use `pnpm release:first-publish-next-step -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth` or add `--next-step` when you only need the next incomplete commercialization stage, and add `--json` when automation should consume that single stage without the full status payload. Add `--markdown` for a checkbox report that also surfaces the GitHub `npm` environment with its settings URL, Release Publish workflow inputs, per-package npm Trusted Publisher settings with npm access-page URLs, the final protected Release Publish workflow run checklist, and the external setup verification success criteria from the nested trusted-publishing preflight. The same UI target list is exposed as `manualUiSmokeTargets` in JSON output, the four-stage commercialization progress is exposed as `commercializationProgress` with current stage id, next required actions, next verification commands, remaining stage count, remaining stage details, per-stage required actions, and per-stage verification commands, the next incomplete commercialization stage is exposed directly as top-level `commercializationNextStep`, the GitHub/npm external setup values are exposed as top-level `trustedPublisherSetup`, the exact manual workflow file, GitHub Actions URL, optional `gh workflow run` command, inputs, instruction, and UI/e2e gates are exposed as top-level `releasePublishWorkflowRun`, and the post-setup rerun checklist is exposed as top-level `externalSetupVerification`.
If SSH diagnostics need a custom agent or key directory, pass `--ssh-command`, `--ssh-add-command`, `--ssh-dir`, and `--ssh-keygen-command`; the status command forwards them to the nested GitHub push preflight.

Use `pnpm release:github-push-preflight -- --repository-url git+https://github.com/OWNER/REPO.git --check-auth --markdown` when you want a copyable GitHub push readiness report with SSH agent diagnostics, public-key candidates, explicit `sshKeyLoadCommands` / paired private-key `ssh-add` load commands, external actions, and next verification commands.

Use `pnpm release:first-publish-preflight -- --repository-url git+https://github.com/OWNER/REPO.git` when you want a final local first-publish gate report with Release Publish inputs, UI gates, and the React/Vue/Svelte manual smoke targets with direct browser-open commands before external GitHub/npm setup. Add `--markdown` for a checkbox report.

Use `pnpm release:trusted-publishing -- --repository-url git+https://github.com/OWNER/REPO.git --markdown` when configuring npm Trusted Publisher settings and the protected GitHub `npm` environment.

Use `pnpm release:plan -- --version 0.1.0 --markdown` when you want the publish order, prepublish gates, manual UI checklist/report gates, and workspace dependency rewrites as a release approval checklist.

Use `pnpm release:publish-dry-run -- --version 0.1.0 --repository-url git+https://github.com/OWNER/REPO.git --markdown` when you want the exact npm publish dry-run command sequence as a release approval checklist.

Use `pnpm e2e:smoke` for a faster browser check while iterating on the reference UI. It starts the React, Vue, and Svelte reference examples and runs 24 checks: rendered-grid and bounded deep-virtualization assertions, text-preserving semantic status/risk markers with distinct computed light/dark cues, automated Axe WCAG A/AA scans, 390px document reflow plus internal grid scrolling, first-viewport grid presence with the column panel collapsed and every expanded-panel command inside the viewport, a separate 640x450 CSS pixel/DPR 2 context that approximates 200% reflow and rejects product-control clipping or overlap, focus and state cues under forced colors with reduced-motion loading feedback, and one uninterrupted search/edit/sort/preference-reload/reset product workflow per framework. The workflow also proves that column and density preferences persist while sorting, editing, and row data remain transient. The DPR 2 regression remains a portable approximation, while a 2026-07-20 hands-on pass also verified Chrome's actual 200% host zoom at 640x450 CSS pixels, a separate 390 CSS pixel viewport, and keyboard-only toolbar/grid/menu/edit-cancel flows across all three renderers. That review found and fixed mobile column-manager clipping plus the grid-entry focus ring. Automated and ordinary-browser checks still do not prove screen-reader behavior or a platform's actual high-contrast theme, so retain those two manual reviews for release approval. The smoke suite requires the first mounted virtual row index to reach at least 100 and keeps the mounted virtual row window below 80 rows. For manual inspection of the exact same preview targets, run `pnpm preview:smoke-ui` and open the printed React, Vue, and Svelte URLs, or run `pnpm preview:smoke-ui -- --open` to wait for those preview servers and open all three URLs in the default browser. Use `pnpm preview:smoke-ui -- --framework Vue --open` when you only need one framework target, and add `--wait-timeout-ms 45000` if a slower local machine needs longer than the default 30000ms preview readiness wait. Use `pnpm preview:smoke-ui -- --list` for human-readable target URLs, build/preview/open commands, open wait timeout, smoke assertions including semantic marker and zoom-equivalent viewport contracts, state checks, workflow checks, and manual checks, `pnpm preview:smoke-ui -- --markdown` for a checkbox checklist with the same contracts and per-target open commands, `pnpm preview:smoke-ui -- --report` for a manual inspection report template with pass/follow-up and evidence fields, `pnpm preview:smoke-ui -- --report --out-file .release/ui-smoke-report.md` to write the same report for release evidence, or `pnpm preview:smoke-ui -- --json` for the target data in machine-readable form without starting servers; `--report --json` emits the same inspection-report shape for tooling and also supports `--out-file`. Each metadata mode accepts the same `--framework React|Vue|Svelte` filter and reports the active `waitTimeoutMs`. The 21 manual functional checks cover visible rows/cells, semantic marker readability, the primary smoke column header, default-collapsed column management plus its live visible-count assertion, bounded deep virtual scrolling, CSV download behavior, and the connected product workflow for each framework. For framework-specific dev servers, run `pnpm dev:react`, `pnpm dev:vue`, or `pnpm dev:svelte` and open the Vite URL printed by the command.

The manual UI metadata keeps functional `manualChecks` separate from shared `accessibilityChecks`. `--report` and `--report --json` add reviewer/date/OS/browser/screen-reader/high-contrast metadata plus independent result and evidence fields. Reports also capture the current Git revision, workspace version, relevant source file count, dirty state, and a SHA-256 fingerprint over packages, first-publish examples, E2E coverage, and UI smoke tooling. After the final source commit, generate the release-checkable JSON with `pnpm preview:smoke-ui -- --report --json --out-file .release/ui-smoke-report.json`, open the real targets, and run `pnpm review:smoke-ui`. The guided review rejects stale source or target contracts before prompting, explicitly confirms actual `200%` browser zoom and `390 CSS px`, records `pass`, `follow-up`, or `todo` plus evidence after every item, writes each update atomically, and can resume the whole report or one `--framework React|Vue|Svelte`. Use `pnpm review:smoke-ui -- --status` or `--status --json` to inspect completion without changing the report. Status output lists every non-passing functional or accessibility check with its target URL and framework resume command; JSON exposes the same records as `pendingChecks`, and `--framework` scopes counts and pending checks without weakening whole-report release readiness. Only a clean, fully passing report is shown as ready for `pnpm release:ui-smoke-report-check`; `--allow-dirty` exists for development-time review-tool testing and never makes a dirty report release-ready. Approval requires the same clean relevant source tree and a valid local-calendar review date no more than seven days old; `--max-age-days` can tighten that window. The checker also rejects malformed files, changed source fingerprints or revisions, stale target contracts, future dates, non-passing results, empty evidence, missing targets, unexpected targets, and encoded reports over the reserved 60,000-character/byte dispatch budget. The Release Publish workflow supplies version, tag, and repository URL so the checker also validates the complete workflow input payload against GitHub's 65,535-character/byte limit. Generating or partially completing the template does not complete the audit.

For release readiness, see [docs/release.md](docs/release.md).

## License

MIT.
