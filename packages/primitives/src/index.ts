import type { CellCoordinate, Column, ColumnFiltersState, ColumnId, ColumnLayout, ColumnPinningPosition, FocusDirection, Grid, GridState, MoveFocusOptions, Row } from "@open-grid/core";

export type PrimitiveProps = Record<string, string | number | boolean | undefined>;

export const GRID_DENSITIES = ["compact", "standard", "comfortable"] as const;

export type GridDensity = (typeof GRID_DENSITIES)[number];

export interface GridLocalization {
  dataGridLabel: string;
  noRows: string;
  loadingRowsLabel: string;
  loadingRows: string;
  gridErrorLabel: string;
  gridError: string;
  retryLoadingRowsLabel: string;
  retry: string;
  filterPlaceholder: string;
  filterColumnLabel: (label: string) => string;
  searchGridRowsLabel: string;
  searchRowsPlaceholder: string;
  searchAllRowsLabel: string;
  clearRowSearchLabel: string;
  clear: string;
  rowSelectionLabel: string;
  selectAllRowsOnCurrentPageLabel: string;
  selectPage: string;
  selectedRows: (count: number) => string;
  clearRowSelectionLabel: string;
  clearSelection: string;
  gridColumnsLabel: string;
  manageColumnsLabel: (visibleCount: number, totalCount: number) => string;
  columnsSummary: (visibleCount: number, totalCount: number) => string;
  findColumns: string;
  columnVisibilityLabel: string;
  columnsVisible: (visibleCount: number, totalCount: number) => string;
  noColumnsFound: string;
  showAllColumnsLabel: string;
  showAll: string;
  rowDensityLabel: string;
  useDensityLabel: (density: GridDensity) => string;
  densityLabel: (density: GridDensity) => string;
  paginationLabel: string;
  paginationActionLabel: (action: PaginationAction) => string;
  pageStatus: (page: number, pageCount: number) => string;
  rowsPerPageLabel: string;
  pageSizeOption: (pageSize: number) => string;
  resizeColumnLabel: (columnId: string) => string;
  columnPinningLabel: (columnId: string) => string;
  pinColumnLabel: (columnId: string, position: ColumnPinningPosition) => string;
  openColumnMenuLabel: (columnId: string) => string;
  columnMenuLabel: (columnId: string) => string;
  headerActionMenuTrigger: string;
  headerActionMenuItemLabel: (itemId: HeaderActionMenuDefaultItemId, grouped: boolean) => string;
  columnGroupingLabel: string;
  groupingPanelEmpty: string;
  moveColumnGroupingLabel: (columnId: string, direction: "left" | "right") => string;
  removeColumnGroupingLabel: (columnId: string) => string;
  toggleRowExpandedLabel: (expanded: boolean, label: string) => string;
  blankGroupValue: string;
  groupFooterTotal: string;
  editColumnLabel: (columnId: string) => string;
}

export type GridLocalizationOverrides = Partial<GridLocalization>;

export const DEFAULT_GRID_LOCALIZATION: Readonly<GridLocalization> = Object.freeze<GridLocalization>({
  dataGridLabel: "Data grid",
  noRows: "No rows",
  loadingRowsLabel: "Loading rows",
  loadingRows: "Loading rows...",
  gridErrorLabel: "Grid error",
  gridError: "Unable to load rows.",
  retryLoadingRowsLabel: "Retry loading rows",
  retry: "Retry",
  filterPlaceholder: "Filter",
  filterColumnLabel: (label) => `Filter ${label}`,
  searchGridRowsLabel: "Search grid rows",
  searchRowsPlaceholder: "Search rows",
  searchAllRowsLabel: "Search all rows",
  clearRowSearchLabel: "Clear row search",
  clear: "Clear",
  rowSelectionLabel: "Row selection",
  selectAllRowsOnCurrentPageLabel: "Select all rows on current page",
  selectPage: "Select page",
  selectedRows: (count) => `${count} ${count === 1 ? "row" : "rows"} selected`,
  clearRowSelectionLabel: "Clear row selection",
  clearSelection: "Clear selection",
  gridColumnsLabel: "Grid columns",
  manageColumnsLabel: (visibleCount, totalCount) => `Manage columns, ${visibleCount} of ${totalCount} columns visible`,
  columnsSummary: (visibleCount, totalCount) => `Columns ${visibleCount}/${totalCount}`,
  findColumns: "Find columns",
  columnVisibilityLabel: "Column visibility",
  columnsVisible: (visibleCount, totalCount) => `${visibleCount} of ${totalCount} columns visible`,
  noColumnsFound: "No columns found",
  showAllColumnsLabel: "Show all columns",
  showAll: "Show all",
  rowDensityLabel: "Row density",
  useDensityLabel: (density) => `Use ${density} density`,
  densityLabel: (density) => ({ compact: "Compact", standard: "Standard", comfortable: "Comfortable" })[density],
  paginationLabel: "Pagination",
  paginationActionLabel: (action) => ({ first: "First page", previous: "Previous page", next: "Next page", last: "Last page" })[action],
  pageStatus: (page, pageCount) => `Page ${page} of ${pageCount}`,
  rowsPerPageLabel: "Rows per page",
  pageSizeOption: (pageSize) => `${pageSize} rows`,
  resizeColumnLabel: (columnId) => `Resize ${columnId} column`,
  columnPinningLabel: (columnId) => `${columnId} column pinning`,
  pinColumnLabel: (columnId, position) => position === "left" ? `Pin ${columnId} left` : position === "right" ? `Pin ${columnId} right` : `Unpin ${columnId}`,
  openColumnMenuLabel: (columnId) => `Open ${columnId} column menu`,
  columnMenuLabel: (columnId) => `${columnId} column menu`,
  headerActionMenuTrigger: "...",
  headerActionMenuItemLabel: (itemId, grouped) => ({
    "sort-asc": "Sort ascending",
    "sort-desc": "Sort descending",
    "clear-sort": "Clear sort",
    "move-left": "Move left",
    "move-right": "Move right",
    "pin-left": "Pin left",
    unpin: "Unpin",
    "pin-right": "Pin right",
    "toggle-group": grouped ? "Ungroup column" : "Group by column",
  })[itemId],
  columnGroupingLabel: "Column grouping",
  groupingPanelEmpty: "Drag column headers here to group",
  moveColumnGroupingLabel: (columnId, direction) => `Move ${columnId} grouping ${direction}`,
  removeColumnGroupingLabel: (columnId) => `Remove ${columnId} grouping`,
  toggleRowExpandedLabel: (expanded, label) => `${expanded ? "Collapse" : "Expand"} ${label}`,
  blankGroupValue: "(blank)",
  groupFooterTotal: "Total",
  editColumnLabel: (columnId) => `Edit ${columnId}`,
});

export function createGridLocalization(overrides: GridLocalizationOverrides = {}): Readonly<GridLocalization> {
  return Object.freeze({ ...DEFAULT_GRID_LOCALIZATION, ...overrides });
}

export const GRID_PREFERENCES_VERSION = 1 as const;

export interface GridPreferencesState {
  columnVisibility: GridState["columnVisibility"];
  columnSizing: GridState["columnSizing"];
  columnOrder: GridState["columnOrder"];
  columnPinning: GridState["columnPinning"];
}

export interface GridPreferences {
  version: typeof GRID_PREFERENCES_VERSION;
  density: GridDensity;
  state: GridPreferencesState;
}

export interface GridPreferencesOptions {
  validColumnIds?: readonly string[] | undefined;
}

export interface GridPreferencesMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (preferences: Readonly<Record<string, unknown>>) => unknown;
}

export interface GridPreferencesParseOptions extends GridPreferencesOptions {
  migrations?: readonly GridPreferencesMigration[] | undefined;
}

export interface GridPreferencesStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface GridPreferencesStorageEnvironmentLike {
  localStorage?: GridPreferencesStorageLike | null | undefined;
}

export interface CellPrimitiveOptions {
  focusedCell?: CellCoordinate | null;
  editing?: boolean;
  rangeSelected?: boolean;
  rowIndexOffset?: number | undefined;
}

export interface CellEditorPrimitiveOptions {
  invalid?: boolean | undefined;
}

export interface CellEditorOptionPrimitiveOptions {
  value: string;
  label?: string | undefined;
  disabled?: boolean | undefined;
}

export interface CellEditorValueTargetLike {
  value?: unknown;
}

export interface CellEditorValueEventLike<TTarget = unknown> {
  currentTarget?: TTarget | null | undefined;
  target?: TTarget | null | undefined;
}

export interface CellEditValidationEventLike {
  validation?: {
    valid: boolean;
    message?: string | undefined;
  } | undefined;
}

export interface CellFillHandleVisibilityOptions {
  activeEditing?: boolean | undefined;
  editing?: boolean | undefined;
  fillHandleCoordinate?: CellCoordinate | null | undefined;
  rangeSelected?: boolean | undefined;
}

export interface ClipboardTextAreaLike {
  value: string;
  style: {
    position?: string | undefined;
    top?: string | undefined;
    left?: string | undefined;
  };
  select: () => void;
  setAttribute: (name: string, value: string) => void;
}

export interface ClipboardTextParentLike {
  appendChild: (element: ClipboardTextAreaLike) => void;
  removeChild: (element: ClipboardTextAreaLike) => void;
}

export interface ClipboardTextDocumentLike {
  body?: ClipboardTextParentLike | null | undefined;
  documentElement: ClipboardTextParentLike;
  createElement: (tagName: "textarea") => ClipboardTextAreaLike;
  execCommand: (command: "copy") => boolean;
}

export interface ClipboardTextNavigatorLike {
  clipboard?: {
    readText?: () => Promise<string> | string;
    writeText?: (text: string) => Promise<void> | void;
  } | undefined;
}

export interface ClipboardTextEnvironment {
  document?: ClipboardTextDocumentLike | undefined;
  navigator?: ClipboardTextNavigatorLike | undefined;
}

export interface BrowserExportFileLike {
  filename: string;
  mimeType: string;
  text: string;
}

export interface BrowserDownloadAnchorLike {
  href: string;
  download: string;
  style: {
    display?: string | undefined;
  };
  click: () => void;
}

export interface BrowserDownloadParentLike {
  appendChild: (element: BrowserDownloadAnchorLike) => void;
  removeChild: (element: BrowserDownloadAnchorLike) => void;
}

export interface BrowserDownloadDocumentLike {
  body?: BrowserDownloadParentLike | null | undefined;
  documentElement: BrowserDownloadParentLike;
  createElement: (tagName: "a") => BrowserDownloadAnchorLike;
}

export interface BrowserDownloadBlobConstructorLike {
  new (blobParts: readonly string[], options: { type: string }): unknown;
}

export interface BrowserDownloadUrlLike {
  createObjectURL: (blob: unknown) => string;
  revokeObjectURL: (url: string) => void;
}

export interface BrowserDownloadEnvironment {
  blob?: BrowserDownloadBlobConstructorLike | undefined;
  document?: BrowserDownloadDocumentLike | undefined;
  url?: BrowserDownloadUrlLike | undefined;
}

export interface FocusableElementLike {
  focus: () => void;
}

export interface HeaderActionMenuItemFocusTargetLike extends FocusableElementLike {}

export interface FocusableSelectableElementLike extends FocusableElementLike {
  select?: (() => void) | undefined;
}

export interface FocusedCellContainerLike {
  querySelector: (selector: string) => FocusableElementLike | null;
}

export interface KeyboardTargetEventLike {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}

export interface HeaderActionMenuFocusTargetEventLike {
  currentTarget: unknown;
}

export interface HeaderActionMenuActiveElementDocumentLike {
  activeElement?: unknown;
}

export interface HeaderActionMenuActiveElementTargetLike {
  ownerDocument?: HeaderActionMenuActiveElementDocumentLike | null | undefined;
}

export interface HeaderActionMenuFocusTargetLike extends ParentNode {
  focus: () => void;
}

export interface FocusedCellRestoreOptions {
  focusedCell: CellCoordinate | null | undefined;
  scroller: unknown;
  shouldRestore: boolean;
  inProgress?: boolean | undefined;
}

export interface FocusedCellRestoreFrameSyncOptions {
  inProgress?: boolean | undefined;
}

export interface ElementIdLookupLike<TElement extends FocusableElementLike = FocusableElementLike> {
  getElementById: (id: string) => TElement | null;
}

export interface ScrollPositionElementLike {
  scrollLeft: number;
  scrollTop: number;
}

export interface ScrollFrameElementLike extends ScrollPositionElementLike {
  clientHeight: number;
  clientWidth: number;
}

export interface ScrollFrameElementOptions {
  scrollLeft?: number | undefined;
  scrollTop?: number | undefined;
  stickyTopOffset?: number | undefined;
}

export interface ScrollFrameOptionsLike {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  stickyTopOffset: number;
}

