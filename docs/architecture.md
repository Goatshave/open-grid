# Architecture

The styled React, Vue, and Svelte renderers use a visual `.og-grid` shell around a semantic `.og-grid__scroller[role="grid"]`. Product controls such as the grouping panel and state overlays stay in the visual shell but outside the ARIA grid, while grid rowgroups, rows, headers, and cells remain descendants of the semantic scroller. Grid keyboard handling is attached to that semantic element. Keep `getGridProps` and `data-open-grid` on the scroller when extending a renderer so automated accessibility checks and structural selectors continue to describe the same element.

The first-publish smoke suite includes `@axe-core/playwright` scans tagged for WCAG 2.0, 2.1, and 2.2 A/AA rules across the React, Vue, and Svelte reference UIs. This gate catches machine-detectable semantic, contrast, and target-size regressions; it complements rather than replaces manual screen-reader, high-contrast, zoom, and task-flow review.

The same smoke gate runs functional, keyboard, and display-mode regressions against every first-publish renderer. It starts a real CSV download before deep-scroll virtualization checks. Its primary keyboard path proves toolbar focus order, Tab entry into the semantic grid, header-menu entry and focus return, grid cell movement, editor entry, and edit-cancel focus return; each active toolbar, grid root, menu, and cell target must expose a computed outline at least two CSS pixels wide. Renderer schedulers may differ, but the final DOM focus and visible-focus contracts may not. At a 390 CSS pixel viewport, the document must not gain horizontal overflow, every visible product control in the expanded column manager must remain inside the viewport without overlap, and the semantic grid scroller must retain usable internal horizontal scrolling. Mobile product column-management rows therefore stack vertically instead of hiding command groups in a horizontal card strip. Under `forced-colors: active`, keyboard movement retains a focused-cell outline, selected rows expose a non-color-only outline, disabled controls use full-opacity system-color outlines, and real loading, error, retry, and invalid-edit flows retain distinct borders, focus, messages, and validation cues. Reduced motion disables the loading spinner animation. Shared target-state metadata and forced-colors rules keep React, Vue, and Svelte aligned; actual assistive-technology and platform high-contrast review remain release evidence rather than an architectural browser-test claim. Actual Chrome 200% zoom, 390 CSS pixel, and keyboard-only reviews passed across all three first-publish renderers on 2026-07-20 after the mobile command-clipping and grid-entry focus findings were fixed.

Manual release evidence is modeled separately in `scripts/ui-smoke-targets.mjs`: renderer-specific `manualChecks` cover product behavior, while shared `accessibilityChecks` cover assistive-technology and display-mode review. `scripts/ui-smoke-source-state.mjs` fingerprints the tracked and untracked contents of packages, first-publish examples, E2E coverage, and UI smoke tooling, then pairs that digest with the Git revision, workspace version, relevant file count, and dirty state. `scripts/ui-smoke-preview.mjs` embeds this source identity in Markdown and JSON reports. `scripts/ui-smoke-review.mjs` verifies that identity and the exact target/check contract before collecting review environment, per-check results, and evidence; atomic per-item writes make interruption resumable, while explicit zoom/viewport confirmations prevent the guided UI from silently claiming display evidence. `scripts/ui-smoke-report-check.mjs` treats both the current source identity and shared targets as the approval schema: release approval requires a clean exact source match, a review no more than seven days old, exact `200%` browser zoom and `390 CSS px` viewport fields, all other environment fields, passing target/check results, and evidence. These structured fields prevent responsive emulation or page-scale transforms from being recorded as actual browser-zoom review. `--allow-dirty` is a development-only escape hatch that still requires the exact dirty-source fingerprint and never reports a dirty review as release-ready. The checker measures JSON-string encoded characters and UTF-8 bytes, reserves 60,000 of each for the report, and can measure the exact complete workflow input object when version, tag, and repository URL are provided together. First-publish plans, preflights, and status output carry generation, guided review, and validation commands so release approval uses the same source of truth. The manual Release Publish workflow transports the completed JSON as the required `ui_smoke_report` dispatch input, recreates `.release/ui-smoke-report.json` on the checked-out revision, and validates both evidence and the 65,535-character/byte dispatch payload boundary before any provenance publish command.

Open Grid is designed around clear package boundaries.

## Benchmark Evidence Identity

Browser benchmark results carry both Git revision/dirty state and a
`sourceFingerprint`. The fingerprint hashes every tracked and untracked,
non-ignored workspace file with its path, executable mode, symlink target, deletion
state, and contents. Ignored build and `.benchmark-results` output is excluded, so
back-to-back measurements retain one identity while any source, policy, test, or
documentation edit changes it. General observational measurement may record
`unavailable` outside a Git workspace, but repeatability audits require a valid
SHA-256 fingerprint.

