# Svelte UI

`@open-grid/svelte-ui` is the first styled Svelte UI package for Open Grid. It reuses the shared core, Svelte store adapter, unstyled primitives, and CSS-variable theme contract used by the React and Vue UI packages.

## Install

```bash
pnpm add @open-grid/core @open-grid/svelte @open-grid/svelte-ui @open-grid/theme
```

## Usage

```svelte
<script lang="ts">
  import "@open-grid/theme/css";
  import "@open-grid/svelte-ui/css";
  import { createColumnHelper, DataGrid, type GridOptions } from "@open-grid/svelte-ui";

  interface Person {
    id: string;
    name: string;
    role: string;
  }

  const column = createColumnHelper<Person>();

  const options: GridOptions<Person> = {
    data: [
      { id: "1", name: "Mina", role: "Owner" },
      { id: "2", name: "Joon", role: "Editor" },
    ],
    columns: [
      column.accessor("name", { header: "Name" }),
      column.accessor("role", { header: "Role" }),
    ],
    getRowId: (row) => row.id,
  };

  function retryPeople() {
    // Re-run the product request here.
  }
</script>

<DataGrid
  {options}
  quickFilterControl={true}
  rowSelectionControls={true}
  columnVisibilityControls={true}
  densityControl={true}
  columnFilterControls={true}
  paginationControls={true}
  pageSizeOptions={[25, 50, 100]}
  error={false}
  errorState="People service is unavailable."
  onRetry={retryPeople}
  loading={false}
  loadingState="Refreshing people..."
/>
```

## Included Behavior