export type FocusedCellScrollElementOptions<TData> = Omit<
  FocusedCellScrollOptions<TData>,
  "currentScrollLeft" | "currentScrollTop" | "viewportWidth" | "viewportHeight"
>;

export interface FocusedRowSelectionTarget<TData> {
  row: Row<TData>;
  rowIndex: number;
}

export interface CellLayoutPrimitiveOptions {
  invalid?: boolean | undefined;
  pinnedEdge?: "left" | "right" | undefined;
}

export interface RowPrimitiveOptions {
  selected?: boolean;
  rowIndexOffset?: number | undefined;
}

export interface RowExpansionTogglePrimitiveOptions {
  expanded: boolean;
  label: string;
}

export interface RowLayoutPrimitiveOptions {
  expanded?: boolean | undefined;
  virtualIndex?: number | undefined;
  columnVirtualized?: boolean | undefined;
}

export interface ColumnPinningButtonPrimitiveOptions {
  position: ColumnPinningPosition;
  active: boolean;
}

export interface HeaderActionMenuTriggerPrimitiveOptions {
  expanded: boolean;
  controls: string;
}

export interface HeaderActionMenuItemPrimitiveOptions {
  disabled?: boolean | undefined;
}

export interface HeaderActionMenuLabelPrimitiveOptions {
  label?: string | undefined;
}

export interface HeaderCellLayoutPrimitiveOptions {
  colSpan?: number | undefined;
  rowSpan?: number | undefined;
  grouped?: boolean | undefined;
  placeholder?: boolean | undefined;
  pinnedEdge?: "left" | "right" | undefined;
  draggable?: boolean | undefined;
}

export interface HeaderCellPrimitiveOptions {
  pinned?: ColumnPinningPosition | undefined;
}

export interface HeaderButtonPrimitiveOptions {
  disabled?: boolean | undefined;
  placeholder?: boolean | undefined;
}

export interface HeaderSortIndicatorTextOptions {
  visible?: boolean | undefined;
}

export interface HeaderKeyboardMoveEventLike {
  key: string;
  altKey?: boolean | undefined;
  shiftKey?: boolean | undefined;
}

export interface GridKeyboardShortcutEventLike {
  key: string;
  ctrlKey?: boolean | undefined;
  metaKey?: boolean | undefined;
  altKey?: boolean | undefined;
  shiftKey?: boolean | undefined;
}

export type GridKeyboardShortcutAction = "copy" | "paste" | "undo-edit" | "redo-edit" | "row-selection";

export type GridKeyboardEditAction = "start-edit" | "cancel-edit";

export type CellEditorKeyboardAction = "commit-edit" | "cancel-edit";

export interface GridKeyboardFocusMove {
  direction: FocusDirection;
  options: MoveFocusOptions;
}

export interface ColumnResizeHandlePrimitiveOptions {
  valueNow?: number | undefined;
}

export interface ColumnResizeKeyboardEventLike {
  key: string;
  shiftKey?: boolean | undefined;
}

export interface ColumnResizeKeyboardSizeOptions {
  defaultStep?: number | undefined;
  largeStep?: number | undefined;
}

export interface ColumnResizePointerEventLike {
  clientX: number;
}

export interface ColumnResizeFinalSizeEventLike {
  defaultPrevented: boolean;
  size: number;
}

export interface ColumnResizeDefaultPreventableEventLike {
  defaultPrevented: boolean;
}

export interface PointerCaptureTargetLike {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
}

export interface PointerCaptureEventLike {
  currentTarget: unknown;
}

export type PointerListener = (event: PointerEvent) => void;

export interface PointerMoveUpListeners {
  move: PointerListener;
  up: PointerListener;
}

export interface PointerMoveUpListenerTargetLike {
  addEventListener: (type: "pointermove" | "pointerup", listener: PointerListener) => void;
  removeEventListener: (type: "pointermove" | "pointerup", listener: PointerListener) => void;
}

export interface PointerUpCancelListeners {
  up: PointerListener;
  cancel: PointerListener;
}

export interface PointerUpCancelListenerTargetLike {
  addEventListener: (type: "pointerup" | "pointercancel", listener: PointerListener) => void;
  removeEventListener: (type: "pointerup" | "pointercancel", listener: PointerListener) => void;
}

export interface PointerMoveUpCancelListeners {
  move: PointerListener;
  up: PointerListener;
  cancel: PointerListener;
}

export interface PointerMoveUpCancelListenerTargetLike {
  addEventListener: (type: "pointermove" | "pointerup" | "pointercancel", listener: PointerListener) => void;
  removeEventListener: (type: "pointermove" | "pointerup" | "pointercancel", listener: PointerListener) => void;
}

type PointerGlobalListenerType = "pointermove" | "pointerup" | "pointercancel";

export type ScrollListener = (event: Event) => void;

export interface ScrollListenerTargetLike {
  addEventListener: (type: "scroll", listener: ScrollListener, options?: AddEventListenerOptions) => void;
  removeEventListener: (type: "scroll", listener: ScrollListener) => void;
}

export interface GroupingPanelPrimitiveOptions {
  empty?: boolean | undefined;
}

export interface GroupingPanelMoveButtonPrimitiveOptions {
  direction: "left" | "right";
  disabled?: boolean | undefined;
}

export interface GroupRowLabelOptions<TFallback = string> {
  fallback?: TFallback | undefined;
}

export interface GroupCellIndentOptions {
  depthSize?: number | undefined;
  footerOffset?: number | undefined;
}

export interface GridHeaderRowPrimitiveOptions {
  columnVirtualized?: boolean | undefined;
  rowIndex?: number | undefined;
}

export interface GridRowCoordinateOptions {
  additionalHeaderRowCount?: number | undefined;
  headerRowCount?: number | undefined;
  ariaLabel?: string | undefined;
  error?: boolean | undefined;
  loading?: boolean | undefined;
}

export interface ColumnFilterCellPrimitiveOptions {
  columnIndex: number;
  rowIndex: number;
  pinned?: ColumnPinningPosition | undefined;
  pinnedEdge?: "left" | "right" | undefined;
}

export interface ColumnFilterInputPrimitiveOptions {
  label: string;
  value: unknown;
}

export interface QuickFilterInputPrimitiveOptions {
  value: string;
}

export interface RowSelectionCheckboxPrimitiveOptions {
  allSelected?: boolean | undefined;
  someSelected?: boolean | undefined;
  disabled?: boolean | undefined;
}

export interface ColumnVisibilityCheckboxPrimitiveOptions {
  columnId: ColumnId;
  label: string;
  visible: boolean;
  visibleCount?: number | undefined;
  disabled?: boolean | undefined;
}

export interface CheckboxIndeterminateTargetLike {
  indeterminate: boolean;
}

export type PaginationAction = "first" | "previous" | "next" | "last";

export interface PaginationButtonPrimitiveOptions {
  action: PaginationAction;
  disabled?: boolean | undefined;
}

export const DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export interface GridEmptyRowPrimitiveOptions {
  rowIndexOffset?: number | undefined;
}

export interface GridEmptyCellPrimitiveOptions extends GridEmptyRowPrimitiveOptions {
  columnCount?: number | undefined;
}

export interface GridBodyPrimitiveOptions {
  virtualized?: boolean | undefined;
  columnOrder?: readonly string[] | undefined;
}

export interface RowVirtualizationPrimitiveOptions {
  enabled?: boolean | undefined;
  estimateRowHeight?: number | undefined;
  measureRowHeight?: boolean | undefined;
  overscan?: number | undefined;
}

export interface ResolvedRowVirtualizationOptions {
  enabled: boolean;
  estimateRowHeight: number;
  measureRowHeight: boolean;
  overscan: number;
}

export interface ColumnVirtualizationPrimitiveOptions {
  enabled?: boolean | undefined;
  measureColumnWidth?: boolean | undefined;
  overscan?: number | undefined;
}

export interface ResolvedColumnVirtualizationOptions {
  enabled: boolean;
  measureColumnWidth: boolean;
  overscan: number;
}

export interface FocusedCellScrollOptions<TData> {
  focusedCell: CellCoordinate;
  layout: readonly ColumnLayout[];
  rows: readonly Row<TData>[];
  currentScrollLeft: number;
  currentScrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
  headerHeight: number;
  getRowSize: (index: number) => number;
  rowVirtualOptions: ResolvedRowVirtualizationOptions;
  columnVirtualOptions: ResolvedColumnVirtualizationOptions;
}

export interface FocusedCellScrollPosition {
  scrollLeft: number;
  scrollTop: number;
}

export type HeaderActionMenuItemFocusPosition = "first" | "last" | "next" | "previous";

export type HeaderActionMenuKeyboardAction =
  | {
      type: "focus";
      position: HeaderActionMenuItemFocusPosition;
    }
  | {
      type: "close";
    }
  | {
      type: "tab-close";
    };

export type HeaderActionMenuDefaultItemId =
  | "sort-asc"
  | "sort-desc"
  | "clear-sort"
  | "move-left"
  | "move-right"
  | "pin-left"
  | "unpin"
  | "pin-right"
  | "toggle-group";

export interface HeaderActionMenuDefaultItemLabelOptions {
  grouped?: boolean | undefined;
}

export interface HeaderActionMenuDefaultItemDescriptor {
  id: HeaderActionMenuDefaultItemId;
  label: string;
  disabled?: boolean;
}

export interface HeaderActionMenuDefaultItemDescriptorOptions {
  sortDirection: "asc" | "desc" | false;
  pinningPosition: ColumnPinningPosition;
  isGrouped: boolean;
  canGroup: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

export interface HeaderActionMenuPrimitiveItem {
  type?: string | undefined;
}

export interface HeaderActionMenuPrimitiveCustomItem {
  type: "custom";
  props?: Record<string, unknown> | undefined;
}

export interface HeaderActionMenuPrimitiveLabelItem {
  type: "label";
}

export interface HeaderActionMenuPrimitiveSeparatorItem {
  type: "separator";
}

export interface DefaultPreventableEventLike {
  preventDefault(): void;
}

export interface RowSelectionToggleEventLike {
  defaultPrevented: boolean;
}

export interface DefaultPreventedEventLike {
  defaultPrevented: boolean;
}

export interface DefaultPreventablePropagationEventLike {
  preventDefault(): void;
  stopPropagation(): void;
}

export interface PropagationEventLike {
  stopPropagation(): void;
}

export interface PointerClientCoordinateLike {
  clientX: number;
  clientY: number;
}

export interface PointerButtonEventLike {
  button: number;
}

export interface PointerButtonsEventLike {
  buttons: number;
}

export interface PointerIdEventLike {
  pointerId: number;
}

export interface PointerDragSessionLike {
  pointerId: number;
}

export interface VirtualRowStyleItemLike {
  start: number;
  size: number;
}

export interface VirtualBodyStyleRangeLike {
  totalSize: number;
}

export interface VirtualBodyStyleProps {
  height: number;
}

export interface InlineSizeStyleProps {
  width: number;
}

export interface VirtualizedInlineSizeStyleProps {
  width: number;
  minWidth: number;
}

export interface GroupCellIndentStyleProps {
  paddingLeft: number;
}

export interface PinnedColumnOffsetStyleLayoutLike {
  pinned: ColumnPinningPosition;
  pinnedStart?: number | undefined;
}

export type PinnedColumnOffsetStyleProps =
  | {
      position: "sticky";
      left: number;
    }
  | {
      position: "sticky";
      right: number;
    };

export interface VirtualRowStyleProps {
  position: "absolute";
  top: 0;
  left: 0;
  right: 0;
  height: number;
  transform: string;
}

export interface ColumnLayoutTotalWidthItemLike {
  end: number;
}

export interface ColumnIdItemLike {
  id: ColumnId;
}

export interface RowIdItemLike {
  id: string;
}

export interface PointerDragStartLike {
  startX: number;
  startY: number;
}

export interface PointerDragMovementLike extends PointerDragStartLike {
  didDrag?: boolean | undefined;
}

export interface HeaderDragEndLike {
  sourceColumnId: string;
  targetColumnId: string;
  didDrag?: boolean | undefined;
}

export interface HeaderDragEndColumnLike {
  id: string;
  getCanGroup(): boolean;
}

export type HeaderDragEndAction =
  | {
      type: "group";
      columnId: string;
    }
  | {
      type: "move";
      sourceColumnId: string;
      targetColumnId: string;
    };

export interface HeaderDragEndActionOptions<TColumn extends HeaderDragEndColumnLike> {
  event: PointerClientCoordinateLike;
  groupingPanel: boolean;
  groupingPanelElement?: PointerHitTestElementLike | null | undefined;
  columns: readonly TColumn[];
}

export interface PointerHitTestElementLike {
  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface MeasuredBlockElementLike {
  scrollHeight: number;
}

export interface MeasuredBlockRectElementLike extends MeasuredBlockElementLike {
  getBoundingClientRect(): {
    height: number;
  };
}

export interface MeasuredInlineElementLike {
  getBoundingClientRect(): {
    width: number;
  };
}

export type MeasuredBlockRectElementTargetLike = Element & MeasuredBlockRectElementLike;

export type MeasuredInlineDatasetElementTargetLike = Element & MeasuredInlineElementLike & DatasetElementLike;

export interface OffsetBlockElementLike {
  offsetHeight: number;
}

export interface DatasetElementLike {
  dataset: Record<string, string | undefined>;
}

export interface ResizeObserverDatasetTargetLike {
  dataset?: Record<string, string | undefined> | undefined;
}

export interface ResizeObserverDatasetEntryLike {
  target: unknown;
}

export interface ResizeObserverBlockSizeEntryLike {
  target: unknown;
  borderBoxSize?: ResizeObserverEntry["borderBoxSize"] | undefined;
  contentRect: {
    height: number;
  };
}

export interface ResizeObserverInlineSizeEntryLike {
  borderBoxSize?: ResizeObserverEntry["borderBoxSize"] | undefined;
  contentRect: {
    width: number;
  };
}

export type ResizeObserverEntryDatasetKey = "rowId" | "columnId";

export interface ResizeObserverObserveLike {
  observe: (target: Element) => void;
}

export interface ResizeObserverUnobserveLike {
  unobserve: (target: Element) => void;
}

export interface ResizeObserverDisconnectLike {
  disconnect: () => void;
}

export type ResizeObserverConstructorLike = new (callback: ResizeObserverCallback) => ResizeObserver;

export interface ObservedElementMapLike<TElement extends Element> {
  get: (id: string) => TElement | undefined;
  set: (id: string, element: TElement) => unknown;
  delete: (id: string) => unknown;
}

export interface MeasuredSizeCacheLike {
  set: (key: string, size: number) => boolean;
}

export const HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])';