Long-running timing matrices are diagnostic evidence. Repeated observations require
the same source fingerprint, environment, implementation versions, profile datasets,
and action contract. Deterministic bundle, DOM, heap, core-scale, and server budgets
remain the release gates; browser timing variance is investigated from raw samples
rather than converted into an automatic public claim.

## Core

`@open-grid/core` owns data modeling, state updates, row pipelines, feature contracts, and framework-independent types.

Core must not import React, Vue, Svelte, DOM APIs, or CSS.

Feature state transitions are modeled as reusable reducers in core. Grid instance methods should delegate to those reducers so controlled state, custom framework UI, and future plugin hooks can use the same transition semantics as the built-in APIs.

Pagination state is normalized at the reducer and row-pipeline boundaries. Whole-state pagination updates, individual page-index/page-size updates, row slicing, and page-count calculation share the same lower-bound rules: negative or non-finite page indexes resolve to the first page, non-positive or non-finite page sizes resolve to `1`, and malformed manual `pageCount` values resolve to at least `1`, so malformed controlled state cannot make client pagination slice from the end of the row model or produce invalid page counts. Core also owns `getCanPreviousPage()`, `getCanNextPage()`, `firstPage()`, `previousPage()`, `nextPage()`, and `lastPage()` so client and manual server pagination use the same bounded transitions.

Row and cell interactions are represented as framework-neutral core events. Renderers can attach their native event as `sourceEvent`, while product code can call `preventDefault()` on the core event to suppress renderer-owned default behavior such as row selection. React, Vue, and Svelte route row-selection click and keyboard toggle decisions through the shared primitive default-prevention guard so that preventable row events stay aligned across renderers. Prevented core cell click events also use the shared primitive default-reflection helper before renderers call `preventDefault()` on the source event.

Cell editing is represented as core state plus preventable `start`, `commit`, and `cancel` events. Core tracks which cell is editing and emits values, but product code owns data mutation so client-side, controlled, and server-side workflows can share the same contract. Columns can define `editOptions` for finite string-valued choices; React, Vue, and Svelte UI render those editable cells with select editors while preserving the same parser, validation, and commit events used by text editors. Columns can also define synchronous `validateEditValue` hooks. Invalid commit events carry `event.validation`, are default-prevented by core, keep direct editing open, and are emitted through the same commit path as valid edits so product code can observe failures without mutating data. Async/server commits stay product-owned: React, Vue, and Svelte examples show product code preventing the default direct commit, keeping the editor open while a simulated server save is pending, then updating row data and controlled focus/editing state after the server result is accepted.

Edit history is an opt-in bounded core capability configured by `editHistoryLimit`; the default zero limit retains no edit values. Direct edits form one transaction, while accepted paste and fill commits form one multi-cell transaction. Undo and redo resolve cells from the full leaf row/column models rather than the current page, re-run validation, and emit the same preventable commit contract with `historyAction` metadata. Missing, read-only, or newly invalid cells are skipped safely. Prevented async/server commits are intentionally excluded because product code has not accepted those values into its data source.

Styled renderers expose their live core instance through the common `onGridReady` lifecycle callback after mount. A returned cleanup function runs during unmount, allowing product-owned controls to subscribe without leaking listeners. The renderers do not own product toolbar composition: product code can use core `subscribeSelector`, React `useGridSelector`, Vue `useGridSelector`, or Svelte `createGridSelectorStore` to observe one derived value. The React first-publish history toolbar uses the native hook; Vue and Svelte use the core lifecycle subscription. All three connect accessible Undo2/Redo2 icon buttons to the same API used by keyboard shortcuts without updating for unrelated sorting, filtering, focus, selection, or layout notifications. The original all-notification `subscribe` and framework state-store contracts remain available for integrations that require them.

Cell range selection is represented as core state over visible row and column coordinates. Renderers extend ranges through focus movement options or pointer drag and expose selected cells through primitive attributes. Clipboard copy/paste and fill handles are serialized, parsed, or applied in core from the same coordinate model. Fill handles default to copy semantics, and `grid.fillCellRange(end, { fillMode: "series" })` can continue numeric, numeric-string, and trailing-number text series while falling back to copy for non-series values. `CellFillOptions.maxCells` plus `maxCellsMode: "block" | "truncate"` guard large fill operations; React, Vue, and Svelte UI expose the same options through `cellFillOptions` for built-in fill handles. Paste and fill emit the same editable-cell commit events and validation results as direct cell editing, so product code keeps ownership of data mutation while UI packages only own browser clipboard and pointer access. Server paste approval stays product-owned: the React, Vue, and Svelte examples prevent the default paste commit for one editable text column, send the parsed value through a simulated server save, and update row data plus controlled focus state only after the save resolves.

