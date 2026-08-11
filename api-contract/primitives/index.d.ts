import { CellCoordinate, ColumnPinningPosition, ColumnId, Grid, ColumnLayout, Row, FocusDirection, MoveFocusOptions, GridState, Column, ColumnFiltersState } from '@open-grid/core';

type PrimitiveProps = Record<string, string | number | boolean | undefined>;
declare const GRID_DENSITIES: readonly ["compact", "standard", "comfortable"];
type GridDensity = (typeof GRID_DENSITIES)[number];
declare const GRID_PREFERENCES_VERSION: 1;
interface GridPreferencesState {
    columnVisibility: GridState["columnVisibility"];
    columnSizing: GridState["columnSizing"];
    columnOrder: GridState["columnOrder"];
    columnPinning: GridState["columnPinning"];
}
interface GridPreferences {
    version: typeof GRID_PREFERENCES_VERSION;
    density: GridDensity;
    state: GridPreferencesState;
}
interface GridPreferencesOptions {
    validColumnIds?: readonly string[] | undefined;
}
interface GridPreferencesStorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}
interface GridPreferencesStorageEnvironmentLike {
    localStorage?: GridPreferencesStorageLike | null | undefined;
}
interface CellPrimitiveOptions {
    focusedCell?: CellCoordinate | null;
    editing?: boolean;
    rangeSelected?: boolean;
    rowIndexOffset?: number | undefined;
}
interface CellEditorPrimitiveOptions {
    invalid?: boolean | undefined;
}
interface CellEditorOptionPrimitiveOptions {
    value: string;
    label?: string | undefined;
    disabled?: boolean | undefined;
}
interface CellEditorValueTargetLike {
    value?: unknown;
}
interface CellEditorValueEventLike<TTarget = unknown> {
    currentTarget?: TTarget | null | undefined;
    target?: TTarget | null | undefined;
}
interface CellEditValidationEventLike {
    validation?: {
        valid: boolean;
        message?: string | undefined;
    } | undefined;
}
interface CellFillHandleVisibilityOptions {
    activeEditing?: boolean | undefined;
    editing?: boolean | undefined;
    fillHandleCoordinate?: CellCoordinate | null | undefined;
    rangeSelected?: boolean | undefined;
}
interface ClipboardTextAreaLike {
    value: string;
    style: {
        position?: string | undefined;
        top?: string | undefined;
        left?: string | undefined;
    };
    select: () => void;
    setAttribute: (name: string, value: string) => void;
}
interface ClipboardTextParentLike {
    appendChild: (element: ClipboardTextAreaLike) => void;
    removeChild: (element: ClipboardTextAreaLike) => void;
}
interface ClipboardTextDocumentLike {
    body?: ClipboardTextParentLike | null | undefined;
    documentElement: ClipboardTextParentLike;
    createElement: (tagName: "textarea") => ClipboardTextAreaLike;
    execCommand: (command: "copy") => boolean;
}
interface ClipboardTextNavigatorLike {
    clipboard?: {
        readText?: () => Promise<string> | string;
        writeText?: (text: string) => Promise<void> | void;
    } | undefined;
}
interface ClipboardTextEnvironment {
    document?: ClipboardTextDocumentLike | undefined;
    navigator?: ClipboardTextNavigatorLike | undefined;
}
interface BrowserExportFileLike {
    filename: string;
    mimeType: string;
    text: string;
}
interface BrowserDownloadAnchorLike {
    href: string;
    download: string;
    style: {
        display?: string | undefined;
    };
    click: () => void;
}
interface BrowserDownloadParentLike {
    appendChild: (element: BrowserDownloadAnchorLike) => void;
    removeChild: (element: BrowserDownloadAnchorLike) => void;
}
interface BrowserDownloadDocumentLike {
    body?: BrowserDownloadParentLike | null | undefined;
    documentElement: BrowserDownloadParentLike;
    createElement: (tagName: "a") => BrowserDownloadAnchorLike;
}
interface BrowserDownloadBlobConstructorLike {
    new (blobParts: readonly string[], options: {
        type: string;
    }): unknown;
}
interface BrowserDownloadUrlLike {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
}
interface BrowserDownloadEnvironment {
    blob?: BrowserDownloadBlobConstructorLike | undefined;
    document?: BrowserDownloadDocumentLike | undefined;
    url?: BrowserDownloadUrlLike | undefined;
}
interface FocusableElementLike {
    focus: () => void;
}
interface HeaderActionMenuItemFocusTargetLike extends FocusableElementLike {
}
interface FocusableSelectableElementLike extends FocusableElementLike {
    select?: (() => void) | undefined;
}
interface FocusedCellContainerLike {
    querySelector: (selector: string) => FocusableElementLike | null;
}
interface KeyboardTargetEventLike {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
}
interface HeaderActionMenuFocusTargetEventLike {
    currentTarget: unknown;
}
interface HeaderActionMenuActiveElementDocumentLike {
    activeElement?: unknown;
}
interface HeaderActionMenuActiveElementTargetLike {
    ownerDocument?: HeaderActionMenuActiveElementDocumentLike | null | undefined;
}
interface HeaderActionMenuFocusTargetLike extends ParentNode {
    focus: () => void;
}
interface FocusedCellRestoreOptions {
    focusedCell: CellCoordinate | null | undefined;
    scroller: unknown;
    shouldRestore: boolean;
    inProgress?: boolean | undefined;
}
interface FocusedCellRestoreFrameSyncOptions {
    inProgress?: boolean | undefined;
}
interface ElementIdLookupLike<TElement extends FocusableElementLike = FocusableElementLike> {
    getElementById: (id: string) => TElement | null;
}
interface ScrollPositionElementLike {
    scrollLeft: number;
    scrollTop: number;
}
interface ScrollFrameElementLike extends ScrollPositionElementLike {
    clientHeight: number;
    clientWidth: number;
}
interface ScrollFrameElementOptions {
    scrollLeft?: number | undefined;
    scrollTop?: number | undefined;
    stickyTopOffset?: number | undefined;
}
interface ScrollFrameOptionsLike {
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    stickyTopOffset: number;
}
type FocusedCellScrollElementOptions<TData> = Omit<FocusedCellScrollOptions<TData>, "currentScrollLeft" | "currentScrollTop" | "viewportWidth" | "viewportHeight">;
interface FocusedRowSelectionTarget<TData> {
    row: Row<TData>;
    rowIndex: number;
}
interface CellLayoutPrimitiveOptions {
    invalid?: boolean | undefined;
    pinnedEdge?: "left" | "right" | undefined;
}
interface RowPrimitiveOptions {
    selected?: boolean;
    rowIndexOffset?: number | undefined;
}
interface RowExpansionTogglePrimitiveOptions {
    expanded: boolean;
    label: string;
}
interface RowLayoutPrimitiveOptions {
    expanded?: boolean | undefined;
    virtualIndex?: number | undefined;
    columnVirtualized?: boolean | undefined;
}
interface ColumnPinningButtonPrimitiveOptions {
    position: ColumnPinningPosition;
    active: boolean;
}
interface HeaderActionMenuTriggerPrimitiveOptions {
    expanded: boolean;
    controls: string;
}
interface HeaderActionMenuItemPrimitiveOptions {
    disabled?: boolean | undefined;
}
interface HeaderActionMenuLabelPrimitiveOptions {
    label?: string | undefined;
}
interface HeaderCellLayoutPrimitiveOptions {
    colSpan?: number | undefined;
    rowSpan?: number | undefined;
    grouped?: boolean | undefined;
    placeholder?: boolean | undefined;
    pinnedEdge?: "left" | "right" | undefined;
    draggable?: boolean | undefined;
}
interface HeaderCellPrimitiveOptions {
    pinned?: ColumnPinningPosition | undefined;
}
interface HeaderButtonPrimitiveOptions {
    disabled?: boolean | undefined;
    placeholder?: boolean | undefined;
}
interface HeaderSortIndicatorTextOptions {
    visible?: boolean | undefined;
}
interface HeaderKeyboardMoveEventLike {
    key: string;
    altKey?: boolean | undefined;
    shiftKey?: boolean | undefined;
}
interface GridKeyboardShortcutEventLike {
    key: string;
    ctrlKey?: boolean | undefined;
    metaKey?: boolean | undefined;
    altKey?: boolean | undefined;
    shiftKey?: boolean | undefined;
}
type GridKeyboardShortcutAction = "copy" | "paste" | "undo-edit" | "redo-edit" | "row-selection";
type GridKeyboardEditAction = "start-edit" | "cancel-edit";
type CellEditorKeyboardAction = "commit-edit" | "cancel-edit";
interface GridKeyboardFocusMove {
    direction: FocusDirection;
    options: MoveFocusOptions;
}
interface ColumnResizeHandlePrimitiveOptions {
    valueNow?: number | undefined;
}
interface ColumnResizeKeyboardEventLike {
    key: string;
    shiftKey?: boolean | undefined;
}
interface ColumnResizeKeyboardSizeOptions {
    defaultStep?: number | undefined;
    largeStep?: number | undefined;
}
interface ColumnResizePointerEventLike {
    clientX: number;
}
interface ColumnResizeFinalSizeEventLike {
    defaultPrevented: boolean;
    size: number;
}
interface ColumnResizeDefaultPreventableEventLike {
    defaultPrevented: boolean;
}
interface PointerCaptureTargetLike {
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
}
interface PointerCaptureEventLike {
    currentTarget: unknown;
}
type PointerListener = (event: PointerEvent) => void;
interface PointerMoveUpListeners {
    move: PointerListener;
    up: PointerListener;
}
interface PointerMoveUpListenerTargetLike {
    addEventListener: (type: "pointermove" | "pointerup", listener: PointerListener) => void;
    removeEventListener: (type: "pointermove" | "pointerup", listener: PointerListener) => void;
}
interface PointerUpCancelListeners {
    up: PointerListener;
    cancel: PointerListener;
}
interface PointerUpCancelListenerTargetLike {
    addEventListener: (type: "pointerup" | "pointercancel", listener: PointerListener) => void;
    removeEventListener: (type: "pointerup" | "pointercancel", listener: PointerListener) => void;
}
interface PointerMoveUpCancelListeners {
    move: PointerListener;
    up: PointerListener;
    cancel: PointerListener;
}
interface PointerMoveUpCancelListenerTargetLike {
    addEventListener: (type: "pointermove" | "pointerup" | "pointercancel", listener: PointerListener) => void;
    removeEventListener: (type: "pointermove" | "pointerup" | "pointercancel", listener: PointerListener) => void;
}
type ScrollListener = (event: Event) => void;
interface ScrollListenerTargetLike {
    addEventListener: (type: "scroll", listener: ScrollListener, options?: AddEventListenerOptions) => void;
    removeEventListener: (type: "scroll", listener: ScrollListener) => void;
}
interface GroupingPanelPrimitiveOptions {
    empty?: boolean | undefined;
}
interface GroupingPanelMoveButtonPrimitiveOptions {
    direction: "left" | "right";
    disabled?: boolean | undefined;
}
interface GroupRowLabelOptions<TFallback = string> {
    fallback?: TFallback | undefined;
}
interface GroupCellIndentOptions {
    depthSize?: number | undefined;
    footerOffset?: number | undefined;
}
interface GridHeaderRowPrimitiveOptions {
    columnVirtualized?: boolean | undefined;
    rowIndex?: number | undefined;
}
interface GridRowCoordinateOptions {
    additionalHeaderRowCount?: number | undefined;
    headerRowCount?: number | undefined;
    ariaLabel?: string | undefined;
    error?: boolean | undefined;
    loading?: boolean | undefined;
}
interface ColumnFilterCellPrimitiveOptions {
    columnIndex: number;
    rowIndex: number;
    pinned?: ColumnPinningPosition | undefined;
    pinnedEdge?: "left" | "right" | undefined;
}
interface ColumnFilterInputPrimitiveOptions {
    label: string;
    value: unknown;
}
interface QuickFilterInputPrimitiveOptions {
    value: string;
}
interface RowSelectionCheckboxPrimitiveOptions {
    allSelected?: boolean | undefined;
    someSelected?: boolean | undefined;
    disabled?: boolean | undefined;
}
interface ColumnVisibilityCheckboxPrimitiveOptions {
    columnId: ColumnId;
    label: string;
    visible: boolean;
    visibleCount?: number | undefined;
    disabled?: boolean | undefined;
}
interface CheckboxIndeterminateTargetLike {
    indeterminate: boolean;
}
type PaginationAction = "first" | "previous" | "next" | "last";
interface PaginationButtonPrimitiveOptions {
    action: PaginationAction;
    disabled?: boolean | undefined;
}
declare const DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS: readonly [25, 50, 100];
interface GridEmptyRowPrimitiveOptions {
    rowIndexOffset?: number | undefined;
}
interface GridEmptyCellPrimitiveOptions extends GridEmptyRowPrimitiveOptions {
    columnCount?: number | undefined;
}
interface GridBodyPrimitiveOptions {
    virtualized?: boolean | undefined;
    columnOrder?: readonly string[] | undefined;
}
interface RowVirtualizationPrimitiveOptions {
    enabled?: boolean | undefined;
    estimateRowHeight?: number | undefined;
    measureRowHeight?: boolean | undefined;
    overscan?: number | undefined;
}
interface ResolvedRowVirtualizationOptions {
    enabled: boolean;
    estimateRowHeight: number;
    measureRowHeight: boolean;
    overscan: number;
}
interface ColumnVirtualizationPrimitiveOptions {
    enabled?: boolean | undefined;
    measureColumnWidth?: boolean | undefined;
    overscan?: number | undefined;
}
interface ResolvedColumnVirtualizationOptions {
    enabled: boolean;
    measureColumnWidth: boolean;
    overscan: number;
}
interface FocusedCellScrollOptions<TData> {
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
interface FocusedCellScrollPosition {
    scrollLeft: number;
    scrollTop: number;
}
type HeaderActionMenuItemFocusPosition = "first" | "last" | "next" | "previous";
type HeaderActionMenuKeyboardAction = {
    type: "focus";
    position: HeaderActionMenuItemFocusPosition;
} | {
    type: "close";
} | {
    type: "tab-close";
};
type HeaderActionMenuDefaultItemId = "sort-asc" | "sort-desc" | "clear-sort" | "move-left" | "move-right" | "pin-left" | "unpin" | "pin-right" | "toggle-group";
interface HeaderActionMenuDefaultItemLabelOptions {
    grouped?: boolean | undefined;
}
interface HeaderActionMenuDefaultItemDescriptor {
    id: HeaderActionMenuDefaultItemId;
    label: string;
    disabled?: boolean;
}
interface HeaderActionMenuDefaultItemDescriptorOptions {
    sortDirection: "asc" | "desc" | false;
    pinningPosition: ColumnPinningPosition;
    isGrouped: boolean;
    canGroup: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
}
interface HeaderActionMenuPrimitiveItem {
    type?: string | undefined;
}
interface HeaderActionMenuPrimitiveCustomItem {
    type: "custom";
    props?: Record<string, unknown> | undefined;
}
interface HeaderActionMenuPrimitiveLabelItem {
    type: "label";
}
interface HeaderActionMenuPrimitiveSeparatorItem {
    type: "separator";
}
interface DefaultPreventableEventLike {
    preventDefault(): void;
}
interface RowSelectionToggleEventLike {
    defaultPrevented: boolean;
}
interface DefaultPreventedEventLike {
    defaultPrevented: boolean;
}
interface DefaultPreventablePropagationEventLike {
    preventDefault(): void;
    stopPropagation(): void;
}
interface PropagationEventLike {
    stopPropagation(): void;
}
interface PointerClientCoordinateLike {
    clientX: number;
    clientY: number;
}
interface PointerButtonEventLike {
    button: number;
}
interface PointerButtonsEventLike {
    buttons: number;
}
interface PointerIdEventLike {
    pointerId: number;
}
interface PointerDragSessionLike {
    pointerId: number;
}
interface VirtualRowStyleItemLike {
    start: number;
    size: number;
}
interface VirtualBodyStyleRangeLike {
    totalSize: number;
}
interface VirtualBodyStyleProps {
    height: number;
}
interface InlineSizeStyleProps {
    width: number;
}
interface VirtualizedInlineSizeStyleProps {
    width: number;
    minWidth: number;
}
interface GroupCellIndentStyleProps {
    paddingLeft: number;
}
interface PinnedColumnOffsetStyleLayoutLike {
    pinned: ColumnPinningPosition;
    pinnedStart?: number | undefined;
}
type PinnedColumnOffsetStyleProps = {
    position: "sticky";
    left: number;
} | {
    position: "sticky";
    right: number;
};
interface VirtualRowStyleProps {
    position: "absolute";
    top: 0;
    left: 0;
    right: 0;
    height: number;
    transform: string;
}
interface ColumnLayoutTotalWidthItemLike {
    end: number;
}
interface ColumnIdItemLike {
    id: ColumnId;
}
interface RowIdItemLike {
    id: string;
}
interface PointerDragStartLike {
    startX: number;
    startY: number;
}
interface PointerDragMovementLike extends PointerDragStartLike {
    didDrag?: boolean | undefined;
}
interface HeaderDragEndLike {
    sourceColumnId: string;
    targetColumnId: string;
    didDrag?: boolean | undefined;
}
interface HeaderDragEndColumnLike {
    id: string;
    getCanGroup(): boolean;
}
type HeaderDragEndAction = {
    type: "group";
    columnId: string;
} | {
    type: "move";
    sourceColumnId: string;
    targetColumnId: string;
};
interface HeaderDragEndActionOptions<TColumn extends HeaderDragEndColumnLike> {
    event: PointerClientCoordinateLike;
    groupingPanel: boolean;
    groupingPanelElement?: PointerHitTestElementLike | null | undefined;
    columns: readonly TColumn[];
}
interface PointerHitTestElementLike {
    getBoundingClientRect(): {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
}
interface MeasuredBlockElementLike {
    scrollHeight: number;
}
interface MeasuredBlockRectElementLike extends MeasuredBlockElementLike {
    getBoundingClientRect(): {
        height: number;
    };
}
interface MeasuredInlineElementLike {
    getBoundingClientRect(): {
        width: number;
    };
}
type MeasuredBlockRectElementTargetLike = Element & MeasuredBlockRectElementLike;
type MeasuredInlineDatasetElementTargetLike = Element & MeasuredInlineElementLike & DatasetElementLike;
interface OffsetBlockElementLike {
    offsetHeight: number;
}
interface DatasetElementLike {
    dataset: Record<string, string | undefined>;
}
interface ResizeObserverDatasetTargetLike {
    dataset?: Record<string, string | undefined> | undefined;
}
interface ResizeObserverDatasetEntryLike {
    target: unknown;
}
interface ResizeObserverBlockSizeEntryLike {
    target: unknown;
    borderBoxSize?: ResizeObserverEntry["borderBoxSize"] | undefined;
    contentRect: {
        height: number;
    };
}
interface ResizeObserverInlineSizeEntryLike {
    borderBoxSize?: ResizeObserverEntry["borderBoxSize"] | undefined;
    contentRect: {
        width: number;
    };
}
type ResizeObserverEntryDatasetKey = "rowId" | "columnId";
interface ResizeObserverObserveLike {
    observe: (target: Element) => void;
}
interface ResizeObserverUnobserveLike {
    unobserve: (target: Element) => void;
}
interface ResizeObserverDisconnectLike {
    disconnect: () => void;
}
type ResizeObserverConstructorLike = new (callback: ResizeObserverCallback) => ResizeObserver;
interface ObservedElementMapLike<TElement extends Element> {
    get: (id: string) => TElement | undefined;
    set: (id: string, element: TElement) => unknown;
    delete: (id: string) => unknown;
}
interface MeasuredSizeCacheLike {
    set: (key: string, size: number) => boolean;
}
declare const HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR = "[role=\"menuitem\"]:not(:disabled):not([aria-disabled=\"true\"])";
declare const HEADER_ACTION_MENU_TRIGGER_TEXT = "...";
declare const GROUPING_PANEL_EMPTY_MESSAGE = "Drag column headers here to group";
declare const GRID_FOCUSED_CELL_SELECTOR = "[role=\"gridcell\"][data-focused=\"true\"]";
declare const GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR = "button, input, select, textarea, a[href], [contenteditable]:not([contenteditable='false']), [role='button'], [role='menuitem'], [role='separator'], [role='slider'], [role='textbox'], [role='combobox'], [role='searchbox'], [role='spinbutton']";
declare function getGridProps<TData>(grid: Grid<TData>, options?: GridRowCoordinateOptions): PrimitiveProps;
declare function getGridHeaderProps(): PrimitiveProps;
declare function getGridLoadingOverlayProps(): PrimitiveProps;
declare function getGridLoadingText(): string;
declare function getGridErrorOverlayProps(): PrimitiveProps;
declare function getGridErrorText(): string;
declare function getGridErrorRetryButtonProps(): PrimitiveProps;
declare function getGridErrorRetryButtonText(): string;
declare function getGridHeaderRowProps(options?: GridHeaderRowPrimitiveOptions): PrimitiveProps;
declare function getGridHeaderRowCount<TData>(grid: Grid<TData>, options?: GridRowCoordinateOptions): number;
declare function getGridBodyRowIndexOffset<TData>(grid: Grid<TData>, options?: GridRowCoordinateOptions): number;
declare function getColumnFilterCellProps<TData>(column: Column<TData, unknown>, options: ColumnFilterCellPrimitiveOptions): PrimitiveProps;
declare function getColumnFilterInputProps<TData>(column: Column<TData, unknown>, options: ColumnFilterInputPrimitiveOptions): PrimitiveProps;
declare function getColumnFilterText(filters: ColumnFiltersState, columnId: ColumnId): string;
declare function getQuickFilterProps(): PrimitiveProps;
declare function getQuickFilterInputProps(options: QuickFilterInputPrimitiveOptions): PrimitiveProps;
declare function getQuickFilterClearButtonProps(value: string): PrimitiveProps;
declare function getQuickFilterClearButtonText(): string;
declare function getRowSelectionControlsProps(): PrimitiveProps;
declare function getRowSelectionCheckboxProps(options?: RowSelectionCheckboxPrimitiveOptions): PrimitiveProps;
declare function getRowSelectionCheckboxText(): string;
declare function getRowSelectionStatusProps(): PrimitiveProps;
declare function getRowSelectionStatusText(selectedCount: number): string;
declare function getRowSelectionClearButtonProps(disabled?: boolean): PrimitiveProps;
declare function getRowSelectionClearButtonText(): string;
declare function setCheckboxIndeterminate(target: unknown, indeterminate: boolean): boolean;
declare function getColumnVisibilityControlsProps(): PrimitiveProps;
declare function getColumnVisibilitySummaryProps(visibleCount: number, totalCount: number): PrimitiveProps;
declare function getColumnVisibilitySummaryText(visibleCount: number, totalCount: number): string;
declare function getColumnVisibilitySearchInputProps(value: string): PrimitiveProps;
declare function getColumnVisibilityListProps(): PrimitiveProps;
declare function getColumnVisibilityCheckboxProps(options: ColumnVisibilityCheckboxPrimitiveOptions): PrimitiveProps;
declare function getColumnVisibilityStatusProps(): PrimitiveProps;
declare function getColumnVisibilityStatusText(visibleCount: number, totalCount: number): string;
declare function getColumnVisibilityEmptyText(): string;
declare function getColumnVisibilityResetButtonProps(hiddenCount: number): PrimitiveProps;
declare function getColumnVisibilityResetButtonText(): string;
declare function normalizeGridDensity(value: unknown, fallback?: GridDensity): GridDensity;
declare function createGridPreferences(state?: Partial<GridState>, density?: GridDensity, options?: GridPreferencesOptions): GridPreferences;
declare function serializeGridPreferences(preferences: GridPreferences, options?: GridPreferencesOptions): string;
declare function parseGridPreferences(value: string, options?: GridPreferencesOptions): GridPreferences | null;
declare function getBrowserGridPreferencesStorage(environment?: GridPreferencesStorageEnvironmentLike | null | undefined): GridPreferencesStorageLike | null;
declare function readGridPreferences(storage: GridPreferencesStorageLike | null | undefined, key: string, options?: GridPreferencesOptions): GridPreferences | null;
declare function writeGridPreferences(storage: GridPreferencesStorageLike | null | undefined, key: string, state: Partial<GridState>, density: GridDensity, options?: GridPreferencesOptions): boolean;
declare function removeGridPreferences(storage: GridPreferencesStorageLike | null | undefined, key: string): boolean;
declare function getGridDensityProps(density: GridDensity): PrimitiveProps;
declare function getGridDensityRowHeight(density: GridDensity): number;
declare function getDensityControlsProps(): PrimitiveProps;
declare function getDensityButtonProps(density: GridDensity, currentDensity: GridDensity): PrimitiveProps;
declare function getDensityButtonText(density: GridDensity): string;
declare function getFilteredColumnVisibilityColumns<TData>(columns: readonly Column<TData, unknown>[], query: string): Column<TData, unknown>[];
declare function getNextColumnFilters(filters: ColumnFiltersState, columnId: ColumnId, value: string): ColumnFiltersState;
declare function getPaginationProps(): PrimitiveProps;
declare function getPaginationButtonProps(options: PaginationButtonPrimitiveOptions): PrimitiveProps;
declare function getPaginationButtonText(action: PaginationAction): string;
declare function getPaginationStatusProps(): PrimitiveProps;
declare function getPaginationPageText<TData>(grid: Grid<TData>): string;
declare function getPaginationPageSizeSelectProps(pageSize: number): PrimitiveProps;
declare function getPaginationPageSizeOptions(options?: readonly number[], currentPageSize?: number): number[];
declare function getPaginationPageSizeOptionText(pageSize: number): string;
declare function getGridBodyProps(options?: GridBodyPrimitiveOptions): PrimitiveProps;
declare function getGridEmptyRowProps(options?: GridEmptyRowPrimitiveOptions): PrimitiveProps;
declare function getGridEmptyCellProps(options?: GridEmptyCellPrimitiveOptions): PrimitiveProps;
declare function getColumnSpacerProps(): PrimitiveProps;
declare function getHeaderCellProps<TData>(grid: Grid<TData>, column: Column<TData, unknown>, columnIndex: number, options?: HeaderCellPrimitiveOptions): PrimitiveProps;
declare function getHeaderPlaceholderCellProps<TData>(column: Column<TData, unknown>): PrimitiveProps;
declare function getHeaderCellLayoutProps(options?: HeaderCellLayoutPrimitiveOptions): PrimitiveProps;
declare function getHeaderButtonProps(options?: HeaderButtonPrimitiveOptions): PrimitiveProps;
declare function getHeaderSortIndicatorProps(): PrimitiveProps;
declare function getHeaderSortIndicatorText(sortDirection: "asc" | "desc" | false | null | undefined, options?: HeaderSortIndicatorTextOptions): string;
declare function getHeaderKeyboardMoveDirection(event: HeaderKeyboardMoveEventLike): "left" | "right" | null;
declare function getHeaderActionMenuTriggerFocusPosition(event: {
    key: string;
}): "first" | "last" | null;
declare function getHeaderActionMenuKeyboardAction(event: {
    key: string;
}): HeaderActionMenuKeyboardAction | null;
declare function isHeaderActionMenuCloseAction(action: HeaderActionMenuKeyboardAction | null | undefined): action is Extract<HeaderActionMenuKeyboardAction, {
    type: "close";
}>;
declare function isHeaderActionMenuFocusAction(action: HeaderActionMenuKeyboardAction | null | undefined): action is Extract<HeaderActionMenuKeyboardAction, {
    type: "focus";
}>;
declare function isHeaderActionMenuTabCloseAction(action: HeaderActionMenuKeyboardAction | null | undefined): action is Extract<HeaderActionMenuKeyboardAction, {
    type: "tab-close";
}>;
declare function getGridKeyboardShortcutAction(event: GridKeyboardShortcutEventLike): GridKeyboardShortcutAction | null;
declare function getGridKeyboardEditAction(event: GridKeyboardShortcutEventLike): GridKeyboardEditAction | null;
declare function getCellEditorKeyboardAction(event: {
    key: string;
}): CellEditorKeyboardAction | null;
declare function getGridKeyboardFocusMove(event: GridKeyboardShortcutEventLike): GridKeyboardFocusMove | null;
declare function getColumnResizeHandleProps<TData>(column: Column<TData, unknown>, options?: ColumnResizeHandlePrimitiveOptions): PrimitiveProps;
declare function getColumnResizeStartSize<TData>(grid: Grid<TData>, column: Column<TData, unknown>): number;
declare function getColumnResizeKeyboardSize<TData>(column: Column<TData, unknown>, startSize: number, event: ColumnResizeKeyboardEventLike, options?: ColumnResizeKeyboardSizeOptions): number | null;
declare function getColumnResizePointerSize(startSize: number, startX: number, event: ColumnResizePointerEventLike): number;
declare function getCanStartColumnResize(event: ColumnResizeDefaultPreventableEventLike): boolean;
declare function getCanApplyColumnResize(event: ColumnResizeDefaultPreventableEventLike): boolean;
declare function getColumnResizeFinalSize(startSize: number, event: ColumnResizeFinalSizeEventLike): number;
declare function isPointerCaptureTarget(target: unknown): target is PointerCaptureTargetLike;
declare function getPointerCaptureTarget(event: PointerCaptureEventLike): unknown;
declare function getDefaultPointerMoveUpListenerTarget(): PointerMoveUpListenerTargetLike | null;
declare function getDefaultPointerUpCancelListenerTarget(): PointerUpCancelListenerTargetLike | null;
declare function getDefaultPointerMoveUpCancelListenerTarget(): PointerMoveUpCancelListenerTargetLike | null;
declare function trySetPointerCapture(target: unknown, pointerId: number): boolean;
declare function tryReleasePointerCapture(target: unknown, pointerId: number): boolean;
declare function addPointerMoveUpListeners(listeners: PointerMoveUpListeners, target?: PointerMoveUpListenerTargetLike | null | undefined): () => void;
declare function addPointerUpCancelListeners(listeners: PointerUpCancelListeners, target?: PointerUpCancelListenerTargetLike | null | undefined): () => void;
declare function addPointerMoveUpCancelListeners(listeners: PointerMoveUpCancelListeners, target?: PointerMoveUpCancelListenerTargetLike | null | undefined): () => void;
declare function addPassiveScrollListener(listener: ScrollListener, target: ScrollListenerTargetLike): () => void;
declare function getColumnPinningControlsProps<TData>(column: Column<TData, unknown>): PrimitiveProps;
declare function getColumnPinningButtonText(position: ColumnPinningPosition): string;
declare function getColumnPinningButtonProps<TData>(column: Column<TData, unknown>, options: ColumnPinningButtonPrimitiveOptions): PrimitiveProps;
declare function getHeaderActionMenuTriggerProps<TData>(column: Column<TData, unknown>, options: HeaderActionMenuTriggerPrimitiveOptions): PrimitiveProps;
declare function getHeaderActionMenuId(columnId: string): string;
declare function getHeaderActionMenuTriggerId(columnId: string): string;
declare function getHeaderActionMenuProps<TData>(column: Column<TData, unknown>): PrimitiveProps;
declare function getHeaderActionMenuDefaultItemLabel(itemId: HeaderActionMenuDefaultItemId, options?: HeaderActionMenuDefaultItemLabelOptions): string;
declare function getHeaderActionMenuDefaultItemDescriptors(options: HeaderActionMenuDefaultItemDescriptorOptions): HeaderActionMenuDefaultItemDescriptor[];
declare function getHeaderActionMenuItemProps(options?: HeaderActionMenuItemPrimitiveOptions): PrimitiveProps;
declare function getHeaderActionMenuCustomItemProps(options?: HeaderActionMenuLabelPrimitiveOptions): PrimitiveProps;
declare function getHeaderActionMenuLabelProps(): PrimitiveProps;
declare function getHeaderActionMenuSeparatorProps(options?: HeaderActionMenuLabelPrimitiveOptions): PrimitiveProps;
declare function isHeaderActionMenuItem<TItem>(item: TItem | null | false | undefined): item is TItem;
declare function isHeaderActionMenuActionItem<TItem extends HeaderActionMenuPrimitiveItem>(item: TItem | null | false | undefined): item is Extract<TItem, {
    type?: "action";
}>;
declare function isHeaderActionMenuCustomItem<TItem extends HeaderActionMenuPrimitiveItem>(item: TItem | null | false | undefined): item is Extract<TItem, {
    type: "custom";
}>;
declare function isHeaderActionMenuLabelItem<TItem extends HeaderActionMenuPrimitiveItem>(item: TItem | null | false | undefined): item is Extract<TItem, {
    type: "label";
}>;
declare function isHeaderActionMenuSeparatorItem<TItem extends HeaderActionMenuPrimitiveItem>(item: TItem | null | false | undefined): item is Extract<TItem, {
    type: "separator";
}>;
declare function getHeaderActionMenuCustomItemUserProps(item: HeaderActionMenuPrimitiveCustomItem | null | false | undefined): Record<string, unknown>;
declare function getGroupingPanelProps(options?: GroupingPanelPrimitiveOptions): PrimitiveProps;
declare function getGroupingPanelPlaceholderProps(): PrimitiveProps;
declare function getGroupingPanelChipProps<TData>(column: Column<TData, unknown>): PrimitiveProps;
declare function getGroupingPanelMoveButtonProps<TData>(column: Column<TData, unknown>, options: GroupingPanelMoveButtonPrimitiveOptions): PrimitiveProps;
declare function getGroupingPanelRemoveButtonProps<TData>(column: Column<TData, unknown>): PrimitiveProps;
declare function getIsGroupLabelCell<TData>(row: Row<TData>, column: Column<TData, unknown>, visibleColumns: readonly Column<TData, unknown>[]): boolean;
declare function getGroupValueText(value: unknown): string;
declare function getGroupRowLabel<TData, TFallback = string>(row: Row<TData>, column: Column<TData, unknown>, options?: GroupRowLabelOptions<TFallback>): string | TFallback;
declare function getGroupCellIndent<TData>(row: Row<TData>, options?: GroupCellIndentOptions): number;
declare function getGroupCellIndentStyle<TData>(row: Row<TData>, options?: GroupCellIndentOptions): GroupCellIndentStyleProps;
declare function getGroupCellIndentStyleText<TData>(row: Row<TData>, options?: GroupCellIndentOptions): string;
declare function getGroupRowCountText<TData>(row: Row<TData>): string | undefined;
declare function getRowProps<TData>(row: Row<TData>, rowIndex: number, options?: RowPrimitiveOptions): PrimitiveProps;
declare function getRowLayoutProps<TData>(row: Row<TData>, options?: RowLayoutPrimitiveOptions): PrimitiveProps;
declare function getRowExpansionToggleProps<TData>(row: Row<TData>, options: RowExpansionTogglePrimitiveOptions): PrimitiveProps;
declare function getRowExpansionToggleText(expanded: boolean): string;
declare function getRowExpansionSpacerProps(): PrimitiveProps;
declare function getCellProps<TData>(row: Row<TData>, column: Column<TData, unknown>, _rowIndex: number, columnIndex: number, options?: CellPrimitiveOptions): PrimitiveProps;
declare function getCellLayoutProps(options?: CellLayoutPrimitiveOptions): PrimitiveProps;
declare function getCellFillHandleProps(): PrimitiveProps;
declare function getCanStartCellEdit<TData>(row: Row<TData>, column: Column<TData, unknown>): boolean;
declare function getCanStartFocusedCellEdit(focusedCell: CellCoordinate | null | undefined, editingCell: CellCoordinate | null | undefined): focusedCell is CellCoordinate;
declare function getCanRestoreFocusedCell(options: FocusedCellRestoreOptions): boolean;
declare function getShouldCancelFocusedCellRestoreOnFrameSync(options?: FocusedCellRestoreFrameSyncOptions): boolean;
declare function getCanCancelCellEdit(editingCell: CellCoordinate | null | undefined): editingCell is CellCoordinate;
declare function getCanRunGridKeyboardShortcut(editingCell: CellCoordinate | null | undefined): boolean;
declare function getFocusedRowSelectionTarget<TData>(rows: Array<Row<TData>>, focusedCell: CellCoordinate | null | undefined): FocusedRowSelectionTarget<TData> | null;
declare function getCanToggleRowSelection(event: RowSelectionToggleEventLike): boolean;
declare function getCellEditText(value: unknown): string;
declare function getCellEditorTargetValue(target: unknown): unknown;
declare function getCellEditorEventValue(event: CellEditorValueEventLike): string;
declare function parseCellEditValue<TData>(grid: Grid<TData>, row: Row<TData>, column: Column<TData, unknown>, value: string): unknown;
declare function getCellEditValidationMessage(event: CellEditValidationEventLike | null | undefined): string | null;
declare function getDefaultClipboardTextEnvironment(): ClipboardTextEnvironment;
declare function getDefaultBrowserDownloadEnvironment(): BrowserDownloadEnvironment;
declare function writeClipboardText(text: string, environment?: ClipboardTextEnvironment): Promise<boolean>;
declare function readClipboardText(environment?: ClipboardTextEnvironment): Promise<string>;
declare function downloadBrowserExportFile(file: BrowserExportFileLike, environment?: BrowserDownloadEnvironment): boolean;
declare function getCellDisplayText(value: unknown): string;
declare function escapeGridHtml(value: string): string;
declare function getColumnHeaderText<TData>(column: Column<TData, unknown>): string;
declare function getCellFillHandleVisible<TData>(row: Row<TData>, column: Column<TData, unknown>, options: CellFillHandleVisibilityOptions): boolean;
declare function getCanStartCellPointerDrag(event: PointerButtonEventLike, editingCell: CellCoordinate | null | undefined): boolean;
declare function getCellEditorProps<TData>(column: Column<TData, unknown>, options?: CellEditorPrimitiveOptions): PrimitiveProps;
declare function getCellEditorOptionProps(option: CellEditorOptionPrimitiveOptions): PrimitiveProps;
declare function getCellEditorOptionText(option: CellEditorOptionPrimitiveOptions): string;
declare function getCellValidationMessageProps(): PrimitiveProps;
declare function isFocusableElement(target: unknown): target is FocusableElementLike;
declare function getEnabledHeaderActionMenuItems(menu: ParentNode | null): HeaderActionMenuItemFocusTargetLike[];
declare function getHeaderActionMenuActiveElement(menu: HeaderActionMenuActiveElementTargetLike | null | undefined, fallbackDocument?: HeaderActionMenuActiveElementDocumentLike | null | undefined): unknown | null;
declare function focusHeaderActionMenuItem(menu: HeaderActionMenuFocusTargetLike | null, position: HeaderActionMenuItemFocusPosition): boolean;
declare function isHeaderActionMenuFocusTarget(target: unknown): target is HeaderActionMenuFocusTargetLike;
declare function getHeaderActionMenuFocusTarget(event: HeaderActionMenuFocusTargetEventLike): HeaderActionMenuFocusTargetLike | null;
declare function focusElement(element: FocusableElementLike | null | undefined): boolean;
declare function focusCellEditorElement(element: FocusableSelectableElementLike | null | undefined): boolean;
declare function focusElementById(lookup: ElementIdLookupLike, id: string): boolean;
declare function focusHeaderActionMenuTrigger(element: FocusableElementLike | null | undefined): boolean;
declare function focusHeaderActionMenuTriggerById(lookup: ElementIdLookupLike, id: string): boolean;
declare function focusHeaderActionMenuItemById(lookup: ElementIdLookupLike<HeaderActionMenuFocusTargetLike>, id: string, position: HeaderActionMenuItemFocusPosition): boolean;
declare function focusFocusedCellInGrid(container: FocusedCellContainerLike | null | undefined): boolean;
declare function scrollElementToPosition(element: ScrollPositionElementLike | null | undefined, position: FocusedCellScrollPosition | null | undefined): boolean;
declare function getScrollFrameOptionsFromElement(element: ScrollFrameElementLike, options?: ScrollFrameElementOptions): ScrollFrameOptionsLike;
declare function getFocusedCellScrollOptionsFromElement<TData>(element: ScrollFrameElementLike, options: FocusedCellScrollElementOptions<TData>): FocusedCellScrollOptions<TData>;
declare function isGridInteractiveKeyboardTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean;
declare function isGridInteractiveKeyboardEventTarget(event: KeyboardTargetEventLike): boolean;
declare function getShouldPreventEventDefault(event: DefaultPreventedEventLike): boolean;
declare function preventDefaultAndStopPropagation(event: DefaultPreventablePropagationEventLike): void;
declare function preventEventDefault(event: DefaultPreventableEventLike): void;
declare function stopEventPropagation(event: PropagationEventLike): void;
interface ClickSuppressionController {
    suppress(): void;
    consume(event?: DefaultPreventablePropagationEventLike): boolean;
}
declare function createClickSuppressionController(): ClickSuppressionController;
declare function isPointerInsideElement(event: PointerClientCoordinateLike, element: PointerHitTestElementLike | null | undefined): boolean;
declare function hasPointerMovedPastDragThreshold(event: PointerClientCoordinateLike, start: PointerDragStartLike, threshold?: number): boolean;
declare function updatePointerDragDidMovePastThreshold(drag: PointerDragMovementLike, event: PointerClientCoordinateLike, threshold?: number): boolean;
declare function isPrimaryPointerButton(event: PointerButtonEventLike): boolean;
declare function isPrimaryPointerDragActive(event: PointerButtonsEventLike): boolean;
declare function getCanContinuePointerDrag<TDrag extends PointerDragSessionLike>(drag: TDrag | null | undefined, event: PointerButtonsEventLike & PointerIdEventLike): drag is TDrag;
declare function getCanEndPointerDrag<TDrag extends PointerDragSessionLike>(drag: TDrag | null | undefined, event: PointerIdEventLike): drag is TDrag;
declare function getHeaderDragEndAction<TColumn extends HeaderDragEndColumnLike>(drag: HeaderDragEndLike, options: HeaderDragEndActionOptions<TColumn>): HeaderDragEndAction | null;
declare function isHeaderDragGroupAction(action: HeaderDragEndAction | null | undefined): action is Extract<HeaderDragEndAction, {
    type: "group";
}>;
declare function isHeaderDragMoveAction(action: HeaderDragEndAction | null | undefined): action is Extract<HeaderDragEndAction, {
    type: "move";
}>;
declare function getMeasuredElementBlockSize(element: MeasuredBlockElementLike, fallbackSize: number): number;
declare function isMeasuredBlockElement(target: unknown): target is MeasuredBlockElementLike;
declare function isMeasuredBlockRectElement(target: unknown): target is MeasuredBlockRectElementLike;
declare function isMeasuredBlockRectElementTarget(target: unknown): target is MeasuredBlockRectElementTargetLike;
declare function isMeasuredInlineElement(target: unknown): target is MeasuredInlineElementLike;
declare function isMeasuredInlineDatasetElementTarget(target: unknown): target is MeasuredInlineDatasetElementTargetLike;
declare function getMeasuredElementBlockSizeFromTarget(target: unknown, fallbackSize: number): number;
declare function getMeasuredElementBlockSizeFromRect(element: MeasuredBlockRectElementLike): number;
declare function getMeasuredElementInlineSize(element: MeasuredInlineElementLike): number;
declare function getElementOffsetBlockSize(element: OffsetBlockElementLike | null | undefined, fallbackSize: number): number;
declare function getResizeObserverEntryBlockSize(entry: ResizeObserverBlockSizeEntryLike): number;
declare function getResizeObserverEntryInlineSize(entry: ResizeObserverInlineSizeEntryLike): number;
declare function isResizeObserverDatasetTarget(target: unknown): target is ResizeObserverDatasetTargetLike;
declare function getResizeObserverEntryDatasetId(entry: ResizeObserverDatasetEntryLike, key: ResizeObserverEntryDatasetKey): string | null;
declare function setElementDatasetId(element: DatasetElementLike, key: ResizeObserverEntryDatasetKey, value: string): void;
declare function createResizeObserver(callback: ResizeObserverCallback, ResizeObserverConstructor?: ResizeObserverConstructorLike | undefined): ResizeObserver | null;
declare function observeElements(observer: ResizeObserverObserveLike, elements: Iterable<Element>): void;
declare function disconnectResizeObserver(observer: ResizeObserverDisconnectLike | null | undefined): void;
declare function removeObservedElement<TElement extends Element>(observer: ResizeObserverUnobserveLike | null | undefined, elements: ObservedElementMapLike<TElement>, id: string): void;
declare function replaceObservedElement<TElement extends Element>(observer: (ResizeObserverObserveLike & ResizeObserverUnobserveLike) | null | undefined, elements: ObservedElementMapLike<TElement>, id: string, element: TElement): void;
declare function applyResizeObserverMeasuredSizes(entries: readonly ResizeObserverEntry[], options: {
    cache: MeasuredSizeCacheLike;
    datasetKey: ResizeObserverEntryDatasetKey;
    getSize: (entry: ResizeObserverEntry) => number;
}): boolean;
declare function getSizeOffset(index: number, getSize: (index: number) => number): number;
declare function getColumnLayoutTotalWidth(layout: readonly ColumnLayoutTotalWidthItemLike[]): number;
declare function getColumnLayoutById(layout: readonly ColumnLayout[]): ReadonlyMap<ColumnId, ColumnLayout>;
declare function getColumnById<TColumn extends ColumnIdItemLike>(columnId: ColumnId, columns: readonly TColumn[]): TColumn | undefined;
declare function getColumnIndexById<TColumn extends ColumnIdItemLike>(columnId: ColumnId, columns: readonly TColumn[]): number;
declare function getRowById<TRow extends RowIdItemLike>(rowId: string, rows: readonly TRow[]): TRow | undefined;
type ColumnMoveDirection = "left" | "right";
interface ColumnMoveGrid<TData> {
    getVisibleLeafColumns: Grid<TData>["getVisibleLeafColumns"];
    moveColumn: Grid<TData>["moveColumn"];
}
interface GroupingColumnMoveGrid<TData> {
    moveGroupingColumn: Grid<TData>["moveGroupingColumn"];
}
declare function moveVisibleColumn<TData>(grid: ColumnMoveGrid<TData>, columnId: ColumnId, direction: ColumnMoveDirection): boolean;
declare function moveColumnToTarget<TData>(grid: ColumnMoveGrid<TData>, sourceColumnId: ColumnId, targetColumnId: ColumnId): boolean;
declare function moveGroupedColumn<TData>(grid: GroupingColumnMoveGrid<TData>, groupingColumns: readonly Column<TData, unknown>[], columnId: ColumnId, direction: ColumnMoveDirection): boolean;
declare function resolveRowVirtualizationOptions(rowVirtualization: boolean | RowVirtualizationPrimitiveOptions | null | undefined): ResolvedRowVirtualizationOptions;
declare function resolveColumnVirtualizationOptions(columnVirtualization: boolean | ColumnVirtualizationPrimitiveOptions | null | undefined): ResolvedColumnVirtualizationOptions;
declare function getScrollForFocusedCell<TData>(options: FocusedCellScrollOptions<TData>): FocusedCellScrollPosition | null;
declare function getVirtualRowStyle(virtualItem: VirtualRowStyleItemLike | null | undefined): VirtualRowStyleProps | undefined;
declare function getVirtualRowStyleText(virtualItem: VirtualRowStyleItemLike | null | undefined): string | undefined;
declare function getVirtualBodyStyle(virtualRange: VirtualBodyStyleRangeLike | null | undefined): VirtualBodyStyleProps | undefined;
declare function getVirtualBodyStyleText(virtualRange: VirtualBodyStyleRangeLike | null | undefined): string | undefined;
declare function getInlineSizeStyle(size: number): InlineSizeStyleProps;
declare function getInlineSizeStyleText(size: number): string;
declare function getVirtualizedInlineSizeStyle(size: number, enabled: boolean): VirtualizedInlineSizeStyleProps | undefined;
declare function getVirtualizedInlineSizeStyleText(size: number, enabled: boolean): string | undefined;
declare function getPinnedColumnOffsetStyle(layout: PinnedColumnOffsetStyleLayoutLike | null | undefined): PinnedColumnOffsetStyleProps | undefined;
declare function getPinnedColumnOffsetStyleText(layout: PinnedColumnOffsetStyleLayoutLike | null | undefined): string | undefined;
declare function isCellCoordinateEqual(left: CellCoordinate | null | undefined, right: CellCoordinate | null | undefined): boolean;
declare function isFocusedCell(focusedCell: CellCoordinate | null, rowId: string, columnId: string): boolean;

export { type BrowserDownloadAnchorLike, type BrowserDownloadBlobConstructorLike, type BrowserDownloadDocumentLike, type BrowserDownloadEnvironment, type BrowserDownloadParentLike, type BrowserDownloadUrlLike, type BrowserExportFileLike, type CellEditValidationEventLike, type CellEditorKeyboardAction, type CellEditorOptionPrimitiveOptions, type CellEditorPrimitiveOptions, type CellEditorValueEventLike, type CellEditorValueTargetLike, type CellFillHandleVisibilityOptions, type CellLayoutPrimitiveOptions, type CellPrimitiveOptions, type CheckboxIndeterminateTargetLike, type ClickSuppressionController, type ClipboardTextAreaLike, type ClipboardTextDocumentLike, type ClipboardTextEnvironment, type ClipboardTextNavigatorLike, type ClipboardTextParentLike, type ColumnFilterCellPrimitiveOptions, type ColumnFilterInputPrimitiveOptions, type ColumnIdItemLike, type ColumnLayoutTotalWidthItemLike, type ColumnMoveDirection, type ColumnMoveGrid, type ColumnPinningButtonPrimitiveOptions, type ColumnResizeDefaultPreventableEventLike, type ColumnResizeFinalSizeEventLike, type ColumnResizeHandlePrimitiveOptions, type ColumnResizeKeyboardEventLike, type ColumnResizeKeyboardSizeOptions, type ColumnResizePointerEventLike, type ColumnVirtualizationPrimitiveOptions, type ColumnVisibilityCheckboxPrimitiveOptions, DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS, type DatasetElementLike, type DefaultPreventableEventLike, type DefaultPreventablePropagationEventLike, type DefaultPreventedEventLike, type ElementIdLookupLike, type FocusableElementLike, type FocusableSelectableElementLike, type FocusedCellContainerLike, type FocusedCellRestoreFrameSyncOptions, type FocusedCellRestoreOptions, type FocusedCellScrollElementOptions, type FocusedCellScrollOptions, type FocusedCellScrollPosition, type FocusedRowSelectionTarget, GRID_DENSITIES, GRID_FOCUSED_CELL_SELECTOR, GRID_INTERACTIVE_KEYBOARD_TARGET_SELECTOR, GRID_PREFERENCES_VERSION, GROUPING_PANEL_EMPTY_MESSAGE, type GridBodyPrimitiveOptions, type GridDensity, type GridEmptyCellPrimitiveOptions, type GridEmptyRowPrimitiveOptions, type GridHeaderRowPrimitiveOptions, type GridKeyboardEditAction, type GridKeyboardFocusMove, type GridKeyboardShortcutAction, type GridKeyboardShortcutEventLike, type GridPreferences, type GridPreferencesOptions, type GridPreferencesState, type GridPreferencesStorageEnvironmentLike, type GridPreferencesStorageLike, type GridRowCoordinateOptions, type GroupCellIndentOptions, type GroupCellIndentStyleProps, type GroupRowLabelOptions, type GroupingColumnMoveGrid, type GroupingPanelMoveButtonPrimitiveOptions, type GroupingPanelPrimitiveOptions, HEADER_ACTION_MENU_ENABLED_ITEM_SELECTOR, HEADER_ACTION_MENU_TRIGGER_TEXT, type HeaderActionMenuActiveElementDocumentLike, type HeaderActionMenuActiveElementTargetLike, type HeaderActionMenuDefaultItemDescriptor, type HeaderActionMenuDefaultItemDescriptorOptions, type HeaderActionMenuDefaultItemId, type HeaderActionMenuDefaultItemLabelOptions, type HeaderActionMenuFocusTargetEventLike, type HeaderActionMenuFocusTargetLike, type HeaderActionMenuItemFocusPosition, type HeaderActionMenuItemFocusTargetLike, type HeaderActionMenuItemPrimitiveOptions, type HeaderActionMenuKeyboardAction, type HeaderActionMenuLabelPrimitiveOptions, type HeaderActionMenuPrimitiveCustomItem, type HeaderActionMenuPrimitiveItem, type HeaderActionMenuPrimitiveLabelItem, type HeaderActionMenuPrimitiveSeparatorItem, type HeaderActionMenuTriggerPrimitiveOptions, type HeaderButtonPrimitiveOptions, type HeaderCellLayoutPrimitiveOptions, type HeaderCellPrimitiveOptions, type HeaderDragEndAction, type HeaderDragEndActionOptions, type HeaderDragEndColumnLike, type HeaderDragEndLike, type HeaderKeyboardMoveEventLike, type HeaderSortIndicatorTextOptions, type InlineSizeStyleProps, type KeyboardTargetEventLike, type MeasuredBlockElementLike, type MeasuredBlockRectElementLike, type MeasuredBlockRectElementTargetLike, type MeasuredInlineDatasetElementTargetLike, type MeasuredInlineElementLike, type MeasuredSizeCacheLike, type ObservedElementMapLike, type OffsetBlockElementLike, type PaginationAction, type PaginationButtonPrimitiveOptions, type PinnedColumnOffsetStyleLayoutLike, type PinnedColumnOffsetStyleProps, type PointerButtonEventLike, type PointerButtonsEventLike, type PointerCaptureEventLike, type PointerCaptureTargetLike, type PointerClientCoordinateLike, type PointerDragMovementLike, type PointerDragSessionLike, type PointerDragStartLike, type PointerHitTestElementLike, type PointerIdEventLike, type PointerListener, type PointerMoveUpCancelListenerTargetLike, type PointerMoveUpCancelListeners, type PointerMoveUpListenerTargetLike, type PointerMoveUpListeners, type PointerUpCancelListenerTargetLike, type PointerUpCancelListeners, type PrimitiveProps, type PropagationEventLike, type QuickFilterInputPrimitiveOptions, type ResizeObserverBlockSizeEntryLike, type ResizeObserverConstructorLike, type ResizeObserverDatasetEntryLike, type ResizeObserverDatasetTargetLike, type ResizeObserverDisconnectLike, type ResizeObserverEntryDatasetKey, type ResizeObserverInlineSizeEntryLike, type ResizeObserverObserveLike, type ResizeObserverUnobserveLike, type ResolvedColumnVirtualizationOptions, type ResolvedRowVirtualizationOptions, type RowExpansionTogglePrimitiveOptions, type RowIdItemLike, type RowLayoutPrimitiveOptions, type RowPrimitiveOptions, type RowSelectionCheckboxPrimitiveOptions, type RowSelectionToggleEventLike, type RowVirtualizationPrimitiveOptions, type ScrollFrameElementLike, type ScrollFrameElementOptions, type ScrollFrameOptionsLike, type ScrollListener, type ScrollListenerTargetLike, type ScrollPositionElementLike, type VirtualBodyStyleProps, type VirtualBodyStyleRangeLike, type VirtualRowStyleItemLike, type VirtualRowStyleProps, type VirtualizedInlineSizeStyleProps, addPassiveScrollListener, addPointerMoveUpCancelListeners, addPointerMoveUpListeners, addPointerUpCancelListeners, applyResizeObserverMeasuredSizes, createClickSuppressionController, createGridPreferences, createResizeObserver, disconnectResizeObserver, downloadBrowserExportFile, escapeGridHtml, focusCellEditorElement, focusElement, focusElementById, focusFocusedCellInGrid, focusHeaderActionMenuItem, focusHeaderActionMenuItemById, focusHeaderActionMenuTrigger, focusHeaderActionMenuTriggerById, getBrowserGridPreferencesStorage, getCanApplyColumnResize, getCanCancelCellEdit, getCanContinuePointerDrag, getCanEndPointerDrag, getCanRestoreFocusedCell, getCanRunGridKeyboardShortcut, getCanStartCellEdit, getCanStartCellPointerDrag, getCanStartColumnResize, getCanStartFocusedCellEdit, getCanToggleRowSelection, getCellDisplayText, getCellEditText, getCellEditValidationMessage, getCellEditorEventValue, getCellEditorKeyboardAction, getCellEditorOptionProps, getCellEditorOptionText, getCellEditorProps, getCellEditorTargetValue, getCellFillHandleProps, getCellFillHandleVisible, getCellLayoutProps, getCellProps, getCellValidationMessageProps, getColumnById, getColumnFilterCellProps, getColumnFilterInputProps, getColumnFilterText, getColumnHeaderText, getColumnIndexById, getColumnLayoutById, getColumnLayoutTotalWidth, getColumnPinningButtonProps, getColumnPinningButtonText, getColumnPinningControlsProps, getColumnResizeFinalSize, getColumnResizeHandleProps, getColumnResizeKeyboardSize, getColumnResizePointerSize, getColumnResizeStartSize, getColumnSpacerProps, getColumnVisibilityCheckboxProps, getColumnVisibilityControlsProps, getColumnVisibilityEmptyText, getColumnVisibilityListProps, getColumnVisibilityResetButtonProps, getColumnVisibilityResetButtonText, getColumnVisibilitySearchInputProps, getColumnVisibilityStatusProps, getColumnVisibilityStatusText, getColumnVisibilitySummaryProps, getColumnVisibilitySummaryText, getDefaultBrowserDownloadEnvironment, getDefaultClipboardTextEnvironment, getDefaultPointerMoveUpCancelListenerTarget, getDefaultPointerMoveUpListenerTarget, getDefaultPointerUpCancelListenerTarget, getDensityButtonProps, getDensityButtonText, getDensityControlsProps, getElementOffsetBlockSize, getEnabledHeaderActionMenuItems, getFilteredColumnVisibilityColumns, getFocusedCellScrollOptionsFromElement, getFocusedRowSelectionTarget, getGridBodyProps, getGridBodyRowIndexOffset, getGridDensityProps, getGridDensityRowHeight, getGridEmptyCellProps, getGridEmptyRowProps, getGridErrorOverlayProps, getGridErrorRetryButtonProps, getGridErrorRetryButtonText, getGridErrorText, getGridHeaderProps, getGridHeaderRowCount, getGridHeaderRowProps, getGridKeyboardEditAction, getGridKeyboardFocusMove, getGridKeyboardShortcutAction, getGridLoadingOverlayProps, getGridLoadingText, getGridProps, getGroupCellIndent, getGroupCellIndentStyle, getGroupCellIndentStyleText, getGroupRowCountText, getGroupRowLabel, getGroupValueText, getGroupingPanelChipProps, getGroupingPanelMoveButtonProps, getGroupingPanelPlaceholderProps, getGroupingPanelProps, getGroupingPanelRemoveButtonProps, getHeaderActionMenuActiveElement, getHeaderActionMenuCustomItemProps, getHeaderActionMenuCustomItemUserProps, getHeaderActionMenuDefaultItemDescriptors, getHeaderActionMenuDefaultItemLabel, getHeaderActionMenuFocusTarget, getHeaderActionMenuId, getHeaderActionMenuItemProps, getHeaderActionMenuKeyboardAction, getHeaderActionMenuLabelProps, getHeaderActionMenuProps, getHeaderActionMenuSeparatorProps, getHeaderActionMenuTriggerFocusPosition, getHeaderActionMenuTriggerId, getHeaderActionMenuTriggerProps, getHeaderButtonProps, getHeaderCellLayoutProps, getHeaderCellProps, getHeaderDragEndAction, getHeaderKeyboardMoveDirection, getHeaderPlaceholderCellProps, getHeaderSortIndicatorProps, getHeaderSortIndicatorText, getInlineSizeStyle, getInlineSizeStyleText, getIsGroupLabelCell, getMeasuredElementBlockSize, getMeasuredElementBlockSizeFromRect, getMeasuredElementBlockSizeFromTarget, getMeasuredElementInlineSize, getNextColumnFilters, getPaginationButtonProps, getPaginationButtonText, getPaginationPageSizeOptionText, getPaginationPageSizeOptions, getPaginationPageSizeSelectProps, getPaginationPageText, getPaginationProps, getPaginationStatusProps, getPinnedColumnOffsetStyle, getPinnedColumnOffsetStyleText, getPointerCaptureTarget, getQuickFilterClearButtonProps, getQuickFilterClearButtonText, getQuickFilterInputProps, getQuickFilterProps, getResizeObserverEntryBlockSize, getResizeObserverEntryDatasetId, getResizeObserverEntryInlineSize, getRowById, getRowExpansionSpacerProps, getRowExpansionToggleProps, getRowExpansionToggleText, getRowLayoutProps, getRowProps, getRowSelectionCheckboxProps, getRowSelectionCheckboxText, getRowSelectionClearButtonProps, getRowSelectionClearButtonText, getRowSelectionControlsProps, getRowSelectionStatusProps, getRowSelectionStatusText, getScrollForFocusedCell, getScrollFrameOptionsFromElement, getShouldCancelFocusedCellRestoreOnFrameSync, getShouldPreventEventDefault, getSizeOffset, getVirtualBodyStyle, getVirtualBodyStyleText, getVirtualRowStyle, getVirtualRowStyleText, getVirtualizedInlineSizeStyle, getVirtualizedInlineSizeStyleText, hasPointerMovedPastDragThreshold, isCellCoordinateEqual, isFocusableElement, isFocusedCell, isGridInteractiveKeyboardEventTarget, isGridInteractiveKeyboardTarget, isHeaderActionMenuActionItem, isHeaderActionMenuCloseAction, isHeaderActionMenuCustomItem, isHeaderActionMenuFocusAction, isHeaderActionMenuFocusTarget, isHeaderActionMenuItem, isHeaderActionMenuLabelItem, isHeaderActionMenuSeparatorItem, isHeaderActionMenuTabCloseAction, isHeaderDragGroupAction, isHeaderDragMoveAction, isMeasuredBlockElement, isMeasuredBlockRectElement, isMeasuredBlockRectElementTarget, isMeasuredInlineDatasetElementTarget, isMeasuredInlineElement, isPointerCaptureTarget, isPointerInsideElement, isPrimaryPointerButton, isPrimaryPointerDragActive, isResizeObserverDatasetTarget, moveColumnToTarget, moveGroupedColumn, moveVisibleColumn, normalizeGridDensity, observeElements, parseCellEditValue, parseGridPreferences, preventDefaultAndStopPropagation, preventEventDefault, readClipboardText, readGridPreferences, removeGridPreferences, removeObservedElement, replaceObservedElement, resolveColumnVirtualizationOptions, resolveRowVirtualizationOptions, scrollElementToPosition, serializeGridPreferences, setCheckboxIndeterminate, setElementDatasetId, stopEventPropagation, tryReleasePointerCapture, trySetPointerCapture, updatePointerDragDidMovePastThreshold, writeClipboardText, writeGridPreferences };