export const HEADER_ACTION_MENU_TRIGGER_TEXT = DEFAULT_GRID_LOCALIZATION.headerActionMenuTrigger;

export const GROUPING_PANEL_EMPTY_MESSAGE = DEFAULT_GRID_LOCALIZATION.groupingPanelEmpty;

export const GRID_FOCUSED_CELL_SELECTOR = '[role="gridcell"][data-focused="true"]';

export const GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR =
  "button, input, select, textarea, a[href], [contenteditable]:not([contenteditable='false']), [role='button'], [role='menuitem'], [role='separator'], [role='slider'], [role='textbox'], [role='combobox'], [role='searchbox'], [role='spinbutton']";

export function getGridProps<TData>(grid: Grid<TData>, options: GridRowCoordinateOptions = {}): PrimitiveProps {
  const headerRowCount = getGridHeaderRowCount(grid, options);
  const rowCount = grid.getOptions().manualPagination
    ? -1
    : headerRowCount + Math.max(1, grid.getPrePaginationRowModel().rows.length);
  const columnCount = grid.getVisibleLeafColumns().length;

  return {
    role: "grid",
    "aria-label": options.ariaLabel,
    "aria-rowcount": rowCount,
    "aria-colcount": columnCount,
    "aria-busy": (options.loading && !options.error) || undefined,
    "data-error": options.error || undefined,
    "data-open-grid": true,
    tabIndex: 0,
  };
}

export function getGridHeaderProps(): PrimitiveProps {
  return {
    role: "rowgroup",
  };
}

export function getGridLoadingOverlayProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "status",
    "aria-live": "polite",
    "aria-label": localization.loadingRowsLabel,
  };
}

export function getGridLoadingText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.loadingRows;
}

export function getGridErrorOverlayProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "alert",
    "aria-live": "assertive",
    "aria-atomic": true,
    "aria-label": localization.gridErrorLabel,
  };
}

export function getGridErrorText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.gridError;
}

export function getGridErrorRetryButtonProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.retryLoadingRowsLabel,
  };
}

export function getGridErrorRetryButtonText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.retry;
}

export function getGridHeaderRowProps(options: GridHeaderRowPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "row",
    "aria-rowindex": (options.rowIndex ?? 0) + 1,
    "data-column-virtualized": options.columnVirtualized || undefined,
  };
}

export function getGridHeaderRowCount<TData>(grid: Grid<TData>, options: GridRowCoordinateOptions = {}): number {
  const headerRowCount = Number.isFinite(options.headerRowCount)
    ? Math.max(0, Math.floor(options.headerRowCount ?? 0))
    : grid.getHeaderGroups().length;
  const additionalHeaderRowCount = Number.isFinite(options.additionalHeaderRowCount)
    ? Math.max(0, Math.floor(options.additionalHeaderRowCount ?? 0))
    : 0;
  return headerRowCount + additionalHeaderRowCount;
}

export function getGridBodyRowIndexOffset<TData>(grid: Grid<TData>, options: GridRowCoordinateOptions = {}): number {
  const { pageIndex, pageSize } = grid.getState().pagination;
  return getGridHeaderRowCount(grid, options) + pageIndex * pageSize;
}

export function getColumnFilterCellProps<TData>(
  column: Column<TData, unknown>,
  options: ColumnFilterCellPrimitiveOptions,
): PrimitiveProps {
  const pinned = options.pinned ?? column.getIsPinned();
  return {
    role: "gridcell",
    "aria-colindex": options.columnIndex + 1,
    "data-column-id": column.id,
    "data-pinned": pinned || undefined,
    "data-pinned-edge": options.pinnedEdge,
  };
}

export function getColumnFilterInputProps<TData>(
  column: Column<TData, unknown>,
  options: ColumnFilterInputPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "search",
    value: options.value == null ? "" : String(options.value),
    placeholder: localization.filterPlaceholder,
    "aria-label": localization.filterColumnLabel(options.label),
    "data-column-id": column.id,
    autoComplete: "off",
  };
}

export function getColumnFilterText(filters: ColumnFiltersState, columnId: ColumnId): string {
  const value = filters.find((filter) => filter.id === columnId)?.value;
  return value == null ? "" : String(value);
}

export function getQuickFilterProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "search",
    "aria-label": localization.searchGridRowsLabel,
  };
}

export function getQuickFilterInputProps(
  options: QuickFilterInputPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "search",
    value: options.value,
    placeholder: localization.searchRowsPlaceholder,
    "aria-label": localization.searchAllRowsLabel,
    autoComplete: "off",
  };
}

export function getQuickFilterClearButtonProps(
  value: string,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.clearRowSearchLabel,
    disabled: value.length === 0 || undefined,
  };
}

export function getQuickFilterClearButtonText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.clear;
}

export function getRowSelectionControlsProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "group",
    "aria-label": localization.rowSelectionLabel,
  };
}

export function getRowSelectionCheckboxProps(
  options: RowSelectionCheckboxPrimitiveOptions = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "checkbox",
    checked: options.allSelected || false,
    disabled: options.disabled || undefined,
    "aria-checked": options.someSelected ? "mixed" : options.allSelected || false,
    "aria-label": localization.selectAllRowsOnCurrentPageLabel,
  };
}

export function getRowSelectionCheckboxText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.selectPage;
}

export function getRowSelectionStatusProps(): PrimitiveProps {
  return {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
  };
}

export function getRowSelectionStatusText(
  selectedCount: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  const count = Number.isFinite(selectedCount) ? Math.max(0, Math.floor(selectedCount)) : 0;
  return localization.selectedRows(count);
}

export function getRowSelectionClearButtonProps(
  disabled = false,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    disabled: disabled || undefined,
    "aria-label": localization.clearRowSelectionLabel,
  };
}

export function getRowSelectionClearButtonText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.clearSelection;
}

export function setCheckboxIndeterminate(target: unknown, indeterminate: boolean): boolean {
  if (!target || typeof target !== "object" || !("indeterminate" in target)) {
    return false;
  }

  (target as CheckboxIndeterminateTargetLike).indeterminate = indeterminate;
  return true;
}

export function getColumnVisibilityControlsProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    "aria-label": localization.gridColumnsLabel,
  };
}

export function getColumnVisibilitySummaryProps(
  visibleCount: number,
  totalCount: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  const { visible, total } = normalizeColumnVisibilityCounts(visibleCount, totalCount);
  return {
    "aria-label": localization.manageColumnsLabel(visible, total),
  };
}

export function getColumnVisibilitySummaryText(
  visibleCount: number,
  totalCount: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  const { visible, total } = normalizeColumnVisibilityCounts(visibleCount, totalCount);
  return localization.columnsSummary(visible, total);
}

export function getColumnVisibilitySearchInputProps(
  value: string,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "search",
    value,
    placeholder: localization.findColumns,
    "aria-label": localization.findColumns,
    autoComplete: "off",
  };
}

export function getColumnVisibilityListProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "group",
    "aria-label": localization.columnVisibilityLabel,
  };
}

export function getColumnVisibilityCheckboxProps(options: ColumnVisibilityCheckboxPrimitiveOptions): PrimitiveProps {
  const isFinalVisibleColumn = options.visible
    && Number.isFinite(options.visibleCount)
    && Math.max(0, Math.floor(options.visibleCount ?? 0)) <= 1;
  return {
    type: "checkbox",
    checked: options.visible,
    disabled: options.disabled || isFinalVisibleColumn || undefined,
    "aria-label": options.label,
    "data-column-id": options.columnId,
  };
}

export function getColumnVisibilityStatusProps(): PrimitiveProps {
  return {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
  };
}

export function getColumnVisibilityStatusText(
  visibleCount: number,
  totalCount: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  const { visible, total } = normalizeColumnVisibilityCounts(visibleCount, totalCount);
  return localization.columnsVisible(visible, total);
}

export function getColumnVisibilityEmptyText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.noColumnsFound;
}

export function getColumnVisibilityResetButtonProps(
  hiddenCount: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    disabled: !Number.isFinite(hiddenCount) || hiddenCount <= 0 || undefined,
    "aria-label": localization.showAllColumnsLabel,
  };
}

export function getColumnVisibilityResetButtonText(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): string {
  return localization.showAll;
}

export function normalizeGridDensity(value: unknown, fallback: GridDensity = "standard"): GridDensity {
  return GRID_DENSITIES.includes(value as GridDensity) ? (value as GridDensity) : fallback;
}

function getGridPreferenceRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getGridPreferenceVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function migrateGridPreferences(
  value: unknown,
  migrations: readonly GridPreferencesMigration[] = [],
): Record<string, unknown> | null {
  let preferences = getGridPreferenceRecord(value);
  const initialVersion = getGridPreferenceVersion(preferences?.version);

  if (!preferences || initialVersion === null || initialVersion > GRID_PREFERENCES_VERSION) {
    return null;
  }

  const migrationsByVersion = new Map<number, GridPreferencesMigration>();

  for (const migration of migrations) {
    if (
      getGridPreferenceVersion(migration.fromVersion) === null
      || getGridPreferenceVersion(migration.toVersion) === null
      || migration.toVersion <= migration.fromVersion
      || migration.toVersion > GRID_PREFERENCES_VERSION
      || migrationsByVersion.has(migration.fromVersion)
    ) {
      return null;
    }

    migrationsByVersion.set(migration.fromVersion, migration);
  }

  let version = initialVersion;

  while (version < GRID_PREFERENCES_VERSION) {
    const migration = migrationsByVersion.get(version);

    if (!migration) {
      return null;
    }

    try {
      preferences = getGridPreferenceRecord(migration.migrate(preferences));
    } catch {
      return null;
    }

    if (!preferences || preferences.version !== migration.toVersion) {
      return null;
    }

    version = migration.toVersion;
  }

  return preferences;
}

function getGridPreferenceColumnIds(value: unknown, validColumnIds?: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validIds = validColumnIds ? new Set(validColumnIds) : null;
  const seen = new Set<string>();

  return value.filter((columnId): columnId is string => {
    if (typeof columnId !== "string" || seen.has(columnId) || (validIds && !validIds.has(columnId))) {
      return false;
    }

    seen.add(columnId);
    return true;
  });
}

export function createGridPreferences(
  state: Partial<GridState> = {},
  density: GridDensity = "standard",
  options: GridPreferencesOptions = {},
): GridPreferences {
  const validIds = options.validColumnIds ? new Set(options.validColumnIds) : null;
  const columnVisibility = Object.fromEntries(
    Object.entries(state.columnVisibility ?? {}).filter(([columnId, visible]) =>
      typeof visible === "boolean" && (!validIds || validIds.has(columnId))),
  );
  const columnSizing = Object.fromEntries(
    Object.entries(state.columnSizing ?? {}).filter(([columnId, size]) =>
      typeof size === "number" && Number.isFinite(size) && size > 0 && (!validIds || validIds.has(columnId))),
  );
  const columnOrder = getGridPreferenceColumnIds(state.columnOrder, options.validColumnIds);
  const left = getGridPreferenceColumnIds(state.columnPinning?.left, options.validColumnIds);
  const leftIds = new Set(left);
  const right = getGridPreferenceColumnIds(state.columnPinning?.right, options.validColumnIds)
    .filter((columnId) => !leftIds.has(columnId));

  if (options.validColumnIds?.length && options.validColumnIds.every((columnId) => columnVisibility[columnId] === false)) {
    delete columnVisibility[options.validColumnIds[0] as string];
  }

  return {
    version: GRID_PREFERENCES_VERSION,
    density: normalizeGridDensity(density),
    state: {
      columnVisibility,
      columnSizing,
      columnOrder,
      columnPinning: { left, right },
    },
  };
}