`grid.pasteClipboardText(...)` returns a structured paste result with attempted, committed, skipped, and validation-error cells plus the committed edit events. `maxCells` and `maxCellsMode` let products block or truncate large pastes while keeping parsing, validation, and summary semantics in core. If product code prevents a paste commit for async server approval, core reports that cell as skipped for the immediate paste result; the later accepted value is applied by product-owned state rather than by a second core paste pass.

Export helpers are core-owned serializers and file metadata utilities, not renderer download widgets. `grid.getExportText(...)` can serialize CSV, TSV, or a custom delimiter from visible columns or explicit column ids across current page, pre-pagination, filtered, loaded, and selected row scopes. `maxRows` and `maxRowsMode: "block" | "truncate"` let products guard large client-side exports before browser download helpers allocate a file. `grid.getExportFile(...)`, `createExportFile(...)`, `getExportFileExtension(...)`, and `getExportMimeType(...)` keep filename, extension, MIME type, and byte-order-mark decisions DOM-free. Column-level `exportValue` and grid-level `getExportCellValue` let products format export output without coupling that behavior to a specific framework UI.

Browser downloads stay outside core. The styled React, Vue, and Svelte UI packages expose `downloadExportFile(file)`, which delegates to a shared primitive browser download helper that turns a core `ExportFile` into a Blob download when DOM APIs are present and returns `false` in non-browser environments. Server-side and streaming exports reuse the same column/value/export semantics but generate responses in product or server code when datasets are larger than the loaded grid rows. `examples/shared-server` owns DOM-free chunked CSV generation, buffered and streaming `Response` creation, ticket query models, and thin framework route adapters. The private `examples/nextjs-server-export`, `examples/nuxt-server-export`, and `examples/sveltekit-server-export` workspaces are the executable integration layer: each framework renders the same query model, submits native account/status/sort filters, preserves those filters in both export links, and returns the shared response from its native server route. Their production builds and Playwright flows prove the framework bundlers can consume the shared TypeScript source and that buffered downloads, streamed bodies, filenames, and responsive layout work over HTTP. Production query/auth policy, private no-store headers, deployment settings, and hosting presets remain separate recipes in `examples/shared-server`; the standalone manifests are source-wiring references, while the checked-in apps are the authoritative runnable examples. `examples/react-server-side`, `examples/vue-server-side`, and `examples/svelte-server-side` continue to demonstrate full-query export and streaming progress/cancellation inside the styled grid applications.

Framework app export links are query-allowlisted. The page/load examples forward only `account`, `status`, and `sort` to export routes, strip unrelated page or tracking query values, remove incoming `stream` from buffered links, and set `stream=1` only on streaming links.

Column and row pipelines are memoized by explicit dependencies. UI-only state such as focus or row selection should not invalidate core, filtered, sorted, paginated, or column layout models unless that state is part of the model being read.

Resolved column objects are definition-stable. Sizing, visibility, and pinning methods
read the current resolved grid state, so layout-only changes do not recreate columns
or invalidate core, filtered, sorted, grouped, expanded, and paginated row models.
Visibility still invalidates the visible-column list, while sizing and pinning only
invalidate column layout. Renderers must treat column methods as live reads rather
than snapshots of the state that existed when the object was created.

State merging preserves existing `pagination` and `columnPinning` object references when their values are unchanged, so unrelated controlled filtering or sorting cannot invalidate pagination or column-layout dependencies. A controlled update still emits the complete proposed state through `onStateChange`, but core store subscribers are notified only when the currently resolved state actually changes. The owning framework render supplies a newly accepted controlled value through `setOptions`; partial control continues to notify for changes to uncontrolled fields.

Flat default sorting may select specialized allocation-bounded paths without changing
the public sorting contract. Single finite-number rules use stable typed radix
ordering, and the measured two-rule Status-string/Amount-number shape evaluates each
accessor once, creates comparator-equivalent primary string ranks, sorts the numeric
secondary key stably, then sorts those ranks stably. These paths require monotonic
original row indexes. Custom comparators, other rule/value combinations, grouped or
tree rows, and non-monotonic indexes retain the general stable row comparator so
observable accessor, comparator, null, and tie semantics remain intact.

Global filtering is core row-pipeline state. `globalFilter` applies a case-insensitive text match across globally filterable leaf columns, combines with per-column filters using AND semantics, and preserves matching ancestor paths in tree data. Columns can opt out through `enableGlobalFiltering: false`, products can replace matching through `globalFilterFn`, and `manualFiltering` leaves both global and column filter execution to the server while preserving their controlled state.

