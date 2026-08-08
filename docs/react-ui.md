# React UI

`@open-grid/react-ui` is the first optional styled UI package. It validates the shared core contracts in a real renderer without making React a dependency of the core engine.

## Install

```bash
pnpm add @open-grid/core @open-grid/react @open-grid/react-ui @open-grid/theme
```

## Usage

```tsx
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
import { createColumnHelper, DataGrid } from "@open-grid/react-ui";

interface Invoice {
  id: string;
  customer: string;
  status: "draft" | "sent" | "paid";
  amount: number;
}

const column = createColumnHelper<Invoice>();

const columns = [
  column.accessor("customer", { header: "Customer" }),
  column.accessor("status", { header: "Status" }),
  column.accessor("amount", {
    header: "Amount",
    cell: ({ value }) => `$${Number(value ?? 0).toLocaleString()}`,
  }),
];

export function InvoiceGrid({ invoices, onRetry }: { invoices: Invoice[]; onRetry: () => void }) {
  return (
    <DataGrid
      data={invoices}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{
        columnPinning: { left: ["customer"], right: [] },
        pagination: { pageIndex: 0, pageSize: 50 },
      }}
      rowVirtualization={{ enabled: true, estimateRowHeight: 40, overscan: 6 }}
      columnVirtualization={{ enabled: true, overscan: 2 }}
      groupingPanel
      quickFilterControl
      rowSelectionControls
      columnVisibilityControls
      densityControl
      columnFilterControls
      paginationControls
      pageSizeOptions={[25, 50, 100]}
      error={false}
      errorState="Invoice service is unavailable."
      onRetry={onRetry}
      loading={false}
      loadingState="Refreshing invoices..."
    />
  );
}
```

## High-Throughput Read-Only Grid

Use the separate `@open-grid/react-ui/virtual` entry when a fixed-height analytics
or monitoring grid needs the smallest renderer and does not need the full
interaction surface:

```tsx
import { createColumnHelper, VirtualDataGrid } from "@open-grid/react-ui/virtual";

const getInvoiceId = (invoice: Invoice) => invoice.id;

export function InvoiceAnalytics({ invoices }: { invoices: Invoice[] }) {
  return (
    <VirtualDataGrid
      ariaLabel="Invoice analytics"
      data={invoices}
      columns={columns}
      getRowId={getInvoiceId}
      rowHeight={40}
      rowOverscan={5}
      columnOverscan={5}
    />
  );
}
```

`VirtualDataGrid` retains controlled/uncontrolled core sorting, filtering and
pagination, sortable leaf headers, pinned columns, custom header/cell renderers,
product row/header/cell class hooks, semantic row/column coordinates, and fixed-size
row/column virtualization. It deliberately excludes grouped-header rendering,
editing, selection, expansion controls, column menus/resizing, clipboard/fill,
overlays, and keyboard cell navigation. Choose the full `DataGrid` for those
workflows. Keep `data`, `columns`, `getRowId`, and other model callback references
stable when their semantics have not changed.

The fixed-size range excludes rows beginning exactly at the viewport end. Center
columns are placed directly at their virtual offsets instead of adding spacer DOM
inside every row; pinned columns keep their sticky offsets.

The virtual stylesheet applies strict CSS containment to the semantic scroller.
Give the grid an explicit available size through its containing flex or block
layout; containment bounds layout, paint, style, and size work to that scrolling
surface without changing row or column virtualization semantics.

## Included Behavior