export function serializeGridPreferences(preferences: GridPreferences, options: GridPreferencesOptions = {}): string {
  return JSON.stringify(createGridPreferences(preferences.state, preferences.density, options));
}

export function parseGridPreferences(value: string, options: GridPreferencesParseOptions = {}): GridPreferences | null {
  try {
    const parsed = migrateGridPreferences(JSON.parse(value), options.migrations);

    if (!parsed || parsed.version !== GRID_PREFERENCES_VERSION) {
      return null;
    }

    const state = getGridPreferenceRecord(parsed.state);

    if (!state) {
      return null;
    }

    const columnPinning = getGridPreferenceRecord(state.columnPinning);

    return createGridPreferences({
      columnVisibility: getGridPreferenceRecord(state.columnVisibility) as GridState["columnVisibility"] | null ?? {},
      columnSizing: getGridPreferenceRecord(state.columnSizing) as GridState["columnSizing"] | null ?? {},
      columnOrder: Array.isArray(state.columnOrder) ? state.columnOrder as string[] : [],
      columnPinning: {
        left: Array.isArray(columnPinning?.left) ? columnPinning.left as string[] : [],
        right: Array.isArray(columnPinning?.right) ? columnPinning.right as string[] : [],
      },
    }, normalizeGridDensity(parsed.density), options);
  } catch {
    return null;
  }
}

export function getBrowserGridPreferencesStorage(
  environment: GridPreferencesStorageEnvironmentLike | null | undefined = globalThis,
): GridPreferencesStorageLike | null {
  try {
    return environment?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readGridPreferences(
  storage: GridPreferencesStorageLike | null | undefined,
  key: string,
  options: GridPreferencesParseOptions = {},
): GridPreferences | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(key);
    return value === null ? null : parseGridPreferences(value, options);
  } catch {
    return null;
  }
}

export function writeGridPreferences(
  storage: GridPreferencesStorageLike | null | undefined,
  key: string,
  state: Partial<GridState>,
  density: GridDensity,
  options: GridPreferencesOptions = {},
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, serializeGridPreferences(createGridPreferences(state, density, options), options));
    return true;
  } catch {
    return false;
  }
}

export function removeGridPreferences(storage: GridPreferencesStorageLike | null | undefined, key: string): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getGridDensityProps(density: GridDensity): PrimitiveProps {
  return {
    "data-density": normalizeGridDensity(density),
  };
}

export function getGridDensityRowHeight(density: GridDensity): number {
  const heights: Record<GridDensity, number> = {
    compact: 32,
    standard: 40,
    comfortable: 48,
  };
  return heights[normalizeGridDensity(density)];
}

export function getDensityControlsProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "group",
    "aria-label": localization.rowDensityLabel,
  };
}

export function getDensityButtonProps(
  density: GridDensity,
  currentDensity: GridDensity,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  const normalizedDensity = normalizeGridDensity(density);
  return {
    type: "button",
    "aria-label": localization.useDensityLabel(normalizedDensity),
    "aria-pressed": normalizedDensity === normalizeGridDensity(currentDensity),
    "data-density": normalizedDensity,
  };
}

export function getDensityButtonText(
  density: GridDensity,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  return localization.densityLabel(normalizeGridDensity(density));
}