Cache diagnostics are exposed from core through `grid.getCacheDiagnostics()` and `grid.resetCacheDiagnostics()`. Diagnostics report hit, miss, compute, initialization, and dependency-count data per model cache without clearing cached values.

Row selection is preserved by default so server-side pagination and cross-page workflows do not lose selection state implicitly. Products can explicitly prune row selection against loaded, filtered, or current page rows through core cleanup APIs.

Flat self-scoped all-row selection uses a compact state contract: `allRowsSelected: true` represents the selected universe, and `rowSelection` stores only explicit deselected exceptions as `false`. Selecting or clearing all flat rows is therefore O(1) in dataset size, while individual, page, filtered, selected-row-model, prune, and reset operations resolve effective selection from the flag plus exceptions. Grouped, tree, nested, and descendant selection continues to materialize leaf-row ids because those modes require semantic row-model traversal.

The minimal React renderer computes visible virtual-row items only when the row model
or virtual range changes. Selected state is passed declaratively to each memoized row,
so one selection update changes the affected row attributes without a whole-window
layout effect or unchanged cell-content reconciliation.

Manual sorting, filtering, and pagination are core options for server-side workflows. The React, Vue, and Svelte server-side examples keep query state outside the grid, query deterministic tickets through shared server-side ticket helpers, pass the server result page as `data`, and feed the grid controlled state plus `pageCount`. The shared server-side ticket, grouping, and tree helpers also normalize malformed pagination query state by resolving negative or non-finite page indexes to the first page and non-positive or non-finite page sizes to `1` before calculating page counts or slicing rows. Their result objects include the normalized `pageIndex` and `pageSize` used for slicing so product-owned UI state can display or reconcile the server-accepted pagination values; the React, Vue, and Svelte server-side ticket, server grouping, and server tree examples display page labels and drive pagination controls from those normalized result values.

Manual grouping follows the same product-owned query model. With `manualGrouping`, core does not synthesize grouped rows. Product or server code owns the grouped response shape, keeps `grouping` and `expanded` in controlled state, and returns rows that can be expanded through `getSubRows` and `getRowCanExpand`. The React, Vue, and Svelte server grouping examples use shared server grouping helpers for stable server group ids, filtering, sorting, expansion hydration, grouping row aggregation, and pagination, then reset expansion when grouping changes and send sorting, filtering, grouping, expanded group ids, and pagination through one query object.

Server-driven lazy trees follow the same ownership split. Product code keeps `expanded`, loading ids, loaded children, load errors, cancelled loads, refresh counts, mutating work ids, mutation counts, mutation errors, branch merge counts, work merge counts, merge conflicts, retry actions, sorting, pagination, and selection state outside core, then passes the current server page back as rows with loaded `children`. `getRowCanExpand` lets unloaded parent rows expose expansion controls before children exist, while `getSubRows` hands loaded children to the shared expansion and descendant-selection pipelines. Loading, cancellation, stale-response guards, retries, single-branch refresh, bulk loaded-branch refresh, server child mutations, optimistic rollback, paginated mutation conflicts, conflict recovery, remote merge policy, and streaming are product/server responsibilities rather than core state. The React, Vue, and Svelte server tree examples use shared server tree helpers for deterministic portfolio/work fixtures, top-level sorting and pagination, loading/error child placeholders, work row mutation/merge labels, and server tree status formatting, while keeping async request state, cancellation, rollback, recovery, merge policy, and `DataGrid` wiring in each framework example. They use `AbortController` plus request ids to cancel collapsed loads, replace refreshed child requests, refresh every currently loaded branch as one product action, commit a loaded child mutation in product state, roll back a rejected optimistic child mutation, record a branch-version conflict while the loaded branch is paged out, recover by clearing the mutation error and reloading that branch, apply a remote branch patch while keeping locally mutated work as a product-owned merge conflict, preserve accepted merged work through later lazy refreshes, and ignore late responses. `examples/shared-server/src/framework-tree-examples` provides typed Next.js page/route-handler, Nuxt page/server-route, and SvelteKit load/+server examples for the same ownership split: page models own sorted/paginated top-level rows, clamp malformed page/pageSize query params before slicing, and hydrate expanded children, while children routes return private no-store JSON payloads for lazy branches.

Row grouping, aggregation, and expansion are core pipeline features. Grouping state is an ordered list of leaf column ids, grouped rows expose `groupingColumnId`, `groupingValue`, `subRows`, `leafRows`, `getIsGrouped()`, and `getCanExpand()`, and aggregation is resolved through column `aggregationFn` values. Products can call `grid.moveGroupingColumn()` to reorder grouping depth without owning grouping state normalization. Setting `groupFooterMode: "expanded"` attaches non-selectable aggregate footer rows to expanded groups; footer rows expose `getIsGroupFooter()`, `groupFooterFor`, and aggregate `getValue()` output from the same aggregation functions. `grid.getGroupedRowModel()` preserves the grouped tree, while `grid.getExpandedRowModel()` flattens the currently expanded rows before pagination. Renderers can choose how to display group rows, group footers, and expansion controls without owning the grouping algorithm.