- The styled shell keeps product controls and overlays outside the semantic `role="grid"` scroller. `pnpm e2e:smoke` audits the React reference UI with Axe WCAG A/AA rules and checks a real CSV download, the primary keyboard toolbar/menu/grid/edit-cancel flow with computed visible-focus indicators including Tab entry on the grid root, 390px reflow with every expanded column-manager command inside the viewport, a 640x450/DPR 2 zoom-equivalent layout, internal horizontal scrolling, reduced-motion loading feedback, and forced-colors focus, selection, disabled, loading, error, retry, and invalid-edit cues. Actual Chrome 200% zoom, 390 CSS pixel, and keyboard-only reviews passed on 2026-07-20; keep manual screen-reader and platform high-contrast review in the release checklist.
- Pass `quickFilterControl` to search all globally filterable leaf columns, reset pagination and virtual scroll, and render an accessible clear action. Set `enableGlobalFiltering: false` on a column to exclude it or provide `globalFilterFn` for custom matching.
- Pass `rowSelectionControls` to select or clear all rows on the current page, expose the native checkbox mixed state, announce the loaded selected-row count, and explicitly clear selection through the core model.
- Pass `columnVisibilityControls` to render a searchable native details menu with a live visible-column count, per-column checkboxes, and a show-all action. The final visible column stays checked and disabled so the grid cannot become structurally empty.
- Pass `densityControl` to render an accessible segmented control for `compact`, `standard`, and `comfortable` row density. Use `defaultDensity` for uncontrolled initial state, or pair `density` with `onDensityChange` for controlled product preferences. Virtualized row measurements are reset when density changes.
- Use the re-exported `getBrowserGridPreferencesStorage`, `readGridPreferences`, `writeGridPreferences`, and `removeGridPreferences` helpers around controlled `state`, `density`, `onStateChange`, and `onDensityChange` props when preferences must survive reloads. Pass every current leaf id through `validColumnIds`; the versioned payload keeps only visibility, sizing, order, pinning, and density, and excludes transient query, selection, focus, and edit state. The React reference example includes restore and explicit reset behavior.
- The React reference example keeps its product-owned light/dark choice in a separate guarded storage key, applies `data-og-theme` to the application ancestor, and passes a mode-specific `createOpenGridThemeStyle(...) as CSSProperties` result to the grid root. Browser smoke verifies accent, focus, and radius tokens reach the semantic grid in both modes without coupling theme selection to the grid-preference schema.
- Pass `getRowClassName` to derive a product class from the core `Row`; the first-publish example marks non-grouped high-risk rows and changes `--og-surface` through semantic theme tokens so the treatment follows light and dark modes.
- Pass `getHeaderClassName` to derive a product class from the core `HeaderContext`, including the grid, column, and rendered header. The first-publish example marks the risk header without replacing its sorting, pinning, resizing, grouping, or menu behavior.
- Pass `getCellClassName` to derive a class from the core `CellContext`, including the grid, row, column, and value. The first-publish example combines it with `className` and assigns explicit Paid, Sent, Draft, Overdue, low, medium, and high classes to render text-preserving semantic markers with light, dark, and forced-colors treatment while retaining the standard editor, selection, focus, and virtualization behavior. Shared smoke metadata binds those row/value/class expectations to automated and manual release evidence.
- Pass `columnFilterControls` to render a per-column search row. Inputs update core `columnFilters`, reset the page index, follow pinned and virtualized columns, and contribute to shared WAI-ARIA row coordinates.
- Pass `paginationControls` to render first/previous/next/last navigation, a live page status, and a rows-per-page select. Configure the select with `pageSizeOptions`; page transitions use bounded core APIs and reset the virtual scroller to the first row.
- Pass `loading` to mark the grid busy and show an accessible overlay while preserving the current rows. Use `loadingState` for product-owned status content.
- Pass `error` to supersede loading and show an accessible alert while preserving the current rows. Use `errorState` for product-owned content and `onRetry` to render and handle the retry button.