export function getFilteredColumnVisibilityColumns<TData>(
  columns: readonly Column<TData, unknown>[],
  query: string,
): Column<TData, unknown>[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [...columns];
  }

  return columns.filter((column) =>
    `${getColumnHeaderText(column)} ${column.id}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}

function normalizeColumnVisibilityCounts(visibleCount: number, totalCount: number): { visible: number; total: number } {
  const normalizedTotal = Number.isFinite(totalCount) ? Math.max(0, Math.floor(totalCount)) : 0;
  const normalizedVisible = Number.isFinite(visibleCount) ? Math.max(0, Math.floor(visibleCount)) : 0;
  return {
    visible: Math.min(normalizedVisible, normalizedTotal),
    total: normalizedTotal,
  };
}

export function getNextColumnFilters(
  filters: ColumnFiltersState,
  columnId: ColumnId,
  value: string,
): ColumnFiltersState {
  const existingIndex = filters.findIndex((filter) => filter.id === columnId);

  if (value === "") {
    return existingIndex < 0 ? filters : filters.filter((filter) => filter.id !== columnId);
  }

  if (existingIndex < 0) {
    return [...filters, { id: columnId, value }];
  }

  return filters.map((filter, index) => (index === existingIndex ? { id: columnId, value } : filter));
}

export function getPaginationProps(localization: GridLocalization = DEFAULT_GRID_LOCALIZATION): PrimitiveProps {
  return {
    role: "navigation",
    "aria-label": localization.paginationLabel,
  };
}

export function getPaginationButtonProps(
  options: PaginationButtonPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.paginationActionLabel(options.action),
    disabled: options.disabled || undefined,
  };
}

export function getPaginationButtonText(action: PaginationAction): string {
  const text: Record<PaginationAction, string> = {
    first: "|<",
    previous: "<",
    next: ">",
    last: ">|",
  };
  return text[action];
}

export function getPaginationStatusProps(): PrimitiveProps {
  return {
    role: "status",
    "aria-live": "polite",
  };
}

export function getPaginationPageText<TData>(
  grid: Grid<TData>,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  const pageCount = grid.getPageCount();
  const rawPageIndex = grid.getState().pagination.pageIndex;
  const pageIndex = Math.min(
    Number.isFinite(rawPageIndex) ? Math.max(0, Math.floor(rawPageIndex)) : 0,
    pageCount - 1,
  );
  return localization.pageStatus(pageIndex + 1, pageCount);
}

export function getPaginationPageSizeSelectProps(
  pageSize: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    "aria-label": localization.rowsPerPageLabel,
    value: Number.isFinite(pageSize) && pageSize > 0 ? Math.max(1, Math.floor(pageSize)) : 1,
  };
}

export function getPaginationPageSizeOptions(
  options: readonly number[] = DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS,
  currentPageSize?: number,
): number[] {
  const normalized = options.flatMap((value) =>
    Number.isFinite(value) && value > 0 ? [Math.max(1, Math.floor(value))] : [],
  );
  const current = Number.isFinite(currentPageSize) && (currentPageSize ?? 0) > 0
    ? Math.max(1, Math.floor(currentPageSize ?? 1))
    : null;
  return Array.from(new Set(current === null ? normalized : [...normalized, current])).sort((left, right) => left - right);
}

export function getPaginationPageSizeOptionText(
  pageSize: number,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  return localization.pageSizeOption(pageSize);
}

export function getGridBodyProps(options: GridBodyPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "rowgroup",
    "data-virtualized": options.virtualized || undefined,
    "data-column-order": options.columnOrder?.join(","),
  };
}

export function getGridEmptyRowProps(options: GridEmptyRowPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "row",
    "aria-rowindex": (options.rowIndexOffset ?? 0) + 1,
  };
}

export function getGridEmptyCellProps(options: GridEmptyCellPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "gridcell",
    "aria-colindex": 1,
    "aria-colspan": Math.max(1, options.columnCount ?? 1),
  };
}

export function getColumnSpacerProps(): PrimitiveProps {
  return {
    "aria-hidden": true,
  };
}

export function getHeaderCellProps<TData>(
  grid: Grid<TData>,
  column: Column<TData, unknown>,
  columnIndex: number,
  options: HeaderCellPrimitiveOptions = {},
): PrimitiveProps {
  const sortDirection = grid.getColumnSortDirection(column.id);
  const pinned = options.pinned ?? column.getIsPinned();

  return {
    role: "columnheader",
    "aria-colindex": columnIndex + 1,
    "aria-sort": sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none",
    "data-column-id": column.id,
    "data-pinned": pinned || undefined,
    "data-sort": sortDirection || undefined,
  };
}

export function getHeaderPlaceholderCellProps<TData>(column: Column<TData, unknown>): PrimitiveProps {
  return {
    role: "presentation",
    "aria-hidden": true,
    "data-column-id": column.id,
  };
}

export function getHeaderCellLayoutProps(options: HeaderCellLayoutPrimitiveOptions = {}): PrimitiveProps {
  return {
    "aria-colspan": options.placeholder ? undefined : options.colSpan,
    "aria-rowspan": options.placeholder ? undefined : options.rowSpan,
    "data-grouped": options.grouped || undefined,
    "data-placeholder": options.placeholder || undefined,
    "data-pinned-edge": options.pinnedEdge,
    "data-column-draggable": options.draggable || undefined,
  };
}

export function getHeaderButtonProps(options: HeaderButtonPrimitiveOptions = {}): PrimitiveProps {
  return {
    type: "button",
    disabled: options.disabled || undefined,
    tabIndex: options.placeholder ? -1 : undefined,
  };
}

export function getHeaderSortIndicatorProps(): PrimitiveProps {
  return {
    "aria-hidden": true,
  };
}

export function getHeaderSortIndicatorText(
  sortDirection: "asc" | "desc" | false | null | undefined,
  options: HeaderSortIndicatorTextOptions = {},
): string {
  if (!options.visible) {
    return "";
  }
  if (sortDirection === "asc") {
    return "\u25B2";
  }
  if (sortDirection === "desc") {
    return "\u25BC";
  }

  return "";
}

export function getHeaderKeyboardMoveDirection(event: HeaderKeyboardMoveEventLike): "left" | "right" | null {
  if (!event.altKey || !event.shiftKey) {
    return null;
  }
  if (event.key === "ArrowLeft") {
    return "left";
  }
  if (event.key === "ArrowRight") {
    return "right";
  }

  return null;
}

export function getHeaderActionMenuTriggerFocusPosition(event: { key: string }): "first" | "last" | null {
  if (event.key === "ArrowDown") {
    return "first";
  }
  if (event.key === "ArrowUp") {
    return "last";
  }

  return null;
}

export function getHeaderActionMenuKeyboardAction(event: { key: string }): HeaderActionMenuKeyboardAction | null {
  if (event.key === "Escape") {
    return { type: "close" };
  }
  if (event.key === "ArrowDown") {
    return { type: "focus", position: "next" };
  }
  if (event.key === "ArrowUp") {
    return { type: "focus", position: "previous" };
  }
  if (event.key === "Home") {
    return { type: "focus", position: "first" };
  }
  if (event.key === "End") {
    return { type: "focus", position: "last" };
  }
  if (event.key === "Tab") {
    return { type: "tab-close" };
  }

  return null;
}

export function isHeaderActionMenuCloseAction(
  action: HeaderActionMenuKeyboardAction | null | undefined,
): action is Extract<HeaderActionMenuKeyboardAction, { type: "close" }> {
  return action?.type === "close";
}

export function isHeaderActionMenuFocusAction(
  action: HeaderActionMenuKeyboardAction | null | undefined,
): action is Extract<HeaderActionMenuKeyboardAction, { type: "focus" }> {
  return action?.type === "focus";
}

export function isHeaderActionMenuTabCloseAction(
  action: HeaderActionMenuKeyboardAction | null | undefined,
): action is Extract<HeaderActionMenuKeyboardAction, { type: "tab-close" }> {
  return action?.type === "tab-close";
}

export function getGridKeyboardShortcutAction(event: GridKeyboardShortcutEventLike): GridKeyboardShortcutAction | null {
  const key = event.key.toLowerCase();

  if ((event.ctrlKey || event.metaKey) && !event.altKey) {
    if (!event.shiftKey && key === "c") {
      return "copy";
    }
    if (!event.shiftKey && key === "v") {
      return "paste";
    }
    if (key === "z") {
      return event.shiftKey ? "redo-edit" : "undo-edit";
    }
    if (!event.shiftKey && key === "y") {
      return "redo-edit";
    }
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && (event.key === " " || event.key === "Spacebar")) {
    return "row-selection";
  }

  return null;
}

export function getGridKeyboardEditAction(event: GridKeyboardShortcutEventLike): GridKeyboardEditAction | null {
  if (event.key === "Enter") {
    return "start-edit";
  }
  if (event.key === "Escape") {
    return "cancel-edit";
  }

  return null;
}

export function getCellEditorKeyboardAction(event: { key: string }): CellEditorKeyboardAction | null {
  if (event.key === "Enter") {
    return "commit-edit";
  }
  if (event.key === "Escape") {
    return "cancel-edit";
  }

  return null;
}

export function getGridKeyboardFocusMove(event: GridKeyboardShortcutEventLike): GridKeyboardFocusMove | null {
  const options: MoveFocusOptions = event.shiftKey ? { extendSelection: true } : {};

  if (event.key === "ArrowUp") {
    return { direction: "up", options };
  }
  if (event.key === "ArrowDown") {
    return { direction: "down", options };
  }
  if (event.key === "ArrowLeft") {
    return { direction: "left", options };
  }
  if (event.key === "ArrowRight") {
    return { direction: "right", options };
  }
  if (event.key === "Home") {
    return { direction: event.ctrlKey || event.metaKey ? "grid-start" : "home", options };
  }
  if (event.key === "End") {
    return { direction: event.ctrlKey || event.metaKey ? "grid-end" : "end", options };
  }
  if (event.key === "PageUp") {
    return { direction: "page-up", options };
  }
  if (event.key === "PageDown") {
    return { direction: "page-down", options };
  }

  return null;
}

export function getColumnResizeHandleProps<TData>(
  column: Column<TData, unknown>,
  options: ColumnResizeHandlePrimitiveOptions = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    role: "separator",
    "aria-orientation": "vertical",
    "aria-label": localization.resizeColumnLabel(column.id),
    "aria-valuenow": options.valueNow ?? column.getSize(),
    "aria-valuemin": column.columnDef.minSize,
    "aria-valuemax": column.columnDef.maxSize,
    "data-column-id": column.id,
    "data-resize-handle": true,
    tabIndex: 0,
  };
}

export function getColumnResizeStartSize<TData>(grid: Grid<TData>, column: Column<TData, unknown>): number {
  return grid.getColumnSize(column.id) ?? column.getSize();
}

export function getColumnResizeKeyboardSize<TData>(
  column: Column<TData, unknown>,
  startSize: number,
  event: ColumnResizeKeyboardEventLike,
  options: ColumnResizeKeyboardSizeOptions = {},
): number | null {
  const defaultStep = options.defaultStep ?? 10;
  const largeStep = options.largeStep ?? 50;
  const step = event.shiftKey ? largeStep : defaultStep;

  if (event.key === "ArrowLeft") {
    return startSize - step;
  }
  if (event.key === "ArrowRight") {
    return startSize + step;
  }
  if (event.key === "Home" && typeof column.columnDef.minSize === "number") {
    return column.columnDef.minSize;
  }
  if (event.key === "End" && typeof column.columnDef.maxSize === "number") {
    return column.columnDef.maxSize;
  }

  return null;
}

export function getColumnResizePointerSize(startSize: number, startX: number, event: ColumnResizePointerEventLike): number {
  return startSize + event.clientX - startX;
}

export function getCanStartColumnResize(event: ColumnResizeDefaultPreventableEventLike): boolean {
  return !event.defaultPrevented;
}

export function getCanApplyColumnResize(event: ColumnResizeDefaultPreventableEventLike): boolean {
  return !event.defaultPrevented;
}

export function getColumnResizeFinalSize(startSize: number, event: ColumnResizeFinalSizeEventLike): number {
  return event.defaultPrevented ? startSize : event.size;
}

export function isPointerCaptureTarget(target: unknown): target is PointerCaptureTargetLike {
  return (
    typeof target === "object" &&
    target !== null &&
    "setPointerCapture" in target &&
    "releasePointerCapture" in target &&
    typeof target.setPointerCapture === "function" &&
    typeof target.releasePointerCapture === "function"
  );
}

export function getPointerCaptureTarget(event: PointerCaptureEventLike): unknown {
  return event.currentTarget;
}

function getCanUseDefaultPointerGlobalListenerTarget(): boolean {
  if (typeof globalThis.addEventListener !== "function" || typeof globalThis.removeEventListener !== "function") {
    return false;
  }

  return true;
}

function addDefaultPointerGlobalListener(type: PointerGlobalListenerType, listener: PointerListener): void {
  globalThis.addEventListener(type, listener as EventListener);
}

function removeDefaultPointerGlobalListener(type: PointerGlobalListenerType, listener: PointerListener): void {
  globalThis.removeEventListener(type, listener as EventListener);
}

export function getDefaultPointerMoveUpListenerTarget(): PointerMoveUpListenerTargetLike | null {
  return getCanUseDefaultPointerGlobalListenerTarget()
    ? {
        addEventListener: addDefaultPointerGlobalListener,
        removeEventListener: removeDefaultPointerGlobalListener,
      }
    : null;
}

export function getDefaultPointerUpCancelListenerTarget(): PointerUpCancelListenerTargetLike | null {
  return getCanUseDefaultPointerGlobalListenerTarget()
    ? {
        addEventListener: addDefaultPointerGlobalListener,
        removeEventListener: removeDefaultPointerGlobalListener,
      }
    : null;
}

export function getDefaultPointerMoveUpCancelListenerTarget(): PointerMoveUpCancelListenerTargetLike | null {
  return getCanUseDefaultPointerGlobalListenerTarget()
    ? {
        addEventListener: addDefaultPointerGlobalListener,
        removeEventListener: removeDefaultPointerGlobalListener,
      }
    : null;
}

export function trySetPointerCapture(target: unknown, pointerId: number): boolean {
  if (!isPointerCaptureTarget(target)) {
    return false;
  }

  try {
    target.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}

export function tryReleasePointerCapture(target: unknown, pointerId: number): boolean {
  if (!isPointerCaptureTarget(target)) {
    return false;
  }

  try {
    target.releasePointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}

export function addPointerMoveUpListeners(
  listeners: PointerMoveUpListeners,
  target: PointerMoveUpListenerTargetLike | null | undefined = getDefaultPointerMoveUpListenerTarget(),
): () => void {
  if (!target) {
    return () => undefined;
  }

  target.addEventListener("pointermove", listeners.move);
  target.addEventListener("pointerup", listeners.up);

  return () => {
    target.removeEventListener("pointermove", listeners.move);
    target.removeEventListener("pointerup", listeners.up);
  };
}

export function addPointerUpCancelListeners(
  listeners: PointerUpCancelListeners,
  target: PointerUpCancelListenerTargetLike | null | undefined = getDefaultPointerUpCancelListenerTarget(),
): () => void {
  if (!target) {
    return () => undefined;
  }

  target.addEventListener("pointerup", listeners.up);
  target.addEventListener("pointercancel", listeners.cancel);

  return () => {
    target.removeEventListener("pointerup", listeners.up);
    target.removeEventListener("pointercancel", listeners.cancel);
  };
}

export function addPointerMoveUpCancelListeners(
  listeners: PointerMoveUpCancelListeners,
  target: PointerMoveUpCancelListenerTargetLike | null | undefined = getDefaultPointerMoveUpCancelListenerTarget(),
): () => void {
  if (!target) {
    return () => undefined;
  }

  target.addEventListener("pointermove", listeners.move);
  target.addEventListener("pointerup", listeners.up);
  target.addEventListener("pointercancel", listeners.cancel);

  return () => {
    target.removeEventListener("pointermove", listeners.move);
    target.removeEventListener("pointerup", listeners.up);
    target.removeEventListener("pointercancel", listeners.cancel);
  };
}

export function addPassiveScrollListener(listener: ScrollListener, target: ScrollListenerTargetLike): () => void {
  target.addEventListener("scroll", listener, { passive: true });

  return () => {
    target.removeEventListener("scroll", listener);
  };
}

export function getColumnPinningControlsProps<TData>(
  column: Column<TData, unknown>,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    "aria-label": localization.columnPinningLabel(column.id),
  };
}

export function getColumnPinningButtonText(position: ColumnPinningPosition): string {
  if (position === "left") {
    return "L";
  }
  if (position === "right") {
    return "R";
  }

  return "-";
}

export function getColumnPinningButtonProps<TData>(
  column: Column<TData, unknown>,
  options: ColumnPinningButtonPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.pinColumnLabel(column.id, options.position),
    "aria-pressed": options.active,
    disabled: options.active,
  };
}

export function getHeaderActionMenuTriggerProps<TData>(
  column: Column<TData, unknown>,
  options: HeaderActionMenuTriggerPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.openColumnMenuLabel(column.id),
    "aria-expanded": options.expanded,
    "aria-haspopup": "menu",
    "aria-controls": options.expanded ? options.controls : undefined,
  };
}

export function getHeaderActionMenuId(columnId: string): string {
  return `og-grid-header-menu-${columnId.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export function getHeaderActionMenuTriggerId(columnId: string): string {
  return `${getHeaderActionMenuId(columnId)}-trigger`;
}

export function getHeaderActionMenuProps<TData>(
  column: Column<TData, unknown>,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    role: "menu",
    "aria-label": localization.columnMenuLabel(column.id),
    tabIndex: -1,
  };
}

export function getHeaderActionMenuDefaultItemLabel(
  itemId: HeaderActionMenuDefaultItemId,
  options: HeaderActionMenuDefaultItemLabelOptions = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  return localization.headerActionMenuItemLabel(itemId, options.grouped ?? false);
}

export function getHeaderActionMenuDefaultItemDescriptors(
  options: HeaderActionMenuDefaultItemDescriptorOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): HeaderActionMenuDefaultItemDescriptor[] {
  const descriptors: HeaderActionMenuDefaultItemDescriptor[] = [
    {
      id: "sort-asc",
      label: getHeaderActionMenuDefaultItemLabel("sort-asc", {}, localization),
    },
    {
      id: "sort-desc",
      label: getHeaderActionMenuDefaultItemLabel("sort-desc", {}, localization),
    },
    {
      id: "clear-sort",
      label: getHeaderActionMenuDefaultItemLabel("clear-sort", {}, localization),
      disabled: !options.sortDirection,
    },
    {
      id: "move-left",
      label: getHeaderActionMenuDefaultItemLabel("move-left", {}, localization),
      disabled: !options.canMoveLeft,
    },
    {
      id: "move-right",
      label: getHeaderActionMenuDefaultItemLabel("move-right", {}, localization),
      disabled: !options.canMoveRight,
    },
    {
      id: "pin-left",
      label: getHeaderActionMenuDefaultItemLabel("pin-left", {}, localization),
      disabled: options.pinningPosition === "left",
    },
    {
      id: "unpin",
      label: getHeaderActionMenuDefaultItemLabel("unpin", {}, localization),
      disabled: options.pinningPosition === false,
    },
    {
      id: "pin-right",
      label: getHeaderActionMenuDefaultItemLabel("pin-right", {}, localization),
      disabled: options.pinningPosition === "right",
    },
  ];

  if (options.canGroup) {
    descriptors.push({
      id: "toggle-group",
      label: getHeaderActionMenuDefaultItemLabel("toggle-group", { grouped: options.isGrouped }, localization),
    });
  }

  return descriptors;
}

export function getHeaderActionMenuItemProps(options: HeaderActionMenuItemPrimitiveOptions = {}): PrimitiveProps {
  return {
    type: "button",
    role: "menuitem",
    disabled: options.disabled || undefined,
  };
}

export function getHeaderActionMenuCustomItemProps(options: HeaderActionMenuLabelPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "presentation",
    "aria-label": options.label,
  };
}

export function getHeaderActionMenuLabelProps(): PrimitiveProps {
  return {
    role: "presentation",
  };
}

export function getHeaderActionMenuSeparatorProps(options: HeaderActionMenuLabelPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "separator",
    "aria-label": options.label,
  };
}

export function isHeaderActionMenuItem<TItem>(item: TItem | null | false | undefined): item is TItem {
  return Boolean(item);
}

export function isHeaderActionMenuActionItem<TItem extends HeaderActionMenuPrimitiveItem>(
  item: TItem | null | false | undefined,
): item is Extract<TItem, { type?: "action" }> {
  return item !== null && item !== false && item !== undefined && (item.type === undefined || item.type === "action");
}

export function isHeaderActionMenuCustomItem<TItem extends HeaderActionMenuPrimitiveItem>(
  item: TItem | null | false | undefined,
): item is Extract<TItem, { type: "custom" }> {
  return item !== null && item !== false && item !== undefined && item.type === "custom";
}

export function isHeaderActionMenuLabelItem<TItem extends HeaderActionMenuPrimitiveItem>(
  item: TItem | null | false | undefined,
): item is Extract<TItem, { type: "label" }> {
  return item !== null && item !== false && item !== undefined && item.type === "label";
}

export function isHeaderActionMenuSeparatorItem<TItem extends HeaderActionMenuPrimitiveItem>(
  item: TItem | null | false | undefined,
): item is Extract<TItem, { type: "separator" }> {
  return item !== null && item !== false && item !== undefined && item.type === "separator";
}

export function getHeaderActionMenuCustomItemUserProps(
  item: HeaderActionMenuPrimitiveCustomItem | null | false | undefined,
): Record<string, unknown> {
  return item ? (item.props ?? {}) : {};
}

export function getGroupingPanelProps(
  options: GroupingPanelPrimitiveOptions = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    "aria-label": localization.columnGroupingLabel,
    "data-empty": options.empty || undefined,
  };
}