Tree data uses the same row contract as grouping. Products pass `getSubRows` to build nested core rows from hierarchical data; child rows receive `depth`, `parentId`, `subRows`, `leafRows`, and `getCanExpand()` from core. If `getRowId` is provided, it receives the parent row for nested ids; otherwise core generates path-based ids such as `0.1.2`. Products can also pass `getRowCanExpand` so lazy-loaded tree parents show expansion controls before sub rows are loaded. Tree filtering preserves matching ancestor paths and prunes non-matching siblings, while tree sorting applies recursively to siblings at each depth. The shared expansion pipeline flattens expanded tree rows before pagination for client-owned trees, so React, Vue, and Svelte UIs can render tree expanders without owning tree state. By default tree parent selection is self-scoped; setting `rowSelectionMode: "descendants"` makes expandable tree rows select, report, and prune by their leaf descendants.

Grouped selection is also resolved in core. Selecting a grouped row toggles the grouped row's leaf row ids rather than storing synthetic group row ids in selection state, and grouped row selected state is derived from whether all leaf rows are selected. Page, filtered, selected-row, and prune helpers use the same leaf-row-aware semantics.

Grouped headers are modeled in core as header groups with `colSpan`, `rowSpan`, placeholder state, and leaf column ids. Renderers can then decide how to clip those groups for virtualization without recomputing column-tree semantics.

## Adapters

Framework adapters connect the core engine to each framework's reactivity model:

- React: hooks and external-store subscription
- Vue: composables, refs, getters, and scope disposal
- Svelte: readable option stores plus explicit disposal

Adapters should be thin. If a behavior can be tested without a renderer, it belongs in core.

Adapters must keep grid options current when framework inputs change. React updates options during render, Vue accepts `MaybeRefOrGetter<GridOptions<TData>>`, and Svelte accepts either static options or a readable options store.

The Vue and Svelte UI packages render the same core `HeaderGroup`, `Column`, row, expansion, selection, and virtualization models as the React UI. They should stay thin renderer layers over shared core semantics.

## Primitives

React, Vue, and Svelte `DataGrid` renderers expose an `ariaLabel` API with a `Data grid` fallback and pass product-specific names into the shared semantic grid props. Chromium accessibility-tree coverage verifies that this renderer-neutral name contract reaches the same semantic scroller as the row and column coordinates.

Primitives expose unstyled DOM prop helpers, accessibility defaults, and small shared DOM interaction helpers. They can use DOM-facing attribute names, but they should avoid owning business logic. Shared renderer mechanics such as grid root role/count/focus attributes, grid header/body/empty/spacer structure attributes, body column-order marker attributes, header cell layout attributes, header button and sort indicator attributes/text, header keyboard move direction, row layout marker attributes, virtual row position, virtual body height, shared inline-size style calculation, group indentation style calculation, and pinned-column offset style calculation, row and column virtualization option type contracts and resolution, cell layout marker attributes, focused-cell restoration selector, focused-cell DOM focus helpers, structural element id focus helpers, focused-cell scroll restoration calculation and DOM position helper, grouping panel labels/states/control/empty-placeholder attributes, header placeholder attributes, roving tabindex, selected row/cell accessibility attributes, fill handle marker attributes, cell coordinate equality checks, cell editor labels/states/options/autofocus, selectable-editor text selection, and React/Vue structural editor target value extraction, cell edit value parsing, focused-cell edit start guards, cell edit cancel guards, grid keyboard shortcut edit-state guards, cell pointer drag start guards, range/fill/header pointer drag continuation guards, range/header pointer drag end guards, header drag end action decisions and action type guards for grouping-panel drops versus column reorders, focused row-selection target lookup, cell editor keyboard action detection, structural validation message roles, row-expander toggle labels/states/text and spacer hidden state, column layout total width calculation, column layout id lookup map creation, column id lookup, visible and grouped column move helpers, browser clipboard text IO helpers and default environment adapters, browser export file download helper and default environment adapters, column resize handle role/value attributes, column resize start, pointer, final, and keyboard target sizing, column pinning control labels and button states/text, header action menu trigger/popover/item labels/states/text/default-action labels, header action menu default item descriptors, header action menu action/custom/label/separator item narrowing and custom item user-prop fallback, header action menu focus movement and active-element resolution, menu focus target extraction and structural target type guarding, and direct/id-based structural trigger focus restoration helpers, header action menu keyboard action detection and action type guards, pointer hit testing, pointer drag movement threshold detection, pointer drag movement state updates, pointer capture target extraction, structural guard, and handling, pointer move/up/cancel listener cleanup and default target adapters, focused-cell scroll option extraction, scroll-frame element option extraction, element offset block-size fallback, React/Vue passive scroll listener cleanup, measured element structural target guards plus block-size-from-rect and inline-size plus structural ResizeObserver entry block-size, inline-size, shared ResizeObserver creation, structural dataset target guard and id lookup/setting/resolution, and measured-size cache application, primary pointer button and active-drag detection, post-drag cell and header click suppression state, default-prevention-only event isolation, prevented event default reflection, default-prevention and propagation-stop event isolation, propagation-stop-only event isolation, virtual size offset calculation, grid Enter/Escape edit action detection, grid copy/paste/row-selection shortcut action detection, grid keyboard focus movement detection, and grid-level shortcut target isolation plus keyboard event target wrappers, including contenteditable and ARIA input-role editor isolation, should live here when they only translate core state into DOM props or renderer-neutral DOM behavior.