- The styled shell keeps product controls and overlays outside the semantic `role="grid"` scroller. `pnpm e2e:smoke` audits the Svelte reference UI with Axe WCAG A/AA rules and checks a real CSV download, the primary keyboard toolbar/menu/grid/edit-cancel flow with computed visible-focus indicators including Tab entry on the grid root and DOM focus restoration after Escape, 390px reflow with every expanded column-manager command inside the viewport, a 640x450/DPR 2 zoom-equivalent layout, internal horizontal scrolling, reduced-motion loading feedback, and forced-colors focus, selection, disabled, loading, error, retry, and invalid-edit cues. Actual Chrome 200% zoom, 390 CSS pixel, and keyboard-only reviews passed on 2026-07-20; keep manual screen-reader and platform high-contrast review in the release checklist.
- Pass `quickFilterControl={true}` to search all globally filterable leaf columns, reset pagination and virtual scroll, and render an accessible clear action. Set `enableGlobalFiltering: false` on a column to exclude it or provide `globalFilterFn` for custom matching.
- Pass `rowSelectionControls={true}` to select or clear all rows on the current page, expose the native checkbox mixed state, announce the loaded selected-row count, and explicitly clear selection through the core model.
- Pass `columnVisibilityControls={true}` to render a searchable native details menu with a live visible-column count, per-column checkboxes, and a show-all action. The final visible column stays checked and disabled so the grid cannot become structurally empty.
- Pass `densityControl={true}` to render an accessible segmented control for `compact`, `standard`, and `comfortable` row density. Use `defaultDensity` for uncontrolled initial state, or pair `density` with `onDensityChange` for controlled product preferences. Virtualized row measurements are reset when density changes.
- Use the re-exported `getBrowserGridPreferencesStorage`, `readGridPreferences`, `writeGridPreferences`, and `removeGridPreferences` helpers around controlled `options.state`, `density`, `options.onStateChange`, and `onDensityChange` props when preferences must survive reloads. Pass every current leaf id through `validColumnIds`; the versioned payload keeps only visibility, sizing, order, pinning, and density, and excludes transient query, selection, focus, and edit state. The Svelte reference example includes restore and explicit reset behavior.
- The Svelte reference example keeps its product-owned light/dark choice in a separate guarded storage key, applies `data-og-theme` to the application ancestor, and merges a mode-specific `createOpenGridThemeCssText(...)` result into the string-only grid root `style`. Browser smoke verifies accent, focus, and radius tokens reach the semantic grid in both modes without coupling theme selection to the grid-preference schema.
- Pass `getRowClassName` to derive a product class from the core `Row`; the first-publish example marks non-grouped high-risk rows and changes `--og-surface` through semantic theme tokens so the treatment follows light and dark modes. The maintained Svelte declaration exposes this callback and the runtime `ariaLabel` prop.
- Pass `getHeaderClassName` to derive a product class from the core `HeaderContext`, including the grid, column, and rendered header. The first-publish example marks the risk header without replacing its sorting, pinning, resizing, grouping, or menu behavior, and the maintained declaration covers the callback.
- Pass `getCellClassName` to derive a class from the core `CellContext`, including the grid, row, column, and value. The first-publish example combines it with the forwarded root `class` prop and assigns low, medium, and high risk classes to render text-preserving semantic markers with light, dark, and forced-colors treatment while retaining the standard editor, selection, focus, and virtualization behavior. The maintained declaration covers the complete styling contract.
- Pass `columnFilterControls={true}` to render a per-column search row. Inputs update core `columnFilters`, reset the page index, follow pinned and virtualized columns, and contribute to shared WAI-ARIA row coordinates.
- Pass `paginationControls={true}` to render first/previous/next/last navigation, a live page status, and a rows-per-page select. Configure the select with `pageSizeOptions`; page transitions use bounded core APIs and reset the virtual scroller to the first row.
- Pass `loading={true}` to mark the grid busy and show an accessible overlay while preserving the current rows. Use `loadingState` for product-owned status content.
- Pass `error={true}` to supersede loading and show an accessible alert while preserving the current rows. Use `errorState` for product-owned content and `onRetry` to render and handle the retry button.
- Renders grouped headers from the shared core header model.
- Keeps the internal grid store synchronized when the `options` prop changes before derived row models are read, so controlled sorting, filtering, pagination, grouping, and server-owned data pages can be driven by product Svelte state.
- Click leaf headers to cycle sorting; Shift-click enables multi-sort.
- Click rows to toggle row selection through the shared row event contract.
- Use core grouping APIs such as `grid.setGrouping(["role"])`, `grid.toggleColumnGrouping("role")`, `grid.toggleRowExpanded(rowId)`, and column `aggregationFn`; Svelte UI renders grouped rows with expander controls and aggregate cells from the shared row model.
- Set `groupFooterMode: "expanded"` to render aggregate footer rows after expanded grouped children.
- Set `groupingPanel={true}` to show grouped-column chips, drag leaf column headers into the panel to group, and reorder grouped columns from the panel controls.
- Grouping panel empty placeholder props and message come from shared primitives, matching React and Vue UI.
- Expander buttons receive shared primitive type, label, `aria-expanded`, `data-row-id`, and `data-expanded` props, matching React and Vue UI.
- Column pinning control buttons receive shared primitive type, label, visible text, pressed state, and disabled state props, matching React and Vue UI.
- Header action menu triggers receive shared primitive type, label, visible text, expanded state, popup role, and menu control props, matching React and Vue UI.
- Header action menu popovers receive shared primitive menu role, label, and focus target props, matching React and Vue UI.
- Header action menu action, custom, label, and separator items receive shared primitive roles, disabled/label props, and default action labels, matching React and Vue UI.
- Header action menu focus movement, keyboard action detection, and grid-level shortcut target isolation use shared primitive DOM utilities, matching React and Vue UI.
- Placeholder grouped header cells receive shared primitive presentation, hidden, and column-id props, matching React and Vue UI.
- Fill handles receive shared primitive hidden and `data-fill-handle` props, matching React and Vue UI.
- Cell editors receive shared primitive edit label, invalid-state, and select option props, and direct editor Enter/Escape commit/cancel action detection comes from shared primitives, matching React and Vue UI.
- Expander buttons receive shared primitive type, label, visible text, `aria-expanded`, `data-row-id`, and `data-expanded` props, matching React and Vue UI.
- Focus grouped or tree expander buttons and press Enter or Space to expand/collapse; these button key events are isolated from grid-level edit and row-selection shortcuts.
- Pass `getSubRows` for tree data; Svelte UI renders nested rows with the same expansion state and hierarchy expander controls.
- Pass `getRowCanExpand` when lazy-loaded tree parents should show expanders before their child rows are present.
- Set `rowSelectionMode: "descendants"` when expandable tree rows should select and report their leaf descendants instead of only the parent row.
- Clicking a grouped row selects or clears its leaf rows through the shared core row selection model.
- Grid root role, row/column counts, one-based header/body/cell row indexes, empty-state coordinates, and pagination row offsets come from shared primitive props, matching React and Vue UI. Client totals include header rows, while manual pagination uses `aria-rowcount="-1"` rather than guessing the server total.
- Header sort indicators receive shared primitive hidden props and visible text, matching React and Vue UI.
- Uses roving tabindex cell props from `@open-grid/primitives`.
- Selected rows receive shared primitive `aria-selected` and `data-selected` props, matching React and Vue UI.
- Press Space on a focused cell to toggle selection for that row; `onRowEvent` can prevent the keyboard selection by preventing the emitted `keydown` row event.
- Supports keyboard focus movement with arrow keys, Home, End, PageUp, PageDown, Ctrl/Meta+Home, and Ctrl/Meta+End.
- Playwright coverage verifies keyboard focus restoration when these keys move the focused cell outside the current measured row or column virtualization window.
- Playwright coverage verifies Space toggles row selection from the focused cell without moving focus.
- Primitive coverage verifies grid root, grid structure/body column-order marker, header cell layout, header button/sort indicator props and text, header keyboard move direction, row layout, virtual row position style calculation, row and column virtualization option type contracts and resolution, cell layout, focused-cell restoration selector, focused-cell DOM focus helpers, structural element id focus helpers, focused-cell scroll position helper, scroll-frame and focused-cell scroll element option helpers, focused-cell scroll restoration calculation, grouping panel, grouping panel empty placeholder, header placeholder, selected row, selected-cell range attributes, row-expander toggle props/text/spacer, fill handle, cell coordinate equality checks, cell editor/structural validation message, cell editor option props, cell editor autofocus, cell edit value parsing, focused-cell edit start guard, cell edit cancel guard, grid keyboard shortcut edit-state guard, cell pointer drag start guard, range/fill/header pointer drag continuation guard, range/header pointer drag end guard, header drag end action decisions, browser clipboard text IO and default environment adapters, browser export file downloads and default environment adapters, cell editor keyboard action detection, column layout total width calculation, column layout id lookup map creation, column id lookup, visible-column and grouped-column move helpers, column resize handle, resize start sizing, pointer resize target sizing, final resize sizing, resize start/apply default-prevention guards, and keyboard resize target sizing, column pinning controls/button props and text, header menu trigger props and text, header menu popover, header menu item accessibility attributes, default labels, default item descriptors, action/custom/label/separator item guards, and custom item user props, header menu structural enabled-item selector with active-element resolution and aria-disabled exclusion, focus movement, focus-result reporting, focus target extraction and structural target type guarding, and direct/id-based structural trigger focus restoration helpers, header menu keyboard action detection, grid keyboard edit action detection, grid keyboard shortcut action detection, grid keyboard focus movement detection, focused row-selection target lookup, virtual size offset calculation, measured element structural target guards plus block-size-from-rect and inline-size, element offset block-size fallback, plus structural ResizeObserver entry block-size, shared ResizeObserver creation, structural dataset target guard and id lookup/setting/resolution, and measured-size cache application, pointer drag movement threshold detection, pointer drag movement state updates, pointer capture target extraction and structural guard helpers, pointer move/up/cancel listener cleanup and default target adapters, primary pointer button and active-drag detection, post-drag cell and header click suppression state, default-prevention-only event isolation, prevented event default reflection, default-prevention and propagation-stop event isolation, propagation-stop-only event isolation, and grid shortcut target isolation selector including contenteditable and ARIA input-role editor targets are produced from shared helpers.
- Row and column id lookups for grouping column resolution and edit-start row/column resolution use shared primitive helpers.
- Column index lookups for header and body cell metadata use shared primitive helpers.
- Svelte creates ResizeObservers through shared support detection, re-registers already mounted virtual row and center-column measurement elements, replaces/removes measured elements, and disconnects observers through shared primitive observation helpers.
- Svelte gates focused-cell restoration attempts and frame-sync cancellation through shared primitives while keeping `tick` scheduling, retry state, and focus timing local; concurrent restore attempts are blocked, external scroll/resize synchronization cancels stale requests, and restoration-owned scrolling preserves the active request until focus returns.
- Svelte focused-cell scroll restoration uses the same measured center-column layout as header/body rendering so cached measured widths, pinned offsets, and virtualized center-column scroll targets stay aligned.
- Virtual coverage verifies sized column layout resolution, measured column layout cache application, measured layout signature/cache sync, center-column render item calculation, body-cell flattening with boundary spacer sizes, render item keys, and spacer item guards. Full-grid body rows render only cells and carry virtual center space on the boundary cells while headers retain structural spacers for grouped spans.
- Virtual coverage verifies grouped header render item calculation, render item keys, and spacer item guards preserve spacers and measured header spans through shared `@open-grid/virtual` helpers.
- Virtual coverage verifies row virtual ranges map to mounted row items from shared `@open-grid/virtual` helpers.
- Playwright coverage verifies grouped expander Enter/Space keys expand and collapse without toggling row selection.
- Hold Shift while using focus movement keys to extend the cell range selection.
- Playwright coverage verifies Shift+Home, Shift+End, Shift+PageDown, Shift+Ctrl/Meta+Home, and Shift+Ctrl/Meta+End range extension across row, page, and grid boundaries.
- Drag across visible cells with the pointer to select a cell range.
- Drag the fill handle on the selected range corner to fill adjacent editable cells.
- Press Ctrl/Meta+C to copy the selected cell range, or the focused cell when no range is active, as TSV text.
- Use column `clipboardValue`, grid `getClipboardCellValue`, or `grid.getClipboardText({ includeHeaders: true })` to customize clipboard output.
- Press Ctrl/Meta+V to paste TSV text into editable cells starting from the selected range or focused cell.
- Use `grid.pasteClipboardText(text)` to trigger the same editable-cell commit events from custom paste controls; it returns attempted, committed, skipped, and validation-error cell summaries.
- Set `clipboardPasteOptions={{ maxCells, maxCellsMode }}` to block or truncate large built-in paste operations.
- Set `onClipboardPaste` to surface the structured paste result in product UI.
- The Svelte grouped example renders a product-owned paste summary bar from `onClipboardPaste`, and Playwright coverage verifies the attempted, committed, skipped, and validation counts after an async server-owned paste.
- Paste and fill workflows use the same `validateEditValue` semantics as direct editing.
- Set `cellFillOptions={{ maxCells, maxCellsMode, fillMode }}` to configure built-in fill handles.
- Use core `grid.getExportText({ format: "csv", rowScope: "pre-pagination", includeHeaders: true })` for framework-neutral CSV/TSV export strings.
- Add `maxRows` and `maxRowsMode: "block" | "truncate"` to core export options when browser downloads should be limited to a safe client-side size.
- Use core `grid.getExportFile(...)` or `createExportFile(...)` for filename, extension, MIME type, and optional byte-order-mark metadata.
- Use `downloadExportFile(file)` from `@open-grid/svelte-ui` to trigger a browser download from a core `ExportFile`; the DOM Blob/object-URL work is shared through primitives, and large or server-owned datasets should still generate files server-side or stream outside the grid instead of relying on loaded rows.
- Use `grid.fillCellRange(end)` to trigger fill behavior from custom handles.
- Pass `{ fillMode: "series" }` to `grid.fillCellRange(...)` when custom handles should continue numeric, numeric-string, or trailing-number text series instead of copying values.
- Add `maxCells` and `maxCellsMode: "block" | "truncate"` to `grid.fillCellRange(...)` options when custom handles should guard large fill ranges.
- Set `enableEditing: true` on editable leaf columns to use the default cell editor.
- Add `editOptions: [{ value, label }]` to an editable column to render a select editor; select edits use the same parser, validation, and `onCellEdit` commit flow as text edits.
- Press Enter on the focused editable cell, or double-click it, to start editing; Enter or blur commits, and Escape cancels.
- Use `onCellEdit` for framework-neutral start/commit/cancel callbacks; product code owns data updates.
- Set `options.editHistoryLimit` to a positive number to retain bounded accepted edit transactions. Outside an active editor, Ctrl/Meta+Z undoes, while Ctrl/Meta+Shift+Z and Ctrl+Y redo; paste and fill are each replayed as one transaction.
- Undo/redo uses the same validation and preventable `onCellEdit` path with `event.historyAction`. Commits prevented for async server approval are not retained in local history.
- Use `onGridReady` to receive the styled grid's live `Grid<TData>` after mount. The callback may return cleanup; the grouped example returns `grid.subscribeSelector(...)` with `fireImmediately` so its accessible Undo2/Redo2 toolbar tracks history depth without updating for unrelated grid notifications and invokes the same API as keyboard shortcuts. `DataGridProps`, `GridReadyHandler`, menu types, and virtualization option types are available from the package root.
- Import the re-exported `fitColumnsToWidth` and call `fitColumnsToWidth(grid, availableWidth)` with that live instance or the Svelte adapter's `grid` to proportionally fit visible columns while preserving min/max constraints. Pass `columnIds` as the third argument to fit only a product-selected visible subset.
- Use `validateEditValue` on a column for synchronous validation; invalid commits expose `event.validation`, are default-prevented, keep the editor open, and Svelte UI renders the validation message.
- Playwright coverage verifies the Svelte grouped example keeps the City editor open, marks it invalid, renders the validation alert, and avoids the async server save path for invalid direct edits.
- Check `event.defaultPrevented` before mutating product-owned data in `onCellEdit`.
- Drag the resize handle at the right edge of a leaf header cell to resize a column.
- Focus the resize handle and use ArrowLeft/ArrowRight to resize with the keyboard; hold Shift for larger shared steps. Home/End snap to column min/max when configured.
- Playwright coverage verifies Svelte keyboard resize handles grow with ArrowRight, grow by a larger shared step with Shift+ArrowRight, shrink with ArrowLeft, and snap to min/max with Home/End.
- Drag a leaf header onto another leaf header to reorder visible columns.
- Focus a leaf header and press Shift+Alt+ArrowLeft/ArrowRight to move that column in the visible order.
- Playwright coverage verifies Svelte keyboard cell focus movement and focused-header Shift+Alt column reordering.
- Emits the same preventable `onColumnResize` start/move/end lifecycle events as the core, React UI, and Vue UI.
- Enable `rowVirtualization` to render only the visible row window for large datasets.
- Virtualized rows are measured by row id, so variable row heights can refine the estimated scroll range after render.
- Set `rowVirtualization.measureRowHeight` to `false` when rows have a guaranteed fixed height; the renderer then uses `estimateRowHeight` without per-row ResizeObserver measurement.
- Keep data-model callbacks such as `getRowId` referentially stable for large controlled grids. A changed callback is treated as a semantic model change and correctly invalidates cached core rows.
- Enable `columnVirtualization` to render only visible center columns while keeping pinned left/right columns mounted.
- Virtualized center columns are measured by column id, and grouped headers are rendered from the same measured layout as body cells.
- Set `columnVirtualization.measureColumnWidth` to `false` only when every virtualized leaf column has a guaranteed explicit width. Svelte then uses the core sized layout without header `getBoundingClientRect`, registering headers with a column ResizeObserver, or measured-width cache allocation; resizing and dynamic CSS widths require the default measured mode.
- Ordinary flat read-only rows share one body-level compact render branch instead of retaining a branch and edit, fill-handle, range-selection, and grouped-cell condition anchors in every mounted row or cell. Editing, range selection, and grouped/tree rows switch to the detailed branch; a single-cell pointer gesture defers that switch through `click` so row and cell click handlers keep the same DOM target and event order.
- The compact read-only path delegates focus, pointer, click, and double-click handling once at the body boundary and emits one combined cell attribute object. Primitive row/column data attributes recover the originating context, including row-background clicks. It also resolves the virtual window's column objects and visible indexes once for all mounted rows, while detailed editing, range/fill, grouped, and tree cells retain direct handlers.
- Compact cells are emitted as one escaped HTML string per mounted row instead of one keyed Svelte block per cell. Attribute names are renderer-owned literals, and the shared `escapeGridHtml` primitive escapes every dynamic row id, column id, product class, style, and display value, so product values and class hooks cannot inject markup and the output remains SSR-compatible. Roving focus resolves the mounted row and column indexes before updating only the previous and next compact DOM cells; switching to editing, range/fill, grouped, or tree rendering hands focus attributes back to the detailed Svelte branch.
- When virtual rows use a guaranteed fixed height, the row measurement action returns no inactive update/destroy payload. Enabling measured row height retains the complete ResizeObserver registration, row-id update, and cleanup lifecycle.
- Leaf-only header groups use a compact sort/drag/resize path when `columnPinningControls` and `headerActionMenu` are both disabled. Grouped or placeholder headers and either advanced header control keep the complete detailed path, including custom menu content and pinning behavior.
- Virtualized body rows do not instantiate a column-or-spacer branch for every rendered item. Only actual cells are keyed, and the first and last center cells carry shared before/after virtual margins; this preserves pinned/header alignment while reducing Svelte anchors and per-row spacer DOM.
- Keeps grouped header spans aligned with virtualized body cells and center-column spacers.
- Applies core column pinning layout as sticky left/right column styles.
- Playwright coverage verifies pinned left/right header positions stay aligned with the scroller while center columns are horizontally virtualized.
- Set `columnPinningControls={true}` to render header controls for pin left, unpin, and pin right.
- Playwright coverage verifies the Svelte product-owned column management panel resets hidden managed columns back to visible while restoring ordering and pinning defaults.
- Playwright coverage verifies the shared visibility menu searches columns, hides a column through core state, updates its live count, restores every column, and renders an explicit no-results state.
- The first-publish Svelte example keeps pinning in its header action menu and product column panel so leaf labels remain readable; the Svelte server-side example opts into direct controls, and Playwright verifies their active, opposite, and unpinned states.
- Set `headerActionMenu={true}` to render a leaf-header menu for sorting, ordering, pinning, and grouping actions.
- Set `headerActionMenuItems={(context) => [...]}` to reuse `context.defaultItems` or replace them with product-owned action items that call core APIs through `context.grid` and `context.column`.
- Header action menus also accept non-button `{ type: "label" }`, `{ type: "separator" }`, and `{ type: "custom", component, props }` items for design-system menu sections and custom component preview slots.
- Header action menus support ArrowDown/ArrowUp/Home/End item navigation across enabled actions; labels and separators are skipped. Escape closes the menu and returns focus to the trigger.
- Playwright coverage verifies Svelte header action menus open from triggers with ArrowDown/ArrowUp, move through enabled actions with ArrowDown/ArrowUp/End/Home while skipping non-action items, and close with Tab.
- Uses the same `og-grid` CSS classes and semantic `@open-grid/theme` variables as the React and Vue UI packages, including descendant-safe `data-og-theme="dark"` defaults. Static product CSS can target `.og-grid`; runtime values can use the validated `createOpenGridThemeCssText` adapter from `@open-grid/theme/tokens` through Svelte's string-only root `style` prop. Product shells remain application-owned.

## Current Scope

This package intentionally starts with the shared styled grid surface. Keep future renderer hardening aligned with React and Vue UI behavior.