export function getGroupingPanelPlaceholderProps(): PrimitiveProps {
  return {
    "data-empty-placeholder": true,
  };
}

export function getGroupingPanelChipProps<TData>(column: Column<TData, unknown>): PrimitiveProps {
  return {
    "data-column-id": column.id,
  };
}

export function getGroupingPanelMoveButtonProps<TData>(
  column: Column<TData, unknown>,
  options: GroupingPanelMoveButtonPrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.moveColumnGroupingLabel(column.id, options.direction),
    disabled: options.disabled || false,
  };
}

export function getGroupingPanelRemoveButtonProps<TData>(
  column: Column<TData, unknown>,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.removeColumnGroupingLabel(column.id),
  };
}

export function getIsGroupLabelCell<TData>(
  row: Row<TData>,
  column: Column<TData, unknown>,
  visibleColumns: readonly Column<TData, unknown>[],
): boolean {
  const firstVisibleColumnId = visibleColumns[0]?.id;

  if (!row.getIsGrouped()) {
    if (row.getIsGroupFooter()) {
      return column.id === firstVisibleColumnId;
    }

    return (row.depth > 0 || row.getCanExpand()) && column.id === firstVisibleColumnId;
  }

  return column.id === row.groupingColumnId || (!visibleColumns.some((candidate) => candidate.id === row.groupingColumnId) && column.id === firstVisibleColumnId);
}

export function getGroupValueText(
  value: unknown,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value == null ? localization.blankGroupValue : String(value);
}

export function getGroupRowLabel<TData, TFallback = string>(
  row: Row<TData>,
  column: Column<TData, unknown>,
  options: GroupRowLabelOptions<TFallback> = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): string | TFallback {
  if (row.getIsGroupFooter()) {
    return row.groupFooterLabel ?? localization.groupFooterTotal;
  }

  if (row.groupingColumnId) {
    return `${row.groupingColumnId}: ${getGroupValueText(row.groupingValue, localization)}`;
  }

  return options.fallback ?? getGroupValueText(row.getValue(column.id), localization);
}

export function getGroupCellIndent<TData>(row: Row<TData>, options: GroupCellIndentOptions = {}): number {
  const depthSize = options.depthSize ?? 16;
  const footerOffset = options.footerOffset ?? 8;
  const offset = row.getIsGroupFooter() ? footerOffset : 0;

  return row.depth * depthSize - offset;
}

export function getGroupCellIndentStyle<TData>(row: Row<TData>, options: GroupCellIndentOptions = {}): GroupCellIndentStyleProps {
  return {
    paddingLeft: getGroupCellIndent(row, options),
  };
}

export function getGroupCellIndentStyleText<TData>(row: Row<TData>, options: GroupCellIndentOptions = {}): string {
  return `padding-left: ${getGroupCellIndent(row, options)}px`;
}

export function getGroupRowCountText<TData>(row: Row<TData>): string | undefined {
  return row.getIsGrouped() ? String(row.leafRows.length) : undefined;
}

export function getRowProps<TData>(row: Row<TData>, rowIndex: number, options: RowPrimitiveOptions = {}): PrimitiveProps {
  return {
    role: "row",
    "aria-rowindex": (options.rowIndexOffset ?? 0) + rowIndex + 1,
    "aria-selected": options.selected || undefined,
    "data-row-id": row.id,
    "data-selected": options.selected || undefined,
  };
}

export function getRowLayoutProps<TData>(row: Row<TData>, options: RowLayoutPrimitiveOptions = {}): PrimitiveProps {
  return {
    "data-grouped-row": row.getIsGrouped() || undefined,
    "data-group-footer-row": row.getIsGroupFooter() || undefined,
    "data-expanded": row.getCanExpand() ? options.expanded : undefined,
    "data-virtual-index": options.virtualIndex,
    "data-column-virtualized": options.columnVirtualized || undefined,
  };
}

export function getRowExpansionToggleProps<TData>(
  row: Row<TData>,
  options: RowExpansionTogglePrimitiveOptions,
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    type: "button",
    "aria-label": localization.toggleRowExpandedLabel(options.expanded, options.label),
    "aria-expanded": options.expanded,
    "data-row-id": row.id,
    "data-expanded": options.expanded,
  };
}

export function getRowExpansionToggleText(expanded: boolean): string {
  return expanded ? "\u2212" : "+";
}

export function getRowExpansionSpacerProps(): PrimitiveProps {
  return {
    "aria-hidden": true,
  };
}

export function getCellProps<TData>(
  row: Row<TData>,
  column: Column<TData, unknown>,
  _rowIndex: number,
  columnIndex: number,
  options: CellPrimitiveOptions = {},
): PrimitiveProps {
  const focused = isFocusedCell(options.focusedCell ?? null, row.id, column.id);

  return {
    role: "gridcell",
    "aria-colindex": columnIndex + 1,
    "data-row-id": row.id,
    "data-column-id": column.id,
    "data-pinned": column.getIsPinned() || undefined,
    tabIndex: focused ? 0 : -1,
    "data-focused": focused || undefined,
    "data-editing": options.editing || undefined,
    "aria-selected": options.rangeSelected || undefined,
    "data-range-selected": options.rangeSelected || undefined,
  };
}

export function getCellLayoutProps(options: CellLayoutPrimitiveOptions = {}): PrimitiveProps {
  return {
    "data-validation-invalid": options.invalid || undefined,
    "data-pinned-edge": options.pinnedEdge,
  };
}

export function getCellFillHandleProps(): PrimitiveProps {
  return {
    "aria-hidden": true,
    "data-fill-handle": true,
  };
}

export function getCanStartCellEdit<TData>(row: Row<TData>, column: Column<TData, unknown>): boolean {
  return !row.getIsGrouped() && !row.getIsGroupFooter() && column.getCanEdit();
}

export function getCanStartFocusedCellEdit(
  focusedCell: CellCoordinate | null | undefined,
  editingCell: CellCoordinate | null | undefined,
): focusedCell is CellCoordinate {
  return Boolean(focusedCell) && !editingCell;
}

export function getCanRestoreFocusedCell(options: FocusedCellRestoreOptions): boolean {
  return options.shouldRestore && options.focusedCell != null && options.scroller != null && options.inProgress !== true;
}

export function getShouldCancelFocusedCellRestoreOnFrameSync(
  options: FocusedCellRestoreFrameSyncOptions = {},
): boolean {
  return options.inProgress !== true;
}

export function getCanCancelCellEdit(editingCell: CellCoordinate | null | undefined): editingCell is CellCoordinate {
  return Boolean(editingCell);
}

export function getCanRunGridKeyboardShortcut(editingCell: CellCoordinate | null | undefined): boolean {
  return !editingCell;
}

export function getFocusedRowSelectionTarget<TData>(
  rows: Array<Row<TData>>,
  focusedCell: CellCoordinate | null | undefined,
): FocusedRowSelectionTarget<TData> | null {
  if (!focusedCell) {
    return null;
  }

  const rowIndex = rows.findIndex((row) => row.id === focusedCell.rowId);
  const row = rowIndex >= 0 ? rows[rowIndex] : undefined;

  return row ? { row, rowIndex } : null;
}

export function getCanToggleRowSelection(event: RowSelectionToggleEventLike): boolean {
  return !event.defaultPrevented;
}

export function getCellEditText(value: unknown): string {
  return value == null ? "" : String(value);
}

export function getCellEditorTargetValue(target: unknown): unknown {
  return target && typeof target === "object" && "value" in target ? target.value : undefined;
}

export function getCellEditorEventValue(event: CellEditorValueEventLike): string {
  const value = getCellEditorTargetValue(event.currentTarget) ?? getCellEditorTargetValue(event.target);
  return typeof value === "string" ? value : "";
}

export function parseCellEditValue<TData>(
  grid: Grid<TData>,
  row: Row<TData>,
  column: Column<TData, unknown>,
  value: string,
): unknown {
  return column.columnDef.editValueParser
    ? column.columnDef.editValueParser(value, {
        grid,
        row,
        column,
        previousValue: row.getValue(column.id),
      })
    : value;
}

export function getCellEditValidationMessage(event: CellEditValidationEventLike | null | undefined): string | null {
  return event?.validation?.valid === false ? (event.validation.message ?? "Invalid value") : null;
}

export function getDefaultClipboardTextEnvironment(): ClipboardTextEnvironment {
  const clipboardDocument =
    typeof document === "undefined"
      ? undefined
      : {
          body: document.body
            ? {
                appendChild: (element: ClipboardTextAreaLike) => document.body?.appendChild(element as HTMLTextAreaElement),
                removeChild: (element: ClipboardTextAreaLike) => document.body?.removeChild(element as HTMLTextAreaElement),
              }
            : undefined,
          documentElement: {
            appendChild: (element: ClipboardTextAreaLike) => document.documentElement.appendChild(element as HTMLTextAreaElement),
            removeChild: (element: ClipboardTextAreaLike) => document.documentElement.removeChild(element as HTMLTextAreaElement),
          },
          createElement: () => document.createElement("textarea"),
          execCommand: (command: "copy") => document.execCommand(command),
        };

  return {
    document: clipboardDocument,
    navigator: typeof navigator === "undefined" ? undefined : navigator,
  };
}

export function getDefaultBrowserDownloadEnvironment(): BrowserDownloadEnvironment {
  const downloadDocument =
    typeof document === "undefined"
      ? undefined
      : {
          body: document.body
            ? {
                appendChild: (element: BrowserDownloadAnchorLike) => document.body?.appendChild(element as HTMLAnchorElement),
                removeChild: (element: BrowserDownloadAnchorLike) => document.body?.removeChild(element as HTMLAnchorElement),
              }
            : undefined,
          documentElement: {
            appendChild: (element: BrowserDownloadAnchorLike) => document.documentElement.appendChild(element as HTMLAnchorElement),
            removeChild: (element: BrowserDownloadAnchorLike) => document.documentElement.removeChild(element as HTMLAnchorElement),
          },
          createElement: () => document.createElement("a"),
        };
  const BrowserBlob = typeof Blob === "undefined" ? undefined : Blob;

  return {
    blob: BrowserBlob
      ? (() => {
          const BlobConstructor = BrowserBlob;

          return class {
            constructor(blobParts: readonly string[], options: { type: string }) {
              return new BlobConstructor([...blobParts], options);
            }
          };
        })()
      : undefined,
    document: downloadDocument,
    url:
      typeof URL === "undefined"
        ? undefined
        : {
            createObjectURL: (blob: unknown) => URL.createObjectURL(blob as Blob),
            revokeObjectURL: (url: string) => URL.revokeObjectURL(url),
          },
  };
}

export async function writeClipboardText(
  text: string,
  environment: ClipboardTextEnvironment = getDefaultClipboardTextEnvironment(),
): Promise<boolean> {
  if (environment.navigator?.clipboard?.writeText) {
    try {
      await environment.navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback for browsers that deny async clipboard access.
    }
  }

  if (!environment.document) {
    return false;
  }

  const textarea = environment.document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";

  const parent = environment.document.body ?? environment.document.documentElement;
  parent.appendChild(textarea);
  textarea.select();

  try {
    return environment.document.execCommand("copy");
  } finally {
    parent.removeChild(textarea);
  }
}

export async function readClipboardText(
  environment: ClipboardTextEnvironment = getDefaultClipboardTextEnvironment(),
): Promise<string> {
  if (!environment.navigator?.clipboard?.readText) {
    return "";
  }

  try {
    return await environment.navigator.clipboard.readText();
  } catch {
    return "";
  }
}

export function downloadBrowserExportFile(
  file: BrowserExportFileLike,
  environment: BrowserDownloadEnvironment = getDefaultBrowserDownloadEnvironment(),
): boolean {
  if (!environment.document || !environment.blob || !environment.url) {
    return false;
  }

  const blob = new environment.blob([file.text], { type: file.mimeType });
  const url = environment.url.createObjectURL(blob);
  const anchor = environment.document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.style.display = "none";

  const parent = environment.document.body ?? environment.document.documentElement;
  let appended = false;

  try {
    parent.appendChild(anchor);
    appended = true;
    anchor.click();
    return true;
  } finally {
    if (appended) {
      parent.removeChild(anchor);
    }
    environment.url.revokeObjectURL(url);
  }
}

export function getCellDisplayText(value: unknown): string {
  return value == null ? "" : String(value);
}