Grid row coordinates follow the [WAI-ARIA grid and table properties practice](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/). Because the root always exposes `aria-rowcount`, shared primitives include every header row and the rendered empty-state row in known client totals, put `aria-rowindex` on every header/body row and body cell, and offset body coordinates by the current page. Manual pagination exposes `aria-rowcount="-1"` because `pageCount` does not prove the exact final row count; renderers still expose the current page offset so assistive technology receives stable logical positions without a fabricated total.

ResizeObserver creation, element collection observation, observed-element replacement/removal, and observer cleanup also live in primitives so React, Vue, and Svelte create, re-register, replace, remove, and disconnect virtual row/column measurement observers through the same renderer-neutral map and observer updates.

Row and column id lookup helpers also live in primitives so renderer-owned grouping and edit-start flows do not duplicate collection search behavior.

Column index lookup helpers also live in primitives so header menu move-state and cell metadata calculations keep the same missing-column semantics across renderers.

Compact renderer escaping is also a primitive boundary. `escapeGridHtml(...)` converts ampersands, less-than signs, and double quotes to numeric entities. Svelte uses only renderer-owned literal attribute names and escapes every dynamic row id, column id, product class, style, and display value while producing ordinary flat read-only rows, so product values and class hooks are never treated as markup. Interactive editing, range/fill, grouping, and tree cells retain framework-owned templates, while delegated compact events recover context from the serialized primitive row/column attributes.

Optional per-column filter controls are renderer-owned UI over core filtering state. React, Vue, and Svelte expose `columnFilterControls`, render the row from the same virtualized and pinned column layout as headers and cells, and atomically update `columnFilters` while resetting `pagination.pageIndex`. Shared primitives own filter cell/input attributes, text extraction, immutable filter-state updates, and the additional header-row contribution to WAI-ARIA row coordinates.

Optional quick filter controls are a search landmark outside the grid-owned row structure. React, Vue, and Svelte expose `quickFilterControl`, atomically update core `globalFilter` while resetting `pagination.pageIndex`, return virtual scroll to the first row, and provide a clear action. Shared primitives own the search/input/button labels, value, disabled state, placeholder, and visible clear text.

Optional row selection controls are a toolbar group outside the grid-owned row structure. React, Vue, and Svelte expose `rowSelectionControls`, read current-page and selected-row models from core, toggle only the current page, and clear selection through core APIs. Shared primitives own the checkbox mixed-state attributes, live selected-count text, clear-button semantics, and DOM `indeterminate` assignment; renderers only bind those contracts to their native elements.

Optional pagination controls are rendered as a sibling navigation landmark instead of being inserted into the grid's owned row structure. React, Vue, and Svelte expose `paginationControls` and `pageSizeOptions`, consume core boundary APIs, and return the virtual scroller to the first row after navigation or page-size changes. Shared primitives own navigation/button/status/select labels, visible button and page text, and normalized page-size option lists.

Loading remains renderer-owned presentation rather than core row-model state. React, Vue, and Svelte expose `loading` and `loadingState`, keep the current rows mounted, mark the grid root with shared `aria-busy` semantics, and render an overlay status as a root child outside the scroll frame so it remains visible while virtual content scrolls. Shared primitives own the busy attribute, live status attributes, and default loading text; products own request state and may replace the visible loading content.

Request errors follow the same renderer-owned boundary. React, Vue, and Svelte expose `error`, `errorState`, and `onRetry`; an active error supersedes loading, removes the busy state, marks the root with `data-error`, preserves mounted rows, and renders an assertive alert with an optional retry button. Shared primitives own the alert, retry button, labels, and default text, while products own the error value and decide what retry does.

