import type { Column, Grid, Row } from "@open-grid/core";
import type {
  ElementIdLookupLike,
  HeaderActionMenuFocusTargetLike,
  HeaderActionMenuItemFocusTargetLike,
  ResizeObserverConstructorLike,
} from "../src/index";
import { describe, expect, it } from "vitest";
import {
  addPassiveScrollListener,
  addPointerMoveUpCancelListeners,
  addPointerMoveUpListeners,
  addPointerUpCancelListeners,
  applyResizeObserverMeasuredSizes,
  createClickSuppressionController,
  createGridLocalization,
  createResizeObserver,
  disconnectResizeObserver,
  focusCellEditorElement,
  focusElement,
  focusElementById,
  focusFocusedCellInGrid,
  focusHeaderActionMenuItem,
  focusHeaderActionMenuItemById,
  focusHeaderActionMenuTrigger,
  focusHeaderActionMenuTriggerById,
  GRID_FOCUSED_CELL_SELECTOR,
  GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR,
  GRID_DENSITIES,
  DEFAULT_GRID_LOCALIZATION,
  GRID_PREFERENCES_VERSION,
  GROUPING_PANEL_EMPTY_MESSAGE,
  HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR,
  HEADER_ACTION_MENU_TRIGGER_TEXT,
  getCellEditorKeyboardAction,
  getCellEditorEventValue,
  getCellEditorOptionProps,
  getCellEditorOptionText,
  getCellEditorProps,
  getCellEditorTargetValue,
  getCellDisplayText,
  getCellEditText,
  getCellEditValidationMessage,
  getCellFillHandleProps,
  getCellFillHandleVisible,
  getCellLayoutProps,
  getCellProps,
  getCellValidationMessageProps,
  getCanApplyColumnResize,
  getCanCancelCellEdit,
  getCanContinuePointerDrag,
  getCanEndPointerDrag,
  getCanRestoreFocusedCell,
  getShouldCancelFocusedCellRestoreOnFrameSync,
  getCanRunGridKeyboardShortcut,
  getCanStartColumnResize,
  getCanStartCellPointerDrag,
  getCanStartFocusedCellEdit,
  getCanStartCellEdit,
  getCanToggleRowSelection,
  downloadBrowserExportFile,
  getColumnById,
  getColumnIndexById,
  getColumnLayoutById,
  getColumnLayoutTotalWidth,
  getColumnHeaderText,
  getColumnFilterCellProps,
  getColumnFilterInputProps,
  getColumnFilterText,
  getColumnVisibilityCheckboxProps,
  getColumnVisibilityControlsProps,
  getColumnVisibilityEmptyText,
  getColumnVisibilityListProps,
  getColumnVisibilityResetButtonProps,
  getColumnVisibilityResetButtonText,
  getColumnVisibilitySearchInputProps,
  getColumnVisibilityStatusProps,
  getColumnVisibilityStatusText,
  getColumnVisibilitySummaryProps,
  getColumnVisibilitySummaryText,
  getFilteredColumnVisibilityColumns,
  getDensityButtonProps,
  getDensityButtonText,
  getDensityControlsProps,
  getGridDensityProps,
  getGridDensityRowHeight,
  getBrowserGridPreferencesStorage,
  getColumnSpacerProps,
  getColumnPinningButtonProps,
  getColumnPinningButtonText,
  getColumnPinningControlsProps,
  getColumnResizeFinalSize,
  getColumnResizeHandleProps,
  getColumnResizeKeyboardSize,
  getColumnResizePointerSize,
  getColumnResizeStartSize,
  getDefaultBrowserDownloadEnvironment,
  getDefaultClipboardTextEnvironment,
  getDefaultPointerMoveUpCancelListenerTarget,
  getDefaultPointerMoveUpListenerTarget,
  getDefaultPointerUpCancelListenerTarget,
  getElementOffsetBlockSize,
  getGridBodyProps,
  getGridBodyRowIndexOffset,
  getGridEmptyCellProps,
  getGridEmptyRowProps,
  getFocusedRowSelectionTarget,
  getFocusedCellScrollOptionsFromElement,
  getGridProps,
  getGridHeaderProps,
  getGridHeaderRowCount,
  getGridHeaderRowProps,
  getGridKeyboardEditAction,
  getGridKeyboardFocusMove,
  getGridKeyboardShortcutAction,
  getGridErrorOverlayProps,
  getGridErrorRetryButtonProps,
  getGridErrorRetryButtonText,
  getGridErrorText,
  getGridLoadingOverlayProps,
  getGridLoadingText,
  getNextColumnFilters,
  getPaginationButtonProps,
  getPaginationButtonText,
  getPaginationPageSizeOptions,
  getPaginationPageSizeOptionText,
  getPaginationPageSizeSelectProps,
  getPaginationPageText,
  getPaginationProps,
  getPaginationStatusProps,
  getQuickFilterClearButtonProps,
  getQuickFilterClearButtonText,
  getQuickFilterInputProps,
  getQuickFilterProps,
  getRowSelectionCheckboxProps,
  getRowSelectionCheckboxText,
  getRowSelectionClearButtonProps,
  getRowSelectionClearButtonText,
  getRowSelectionControlsProps,
  getRowSelectionStatusProps,
  getRowSelectionStatusText,
  normalizeGridDensity,
  createGridPreferences,
  parseGridPreferences,
  readGridPreferences,
  removeGridPreferences,
  serializeGridPreferences,
  writeGridPreferences,
  getMeasuredElementBlockSize,
  getMeasuredElementBlockSizeFromRect,
  getMeasuredElementBlockSizeFromTarget,
  getMeasuredElementInlineSize,
  getPointerCaptureTarget,
  getResizeObserverEntryBlockSize,
  getResizeObserverEntryDatasetId,
  getResizeObserverEntryInlineSize,
  getShouldPreventEventDefault,
  getEnabledHeaderActionMenuItems,
  getGroupCellIndent,
  getGroupCellIndentStyle,
  getGroupCellIndentStyleText,
  getGroupRowCountText,
  getGroupRowLabel,
  getGroupValueText,
  getGroupingPanelChipProps,
  getGroupingPanelMoveButtonProps,
  getGroupingPanelPlaceholderProps,
  getGroupingPanelProps,
  getGroupingPanelRemoveButtonProps,
  getHeaderActionMenuActiveElement,
  getHeaderActionMenuDefaultItemLabel,
  getHeaderActionMenuFocusTarget,
  getHeaderActionMenuId,
  getHeaderActionMenuTriggerId,
  getHeaderActionMenuKeyboardAction,
  getHeaderActionMenuTriggerFocusPosition,
  getHeaderActionMenuCustomItemProps,
  getHeaderActionMenuCustomItemUserProps,
  getHeaderActionMenuItemProps,
  getHeaderActionMenuDefaultItemDescriptors,
  getHeaderActionMenuLabelProps,
  getHeaderActionMenuProps,
  getHeaderActionMenuSeparatorProps,
  getHeaderActionMenuTriggerProps,
  getHeaderButtonProps,
  getHeaderCellLayoutProps,
  getHeaderCellProps,
  getHeaderDragEndAction,
  getHeaderKeyboardMoveDirection,
  getHeaderPlaceholderCellProps,
  getHeaderSortIndicatorProps,
  getHeaderSortIndicatorText,
  getIsGroupLabelCell,
  getInlineSizeStyle,
  getInlineSizeStyleText,
  getPinnedColumnOffsetStyle,
  getPinnedColumnOffsetStyleText,
  getScrollForFocusedCell,
  getSizeOffset,
  getVirtualizedInlineSizeStyle,
  getVirtualizedInlineSizeStyleText,
  getVirtualRowStyle,
  getVirtualRowStyleText,
  getVirtualBodyStyle,
  getVirtualBodyStyleText,
  hasPointerMovedPastDragThreshold,
  isCellCoordinateEqual,
  isHeaderActionMenuActionItem,
  isHeaderActionMenuCloseAction,
  isHeaderActionMenuCustomItem,
  isHeaderActionMenuFocusAction,
  isHeaderActionMenuFocusTarget,
  isHeaderActionMenuItem,
  isHeaderActionMenuLabelItem,
  isHeaderActionMenuSeparatorItem,
  isHeaderActionMenuTabCloseAction,
  isFocusableElement,
  isHeaderDragGroupAction,
  isHeaderDragMoveAction,
  isMeasuredBlockElement,
  isMeasuredBlockRectElement,
  isMeasuredInlineElement,
  isPointerCaptureTarget,
  getRowExpansionSpacerProps,
  getRowExpansionToggleProps,
  getRowExpansionToggleText,
  getRowLayoutProps,
  getRowProps,
  getRowById,
  isGridInteractiveKeyboardEventTarget,
  isGridInteractiveKeyboardTarget,
  isFocusedCell,
  isPointerInsideElement,
  isPrimaryPointerButton,
  isPrimaryPointerDragActive,
  isResizeObserverDatasetTarget,
  moveColumnToTarget,
  moveGroupedColumn,
  moveVisibleColumn,
  observeElements,
  parseCellEditValue,
  preventDefaultAndStopPropagation,
  preventEventDefault,
  readClipboardText,
  escapeGridHtml,
  removeObservedElement,
  replaceObservedElement,
  resolveColumnVirtualizationOptions,
  resolveRowVirtualizationOptions,
  scrollElementToPosition,
  setCheckboxIndeterminate,
  setElementDatasetId,
  getScrollFrameOptionsFromElement,
  stopEventPropagation,
  tryReleasePointerCapture,
  trySetPointerCapture,
  updatePointerDragDidMovePastThreshold,
  writeClipboardText,
} from "../src/index";

interface Person {
  id: string;
  name: string;
}

const row = {
  id: "row-1",
  depth: 0,
  leafRows: [{ id: "row-1" }],
  getValue: (columnId: string) => (columnId === "name" ? "Ada" : undefined),
  getCanExpand: () => false,
  getIsGrouped: () => false,
  getIsGroupFooter: () => false,
} as Row<Person>;

const groupedRow = {
  id: "group:status:active",
  depth: 0,
  groupingColumnId: "status",
  groupingValue: "active",
  leafRows: [{ id: "row-1" }, { id: "row-2" }],
  getValue: () => undefined,
  getCanExpand: () => true,
  getIsGrouped: () => true,
  getIsGroupFooter: () => false,
} as Row<Person>;

const footerRow = {
  id: "group-footer:status:active",
  depth: 1,
  groupingColumnId: "status",
  groupFooterLabel: "Subtotal",
  getValue: () => undefined,
  getCanExpand: () => false,
  getIsGrouped: () => false,
  getIsGroupFooter: () => true,
} as Row<Person>;

const treeRow = {
  id: "tree-row",
  depth: 1,
  getValue: (columnId: string) => (columnId === "name" ? "Ada" : undefined),
  getCanExpand: () => true,
  getIsGrouped: () => false,
  getIsGroupFooter: () => false,
} as Row<Person>;

const nameColumn = {
  id: "name",
  columnDef: { header: "Name" },
  getIsPinned: () => false,
  getCanEdit: () => true,
} as Column<Person, unknown>;

const ageColumn = {
  id: "age",
  columnDef: { header: () => "Age", minSize: 72, maxSize: 240 },
  getSize: () => 120,
  getIsPinned: () => "left",
  getCanEdit: () => false,
} as Column<Person, unknown>;

const grid = {
  getOptions: () => ({ data: [], columns: [] }),
  getState: () => ({ pagination: { pageIndex: 0, pageSize: 25 } }),
  getHeaderGroups: () => [{ id: "header-0", headers: [] }],
  getPrePaginationRowModel: () => ({ rows: [{ id: "row-1" }, { id: "row-2" }] }),
  getVisibleLeafColumns: () => [nameColumn, ageColumn],
  getColumnSortDirection: () => false,
  getPageCount: () => 1,
} as Grid<Person>;