export function escapeGridHtml(value: string): string {
  return value.replace(/[&<"]/g, (character) => `&#${character.charCodeAt(0)};`);
}

export function getColumnHeaderText<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  return typeof header === "string" ? header : column.id;
}

export function getCellFillHandleVisible<TData>(
  row: Row<TData>,
  column: Column<TData, unknown>,
  options: CellFillHandleVisibilityOptions,
): boolean {
  return (
    !row.getIsGrouped() &&
    !row.getIsGroupFooter() &&
    Boolean(options.rangeSelected) &&
    !options.editing &&
    !options.activeEditing &&
    isCellCoordinateEqual(options.fillHandleCoordinate, { rowId: row.id, columnId: column.id })
  );
}

export function getCanStartCellPointerDrag(
  event: PointerButtonEventLike,
  editingCell: CellCoordinate | null | undefined,
): boolean {
  return isPrimaryPointerButton(event) && !editingCell;
}

export function getCellEditorProps<TData>(
  column: Column<TData, unknown>,
  options: CellEditorPrimitiveOptions = {},
  localization: GridLocalization = DEFAULT_GRID_LOCALIZATION,
): PrimitiveProps {
  return {
    "aria-label": localization.editColumnLabel(column.id),
    "aria-invalid": options.invalid || undefined,
  };
}

export function getCellEditorOptionProps(option: CellEditorOptionPrimitiveOptions): PrimitiveProps {
  return {
    value: option.value,
    disabled: option.disabled || undefined,
  };
}

export function getCellEditorOptionText(option: CellEditorOptionPrimitiveOptions): string {
  return option.label ?? option.value;
}

export function getCellValidationMessageProps(): PrimitiveProps {
  return {
    role: "alert",
  };
}

export function isFocusableElement(target: unknown): target is FocusableElementLike {
  return !!target && typeof target === "object" && "focus" in target && typeof target.focus === "function";
}

export function getEnabledHeaderActionMenuItems(menu: ParentNode | null): HeaderActionMenuItemFocusTargetLike[] {
  if (!menu) {
    return [];
  }

  const items: HeaderActionMenuItemFocusTargetLike[] = [];
  for (const item of Array.from(menu.querySelectorAll(HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR))) {
    if (isFocusableElement(item)) {
      items.push(item);
    }
  }
  return items;
}

export function getHeaderActionMenuActiveElement(
  menu: HeaderActionMenuActiveElementTargetLike | null | undefined,
  fallbackDocument: HeaderActionMenuActiveElementDocumentLike | null | undefined = typeof document === "undefined"
    ? undefined
    : document,
): unknown | null {
  return menu?.ownerDocument?.activeElement ?? fallbackDocument?.activeElement ?? null;
}

export function focusHeaderActionMenuItem(menu: HeaderActionMenuFocusTargetLike | null, position: HeaderActionMenuItemFocusPosition): boolean {
  if (!menu) {
    return false;
  }

  const items = getEnabledHeaderActionMenuItems(menu);

  if (items.length === 0) {
    menu.focus();
    return true;
  }

  const activeElement = getHeaderActionMenuActiveElement(menu);
  const activeIndex = items.findIndex((item) => item === activeElement);

  if (position === "first") {
    items[0]?.focus();
  } else if (position === "last") {
    items[items.length - 1]?.focus();
  } else if (position === "next") {
    items[(activeIndex + 1 + items.length) % items.length]?.focus();
  } else {
    items[(activeIndex - 1 + items.length) % items.length]?.focus();
  }

  return true;
}

export function isHeaderActionMenuFocusTarget(target: unknown): target is HeaderActionMenuFocusTargetLike {
  return (
    !!target &&
    typeof target === "object" &&
    "focus" in target &&
    typeof target.focus === "function" &&
    "querySelectorAll" in target &&
    typeof target.querySelectorAll === "function"
  );
}

export function getHeaderActionMenuFocusTarget(event: HeaderActionMenuFocusTargetEventLike): HeaderActionMenuFocusTargetLike | null {
  return isHeaderActionMenuFocusTarget(event.currentTarget) ? event.currentTarget : null;
}

export function focusElement(element: FocusableElementLike | null | undefined): boolean {
  if (!isFocusableElement(element)) {
    return false;
  }

  element.focus();
  return true;
}

export function focusCellEditorElement(element: FocusableSelectableElementLike | null | undefined): boolean {
  if (!element) {
    return false;
  }

  element.focus();
  element.select?.();
  return true;
}

export function focusElementById(lookup: ElementIdLookupLike, id: string): boolean {
  return focusElement(lookup.getElementById(id));
}

export function focusHeaderActionMenuTrigger(element: FocusableElementLike | null | undefined): boolean {
  return focusElement(element);
}

export function focusHeaderActionMenuTriggerById(lookup: ElementIdLookupLike, id: string): boolean {
  return focusHeaderActionMenuTrigger(lookup.getElementById(id));
}

export function focusHeaderActionMenuItemById(
  lookup: ElementIdLookupLike<HeaderActionMenuFocusTargetLike>,
  id: string,
  position: HeaderActionMenuItemFocusPosition,
): boolean {
  return focusHeaderActionMenuItem(lookup.getElementById(id), position);
}

export function focusFocusedCellInGrid(container: FocusedCellContainerLike | null | undefined): boolean {
  return focusElement(container?.querySelector(GRID_FOCUSED_CELL_SELECTOR));
}

export function scrollElementToPosition(
  element: ScrollPositionElementLike | null | undefined,
  position: FocusedCellScrollPosition | null | undefined,
): boolean {
  if (!element || !position) {
    return false;
  }

  element.scrollLeft = position.scrollLeft;
  element.scrollTop = position.scrollTop;
  return true;
}

export function getScrollFrameOptionsFromElement(
  element: ScrollFrameElementLike,
  options: ScrollFrameElementOptions = {},
): ScrollFrameOptionsLike {
  return {
    scrollTop: options.scrollTop ?? element.scrollTop,
    scrollLeft: options.scrollLeft ?? element.scrollLeft,
    viewportHeight: element.clientHeight,
    viewportWidth: element.clientWidth,
    stickyTopOffset: options.stickyTopOffset ?? 0,
  };
}

export function getFocusedCellScrollOptionsFromElement<TData>(
  element: ScrollFrameElementLike,
  options: FocusedCellScrollElementOptions<TData>,
): FocusedCellScrollOptions<TData> {
  return {
    ...options,
    currentScrollLeft: element.scrollLeft,
    currentScrollTop: element.scrollTop,
    viewportWidth: element.clientWidth,
    viewportHeight: element.clientHeight,
  };
}

export function isGridInteractiveKeyboardTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  if (!target || target === currentTarget || !("closest" in target) || typeof target.closest !== "function") {
    return false;
  }

  return Boolean(target.closest(GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR));
}

export function isGridInteractiveKeyboardEventTarget(event: KeyboardTargetEventLike): boolean {
  return isGridInteractiveKeyboardTarget(event.target, event.currentTarget);
}

export function getShouldPreventEventDefault(event: DefaultPreventedEventLike): boolean {
  return event.defaultPrevented;
}

export function preventDefaultAndStopPropagation(event: DefaultPreventablePropagationEventLike): void {
  event.preventDefault();
  event.stopPropagation();
}

export function preventEventDefault(event: DefaultPreventableEventLike): void {
  event.preventDefault();
}

export function stopEventPropagation(event: PropagationEventLike): void {
  event.stopPropagation();
}

export interface ClickSuppressionController {
  suppress(): void;
  consume(event?: DefaultPreventablePropagationEventLike): boolean;
}

export function createClickSuppressionController(): ClickSuppressionController {
  let suppressed = false;

  return {
    suppress() {
      suppressed = true;
    },
    consume(event) {
      if (!suppressed) {
        return false;
      }

      suppressed = false;

      if (event) {
        preventDefaultAndStopPropagation(event);
      }

      return true;
    },
  };
}