Focused-cell restoration attempt guards live in primitives when they only decide whether a renderer should attempt restoration. React, Vue, and Svelte still own their scheduling, retry loops, scroll-frame state writes, and DOM focus timing.

## Theme

`@open-grid/theme` owns the stable CSS custom-property names, base light/dark values, and framework-neutral runtime mapping helpers. Base variables are declared on a styled `.og-grid` root or on a standalone semantic `[data-open-grid]`, but not redeclared on the semantic scroller nested inside a styled root; this lets one root override cover renderer controls and grid content. `createOpenGridThemeStyle` returns a custom-property object for React/Vue root style integration, while `createOpenGridThemeCssText` serves string-only style attributes such as Svelte's. Both validate the same known token-key contract, and products should select separate light/dark maps when contrast differs. Styled UI components remain optional and built on top of primitives; the surrounding product shell remains application-owned.

## React UI

`@open-grid/react-ui` is the first reference UI. It is intentionally built on top of `@open-grid/core`, `@open-grid/react`, `@open-grid/primitives`, and CSS variables.

The package exposes separate style boundaries for its two renderer surfaces:
`@open-grid/react-ui/css` covers the feature-complete `DataGrid`, while
`@open-grid/react-ui/virtual.css` contains only the lean fixed-height
`VirtualDataGrid` shell. Applications should import the stylesheet matching the
renderer entry so unused full-renderer interaction styles do not enter the minimal
bundle.

React UI is allowed to own React-specific rendering details, but interaction rules such as sorting, focus movement, row selection, column resize lifecycle events, column sizing, and pinning layout must continue to flow through core.

Column pinning updates are normalized in core. A column can only belong to one pinning side, duplicate ids are removed, and renderers consume the resulting layout offsets instead of recalculating sticky positions independently. Column layout is partitioned as left-pinned, center, then right-pinned columns; hidden pinned columns do not contribute to pinned offsets.

React, Vue, and Svelte UI packages can render optional header pinning controls through `columnPinningControls`. These controls only call `grid.pinColumn(columnId, "left" | "right" | false)`; sticky offsets, duplicate removal, hidden-column handling, and center-column virtualization remain core/layout responsibilities.

React, Vue, and Svelte UI packages can also render an optional `headerActionMenu`. The menu is renderer-owned composition around existing core APIs for sorting, grouping, ordering, sizing, and pinning; it must not introduce separate column semantics that bypass core state normalization. Products can pass `headerActionMenuItems(context)` to reuse, filter, replace, or append the renderer's `defaultItems` while still receiving the normalized `grid`, `column`, sort, pinning, grouping, and move-state context. Product-owned action items may update product state and call core APIs, such as applying a design-token column width through `grid.setColumnSize(...)`; products can also include non-button `type: "label"`, `type: "separator"`, and `type: "custom"` items to compose design-system menu sections and custom preview slots without adding focusable actions. React and Vue custom items use render callbacks, while Svelte custom items render a supplied component with props. The UI package still owns only menu rendering, focus movement, and item invocation. Menu keyboard navigation is renderer-owned DOM behavior around those same item definitions and should keep focus movement on enabled `menuitem` actions instead of labels, separators, or custom slots.

React, Vue, and Svelte UI packages measure mounted virtual rows by row id and feed those sizes back into `@open-grid/virtual`. The measured-size cache is renderer-owned DOM behavior; core still owns row identity, row ordering, and the row model.

`@open-grid/virtual` owns framework-neutral virtualization calculations such as initial scroll frames, row virtual range helpers, scroll-frame normalization, virtual ranges, measured-size caches, sized column layout resolution, measured column layout cache application, measured layout signature/cache sync, measured column layout recalculation, virtual row item mapping, focused-cell render-window checks, center-column render item partitioning, body-cell render item flattening with boundary spacer sizes, grouped header render item clipping, render item key helpers, and render item spacer type guards. React, Vue, and Svelte should consume those helpers so mounted row windows, pinned-left, virtualized-center, spacer, pinned-right column ordering, measured-width cache invalidation, virtualized focused-cell checks, virtualized render keys, and virtualized grouped-header spans cannot drift between renderers. Full-grid body rows render only actual cells and apply virtual before/after space as margins on boundary center cells; headers retain structural spacers for grouped-span clipping.

Column visibility updates are also normalized in core. Hidden columns are represented with `false`, while visible columns are omitted from visibility state so controlled and uncontrolled state stay compact.

React, Vue, and Svelte UI packages can render optional searchable visibility controls through `columnVisibilityControls`. The renderer owns only the native details menu, search query, checkbox presentation, live count, and final-visible-column guard; every visibility change and reset still calls `grid.toggleColumnVisibility(...)` or `grid.resetColumnVisibility()` so controlled state normalization remains in core.

