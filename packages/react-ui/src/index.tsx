import type {
  CellContext,
  CellCoordinate,
  CellEditEvent,
  CellFillOptions,
  ClipboardPasteOptions,
  ClipboardPasteResult,
  Column,
  ColumnDef,
  ColumnLayout,
  ExportFile,
  Grid,
  GridOptions,
  Header,
  HeaderContext,
  HeaderGroup,
  Row,
} from "@open-grid/core";
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
  getCellEditorProps,
  getCellEditorEventValue,
  getCellEditorKeyboardAction,
  getCellEditorOptionProps,
  getCellEditorOptionText,
  getCellProps,
  getCellDisplayText,
  getCellEditText,
  getCellEditValidationMessage,
  getCellFillHandleProps,
  getCellFillHandleVisible,
  getCellLayoutProps,
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
  getCanStartCellEdit,
  getCanStartFocusedCellEdit,
  getCanToggleRowSelection,
  downloadBrowserExportFile,
  getColumnById,
  getColumnFilterCellProps,
  getColumnFilterInputProps,
  getColumnFilterText,
  getColumnIndexById,
  getColumnLayoutById,
  getColumnLayoutTotalWidth,
  getColumnHeaderText,
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
  getColumnPinningButtonProps,
  getColumnPinningButtonText,
  getColumnPinningControlsProps,
  getColumnResizeFinalSize,
  getColumnResizeHandleProps,
  getColumnResizeKeyboardSize,
  getColumnResizePointerSize,
  getColumnResizeStartSize,
  getColumnSpacerProps,
  getElementOffsetBlockSize,
  getGridBodyProps,
  getGridBodyRowIndexOffset,
  getGridEmptyCellProps,
  getGridEmptyRowProps,
  getGridErrorOverlayProps,
  getGridErrorRetryButtonProps,
  getGridErrorRetryButtonText,
  getGridErrorText,
  getFocusedRowSelectionTarget,
  getGridHeaderProps,
  getGridHeaderRowProps,
  getGridKeyboardEditAction,
  getGridKeyboardFocusMove,
  getGridKeyboardShortcutAction,
  getGridLoadingOverlayProps,
  getGridLoadingText,
  getGridProps,
  getGridDensityProps,
  getGridDensityRowHeight,
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
  getGroupCellIndentStyle,
  getGroupRowCountText,
  getGroupRowLabel,
  getGroupingPanelChipProps,
  getGroupingPanelMoveButtonProps,
  getGroupingPanelPlaceholderProps,
  getGroupingPanelProps,
  getGroupingPanelRemoveButtonProps,
  getHeaderActionMenuDefaultItemDescriptors,
  getHeaderActionMenuFocusTarget,
  getHeaderActionMenuId,
  getHeaderActionMenuTriggerId,
  getHeaderActionMenuCustomItemProps,
  getHeaderActionMenuItemProps,
  getHeaderActionMenuKeyboardAction,
  getHeaderActionMenuLabelProps,
  getHeaderActionMenuProps,
  getHeaderActionMenuSeparatorProps,
  getHeaderActionMenuTriggerProps,
  getHeaderActionMenuTriggerFocusPosition,
  getHeaderButtonProps,
  getHeaderCellLayoutProps,
  getHeaderCellProps,
  getHeaderDragEndAction,
  getHeaderKeyboardMoveDirection,
  getHeaderPlaceholderCellProps,
  getHeaderSortIndicatorProps,
  getHeaderSortIndicatorText,
  getFocusedCellScrollOptionsFromElement,
  getInlineSizeStyle,
  getPinnedColumnOffsetStyle,
  getPointerCaptureTarget,
  getScrollForFocusedCell,
  getScrollFrameOptionsFromElement,
  getShouldPreventEventDefault,
  getVirtualBodyStyle,
  getVirtualizedInlineSizeStyle,
  getVirtualRowStyle,
  preventDefaultAndStopPropagation,
  preventEventDefault,
  stopEventPropagation,
  isCellCoordinateEqual,
  isPrimaryPointerButton,
  getIsGroupLabelCell,
  isHeaderActionMenuActionItem,
  isHeaderActionMenuCloseAction,
  isHeaderActionMenuCustomItem,
  isHeaderActionMenuFocusAction,
  isHeaderActionMenuItem,
  isHeaderActionMenuLabelItem,
  isHeaderActionMenuSeparatorItem,
  isHeaderActionMenuTabCloseAction,
  isHeaderDragGroupAction,
  isHeaderDragMoveAction,
  focusHeaderActionMenuItem,
  focusHeaderActionMenuTrigger,
  resolveColumnVirtualizationOptions,
  resolveRowVirtualizationOptions,
  getRowExpansionSpacerProps,
  getRowExpansionToggleProps,
  getRowExpansionToggleText,
  getRowLayoutProps,
  getRowProps,
  getResizeObserverEntryBlockSize,
  getResizeObserverEntryInlineSize,
  getMeasuredElementBlockSize,
  getMeasuredElementBlockSizeFromRect,
  getMeasuredElementInlineSize,
  isGridInteractiveKeyboardEventTarget,
  isFocusedCell,
  moveColumnToTarget,
  moveGroupedColumn,
  moveVisibleColumn,
  observeElements,
  parseCellEditValue,
  readClipboardText,
  removeObservedElement,
  replaceObservedElement,
  scrollElementToPosition,
  setCheckboxIndeterminate,
  tryReleasePointerCapture,
  trySetPointerCapture,
  updatePointerDragDidMovePastThreshold,
  type ColumnVirtualizationPrimitiveOptions,
  GRID_DENSITIES,
  type GridDensity,
  type GridLocalization,
  type GridLocalizationOverrides,
  type RowVirtualizationPrimitiveOptions,
  writeClipboardText,
} from "@open-grid/primitives";
import { useGrid } from "@open-grid/react";
import {
  createMeasuredSizeCache,
  createMeasuredSizeResolver,
  getColumnCellRenderItems,
  getColumnLayoutMeasurementSignature,
  getColumnRenderItems,
  getHeaderRenderItemKey,
  getHeaderRenderItems,
  getInitialScrollFrame,
  getIsFocusedCellInRenderWindow,
  getMeasuredColumnLayoutFromCache,
  getScrollFrame,
  getSizedColumnLayout,
  getVirtualRowRange,
  getVirtualRowItems,
  isHeaderRenderSpacerItem,
  syncMeasuredColumnLayoutCache,
  type VirtualItem,
} from "@open-grid/virtual";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, Ref } from "react";

export type RowVirtualizationOptions = RowVirtualizationPrimitiveOptions;

export type ColumnVirtualizationOptions = ColumnVirtualizationPrimitiveOptions;

const GridLocalizationContext = createContext<GridLocalization>(createGridLocalization());

export interface HeaderActionMenuActionItem<TData> {
  type?: "action";
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: (context: HeaderActionMenuContext<TData>) => void;
}

export interface HeaderActionMenuLabelItem {
  type: "label";
  id: string;
  label: string;
}

export interface HeaderActionMenuSeparatorItem {
  type: "separator";
  id: string;
  label?: string;
}

export interface HeaderActionMenuCustomItem<TData> {
  type: "custom";
  id: string;
  label?: string;
  render: (context: HeaderActionMenuContext<TData>) => ReactNode;
}

export type HeaderActionMenuItem<TData> =
  | HeaderActionMenuActionItem<TData>
  | HeaderActionMenuLabelItem
  | HeaderActionMenuSeparatorItem
  | HeaderActionMenuCustomItem<TData>;

export interface HeaderActionMenuContext<TData> {
  grid: Grid<TData>;
  column: Column<TData, unknown>;
  sortDirection: "asc" | "desc" | false;
  pinningPosition: "left" | "right" | false;
  isGrouped: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  defaultItems: Array<HeaderActionMenuActionItem<TData>>;
}

export type HeaderActionMenuItems<TData> = (context: HeaderActionMenuContext<TData>) => Array<HeaderActionMenuItem<TData> | null | false | undefined>;

export type GridReadyHandler<TData> = (grid: Grid<TData>) => void | (() => void);

export interface DataGridProps<TData> extends GridOptions<TData> {
  ariaLabel?: string;
  localization?: GridLocalizationOverrides;
  className?: string;
  style?: CSSProperties;
  emptyState?: ReactNode;
  error?: boolean;
  errorState?: ReactNode;
  onRetry?: () => void;
  loading?: boolean;
  loadingState?: ReactNode;
  onGridReady?: GridReadyHandler<TData>;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getHeaderClassName?: (context: HeaderContext<TData, unknown>) => string | undefined;
  getCellClassName?: (context: CellContext<TData, unknown>) => string | undefined;
  groupingPanel?: boolean;
  quickFilterControl?: boolean;
  rowSelectionControls?: boolean;
  columnVisibilityControls?: boolean;
  density?: GridDensity;
  defaultDensity?: GridDensity;
  densityControl?: boolean;
  onDensityChange?: (density: GridDensity) => void;
  columnFilterControls?: boolean;
  paginationControls?: boolean;
  pageSizeOptions?: readonly number[];
  columnPinningControls?: boolean;
  headerActionMenu?: boolean;
  headerActionMenuItems?: HeaderActionMenuItems<TData>;
  rowVirtualization?: boolean | RowVirtualizationOptions;
  columnVirtualization?: boolean | ColumnVirtualizationOptions;
  cellFillOptions?: Omit<CellFillOptions, "sourceEvent">;
  clipboardPasteOptions?: Omit<ClipboardPasteOptions, "sourceEvent">;
  onClipboardPaste?: (result: ClipboardPasteResult<TData>) => void;
}