export function isPointerInsideElement(event: PointerClientCoordinateLike, element: PointerHitTestElementLike | null | undefined): boolean {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

export function hasPointerMovedPastDragThreshold(event: PointerClientCoordinateLike, start: PointerDragStartLike, threshold = 4): boolean {
  return Math.abs(event.clientX - start.startX) > threshold || Math.abs(event.clientY - start.startY) > threshold;
}

export function updatePointerDragDidMovePastThreshold(
  drag: PointerDragMovementLike,
  event: PointerClientCoordinateLike,
  threshold = 4,
): boolean {
  if (!drag.didDrag && hasPointerMovedPastDragThreshold(event, drag, threshold)) {
    drag.didDrag = true;
  }

  return Boolean(drag.didDrag);
}

export function isPrimaryPointerButton(event: PointerButtonEventLike): boolean {
  return event.button === 0;
}

export function isPrimaryPointerDragActive(event: PointerButtonsEventLike): boolean {
  return (event.buttons & 1) === 1;
}

export function getCanContinuePointerDrag<TDrag extends PointerDragSessionLike>(
  drag: TDrag | null | undefined,
  event: PointerButtonsEventLike & PointerIdEventLike,
): drag is TDrag {
  return drag != null && drag.pointerId === event.pointerId && isPrimaryPointerDragActive(event);
}

export function getCanEndPointerDrag<TDrag extends PointerDragSessionLike>(
  drag: TDrag | null | undefined,
  event: PointerIdEventLike,
): drag is TDrag {
  return drag != null && drag.pointerId === event.pointerId;
}

export function getHeaderDragEndAction<TColumn extends HeaderDragEndColumnLike>(
  drag: HeaderDragEndLike,
  options: HeaderDragEndActionOptions<TColumn>,
): HeaderDragEndAction | null {
  if (!drag.didDrag) {
    return null;
  }

  const droppedOnGroupingPanel = options.groupingPanel && isPointerInsideElement(options.event, options.groupingPanelElement);
  const sourceColumn = options.columns.find((column) => column.id === drag.sourceColumnId);

  if (droppedOnGroupingPanel && sourceColumn?.getCanGroup()) {
    return {
      type: "group",
      columnId: drag.sourceColumnId,
    };
  }

  return {
    type: "move",
    sourceColumnId: drag.sourceColumnId,
    targetColumnId: drag.targetColumnId,
  };
}

export function isHeaderDragGroupAction(
  action: HeaderDragEndAction | null | undefined,
): action is Extract<HeaderDragEndAction, { type: "group" }> {
  return action?.type === "group";
}

export function isHeaderDragMoveAction(
  action: HeaderDragEndAction | null | undefined,
): action is Extract<HeaderDragEndAction, { type: "move" }> {
  return action?.type === "move";
}

export function getMeasuredElementBlockSize(element: MeasuredBlockElementLike, fallbackSize: number): number {
  return Math.max(fallbackSize, element.scrollHeight);
}

export function isMeasuredBlockElement(target: unknown): target is MeasuredBlockElementLike {
  return (
    typeof target === "object" &&
    target !== null &&
    "scrollHeight" in target &&
    typeof target.scrollHeight === "number"
  );
}

export function isMeasuredBlockRectElement(target: unknown): target is MeasuredBlockRectElementLike {
  return isMeasuredBlockElement(target) && "getBoundingClientRect" in target && typeof target.getBoundingClientRect === "function";
}

export function isMeasuredBlockRectElementTarget(target: unknown): target is MeasuredBlockRectElementTargetLike {
  return typeof Element !== "undefined" && target instanceof Element && isMeasuredBlockRectElement(target);
}

export function isMeasuredInlineElement(target: unknown): target is MeasuredInlineElementLike {
  return (
    typeof target === "object" &&
    target !== null &&
    "getBoundingClientRect" in target &&
    typeof target.getBoundingClientRect === "function"
  );
}

export function isMeasuredInlineDatasetElementTarget(target: unknown): target is MeasuredInlineDatasetElementTargetLike {
  return (
    typeof Element !== "undefined" &&
    target instanceof Element &&
    isMeasuredInlineElement(target) &&
    "dataset" in target &&
    typeof target.dataset === "object" &&
    target.dataset !== null
  );
}

export function getMeasuredElementBlockSizeFromTarget(target: unknown, fallbackSize: number): number {
  return isMeasuredBlockElement(target) ? getMeasuredElementBlockSize(target, fallbackSize) : fallbackSize;
}

export function getMeasuredElementBlockSizeFromRect(element: MeasuredBlockRectElementLike): number {
  return getMeasuredElementBlockSize(element, element.getBoundingClientRect().height);
}

export function getMeasuredElementInlineSize(element: MeasuredInlineElementLike): number {
  return element.getBoundingClientRect().width;
}

export function getElementOffsetBlockSize(
  element: OffsetBlockElementLike | null | undefined,
  fallbackSize: number,
): number {
  return element?.offsetHeight ?? fallbackSize;
}

export function getResizeObserverEntryBlockSize(entry: ResizeObserverBlockSizeEntryLike): number {
  const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
  return getMeasuredElementBlockSizeFromTarget(entry.target, borderBoxSize?.blockSize ?? entry.contentRect.height);
}

export function getResizeObserverEntryInlineSize(entry: ResizeObserverInlineSizeEntryLike): number {
  const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
  return borderBoxSize?.inlineSize ?? entry.contentRect.width;
}

export function isResizeObserverDatasetTarget(target: unknown): target is ResizeObserverDatasetTargetLike {
  if (typeof target !== "object" || target === null) {
    return false;
  }

  if (!("dataset" in target)) {
    return true;
  }

  return typeof target.dataset === "object" && target.dataset !== null;
}

export function getResizeObserverEntryDatasetId(
  entry: ResizeObserverDatasetEntryLike,
  key: ResizeObserverEntryDatasetKey,
): string | null {
  const value = isResizeObserverDatasetTarget(entry.target) ? entry.target.dataset?.[key] : undefined;
  return value || null;
}

export function setElementDatasetId(
  element: DatasetElementLike,
  key: ResizeObserverEntryDatasetKey,
  value: string,
): void {
  element.dataset[key] = value;
}

export function createResizeObserver(
  callback: ResizeObserverCallback,
  ResizeObserverConstructor: ResizeObserverConstructorLike | undefined =
    typeof ResizeObserver === "undefined" ? undefined : ResizeObserver,
): ResizeObserver | null {
  return ResizeObserverConstructor ? new ResizeObserverConstructor(callback) : null;
}

export function observeElements(observer: ResizeObserverObserveLike, elements: Iterable<Element>): void {
  for (const element of elements) {
    observer.observe(element);
  }
}

export function disconnectResizeObserver(observer: ResizeObserverDisconnectLike | null | undefined): void {
  observer?.disconnect();
}

export function removeObservedElement<TElement extends Element>(
  observer: ResizeObserverUnobserveLike | null | undefined,
  elements: ObservedElementMapLike<TElement>,
  id: string,
): void {
  const previous = elements.get(id);

  if (previous) {
    observer?.unobserve(previous);
    elements.delete(id);
  }
}

export function replaceObservedElement<TElement extends Element>(
  observer: (ResizeObserverObserveLike & ResizeObserverUnobserveLike) | null | undefined,
  elements: ObservedElementMapLike<TElement>,
  id: string,
  element: TElement,
): void {
  const previous = elements.get(id);

  if (previous && previous !== element) {
    observer?.unobserve(previous);
    elements.delete(id);
  }

  elements.set(id, element);
  observer?.observe(element);
}

export function applyResizeObserverMeasuredSizes(
  entries: readonly ResizeObserverEntry[],
  options: {
    cache: MeasuredSizeCacheLike;
    datasetKey: ResizeObserverEntryDatasetKey;
    getSize: (entry: ResizeObserverEntry) => number;
  },
): boolean {
  let changed = false;

  for (const entry of entries) {
    const id = getResizeObserverEntryDatasetId(entry, options.datasetKey);

    if (!id) {
      continue;
    }

    changed = options.cache.set(id, options.getSize(entry)) || changed;
  }

  return changed;
}

export function getSizeOffset(index: number, getSize: (index: number) => number): number {
  let offset = 0;

  for (let currentIndex = 0; currentIndex < index; currentIndex += 1) {
    offset += getSize(currentIndex);
  }

  return offset;
}

export function getColumnLayoutTotalWidth(layout: readonly ColumnLayoutTotalWidthItemLike[]): number {
  return layout.reduce((total, item) => Math.max(total, item.end), 0);
}

export function getColumnLayoutById(layout: readonly ColumnLayout[]): ReadonlyMap<ColumnId, ColumnLayout> {
  return new Map(layout.map((item) => [item.id, item]));
}

export function getColumnById<TColumn extends ColumnIdItemLike>(
  columnId: ColumnId,
  columns: readonly TColumn[],
): TColumn | undefined {
  return columns.find((column) => column.id === columnId);
}

export function getColumnIndexById<TColumn extends ColumnIdItemLike>(columnId: ColumnId, columns: readonly TColumn[]): number {
  return columns.findIndex((column) => column.id === columnId);
}

export function getRowById<TRow extends RowIdItemLike>(rowId: string, rows: readonly TRow[]): TRow | undefined {
  return rows.find((row) => row.id === rowId);
}

export type ColumnMoveDirection = "left" | "right";

export interface ColumnMoveGrid<TData> {
  getVisibleLeafColumns: Grid<TData>["getVisibleLeafColumns"];
  moveColumn: Grid<TData>["moveColumn"];
}

export interface GroupingColumnMoveGrid<TData> {
  moveGroupingColumn: Grid<TData>["moveGroupingColumn"];
}

export function moveVisibleColumn<TData>(
  grid: ColumnMoveGrid<TData>,
  columnId: ColumnId,
  direction: ColumnMoveDirection,
): boolean {
  const columns = grid.getVisibleLeafColumns();
  const columnIndex = columns.findIndex((column) => column.id === columnId);
  const targetColumn = columns[direction === "left" ? columnIndex - 1 : columnIndex + 1];

  if (columnIndex < 0 || !targetColumn) {
    return false;
  }

  grid.moveColumn(columnId, targetColumn.id, direction === "left" ? "before" : "after");
  return true;
}

export function moveColumnToTarget<TData>(
  grid: ColumnMoveGrid<TData>,
  sourceColumnId: ColumnId,
  targetColumnId: ColumnId,
): boolean {
  if (sourceColumnId === targetColumnId) {
    return false;
  }

  const columns = grid.getVisibleLeafColumns();
  const sourceIndex = columns.findIndex((column) => column.id === sourceColumnId);
  const targetIndex = columns.findIndex((column) => column.id === targetColumnId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  grid.moveColumn(sourceColumnId, targetColumnId, sourceIndex < targetIndex ? "after" : "before");
  return true;
}

export function moveGroupedColumn<TData>(
  grid: GroupingColumnMoveGrid<TData>,
  groupingColumns: readonly Column<TData, unknown>[],
  columnId: ColumnId,
  direction: ColumnMoveDirection,
): boolean {
  const columnIndex = groupingColumns.findIndex((column) => column.id === columnId);
  const targetColumn = groupingColumns[direction === "left" ? columnIndex - 1 : columnIndex + 1];

  if (columnIndex < 0 || !targetColumn) {
    return false;
  }

  grid.moveGroupingColumn(columnId, targetColumn.id, direction === "left" ? "before" : "after");
  return true;
}

export function resolveRowVirtualizationOptions(
  rowVirtualization: boolean | RowVirtualizationPrimitiveOptions | null | undefined,
): ResolvedRowVirtualizationOptions {
  if (rowVirtualization === true) {
    return {
      enabled: true,
      estimateRowHeight: 40,
      measureRowHeight: true,
      overscan: 6,
    };
  }

  if (!rowVirtualization) {
    return {
      enabled: false,
      estimateRowHeight: 40,
      measureRowHeight: true,
      overscan: 6,
    };
  }

  return {
    enabled: rowVirtualization.enabled ?? true,
    estimateRowHeight: rowVirtualization.estimateRowHeight ?? 40,
    measureRowHeight: rowVirtualization.measureRowHeight ?? true,
    overscan: rowVirtualization.overscan ?? 6,
  };
}

export function resolveColumnVirtualizationOptions(
  columnVirtualization: boolean | ColumnVirtualizationPrimitiveOptions | null | undefined,
): ResolvedColumnVirtualizationOptions {
  if (columnVirtualization === true) {
    return {
      enabled: true,
      measureColumnWidth: true,
      overscan: 2,
    };
  }

  if (!columnVirtualization) {
    return {
      enabled: false,
      measureColumnWidth: true,
      overscan: 2,
    };
  }

  return {
    enabled: columnVirtualization.enabled ?? true,
    measureColumnWidth: columnVirtualization.measureColumnWidth ?? true,
    overscan: columnVirtualization.overscan ?? 2,
  };
}

export function getScrollForFocusedCell<TData>(
  options: FocusedCellScrollOptions<TData>,
): FocusedCellScrollPosition | null {
  const {
    focusedCell,
    layout,
    rows,
    currentScrollLeft,
    currentScrollTop,
    viewportWidth,
    viewportHeight,
    headerHeight,
    getRowSize,
    rowVirtualOptions,
    columnVirtualOptions,
  } = options;
  let scrollLeft = currentScrollLeft;
  let scrollTop = currentScrollTop;

  if (columnVirtualOptions.enabled) {
    const columnLayout = layout.find((item) => item.id === focusedCell.columnId);

    if (columnLayout && columnLayout.pinned === false) {
      const leftPinnedWidth = layout
        .filter((item) => item.pinned === "left")
        .reduce((total, item) => total + item.size, 0);
      const rightPinnedWidth = layout
        .filter((item) => item.pinned === "right")
        .reduce((total, item) => total + item.size, 0);
      const visibleLeft = currentScrollLeft + leftPinnedWidth;
      const visibleRight = currentScrollLeft + viewportWidth - rightPinnedWidth;

      if (columnLayout.start < visibleLeft) {
        scrollLeft = Math.max(0, columnLayout.start - leftPinnedWidth);
      } else if (columnLayout.end > visibleRight) {
        scrollLeft = Math.max(0, columnLayout.end - viewportWidth + rightPinnedWidth);
      }
    }
  }

  if (rowVirtualOptions.enabled) {
    const rowIndex = rows.findIndex((row) => row.id === focusedCell.rowId);

    if (rowIndex >= 0) {
      const rowStart = headerHeight + getSizeOffset(rowIndex, getRowSize);
      const rowEnd = rowStart + getRowSize(rowIndex);
      const visibleTop = currentScrollTop;
      const visibleBottom = currentScrollTop + viewportHeight;

      if (rowStart < visibleTop) {
        scrollTop = Math.max(0, rowStart);
      } else if (rowEnd > visibleBottom) {
        scrollTop = Math.max(0, rowEnd - viewportHeight);
      }
    }
  }

  if (scrollLeft === currentScrollLeft && scrollTop === currentScrollTop) {
    return null;
  }

  return {
    scrollLeft,
    scrollTop,
  };
}

export function getVirtualRowStyle(virtualItem: VirtualRowStyleItemLike | null | undefined): VirtualRowStyleProps | undefined {
  if (!virtualItem) {
    return undefined;
  }

  return {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: virtualItem.size,
    transform: `translateY(${virtualItem.start}px)`,
  };
}

export function getVirtualRowStyleText(virtualItem: VirtualRowStyleItemLike | null | undefined): string | undefined {
  const style = getVirtualRowStyle(virtualItem);

  if (!style) {
    return undefined;
  }

  return [
    `position: ${style.position}`,
    `top: ${style.top}`,
    `left: ${style.left}`,
    `right: ${style.right}`,
    `height: ${style.height}px`,
    `transform: ${style.transform}`,
  ].join("; ");
}

export function getVirtualBodyStyle(virtualRange: VirtualBodyStyleRangeLike | null | undefined): VirtualBodyStyleProps | undefined {
  if (!virtualRange) {
    return undefined;
  }

  return {
    height: virtualRange.totalSize,
  };
}

export function getVirtualBodyStyleText(virtualRange: VirtualBodyStyleRangeLike | null | undefined): string | undefined {
  const style = getVirtualBodyStyle(virtualRange);

  if (!style) {
    return undefined;
  }

  return `height: ${style.height}px`;
}

export function getInlineSizeStyle(size: number): InlineSizeStyleProps {
  return {
    width: size,
  };
}

export function getInlineSizeStyleText(size: number): string {
  return `width: ${size}px`;
}

export function getVirtualizedInlineSizeStyle(size: number, enabled: boolean): VirtualizedInlineSizeStyleProps | undefined {
  if (!enabled) {
    return undefined;
  }

  return {
    width: size,
    minWidth: size,
  };
}

export function getVirtualizedInlineSizeStyleText(size: number, enabled: boolean): string | undefined {
  const style = getVirtualizedInlineSizeStyle(size, enabled);

  if (!style) {
    return undefined;
  }

  return `width: ${style.width}px; min-width: ${style.minWidth}px`;
}

export function getPinnedColumnOffsetStyle(layout: PinnedColumnOffsetStyleLayoutLike | null | undefined): PinnedColumnOffsetStyleProps | undefined {
  if (layout?.pinned === "left") {
    return {
      position: "sticky",
      left: layout.pinnedStart ?? 0,
    };
  }

  if (layout?.pinned === "right") {
    return {
      position: "sticky",
      right: layout.pinnedStart ?? 0,
    };
  }

  return undefined;
}

export function getPinnedColumnOffsetStyleText(layout: PinnedColumnOffsetStyleLayoutLike | null | undefined): string | undefined {
  const style = getPinnedColumnOffsetStyle(layout);

  if (!style) {
    return undefined;
  }

  if ("left" in style) {
    return `position: sticky; left: ${style.left}px`;
  }

  return `position: sticky; right: ${style.right}px`;
}

export function isCellCoordinateEqual(left: CellCoordinate | null | undefined, right: CellCoordinate | null | undefined): boolean {
  return !!left && !!right && left.rowId === right.rowId && left.columnId === right.columnId;
}

export function isFocusedCell(focusedCell: CellCoordinate | null, rowId: string, columnId: string): boolean {
  return isCellCoordinateEqual(focusedCell, { rowId, columnId });
}