React, Vue, and Svelte UI packages also share an optional density contract. `densityControl` owns only the compact/standard/comfortable segmented control, while `defaultDensity` supports uncontrolled initialization and `density` plus `onDensityChange` supports product-controlled preferences. Density remains renderer presentation state rather than core grid data state. Shared primitives own labels, pressed state, root markers, and row-height values; renderers clear measured virtual-row caches when the value changes so CSS sizing and virtual offsets remain aligned. Grids that do not opt into a density prop or control retain their existing CSS variables and virtualization estimates.

Persisted grid preferences remain product-owned rather than core state side effects. `@open-grid/primitives` exposes a versioned `GridPreferences` JSON contract and guarded browser-storage helpers, re-exported by each UI package. The contract includes only column visibility, sizing, order, pinning, and renderer density. Parsing filters unknown column ids through a product allowlist, removes duplicate ids and left/right pinning conflicts, rejects invalid sizes and unsupported schema versions, normalizes invalid density values, prevents a restored allowlist from hiding every column, and treats unavailable or denied browser storage as a no-op. Sorting, filters, grouping, expansion, pagination, selection, focus, editing, and cell ranges are deliberately excluded because they describe a working session rather than a durable product preference. Product-provided migrations are sequential and forward-only; missing, duplicate, malformed, future, or throwing steps reject the payload before current-schema normalization.

Column sizing updates are clamped in core against each column definition's `minSize` and `maxSize`. Renderers should call core sizing APIs instead of duplicating sizing constraints.

Viewport fitting is also a tree-shakeable core sizing operation.
`fitColumnsToWidth(grid, width, { columnIds? })` scales current visible-column sizes proportionally, repeatedly
fixes columns that reach min/max bounds, and redistributes the remaining width.
Renderers and products own how available DOM width is measured and when the command
runs; core remains DOM-free. Hidden, unknown, duplicate, and unselected columns do
not receive new sizing entries, and impossible target widths resolve to the selected
columns' aggregate bounds rather than violating definitions.

Column ordering updates are normalized in core against visible leaf column ids. Duplicate ids and unknown ids are removed, grouped headers are rebuilt from the ordered leaf sequence, and renderers should call core move/reset APIs for runtime reordering controls.

Products can compose advanced visibility, ordering, pinning, persistence, and preference-reset controls outside the UI packages by owning the relevant grid state and passing it back into `DataGrid`. The built-in visibility menu covers the common show/hide workflow; the React, Vue, and Svelte reference examples retain product-owned advanced column management panels for locked columns, ordering, pinning, persistence, and product defaults. Their Playwright coverage verifies reset restores hidden managed columns, sizing, ordering, pinning, and density defaults, removes the persisted value, and keeps those defaults after reload.

## Non-Negotiables

- Server-side mode is first-class.
- Virtualization is a core concern, not an example-only feature.
- Focus and cell coordinates are represented in state from the beginning.
- Package outputs must be SSR-safe and tree-shakeable.

## Default Multi-Filter Fast Path

Flat filtering may use independent bounded matchers when every active column-filter
rule uses the default filter. The row passes only when each matcher succeeds, in
rule order, so the fast path preserves the public AND contract and can stop after
the first miss. Primitive match results are cached per rule for repeated low-cardinality
values and each cache disables itself once it sees more than 64 distinct values.
Objects and functions are never cached because their string conversion can be
observable. Custom filters, mixed default/custom rules, grouped rows, and tree rows
continue through the general filtering path.

## Minimal React Virtual Row Shape

The separately tree-shakeable React `VirtualDataGrid` renders cells directly inside
each memoized virtual row. It deliberately does not add a second memoized cell-list
component: a deep scroll replaces the complete mounted row window, so that component
could not reuse work and instead added one React mount boundary per row. Row-level
memoization remains the state-update boundary for selection and stable column
descriptors remain shared by every mounted row.

Fixed-height row range calculation and center-column render-item calculation remain
in `@open-grid/virtual`. Pinned widths are subtracted from the center viewport before
the visible center range is selected; renderers must preserve that invariant when
changing scroll-path allocation or scheduling.

The minimal renderer intentionally keeps explicit row `min-width` and cell
`min-width`/`max-width` constraints alongside their width values. A July 2026
prototype removed those declarations and reduced style mutation counts, but a
two-warm-up/ten-run A/B made five of six small/standard visibility, sizing, and
deep-scroll task medians worse. Mutation count is therefore diagnostic only; fixed
layout constraints may act as browser layout hints and must not be removed without
end-to-end timing evidence.