export function DataGrid<TData>(props: DataGridProps<TData>) {
  const {
    ariaLabel: ariaLabelProp,
    localization: localizationOverrides,
    className,
    style,
    emptyState: emptyStateProp,
    error = false,
    errorState: errorStateProp,
    onRetry,
    loading = false,
    loadingState: loadingStateProp,
    onGridReady,
    getRowClassName,
    getHeaderClassName,
    getCellClassName,
    groupingPanel = false,
    quickFilterControl = false,
    rowSelectionControls = false,
    columnVisibilityControls = false,
    density,
    defaultDensity,
    densityControl = false,
    onDensityChange,
    columnFilterControls = false,
    paginationControls = false,
    pageSizeOptions,
    columnPinningControls = false,
    headerActionMenu = false,
    headerActionMenuItems,
    rowVirtualization,
    columnVirtualization,
    cellFillOptions,
    clipboardPasteOptions,
    onClipboardPaste,
    ...gridOptions
  } = props;
  const localization = useMemo(() => createGridLocalization(localizationOverrides), [localizationOverrides]);
  const ariaLabel = ariaLabelProp ?? localization.dataGridLabel;
  const emptyState = emptyStateProp ?? localization.noRows;
  const errorState = errorStateProp ?? getGridErrorText(localization);
  const loadingState = loadingStateProp ?? getGridLoadingText(localization);
  const grid = useGrid(gridOptions);
  const onGridReadyRef = useRef(onGridReady);
  onGridReadyRef.current = onGridReady;
  useEffect(() => onGridReadyRef.current?.(grid), [grid]);
  const rows = grid.getRowModel().rows;
  const allColumns = grid.getAllLeafColumns();
  const columns = grid.getVisibleLeafColumns();
  const layout = grid.getColumnLayout();
  const resolvedPageSizeOptions = getPaginationPageSizeOptions(pageSizeOptions, grid.getState().pagination.pageSize);
  const headerGroups = grid.getHeaderGroups();
  const additionalHeaderRowCount = columnFilterControls ? 1 : 0;
  const bodyRowIndexOffset = getGridBodyRowIndexOffset(grid, { additionalHeaderRowCount });
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const columnSizeSignature = columns.map((column) => `${column.id}:${column.getSize()}`).join("|");
  const columnSizingStateSignature = Object.entries(grid.getState().columnSizing)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([columnId, size]) => `${columnId}:${size}`)
    .join("|");
  const columnIndexById = new Map(columns.map((column, index) => [column.id, index]));
  const focusedCell = grid.getState().focusedCell;
  const editingCell = grid.getState().editingCell;
  const selectedCellCoordinates = grid.getSelectedCellCoordinates();
  const fillHandleCoordinate = selectedCellCoordinates[selectedCellCoordinates.length - 1] ?? null;
  const groupingState = grid.getState().grouping;
  const groupingColumns = groupingState.flatMap((columnId) => {
    const column = getColumnById(columnId, grid.getAllLeafColumns());
    return column ? [column] : [];
  });
  const allPageRowsSelected = rowSelectionControls ? grid.getIsAllPageRowsSelected() : false;
  const somePageRowsSelected = rowSelectionControls ? grid.getIsSomePageRowsSelected() : false;
  const selectedRowCount = rowSelectionControls ? grid.getSelectedRowModel().rows.length : 0;
  const [columnVisibilityQuery, setColumnVisibilityQuery] = useState("");
  const densitySizingEnabled = densityControl || density !== undefined || defaultDensity !== undefined;
  const [uncontrolledDensity, setUncontrolledDensity] = useState<GridDensity>(defaultDensity ?? "standard");
  const resolvedDensity = density ?? uncontrolledDensity;
  const filteredVisibilityColumns = getFilteredColumnVisibilityColumns(allColumns, columnVisibilityQuery);
  const focusedCellRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreFocusedCellRef = useRef(false);
  const rangeDragRef = useRef<{ anchor: CellCoordinate; pointerId: number; didDrag: boolean } | null>(null);
  const fillDragRef = useRef<{ pointerId: number; target: CellCoordinate } | null>(null);
  const headerDragRef = useRef<{
    sourceColumnId: string;
    targetColumnId: string;
    pointerId: number;
    startX: number;
    startY: number;
    didDrag: boolean;
  } | null>(null);
  const cellClickSuppression = useMemo(() => createClickSuppressionController(), []);
  const headerClickSuppression = useMemo(() => createClickSuppressionController(), []);
  const focusScrollInProgressRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const groupingPanelRef = useRef<HTMLDivElement | null>(null);
  const rowResizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedRowElementsRef = useRef(new Map<string, HTMLElement>());
  const rowSizeCache = useMemo(() => createMeasuredSizeCache(), []);
  const [rowSizeVersion, setRowSizeVersion] = useState(rowSizeCache.version);
  const columnResizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedColumnElementsRef = useRef(new Map<string, HTMLElement>());
  const columnSizeCache = useMemo(() => createMeasuredSizeCache(), []);
  const [columnSizeVersion, setColumnSizeVersion] = useState(columnSizeCache.version);
  const rowVirtualOptions = resolveRowVirtualizationOptions(rowVirtualization);
  const measureVirtualRows = rowVirtualOptions.enabled && rowVirtualOptions.measureRowHeight;
  const columnVirtualOptions = resolveColumnVirtualizationOptions(columnVirtualization);
  const measureVirtualColumns = columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth;
  const sizedLayout = useMemo(
    () =>
      getSizedColumnLayout(layout, {
        getColumnSize: (columnId) => grid.getColumnSize(columnId),
        getFallbackSize: (columnId) => columnById.get(columnId)?.getSize(),
      }),
    [columnSizeSignature, columnSizingStateSignature, layout],
  );
  const coreLayoutSignature = getColumnLayoutMeasurementSignature(sizedLayout);
  const measuredCoreLayoutSignatureRef = useRef(coreLayoutSignature);
  const canUseMeasuredColumnSizes = measuredCoreLayoutSignatureRef.current === coreLayoutSignature;
  const measuredLayout = useMemo(
    () =>
      getMeasuredColumnLayoutFromCache(sizedLayout, {
        cache: columnSizeCache,
        enabled: measureVirtualColumns && canUseMeasuredColumnSizes,
      }),
    [canUseMeasuredColumnSizes, columnSizeCache, columnSizeVersion, measureVirtualColumns, sizedLayout],
  );
  const measuredLayoutById = getColumnLayoutById(measuredLayout);
  const totalMeasuredWidth = getColumnLayoutTotalWidth(measuredLayout);
  const measuredLayoutSignature = measuredLayout
    .map((item) => `${item.id}:${item.start}:${item.end}:${item.pinned}:${item.pinnedStart ?? ""}:${item.pinnedEdge ?? ""}`)
    .join("|");
  const rowSignature = `${rows.length}:${rows[0]?.id ?? ""}:${rows.at(-1)?.id ?? ""}`;
  const [scrollFrame, setScrollFrame] = useState(getInitialScrollFrame);
  const resolvedRowEstimate = densitySizingEnabled
    ? getGridDensityRowHeight(resolvedDensity)
    : rowVirtualOptions.estimateRowHeight;

  const rowSizeResolver = useMemo(
    () =>
      measureVirtualRows
        ? createMeasuredSizeResolver(rowSizeCache, (index) => rows[index]?.id ?? index, resolvedRowEstimate)
        : () => resolvedRowEstimate,
    [measureVirtualRows, resolvedRowEstimate, rowSizeCache, rows],
  );
  const rowRangeEstimate = measureVirtualRows ? rowSizeResolver : resolvedRowEstimate;

  useLayoutEffect(() => {
    if (rowSizeCache.clear()) {
      setRowSizeVersion(rowSizeCache.version);
    }
  }, [densitySizingEnabled, resolvedDensity, rowSizeCache]);

  useEffect(() => {
    if (!measureVirtualRows) {
      return;
    }

    if (rowSizeCache.prune(rows.map((row) => row.id))) {
      setRowSizeVersion(rowSizeCache.version);
    }
  }, [measureVirtualRows, rowSizeCache, rows]);

  useLayoutEffect(() => {
    if (!measureVirtualRows) {
      return;
    }

    const observer = createResizeObserver((entries) => {
      if (
        applyResizeObserverMeasuredSizes(entries, {
          cache: rowSizeCache,
          datasetKey: "rowId",
          getSize: getResizeObserverEntryBlockSize,
        })
      ) {
        setRowSizeVersion(rowSizeCache.version);
      }
    });

    if (!observer) {
      return;
    }

    rowResizeObserverRef.current = observer;

    observeElements(observer, observedRowElementsRef.current.values());

    return () => {
      disconnectResizeObserver(observer);
      rowResizeObserverRef.current = null;
    };
  }, [measureVirtualRows, rowSizeCache]);

  const measureVirtualRow = useCallback(
    (rowId: string, element: HTMLDivElement | null) => {
      const previous = observedRowElementsRef.current.get(rowId);

      if (previous && previous !== element) {
        removeObservedElement(rowResizeObserverRef.current, observedRowElementsRef.current, rowId);
      }

      if (!element || !measureVirtualRows) {
        return;
      }

      replaceObservedElement(rowResizeObserverRef.current, observedRowElementsRef.current, rowId, element);

      if (rowSizeCache.set(rowId, getMeasuredElementBlockSizeFromRect(element))) {
        setRowSizeVersion(rowSizeCache.version);
      }
    },
    [measureVirtualRows, rowSizeCache],
  );

  useLayoutEffect(() => {
    const syncResult = syncMeasuredColumnLayoutCache({
      cache: columnSizeCache,
      currentSignature: measuredCoreLayoutSignatureRef.current,
      enabled: measureVirtualColumns,
      nextSignature: coreLayoutSignature,
    });

    measuredCoreLayoutSignatureRef.current = syncResult.signature;

    if (syncResult.changed) {
      setColumnSizeVersion(columnSizeCache.version);
    }
  }, [columnSizeCache, coreLayoutSignature, measureVirtualColumns]);

  useEffect(() => {
    if (!measureVirtualColumns) {
      return;
    }

    if (columnSizeCache.prune(layout.map((column) => column.id))) {
      setColumnSizeVersion(columnSizeCache.version);
    }
  }, [columnSizeCache, layout, measureVirtualColumns]);

  useLayoutEffect(() => {
    if (!measureVirtualColumns) {
      return;
    }

    const observer = createResizeObserver((entries) => {
      if (
        applyResizeObserverMeasuredSizes(entries, {
          cache: columnSizeCache,
          datasetKey: "columnId",
          getSize: getResizeObserverEntryInlineSize,
        })
      ) {
        setColumnSizeVersion(columnSizeCache.version);
      }
    });

    if (!observer) {
      return;
    }

    columnResizeObserverRef.current = observer;

    observeElements(observer, observedColumnElementsRef.current.values());

    return () => {
      disconnectResizeObserver(observer);
      columnResizeObserverRef.current = null;
    };
  }, [columnSizeCache, measureVirtualColumns]);

  const measureVirtualColumn = useCallback(
    (columnId: string, element: HTMLDivElement | null) => {
      const previous = observedColumnElementsRef.current.get(columnId);

      if (previous && previous !== element) {
        removeObservedElement(columnResizeObserverRef.current, observedColumnElementsRef.current, columnId);
      }

      if (!element || !measureVirtualColumns) {
        return;
      }

      replaceObservedElement(columnResizeObserverRef.current, observedColumnElementsRef.current, columnId, element);

      if (columnSizeCache.set(columnId, getMeasuredElementInlineSize(element))) {
        setColumnSizeVersion(columnSizeCache.version);
      }
    },
    [columnSizeCache, measureVirtualColumns],
  );

  useLayoutEffect(() => {
    if ((!rowVirtualOptions.enabled && !columnVirtualOptions.enabled) || !scrollerRef.current) {
      return;
    }

    const scroller = scrollerRef.current;
    const syncFrame = () => {
      if (getShouldCancelFocusedCellRestoreOnFrameSync({ inProgress: focusScrollInProgressRef.current })) {
        shouldRestoreFocusedCellRef.current = false;
      }

      const headerHeight = getElementOffsetBlockSize(headerRef.current, 42);
      setScrollFrame(
        getScrollFrame(getScrollFrameOptionsFromElement(scroller, { stickyTopOffset: headerHeight })),
      );
    };

    syncFrame();
    const cleanupScrollListener = addPassiveScrollListener(syncFrame, scroller);

    const observer = createResizeObserver(syncFrame);

    if (!observer) {
      return () => {
        cleanupScrollListener();
      };
    }

    observer.observe(scroller);

    return () => {
      cleanupScrollListener();
      disconnectResizeObserver(observer);
    };
  }, [columnVirtualOptions.enabled, rowVirtualOptions.enabled]);

  const virtualRange = useMemo(() => {
    return getVirtualRowRange({
      count: rows.length,
      scrollFrame,
      enabled: rowVirtualOptions.enabled,
      estimateSize: rowRangeEstimate,
      overscan: rowVirtualOptions.overscan,
    });
  }, [
    rows.length,
    rowRangeEstimate,
    rowSizeVersion,
    scrollFrame.scrollTop,
    scrollFrame.viewportHeight,
    rowVirtualOptions.enabled,
    rowVirtualOptions.overscan,
  ]);

  const columnRenderItems = useMemo(
    () => getColumnRenderItems(measuredLayout, scrollFrame, columnVirtualOptions),
    [columnVirtualOptions.enabled, columnVirtualOptions.overscan, measuredLayout, scrollFrame],
  );
  const columnCellRenderItems = useMemo(() => getColumnCellRenderItems(columnRenderItems), [columnRenderItems]);

  const visibleRowItems = getVirtualRowItems(rows, virtualRange);
  const focusedCellRendered = getIsFocusedCellInRenderWindow(focusedCell, visibleRowItems, columnRenderItems);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;

    if (
      !getCanRestoreFocusedCell({
        focusedCell,
        scroller,
        shouldRestore: shouldRestoreFocusedCellRef.current,
      })
    ) {
      return;
    }

    if (!focusedCell || !scroller) {
      return;
    }
    const nextScroll = getScrollForFocusedCell(
      getFocusedCellScrollOptionsFromElement(scroller, {
        focusedCell,
        layout: measuredLayout,
        rows,
        headerHeight: getElementOffsetBlockSize(headerRef.current, 42),
        getRowSize: rowSizeResolver,
        rowVirtualOptions,
        columnVirtualOptions,
      }),
    );

    if (!nextScroll) {
      return;
    }

    focusScrollInProgressRef.current = true;
    scrollElementToPosition(scroller, nextScroll);
    requestAnimationFrame(() => {
      focusScrollInProgressRef.current = false;
    });
    setScrollFrame(
      getScrollFrame(
        getScrollFrameOptionsFromElement(scroller, {
          scrollTop: nextScroll.scrollTop,
          scrollLeft: nextScroll.scrollLeft,
          stickyTopOffset: getElementOffsetBlockSize(headerRef.current, 42),
        }),
      ),
    );
  }, [
    columnVirtualOptions.enabled,
    focusedCell?.columnId,
    focusedCell?.rowId,
    measuredLayoutSignature,
    rowVirtualOptions.enabled,
    rowVirtualOptions.estimateRowHeight,
    rowSizeResolver,
    rowSignature,
  ]);

  useEffect(() => {
    if (focusedCellRendered && shouldRestoreFocusedCellRef.current) {
      if (focusElement(focusedCellRef.current)) {
        shouldRestoreFocusedCellRef.current = false;
      }
    }
  }, [focusedCell?.rowId, focusedCell?.columnId, focusedCellRendered]);

  useEffect(() => {
    const clearPointerDrags = (event: globalThis.PointerEvent) => {
      const rangeDrag = rangeDragRef.current;
      const fillDrag = fillDragRef.current;

      if (rangeDrag?.didDrag) {
        cellClickSuppression.suppress();
      }

      if (fillDrag) {
        grid.fillCellRange(fillDrag.target, { ...cellFillOptions, sourceEvent: event });
        cellClickSuppression.suppress();
      }

      rangeDragRef.current = null;
      fillDragRef.current = null;
    };

    const cleanupPointerListeners = addPointerUpCancelListeners(
      { up: clearPointerDrags, cancel: clearPointerDrags },
      window,
    );

    return () => {
      cleanupPointerListeners();
    };
  }, [cellClickSuppression, cellFillOptions, grid]);

  useEffect(() => {
    const updateHeaderDrag = (event: globalThis.PointerEvent) => {
      const headerDrag = headerDragRef.current;

      if (!getCanContinuePointerDrag(headerDrag, event)) {
        return;
      }

      updatePointerDragDidMovePastThreshold(headerDrag, event);
    };

    const clearHeaderDrag = (event: globalThis.PointerEvent) => {
      const headerDrag = headerDragRef.current;
      const endingHeaderDrag = getCanEndPointerDrag(headerDrag, event) ? headerDrag : null;

      if (!endingHeaderDrag) {
        return;
      }

      const headerDragAction = getHeaderDragEndAction(endingHeaderDrag, {
        event,
        groupingPanel: Boolean(groupingPanel),
        groupingPanelElement: groupingPanelRef.current,
        columns: grid.getAllLeafColumns(),
      });

      if (isHeaderDragGroupAction(headerDragAction)) {
        grid.toggleColumnGrouping(headerDragAction.columnId, true);
      } else if (isHeaderDragMoveAction(headerDragAction)) {
        moveColumnToTarget(grid, headerDragAction.sourceColumnId, headerDragAction.targetColumnId);
        headerClickSuppression.suppress();
      }

      headerDragRef.current = null;
    };

    const cleanupPointerListeners = addPointerMoveUpCancelListeners(
      { move: updateHeaderDrag, up: clearHeaderDrag, cancel: clearHeaderDrag },
      window,
    );

    return () => {
      cleanupPointerListeners();
    };
  }, [grid, headerClickSuppression]);

  const startCellRangeDrag = (coordinate: CellCoordinate, event: PointerEvent<HTMLDivElement>) => {
    if (!getCanStartCellPointerDrag(event, editingCell)) {
      return;
    }

    shouldRestoreFocusedCellRef.current = false;
    rangeDragRef.current = { anchor: coordinate, pointerId: event.pointerId, didDrag: false };
    grid.selectCellRange(coordinate);
  };

  const extendCellRangeDrag = (coordinate: CellCoordinate, event: PointerEvent<HTMLDivElement>) => {
    const rangeDrag = rangeDragRef.current;

    if (!getCanContinuePointerDrag(rangeDrag, event)) {
      return;
    }

    if (!isCellCoordinateEqual(rangeDrag.anchor, coordinate)) {
      rangeDrag.didDrag = true;
    }

    grid.selectCellRange(rangeDrag.anchor, coordinate);
  };

  const endCellRangeDrag = (event: PointerEvent<HTMLDivElement>) => {
    const rangeDrag = rangeDragRef.current;

    if (!getCanEndPointerDrag(rangeDrag, event)) {
      return;
    }

    if (rangeDrag.didDrag) {
      cellClickSuppression.suppress();
    }

    rangeDragRef.current = null;
  };

  const startCellFillDrag = (coordinate: CellCoordinate, event: PointerEvent<HTMLSpanElement>) => {
    if (!getCanStartCellPointerDrag(event, editingCell)) {
      return;
    }

    preventDefaultAndStopPropagation(event);
    fillDragRef.current = { pointerId: event.pointerId, target: coordinate };
  };

  const updateCellFillTarget = (coordinate: CellCoordinate, event: PointerEvent<HTMLDivElement>) => {
    const fillDrag = fillDragRef.current;

    if (!getCanContinuePointerDrag(fillDrag, event)) {
      return;
    }

    fillDrag.target = coordinate;
  };

  const startColumnHeaderDrag = (columnId: string, event: PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointerButton(event)) {
      return;
    }

    headerDragRef.current = {
      sourceColumnId: columnId,
      targetColumnId: columnId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      didDrag: false,
    };
  };

  const updateColumnHeaderDragTarget = (columnId: string, event: PointerEvent<HTMLDivElement>) => {
    const headerDrag = headerDragRef.current;

    if (!getCanContinuePointerDrag(headerDrag, event)) {
      return;
    }

    headerDrag.targetColumnId = columnId;
  };

  const handleHeaderClick = (column: Column<TData, unknown>, multi: boolean) => {
    if (headerClickSuppression.consume()) {
      return;
    }

    if (column.getCanSort()) {
      grid.toggleColumnSorting(column.id, undefined, multi);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isGridInteractiveKeyboardEventTarget(event)) {
      return;
    }

    const shortcutAction = getGridKeyboardShortcutAction(event);
    const focusMove = getGridKeyboardFocusMove(event);
    const editAction = getGridKeyboardEditAction(event);
    const canRunShortcut = getCanRunGridKeyboardShortcut(editingCell);

    if (editAction === "start-edit" && getCanStartFocusedCellEdit(focusedCell, editingCell)) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = false;
      grid.startCellEdit(focusedCell.rowId, focusedCell.columnId, event);
    } else if (editAction === "cancel-edit" && getCanCancelCellEdit(editingCell)) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = true;
      grid.cancelCellEdit(event);
    } else if (shortcutAction === "copy" && canRunShortcut) {
      const clipboardText = grid.getClipboardText();

      if (clipboardText) {
        preventEventDefault(event);
        void writeClipboardText(clipboardText);
      }
    } else if (shortcutAction === "paste" && canRunShortcut) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = true;
      const sourceEvent = event.nativeEvent;

      void readClipboardText().then((clipboardText) => {
        if (clipboardText) {
          const result = grid.pasteClipboardText(clipboardText, { ...clipboardPasteOptions, sourceEvent });
          onClipboardPaste?.(result);
        }
      });
    } else if (shortcutAction === "undo-edit" && canRunShortcut && grid.getCanUndoCellEdit()) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = true;
      grid.undoCellEdit(event.nativeEvent);
    } else if (shortcutAction === "redo-edit" && canRunShortcut && grid.getCanRedoCellEdit()) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = true;
      grid.redoCellEdit(event.nativeEvent);
    } else if (shortcutAction === "row-selection" && canRunShortcut) {
      const rowSelectionTarget = getFocusedRowSelectionTarget(rows, focusedCell);

      if (rowSelectionTarget) {
        preventEventDefault(event);
        const { row, rowIndex } = rowSelectionTarget;
        const rowEvent = grid.emitRowEvent({ type: "keydown", row, rowIndex, sourceEvent: event.nativeEvent });

        if (getCanToggleRowSelection(rowEvent)) {
          grid.toggleRowSelected(row.id);
        }
      }
    } else if (focusMove) {
      preventEventDefault(event);
      shouldRestoreFocusedCellRef.current = true;
      grid.moveFocus(focusMove.direction, focusMove.options);
    }
  };

  const resetPaginationScroll = () => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scrollElementToPosition(scroller, { scrollTop: 0, scrollLeft: scroller.scrollLeft });
    }
  };

  const runPaginationAction = (action: () => void) => {
    action();
    resetPaginationScroll();
  };

  const setDensity = (nextDensity: GridDensity) => {
    if (density === undefined) {
      setUncontrolledDensity(nextDensity);
    }
    onDensityChange?.(nextDensity);
  };

  return (
    <GridLocalizationContext.Provider value={localization}>
    {quickFilterControl || rowSelectionControls || columnVisibilityControls || densityControl ? (
      <div className="og-grid__controls">
      {rowSelectionControls ? (
        <div {...getRowSelectionControlsProps(localization)} className="og-grid__selection-controls">
          <label className="og-grid__selection-toggle">
            <input
              {...getRowSelectionCheckboxProps({
                allSelected: allPageRowsSelected,
                someSelected: somePageRowsSelected,
                disabled: rows.length === 0,
              }, localization)}
              ref={(element) => { setCheckboxIndeterminate(element, somePageRowsSelected); }}
              onChange={() => grid.toggleAllPageRowsSelected(!allPageRowsSelected)}
            />
            <span>{getRowSelectionCheckboxText(localization)}</span>
          </label>
          <span {...getRowSelectionStatusProps()} className="og-grid__selection-status">
            {getRowSelectionStatusText(selectedRowCount, localization)}
          </span>
          <button
            {...getRowSelectionClearButtonProps(selectedRowCount === 0, localization)}
            className="og-grid__selection-clear"
            onClick={() => grid.resetRowSelection()}
          >
            {getRowSelectionClearButtonText(localization)}
          </button>
        </div>
      ) : null}
      {columnVisibilityControls ? (
        <details {...getColumnVisibilityControlsProps(localization)} className="og-grid__column-visibility">
          <summary {...getColumnVisibilitySummaryProps(columns.length, allColumns.length, localization)} className="og-grid__column-visibility-summary">
            {getColumnVisibilitySummaryText(columns.length, allColumns.length, localization)}
          </summary>
          <div className="og-grid__column-visibility-panel">
            <input
              {...getColumnVisibilitySearchInputProps(columnVisibilityQuery, localization)}
              className="og-grid__column-visibility-search"
              onChange={(event) => setColumnVisibilityQuery(event.currentTarget.value)}
            />
            <span {...getColumnVisibilityStatusProps()} className="og-grid__column-visibility-status">
              {getColumnVisibilityStatusText(columns.length, allColumns.length, localization)}
            </span>
            <div {...getColumnVisibilityListProps(localization)} className="og-grid__column-visibility-list">
              {filteredVisibilityColumns.length > 0 ? filteredVisibilityColumns.map((column) => {
                const label = getColumnHeaderText(column);
                const visible = grid.getIsColumnVisible(column.id);
                return (
                  <label className="og-grid__column-visibility-item" key={column.id}>
                    <input
                      {...getColumnVisibilityCheckboxProps({
                        columnId: column.id,
                        label,
                        visible,
                        visibleCount: columns.length,
                      })}
                      onChange={(event) => grid.toggleColumnVisibility(column.id, event.currentTarget.checked)}
                    />
                    <span>{label}</span>
                  </label>
                );
              }) : (
                <span className="og-grid__column-visibility-empty">{getColumnVisibilityEmptyText(localization)}</span>
              )}
            </div>
            <button
              {...getColumnVisibilityResetButtonProps(allColumns.length - columns.length, localization)}
              className="og-grid__column-visibility-reset"
              onClick={() => grid.resetColumnVisibility()}
            >
              {getColumnVisibilityResetButtonText(localization)}
            </button>
          </div>
        </details>
      ) : null}
      {densityControl ? (
        <div {...getDensityControlsProps(localization)} className="og-grid__density-controls">
          {GRID_DENSITIES.map((densityOption) => (
            <button
              {...getDensityButtonProps(densityOption, resolvedDensity, localization)}
              className="og-grid__density-button"
              key={densityOption}
              onClick={() => setDensity(densityOption)}
            >
              {getDensityButtonText(densityOption, localization)}
            </button>
          ))}
        </div>
      ) : null}
      {quickFilterControl ? (
        <div {...getQuickFilterProps(localization)} className="og-grid__quick-filter">
        <input
          {...getQuickFilterInputProps({ value: grid.getState().globalFilter }, localization)}
          className="og-grid__quick-filter-input"
          onChange={(event) => {
            const value = event.currentTarget.value;
            grid.setState((previous) => ({
              ...previous,
              globalFilter: value,
              pagination: { ...previous.pagination, pageIndex: 0 },
            }));
            resetPaginationScroll();
          }}
        />
        <button
          {...getQuickFilterClearButtonProps(grid.getState().globalFilter, localization)}
          className="og-grid__quick-filter-clear"
          onClick={() => {
            grid.setState((previous) => ({
              ...previous,
              globalFilter: "",
              pagination: { ...previous.pagination, pageIndex: 0 },
            }));
            resetPaginationScroll();
          }}
        >
          {getQuickFilterClearButtonText(localization)}
        </button>
        </div>
      ) : null}
      </div>
    ) : null}
    <div
      {...(densitySizingEnabled ? getGridDensityProps(resolvedDensity) : {})}
      className={["og-grid", className].filter(Boolean).join(" ")}
      style={style}
    >
      {groupingPanel ? (
        <div
          ref={groupingPanelRef}
          {...getGroupingPanelProps({ empty: groupingColumns.length === 0 }, localization)}
          className="og-grid__grouping-panel"
        >
          {groupingColumns.length === 0 ? (
            <span {...getGroupingPanelPlaceholderProps()} className="og-grid__grouping-placeholder">
              {localization.groupingPanelEmpty}
            </span>
          ) : (
            groupingColumns.map((column, index) => (
              <span key={column.id} {...getGroupingPanelChipProps(column)} className="og-grid__grouping-chip">
                <span className="og-grid__grouping-chip-label">{getColumnLabel(column)}</span>
                <button
                  {...getGroupingPanelMoveButtonProps(column, { direction: "left", disabled: index === 0 }, localization)}
                  className="og-grid__grouping-move"
                  onClick={() => moveGroupedColumn(grid, groupingColumns, column.id, "left")}
                >
                  {"<"}
                </button>
                <button
                  {...getGroupingPanelMoveButtonProps(column, { direction: "right", disabled: index === groupingColumns.length - 1 }, localization)}
                  className="og-grid__grouping-move"
                  onClick={() => moveGroupedColumn(grid, groupingColumns, column.id, "right")}
                >
                  {">"}
                </button>
                <button
                  {...getGroupingPanelRemoveButtonProps(column, localization)}
                  className="og-grid__grouping-remove"
                  onClick={() => grid.toggleColumnGrouping(column.id, false)}
                >
                  x
                </button>
              </span>
            ))
          )}
        </div>
      ) : null}
      <div
        {...getGridProps(grid, { additionalHeaderRowCount, ariaLabel, error, loading })}
        {...(densitySizingEnabled ? getGridDensityProps(resolvedDensity) : {})}
        className="og-grid__scroller"
        onKeyDown={handleKeyDown}
        ref={scrollerRef}
      >
        <div className="og-grid__canvas" style={getInlineSizeStyle(totalMeasuredWidth)}>
          <div {...getGridHeaderProps()} className="og-grid__header" ref={headerRef}>
            {headerGroups.map((headerGroup, headerRowIndex) => (
              <div
                key={headerGroup.id}
                {...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: headerRowIndex })}
                className="og-grid__row og-grid__row--header"
                style={getVirtualizedInlineSizeStyle(totalMeasuredWidth, columnVirtualOptions.enabled)}
              >
                {getHeaderRenderItems(headerGroup, columnRenderItems, measuredLayoutById).flatMap((item) => {
                  if (isHeaderRenderSpacerItem(item)) {
                    return <div key={getHeaderRenderItemKey(headerGroup.id, item)} {...getColumnSpacerProps()} className="og-grid__column-spacer" style={getInlineSizeStyle(item.size)} />;
                  }

                  const header = item.header;
                  const firstLeafId = item.leafColumnIds[0];
                  const firstLeafLayout = firstLeafId ? measuredLayoutById.get(firstLeafId) : undefined;
                  const column = header.column;
                  const canInteract = !header.isPlaceholder && column.columns.length === 0;

                  return (
                    <HeaderCell
                      key={getHeaderRenderItemKey(headerGroup.id, item)}
                      header={header}
                      column={column}
                      columnIndex={firstLeafId ? columnIndexById.get(firstLeafId) ?? 0 : 0}
                      layout={firstLeafLayout}
                      size={item.size}
                      colSpan={item.leafColumnIds.length}
                      isColumnVirtualized={columnVirtualOptions.enabled}
                      canInteract={canInteract}
                      headerClassName={getHeaderClassName?.({ grid, column, header })}
                      columnPinningControls={columnPinningControls}
                      headerActionMenu={headerActionMenu}
                      headerActionMenuItems={headerActionMenuItems}
                      onHeaderClick={(multi) => handleHeaderClick(column, multi)}
                      onMoveColumn={(direction) => moveVisibleColumn(grid, column.id, direction)}
                      onPointerDownHeader={(event) => startColumnHeaderDrag(column.id, event)}
                      onPointerEnterHeader={(event) => updateColumnHeaderDragTarget(column.id, event)}
                      onResize={(size) => grid.setColumnSize(column.id, size)}
                      onCancelFocusRestore={() => {
                        shouldRestoreFocusedCellRef.current = false;
                      }}
                      onMeasureColumn={measureVirtualColumn}
                      sortDirection={grid.getColumnSortDirection(column.id)}
                      grid={grid}
                    />
                  );
                })}
              </div>
            ))}
            {columnFilterControls ? (
              <div
                {...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: headerGroups.length })}
                className="og-grid__row og-grid__row--filter"
                style={getVirtualizedInlineSizeStyle(totalMeasuredWidth, columnVirtualOptions.enabled)}
              >
                {columnCellRenderItems.flatMap((item) => {
                  const column = columnById.get(item.layout.id);

                  if (!column) {
                    return [];
                  }

                  const columnIndex = columnIndexById.get(column.id) ?? 0;
                  return (
                    <div
                      key={`filter:${column.id}`}
                      {...getColumnFilterCellProps(column, {
                        columnIndex,
                        rowIndex: headerGroups.length,
                        pinned: item.layout.pinned,
                        pinnedEdge: item.layout.pinnedEdge,
                      })}
                      className="og-grid__filter-cell"
                      style={getColumnStyle(
                        item.layout,
                        columnVirtualOptions.enabled,
                        item.layout.size,
                        item.beforeSpacerSize,
                        item.afterSpacerSize,
                      )}
                    >
                      {column.getCanFilter() ? (
                        <input
                          {...getColumnFilterInputProps(column, {
                            label: getColumnHeaderText(column),
                            value: getColumnFilterText(grid.getState().columnFilters, column.id),
                          }, localization)}
                          className="og-grid__filter-input"
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            grid.setState((previous) => ({
                              ...previous,
                              columnFilters: getNextColumnFilters(previous.columnFilters, column.id, value),
                              pagination: { ...previous.pagination, pageIndex: 0 },
                            }));
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div
            {...getGridBodyProps({ virtualized: rowVirtualOptions.enabled })}
            className="og-grid__body"
            style={getVirtualBodyStyle(virtualRange)}
          >
            {rows.length === 0 ? (
              <div {...getGridEmptyRowProps({ rowIndexOffset: bodyRowIndexOffset })} className="og-grid__empty">
                <div {...getGridEmptyCellProps({ rowIndexOffset: bodyRowIndexOffset, columnCount: columns.length })} className="og-grid__empty-cell" style={getInlineSizeStyle(totalMeasuredWidth)}>
                  {emptyState}
                </div>
              </div>
            ) : (
              visibleRowItems.map(({ row, rowIndex, virtualItem }) => (
                <div
                  key={row.id}
                  ref={measureVirtualRows ? (element) => measureVirtualRow(row.id, element) : undefined}
                  {...getRowProps(row, rowIndex, { selected: grid.getIsRowSelected(row.id), rowIndexOffset: bodyRowIndexOffset })}
                  {...getRowLayoutProps(row, {
                    expanded: grid.getIsRowExpanded(row.id),
                    virtualIndex: virtualItem?.index,
                    columnVirtualized: columnVirtualOptions.enabled,
                  })}
                  className={["og-grid__row", getRowClassName?.(row)].filter(Boolean).join(" ")}
                  onClick={(event) => {
                    shouldRestoreFocusedCellRef.current = false;

                    if (!getCanToggleRowSelection(event)) {
                      return;
                    }

                    const rowEvent = grid.emitRowEvent({ type: "click", row, rowIndex, sourceEvent: event });

                    if (getCanToggleRowSelection(rowEvent)) {
                      grid.toggleRowSelected(row.id);
                    }
                  }}
                  style={getRowStyle(virtualItem, columnVirtualOptions.enabled ? totalMeasuredWidth : undefined)}
                >
                  {columnCellRenderItems.flatMap((item) => {
                    const columnLayout = item.layout;
                    const column = columnById.get(columnLayout.id);

                    if (!column) {
                      return [];
                    }

                    const columnIndex = columnIndexById.get(column.id) ?? 0;
                    const focused = isFocusedCell(focusedCell, row.id, column.id);
                    const editing = grid.getIsCellEditing(row.id, column.id);
                    const rangeSelected = grid.getIsCellRangeSelected(row.id, column.id);
                    const groupLabelCell = getIsGroupLabelCell(row, column, columns);
                    const fillHandleVisible = getCellFillHandleVisible(row, column, {
                      activeEditing: Boolean(editingCell),
                      fillHandleCoordinate,
                      rangeSelected,
                    });
                    return (
                      <BodyCell
                        key={column.id}
                        cellRef={focused ? focusedCellRef : undefined}
                        grid={grid}
                        row={row}
                        column={column}
                        rowIndex={rowIndex}
                        rowIndexOffset={bodyRowIndexOffset}
                        columnIndex={columnIndex}
                        focusedCell={focusedCell}
                        editing={editing}
                        rangeSelected={rangeSelected}
                        fillHandleVisible={fillHandleVisible}
                        groupLabelCell={groupLabelCell}
                        cellClassName={getCellClassName?.({ grid, row, column, value: row.getValue(column.id) })}
                        layout={columnLayout}
                        beforeSpacerSize={item.beforeSpacerSize}
                        afterSpacerSize={item.afterSpacerSize}
                        isColumnVirtualized={columnVirtualOptions.enabled}
                        onFocusCell={() => grid.setFocusedCell({ rowId: row.id, columnId: column.id })}
                        onStartEdit={(sourceEvent) => grid.startCellEdit(row.id, column.id, sourceEvent)}
                        onCommitEdit={(value, sourceEvent) => grid.commitCellEdit(value, sourceEvent)}
                        onCancelEdit={(sourceEvent) => grid.cancelCellEdit(sourceEvent)}
                        onPointerDownCell={(event) => startCellRangeDrag({ rowId: row.id, columnId: column.id }, event)}
                        onPointerEnterCell={(event) => {
                          updateCellFillTarget({ rowId: row.id, columnId: column.id }, event);
                          extendCellRangeDrag({ rowId: row.id, columnId: column.id }, event);
                        }}
                        onPointerUpCell={endCellRangeDrag}
                        onPointerDownFillHandle={(event) => startCellFillDrag({ rowId: row.id, columnId: column.id }, event)}
                        onToggleRowExpanded={() => grid.toggleRowExpanded(row.id)}
                        onClickCell={(event) => {
                          if (cellClickSuppression.consume(event)) {
                            return;
                          }

                          const cellEvent = grid.emitCellEvent({
                            type: "click",
                            row,
                            column,
                            rowIndex,
                            columnIndex,
                            sourceEvent: event,
                          });

                          if (getShouldPreventEventDefault(cellEvent)) {
                            preventEventDefault(event);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {error ? (
        <div {...getGridErrorOverlayProps(localization)} className="og-grid__status-overlay og-grid__error-overlay">
          <span className="og-grid__status-text">{errorState}</span>
          {onRetry ? (
            <button {...getGridErrorRetryButtonProps(localization)} className="og-grid__retry-button" onClick={onRetry}>
              {getGridErrorRetryButtonText(localization)}
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div {...getGridLoadingOverlayProps(localization)} className="og-grid__status-overlay og-grid__loading-overlay">
          <span className="og-grid__loading-spinner" aria-hidden="true" />
          <span className="og-grid__status-text">{loadingState}</span>
        </div>
      ) : null}
    </div>
    {paginationControls ? (
      <nav {...getPaginationProps(localization)} className="og-grid__pagination">
        <div className="og-grid__pagination-buttons">
          <button {...getPaginationButtonProps({ action: "first", disabled: !grid.getCanPreviousPage() }, localization)} className="og-grid__pagination-button" onClick={() => runPaginationAction(() => grid.firstPage())}>
            {getPaginationButtonText("first")}
          </button>
          <button {...getPaginationButtonProps({ action: "previous", disabled: !grid.getCanPreviousPage() }, localization)} className="og-grid__pagination-button" onClick={() => runPaginationAction(() => grid.previousPage())}>
            {getPaginationButtonText("previous")}
          </button>
          <span {...getPaginationStatusProps()} className="og-grid__pagination-status">{getPaginationPageText(grid, localization)}</span>
          <button {...getPaginationButtonProps({ action: "next", disabled: !grid.getCanNextPage() }, localization)} className="og-grid__pagination-button" onClick={() => runPaginationAction(() => grid.nextPage())}>
            {getPaginationButtonText("next")}
          </button>
          <button {...getPaginationButtonProps({ action: "last", disabled: !grid.getCanNextPage() }, localization)} className="og-grid__pagination-button" onClick={() => runPaginationAction(() => grid.lastPage())}>
            {getPaginationButtonText("last")}
          </button>
        </div>
        <select
          {...getPaginationPageSizeSelectProps(grid.getState().pagination.pageSize, localization)}
          className="og-grid__pagination-size"
          onChange={(event) => {
            grid.setPageSize(Number(event.currentTarget.value));
            resetPaginationScroll();
          }}
        >
          {resolvedPageSizeOptions.map((pageSize) => <option key={pageSize} value={pageSize}>{getPaginationPageSizeOptionText(pageSize, localization)}</option>)}
        </select>
      </nav>
    ) : null}
    </GridLocalizationContext.Provider>
  );
}

function getRowStyle(virtualItem: VirtualItem | null, width?: number): CSSProperties | undefined {
  if (!virtualItem && width === undefined) {
    return undefined;
  }

  const style: CSSProperties = {};

  if (width !== undefined) {
    style.width = width;
    style.minWidth = width;
  }

  if (!virtualItem) {
    return style;
  }

  return {
    ...style,
    ...(getVirtualRowStyle(virtualItem) ?? {}),
  };
}

interface HeaderCellProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  header: Header<TData>;
  column: Column<TData, unknown>;
  columnIndex: number;
  layout: ColumnLayout | undefined;
  size: number;
  colSpan: number;
  sortDirection: "asc" | "desc" | false;
  onHeaderClick: (multi: boolean) => void;
  onMoveColumn: (direction: "left" | "right") => void;
  onPointerDownHeader: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnterHeader: (event: PointerEvent<HTMLDivElement>) => void;
  onResize: (size: number) => void;
  onCancelFocusRestore: () => void;
  onMeasureColumn: (columnId: string, element: HTMLDivElement | null) => void;
  isColumnVirtualized: boolean;
  canInteract: boolean;
  headerClassName: string | undefined;
  columnPinningControls: boolean;
  headerActionMenu: boolean;
  headerActionMenuItems: HeaderActionMenuItems<TData> | undefined;
}

function HeaderCell<TData>(props: HeaderCellProps<TData>) {
  const localization = useContext(GridLocalizationContext);
  const {
    grid,
    header,
    column,
    columnIndex,
    layout,
    size,
    colSpan,
    sortDirection,
    onHeaderClick,
    onMoveColumn,
    onPointerDownHeader,
    onPointerEnterHeader,
    onResize,
    onCancelFocusRestore,
    onMeasureColumn,
    isColumnVirtualized,
    canInteract,
    headerClassName,
    columnPinningControls,
    headerActionMenu,
    headerActionMenuItems,
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuPopoverRef = useRef<HTMLDivElement | null>(null);

  const handleResizePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    preventDefaultAndStopPropagation(event);
    onCancelFocusRestore();

    const startX = event.clientX;
    const startSize = getColumnResizeStartSize(grid, column);
    const startEvent = grid.emitColumnResizeEvent({
      phase: "start",
      column,
      columnIndex,
      startSize,
      size: startSize,
      sourceEvent: event,
    });

    if (!getCanStartColumnResize(startEvent)) {
      return;
    }

    const target = getPointerCaptureTarget(event);
    let lastSize = startSize;
    let cleanupPointerListeners: (() => void) | null = null;

    trySetPointerCapture(target, event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const size = getColumnResizePointerSize(startSize, startX, moveEvent);
      const resizeEvent = grid.emitColumnResizeEvent({
        phase: "move",
        column,
        columnIndex,
        startSize,
        size,
        sourceEvent: moveEvent,
      });

      if (getCanApplyColumnResize(resizeEvent)) {
        lastSize = resizeEvent.size;
        onResize(resizeEvent.size);
      }
    };

    const handlePointerUp = (upEvent: globalThis.PointerEvent) => {
      grid.emitColumnResizeEvent({
        phase: "end",
        column,
        columnIndex,
        startSize,
        size: lastSize,
        sourceEvent: upEvent,
      });

      tryReleasePointerCapture(target, upEvent.pointerId);
      cleanupPointerListeners?.();
      cleanupPointerListeners = null;
    };

    cleanupPointerListeners = addPointerMoveUpListeners({ move: handlePointerMove, up: handlePointerUp });
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    onCancelFocusRestore();

    const startSize = getColumnResizeStartSize(grid, column);
    const nextSize = getColumnResizeKeyboardSize(column, startSize, event);

    if (nextSize === null) {
      return;
    }

    preventDefaultAndStopPropagation(event);

    const startEvent = grid.emitColumnResizeEvent({
      phase: "start",
      column,
      columnIndex,
      startSize,
      size: startSize,
      sourceEvent: event,
    });

    if (!getCanStartColumnResize(startEvent)) {
      return;
    }

    const resizeEvent = grid.emitColumnResizeEvent({
      phase: "move",
      column,
      columnIndex,
      startSize,
      size: nextSize,
      sourceEvent: event,
    });
    const finalSize = getColumnResizeFinalSize(startSize, resizeEvent);

    if (getCanApplyColumnResize(resizeEvent)) {
      onResize(finalSize);
    }

    grid.emitColumnResizeEvent({
      phase: "end",
      column,
      columnIndex,
      startSize,
      size: finalSize,
      sourceEvent: event,
    });
  };

  const handleHeaderButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = getHeaderKeyboardMoveDirection(event);

    if (!direction) {
      return;
    }

    preventDefaultAndStopPropagation(event);
    onCancelFocusRestore();
    onMoveColumn(direction);
  };
  const pinningPosition = column.getIsPinned();
  const visibleColumns = grid.getVisibleLeafColumns();
  const visibleColumnIndex = getColumnIndexById(column.id, visibleColumns);
  const canMoveLeft = visibleColumnIndex > 0;
  const canMoveRight = visibleColumnIndex >= 0 && visibleColumnIndex < visibleColumns.length - 1;
  const isGrouped = grid.getState().grouping.includes(column.id);
  const menuId = getHeaderActionMenuId(column.id);
  const menuTriggerId = getHeaderActionMenuTriggerId(column.id);
  const defaultMenuItems = getHeaderActionMenuDefaultItemDescriptors({
    sortDirection,
    pinningPosition,
    isGrouped,
    canGroup: column.getCanGroup(),
    canMoveLeft,
    canMoveRight,
  }, localization).map((descriptor): HeaderActionMenuActionItem<TData> => {
    if (descriptor.id === "sort-asc") {
      return { ...descriptor, onSelect: () => grid.toggleColumnSorting(column.id, false) };
    }
    if (descriptor.id === "sort-desc") {
      return { ...descriptor, onSelect: () => grid.toggleColumnSorting(column.id, true) };
    }
    if (descriptor.id === "clear-sort") {
      return { ...descriptor, onSelect: () => grid.setSorting((previous) => previous.filter((rule) => rule.id !== column.id)) };
    }
    if (descriptor.id === "move-left") {
      return { ...descriptor, onSelect: () => onMoveColumn("left") };
    }
    if (descriptor.id === "move-right") {
      return { ...descriptor, onSelect: () => onMoveColumn("right") };
    }
    if (descriptor.id === "pin-left") {
      return { ...descriptor, onSelect: () => grid.pinColumn(column.id, "left") };
    }
    if (descriptor.id === "unpin") {
      return { ...descriptor, onSelect: () => grid.pinColumn(column.id, false) };
    }
    if (descriptor.id === "pin-right") {
      return { ...descriptor, onSelect: () => grid.pinColumn(column.id, "right") };
    }

    return { ...descriptor, onSelect: () => grid.toggleColumnGrouping(column.id, !isGrouped) };
  });
  const menuContext: HeaderActionMenuContext<TData> = {
    grid,
    column,
    sortDirection,
    pinningPosition,
    isGrouped,
    canMoveLeft,
    canMoveRight,
    defaultItems: defaultMenuItems,
  };
  const menuItems = (headerActionMenuItems ? headerActionMenuItems(menuContext) : defaultMenuItems).filter(isHeaderActionMenuItem);
  const runMenuAction = (item: HeaderActionMenuActionItem<TData>) => {
    onCancelFocusRestore();
    item.onSelect(menuContext);
    setMenuOpen(false);
  };
  const openMenuFromKeyboard = (position: "first" | "last") => {
    onCancelFocusRestore();
    setMenuOpen(true);
    requestAnimationFrame(() => focusHeaderActionMenuItem(menuPopoverRef.current, position));
  };
  const closeMenuFromKeyboard = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => focusHeaderActionMenuTrigger(menuTriggerRef.current));
  };

  return (
    <div
      ref={canInteract ? (element) => onMeasureColumn(column.id, element) : undefined}
      {...(header.isPlaceholder ? getHeaderPlaceholderCellProps(column) : getHeaderCellProps(grid, column, columnIndex))}
      {...getHeaderCellLayoutProps({
        colSpan,
        rowSpan: header.rowSpan,
        grouped: column.columns.length > 0,
        placeholder: header.isPlaceholder,
        pinnedEdge: layout?.pinnedEdge,
        draggable: canInteract,
      })}
      className={["og-grid__header-cell", headerClassName].filter(Boolean).join(" ")}
      onPointerDown={canInteract ? onPointerDownHeader : undefined}
      onPointerEnter={canInteract ? onPointerEnterHeader : undefined}
      style={getColumnStyle(layout, isColumnVirtualized, size)}
    >
      <button
        {...getHeaderButtonProps({ disabled: !canInteract, placeholder: header.isPlaceholder })}
        className="og-grid__header-button"
        onClick={(event) => {
          onHeaderClick(event.shiftKey);
        }}
        onKeyDown={handleHeaderButtonKeyDown}
      >
        <span className="og-grid__header-label">{header.isPlaceholder ? "" : renderHeader(grid, column, header)}</span>
        <span {...getHeaderSortIndicatorProps()} className="og-grid__sort-indicator">
          {getHeaderSortIndicatorText(sortDirection, { visible: canInteract })}
        </span>
      </button>
      {canInteract && columnPinningControls ? (
        <span {...getColumnPinningControlsProps(column, localization)} className="og-grid__pinning-controls">
          <button
            {...getColumnPinningButtonProps(column, { position: "left", active: pinningPosition === "left" }, localization)}
            className="og-grid__pinning-button"
            onPointerDown={(event) => stopEventPropagation(event)}
            onClick={(event) => {
              stopEventPropagation(event);
              onCancelFocusRestore();
              grid.pinColumn(column.id, "left");
            }}
          >
            {getColumnPinningButtonText("left")}
          </button>
          <button
            {...getColumnPinningButtonProps(column, { position: false, active: pinningPosition === false }, localization)}
            className="og-grid__pinning-button"
            onPointerDown={(event) => stopEventPropagation(event)}
            onClick={(event) => {
              stopEventPropagation(event);
              onCancelFocusRestore();
              grid.pinColumn(column.id, false);
            }}
          >
            {getColumnPinningButtonText(false)}
          </button>
          <button
            {...getColumnPinningButtonProps(column, { position: "right", active: pinningPosition === "right" }, localization)}
            className="og-grid__pinning-button"
            onPointerDown={(event) => stopEventPropagation(event)}
            onClick={(event) => {
              stopEventPropagation(event);
              onCancelFocusRestore();
              grid.pinColumn(column.id, "right");
            }}
          >
            {getColumnPinningButtonText("right")}
          </button>
        </span>
      ) : null}
      {canInteract && headerActionMenu ? (
        <span className="og-grid__header-menu">
          <button
            ref={menuTriggerRef}
            {...getHeaderActionMenuTriggerProps(column, { expanded: menuOpen, controls: menuId }, localization)}
            id={menuTriggerId}
            className="og-grid__header-menu-trigger"
            onPointerDown={(event) => stopEventPropagation(event)}
            onClick={(event) => {
              stopEventPropagation(event);
              onCancelFocusRestore();
              setMenuOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              const focusPosition = getHeaderActionMenuTriggerFocusPosition(event);

              if (!focusPosition) {
                return;
              }

              preventDefaultAndStopPropagation(event);
              openMenuFromKeyboard(focusPosition);
            }}
          >
            {localization.headerActionMenuTrigger}
          </button>
          {menuOpen ? (
            <div
              ref={menuPopoverRef}
              {...getHeaderActionMenuProps(column, localization)}
              className="og-grid__header-menu-popover"
              id={menuId}
              onPointerDown={(event) => stopEventPropagation(event)}
              onKeyDown={(event) => {
                const menuAction = getHeaderActionMenuKeyboardAction(event);

                if (!menuAction) {
                  return;
                }

                if (isHeaderActionMenuCloseAction(menuAction)) {
                  preventDefaultAndStopPropagation(event);
                  closeMenuFromKeyboard();
                } else if (isHeaderActionMenuFocusAction(menuAction)) {
                  preventDefaultAndStopPropagation(event);
                  focusHeaderActionMenuItem(getHeaderActionMenuFocusTarget(event), menuAction.position);
                } else if (isHeaderActionMenuTabCloseAction(menuAction)) {
                  setMenuOpen(false);
                }
              }}
            >
              {menuItems.map((item) =>
                isHeaderActionMenuActionItem(item) ? (
                  <button key={item.id} {...getHeaderActionMenuItemProps({ disabled: item.disabled })} onClick={() => runMenuAction(item)}>
                    {item.label}
                  </button>
                ) : isHeaderActionMenuCustomItem(item) ? (
                  <span key={item.id} {...getHeaderActionMenuCustomItemProps({ label: item.label })} className="og-grid__header-menu-custom">
                    {item.render(menuContext)}
                  </span>
                ) : isHeaderActionMenuLabelItem(item) ? (
                  <span key={item.id} {...getHeaderActionMenuLabelProps()} className="og-grid__header-menu-label">
                    {item.label}
                  </span>
                ) : isHeaderActionMenuSeparatorItem(item) ? (
                  <span key={item.id} {...getHeaderActionMenuSeparatorProps({ label: item.label })} className="og-grid__header-menu-separator" />
                ) : null,
              )}
            </div>
          ) : null}
        </span>
      ) : null}
      {canInteract ? (
        <span
          {...getColumnResizeHandleProps(column, {}, localization)}
          className="og-grid__resize-handle"
          onKeyDown={handleResizeKeyDown}
          onPointerDown={handleResizePointerDown}
        />
      ) : null}
    </div>
  );
}

interface BodyCellProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  row: Row<TData>;
  column: Column<TData, unknown>;
  rowIndex: number;
  rowIndexOffset: number;
  columnIndex: number;
  focusedCell: CellCoordinate | null;
  editing: boolean;
  rangeSelected: boolean;
  fillHandleVisible: boolean;
  groupLabelCell: boolean;
  cellClassName: string | undefined;
  layout: ColumnLayout;
  beforeSpacerSize: number;
  afterSpacerSize: number;
  isColumnVirtualized: boolean;
  cellRef: Ref<HTMLDivElement> | undefined;
  onFocusCell: () => void;
  onStartEdit: (sourceEvent?: unknown) => void;
  onCommitEdit: (value: unknown, sourceEvent?: unknown) => CellEditEvent<TData> | null;
  onCancelEdit: (sourceEvent?: unknown) => CellEditEvent<TData> | null;
  onPointerDownCell: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnterCell: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUpCell: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDownFillHandle: (event: PointerEvent<HTMLSpanElement>) => void;
  onToggleRowExpanded: () => void;
  onClickCell: (event: MouseEvent<HTMLDivElement>) => void;
}

function BodyCell<TData>(props: BodyCellProps<TData>) {
  const localization = useContext(GridLocalizationContext);
  const {
    grid,
    row,
    column,
    rowIndex,
    rowIndexOffset,
    columnIndex,
    focusedCell,
    editing,
    rangeSelected,
    fillHandleVisible,
    groupLabelCell,
    cellClassName,
    layout,
    beforeSpacerSize,
    afterSpacerSize,
    isColumnVirtualized,
    cellRef,
    onFocusCell,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    onPointerDownCell,
    onPointerEnterCell,
    onPointerUpCell,
    onPointerDownFillHandle,
    onToggleRowExpanded,
    onClickCell,
  } = props;
  const previousValue = row.getValue(column.id);
  const [draftValue, setDraftValue] = useState(() => getCellEditText(previousValue));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const cellElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const closingEditRef = useRef(false);
  const wasEditingRef = useRef(editing);

  useEffect(() => {
    if (editing) {
      closingEditRef.current = false;
      setValidationMessage(null);
      setDraftValue(getCellEditText(previousValue));
    }
  }, [editing, previousValue]);

  useLayoutEffect(() => {
    if (!editing) {
      return;
    }

    focusCellEditorElement(editorRef.current);
  }, [editing]);

  useEffect(() => {
    if (wasEditingRef.current && !editing && isFocusedCell(focusedCell, row.id, column.id)) {
      focusElement(cellElementRef.current);
    }

    wasEditingRef.current = editing;
  }, [column.id, editing, focusedCell, row.id]);

  const commit = (sourceEvent?: unknown) => {
    const event = onCommitEdit(parseCellEditValue(grid, row, column, draftValue), sourceEvent);
    setValidationMessage(getCellEditValidationMessage(event));
    closingEditRef.current = !event?.defaultPrevented;
  };

  const cancel = (sourceEvent?: unknown) => {
    const event = onCancelEdit(sourceEvent);
    setValidationMessage(null);
    closingEditRef.current = !event?.defaultPrevented;
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    stopEventPropagation(event);

    const editorAction = getCellEditorKeyboardAction(event);

    if (!editorAction) {
      return;
    }

    preventEventDefault(event);

    if (editorAction === "commit-edit") {
      commit(event);
    } else {
      cancel(event);
    }
  };

  return (
    <div
      ref={(element) => {
        cellElementRef.current = element;
        assignRef(cellRef, element);
      }}
      {...getCellProps(row, column, rowIndex, columnIndex, { focusedCell, editing, rangeSelected, rowIndexOffset })}
      {...getCellLayoutProps({ invalid: Boolean(validationMessage), pinnedEdge: layout.pinnedEdge })}
      className={["og-grid__cell", cellClassName].filter(Boolean).join(" ")}
      style={getColumnStyle(layout, isColumnVirtualized, layout.size, beforeSpacerSize, afterSpacerSize)}
      onFocus={onFocusCell}
      onPointerDown={onPointerDownCell}
      onPointerEnter={onPointerEnterCell}
      onPointerUp={onPointerUpCell}
      onDoubleClick={(event) => {
        if (getCanStartCellEdit(row, column)) {
          preventDefaultAndStopPropagation(event);
          onStartEdit(event);
        }
      }}
      onClick={onClickCell}
    >
      {fillHandleVisible ? (
        <span
          {...getCellFillHandleProps()}
          className="og-grid__fill-handle"
          onPointerDown={onPointerDownFillHandle}
        />
      ) : null}
      {editing && column.columnDef.editOptions ? (
        <select
          ref={(element) => {
            editorRef.current = element;
          }}
          className="og-grid__cell-editor"
          {...getCellEditorProps(column, { invalid: Boolean(validationMessage) }, localization)}
          value={draftValue}
          onChange={(event) => {
            setDraftValue(getCellEditorEventValue(event));
            setValidationMessage(null);
          }}
          onClick={(event) => stopEventPropagation(event)}
          onDoubleClick={(event) => stopEventPropagation(event)}
          onKeyDown={handleEditorKeyDown}
          onBlur={(event) => {
            if (!closingEditRef.current) {
              commit(event);
            }
          }}
        >
          {column.columnDef.editOptions.map((option) => (
            <option key={option.value} {...getCellEditorOptionProps(option)}>
              {getCellEditorOptionText(option)}
            </option>
          ))}
        </select>
      ) : editing ? (
        <input
          ref={(element) => {
            editorRef.current = element;
          }}
          className="og-grid__cell-editor"
          {...getCellEditorProps(column, { invalid: Boolean(validationMessage) }, localization)}
          value={draftValue}
          onChange={(event) => {
            setDraftValue(getCellEditorEventValue(event));
            setValidationMessage(null);
          }}
          onClick={(event) => stopEventPropagation(event)}
          onDoubleClick={(event) => stopEventPropagation(event)}
          onKeyDown={handleEditorKeyDown}
          onBlur={(event) => {
            if (!closingEditRef.current) {
              commit(event);
            }
          }}
        />
      ) : (
        groupLabelCell ? renderGroupCell(grid, row, column, onToggleRowExpanded, localization) : renderCell(grid, row, column)
      )}
      {editing && validationMessage ? (
        <span {...getCellValidationMessageProps()} className="og-grid__cell-validation">
          {validationMessage}
        </span>
      ) : null}
    </div>
  );
}

function renderGroupCell<TData>(
  grid: ReturnType<typeof useGrid<TData>>,
  row: Row<TData>,
  column: Column<TData, unknown>,
  onToggleRowExpanded: () => void,
  localization: GridLocalization,
): ReactNode {
  const expanded = grid.getIsRowExpanded(row.id);
  const fallback = row.getIsGroupFooter() || row.groupingColumnId ? undefined : renderCell(grid, row, column);
  const label = getGroupRowLabel(row, column, { fallback }, localization);
  const countText = getGroupRowCountText(row);

  return (
    <span className="og-grid__group-cell" style={getGroupCellIndentStyle(row)}>
      {row.getCanExpand() ? (
        <button
          {...getRowExpansionToggleProps(row, { expanded, label: String(label) }, localization)}
          className="og-grid__group-toggle"
          onPointerDown={(event) => {
            stopEventPropagation(event);
          }}
          onClick={(event) => {
            preventDefaultAndStopPropagation(event);
            onToggleRowExpanded();
          }}
        >
          {getRowExpansionToggleText(expanded)}
        </button>
      ) : (
        <span {...getRowExpansionSpacerProps()} className="og-grid__group-toggle-spacer" />
      )}
      <span className="og-grid__group-label">{label}</span>
      {countText ? <span className="og-grid__group-count">{countText}</span> : null}
    </span>
  );
}

function renderHeader<TData>(grid: ReturnType<typeof useGrid<TData>>, column: Column<TData, unknown>, header?: Header<TData>): ReactNode {
  const headerRenderer = column.columnDef.header;

  if (typeof headerRenderer === "function") {
    return headerRenderer({ grid, column, header }) as ReactNode;
  }

  return getColumnHeaderText(column);
}

function getColumnLabel<TData>(column: Column<TData, unknown>): ReactNode {
  return getColumnHeaderText(column);
}

function renderCell<TData>(
  grid: ReturnType<typeof useGrid<TData>>,
  row: Row<TData>,
  column: Column<TData, unknown>,
): ReactNode {
  const value = row.getValue(column.id);

  if (column.columnDef.cell) {
    return column.columnDef.cell({ grid, row, column, value }) as ReactNode;
  }

  return getCellDisplayText(value);
}

function assignRef<TValue>(ref: Ref<TValue> | undefined, value: TValue | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  (ref as { current: TValue | null }).current = value;
}

function getColumnStyle(
  layout: ColumnLayout | undefined,
  isColumnVirtualized = false,
  size = layout?.size ?? 0,
  beforeSpacerSize = 0,
  afterSpacerSize = 0,
): CSSProperties {
  const style: CSSProperties = {
    width: size,
    minWidth: size,
    maxWidth: size,
    ...(beforeSpacerSize > 0 ? { marginLeft: beforeSpacerSize } : {}),
    ...(afterSpacerSize > 0 ? { marginRight: afterSpacerSize } : {}),
  };

  if (!layout) {
    return style;
  }

  const pinnedOffsetStyle = getPinnedColumnOffsetStyle(layout);

  if (pinnedOffsetStyle) {
    Object.assign(style, pinnedOffsetStyle);
    style.zIndex = 2;
    style.background = "var(--og-surface)";
  }

  return style;
}

export function downloadExportFile(file: ExportFile): boolean {
  return downloadBrowserExportFile(file);
}

export { createColumnHelper, fitColumnsToWidth } from "@open-grid/core";
export {
  DEFAULT_GRID_LOCALIZATION,
  GRID_PREFERENCES_VERSION,
  createGridLocalization,
  createGridPreferences,
  getBrowserGridPreferencesStorage,
  parseGridPreferences,
  readGridPreferences,
  removeGridPreferences,
  serializeGridPreferences,
  writeGridPreferences,
} from "@open-grid/primitives";
export type { GridDensity, GridLocalization, GridLocalizationOverrides, GridPreferences, GridPreferencesOptions, GridPreferencesState, GridPreferencesStorageEnvironmentLike, GridPreferencesStorageLike } from "@open-grid/primitives";
export type {
  AccessorColumnOptions,
  AccessorFnColumnDef,
  AccessorKeyColumnDef,
  AnyColumnDef,
  ColumnFiltersState,
  ColumnDef,
  ColumnHelper,
  CellInteractionEvent,
  CellInteractionEventParams,
  CellContext,
  CellEditEvent,
  CellEditEventParams,
  CellEditHistoryAction,
  CellEditHistoryState,
  CellEditOption,
  CellEditPhase,
  CellEditParserContext,
  CellEditValidationContext,
  CellEditValidationResult,
  CellEditValidationState,
  CellEditingState,
  CellFillOptions,
  CellRange,
  CellRangeSelectionState,
  ClipboardCellContext,
  ClipboardCopyOptions,
  ClipboardPasteCellContext,
  ClipboardPasteCommittedCell,
  ClipboardPasteOptions,
  ClipboardPasteResult,
  ClipboardPasteSkippedCell,
  ClipboardPasteSkippedReason,
  ClipboardPasteValidationError,
  ColumnMovePosition,
  ColumnOrderState,
  ColumnPinningPosition,
  ColumnResizeEvent,
  ColumnResizeEventParams,
  ColumnResizePhase,
  DisplayColumnDef,
  ExpandedState,
  ExportFile,
  ExportFileOptions,
  FitColumnsToWidthOptions,
  GridCacheDiagnostics,
  GridCacheDiagnosticsEntry,
  GridCacheKey,
  GridOptions,
  GridState,
  GroupColumnDef,
  GroupingState,
  Header,
  HeaderContext,
  HeaderGroup,
  MoveFocusOptions,
  PaginationState,
  RowSelectionCleanupScope,
  RowInteractionEvent,
  RowInteractionEventParams,
  SortingState,
} from "@open-grid/core";