describe("primitives", () => {
  it("merges localization overrides without changing the default dictionary", () => {
    const localization = createGridLocalization({
      noRows: "행이 없습니다",
      selectedRows: (count) => `${count}개 행 선택됨`,
      paginationActionLabel: (action) => ({
        first: "첫 페이지",
        previous: "이전 페이지",
        next: "다음 페이지",
        last: "마지막 페이지",
      })[action],
    });

    expect(localization.noRows).toBe("행이 없습니다");
    expect(getRowSelectionStatusText(2, localization)).toBe("2개 행 선택됨");
    expect(getPaginationButtonProps({ action: "next" }, localization)["aria-label"]).toBe("다음 페이지");
    expect(getGridLoadingText(localization)).toBe("Loading rows...");
    expect(DEFAULT_GRID_LOCALIZATION.noRows).toBe("No rows");
    expect(Object.isFrozen(localization)).toBe(true);
  });
  it("returns accessible grid root props", () => {
    expect(getGridProps(grid)).toMatchObject({
      role: "grid",
      "aria-rowcount": 3,
      "aria-colcount": 2,
      "data-open-grid": true,
      tabIndex: 0,
    });

    expect(getGridHeaderRowCount(grid)).toBe(1);
    expect(getGridBodyRowIndexOffset(grid)).toBe(1);
    expect(getGridHeaderRowCount(grid, { headerRowCount: 3 })).toBe(3);
    expect(getGridBodyRowIndexOffset(grid, { headerRowCount: 3 })).toBe(3);
    expect(getGridHeaderRowCount(grid, { additionalHeaderRowCount: 1.8 })).toBe(2);
    expect(getGridHeaderRowCount(grid, { headerRowCount: 3, additionalHeaderRowCount: 1 })).toBe(4);
    expect(getGridBodyRowIndexOffset(grid, { additionalHeaderRowCount: 1 })).toBe(2);
    expect(getGridProps(grid, { additionalHeaderRowCount: 1 })).toMatchObject({ "aria-rowcount": 4 });
    expect(getGridProps(grid, { ariaLabel: "Invoices" })).toMatchObject({ "aria-label": "Invoices" });
    expect(getGridProps(grid, { loading: true })).toMatchObject({ "aria-busy": true });
    expect(getGridProps(grid, { error: true, loading: true })).toMatchObject({
      "aria-busy": undefined,
      "data-error": true,
    });

    const secondPageGrid = {
      ...grid,
      getState: () => ({ pagination: { pageIndex: 2, pageSize: 25 } }),
    } as Grid<Person>;
    expect(getGridBodyRowIndexOffset(secondPageGrid)).toBe(51);

    const manualGrid = {
      ...grid,
      getOptions: () => ({ data: [], columns: [], manualPagination: true }),
    } as Grid<Person>;
    expect(getGridProps(manualGrid)).toMatchObject({ "aria-rowcount": -1 });

    const emptyGrid = {
      ...grid,
      getPrePaginationRowModel: () => ({ rows: [] }),
    } as Grid<Person>;
    expect(getGridProps(emptyGrid)).toMatchObject({ "aria-rowcount": 2 });
  });

  it("returns shared loading state props and text", () => {
    expect(getGridLoadingOverlayProps()).toEqual({
      role: "status",
      "aria-live": "polite",
      "aria-label": "Loading rows",
    });
    expect(getGridLoadingText()).toBe("Loading rows...");
  });

  it("returns shared error state props and text", () => {
    expect(getGridErrorOverlayProps()).toEqual({
      role: "alert",
      "aria-live": "assertive",
      "aria-atomic": true,
      "aria-label": "Grid error",
    });
    expect(getGridErrorText()).toBe("Unable to load rows.");
    expect(getGridErrorRetryButtonProps()).toEqual({
      type: "button",
      "aria-label": "Retry loading rows",
    });
    expect(getGridErrorRetryButtonText()).toBe("Retry");
  });

  it("returns column filter control props and state updates", () => {
    expect(getColumnFilterCellProps(ageColumn, { columnIndex: 1, rowIndex: 2, pinnedEdge: "left" })).toMatchObject({
      role: "gridcell",
      "aria-colindex": 2,
      "data-column-id": "age",
      "data-pinned": "left",
      "data-pinned-edge": "left",
    });
    expect(getColumnFilterInputProps(nameColumn, { label: "Name", value: "Mina" })).toMatchObject({
      type: "search",
      value: "Mina",
      placeholder: "Filter",
      "aria-label": "Filter Name",
      "data-column-id": "name",
      autoComplete: "off",
    });

    const filters = [{ id: "age", value: "2" }];
    expect(getColumnFilterText(filters, "age")).toBe("2");
    expect(getColumnFilterText(filters, "name")).toBe("");
    expect(getNextColumnFilters(filters, "name", "Mi")).toEqual([
      { id: "age", value: "2" },
      { id: "name", value: "Mi" },
    ]);
    expect(getNextColumnFilters(filters, "age", "3")).toEqual([{ id: "age", value: "3" }]);
    expect(getNextColumnFilters(filters, "age", "")).toEqual([]);
    expect(getNextColumnFilters(filters, "name", "")).toBe(filters);
  });

  it("returns shared quick filter controls", () => {
    expect(getQuickFilterProps()).toEqual({ role: "search", "aria-label": "Search grid rows" });
    expect(getQuickFilterInputProps({ value: "mina" })).toEqual({
      type: "search",
      value: "mina",
      placeholder: "Search rows",
      "aria-label": "Search all rows",
      autoComplete: "off",
    });
    expect(getQuickFilterClearButtonProps("")).toEqual({
      type: "button",
      "aria-label": "Clear row search",
      disabled: true,
    });
    expect(getQuickFilterClearButtonProps("mina")).toEqual({
      type: "button",
      "aria-label": "Clear row search",
      disabled: undefined,
    });
    expect(getQuickFilterClearButtonText()).toBe("Clear");
  });

  it("returns shared row selection controls and mixed checkbox behavior", () => {
    expect(getRowSelectionControlsProps()).toEqual({ role: "group", "aria-label": "Row selection" });
    expect(getRowSelectionCheckboxProps({ someSelected: true })).toEqual({
      type: "checkbox",
      checked: false,
      disabled: undefined,
      "aria-checked": "mixed",
      "aria-label": "Select all rows on current page",
    });
    expect(getRowSelectionCheckboxProps({ allSelected: true })).toMatchObject({
      checked: true,
      "aria-checked": true,
    });
    expect(getRowSelectionCheckboxText()).toBe("Select page");
    expect(getRowSelectionStatusProps()).toEqual({ role: "status", "aria-live": "polite", "aria-atomic": true });
    expect(getRowSelectionStatusText(1)).toBe("1 row selected");
    expect(getRowSelectionStatusText(Number.NaN)).toBe("0 rows selected");
    expect(getRowSelectionClearButtonProps(true)).toEqual({
      type: "button",
      disabled: true,
      "aria-label": "Clear row selection",
    });
    expect(getRowSelectionClearButtonText()).toBe("Clear selection");

    const checkbox = { indeterminate: false };
    expect(setCheckboxIndeterminate(checkbox, true)).toBe(true);
    expect(checkbox.indeterminate).toBe(true);
    expect(setCheckboxIndeterminate(null, true)).toBe(false);
  });

  it("returns shared column visibility controls and filters columns", () => {
    const columns = [nameColumn, ageColumn];

    expect(getColumnVisibilityControlsProps()).toEqual({ "aria-label": "Grid columns" });
    expect(getColumnVisibilitySummaryProps(2, 3)).toEqual({
      "aria-label": "Manage columns, 2 of 3 columns visible",
    });
    expect(getColumnVisibilitySummaryText(5, 3)).toBe("Columns 3/3");
    expect(getColumnVisibilitySearchInputProps("na")).toEqual({
      type: "search",
      value: "na",
      placeholder: "Find columns",
      "aria-label": "Find columns",
      autoComplete: "off",
    });
    expect(getColumnVisibilityListProps()).toEqual({ role: "group", "aria-label": "Column visibility" });
    expect(getColumnVisibilityCheckboxProps({ columnId: "name", label: "Name", visible: true, visibleCount: 1 })).toEqual({
      type: "checkbox",
      checked: true,
      disabled: true,
      "aria-label": "Name",
      "data-column-id": "name",
    });
    expect(getColumnVisibilityCheckboxProps({ columnId: "age", label: "Age", visible: true, visibleCount: 2 })).toMatchObject({ disabled: undefined });
    expect(getColumnVisibilityCheckboxProps({ columnId: "age", label: "Age", visible: false, visibleCount: 1 })).toMatchObject({ disabled: undefined });
    expect(getColumnVisibilityStatusProps()).toEqual({ role: "status", "aria-live": "polite", "aria-atomic": true });
    expect(getColumnVisibilityStatusText(Number.NaN, 3)).toBe("0 of 3 columns visible");
    expect(getColumnVisibilityEmptyText()).toBe("No columns found");
    expect(getColumnVisibilityResetButtonProps(0)).toEqual({ type: "button", disabled: true, "aria-label": "Show all columns" });
    expect(getColumnVisibilityResetButtonProps(1)).toEqual({ type: "button", disabled: undefined, "aria-label": "Show all columns" });
    expect(getColumnVisibilityResetButtonText()).toBe("Show all");
    expect(getFilteredColumnVisibilityColumns(columns, "name").map((column) => column.id)).toEqual(["name"]);
    expect(getFilteredColumnVisibilityColumns(columns, " AGE ").map((column) => column.id)).toEqual(["age"]);
    expect(getFilteredColumnVisibilityColumns(columns, "missing")).toEqual([]);
    expect(getFilteredColumnVisibilityColumns(columns, "")).toEqual(columns);
  });

  it("returns shared row density controls and normalized root state", () => {
    expect(GRID_DENSITIES).toEqual(["compact", "standard", "comfortable"]);
    expect(normalizeGridDensity("compact")).toBe("compact");
    expect(normalizeGridDensity("invalid")).toBe("standard");
    expect(normalizeGridDensity(undefined, "comfortable")).toBe("comfortable");
    expect(getGridDensityProps("comfortable")).toEqual({ "data-density": "comfortable" });
    expect(getGridDensityRowHeight("compact")).toBe(32);
    expect(getGridDensityRowHeight("standard")).toBe(40);
    expect(getGridDensityRowHeight("comfortable")).toBe(48);
    expect(getDensityControlsProps()).toEqual({ role: "group", "aria-label": "Row density" });
    expect(getDensityButtonProps("compact", "standard")).toEqual({
      type: "button",
      "aria-label": "Use compact density",
      "aria-pressed": false,
      "data-density": "compact",
    });
    expect(getDensityButtonProps("standard", "standard")).toMatchObject({ "aria-pressed": true });
    expect(getDensityButtonText("compact")).toBe("Compact");
    expect(getDensityButtonText("standard")).toBe("Standard");
    expect(getDensityButtonText("comfortable")).toBe("Comfortable");
  });

  it("serializes only normalized versioned product preferences", () => {
    const preferences = createGridPreferences({
      columnVisibility: { id: false, owner: false, removed: false },
      columnSizing: { id: 120, owner: Number.NaN, removed: 90 },
      columnOrder: ["owner", "id", "owner", "removed"],
      columnPinning: { left: ["id", "id", "removed"], right: ["id", "owner", "owner"] },
      sorting: [{ id: "owner", desc: true }],
      globalFilter: "transient",
    }, "comfortable", { validColumnIds: ["id", "owner"] });

    expect(preferences).toEqual({
      version: GRID_PREFERENCES_VERSION,
      density: "comfortable",
      state: {
        columnVisibility: { owner: false },
        columnSizing: { id: 120 },
        columnOrder: ["owner", "id"],
        columnPinning: { left: ["id"], right: ["owner"] },
      },
    });
    expect(JSON.parse(serializeGridPreferences(preferences))).not.toHaveProperty("state.sorting");
    expect(JSON.parse(serializeGridPreferences(preferences))).not.toHaveProperty("state.globalFilter");
  });

  it("rejects unsupported preferences and normalizes malformed persisted values", () => {
    expect(parseGridPreferences("not json")).toBeNull();
    expect(parseGridPreferences(JSON.stringify({ version: 2, state: {} }))).toBeNull();
    expect(parseGridPreferences(JSON.stringify({ version: 1, state: null }))).toBeNull();
    expect(parseGridPreferences(JSON.stringify({
      version: 1,
      density: "invalid",
      state: {
        columnVisibility: { id: true, owner: "no", removed: false },
        columnSizing: { id: -10, owner: 144, removed: 80 },
        columnOrder: ["owner", 1, "owner", "removed"],
        columnPinning: { left: ["id", "removed"], right: ["id", "owner"] },
      },
    }), { validColumnIds: ["id", "owner"] })).toEqual({
      version: 1,
      density: "standard",
      state: {
        columnVisibility: { id: true },
        columnSizing: { owner: 144 },
        columnOrder: ["owner"],
        columnPinning: { left: ["id"], right: ["owner"] },
      },
    });
  });

  it("guards browser preference storage reads, writes, removals, and access failures", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };

    expect(getBrowserGridPreferencesStorage({ localStorage: storage })).toBe(storage);
    expect(writeGridPreferences(storage, "grid", { columnOrder: ["owner"] }, "compact", { validColumnIds: ["id", "owner"] })).toBe(true);
    expect(readGridPreferences(storage, "grid", { validColumnIds: ["id", "owner"] })?.density).toBe("compact");
    expect(removeGridPreferences(storage, "grid")).toBe(true);
    expect(readGridPreferences(storage, "grid")).toBeNull();

    const deniedStorage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    };
    const deniedEnvironment = Object.defineProperty({}, "localStorage", {
      get: () => { throw new Error("denied"); },
    });

    expect(getBrowserGridPreferencesStorage(deniedEnvironment)).toBeNull();
    expect(readGridPreferences(deniedStorage, "grid")).toBeNull();
    expect(writeGridPreferences(deniedStorage, "grid", {}, "standard")).toBe(false);
    expect(removeGridPreferences(deniedStorage, "grid")).toBe(false);
  });

  it("returns pagination control props, labels, and page-size options", () => {
    expect(getPaginationProps()).toEqual({ role: "navigation", "aria-label": "Pagination" });
    expect(getPaginationButtonProps({ action: "first", disabled: true })).toEqual({
      type: "button",
      "aria-label": "First page",
      disabled: true,
    });
    expect(getPaginationButtonProps({ action: "next" })).toEqual({
      type: "button",
      "aria-label": "Next page",
      disabled: undefined,
    });
    expect(getPaginationButtonText("first")).toBe("|<");
    expect(getPaginationButtonText("previous")).toBe("<");
    expect(getPaginationButtonText("next")).toBe(">");
    expect(getPaginationButtonText("last")).toBe(">|");
    expect(getPaginationStatusProps()).toEqual({ role: "status", "aria-live": "polite" });
    expect(getPaginationPageText(grid)).toBe("Page 1 of 1");
    expect(getPaginationPageText({ ...grid, getState: () => ({ pagination: { pageIndex: Number.NaN, pageSize: 25 } }) } as Grid<Person>)).toBe("Page 1 of 1");
    expect(getPaginationPageSizeSelectProps(50)).toEqual({ "aria-label": "Rows per page", value: 50 });
    expect(getPaginationPageSizeSelectProps(Number.NaN)).toEqual({ "aria-label": "Rows per page", value: 1 });
    expect(getPaginationPageSizeOptions([100, 25, 50, 25, 0, Number.NaN], 75)).toEqual([25, 50, 75, 100]);
    expect(getPaginationPageSizeOptionText(50)).toBe("50 rows");
  });

  it("returns grid structure props", () => {
    expect(getGridHeaderProps()).toMatchObject({
      role: "rowgroup",
    });

    expect(getGridHeaderRowProps({ columnVirtualized: true })).toMatchObject({
      role: "row",
      "aria-rowindex": 1,
      "data-column-virtualized": true,
    });

    expect(getGridHeaderRowProps({ columnVirtualized: false, rowIndex: 2 })).toMatchObject({
      role: "row",
      "aria-rowindex": 3,
      "data-column-virtualized": undefined,
    });

    expect(getGridBodyProps({ virtualized: true })).toMatchObject({
      role: "rowgroup",
      "data-virtualized": true,
    });

    expect(getGridBodyProps({ virtualized: false, columnOrder: ["name", "age"] })).toMatchObject({
      role: "rowgroup",
      "data-virtualized": undefined,
      "data-column-order": "name,age",
    });

    expect(getGridEmptyRowProps({ rowIndexOffset: 2 })).toMatchObject({
      role: "row",
      "aria-rowindex": 3,
    });

    expect(getGridEmptyCellProps({ rowIndexOffset: 2, columnCount: 4 })).toMatchObject({
      role: "gridcell",
      "aria-colindex": 1,
      "aria-colspan": 4,
    });

    expect(getColumnSpacerProps()).toMatchObject({
      "aria-hidden": true,
    });
  });

  it("returns roving tabindex props for the focused cell", () => {
    expect(getCellProps(row, nameColumn, 2, 1, { focusedCell: { rowId: "row-1", columnId: "name" } })).toMatchObject({
      role: "gridcell",
      "aria-colindex": 2,
      "data-row-id": "row-1",
      "data-column-id": "name",
      tabIndex: 0,
      "data-focused": true,
    });
    expect(GRID_FOCUSED_CELL_SELECTOR).toBe('[role="gridcell"][data-focused="true"]');
  });

  it("keeps non-focused cells out of the tab order", () => {
    expect(getCellProps(row, ageColumn, 0, 0, { focusedCell: { rowId: "row-1", columnId: "name" } })).toMatchObject({
      "data-column-id": "age",
      "data-pinned": "left",
      tabIndex: -1,
      "data-focused": undefined,
    });
  });

  it("returns selected cell range props", () => {
    expect(getCellProps(row, nameColumn, 1, 2, { rangeSelected: true, rowIndexOffset: 3 })).toMatchObject({
      role: "gridcell",
      "aria-colindex": 3,
      "aria-selected": true,
      "data-range-selected": true,
    });

    expect(getCellProps(row, nameColumn, 1, 2, { rangeSelected: false })).toMatchObject({
      "aria-selected": undefined,
      "data-range-selected": undefined,
    });
  });

  it("returns cell layout props", () => {
    expect(getCellLayoutProps({ invalid: true, pinnedEdge: "right" })).toMatchObject({
      "data-validation-invalid": true,
      "data-pinned-edge": "right",
    });

    expect(getCellLayoutProps({ invalid: false })).toMatchObject({
      "data-validation-invalid": undefined,
      "data-pinned-edge": undefined,
    });
  });

  it("returns decorative cell fill handle props", () => {
    expect(getCellFillHandleProps()).toMatchObject({
      "aria-hidden": true,
      "data-fill-handle": true,
    });
  });

  it("returns shared edit and fill-handle visibility decisions", () => {
    expect(getCanStartCellEdit(row, nameColumn)).toBe(true);
    expect(getCanStartCellEdit(row, ageColumn)).toBe(false);
    expect(getCanStartCellEdit(groupedRow, nameColumn)).toBe(false);
    expect(getCanStartCellEdit(footerRow, nameColumn)).toBe(false);
    expect(getCellEditText(null)).toBe("");
    expect(getCellEditText(undefined)).toBe("");
    expect(getCellEditText(12)).toBe("12");
    expect(getCellEditText("draft")).toBe("draft");
    expect(getCellEditorTargetValue({ value: "direct" })).toBe("direct");
    expect(getCellEditorTargetValue({ value: 12 })).toBe(12);
    expect(getCellEditorTargetValue(null)).toBeUndefined();
    expect(getCellEditorTargetValue("not-target")).toBeUndefined();
    expect(getCellEditorEventValue({ currentTarget: { value: "current" }, target: { value: "target" } })).toBe("current");
    expect(getCellEditorEventValue({ target: { value: "target" } })).toBe("target");
    expect(getCellEditorEventValue({ currentTarget: {}, target: { value: "target" } })).toBe("target");
    expect(getCellEditorEventValue({ currentTarget: { value: 12 }, target: { value: null } })).toBe("");
    expect(getCellEditorEventValue({})).toBe("");
    expect(getCellEditValidationMessage(null)).toBeNull();
    expect(getCellEditValidationMessage({ validation: { valid: true } })).toBeNull();
    expect(getCellEditValidationMessage({ validation: { valid: false, message: "Required" } })).toBe("Required");
    expect(getCellEditValidationMessage({ validation: { valid: false } })).toBe("Invalid value");
    expect(getCellDisplayText(null)).toBe("");
    expect(getCellDisplayText(undefined)).toBe("");
    expect(getCellDisplayText(12)).toBe("12");
    expect(getCellDisplayText("Ada")).toBe("Ada");
    expect(escapeGridHtml('Ada & <"Grace">')).toBe("Ada &#38; &#60;&#34;Grace&#34;>");
    expect(escapeGridHtml("apostrophe's and > remain text")).toBe("apostrophe's and > remain text");
    expect(getColumnHeaderText(nameColumn)).toBe("Name");
    expect(getColumnHeaderText(ageColumn)).toBe("age");
    expect(getColumnHeaderText({ ...nameColumn, columnDef: {} } as Column<Person, unknown>)).toBe("name");

    expect(
      getCellFillHandleVisible(row, nameColumn, {
        fillHandleCoordinate: { rowId: "row-1", columnId: "name" },
        rangeSelected: true,
      }),
    ).toBe(true);
    expect(
      getCellFillHandleVisible(row, nameColumn, {
        activeEditing: true,
        fillHandleCoordinate: { rowId: "row-1", columnId: "name" },
        rangeSelected: true,
      }),
    ).toBe(false);
    expect(
      getCellFillHandleVisible(row, nameColumn, {
        editing: true,
        fillHandleCoordinate: { rowId: "row-1", columnId: "name" },
        rangeSelected: true,
      }),
    ).toBe(false);
    expect(
      getCellFillHandleVisible(row, nameColumn, {
        fillHandleCoordinate: { rowId: "row-1", columnId: "age" },
        rangeSelected: true,
      }),
    ).toBe(false);
    expect(getCellFillHandleVisible(groupedRow, nameColumn, { fillHandleCoordinate: { rowId: groupedRow.id, columnId: "name" }, rangeSelected: true })).toBe(false);
  });

  it("returns focused cell edit start guard decisions", () => {
    expect(getCanStartFocusedCellEdit({ rowId: "row-1", columnId: "name" }, null)).toBe(true);
    expect(getCanStartFocusedCellEdit(null, null)).toBe(false);
    expect(getCanStartFocusedCellEdit(undefined, null)).toBe(false);
    expect(getCanStartFocusedCellEdit({ rowId: "row-1", columnId: "name" }, { rowId: "row-1", columnId: "name" })).toBe(false);
  });

  it("returns focused cell restore guard decisions", () => {
    const focusedCell = { rowId: "row-1", columnId: "name" };
    const scroller = {};

    expect(getCanRestoreFocusedCell({ focusedCell, scroller, shouldRestore: true })).toBe(true);
    expect(getCanRestoreFocusedCell({ focusedCell, scroller, shouldRestore: true, inProgress: false })).toBe(true);
    expect(getCanRestoreFocusedCell({ focusedCell, scroller, shouldRestore: false })).toBe(false);
    expect(getCanRestoreFocusedCell({ focusedCell: null, scroller, shouldRestore: true })).toBe(false);
    expect(getCanRestoreFocusedCell({ focusedCell: undefined, scroller, shouldRestore: true })).toBe(false);
    expect(getCanRestoreFocusedCell({ focusedCell, scroller: null, shouldRestore: true })).toBe(false);
    expect(getCanRestoreFocusedCell({ focusedCell, scroller: undefined, shouldRestore: true })).toBe(false);
    expect(getCanRestoreFocusedCell({ focusedCell, scroller, shouldRestore: true, inProgress: true })).toBe(false);
  });

  it("returns focused cell restore frame sync cancellation decisions", () => {
    expect(getShouldCancelFocusedCellRestoreOnFrameSync()).toBe(true);
    expect(getShouldCancelFocusedCellRestoreOnFrameSync({ inProgress: false })).toBe(true);
    expect(getShouldCancelFocusedCellRestoreOnFrameSync({ inProgress: true })).toBe(false);
  });

  it("returns cell edit cancel guard decisions", () => {
    expect(getCanCancelCellEdit({ rowId: "row-1", columnId: "name" })).toBe(true);
    expect(getCanCancelCellEdit(null)).toBe(false);
    expect(getCanCancelCellEdit(undefined)).toBe(false);
  });

  it("returns grid keyboard shortcut guard decisions", () => {
    expect(getCanRunGridKeyboardShortcut(null)).toBe(true);
    expect(getCanRunGridKeyboardShortcut(undefined)).toBe(true);
    expect(getCanRunGridKeyboardShortcut({ rowId: "row-1", columnId: "name" })).toBe(false);
  });

  it("returns focused row selection targets", () => {
    const rows = [groupedRow, row, footerRow];

    expect(getFocusedRowSelectionTarget(rows, { rowId: "row-1", columnId: "name" })).toMatchObject({
      row,
      rowIndex: 1,
    });
    expect(getFocusedRowSelectionTarget(rows, null)).toBeNull();
    expect(getFocusedRowSelectionTarget(rows, undefined)).toBeNull();
    expect(getFocusedRowSelectionTarget(rows, { rowId: "missing", columnId: "name" })).toBeNull();
    expect(getCanToggleRowSelection({ defaultPrevented: false })).toBe(true);
    expect(getCanToggleRowSelection({ defaultPrevented: true })).toBe(false);
  });

  it("parses cell edit values with parser context", () => {
    let parserContext: unknown;
    const parsedColumn = {
      ...nameColumn,
      columnDef: {
        editValueParser: (value: string, context: unknown) => {
          parserContext = context;
          return `parsed:${value}`;
        },
      },
    } as Column<Person, unknown>;

    expect(parseCellEditValue(grid, row, nameColumn, "Ada")).toBe("Ada");
    expect(parseCellEditValue(grid, row, parsedColumn, "42")).toBe("parsed:42");
    expect(parserContext).toMatchObject({
      grid,
      row,
      column: parsedColumn,
      previousValue: "Ada",
    });
  });

  it("reads and writes clipboard text through shared browser helpers", async () => {
    const writes: string[] = [];
    const nativeEnvironment = {
      navigator: {
        clipboard: {
          writeText: async (text: string) => {
            writes.push(text);
          },
          readText: async () => "from-native",
        },
      },
    };

    await expect(writeClipboardText("copy text", nativeEnvironment)).resolves.toBe(true);
    await expect(readClipboardText(nativeEnvironment)).resolves.toBe("from-native");
    expect(writes).toEqual(["copy text"]);
    await expect(readClipboardText({ navigator: { clipboard: { readText: async () => Promise.reject(new Error("denied")) } } })).resolves.toBe("");
    await expect(readClipboardText({})).resolves.toBe("");
  });

  it("returns default browser text IO environments safely without a DOM", async () => {
    const clipboardEnvironment = getDefaultClipboardTextEnvironment();
    const downloadEnvironment = getDefaultBrowserDownloadEnvironment();

    expect(clipboardEnvironment.document).toBeUndefined();
    expect(downloadEnvironment.document).toBeUndefined();
    await expect(readClipboardText(clipboardEnvironment)).resolves.toBe("");
    expect(downloadBrowserExportFile({ filename: "grid.csv", mimeType: "text/csv", text: "a,b" }, downloadEnvironment)).toBe(false);
  });

  it("falls back to textarea clipboard copy when native writes fail", async () => {
    const appended: unknown[] = [];
    const removed: unknown[] = [];
    const textarea = {
      value: "",
      style: {},
      selected: false,
      attributes: new Map<string, string>(),
      select() {
        this.selected = true;
      },
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
    };
    const parent = {
      appendChild(element: unknown) {
        appended.push(element);
      },
      removeChild(element: unknown) {
        removed.push(element);
      },
    };
    const fallbackEnvironment = {
      navigator: {
        clipboard: {
          writeText: async () => Promise.reject(new Error("denied")),
        },
      },
      document: {
        body: parent,
        documentElement: parent,
        createElement: () => textarea,
        execCommand: (command: string) => command === "copy",
      },
    };

    await expect(writeClipboardText("fallback text", fallbackEnvironment)).resolves.toBe(true);
    expect(textarea.value).toBe("fallback text");
    expect(textarea.attributes.get("readonly")).toBe("");
    expect(textarea.style).toMatchObject({ position: "fixed", top: "-9999px", left: "-9999px" });
    expect(textarea.selected).toBe(true);
    expect(appended).toEqual([textarea]);
    expect(removed).toEqual([textarea]);
  });

  it("downloads browser export files and cleans up object URLs", () => {
    const calls: string[] = [];
    const anchor = {
      href: "",
      download: "",
      style: {},
      click: () => calls.push("click"),
    };
    const parent = {
      appendChild: (element: typeof anchor) => {
        calls.push(`append:${element.download}`);
      },
      removeChild: (element: typeof anchor) => {
        calls.push(`remove:${element.download}`);
      },
    };
    const blobs: unknown[] = [];

    const downloaded = downloadBrowserExportFile(
      { filename: "grid.csv", mimeType: "text/csv", text: "a,b" },
      {
        blob: class {
          constructor(parts: readonly string[], options: { type: string }) {
            blobs.push({ parts, options });
          }
        },
        document: {
          body: parent,
          documentElement: parent,
          createElement: () => anchor,
        },
        url: {
          createObjectURL: (blob: unknown) => {
            blobs.push(blob);
            return "blob:open-grid";
          },
          revokeObjectURL: (url: string) => calls.push(`revoke:${url}`),
        },
      },
    );

    expect(downloaded).toBe(true);
    expect(anchor).toMatchObject({
      href: "blob:open-grid",
      download: "grid.csv",
      style: { display: "none" },
    });
    expect(calls).toEqual(["append:grid.csv", "click", "remove:grid.csv", "revoke:blob:open-grid"]);
    expect(blobs[0]).toMatchObject({ parts: ["a,b"], options: { type: "text/csv" } });
  });

  it("does not download browser export files without browser APIs", () => {
    expect(downloadBrowserExportFile({ filename: "grid.csv", mimeType: "text/csv", text: "a,b" }, {})).toBe(false);
  });

  it("returns accessible cell editor props", () => {
    expect(getCellEditorProps(ageColumn, { invalid: true })).toMatchObject({
      "aria-label": "Edit age",
      "aria-invalid": true,
    });

    expect(getCellEditorProps(ageColumn, { invalid: false })).toMatchObject({
      "aria-label": "Edit age",
      "aria-invalid": undefined,
    });
  });

  it("returns cell editor option props", () => {
    expect(getCellEditorOptionProps({ value: "active", disabled: true })).toMatchObject({
      value: "active",
      disabled: true,
    });

    expect(getCellEditorOptionProps({ value: "draft", disabled: false })).toMatchObject({
      value: "draft",
      disabled: undefined,
    });
    expect(getCellEditorOptionText({ value: "draft" })).toBe("draft");
    expect(getCellEditorOptionText({ value: "active", label: "Active" })).toBe("Active");
  });

  it("returns accessible cell validation message props", () => {
    expect(getCellValidationMessageProps()).toMatchObject({
      role: "alert",
    });
  });

  it("returns accessible header placeholder props", () => {
    expect(getHeaderPlaceholderCellProps(ageColumn)).toMatchObject({
      role: "presentation",
      "aria-hidden": true,
      "data-column-id": "age",
    });
  });

  it("returns header cell props with optional pinned state override", () => {
    expect(getHeaderCellProps(grid, nameColumn, 0, { pinned: "right" })).toMatchObject({
      role: "columnheader",
      "data-column-id": "name",
      "data-pinned": "right",
    });

    expect(getHeaderCellProps(grid, nameColumn, 0, { pinned: false })).toMatchObject({
      "data-pinned": undefined,
    });
  });

  it("returns header cell layout props", () => {
    expect(
      getHeaderCellLayoutProps({
        colSpan: 2,
        rowSpan: 1,
        grouped: true,
        pinnedEdge: "left",
        draggable: true,
      }),
    ).toMatchObject({
      "aria-colspan": 2,
      "aria-rowspan": 1,
      "data-grouped": true,
      "data-placeholder": undefined,
      "data-pinned-edge": "left",
      "data-column-draggable": true,
    });

    expect(
      getHeaderCellLayoutProps({
        colSpan: 1,
        rowSpan: 2,
        grouped: false,
        placeholder: true,
        draggable: false,
      }),
    ).toMatchObject({
      "aria-colspan": undefined,
      "aria-rowspan": undefined,
      "data-grouped": undefined,
      "data-placeholder": true,
      "data-pinned-edge": undefined,
      "data-column-draggable": undefined,
    });
  });

  it("returns header button and sort indicator props", () => {
    expect(getHeaderButtonProps()).toMatchObject({
      type: "button",
      disabled: undefined,
      tabIndex: undefined,
    });

    expect(getHeaderButtonProps({ disabled: true, placeholder: true })).toMatchObject({
      type: "button",
      disabled: true,
      tabIndex: -1,
    });

    expect(getHeaderSortIndicatorProps()).toMatchObject({
      "aria-hidden": true,
    });

    expect(getHeaderSortIndicatorText("asc", { visible: true })).toBe("\u25B2");
    expect(getHeaderSortIndicatorText("desc", { visible: true })).toBe("\u25BC");
    expect(getHeaderSortIndicatorText(false, { visible: true })).toBe("");
    expect(getHeaderSortIndicatorText("asc", { visible: false })).toBe("");
  });

  it("returns shared header keyboard move directions", () => {
    expect(getHeaderKeyboardMoveDirection({ key: "ArrowLeft", altKey: true, shiftKey: true })).toBe("left");
    expect(getHeaderKeyboardMoveDirection({ key: "ArrowRight", altKey: true, shiftKey: true })).toBe("right");
    expect(getHeaderKeyboardMoveDirection({ key: "ArrowLeft", altKey: false, shiftKey: true })).toBeNull();
    expect(getHeaderKeyboardMoveDirection({ key: "ArrowRight", altKey: true, shiftKey: false })).toBeNull();
    expect(getHeaderKeyboardMoveDirection({ key: "Home", altKey: true, shiftKey: true })).toBeNull();
  });

  it("returns shared header action menu trigger focus positions", () => {
    expect(getHeaderActionMenuTriggerFocusPosition({ key: "ArrowDown" })).toBe("first");
    expect(getHeaderActionMenuTriggerFocusPosition({ key: "ArrowUp" })).toBe("last");
    expect(getHeaderActionMenuTriggerFocusPosition({ key: "Enter" })).toBeNull();
  });

  it("returns shared header action menu keyboard actions", () => {
    const closeAction = getHeaderActionMenuKeyboardAction({ key: "Escape" });
    const focusAction = getHeaderActionMenuKeyboardAction({ key: "ArrowDown" });
    const tabCloseAction = getHeaderActionMenuKeyboardAction({ key: "Tab" });

    expect(closeAction).toMatchObject({ type: "close" });
    expect(focusAction).toMatchObject({ type: "focus", position: "next" });
    expect(getHeaderActionMenuKeyboardAction({ key: "ArrowUp" })).toMatchObject({ type: "focus", position: "previous" });
    expect(getHeaderActionMenuKeyboardAction({ key: "Home" })).toMatchObject({ type: "focus", position: "first" });
    expect(getHeaderActionMenuKeyboardAction({ key: "End" })).toMatchObject({ type: "focus", position: "last" });
    expect(tabCloseAction).toMatchObject({ type: "tab-close" });
    expect(getHeaderActionMenuKeyboardAction({ key: "Enter" })).toBeNull();
    expect(isHeaderActionMenuCloseAction(closeAction)).toBe(true);
    expect(isHeaderActionMenuCloseAction(focusAction)).toBe(false);
    expect(isHeaderActionMenuFocusAction(focusAction)).toBe(true);
    expect(isHeaderActionMenuFocusAction(tabCloseAction)).toBe(false);
    expect(isHeaderActionMenuTabCloseAction(tabCloseAction)).toBe(true);
    expect(isHeaderActionMenuTabCloseAction(null)).toBe(false);
  });

  it("returns shared grid keyboard shortcut actions", () => {
    expect(getGridKeyboardShortcutAction({ key: "c", ctrlKey: true })).toBe("copy");
    expect(getGridKeyboardShortcutAction({ key: "C", metaKey: true })).toBe("copy");
    expect(getGridKeyboardShortcutAction({ key: "v", ctrlKey: true })).toBe("paste");
    expect(getGridKeyboardShortcutAction({ key: "V", metaKey: true })).toBe("paste");
    expect(getGridKeyboardShortcutAction({ key: "z", ctrlKey: true })).toBe("undo-edit");
    expect(getGridKeyboardShortcutAction({ key: "Z", metaKey: true })).toBe("undo-edit");
    expect(getGridKeyboardShortcutAction({ key: "z", ctrlKey: true, shiftKey: true })).toBe("redo-edit");
    expect(getGridKeyboardShortcutAction({ key: "Z", metaKey: true, shiftKey: true })).toBe("redo-edit");
    expect(getGridKeyboardShortcutAction({ key: "y", ctrlKey: true })).toBe("redo-edit");
    expect(getGridKeyboardShortcutAction({ key: " " })).toBe("row-selection");
    expect(getGridKeyboardShortcutAction({ key: "Spacebar" })).toBe("row-selection");
    expect(getGridKeyboardShortcutAction({ key: "c", ctrlKey: true, shiftKey: true })).toBeNull();
    expect(getGridKeyboardShortcutAction({ key: "v", ctrlKey: true, altKey: true })).toBeNull();
    expect(getGridKeyboardShortcutAction({ key: "y", ctrlKey: true, shiftKey: true })).toBeNull();
    expect(getGridKeyboardShortcutAction({ key: "z", ctrlKey: true, altKey: true })).toBeNull();
    expect(getGridKeyboardShortcutAction({ key: " ", shiftKey: true })).toBeNull();
    expect(getGridKeyboardShortcutAction({ key: "Enter" })).toBeNull();
  });

  it("returns shared grid keyboard edit actions", () => {
    expect(getGridKeyboardEditAction({ key: "Enter" })).toBe("start-edit");
    expect(getGridKeyboardEditAction({ key: "Escape" })).toBe("cancel-edit");
    expect(getGridKeyboardEditAction({ key: "Enter", shiftKey: true })).toBe("start-edit");
    expect(getGridKeyboardEditAction({ key: "ArrowDown" })).toBeNull();
    expect(getGridKeyboardEditAction({ key: "Esc" })).toBeNull();
  });

  it("returns shared cell editor keyboard actions", () => {
    expect(getCellEditorKeyboardAction({ key: "Enter" })).toBe("commit-edit");
    expect(getCellEditorKeyboardAction({ key: "Escape" })).toBe("cancel-edit");
    expect(getCellEditorKeyboardAction({ key: "Esc" })).toBeNull();
    expect(getCellEditorKeyboardAction({ key: "ArrowDown" })).toBeNull();
  });

  it("returns shared grid keyboard focus moves", () => {
    expect(getGridKeyboardFocusMove({ key: "ArrowUp" })).toMatchObject({ direction: "up", options: {} });
    expect(getGridKeyboardFocusMove({ key: "ArrowDown", shiftKey: true })).toMatchObject({
      direction: "down",
      options: { extendSelection: true },
    });
    expect(getGridKeyboardFocusMove({ key: "ArrowLeft" })).toMatchObject({ direction: "left", options: {} });
    expect(getGridKeyboardFocusMove({ key: "ArrowRight", shiftKey: true })).toMatchObject({
      direction: "right",
      options: { extendSelection: true },
    });
    expect(getGridKeyboardFocusMove({ key: "Home" })).toMatchObject({ direction: "home", options: {} });
    expect(getGridKeyboardFocusMove({ key: "Home", ctrlKey: true, shiftKey: true })).toMatchObject({
      direction: "grid-start",
      options: { extendSelection: true },
    });
    expect(getGridKeyboardFocusMove({ key: "End" })).toMatchObject({ direction: "end", options: {} });
    expect(getGridKeyboardFocusMove({ key: "End", metaKey: true, shiftKey: true })).toMatchObject({
      direction: "grid-end",
      options: { extendSelection: true },
    });
    expect(getGridKeyboardFocusMove({ key: "PageUp" })).toMatchObject({ direction: "page-up", options: {} });
    expect(getGridKeyboardFocusMove({ key: "PageDown", shiftKey: true })).toMatchObject({
      direction: "page-down",
      options: { extendSelection: true },
    });
    expect(getGridKeyboardFocusMove({ key: "Enter" })).toBeNull();
  });

  it("returns grouping panel props", () => {
    expect(getGroupingPanelProps({ empty: true })).toMatchObject({
      "aria-label": "Column grouping",
      "data-empty": true,
    });

    expect(getGroupingPanelProps({ empty: false })).toMatchObject({
      "aria-label": "Column grouping",
      "data-empty": undefined,
    });

    expect(GROUPING_PANEL_EMPTY_MESSAGE).toBe("Drag column headers here to group");
    expect(getGroupingPanelPlaceholderProps()).toMatchObject({
      "data-empty-placeholder": true,
    });
  });

  it("returns grouping panel chip and control props", () => {
    expect(getGroupingPanelChipProps(ageColumn)).toMatchObject({
      "data-column-id": "age",
    });

    expect(getGroupingPanelMoveButtonProps(ageColumn, { direction: "left", disabled: true })).toMatchObject({
      type: "button",
      "aria-label": "Move age grouping left",
      disabled: true,
    });

    expect(getGroupingPanelMoveButtonProps(ageColumn, { direction: "right", disabled: false })).toMatchObject({
      type: "button",
      "aria-label": "Move age grouping right",
      disabled: false,
    });

    expect(getGroupingPanelRemoveButtonProps(ageColumn)).toMatchObject({
      type: "button",
      "aria-label": "Remove age grouping",
    });
  });

  it("returns shared group label cell decisions and labels", () => {
    expect(getIsGroupLabelCell(groupedRow, nameColumn, [nameColumn, ageColumn])).toBe(true);
    expect(getIsGroupLabelCell(groupedRow, ageColumn, [nameColumn, ageColumn])).toBe(false);

    expect(getIsGroupLabelCell({ ...groupedRow, groupingColumnId: "hidden" } as Row<Person>, nameColumn, [nameColumn, ageColumn])).toBe(true);
    expect(getIsGroupLabelCell(footerRow, nameColumn, [nameColumn, ageColumn])).toBe(true);
    expect(getIsGroupLabelCell(treeRow, nameColumn, [nameColumn, ageColumn])).toBe(true);
    expect(getIsGroupLabelCell(treeRow, ageColumn, [nameColumn, ageColumn])).toBe(false);

    expect(getGroupValueText(new Date("2026-07-05T00:00:00.000Z"))).toBe("2026-07-05T00:00:00.000Z");
    expect(getGroupValueText(null)).toBe("(blank)");
    expect(getGroupValueText("active")).toBe("active");

    expect(getGroupRowLabel(groupedRow, nameColumn)).toBe("status: active");
    expect(getGroupRowLabel({ ...groupedRow, groupingValue: null } as Row<Person>, nameColumn)).toBe("status: (blank)");
    expect(getGroupRowLabel(footerRow, nameColumn)).toBe("Subtotal");
    expect(getGroupRowLabel({ ...footerRow, groupFooterLabel: undefined } as Row<Person>, nameColumn)).toBe("Total");
    expect(getGroupRowLabel(treeRow, nameColumn)).toBe("Ada");
    expect(getGroupRowLabel(treeRow, nameColumn, { fallback: "Custom" })).toBe("Custom");

    expect(getGroupCellIndent(groupedRow)).toBe(0);
    expect(getGroupCellIndent(treeRow)).toBe(16);
    expect(getGroupCellIndent(footerRow)).toBe(8);
    expect(getGroupCellIndent(footerRow, { depthSize: 20, footerOffset: 5 })).toBe(15);
    expect(getGroupCellIndentStyle(treeRow)).toEqual({ paddingLeft: 16 });
    expect(getGroupCellIndentStyle(footerRow, { depthSize: 20, footerOffset: 5 })).toEqual({ paddingLeft: 15 });
    expect(getGroupCellIndentStyleText(treeRow)).toBe("padding-left: 16px");
    expect(getGroupCellIndentStyleText(footerRow, { depthSize: 20, footerOffset: 5 })).toBe("padding-left: 15px");

    expect(getGroupRowCountText(groupedRow)).toBe("2");
    expect(getGroupRowCountText(treeRow)).toBeUndefined();
    expect(getGroupRowCountText(footerRow)).toBeUndefined();
  });

  it("returns accessible selected row props", () => {
    expect(getRowProps(row, 4, { selected: true, rowIndexOffset: 2 })).toMatchObject({
      role: "row",
      "aria-rowindex": 7,
      "aria-selected": true,
      "data-row-id": "row-1",
      "data-selected": true,
    });
  });

  it("returns row layout props", () => {
    expect(getRowLayoutProps(groupedRow, { expanded: true, virtualIndex: 3, columnVirtualized: true })).toMatchObject({
      "data-grouped-row": true,
      "data-group-footer-row": undefined,
      "data-expanded": true,
      "data-virtual-index": 3,
      "data-column-virtualized": true,
    });

    expect(getRowLayoutProps(footerRow, { expanded: true, virtualIndex: undefined, columnVirtualized: false })).toMatchObject({
      "data-grouped-row": undefined,
      "data-group-footer-row": true,
      "data-expanded": undefined,
      "data-virtual-index": undefined,
      "data-column-virtualized": undefined,
    });
  });

  it("returns accessible row expansion toggle props", () => {
    expect(getRowExpansionToggleProps(row, { expanded: false, label: "role: Admin" })).toMatchObject({
      type: "button",
      "aria-label": "Expand role: Admin",
      "aria-expanded": false,
      "data-row-id": "row-1",
      "data-expanded": false,
    });

    expect(getRowExpansionToggleProps(row, { expanded: true, label: "role: Admin" })).toMatchObject({
      "aria-label": "Collapse role: Admin",
      "aria-expanded": true,
      "data-expanded": true,
    });

    expect(getRowExpansionToggleText(false)).toBe("+");
    expect(getRowExpansionToggleText(true)).toBe("\u2212");
  });

  it("returns decorative row expansion spacer props", () => {
    expect(getRowExpansionSpacerProps()).toMatchObject({
      "aria-hidden": true,
    });
  });

  it("matches focused cell coordinates", () => {
    expect(isFocusedCell({ rowId: "row-1", columnId: "name" }, "row-1", "name")).toBe(true);
    expect(isFocusedCell({ rowId: "row-1", columnId: "name" }, "row-1", "age")).toBe(false);
    expect(isFocusedCell(null, "row-1", "name")).toBe(false);
  });

  it("focuses enabled header menu items by position", () => {
    const focused: string[] = [];
    const firstItem = { focus: () => focused.push("first") };
    const secondItem = { focus: () => focused.push("second") };
    const fallbackMenu = {
      focus: () => focused.push("menu"),
      querySelectorAll: () => [],
    } as unknown as HeaderActionMenuFocusTargetLike;
    const menu = {
      focus: () => focused.push("menu"),
      ownerDocument: { activeElement: firstItem },
      querySelectorAll: () => [firstItem, secondItem],
    } as unknown as HeaderActionMenuFocusTargetLike;

    expect(focusHeaderActionMenuItem(menu, "next")).toBe(true);
    expect(focusHeaderActionMenuItem(menu, "last")).toBe(true);
    expect(focusHeaderActionMenuItem(fallbackMenu, "first")).toBe(true);
    expect(focusHeaderActionMenuItem(null, "first")).toBe(false);

    expect(getHeaderActionMenuFocusTarget({ currentTarget: menu })).toBe(menu);
    expect(getHeaderActionMenuFocusTarget({ currentTarget: null })).toBeNull();
    expect(getHeaderActionMenuFocusTarget({ currentTarget: {} })).toBeNull();
    expect(isHeaderActionMenuFocusTarget(menu)).toBe(true);
    expect(isFocusableElement(firstItem)).toBe(true);
    expect(isFocusableElement({})).toBe(false);
    expect(isHeaderActionMenuFocusTarget({ querySelectorAll: () => [] })).toBe(false);
    expect(isHeaderActionMenuFocusTarget({ focus: () => undefined })).toBe(false);
    expect(focused).toEqual(["second", "second", "menu"]);
  });

  it("returns header menu active elements from owner or fallback documents", () => {
    const ownerActiveElement = { id: "owner" };
    const fallbackActiveElement = { id: "fallback" };

    expect(
      getHeaderActionMenuActiveElement(
        { ownerDocument: { activeElement: ownerActiveElement } },
        { activeElement: fallbackActiveElement },
      ),
    ).toBe(ownerActiveElement);
    expect(getHeaderActionMenuActiveElement({}, { activeElement: fallbackActiveElement })).toBe(fallbackActiveElement);
    expect(getHeaderActionMenuActiveElement(null, null)).toBeNull();
  });

  it("focuses optional elements and reports whether focus moved", () => {
    const focused: string[] = [];
    const element = {
      focus: () => focused.push("element"),
    };

    expect(focusElement(element)).toBe(true);
    expect(focusElement(null)).toBe(false);
    expect(focused).toEqual(["element"]);
  });

  it("focuses cell editor elements and selects selectable editors", () => {
    const calls: string[] = [];
    const selectableEditor = {
      focus: () => calls.push("selectable:focus"),
      select: () => calls.push("selectable:select"),
    };
    const focusOnlyEditor = {
      focus: () => calls.push("focus-only:focus"),
    };

    expect(focusCellEditorElement(selectableEditor)).toBe(true);
    expect(focusCellEditorElement(focusOnlyEditor)).toBe(true);
    expect(focusCellEditorElement(null)).toBe(false);
    expect(calls).toEqual(["selectable:focus", "selectable:select", "focus-only:focus"]);
  });

  it("focuses optional elements by id and reports whether focus moved", () => {
    const focused: string[] = [];
    const lookup = {
      getElementById: (id: string) =>
        id === "trigger" ? { focus: () => focused.push("trigger") } : null,
    };
    const nonFocusableLookup = {
      getElementById: () => ({}),
    } as unknown as ElementIdLookupLike;

    expect(focusElementById(lookup, "trigger")).toBe(true);
    expect(focusElementById(lookup, "missing")).toBe(false);
    expect(focusElementById(nonFocusableLookup, "not-focusable")).toBe(false);
    expect(focusHeaderActionMenuTriggerById(lookup, "trigger")).toBe(true);
    expect(focusHeaderActionMenuTriggerById(lookup, "missing")).toBe(false);
    expect(focused).toEqual(["trigger", "trigger"]);
  });

  it("focuses header menu triggers by id", () => {
    const focused: string[] = [];
    const trigger = { focus: () => focused.push("direct-trigger") };
    const lookup = {
      getElementById: (id: string) =>
        id === "menu-trigger" ? ({ focus: () => focused.push("menu-trigger") } as HTMLElement) : null,
    };

    expect(focusHeaderActionMenuTrigger(trigger)).toBe(true);
    expect(focusHeaderActionMenuTrigger(null)).toBe(false);
    expect(focusHeaderActionMenuTriggerById(lookup, "menu-trigger")).toBe(true);
    expect(focusHeaderActionMenuTriggerById(lookup, "missing")).toBe(false);
    expect(focused).toEqual(["direct-trigger", "menu-trigger"]);
  });

  it("focuses enabled header menu items by id", () => {
    const focused: string[] = [];
    const firstItem = { focus: () => focused.push("first") };
    const secondItem = { focus: () => focused.push("second") };
    const menu = {
      focus: () => focused.push("menu"),
      ownerDocument: { activeElement: firstItem },
      querySelectorAll: () => [firstItem, secondItem],
    } as unknown as HeaderActionMenuFocusTargetLike;
    const lookup = {
      getElementById: (id: string) => (id === "menu" ? menu : null),
    };

    expect(focusHeaderActionMenuItemById(lookup, "menu", "next")).toBe(true);
    expect(focusHeaderActionMenuItemById(lookup, "missing", "first")).toBe(false);

    expect(focused).toEqual(["second"]);
  });

  it("focuses the focused cell inside a grid container", () => {
    const focused: string[] = [];
    const cell = {
      focus: () => focused.push("cell"),
    };
    const container = {
      querySelector: (selector: string) => (selector === GRID_FOCUSED_CELL_SELECTOR ? cell : null),
    };
    const emptyContainer = {
      querySelector: () => null,
    };

    expect(focusFocusedCellInGrid(container)).toBe(true);
    expect(focusFocusedCellInGrid(emptyContainer)).toBe(false);
    expect(focusFocusedCellInGrid(null)).toBe(false);
    expect(focused).toEqual(["cell"]);
  });

  it("scrolls optional elements to a requested position", () => {
    const element = {
      scrollLeft: 4,
      scrollTop: 8,
    };

    expect(scrollElementToPosition(element, { scrollLeft: 24, scrollTop: 48 })).toBe(true);
    expect(element).toEqual({ scrollLeft: 24, scrollTop: 48 });
    expect(scrollElementToPosition(element, null)).toBe(false);
    expect(scrollElementToPosition(null, { scrollLeft: 64, scrollTop: 128 })).toBe(false);
    expect(element).toEqual({ scrollLeft: 24, scrollTop: 48 });
  });

  it("returns scroll frame options from a scroller element", () => {
    const element = {
      scrollLeft: 12,
      scrollTop: 24,
      clientHeight: 360,
      clientWidth: 640,
    };

    expect(getScrollFrameOptionsFromElement(element, { stickyTopOffset: 42 })).toEqual({
      scrollTop: 24,
      scrollLeft: 12,
      viewportHeight: 360,
      viewportWidth: 640,
      stickyTopOffset: 42,
    });
    expect(getScrollFrameOptionsFromElement(element, { scrollTop: 48, scrollLeft: 96 })).toEqual({
      scrollTop: 48,
      scrollLeft: 96,
      viewportHeight: 360,
      viewportWidth: 640,
      stickyTopOffset: 0,
    });
  });

  it("returns focused-cell scroll options from a scroller element", () => {
    const focusedCell = { rowId: "row-1", columnId: "status" };
    const rows = [{ id: "row-1" }] as Row<Person>[];
    const layout = [{ id: "status", size: 120, start: 0, end: 120, pinned: false }];
    const getRowSize = () => 40;
    const rowVirtualOptions = { enabled: true, estimateRowHeight: 40, overscan: 6 };
    const columnVirtualOptions = { enabled: true, overscan: 2 };

    expect(
      getFocusedCellScrollOptionsFromElement(
        {
          scrollLeft: 12,
          scrollTop: 24,
          clientHeight: 360,
          clientWidth: 640,
        },
        {
          focusedCell,
          layout,
          rows,
          headerHeight: 42,
          getRowSize,
          rowVirtualOptions,
          columnVirtualOptions,
        },
      ),
    ).toEqual({
      focusedCell,
      layout,
      rows,
      currentScrollLeft: 12,
      currentScrollTop: 24,
      viewportWidth: 640,
      viewportHeight: 360,
      headerHeight: 42,
      getRowSize,
      rowVirtualOptions,
      columnVirtualOptions,
    });
  });

  it("returns enabled header action menu items through the shared selector", () => {
    const enabledItems = [{ id: "sort", focus: () => undefined }, { id: "pin", focus: () => undefined }] satisfies HeaderActionMenuItemFocusTargetLike[];
    const menu = {
      querySelectorAll: (selector: string) => (selector === HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR ? [...enabledItems, { id: "label" }] : []),
    } as unknown as ParentNode;

    expect(HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR).toBe('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])');
    expect(getEnabledHeaderActionMenuItems(menu)).toEqual(enabledItems);
    expect(getEnabledHeaderActionMenuItems(null)).toEqual([]);
  });

  it("detects interactive keyboard shortcut targets", () => {
    const currentTarget = {} as EventTarget;
    const interactiveTarget = {
      closest: (selector: string) => (selector.includes("[role='menuitem']") ? {} : null),
    } as unknown as EventTarget;
    const contentEditableTarget = {
      closest: (selector: string) => (selector.includes("[contenteditable]:not([contenteditable='false'])") ? {} : null),
    } as unknown as EventTarget;
    const ariaInputTarget = {
      closest: (selector: string) => (selector.includes("[role='textbox']") ? {} : null),
    } as unknown as EventTarget;
    const nonInteractiveTarget = {
      closest: () => null,
    } as unknown as EventTarget;

    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='menuitem']");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='slider']");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[contenteditable]:not([contenteditable='false'])");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='textbox']");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='combobox']");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='searchbox']");
    expect(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR).toContain("[role='spinbutton']");
    expect(isGridInteractiveKeyboardTarget(interactiveTarget, currentTarget)).toBe(true);
    expect(isGridInteractiveKeyboardTarget(contentEditableTarget, currentTarget)).toBe(true);
    expect(isGridInteractiveKeyboardTarget(ariaInputTarget, currentTarget)).toBe(true);
    expect(isGridInteractiveKeyboardTarget(nonInteractiveTarget, currentTarget)).toBe(false);
    expect(isGridInteractiveKeyboardTarget(currentTarget, currentTarget)).toBe(false);
    expect(isGridInteractiveKeyboardTarget(null, currentTarget)).toBe(false);
    expect(isGridInteractiveKeyboardEventTarget({ target: interactiveTarget, currentTarget })).toBe(true);
    expect(isGridInteractiveKeyboardEventTarget({ target: nonInteractiveTarget, currentTarget })).toBe(false);
  });

  it("returns accessible column resize handle props", () => {
    expect(getColumnResizeHandleProps(ageColumn)).toMatchObject({
      role: "separator",
      "aria-orientation": "vertical",
      "aria-label": "Resize age column",
      "aria-valuenow": 120,
      "aria-valuemin": 72,
      "aria-valuemax": 240,
      "data-column-id": "age",
      "data-resize-handle": true,
      tabIndex: 0,
    });
  });

  it("returns column resize handle props with optional current value override", () => {
    expect(getColumnResizeHandleProps(ageColumn, { valueNow: 144 })).toMatchObject({
      "aria-valuenow": 144,
      "aria-valuemin": 72,
      "aria-valuemax": 240,
      "data-column-id": "age",
    });
  });

  it("returns shared column resize start sizes", () => {
    expect(
      getColumnResizeStartSize(
        {
          getColumnSize: () => 144,
        } as Grid<Person>,
        ageColumn,
      ),
    ).toBe(144);
    expect(
      getColumnResizeStartSize(
        {
          getColumnSize: () => undefined,
        } as Grid<Person>,
        ageColumn,
      ),
    ).toBe(120);
  });

  it("returns shared column resize keyboard target sizes", () => {
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "ArrowRight" })).toBe(130);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "ArrowLeft" })).toBe(110);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "ArrowRight", shiftKey: true })).toBe(170);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "ArrowLeft", shiftKey: true })).toBe(70);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "Home" })).toBe(72);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "End" })).toBe(240);
    expect(getColumnResizeKeyboardSize(ageColumn, 120, { key: "PageUp" })).toBeNull();
  });

  it("returns shared column resize pointer target sizes", () => {
    expect(getColumnResizePointerSize(120, 20, { clientX: 48 })).toBe(148);
    expect(getColumnResizePointerSize(120, 48, { clientX: 20 })).toBe(92);
    expect(getColumnResizePointerSize(120, 20, { clientX: 20 })).toBe(120);
  });

  it("returns shared column resize final sizes", () => {
    expect(getCanStartColumnResize({ defaultPrevented: false })).toBe(true);
    expect(getCanStartColumnResize({ defaultPrevented: true })).toBe(false);
    expect(getCanApplyColumnResize({ defaultPrevented: false })).toBe(true);
    expect(getCanApplyColumnResize({ defaultPrevented: true })).toBe(false);
    expect(getColumnResizeFinalSize(120, { defaultPrevented: false, size: 144 })).toBe(144);
    expect(getColumnResizeFinalSize(120, { defaultPrevented: true, size: 144 })).toBe(120);
  });

  it("tries pointer capture operations without leaking failures", () => {
    const captures: number[] = [];
    const releases: number[] = [];
    const target = {
      setPointerCapture: (pointerId: number) => captures.push(pointerId),
      releasePointerCapture: (pointerId: number) => releases.push(pointerId),
    };
    const failingTarget = {
      setPointerCapture: () => {
        throw new Error("capture unavailable");
      },
      releasePointerCapture: () => {
        throw new Error("release unavailable");
      },
    };

    expect(getPointerCaptureTarget({ currentTarget: target })).toBe(target);
    expect(isPointerCaptureTarget(target)).toBe(true);
    expect(isPointerCaptureTarget({ setPointerCapture: () => undefined })).toBe(false);
    expect(isPointerCaptureTarget(null)).toBe(false);
    expect(trySetPointerCapture(target, 7)).toBe(true);
    expect(tryReleasePointerCapture(target, 7)).toBe(true);
    expect(captures).toEqual([7]);
    expect(releases).toEqual([7]);
    expect(trySetPointerCapture(failingTarget, 9)).toBe(false);
    expect(tryReleasePointerCapture(failingTarget, 9)).toBe(false);
    expect(trySetPointerCapture({}, 11)).toBe(false);
    expect(tryReleasePointerCapture(null, 11)).toBe(false);
  });

  it("adds and cleans up pointer move/up listeners", () => {
    const calls: string[] = [];
    const move = () => calls.push("move");
    const up = () => calls.push("up");
    const listeners = new Map<string, Array<(event: PointerEvent) => void>>();
    const target = {
      addEventListener: (type: "pointermove" | "pointerup", listener: (event: PointerEvent) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
      removeEventListener: (type: "pointermove" | "pointerup", listener: (event: PointerEvent) => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((nextListener) => nextListener !== listener),
        );
      },
    };

    const cleanup = addPointerMoveUpListeners({ move, up }, target);
    listeners.get("pointermove")?.forEach((listener) => listener({} as PointerEvent));
    listeners.get("pointerup")?.forEach((listener) => listener({} as PointerEvent));

    expect(calls).toEqual(["move", "up"]);
    cleanup();
    expect(listeners.get("pointermove")).toEqual([]);
    expect(listeners.get("pointerup")).toEqual([]);
  });

  it("returns no-op pointer listener cleanup without a default browser target", () => {
    expect(getDefaultPointerMoveUpListenerTarget()).toBeNull();
    expect(getDefaultPointerUpCancelListenerTarget()).toBeNull();
    expect(getDefaultPointerMoveUpCancelListenerTarget()).toBeNull();

    expect(addPointerMoveUpListeners({ move: () => undefined, up: () => undefined })()).toBeUndefined();
    expect(addPointerUpCancelListeners({ up: () => undefined, cancel: () => undefined })()).toBeUndefined();
    expect(
      addPointerMoveUpCancelListeners({
        move: () => undefined,
        up: () => undefined,
        cancel: () => undefined,
      })(),
    ).toBeUndefined();
  });

  it("adds and cleans up pointer up/cancel listeners", () => {
    const calls: string[] = [];
    const up = () => calls.push("up");
    const cancel = () => calls.push("cancel");
    const listeners = new Map<string, Array<(event: PointerEvent) => void>>();
    const target = {
      addEventListener: (type: "pointerup" | "pointercancel", listener: (event: PointerEvent) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
      removeEventListener: (type: "pointerup" | "pointercancel", listener: (event: PointerEvent) => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((nextListener) => nextListener !== listener),
        );
      },
    };

    const cleanup = addPointerUpCancelListeners({ up, cancel }, target);
    listeners.get("pointerup")?.forEach((listener) => listener({} as PointerEvent));
    listeners.get("pointercancel")?.forEach((listener) => listener({} as PointerEvent));

    expect(calls).toEqual(["up", "cancel"]);
    cleanup();
    expect(listeners.get("pointerup")).toEqual([]);
    expect(listeners.get("pointercancel")).toEqual([]);
  });

  it("adds and cleans up pointer move/up/cancel listeners", () => {
    const calls: string[] = [];
    const move = () => calls.push("move");
    const up = () => calls.push("up");
    const cancel = () => calls.push("cancel");
    const listeners = new Map<string, Array<(event: PointerEvent) => void>>();
    const target = {
      addEventListener: (
        type: "pointermove" | "pointerup" | "pointercancel",
        listener: (event: PointerEvent) => void,
      ) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
      removeEventListener: (
        type: "pointermove" | "pointerup" | "pointercancel",
        listener: (event: PointerEvent) => void,
      ) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((nextListener) => nextListener !== listener),
        );
      },
    };

    const cleanup = addPointerMoveUpCancelListeners({ move, up, cancel }, target);
    listeners.get("pointermove")?.forEach((listener) => listener({} as PointerEvent));
    listeners.get("pointerup")?.forEach((listener) => listener({} as PointerEvent));
    listeners.get("pointercancel")?.forEach((listener) => listener({} as PointerEvent));

    expect(calls).toEqual(["move", "up", "cancel"]);
    cleanup();
    expect(listeners.get("pointermove")).toEqual([]);
    expect(listeners.get("pointerup")).toEqual([]);
    expect(listeners.get("pointercancel")).toEqual([]);
  });

  it("adds passive scroll listeners and cleans them up", () => {
    const calls: string[] = [];
    const listener = () => calls.push("scroll");
    const listeners: Array<(event: Event) => void> = [];
    const addOptions: AddEventListenerOptions[] = [];
    const target = {
      addEventListener: (type: "scroll", nextListener: (event: Event) => void, options?: AddEventListenerOptions) => {
        expect(type).toBe("scroll");
        listeners.push(nextListener);
        if (options) {
          addOptions.push(options);
        }
      },
      removeEventListener: (type: "scroll", nextListener: (event: Event) => void) => {
        expect(type).toBe("scroll");
        const index = listeners.indexOf(nextListener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      },
    };

    const cleanup = addPassiveScrollListener(listener, target);
    listeners.forEach((nextListener) => nextListener(new Event("scroll")));

    expect(calls).toEqual(["scroll"]);
    expect(addOptions).toEqual([{ passive: true }]);
    cleanup();
    expect(listeners).toEqual([]);
  });

  it("returns accessible column pinning controls props", () => {
    expect(getColumnPinningControlsProps(ageColumn)).toMatchObject({
      "aria-label": "age column pinning",
    });
  });

  it("returns accessible column pinning button props", () => {
    expect(getColumnPinningButtonText("left")).toBe("L");
    expect(getColumnPinningButtonText(false)).toBe("-");
    expect(getColumnPinningButtonText("right")).toBe("R");

    expect(getColumnPinningButtonProps(ageColumn, { position: "left", active: true })).toMatchObject({
      type: "button",
      "aria-label": "Pin age left",
      "aria-pressed": true,
      disabled: true,
    });

    expect(getColumnPinningButtonProps(ageColumn, { position: false, active: false })).toMatchObject({
      "aria-label": "Unpin age",
      "aria-pressed": false,
      disabled: false,
    });

    expect(getColumnPinningButtonProps(ageColumn, { position: "right", active: false })).toMatchObject({
      "aria-label": "Pin age right",
      "aria-pressed": false,
      disabled: false,
    });
  });

  it("returns accessible header action menu trigger props", () => {
    expect(HEADER_ACTION_MENU_TRIGGER_TEXT).toBe("...");
    expect(getHeaderActionMenuId("age")).toBe("og-grid-header-menu-age");
    expect(getHeaderActionMenuId("team name/owner")).toBe("og-grid-header-menu-team-name-owner");
    expect(getHeaderActionMenuTriggerId("age")).toBe("og-grid-header-menu-age-trigger");
    expect(getHeaderActionMenuTriggerId("team name/owner")).toBe("og-grid-header-menu-team-name-owner-trigger");

    expect(getHeaderActionMenuTriggerProps(ageColumn, { expanded: false, controls: "age-menu" })).toMatchObject({
      type: "button",
      "aria-label": "Open age column menu",
      "aria-expanded": false,
      "aria-haspopup": "menu",
      "aria-controls": undefined,
    });

    expect(getHeaderActionMenuTriggerProps(ageColumn, { expanded: true, controls: "age-menu" })).toMatchObject({
      "aria-expanded": true,
      "aria-controls": "age-menu",
    });
  });

  it("returns accessible header action menu props", () => {
    expect(getHeaderActionMenuProps(ageColumn)).toMatchObject({
      role: "menu",
      "aria-label": "age column menu",
      tabIndex: -1,
    });
  });

  it("returns accessible header action menu item props", () => {
    expect(getHeaderActionMenuDefaultItemLabel("sort-asc")).toBe("Sort ascending");
    expect(getHeaderActionMenuDefaultItemLabel("sort-desc")).toBe("Sort descending");
    expect(getHeaderActionMenuDefaultItemLabel("clear-sort")).toBe("Clear sort");
    expect(getHeaderActionMenuDefaultItemLabel("move-left")).toBe("Move left");
    expect(getHeaderActionMenuDefaultItemLabel("move-right")).toBe("Move right");
    expect(getHeaderActionMenuDefaultItemLabel("pin-left")).toBe("Pin left");
    expect(getHeaderActionMenuDefaultItemLabel("unpin")).toBe("Unpin");
    expect(getHeaderActionMenuDefaultItemLabel("pin-right")).toBe("Pin right");
    expect(getHeaderActionMenuDefaultItemLabel("toggle-group", { grouped: false })).toBe("Group by column");
    expect(getHeaderActionMenuDefaultItemLabel("toggle-group", { grouped: true })).toBe("Ungroup column");

    expect(
      getHeaderActionMenuDefaultItemDescriptors({
        sortDirection: false,
        pinningPosition: false,
        isGrouped: false,
        canGroup: true,
        canMoveLeft: false,
        canMoveRight: true,
      }),
    ).toEqual([
      { id: "sort-asc", label: "Sort ascending" },
      { id: "sort-desc", label: "Sort descending" },
      { id: "clear-sort", label: "Clear sort", disabled: true },
      { id: "move-left", label: "Move left", disabled: true },
      { id: "move-right", label: "Move right", disabled: false },
      { id: "pin-left", label: "Pin left", disabled: false },
      { id: "unpin", label: "Unpin", disabled: true },
      { id: "pin-right", label: "Pin right", disabled: false },
      { id: "toggle-group", label: "Group by column" },
    ]);
    expect(
      getHeaderActionMenuDefaultItemDescriptors({
        sortDirection: "asc",
        pinningPosition: "right",
        isGrouped: true,
        canGroup: false,
        canMoveLeft: true,
        canMoveRight: false,
      }),
    ).toEqual([
      { id: "sort-asc", label: "Sort ascending" },
      { id: "sort-desc", label: "Sort descending" },
      { id: "clear-sort", label: "Clear sort", disabled: false },
      { id: "move-left", label: "Move left", disabled: false },
      { id: "move-right", label: "Move right", disabled: true },
      { id: "pin-left", label: "Pin left", disabled: false },
      { id: "unpin", label: "Unpin", disabled: false },
      { id: "pin-right", label: "Pin right", disabled: true },
    ]);

    expect(getHeaderActionMenuItemProps({ disabled: true })).toMatchObject({
      type: "button",
      role: "menuitem",
      disabled: true,
    });

    expect(getHeaderActionMenuItemProps({ disabled: false })).toMatchObject({
      disabled: undefined,
    });

    expect(getHeaderActionMenuCustomItemProps({ label: "Design tokens" })).toMatchObject({
      role: "presentation",
      "aria-label": "Design tokens",
    });

    expect(getHeaderActionMenuLabelProps()).toMatchObject({
      role: "presentation",
    });

    expect(getHeaderActionMenuSeparatorProps({ label: "Sizing actions" })).toMatchObject({
      role: "separator",
      "aria-label": "Sizing actions",
    });

    expect(
      [
        { id: "sort-asc" },
        null,
        false,
        { id: "label", type: "label" },
        undefined,
      ].filter(isHeaderActionMenuItem),
    ).toEqual([
      { id: "sort-asc" },
      { id: "label", type: "label" },
    ]);

    expect(isHeaderActionMenuActionItem({ id: "sort-asc" })).toBe(true);
    expect(isHeaderActionMenuActionItem({ id: "sort-desc", type: "action" })).toBe(true);
    expect(isHeaderActionMenuActionItem({ id: "label", type: "label" })).toBe(false);
    expect(isHeaderActionMenuActionItem(null)).toBe(false);

    const customProps = { tone: "brand" };
    expect(isHeaderActionMenuCustomItem({ id: "custom", type: "custom", props: customProps })).toBe(true);
    expect(isHeaderActionMenuCustomItem({ id: "sort-asc" })).toBe(false);
    expect(isHeaderActionMenuCustomItem(null)).toBe(false);
    expect(getHeaderActionMenuCustomItemUserProps({ type: "custom", props: customProps })).toBe(customProps);
    expect(getHeaderActionMenuCustomItemUserProps({ type: "custom" })).toEqual({});
    expect(getHeaderActionMenuCustomItemUserProps(null)).toEqual({});

    expect(isHeaderActionMenuLabelItem({ id: "label", type: "label" })).toBe(true);
    expect(isHeaderActionMenuLabelItem({ id: "separator", type: "separator" })).toBe(false);
    expect(isHeaderActionMenuLabelItem(null)).toBe(false);
    expect(isHeaderActionMenuSeparatorItem({ id: "separator", type: "separator" })).toBe(true);
    expect(isHeaderActionMenuSeparatorItem({ id: "label", type: "label" })).toBe(false);
    expect(isHeaderActionMenuSeparatorItem(null)).toBe(false);
  });

  it("detects pointer coordinates inside an element rectangle", () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 10,
        right: 30,
        top: 20,
        bottom: 40,
      }),
    };

    expect(isPointerInsideElement({ clientX: 20, clientY: 30 }, element)).toBe(true);
    expect(isPointerInsideElement({ clientX: 10, clientY: 20 }, element)).toBe(true);
    expect(isPointerInsideElement({ clientX: 31, clientY: 30 }, element)).toBe(false);
    expect(isPointerInsideElement({ clientX: 20, clientY: 41 }, element)).toBe(false);
    expect(isPointerInsideElement({ clientX: 20, clientY: 30 }, null)).toBe(false);
  });

  it("returns measured element block size with scroll-height fallback", () => {
    expect(getMeasuredElementBlockSize({ scrollHeight: 64 }, 40)).toBe(64);
    expect(getMeasuredElementBlockSize({ scrollHeight: 24 }, 40)).toBe(40);
  });

  it("detects measured block elements structurally", () => {
    expect(isMeasuredBlockElement({ scrollHeight: 64 })).toBe(true);
    expect(isMeasuredBlockElement({ scrollHeight: "64" })).toBe(false);
    expect(isMeasuredBlockElement(null)).toBe(false);
  });

  it("detects measured rect and inline elements structurally", () => {
    const measuredRect = {
      scrollHeight: 64,
      getBoundingClientRect: () => ({ height: 48, width: 96 }),
    };

    expect(isMeasuredBlockRectElement(measuredRect)).toBe(true);
    expect(isMeasuredBlockRectElement({ getBoundingClientRect: () => ({ height: 48 }) })).toBe(false);
    expect(isMeasuredInlineElement(measuredRect)).toBe(true);
    expect(isMeasuredInlineElement({ getBoundingClientRect: 1 })).toBe(false);
  });

  it("returns measured element block size from structural targets", () => {
    expect(getMeasuredElementBlockSizeFromTarget({ scrollHeight: 64 }, 40)).toBe(64);
    expect(getMeasuredElementBlockSizeFromTarget({ scrollHeight: 24 }, 40)).toBe(40);
    expect(getMeasuredElementBlockSizeFromTarget({}, 40)).toBe(40);
    expect(getMeasuredElementBlockSizeFromTarget(null, 40)).toBe(40);
  });

  it("returns measured element block size from the larger of scroll-height and bounding client rect height", () => {
    expect(
      getMeasuredElementBlockSizeFromRect({
        scrollHeight: 96,
        getBoundingClientRect: () => ({ height: 72 }),
      }),
    ).toBe(96);
    expect(
      getMeasuredElementBlockSizeFromRect({
        scrollHeight: 48,
        getBoundingClientRect: () => ({ height: 72 }),
      }),
    ).toBe(72);
  });

  it("returns measured element inline size from the bounding client rect", () => {
    expect(
      getMeasuredElementInlineSize({
        getBoundingClientRect: () => ({ width: 128 }),
      }),
    ).toBe(128);
  });

  it("returns element offset block size with fallback", () => {
    expect(getElementOffsetBlockSize({ offsetHeight: 48 }, 42)).toBe(48);
    expect(getElementOffsetBlockSize(null, 42)).toBe(42);
    expect(getElementOffsetBlockSize(undefined, 42)).toBe(42);
  });

  it("returns resize observer entry block sizes with scroll-height fallback", () => {
    const target = { scrollHeight: 48 };
    const createEntry = (entry: { borderBoxSize?: ResizeObserverSize | ResizeObserverSize[]; contentRect?: { height: number } }) => ({
        target,
        borderBoxSize: undefined,
        contentRect: { height: 40 },
        ...entry,
      });

    expect(getResizeObserverEntryBlockSize(createEntry({ borderBoxSize: [{ blockSize: 44 } as ResizeObserverSize] }))).toBe(48);
    expect(getResizeObserverEntryBlockSize(createEntry({ borderBoxSize: { blockSize: 52 } as ResizeObserverSize }))).toBe(52);
    expect(getResizeObserverEntryBlockSize(createEntry({ contentRect: { height: 56 } }))).toBe(56);
    expect(getResizeObserverEntryBlockSize({ target: {}, contentRect: { height: 40 } })).toBe(40);
  });

  it("returns resize observer entry inline sizes", () => {
    const createEntry = (entry: { borderBoxSize?: ResizeObserverSize | ResizeObserverSize[]; contentRect?: { width: number } }) => ({
        borderBoxSize: undefined,
        contentRect: { width: 40 },
        ...entry,
      });

    expect(getResizeObserverEntryInlineSize(createEntry({ borderBoxSize: [{ inlineSize: 44 } as ResizeObserverSize] }))).toBe(44);
    expect(getResizeObserverEntryInlineSize(createEntry({ borderBoxSize: { inlineSize: 52 } as ResizeObserverSize }))).toBe(52);
    expect(getResizeObserverEntryInlineSize(createEntry({ contentRect: { width: 56 } }))).toBe(56);
  });

  it("creates resize observers through an optional constructor", () => {
    const callbacks: ResizeObserverCallback[] = [];
    const callback: ResizeObserverCallback = () => {};
    const FakeResizeObserver = class {
      constructor(receivedCallback: ResizeObserverCallback) {
        callbacks.push(receivedCallback);
      }

      disconnect() {}
      observe() {}
      unobserve() {}
    } as unknown as ResizeObserverConstructorLike;

    expect(createResizeObserver(callback, undefined)).toBeNull();
    expect(createResizeObserver(callback, FakeResizeObserver)).not.toBeNull();
    expect(callbacks).toEqual([callback]);
  });

  it("returns resize observer entry dataset ids", () => {
    const createEntry = (target: unknown) => ({ target });

    expect(getResizeObserverEntryDatasetId(createEntry({ dataset: { rowId: "row-1", columnId: "status" } }), "rowId")).toBe("row-1");
    expect(getResizeObserverEntryDatasetId(createEntry({ dataset: { rowId: "row-1", columnId: "status" } }), "columnId")).toBe("status");
    expect(getResizeObserverEntryDatasetId(createEntry({ dataset: { rowId: "" } }), "rowId")).toBeNull();
    expect(getResizeObserverEntryDatasetId(createEntry({}), "columnId")).toBeNull();
    expect(getResizeObserverEntryDatasetId(createEntry(null), "rowId")).toBeNull();
    expect(getResizeObserverEntryDatasetId(createEntry({ dataset: null }), "rowId")).toBeNull();
  });

  it("detects resize observer dataset targets structurally", () => {
    expect(isResizeObserverDatasetTarget({ dataset: { rowId: "row-1" } })).toBe(true);
    expect(isResizeObserverDatasetTarget({})).toBe(true);
    expect(isResizeObserverDatasetTarget({ dataset: null })).toBe(false);
    expect(isResizeObserverDatasetTarget(null)).toBe(false);
  });

  it("sets element dataset ids", () => {
    const element = { dataset: {} };

    setElementDatasetId(element, "columnId", "status");
    setElementDatasetId(element, "rowId", "row-1");

    expect(element.dataset).toEqual({ columnId: "status", rowId: "row-1" });
  });

  it("observes element collections", () => {
    const observed: string[] = [];
    const first = { id: "first" } as unknown as Element;
    const second = { id: "second" } as unknown as Element;

    observeElements(
      {
        observe: (element) => {
          observed.push((element as unknown as { id: string }).id);
        },
      },
      [first, second],
    );

    expect(observed).toEqual(["first", "second"]);
  });

  it("disconnects resize observers", () => {
    let disconnectCount = 0;

    disconnectResizeObserver({
      disconnect: () => {
        disconnectCount += 1;
      },
    });
    disconnectResizeObserver(null);
    disconnectResizeObserver(undefined);

    expect(disconnectCount).toBe(1);
  });

  it("removes observed elements by id", () => {
    const unobserved: string[] = [];
    const element = { id: "row-1" } as unknown as Element;
    const elements = new Map<string, Element>([["row-1", element]]);

    removeObservedElement(
      {
        unobserve: (target) => {
          unobserved.push((target as unknown as { id: string }).id);
        },
      },
      elements,
      "row-1",
    );

    expect(unobserved).toEqual(["row-1"]);
    expect(elements.has("row-1")).toBe(false);
  });

  it("replaces observed elements by id", () => {
    const observed: string[] = [];
    const unobserved: string[] = [];
    const previous = { id: "previous" } as unknown as Element;
    const next = { id: "next" } as unknown as Element;
    const elements = new Map<string, Element>([["row-1", previous]]);

    replaceObservedElement(
      {
        observe: (target) => {
          observed.push((target as unknown as { id: string }).id);
        },
        unobserve: (target) => {
          unobserved.push((target as unknown as { id: string }).id);
        },
      },
      elements,
      "row-1",
      next,
    );

    expect(unobserved).toEqual(["previous"]);
    expect(observed).toEqual(["next"]);
    expect(elements.get("row-1")).toBe(next);
  });

  it("applies resize observer measured sizes by dataset id", () => {
    const sizes = new Map<string, number>();
    const cache = {
      set: (key: string, size: number) => {
        const changed = sizes.get(key) !== size;
        sizes.set(key, size);
        return changed;
      },
    };
    const createEntry = (target: unknown, height: number): ResizeObserverEntry =>
      ({
        target,
        contentRect: { height } as DOMRectReadOnly,
      }) as ResizeObserverEntry;

    expect(
      applyResizeObserverMeasuredSizes(
        [
          createEntry({ dataset: { rowId: "row-1" } }, 48),
          createEntry({ dataset: { rowId: "" } }, 64),
          createEntry({ dataset: { columnId: "status" } }, 96),
        ],
        {
          cache,
          datasetKey: "rowId",
          getSize: (entry) => entry.contentRect.height,
        },
      ),
    ).toBe(true);
    expect(Array.from(sizes.entries())).toEqual([["row-1", 48]]);

    expect(
      applyResizeObserverMeasuredSizes([createEntry({ dataset: { rowId: "row-1" } }, 48)], {
        cache,
        datasetKey: "rowId",
        getSize: (entry) => entry.contentRect.height,
      }),
    ).toBe(false);
  });

  it("detects pointer movement beyond the drag threshold", () => {
    const start = { startX: 10, startY: 20 };

    expect(hasPointerMovedPastDragThreshold({ clientX: 15, clientY: 20 }, start)).toBe(true);
    expect(hasPointerMovedPastDragThreshold({ clientX: 10, clientY: 25 }, start)).toBe(true);
    expect(hasPointerMovedPastDragThreshold({ clientX: 14, clientY: 24 }, start)).toBe(false);
    expect(hasPointerMovedPastDragThreshold({ clientX: 16, clientY: 20 }, start, 6)).toBe(false);
    expect(hasPointerMovedPastDragThreshold({ clientX: 17, clientY: 20 }, start, 6)).toBe(true);
  });

  it("updates shared pointer drag movement state after the drag threshold", () => {
    const drag = { startX: 10, startY: 20, didDrag: false };

    expect(updatePointerDragDidMovePastThreshold(drag, { clientX: 14, clientY: 24 })).toBe(false);
    expect(drag.didDrag).toBe(false);
    expect(updatePointerDragDidMovePastThreshold(drag, { clientX: 15, clientY: 20 })).toBe(true);
    expect(drag.didDrag).toBe(true);
    expect(updatePointerDragDidMovePastThreshold(drag, { clientX: 10, clientY: 20 })).toBe(true);

    const customThresholdDrag = { startX: 10, startY: 20, didDrag: false };
    expect(updatePointerDragDidMovePastThreshold(customThresholdDrag, { clientX: 16, clientY: 20 }, 6)).toBe(false);
    expect(updatePointerDragDidMovePastThreshold(customThresholdDrag, { clientX: 17, clientY: 20 }, 6)).toBe(true);
  });

  it("detects primary pointer button and active primary drags", () => {
    expect(isPrimaryPointerButton({ button: 0 })).toBe(true);
    expect(isPrimaryPointerButton({ button: 1 })).toBe(false);
    expect(isPrimaryPointerButton({ button: 2 })).toBe(false);

    expect(isPrimaryPointerDragActive({ buttons: 1 })).toBe(true);
    expect(isPrimaryPointerDragActive({ buttons: 3 })).toBe(true);
    expect(isPrimaryPointerDragActive({ buttons: 0 })).toBe(false);
    expect(isPrimaryPointerDragActive({ buttons: 2 })).toBe(false);
  });

  it("returns cell pointer drag start guard decisions", () => {
    expect(getCanStartCellPointerDrag({ button: 0 }, null)).toBe(true);
    expect(getCanStartCellPointerDrag({ button: 0 }, undefined)).toBe(true);
    expect(getCanStartCellPointerDrag({ button: 1 }, null)).toBe(false);
    expect(getCanStartCellPointerDrag({ button: 0 }, { rowId: "row-1", columnId: "name" })).toBe(false);
  });

  it("returns pointer drag continuation guard decisions", () => {
    const drag = { pointerId: 2, target: "cell" };

    expect(getCanContinuePointerDrag(drag, { pointerId: 2, buttons: 1 })).toBe(true);
    expect(getCanContinuePointerDrag(drag, { pointerId: 3, buttons: 1 })).toBe(false);
    expect(getCanContinuePointerDrag(drag, { pointerId: 2, buttons: 0 })).toBe(false);
    expect(getCanContinuePointerDrag(null, { pointerId: 2, buttons: 1 })).toBe(false);
    expect(getCanContinuePointerDrag(undefined, { pointerId: 2, buttons: 1 })).toBe(false);
  });

  it("returns pointer drag end guard decisions", () => {
    const drag = { pointerId: 2, target: "cell" };

    expect(getCanEndPointerDrag(drag, { pointerId: 2 })).toBe(true);
    expect(getCanEndPointerDrag(drag, { pointerId: 3 })).toBe(false);
    expect(getCanEndPointerDrag(null, { pointerId: 2 })).toBe(false);
    expect(getCanEndPointerDrag(undefined, { pointerId: 2 })).toBe(false);
  });

  it("returns shared header drag end actions", () => {
    const groupingPanelElement = {
      getBoundingClientRect: () => ({
        left: 10,
        right: 30,
        top: 20,
        bottom: 40,
      }),
    };
    const columns = [
      { id: "name", getCanGroup: () => true },
      { id: "status", getCanGroup: () => false },
    ];
    const groupAction = getHeaderDragEndAction(
      { sourceColumnId: "name", targetColumnId: "status", didDrag: true },
      {
        event: { clientX: 20, clientY: 30 },
        groupingPanel: true,
        groupingPanelElement,
        columns,
      },
    );
    const moveAction = getHeaderDragEndAction(
      { sourceColumnId: "status", targetColumnId: "name", didDrag: true },
      {
        event: { clientX: 20, clientY: 30 },
        groupingPanel: true,
        groupingPanelElement,
        columns,
      },
    );

    expect(
      getHeaderDragEndAction(
        { sourceColumnId: "name", targetColumnId: "status", didDrag: false },
        {
          event: { clientX: 20, clientY: 30 },
          groupingPanel: true,
          groupingPanelElement,
          columns,
        },
      ),
    ).toBeNull();
    expect(groupAction).toEqual({ type: "group", columnId: "name" });
    expect(moveAction).toEqual({ type: "move", sourceColumnId: "status", targetColumnId: "name" });
    expect(
      getHeaderDragEndAction(
        { sourceColumnId: "name", targetColumnId: "status", didDrag: true },
        {
          event: { clientX: 40, clientY: 30 },
          groupingPanel: true,
          groupingPanelElement,
          columns,
        },
      ),
    ).toEqual({ type: "move", sourceColumnId: "name", targetColumnId: "status" });
    expect(isHeaderDragGroupAction(groupAction)).toBe(true);
    expect(isHeaderDragGroupAction(moveAction)).toBe(false);
    expect(isHeaderDragMoveAction(moveAction)).toBe(true);
    expect(isHeaderDragMoveAction(null)).toBe(false);
  });

  it("calculates the cumulative size offset before an index", () => {
    const sizes = [12, 24, 36, 48];

    expect(getSizeOffset(0, (index) => sizes[index] ?? 0)).toBe(0);
    expect(getSizeOffset(1, (index) => sizes[index] ?? 0)).toBe(12);
    expect(getSizeOffset(3, (index) => sizes[index] ?? 0)).toBe(72);
  });

  it("calculates the total width from column layout end offsets", () => {
    expect(getColumnLayoutTotalWidth([])).toBe(0);
    expect(getColumnLayoutTotalWidth([{ end: 120 }, { end: 80 }, { end: 240 }])).toBe(240);
  });

  it("indexes column layout entries by id", () => {
    const layout = [
      { id: "name", start: 0, end: 120, size: 120, pinned: false },
      { id: "age", start: 120, end: 200, size: 80, pinned: "right" as const, pinnedStart: 0 },
    ];
    const layoutById = getColumnLayoutById(layout);

    expect(layoutById.get("name")).toBe(layout[0]);
    expect(layoutById.get("age")).toBe(layout[1]);
    expect(layoutById.get("missing")).toBeUndefined();
  });

  it("finds columns and rows by id", () => {
    const columns = [{ id: "name", label: "Name" }, { id: "age", label: "Age" }];
    const rows = [{ id: "row-1", name: "Ada" }, { id: "row-2", name: "Grace" }];

    expect(getColumnById("name", columns)).toBe(columns[0]);
    expect(getColumnById("missing", columns)).toBeUndefined();
    expect(getColumnIndexById("age", columns)).toBe(1);
    expect(getColumnIndexById("missing", columns)).toBe(-1);
    expect(getRowById("row-2", rows)).toBe(rows[1]);
    expect(getRowById("missing", rows)).toBeUndefined();
  });

  it("moves visible columns by direction and target column", () => {
    const columns = [{ id: "name" }, { id: "age" }, { id: "status" }] as Column<Person, unknown>[];
    const moves: Array<[string, string, "before" | "after"]> = [];
    const grid = {
      getVisibleLeafColumns: () => columns,
      moveColumn: (sourceColumnId: string, targetColumnId: string, position: "before" | "after") => {
        moves.push([sourceColumnId, targetColumnId, position]);
      },
    } as Pick<Grid<Person>, "getVisibleLeafColumns" | "moveColumn">;

    expect(moveVisibleColumn(grid, "age", "left")).toBe(true);
    expect(moveVisibleColumn(grid, "age", "right")).toBe(true);
    expect(moveVisibleColumn(grid, "name", "left")).toBe(false);
    expect(moveVisibleColumn(grid, "missing", "right")).toBe(false);
    expect(moveColumnToTarget(grid, "name", "status")).toBe(true);
    expect(moveColumnToTarget(grid, "status", "name")).toBe(true);
    expect(moveColumnToTarget(grid, "name", "name")).toBe(false);
    expect(moveColumnToTarget(grid, "name", "missing")).toBe(false);

    expect(moves).toEqual([
      ["age", "name", "before"],
      ["age", "status", "after"],
      ["name", "status", "after"],
      ["status", "name", "before"],
    ]);
  });

  it("moves grouped columns by direction", () => {
    const groupingColumns = [{ id: "status" }, { id: "owner" }, { id: "priority" }] as Column<Person, unknown>[];
    const moves: Array<[string, string, "before" | "after"]> = [];
    const grid = {
      moveGroupingColumn: (sourceColumnId: string, targetColumnId: string, position: "before" | "after") => {
        moves.push([sourceColumnId, targetColumnId, position]);
      },
    } as Pick<Grid<Person>, "moveGroupingColumn">;

    expect(moveGroupedColumn(grid, groupingColumns, "owner", "left")).toBe(true);
    expect(moveGroupedColumn(grid, groupingColumns, "owner", "right")).toBe(true);
    expect(moveGroupedColumn(grid, groupingColumns, "status", "left")).toBe(false);
    expect(moveGroupedColumn(grid, groupingColumns, "missing", "right")).toBe(false);

    expect(moves).toEqual([
      ["owner", "status", "before"],
      ["owner", "priority", "after"],
    ]);
  });

  it("resolves row virtualization options", () => {
    expect(resolveRowVirtualizationOptions(true)).toEqual({ enabled: true, estimateRowHeight: 40, measureRowHeight: true, overscan: 6 });
    expect(resolveRowVirtualizationOptions(false)).toEqual({ enabled: false, estimateRowHeight: 40, measureRowHeight: true, overscan: 6 });
    expect(resolveRowVirtualizationOptions(undefined)).toEqual({ enabled: false, estimateRowHeight: 40, measureRowHeight: true, overscan: 6 });
    expect(resolveRowVirtualizationOptions({ estimateRowHeight: 64, measureRowHeight: false, overscan: 10 })).toEqual({ enabled: true, estimateRowHeight: 64, measureRowHeight: false, overscan: 10 });
    expect(resolveRowVirtualizationOptions({ enabled: false })).toEqual({ enabled: false, estimateRowHeight: 40, measureRowHeight: true, overscan: 6 });
  });

  it("resolves column virtualization options", () => {
    expect(resolveColumnVirtualizationOptions(true)).toEqual({ enabled: true, measureColumnWidth: true, overscan: 2 });
    expect(resolveColumnVirtualizationOptions(false)).toEqual({ enabled: false, measureColumnWidth: true, overscan: 2 });
    expect(resolveColumnVirtualizationOptions(undefined)).toEqual({ enabled: false, measureColumnWidth: true, overscan: 2 });
    expect(resolveColumnVirtualizationOptions({ overscan: 5 })).toEqual({ enabled: true, measureColumnWidth: true, overscan: 5 });
    expect(resolveColumnVirtualizationOptions({ enabled: false })).toEqual({ enabled: false, measureColumnWidth: true, overscan: 2 });
    expect(resolveColumnVirtualizationOptions({ measureColumnWidth: false })).toEqual({ enabled: true, measureColumnWidth: false, overscan: 2 });
  });

  it("calculates scroll offsets for offscreen focused cells", () => {
    const rows = [{ id: "row-1" }, { id: "row-2" }, { id: "row-3" }, { id: "row-4" }] as Row<Person>[];
    const layout = [
      { id: "select", start: 0, end: 48, size: 48, pinned: "left" as const },
      { id: "name", start: 48, end: 168, size: 120, pinned: false as const },
      { id: "status", start: 168, end: 288, size: 120, pinned: false as const },
      { id: "actions", start: 288, end: 352, size: 64, pinned: "right" as const },
    ];
    const rowVirtualOptions = { enabled: true, estimateRowHeight: 40, overscan: 6 };
    const columnVirtualOptions = { enabled: true, overscan: 2 };

    expect(
      getScrollForFocusedCell({
        focusedCell: { rowId: "row-4", columnId: "status" },
        layout,
        rows,
        currentScrollLeft: 0,
        currentScrollTop: 0,
        viewportWidth: 200,
        viewportHeight: 80,
        headerHeight: 32,
        getRowSize: () => 40,
        rowVirtualOptions,
        columnVirtualOptions,
      }),
    ).toEqual({ scrollLeft: 152, scrollTop: 112 });

    expect(
      getScrollForFocusedCell({
        focusedCell: { rowId: "row-1", columnId: "select" },
        layout,
        rows,
        currentScrollLeft: 40,
        currentScrollTop: 100,
        viewportWidth: 200,
        viewportHeight: 80,
        headerHeight: 32,
        getRowSize: () => 40,
        rowVirtualOptions,
        columnVirtualOptions,
      }),
    ).toEqual({ scrollLeft: 40, scrollTop: 32 });
  });

  it("returns virtual row position styles", () => {
    const virtualItem = { start: 120, size: 36 };

    expect(getVirtualRowStyle(null)).toBeUndefined();
    expect(getVirtualRowStyle(virtualItem)).toEqual({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 36,
      transform: "translateY(120px)",
    });
    expect(getVirtualRowStyleText(undefined)).toBeUndefined();
    expect(getVirtualRowStyleText(virtualItem)).toBe("position: absolute; top: 0; left: 0; right: 0; height: 36px; transform: translateY(120px)");
  });

  it("returns virtual body height styles", () => {
    const virtualRange = { totalSize: 720 };

    expect(getVirtualBodyStyle(null)).toBeUndefined();
    expect(getVirtualBodyStyle(virtualRange)).toEqual({ height: 720 });
    expect(getVirtualBodyStyleText(undefined)).toBeUndefined();
    expect(getVirtualBodyStyleText(virtualRange)).toBe("height: 720px");
  });

  it("returns shared inline size styles", () => {
    expect(getInlineSizeStyle(320)).toEqual({ width: 320 });
    expect(getInlineSizeStyleText(320)).toBe("width: 320px");
    expect(getVirtualizedInlineSizeStyle(480, false)).toBeUndefined();
    expect(getVirtualizedInlineSizeStyle(480, true)).toEqual({ width: 480, minWidth: 480 });
    expect(getVirtualizedInlineSizeStyleText(480, false)).toBeUndefined();
    expect(getVirtualizedInlineSizeStyleText(480, true)).toBe("width: 480px; min-width: 480px");
    expect(getPinnedColumnOffsetStyle({ pinned: false })).toBeUndefined();
    expect(getPinnedColumnOffsetStyle({ pinned: "left", pinnedStart: 24 })).toEqual({ position: "sticky", left: 24 });
    expect(getPinnedColumnOffsetStyle({ pinned: "right" })).toEqual({ position: "sticky", right: 0 });
    expect(getPinnedColumnOffsetStyleText({ pinned: false })).toBeUndefined();
    expect(getPinnedColumnOffsetStyleText({ pinned: "left", pinnedStart: 24 })).toBe("position: sticky; left: 24px");
    expect(getPinnedColumnOffsetStyleText({ pinned: "right" })).toBe("position: sticky; right: 0px");
  });

  it("compares cell coordinates by row and column id", () => {
    expect(isCellCoordinateEqual({ rowId: "row-1", columnId: "name" }, { rowId: "row-1", columnId: "name" })).toBe(true);
    expect(isCellCoordinateEqual({ rowId: "row-1", columnId: "name" }, { rowId: "row-2", columnId: "name" })).toBe(false);
    expect(isCellCoordinateEqual({ rowId: "row-1", columnId: "name" }, { rowId: "row-1", columnId: "age" })).toBe(false);
    expect(isCellCoordinateEqual(null, { rowId: "row-1", columnId: "name" })).toBe(false);
    expect(isCellCoordinateEqual({ rowId: "row-1", columnId: "name" }, undefined)).toBe(false);
  });

  it("prevents default behavior and stops event propagation", () => {
    const calls: string[] = [];

    preventDefaultAndStopPropagation({
      preventDefault: () => calls.push("preventDefault"),
      stopPropagation: () => calls.push("stopPropagation"),
    });

    expect(calls).toEqual(["preventDefault", "stopPropagation"]);
  });

  it("prevents default behavior", () => {
    const calls: string[] = [];

    expect(getShouldPreventEventDefault({ defaultPrevented: true })).toBe(true);
    expect(getShouldPreventEventDefault({ defaultPrevented: false })).toBe(false);

    preventEventDefault({
      preventDefault: () => calls.push("preventDefault"),
    });

    expect(calls).toEqual(["preventDefault"]);
  });

  it("stops event propagation", () => {
    const calls: string[] = [];

    stopEventPropagation({
      stopPropagation: () => calls.push("stopPropagation"),
    });

    expect(calls).toEqual(["stopPropagation"]);
  });

  it("suppresses the next click event once", () => {
    const controller = createClickSuppressionController();
    const calls: string[] = [];
    const event = {
      preventDefault: () => calls.push("preventDefault"),
      stopPropagation: () => calls.push("stopPropagation"),
    };

    expect(controller.consume(event)).toBe(false);

    controller.suppress();

    expect(controller.consume(event)).toBe(true);
    expect(calls).toEqual(["preventDefault", "stopPropagation"]);
    expect(controller.consume(event)).toBe(false);
    expect(calls).toEqual(["preventDefault", "stopPropagation"]);
  });

  it("suppresses the next click without requiring an event", () => {
    const controller = createClickSuppressionController();

    expect(controller.consume()).toBe(false);

    controller.suppress();

    expect(controller.consume()).toBe(true);
    expect(controller.consume()).toBe(false);
  });
});