- Click headers to cycle sorting.
- Shift-click headers to multi-sort.
- Define nested column groups with `column.group(...)`; React UI renders grouped headers above leaf headers.
- Click a row to toggle selection state.
- Use `onRowEvent` and `onCellEvent` for framework-neutral interaction callbacks; call `event.preventDefault()` to suppress default row selection.
- Set `enableEditing: true` on editable leaf columns to use the default cell editor.
- Add `editOptions: [{ value, label }]` to an editable column to render a select editor; select edits use the same parser, validation, and `onCellEdit` commit flow as text edits.
- Press Enter on the focused editable cell, or double-click it, to start editing; Enter or blur commits, and Escape cancels.
- Use `onCellEdit` for framework-neutral start/commit/cancel callbacks; commit events carry the new `value` and previous value, and product code owns data updates.
- Pass `editHistoryLimit={100}` to retain up to 100 accepted edit transactions. Outside an active editor, Ctrl/Meta+Z calls `grid.undoCellEdit()`, while Ctrl/Meta+Shift+Z and Ctrl+Y call `grid.redoCellEdit()`; paste and fill are each undone as one transaction.
- Undo/redo replay uses the same validation and preventable `onCellEdit` commit path with `event.historyAction`. Commits prevented for async server approval are not retained in local history.
- Use `onGridReady` to receive the styled grid's live `Grid<TData>` after mount. The callback may return cleanup; the reference example passes that instance to `useGridSelector(...)`, so its accessible Undo2/Redo2 toolbar tracks history depth through React's external-store contract without rerendering for unrelated grid notifications and invokes the same API as keyboard shortcuts.
- Use `editValueParser` on a column to coerce input text before commit, such as turning numeric strings into numbers.
- Use `validateEditValue` on a column for synchronous validation; invalid commits expose `event.validation`, are default-prevented, keep the editor open, and React UI renders the validation message.
- Check `event.defaultPrevented` before mutating product-owned data in `onCellEdit`.
- Use core selection helpers to read or toggle loaded rows, filtered rows, or current page rows separately.
- Use `grid.pruneRowSelection("loaded" | "filtered" | "page")` when a product should explicitly drop selections outside a data scope.
- Grid root role, row/column counts, one-based header/body/cell row indexes, empty-state coordinates, and pagination row offsets come from shared primitive props, matching Vue and Svelte UI. Client totals include header rows, while manual pagination uses `aria-rowcount="-1"` rather than guessing the server total.
- Header sort indicators receive shared primitive hidden props and visible text, matching Vue and Svelte UI.
- Selected rows receive shared primitive `aria-selected` and `data-selected` props, matching Vue and Svelte UI.
- Press Space on a focused cell to toggle selection for that row; `onRowEvent` can prevent the keyboard selection by preventing the emitted `keydown` row event.
- Use core grouping APIs such as `grid.setGrouping(["role"])`, `grid.toggleColumnGrouping("role")`, `grid.toggleRowExpanded(rowId)`, and column `aggregationFn`; React UI renders grouped rows with expander controls and aggregate cells from the shared row model.
- Set `groupFooterMode: "expanded"` to render aggregate footer rows after expanded grouped children.
- Enable `groupingPanel` to show grouped-column chips, drag leaf column headers into the panel to group, and reorder grouped columns from the panel controls.
- Grouping panel empty placeholder props and message come from shared primitives, matching Vue and Svelte UI.
- Expander buttons receive shared primitive type, label, `aria-expanded`, `data-row-id`, and `data-expanded` props, matching Vue and Svelte UI.
- Column pinning control buttons receive shared primitive type, label, visible text, pressed state, and disabled state props, matching Vue and Svelte UI.
- Header action menu triggers receive shared primitive type, label, visible text, expanded state, popup role, and menu control props, matching Vue and Svelte UI.
- Header action menu popovers receive shared primitive menu role, label, and focus target props, matching Vue and Svelte UI.
- Header action menu action, custom, label, and separator items receive shared primitive roles, disabled/label props, and default action labels, matching Vue and Svelte UI.
- Header action menu focus movement, keyboard action detection, and grid-level shortcut target isolation use shared primitive DOM utilities, matching Vue and Svelte UI.
- Placeholder grouped header cells receive shared primitive presentation, hidden, and column-id props, matching Vue and Svelte UI.
- Fill handles receive shared primitive hidden and `data-fill-handle` props, matching Vue and Svelte UI.
- Cell editors receive shared primitive edit label, invalid-state, and select option props, and direct editor Enter/Escape commit/cancel action detection comes from shared primitives, matching Vue and Svelte UI.
- Expander buttons receive shared primitive type, label, visible text, `aria-expanded`, `data-row-id`, and `data-expanded` props, matching Vue and Svelte UI.
- Focus grouped or tree expander buttons and press Enter or Space to expand/collapse; these button key events are isolated from grid-level edit and row-selection shortcuts.
- Pass `getSubRows` for tree data; React UI renders nested rows with the same expansion state and hierarchy expander controls.
- Pass `getRowCanExpand` when lazy-loaded tree parents should show expanders before their child rows are present.
- Set `rowSelectionMode: "descendants"` when expandable tree rows should select and report their leaf descendants instead of only the parent row.
- Clicking a grouped row selects or clears its leaf rows through the shared core row selection model.
- Use `manualSorting`, `manualFiltering`, `manualPagination`, controlled state, and `pageCount` for server-side data workflows.
- Use arrow keys, Home, End, PageUp, PageDown, Ctrl/Meta+Home, and Ctrl/Meta+End to move the focused cell coordinate.
- Playwright coverage verifies keyboard focus restoration when these keys move the focused cell outside the current virtualized row or column window.
- Playwright coverage verifies Space toggles row selection from the focused cell without moving focus.
- Primitive coverage verifies grid root, grid structure/body column-order marker, header cell layout, header button/sort indicator props and text, header keyboard move direction, row layout, virtual row position style calculation, row and column virtualization option type contracts and resolution, cell layout, focused-cell restoration selector, focused-cell DOM focus helpers, structural element id focus helpers, focused-cell scroll position helper, scroll-frame and focused-cell scroll element option helpers, focused-cell scroll restoration calculation, grouping panel, grouping panel empty placeholder, header placeholder, selected row, selected-cell range attributes, row-expander toggle props/text/spacer, fill handle, cell coordinate equality checks, cell editor/structural validation message, cell editor option props, cell editor autofocus, cell edit value parsing, focused-cell edit start guard, cell edit cancel guard, grid keyboard shortcut edit-state guard, cell pointer drag start guard, range/fill/header pointer drag continuation guard, range/header pointer drag end guard, header drag end action decisions, browser clipboard text IO and default environment adapters, browser export file downloads and default environment adapters, cell editor keyboard action detection, column layout total width calculation, column layout id lookup map creation, visible-column and grouped-column move helpers, column resize handle, resize start sizing, pointer resize target sizing, final resize sizing, resize start/apply default-prevention guards, and keyboard resize target sizing, column pinning controls/button props and text, header menu trigger props and text, header menu popover, header menu item accessibility attributes, default labels, and default item descriptors, header menu structural enabled-item selector with active-element resolution and aria-disabled exclusion, focus movement, focus-result reporting, focus target extraction and structural target type guarding, and direct/id-based structural trigger focus restoration helpers, header menu keyboard action detection, grid keyboard edit action detection, grid keyboard shortcut action detection, grid keyboard focus movement detection, focused row-selection target lookup, virtual size offset calculation, measured element structural target guards plus block-size-from-rect and inline-size, element offset block-size fallback, plus structural ResizeObserver entry block-size, shared ResizeObserver creation, structural dataset target guard and id lookup/setting/resolution, measured-size cache application, and React center-column inline-size resolution, pointer drag movement threshold detection, pointer drag movement state updates, pointer capture target extraction and structural guard helpers, pointer move/up/cancel listener cleanup and default target adapters, focused-cell scroll option extraction, scroll-frame option extraction, and passive scroll listener cleanup, primary pointer button and active-drag detection, post-drag cell and header click suppression state, default-prevention-only event isolation, prevented event default reflection, default-prevention and propagation-stop event isolation, propagation-stop-only event isolation, and grid shortcut target isolation selector including contenteditable and ARIA input-role editor targets are produced from shared helpers.
- React creates ResizeObservers through shared support detection, re-registers already mounted virtual row and center-column measurement elements, replaces/removes measured elements, and disconnects observers through shared primitive observation helpers.
- React gates focused-cell restoration attempts and frame-sync cancellation through shared primitives while keeping requestAnimationFrame scheduling and focus timing local; external scroll/resize synchronization cancels stale requests, while restoration-owned scrolling preserves the active request until focus returns.
- React checks focused-cell row/column render-window presence through shared `@open-grid/virtual` helpers before restoring DOM focus.
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
- Use `clipboardPasteOptions={{ maxCells, maxCellsMode }}` to block or truncate large built-in paste operations.
- Use `onClipboardPaste` to surface the structured paste result in product UI.
- Paste and fill workflows use the same `validateEditValue` semantics as direct editing.
- Use `cellFillOptions={{ maxCells, maxCellsMode, fillMode }}` to configure built-in fill handles.
- Use core `grid.getExportText({ format: "csv", rowScope: "pre-pagination", includeHeaders: true })` for framework-neutral CSV/TSV export strings.
- Add `maxRows` and `maxRowsMode: "block" | "truncate"` to core export options when browser downloads should be limited to a safe client-side size.
- Use core `grid.getExportFile(...)` or `createExportFile(...)` for filename, extension, MIME type, and optional byte-order-mark metadata.
- Use `downloadExportFile(file)` from `@open-grid/react-ui` to trigger a browser download from a core `ExportFile`; the DOM Blob/object-URL work is shared through primitives, and large or server-owned datasets should still generate files server-side or stream outside the grid instead of relying on loaded rows.
- Use `grid.fillCellRange(end)` to trigger fill behavior from custom handles.
- Pass `{ fillMode: "series" }` to `grid.fillCellRange(...)` when custom handles should continue numeric, numeric-string, or trailing-number text series instead of copying values.
- Add `maxCells` and `maxCellsMode: "block" | "truncate"` to `grid.fillCellRange(...)` options when custom handles should guard large fill ranges.
- Focused cells use roving tabindex props from `@open-grid/primitives`, keeping only the active cell in the tab order.
- Drag the resize handle at the right edge of a header cell to resize a column.
- Focus the resize handle and use ArrowLeft/ArrowRight to resize with the keyboard; hold Shift for larger steps. Home/End snap to column min/max when configured.
- Playwright coverage verifies React keyboard resize handles grow with ArrowRight, grow by a larger shared step with Shift+ArrowRight, shrink with ArrowLeft, and snap to min/max with Home/End.
- Use core APIs such as `grid.toggleColumnVisibility(columnId)` and `grid.resetColumnVisibility()` for runtime show/hide controls.
- Playwright coverage verifies the React product-owned column management panel resets hidden managed columns back to visible while restoring ordering and pinning defaults.
- Playwright coverage verifies the shared visibility menu searches columns, hides a column through core state, updates its live count, restores every column, and renders an explicit no-results state.
- Use core APIs such as `grid.setColumnSize(columnId, size)` and `grid.resetColumnSizing()` for runtime resize controls.
- Import the re-exported `fitColumnsToWidth` and call `fitColumnsToWidth(grid, availableWidth)` from `onGridReady` or a custom renderer toolbar to proportionally fit visible columns while honoring every `minSize` and `maxSize`. Pass `columnIds` as the third argument to fit a visible subset without changing other column sizes.
- Use `onColumnResize` for framework-neutral resize lifecycle callbacks; call `event.preventDefault()` on `start` or `move` to suppress default resize behavior.
- Use `columnPinning` state to pin visible columns.
- Use core APIs such as `grid.pinColumn(columnId, "left" | "right" | false)` and `grid.setColumnPinning(...)` for runtime pinning.
- Enable `columnPinningControls` to render header controls for pin left, unpin, and pin right.
- The first-publish React example keeps pinning in its header action menu and product column panel so leaf labels remain readable; the React server-side example opts into direct controls, and Playwright verifies their active, opposite, and unpinned states.
- Enable `headerActionMenu` to render a leaf-header menu for sorting, ordering, pinning, and grouping actions.
- Pass `headerActionMenuItems={(context) => [...]}` to reuse `context.defaultItems` or replace them with product-owned action items that call core APIs through `context.grid` and `context.column`.
- Header action menus also accept non-button `{ type: "label" }`, `{ type: "separator" }`, and `{ type: "custom", render }` items for design-system menu sections and custom preview slots.
- Header action menus support ArrowDown/ArrowUp/Home/End item navigation across enabled actions; labels and separators are skipped. Escape closes the menu and returns focus to the trigger.
- Playwright coverage verifies React header action menus open from triggers with ArrowDown/ArrowUp, move through enabled actions with ArrowDown/ArrowUp/End/Home while skipping non-action items, and close with Tab.
- Use `columnOrder` state or core APIs such as `grid.moveColumn(columnId, targetColumnId, "before" | "after")` and `grid.resetColumnOrder()` to reorder visible leaf columns.
- Drag a leaf header onto another leaf header to reorder visible columns.
- Focus a leaf header and press Shift+Alt+ArrowLeft/ArrowRight to move that column in the visible order.
- Enable `rowVirtualization` to render only the visible row window for large datasets.
- Virtualized rows are measured by row id, so variable row heights can refine the estimated scroll range after render.
- Set `rowVirtualization.measureRowHeight` to `false` when rows have a guaranteed fixed height; the renderer then uses `estimateRowHeight` without per-row ResizeObserver measurement.
- Keep data-model callbacks such as `getRowId` referentially stable for large controlled grids. A changed callback is treated as a semantic model change and correctly invalidates cached core rows.
- Pinned left/right columns stay sticky during horizontal scrolling, are rendered around the center column area, and expose pinned-edge styling hooks.
- Sticky headers and pinned cells are covered under row virtualization and combined horizontal scrolling.
- Row and column virtualization share `@open-grid/virtual` initial scroll frames, row virtual range helpers, and scroll-frame normalization, including sticky header offsets.
- Enable `columnVirtualization` to render only visible center columns while keeping pinned left/right columns mounted.
- Virtualized center columns are measured by column id, and grouped headers are rendered from the same measured layout as body cells.
- Set `columnVirtualization.measureColumnWidth` to `false` only when every virtualized leaf column has a guaranteed explicit width. The renderer then uses the core sized layout without header `getBoundingClientRect`, registering headers with a column ResizeObserver, or measured-width cache allocation; resizing and dynamic CSS widths require the default measured mode.
- Virtualized body rows do not mount per-row spacer elements. The first and last rendered center cells carry the shared before/after virtual space as margins, preserving pinned order and header alignment with fewer DOM nodes.
- Grouped headers are rendered against the current virtualized leaf-column window so header and body columns stay aligned.
- Keyboard focus automatically scrolls virtualized rows and columns into view before restoring DOM focus.
- Playwright coverage exercises large row/column counts at scroll extremes, including sticky headers, pinned columns, virtualized header/body alignment, and expandable tree rows.

## Styling

The component uses semantic CSS variables from `@open-grid/theme`. Product apps can override surface, border, text, accent, danger, sizing, radius, shadow, and motion variables on the `.og-grid` root through CSS or the `style` prop. `@open-grid/theme/tokens` provides `createOpenGridThemeStyle` for validated product-owned values; cast its framework-neutral result to React `CSSProperties`. Set `data-og-theme="dark"` on the grid or an ancestor for bundled dark defaults; the surrounding product shell remains application-owned.
