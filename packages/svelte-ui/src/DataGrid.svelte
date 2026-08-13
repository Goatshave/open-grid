<script lang="ts">
  import type {
    CellContext,
    CellCoordinate,
    CellFillOptions,
    ClipboardPasteOptions,
    ClipboardPasteResult,
    Column,
    ColumnId,
    ColumnLayout,
    ColumnSizingState,
    Grid,
    GridOptions,
    Header,
    HeaderContext,
    HeaderGroup,
    Row,
  } from "@open-grid/core";
  import {
    addPointerMoveUpCancelListeners,
    addPointerMoveUpListeners,
    applyResizeObserverMeasuredSizes,
    createClickSuppressionController,
    createGridLocalization,
    createResizeObserver,
    disconnectResizeObserver,
    getCellEditorProps,
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
    focusCellEditorElement,
    focusElement,
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
    getGroupCellIndentStyleText,
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
    getHeaderActionMenuCustomItemUserProps,
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
    getInlineSizeStyleText,
    getPinnedColumnOffsetStyleText,
    getPointerCaptureTarget,
    getScrollForFocusedCell,
    getScrollFrameOptionsFromElement,
    getShouldPreventEventDefault,
    getVirtualBodyStyleText,
    getVirtualizedInlineSizeStyleText,
    getVirtualRowStyleText,
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
    focusFocusedCellInGrid,
    focusHeaderActionMenuItem,
    focusHeaderActionMenuItemById,
    focusHeaderActionMenuTriggerById,
    resolveColumnVirtualizationOptions,
    resolveRowVirtualizationOptions,
    getRowExpansionSpacerProps,
    getRowExpansionToggleProps,
    getRowExpansionToggleText,
    getRowById,
    getRowLayoutProps,
    getRowProps,
    getResizeObserverEntryBlockSize,
    getResizeObserverEntryInlineSize,
    getMeasuredElementBlockSize,
    getMeasuredElementBlockSizeFromRect,
    getMeasuredElementInlineSize,
    isGridInteractiveKeyboardEventTarget,
    moveColumnToTarget,
    moveGroupedColumn,
    moveVisibleColumn,
    observeElements,
    parseCellEditValue,
    readClipboardText,
    removeObservedElement,
    escapeGridHtml,
    replaceObservedElement,
    scrollElementToPosition,
    setCheckboxIndeterminate,
    setElementDatasetId,
    tryReleasePointerCapture,
    trySetPointerCapture,
    updatePointerDragDidMovePastThreshold,
    GRID_DENSITIES,
    type ColumnVirtualizationPrimitiveOptions,
    type GridDensity,
    type GridLocalization,
    type GridLocalizationOverrides,
    type ResolvedColumnVirtualizationOptions,
    type ResolvedRowVirtualizationOptions,
    type RowVirtualizationPrimitiveOptions,
    writeClipboardText,
  } from "@open-grid/primitives";
  import { createGridStore } from "@open-grid/svelte";
  import { createMeasuredSizeCache, createMeasuredSizeResolver, getColumnCellRenderItems, getColumnLayoutMeasurementSignature, getColumnRenderItems, getHeaderRenderItemKey, getHeaderRenderItems, getInitialScrollFrame, getMeasuredColumnLayoutFromCache, getScrollFrame, getSizedColumnLayout, getVirtualRowRange, getVirtualRowItems, isHeaderRenderSpacerItem, syncMeasuredColumnLayoutCache, type ColumnCellRenderItem, type ColumnRenderItem, type VirtualItem, type VirtualRange } from "@open-grid/virtual";
  import { onDestroy, onMount, tick } from "svelte";
  import RenderValue from "./RenderValue.svelte";

  export type RowVirtualizationOptions = RowVirtualizationPrimitiveOptions;

  export type ColumnVirtualizationOptions = ColumnVirtualizationPrimitiveOptions;

  export interface DataGridRenderContext<TData = unknown> {
    grid: Grid<TData>;
    rows: readonly Row<TData>[];
    visibleColumns: readonly Column<TData, unknown>[];
  }

  export interface DataGridErrorRenderContext<TData = unknown> extends DataGridRenderContext<TData> {
    retry: (() => void) | undefined;
  }

  export interface SvelteDataGridRenderer<TContext = unknown> {
    type: "open-grid:svelte-renderer";
    component: unknown;
    context: TContext;
    props?: Record<string, unknown>;
  }

  export type SvelteDataGridRenderValue<TContext = unknown> = string | number | boolean | null | undefined | SvelteDataGridRenderer<TContext>;

  export interface HeaderActionMenuActionItem<TData = unknown> {
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

  export interface HeaderActionMenuCustomItem<TData = unknown> {
    type: "custom";
    id: string;
    label?: string;
    component: unknown;
    props?: Record<string, unknown>;
  }

  export type HeaderActionMenuItem<TData = unknown> =
    | HeaderActionMenuActionItem<TData>
    | HeaderActionMenuLabelItem
    | HeaderActionMenuSeparatorItem
    | HeaderActionMenuCustomItem<TData>;

  type HeaderActionMenuCustomComponent = any;

  export interface HeaderActionMenuContext<TData = unknown> {
    grid: Grid<TData>;
    column: Column<TData, unknown>;
    sortDirection: "asc" | "desc" | false;
    pinningPosition: "left" | "right" | false;
    isGrouped: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    defaultItems: Array<HeaderActionMenuActionItem<TData>>;
  }

  export type HeaderActionMenuItems<TData = unknown> = (context: HeaderActionMenuContext<TData>) => Array<HeaderActionMenuItem<TData> | null | false | undefined>;

  export let ariaLabel: string | undefined = undefined;
  export let localization: GridLocalizationOverrides | undefined = undefined;
  export let options: GridOptions<unknown>;
  export let emptyState: unknown = undefined;
  export let error = false;
  export let errorState: unknown = undefined;
  export let onRetry: (() => void) | undefined = undefined;
  export let loading = false;
  export let loadingState: unknown = undefined;
  export let renderToolbar: ((context: DataGridRenderContext<unknown>) => SvelteDataGridRenderValue<DataGridRenderContext<unknown>>) | undefined = undefined;
  export let renderEmptyState: ((context: DataGridRenderContext<unknown>) => SvelteDataGridRenderValue<DataGridRenderContext<unknown>>) | undefined = undefined;
  export let renderLoadingState: ((context: DataGridRenderContext<unknown>) => SvelteDataGridRenderValue<DataGridRenderContext<unknown>>) | undefined = undefined;
  export let renderErrorState: ((context: DataGridErrorRenderContext<unknown>) => SvelteDataGridRenderValue<DataGridErrorRenderContext<unknown>>) | undefined = undefined;
  export let renderHeader: ((context: HeaderContext<unknown, unknown>) => SvelteDataGridRenderValue<HeaderContext<unknown, unknown>>) | undefined = undefined;
  export let renderCell: ((context: CellContext<unknown, unknown>) => SvelteDataGridRenderValue<CellContext<unknown, unknown>>) | undefined = undefined;
  export let onGridReady: ((grid: Grid<unknown>) => void | (() => void)) | undefined = undefined;
  export let getRowClassName: ((row: Row<unknown>) => string | undefined) | undefined = undefined;
  export let getHeaderClassName: ((context: HeaderContext<unknown, unknown>) => string | undefined) | undefined = undefined;
  export let getCellClassName: ((context: CellContext<unknown, unknown>) => string | undefined) | undefined = undefined;
  export let groupingPanel = false;
  export let quickFilterControl = false;
  export let rowSelectionControls = false;
  export let columnVisibilityControls = false;
  export let density: GridDensity | undefined = undefined;
  export let defaultDensity: GridDensity | undefined = undefined;
  export let densityControl = false;
  export let onDensityChange: ((density: GridDensity) => void) | undefined = undefined;
  export let columnFilterControls = false;
  export let paginationControls = false;
  export let pageSizeOptions: readonly number[] | undefined = undefined;
  export let columnPinningControls = false;
  export let headerActionMenu = false;
  export let headerActionMenuItems: HeaderActionMenuItems<unknown> | undefined = undefined;
  export let rowVirtualization: boolean | RowVirtualizationOptions = false;
  export let columnVirtualization: boolean | ColumnVirtualizationOptions = false;
  export let cellFillOptions: Omit<CellFillOptions, "sourceEvent"> | undefined = undefined;
  export let clipboardPasteOptions: Omit<ClipboardPasteOptions, "sourceEvent"> | undefined = undefined;
  export let onClipboardPaste: ((result: ClipboardPasteResult<unknown>) => void) | undefined = undefined;
  export let style: string | undefined = undefined;
  let className: string | undefined = undefined;
  export { className as class };

  const gridStore = createGridStore(options);
  const { grid, state } = gridStore;
  let scrollerElement: HTMLElement | null = null;
  let bodyElement: HTMLElement | null = null;
  let headerElement: HTMLElement | null = null;
  let groupingPanelElement: HTMLElement | null = null;
  let scrollFrame = getInitialScrollFrame();
  let allRows: Row<unknown>[] = [];
  let allColumns: Column<unknown, unknown>[] = [];
  let visibleColumns: Column<unknown, unknown>[] = [];
  let filteredVisibilityColumns: Column<unknown, unknown>[] = [];
  let columnVisibilityQuery = "";
  let uncontrolledDensity: GridDensity = defaultDensity ?? "standard";
  let resolvedDensity: GridDensity = density ?? uncontrolledDensity;
  let densitySizingEnabled = densityControl || density !== undefined || defaultDensity !== undefined;
  let measuredDensitySignature = "";
  let groupingColumns: Column<unknown, unknown>[] = [];
  let columnLayout: ColumnLayout[] = [];
  let sizedColumnLayout: ColumnLayout[] = [];
  let measuredColumnLayout: ColumnLayout[] = [];
  let layoutById = new Map<ColumnId, ColumnLayout>();
  let totalMeasuredWidth = 0;
  let rowVirtualOptions = resolveRowVirtualizationOptions(rowVirtualization);
  let columnVirtualOptions = resolveColumnVirtualizationOptions(columnVirtualization);
  const rowSizeCache = createMeasuredSizeCache();
  let rowSizeVersion = rowSizeCache.version;
  let rowSizeResolver: (index: number) => number = () => rowVirtualOptions.estimateRowHeight;
  let rowRangeEstimate: number | ((index: number) => number) = rowVirtualOptions.estimateRowHeight;
  let rowResizeObserver: ResizeObserver | null = null;
  const observedRowElements = new Map<string, HTMLElement>();
  const columnSizeCache = createMeasuredSizeCache();
  let columnSizeVersion = columnSizeCache.version;
  let columnResizeObserver: ResizeObserver | null = null;
  const observedColumnElements = new Map<string, HTMLElement>();
  let measuredCoreLayoutSignature = "";
  let coreColumnLayoutSignature = "";
  let virtualRange: VirtualRange | null = null;
  let visibleRowItems: Array<{ row: Row<unknown>; rowIndex: number; virtualItem: VirtualItem | null }> = [];
  let columnRenderItems: ColumnRenderItem[] = [];
  type ResolvedColumnCellRenderItem = ColumnCellRenderItem & {
    column: Column<unknown, unknown>;
    columnIndex: number;
  };

  let columnCellRenderItems: ResolvedColumnCellRenderItem[] = [];
  let simpleFocusedCellElement: HTMLElement | null = null;
  let simpleCellRendering = false;
  let deferDetailedCellRendering = false;
  let editDraft = "";
  let editValidationMessage: string | null = null;
  let headerMenuColumnId: ColumnId | null = null;
  let rangeDrag: { anchor: CellCoordinate; pointerId: number; didDrag: boolean } | null = null;
  let fillDrag: { pointerId: number; target: CellCoordinate } | null = null;
  let headerDrag: {
    sourceColumnId: string;
    targetColumnId: string;
    pointerId: number;
    startX: number;
    startY: number;
    didDrag: boolean;
  } | null = null;
  const cellClickSuppression = createClickSuppressionController();
  const headerClickSuppression = createClickSuppressionController();
  let shouldRestoreFocusedCell = false;
  let focusRestoreInProgress = false;
  let additionalHeaderRowCount = 0;
  let bodyRowIndexOffset = 0;
  let gridProps = getGridProps(grid, { ariaLabel, error, loading });
  let resolvedPageSizeOptions = getPaginationPageSizeOptions(pageSizeOptions, grid.getState().pagination.pageSize);
  let paginationPageText = getPaginationPageText(grid);
  let resolvedLocalization: GridLocalization = createGridLocalization(localization);
  let resolvedAriaLabel = resolvedLocalization.dataGridLabel;
  let resolvedEmptyState: unknown = resolvedLocalization.noRows;
  let resolvedErrorState: unknown = resolvedLocalization.gridError;
  let resolvedLoadingState: unknown = resolvedLocalization.loadingRows;
  let renderContext: DataGridRenderContext<unknown> = { grid, rows: [], visibleColumns: [] };
  let canPreviousPage = grid.getCanPreviousPage();
  let canNextPage = grid.getCanNextPage();
  let allPageRowsSelected = rowSelectionControls ? grid.getIsAllPageRowsSelected() : false;
  let somePageRowsSelected = rowSelectionControls ? grid.getIsSomePageRowsSelected() : false;
  let selectedRowCount = rowSelectionControls ? grid.getSelectedRowModel().rows.length : 0;
  let selectionCheckboxElement: HTMLInputElement | null = null;

  $: gridStore.setOptions(options, { notify: false });
  $: resolvedLocalization = createGridLocalization(localization);
  $: resolvedAriaLabel = ariaLabel ?? resolvedLocalization.dataGridLabel;
  $: resolvedEmptyState = emptyState ?? resolvedLocalization.noRows;
  $: resolvedErrorState = errorState ?? getGridErrorText(resolvedLocalization);
  $: resolvedLoadingState = loadingState ?? getGridLoadingText(resolvedLocalization);
  $: allRows = ($state, grid.getRowModel().rows);
  $: additionalHeaderRowCount = columnFilterControls ? 1 : 0;
  $: resolvedDensity = density ?? uncontrolledDensity;
  $: densitySizingEnabled = densityControl || density !== undefined || defaultDensity !== undefined;
  $: {
    const densitySignature = `${densitySizingEnabled}:${resolvedDensity}`;
    if (densitySignature !== measuredDensitySignature) {
      measuredDensitySignature = densitySignature;
      if (rowSizeCache.clear()) {
        rowSizeVersion = rowSizeCache.version;
      }
    }
  }
  $: gridProps = ($state, additionalHeaderRowCount, resolvedAriaLabel, error, loading, resolvedDensity, {
    ...getGridProps(grid, { additionalHeaderRowCount, ariaLabel: resolvedAriaLabel, error, loading }),
    ...(densitySizingEnabled ? getGridDensityProps(resolvedDensity) : {}),
  });
  $: resolvedPageSizeOptions = ($state.pagination.pageSize, pageSizeOptions, getPaginationPageSizeOptions(pageSizeOptions, $state.pagination.pageSize));
  $: paginationPageText = ($state.pagination, resolvedLocalization, getPaginationPageText(grid, resolvedLocalization));
  $: canPreviousPage = ($state.pagination.pageIndex, grid.getCanPreviousPage());
  $: canNextPage = ($state.pagination, grid.getCanNextPage());
  $: allPageRowsSelected = ($state.rowSelection, allRows, rowSelectionControls ? grid.getIsAllPageRowsSelected() : false);
  $: somePageRowsSelected = ($state.rowSelection, allRows, rowSelectionControls ? grid.getIsSomePageRowsSelected() : false);
  $: selectedRowCount = ($state.rowSelection, allRows, rowSelectionControls ? grid.getSelectedRowModel().rows.length : 0);
  $: setCheckboxIndeterminate(selectionCheckboxElement, somePageRowsSelected);
  $: bodyRowIndexOffset = ($state, additionalHeaderRowCount, getGridBodyRowIndexOffset(grid, { additionalHeaderRowCount }));
  $: allColumns = ($state, grid.getAllLeafColumns());
  $: visibleColumns = ($state, grid.getVisibleLeafColumns());
  $: renderContext = { grid, rows: allRows, visibleColumns };
  $: filteredVisibilityColumns = getFilteredColumnVisibilityColumns(allColumns, columnVisibilityQuery);
  $: groupingColumns = $state.grouping.flatMap((columnId) => {
    const column = getColumnById(columnId, grid.getAllLeafColumns());
    return column ? [column] : [];
  });
  $: columnLayout = ($state.columnSizing, $state.columnOrder, $state.columnPinning, grid.getColumnLayout());
  $: rowVirtualOptions = resolveRowVirtualizationOptions(rowVirtualization);
  $: columnVirtualOptions = resolveColumnVirtualizationOptions(columnVirtualization);
  $: sizedColumnLayout = getSizedColumnLayout(columnLayout, {
    getColumnSize: (columnId) => grid.getColumnSize(columnId),
    getFallbackSize: (columnId) => getColumnById(columnId, visibleColumns)?.getSize(),
  });
  $: coreColumnLayoutSignature = getColumnLayoutMeasurementSignature(sizedColumnLayout);
  $: {
    const syncResult = syncMeasuredColumnLayoutCache({
      cache: columnSizeCache,
      currentSignature: measuredCoreLayoutSignature,
      enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth,
      nextSignature: coreColumnLayoutSignature,
    });

    measuredCoreLayoutSignature = syncResult.signature;

    if (syncResult.changed) {
      columnSizeVersion = columnSizeCache.version;
    }
  }
  $: {
    columnSizeVersion;
    measuredColumnLayout = getMeasuredColumnLayoutFromCache(sizedColumnLayout, {
      cache: columnSizeCache,
      enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth && measuredCoreLayoutSignature === coreColumnLayoutSignature,
    });
  }
  $: layoutById = getColumnLayoutById(measuredColumnLayout);
  $: totalMeasuredWidth = getColumnLayoutTotalWidth(measuredColumnLayout);
  $: resolvedRowEstimate = densitySizingEnabled
    ? getGridDensityRowHeight(resolvedDensity)
    : rowVirtualOptions.estimateRowHeight;
  $: rowSizeResolver = rowVirtualOptions.measureRowHeight
    ? createMeasuredSizeResolver(rowSizeCache, (index) => allRows[index]?.id ?? index, resolvedRowEstimate)
    : () => resolvedRowEstimate;
  $: rowRangeEstimate = rowVirtualOptions.measureRowHeight ? rowSizeResolver : resolvedRowEstimate;
  $: if (rowVirtualOptions.measureRowHeight && rowSizeCache.prune(allRows.map((row) => row.id))) {
    rowSizeVersion = rowSizeCache.version;
  }
  $: if (columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth && columnSizeCache.prune(columnLayout.map((column) => column.id))) {
    columnSizeVersion = columnSizeCache.version;
  }
  $: virtualRange = getVirtualRowRange({
    count: allRows.length,
    scrollFrame,
    enabled: rowVirtualOptions.enabled,
    estimateSize: (rowSizeVersion, rowRangeEstimate),
    overscan: rowVirtualOptions.overscan,
  });
  $: visibleRowItems = getVirtualRowItems(allRows, virtualRange);
  $: columnRenderItems = getColumnRenderItems(measuredColumnLayout, scrollFrame, columnVirtualOptions);
  $: columnCellRenderItems = getColumnCellRenderItems(columnRenderItems).map((item) => {
    const column = getColumnById(item.layout.id, visibleColumns)!;

    return {
      ...item,
      column,
      columnIndex: getColumnIndexById(column.id, visibleColumns),
    };
  });
  $: simpleCellRendering = !$state.editingCell
    && (!$state.cellSelectionRange || deferDetailedCellRendering)
    && !renderCell
    && !visibleColumns.some((column) => typeof column.columnDef.cell === "function")
    && !visibleRowItems.some(({ row }) =>
    row.getIsGrouped() || row.getIsGroupFooter() || row.depth > 0 || row.getCanExpand(),
  );
  $: {
    const focusedCell = $state.focusedCell;
    const focusedRowIndex = focusedCell
      ? visibleRowItems.findIndex(({ row }) => row.id === focusedCell.rowId)
      : -1;
    const focusedColumnIndex = focusedCell
      ? columnCellRenderItems.findIndex(({ column }) => column.id === focusedCell.columnId)
      : -1;
    void tick().then(() => syncSimpleFocusedCell(
      bodyElement,
      simpleCellRendering,
      focusedRowIndex,
      focusedColumnIndex,
    ));
  }

  onMount(() => {
    const cleanupGridReady = onGridReady?.(grid);
    syncFrame();

    const updateHeaderDrag = (event: PointerEvent) => {
      if (!getCanContinuePointerDrag(headerDrag, event)) {
        return;
      }

      updatePointerDragDidMovePastThreshold(headerDrag, event);
    };

    const clearPointerDrags = (event: PointerEvent) => {
      const endingHeaderDrag = getCanEndPointerDrag(headerDrag, event) ? headerDrag : null;

      if (rangeDrag?.didDrag) {
        cellClickSuppression.suppress();
      }

      if (fillDrag) {
        grid.fillCellRange(fillDrag.target, { ...cellFillOptions, sourceEvent: event });
        cellClickSuppression.suppress();
      }

      const headerDragAction = endingHeaderDrag
        ? getHeaderDragEndAction(endingHeaderDrag, {
            event,
            groupingPanel: Boolean(groupingPanel),
            groupingPanelElement,
            columns: grid.getAllLeafColumns(),
          })
        : null;

      if (isHeaderDragGroupAction(headerDragAction)) {
        grid.toggleColumnGrouping(headerDragAction.columnId, true);
      } else if (isHeaderDragMoveAction(headerDragAction)) {
        moveColumnToTarget(grid, headerDragAction.sourceColumnId, headerDragAction.targetColumnId);
        headerClickSuppression.suppress();
      }

      if (rangeDrag && !rangeDrag.didDrag) {
        scheduleDetailedCellRendering();
      }
      rangeDrag = null;
      fillDrag = null;
      if (endingHeaderDrag) {
        headerDrag = null;
      }
    };

    const cleanupPointerListeners = addPointerMoveUpCancelListeners({
      move: updateHeaderDrag,
      up: clearPointerDrags,
      cancel: clearPointerDrags,
    });

    rowResizeObserver = createResizeObserver((entries) => {
      if (
        applyResizeObserverMeasuredSizes(entries, {
          cache: rowSizeCache,
          datasetKey: "rowId",
          getSize: getResizeObserverEntryBlockSize,
        })
      ) {
        rowSizeVersion = rowSizeCache.version;
      }
    });

    if (rowResizeObserver) {
      observeElements(rowResizeObserver, observedRowElements.values());
    }

    columnResizeObserver = createResizeObserver((entries) => {
      if (
        applyResizeObserverMeasuredSizes(entries, {
          cache: columnSizeCache,
          datasetKey: "columnId",
          getSize: getResizeObserverEntryInlineSize,
        })
      ) {
        columnSizeVersion = columnSizeCache.version;
      }
    });

    if (columnResizeObserver) {
      observeElements(columnResizeObserver, observedColumnElements.values());
    }

    return () => {
      cleanupGridReady?.();
      cleanupPointerListeners();
      disconnectResizeObserver(rowResizeObserver);
      rowResizeObserver = null;
      observedRowElements.clear();
      disconnectResizeObserver(columnResizeObserver);
      columnResizeObserver = null;
      observedColumnElements.clear();
    };
  });

  onDestroy(() => {
    gridStore.dispose();
  });

  const getResizeHandleProps = (
    column: Column<unknown, unknown>,
    layout: ColumnLayout | undefined,
    _columnSizing: ColumnSizingState,
  ) =>
    getColumnResizeHandleProps(column, {
      valueNow: layout?.size ?? grid.getColumnSize(column.id) ?? column.getSize(),
    }, resolvedLocalization);

  const getHeaderContent = (header: Header<unknown>): unknown => {
    const context = { grid, column: header.column, header } as HeaderContext<unknown, unknown>;
    const value = renderHeader?.(context) ?? (typeof header.column.columnDef.header === "function"
      ? header.column.columnDef.header(context)
      : header.column.columnDef.header);
    return value ?? getColumnHeaderText(header.column);
  };
  const getCanUseCompactHeaderRendering = (
    headerGroup: HeaderGroup<unknown>,
    pinningControls: boolean,
    actionMenu: boolean,
  ) => !pinningControls && !actionMenu && headerGroup.headers.every((header) =>
    !header.isPlaceholder && header.column.columns.length === 0,
  );
  const getColumnLabel = (column: Column<unknown, unknown>) => {
    return getColumnHeaderText(column);
  };
  const handleColumnFilterInput = (column: Column<unknown, unknown>, event: Event) => {
    const value = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : "";
    grid.setState((previous) => ({
      ...previous,
      columnFilters: getNextColumnFilters(previous.columnFilters, column.id, value),
      pagination: { ...previous.pagination, pageIndex: 0 },
    }));
  };
  const resetPaginationScroll = () => {
    if (scrollerElement) {
      scrollElementToPosition(scrollerElement, { scrollTop: 0, scrollLeft: scrollerElement.scrollLeft });
      syncFrame();
    }
  };
  const setQuickFilter = (value: string) => {
    grid.setState((previous) => ({
      ...previous,
      globalFilter: value,
      pagination: { ...previous.pagination, pageIndex: 0 },
    }));
    resetPaginationScroll();
  };
  const handleQuickFilterInput = (event: Event) => {
    setQuickFilter(event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : "");
  };
  const runPaginationAction = (action: () => void) => {
    action();
    resetPaginationScroll();
  };

  const setDensity = (nextDensity: GridDensity) => {
    if (density === undefined) {
      uncontrolledDensity = nextDensity;
    }
    onDensityChange?.(nextDensity);
  };
  const handlePageSizeChange = (event: Event) => {
    const pageSize = event.currentTarget instanceof HTMLSelectElement ? Number(event.currentTarget.value) : 1;
    grid.setPageSize(pageSize);
    resetPaginationScroll();
  };

  const getCellValue = (row: Row<unknown>, column: Column<unknown, unknown>) => {
    const value = row.getValue(column.id);
    return getCellDisplayText(value);
  };
  const getCellContent = (row: Row<unknown>, column: Column<unknown, unknown>): unknown => {
    const context = { grid, row, column, value: row.getValue(column.id) } as CellContext<unknown, unknown>;
    return renderCell?.(context) ?? column.columnDef.cell?.(context) ?? getCellValue(row, column);
  };
  const getGroupLabel = (row: Row<unknown>, column: Column<unknown, unknown>) =>
    getGroupRowLabel(row, column, { fallback: getCellValue(row, column) }, resolvedLocalization);
  const getColumnStyle = (
    size: number,
    layout: ColumnLayout | undefined,
    _columnSizing: ColumnSizingState,
    beforeSpacerSize = 0,
    afterSpacerSize = 0,
  ) => {
    const declarations = [`flex: 0 0 ${size}px`, `width: ${size}px`];
    if (beforeSpacerSize > 0) declarations.push(`margin-left: ${beforeSpacerSize}px`);
    if (afterSpacerSize > 0) declarations.push(`margin-right: ${afterSpacerSize}px`);
    const pinnedOffsetStyle = getPinnedColumnOffsetStyleText(layout);

    if (pinnedOffsetStyle) {
      declarations.push(pinnedOffsetStyle);
    }

    return declarations.join("; ");
  };
  const getSimpleCellsHtml = (
    row: Row<unknown>,
    rowIndex: number,
    items: readonly ResolvedColumnCellRenderItem[],
    columnSizing: ColumnSizingState,
    rowIndexOffset: number,
    cellClassName: typeof getCellClassName,
  ) => items.map((item) => {
    const { column } = item;
    const pinned = column.getIsPinned();
    const pinnedEdge = item.layout.pinnedEdge;
    const className = ["og-grid__cell", cellClassName?.({ grid, row, column, value: row.getValue(column.id) })].filter(Boolean).join(" ");
    const style = getColumnStyle(item.layout.size, item.layout, columnSizing, item.beforeSpacerSize, item.afterSpacerSize);

    return `<div role="gridcell" aria-colindex="${item.columnIndex + 1}" data-row-id="${escapeGridHtml(row.id)}" data-column-id="${escapeGridHtml(column.id)}"${pinned ? ` data-pinned="${pinned}"` : ""} tabindex="-1"${pinnedEdge ? ` data-pinned-edge="${pinnedEdge}"` : ""} class="${escapeGridHtml(className)}" style="${escapeGridHtml(style)}">${escapeGridHtml(getCellValue(row, column))}</div>`;
  }).join("");
  const syncSimpleFocusedCell = (
    body: HTMLElement | null,
    enabled: boolean,
    rowIndex: number,
    columnIndex: number,
  ) => {
    if (!body) {
      simpleFocusedCellElement = null;
      return;
    }

    if (!enabled) {
      simpleFocusedCellElement = null;
      return;
    }

    const previousFocusedCell = body.contains(simpleFocusedCellElement) ? simpleFocusedCellElement : null;
    const nextFocusedCell = rowIndex < 0 || columnIndex < 0
      ? null
      : body.children[rowIndex]?.children[columnIndex] as HTMLElement | undefined ?? null;

    if (previousFocusedCell && previousFocusedCell !== nextFocusedCell) {
      previousFocusedCell.tabIndex = -1;
      previousFocusedCell.removeAttribute("data-focused");
    }
    if (nextFocusedCell) {
      nextFocusedCell.tabIndex = 0;
      nextFocusedCell.setAttribute("data-focused", "true");
    }
    simpleFocusedCellElement = nextFocusedCell;
  };
  const syncFrame = () => {
    if (!scrollerElement) {
      return;
    }

    if (getShouldCancelFocusedCellRestoreOnFrameSync({ inProgress: focusRestoreInProgress })) {
      shouldRestoreFocusedCell = false;
    }

    scrollFrame = getScrollFrame(
      getScrollFrameOptionsFromElement(scrollerElement, {
        stickyTopOffset: getElementOffsetBlockSize(headerElement, 42),
      }),
    );
  };

  const restoreFocusedCell = async (
    focusedCell: CellCoordinate | null,
    _rowSizeVersion: number,
    _scrollTop: number,
    _scrollLeft: number,
    layout: readonly ColumnLayout[],
    rows: readonly Row<unknown>[],
    currentRowVirtualOptions: ResolvedRowVirtualizationOptions,
    currentColumnVirtualOptions: ResolvedColumnVirtualizationOptions,
  ) => {
    if (
      !getCanRestoreFocusedCell({
        focusedCell,
        scroller: scrollerElement,
        shouldRestore: shouldRestoreFocusedCell,
        inProgress: focusRestoreInProgress,
      })
    ) {
      return;
    }

    if (!focusedCell || !scrollerElement) {
      return;
    }

    focusRestoreInProgress = true;

    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const nextScroll = getScrollForFocusedCell(
          getFocusedCellScrollOptionsFromElement(scrollerElement, {
            focusedCell,
            layout,
            rows,
            headerHeight: getElementOffsetBlockSize(headerElement, 42),
            getRowSize: rowSizeResolver,
            rowVirtualOptions: currentRowVirtualOptions,
            columnVirtualOptions: currentColumnVirtualOptions,
          }),
        );

        if (nextScroll) {
          scrollElementToPosition(scrollerElement, nextScroll);
          scrollFrame = getScrollFrame(
            getScrollFrameOptionsFromElement(scrollerElement, {
              scrollTop: nextScroll.scrollTop,
              scrollLeft: nextScroll.scrollLeft,
              stickyTopOffset: getElementOffsetBlockSize(headerElement, 42),
            }),
          );
        }

        await tick();

        if (focusFocusedCellInGrid(scrollerElement)) {
          shouldRestoreFocusedCell = false;
          break;
        }

        if (!nextScroll) {
          break;
        }
      }
    } finally {
      focusRestoreInProgress = false;
    }
  };

  const scheduleFocusedCellRestore = () => {
    shouldRestoreFocusedCell = true;
    void tick().then(() =>
      restoreFocusedCell(
        $state.focusedCell,
        rowSizeVersion,
        scrollFrame.scrollTop,
        scrollFrame.scrollLeft,
        measuredColumnLayout,
        allRows,
        rowVirtualOptions,
        columnVirtualOptions,
      ),
    );
  };

  const moveFocusWithRestore = (direction: Parameters<Grid<unknown>["moveFocus"]>[0], options?: Parameters<Grid<unknown>["moveFocus"]>[1]) => {
    grid.moveFocus(direction, options);
    scheduleFocusedCellRestore();
  };

  const focusEditor = (node: HTMLInputElement | HTMLSelectElement) => {
    focusCellEditorElement(node);

    return {};
  };

  const measureVirtualRow = (element: HTMLElement, rowId: string) => {
    let currentRowId = rowId;

    if (!rowVirtualOptions.enabled || !rowVirtualOptions.measureRowHeight) {
      return;
    }

    const observe = () => {
      replaceObservedElement(rowResizeObserver, observedRowElements, currentRowId, element);

      if (rowSizeCache.set(currentRowId, getMeasuredElementBlockSizeFromRect(element))) {
        rowSizeVersion = rowSizeCache.version;
      }
    };

    const unobserve = () => {
      removeObservedElement(rowResizeObserver, observedRowElements, currentRowId);
    };

    observe();

    return {
      update(nextRowId: string) {
        if (nextRowId === currentRowId) {
          return;
        }

        unobserve();
        currentRowId = nextRowId;
        observe();
      },
      destroy() {
        unobserve();
      },
    };
  };

  const measureVirtualColumn = (element: HTMLElement, options: { columnId: string; enabled: boolean }) => {
    let currentColumnId = options.columnId;
    let currentEnabled = options.enabled;

    const observe = () => {
      if (!currentEnabled) {
        return;
      }

      setElementDatasetId(element, "columnId", currentColumnId);
      replaceObservedElement(columnResizeObserver, observedColumnElements, currentColumnId, element);

      if (columnSizeCache.set(currentColumnId, getMeasuredElementInlineSize(element))) {
        columnSizeVersion = columnSizeCache.version;
      }
    };

    const unobserve = () => {
      removeObservedElement(columnResizeObserver, observedColumnElements, currentColumnId);
    };

    observe();

    return {
      update(nextOptions: { columnId: string; enabled: boolean }) {
        if (nextOptions.columnId === currentColumnId && nextOptions.enabled === currentEnabled) {
          return;
        }

        unobserve();
        currentColumnId = nextOptions.columnId;
        currentEnabled = nextOptions.enabled;
        observe();
      },
      destroy() {
        unobserve();
      },
    };
  };

  const handleGridKeyDown = (event: KeyboardEvent) => {
    if (isGridInteractiveKeyboardEventTarget(event)) {
      return;
    }

    const shortcutAction = getGridKeyboardShortcutAction(event);
    const focusMove = getGridKeyboardFocusMove(event);
    const editAction = getGridKeyboardEditAction(event);
    const focusedCell = $state.focusedCell;
    const editingCell = $state.editingCell;
    const canRunShortcut = getCanRunGridKeyboardShortcut(editingCell);

    if (editAction === "start-edit" && getCanStartFocusedCellEdit(focusedCell, editingCell)) {
      preventEventDefault(event);
      shouldRestoreFocusedCell = false;
      startCellEdit(focusedCell.rowId, focusedCell.columnId, event);
    } else if (editAction === "cancel-edit" && getCanCancelCellEdit(editingCell)) {
      preventEventDefault(event);
      editValidationMessage = null;
      grid.cancelCellEdit(event);
      scheduleFocusedCellRestore();
    } else if (shortcutAction === "copy" && canRunShortcut) {
      const clipboardText = grid.getClipboardText();

      if (clipboardText) {
        preventEventDefault(event);
        void writeClipboardText(clipboardText);
      }
    } else if (shortcutAction === "paste" && canRunShortcut) {
      preventEventDefault(event);
      void readClipboardText().then((clipboardText) => {
        if (clipboardText) {
          const result = grid.pasteClipboardText(clipboardText, { ...clipboardPasteOptions, sourceEvent: event });
          onClipboardPaste?.(result);
          scheduleFocusedCellRestore();
        }
      });
    } else if (shortcutAction === "undo-edit" && canRunShortcut && grid.getCanUndoCellEdit()) {
      preventEventDefault(event);
      grid.undoCellEdit(event);
      scheduleFocusedCellRestore();
    } else if (shortcutAction === "redo-edit" && canRunShortcut && grid.getCanRedoCellEdit()) {
      preventEventDefault(event);
      grid.redoCellEdit(event);
      scheduleFocusedCellRestore();
    } else if (shortcutAction === "row-selection" && canRunShortcut) {
      const rowSelectionTarget = getFocusedRowSelectionTarget(allRows, focusedCell);

      if (rowSelectionTarget) {
        preventEventDefault(event);
        const { row, rowIndex } = rowSelectionTarget;
        const rowEvent = grid.emitRowEvent({ type: "keydown", row, rowIndex, sourceEvent: event });

        if (getCanToggleRowSelection(rowEvent)) {
          grid.toggleRowSelected(row.id);
        }
      }
    } else if (focusMove) {
      preventEventDefault(event);
      moveFocusWithRestore(focusMove.direction, focusMove.options);
    }
  };

  const handleRowClick = (row: Row<unknown>, rowIndex: number, event: MouseEvent) => {
    const rowEvent = grid.emitRowEvent({ type: "click", row, rowIndex, sourceEvent: event });

    if (getCanToggleRowSelection(rowEvent)) {
      grid.toggleRowSelected(row.id);
    }
  };

  const handleCellClick = (
    row: Row<unknown>,
    rowIndex: number,
    column: Column<unknown, unknown>,
    columnIndex: number,
    event: MouseEvent,
  ) => {
    deferDetailedCellRendering = false;
    scheduleFocusedCellRestore();

    if (cellClickSuppression.consume(event)) {
      return;
    }

    const cellEvent = grid.emitCellEvent({ type: "click", row, rowIndex, column, columnIndex, sourceEvent: event });

    if (getShouldPreventEventDefault(cellEvent)) {
      preventEventDefault(event);
    }
  };

  const getSimpleRowEventContext = (event: Event) => {
    const bodyElement = event.currentTarget;
    const target = event.target;

    if (!(bodyElement instanceof HTMLElement) || !(target instanceof Element)) {
      return null;
    }

    const rowElement = target.closest<HTMLElement>(".og-grid__row");
    const rowId = rowElement?.dataset.rowId;
    if (!rowElement || rowElement.parentElement !== bodyElement || !rowId) {
      return null;
    }

    return visibleRowItems.find(({ row }) => row.id === rowId) ?? null;
  };

  const getSimpleCellEventContext = (event: Event) => {
    const rowItem = getSimpleRowEventContext(event);
    const target = event.target;
    if (!rowItem || !(target instanceof Element)) {
      return null;
    }

    const cell = target.closest<HTMLElement>(".og-grid__cell");
    const columnId = cell?.dataset.columnId;
    const columnItem = columnId
      ? columnCellRenderItems.find(({ column }) => column.id === columnId)
      : undefined;
    if (!cell || !columnItem) {
      return null;
    }

    return { cell, ...columnItem, ...rowItem };
  };

  const handleSimpleBodyFocusIn = (event: FocusEvent) => {
    if (!simpleCellRendering) return;
    const context = getSimpleCellEventContext(event);
    if (context) {
      grid.setFocusedCell({ rowId: context.row.id, columnId: context.column.id });
    }
  };

  const handleSimpleBodyPointerDown = (event: PointerEvent) => {
    if (!simpleCellRendering) return;
    const context = getSimpleCellEventContext(event);
    if (context) {
      handleCellPointerDown({ rowId: context.row.id, columnId: context.column.id }, event);
    }
  };

  const handleSimpleBodyPointerOver = (event: PointerEvent) => {
    if (!simpleCellRendering) return;
    const context = getSimpleCellEventContext(event);
    const relatedCell = event.relatedTarget instanceof Element
      ? event.relatedTarget.closest<HTMLElement>(".og-grid__cell")
      : null;

    if (context && context.cell !== relatedCell) {
      handleCellPointerEnter({ rowId: context.row.id, columnId: context.column.id }, event);
    }
  };

  const handleSimpleBodyPointerUp = (event: PointerEvent) => {
    if (simpleCellRendering) handleCellPointerUp(event);
  };

  const handleSimpleBodyClick = (event: MouseEvent) => {
    if (!simpleCellRendering) return;
    const context = getSimpleCellEventContext(event);
    if (context) {
      handleCellClick(context.row, context.rowIndex, context.column, context.columnIndex, event);
      handleRowClick(context.row, context.rowIndex, event);
      return;
    }

    const rowContext = getSimpleRowEventContext(event);
    if (rowContext) {
      handleRowClick(rowContext.row, rowContext.rowIndex, event);
    }
  };

  const handleSimpleBodyDoubleClick = (event: MouseEvent) => {
    if (!simpleCellRendering) return;
    const context = getSimpleCellEventContext(event);
    if (context) {
      handleCellDoubleClick(context.row, context.column, event);
    }
  };

  const handleCellPointerDown = (coordinate: CellCoordinate, event: PointerEvent) => {
    if (!getCanStartCellPointerDrag(event, $state.editingCell)) {
      return;
    }

    deferDetailedCellRendering = simpleCellRendering;
    rangeDrag = { anchor: coordinate, pointerId: event.pointerId, didDrag: false };
    grid.selectCellRange(coordinate);
  };

  const handleCellPointerEnter = (coordinate: CellCoordinate, event: PointerEvent) => {
    if (getCanContinuePointerDrag(fillDrag, event)) {
      fillDrag.target = coordinate;
    }

    if (!getCanContinuePointerDrag(rangeDrag, event)) {
      return;
    }

    if (!isCellCoordinateEqual(rangeDrag.anchor, coordinate)) {
      rangeDrag.didDrag = true;
      deferDetailedCellRendering = false;
    }

    grid.selectCellRange(rangeDrag.anchor, coordinate);
  };

  const handleCellPointerUp = (event: PointerEvent) => {
    if (!getCanEndPointerDrag(rangeDrag, event)) {
      return;
    }

    if (rangeDrag.didDrag) {
      cellClickSuppression.suppress();
    } else {
      scheduleDetailedCellRendering();
    }

    rangeDrag = null;
  };

  const scheduleDetailedCellRendering = () => {
    setTimeout(() => {
      deferDetailedCellRendering = false;
    }, 0);
  };

  const handleFillPointerDown = (coordinate: CellCoordinate, event: PointerEvent) => {
    if (!getCanStartCellPointerDrag(event, $state.editingCell)) {
      return;
    }

    preventDefaultAndStopPropagation(event);
    fillDrag = { pointerId: event.pointerId, target: coordinate };
  };

  const getFillHandleVisible = (row: Row<unknown>, column: Column<unknown, unknown>, editing: boolean, rangeSelected: boolean) => {
    const selectedCoordinates = grid.getSelectedCellCoordinates();
    const fillHandleCoordinate = selectedCoordinates[selectedCoordinates.length - 1];

    return getCellFillHandleVisible(row, column, {
      activeEditing: Boolean($state.editingCell),
      editing,
      fillHandleCoordinate,
      rangeSelected,
    });
  };

  const handleCellDoubleClick = (
    row: Row<unknown>,
    column: Column<unknown, unknown>,
    event: MouseEvent,
  ) => {
    if (!getCanStartCellEdit(row, column)) {
      return;
    }

    preventDefaultAndStopPropagation(event);
    startCellEdit(row.id, column.id, event);
  };

  const startCellEdit = (rowId: string, columnId: string, sourceEvent?: unknown) => {
    const row = getRowById(rowId, grid.getRowModel().rows);
    const column = getColumnById(columnId, grid.getVisibleLeafColumns());

    if (!row || !column) {
      return;
    }

    editDraft = getCellEditText(row.getValue(column.id));
    editValidationMessage = null;
    grid.startCellEdit(rowId, columnId, sourceEvent);
  };

  const commitCellEdit = (row: Row<unknown>, column: Column<unknown, unknown>, sourceEvent?: unknown) => {
    const event = grid.commitCellEdit(parseCellEditValue(grid, row, column, editDraft), sourceEvent);
    editValidationMessage = getCellEditValidationMessage(event);

    if (event && !event.defaultPrevented) {
      scheduleFocusedCellRestore();
    }
  };

  const handleResizePointerDown = (column: Column<unknown, unknown>, columnIndex: number, event: PointerEvent) => {
    preventDefaultAndStopPropagation(event);

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

    const handlePointerMove = (moveEvent: PointerEvent) => {
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
        grid.setColumnSize(column.id, resizeEvent.size);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
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

  const handleResizeKeyDown = (column: Column<unknown, unknown>, columnIndex: number, event: KeyboardEvent) => {
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
      grid.setColumnSize(column.id, finalSize);
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

  const handleHeaderButtonKeyDown = (column: Column<unknown, unknown>, event: KeyboardEvent) => {
    const direction = getHeaderKeyboardMoveDirection(event);

    if (!direction) {
      return;
    }

    preventDefaultAndStopPropagation(event);
    moveVisibleColumn(grid, column.id, direction);
  };

  const getHeaderMenuId = (columnId: ColumnId) => getHeaderActionMenuId(columnId);

  const getHeaderActionMenu = (
    column: Column<unknown, unknown>,
    sortDirection: "asc" | "desc" | false,
    pinningPosition: "left" | "right" | false,
    isGrouped: boolean,
    canMoveLeft: boolean,
    canMoveRight: boolean,
  ) => {
    const defaultItems = getHeaderActionMenuDefaultItemDescriptors({
      sortDirection,
      pinningPosition,
      isGrouped,
      canGroup: column.getCanGroup(),
      canMoveLeft,
      canMoveRight,
    }, resolvedLocalization).map((descriptor): HeaderActionMenuActionItem<unknown> => {
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
        return { ...descriptor, onSelect: () => moveVisibleColumn(grid, column.id, "left") };
      }
      if (descriptor.id === "move-right") {
        return { ...descriptor, onSelect: () => moveVisibleColumn(grid, column.id, "right") };
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
    const context: HeaderActionMenuContext<unknown> = {
      grid,
      column,
      sortDirection,
      pinningPosition,
      isGrouped,
      canMoveLeft,
      canMoveRight,
      defaultItems,
    };

    return {
      context,
      items: (headerActionMenuItems ? headerActionMenuItems(context) : defaultItems).filter(isHeaderActionMenuItem),
    };
  };

  const runHeaderMenuAction = (item: HeaderActionMenuActionItem<unknown>, context: HeaderActionMenuContext<unknown>) => {
    item.onSelect(context);
    headerMenuColumnId = null;
  };

  const getHeaderActionMenuCustomComponent = (item: HeaderActionMenuItem<unknown>): HeaderActionMenuCustomComponent | undefined =>
    isHeaderActionMenuCustomItem(item) ? item.component : undefined;

  const handleHeaderPointerDown = (column: Column<unknown, unknown>, event: PointerEvent) => {
    if (!isPrimaryPointerButton(event)) {
      return;
    }

    headerDrag = {
      sourceColumnId: column.id,
      targetColumnId: column.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      didDrag: false,
    };
  };

  const handleHeaderPointerEnter = (column: Column<unknown, unknown>, event: PointerEvent) => {
    if (!getCanContinuePointerDrag(headerDrag, event)) {
      return;
    }

    headerDrag.targetColumnId = column.id;
  };

  const handleHeaderClick = (column: Column<unknown, unknown>, canSort: boolean, event: MouseEvent) => {
    if (headerClickSuppression.consume(event)) {
      return;
    }

    if (canSort) {
      grid.toggleColumnSorting(column.id, undefined, event.shiftKey);
    }
  };

</script>

{#if renderToolbar}
  <div class="og-grid__toolbar-slot"><RenderValue value={renderToolbar(renderContext)} /></div>
{/if}
{#if quickFilterControl || rowSelectionControls || columnVisibilityControls || densityControl}
  <div class="og-grid__controls">
    {#if rowSelectionControls}
      <div {...getRowSelectionControlsProps(resolvedLocalization)} class="og-grid__selection-controls">
        <label class="og-grid__selection-toggle">
          <input
            {...getRowSelectionCheckboxProps({ allSelected: allPageRowsSelected, someSelected: somePageRowsSelected, disabled: allRows.length === 0 }, resolvedLocalization)}
            bind:this={selectionCheckboxElement}
            on:change={() => grid.toggleAllPageRowsSelected(!allPageRowsSelected)}
          />
          <span>{getRowSelectionCheckboxText(resolvedLocalization)}</span>
        </label>
        <span {...getRowSelectionStatusProps()} class="og-grid__selection-status">{getRowSelectionStatusText(selectedRowCount, resolvedLocalization)}</span>
        <button {...getRowSelectionClearButtonProps(selectedRowCount === 0, resolvedLocalization)} class="og-grid__selection-clear" on:click={() => grid.resetRowSelection()}>{getRowSelectionClearButtonText(resolvedLocalization)}</button>
      </div>
    {/if}
    {#if columnVisibilityControls}
      <details {...getColumnVisibilityControlsProps(resolvedLocalization)} class="og-grid__column-visibility">
        <summary {...getColumnVisibilitySummaryProps(visibleColumns.length, allColumns.length, resolvedLocalization)} class="og-grid__column-visibility-summary">
          {getColumnVisibilitySummaryText(visibleColumns.length, allColumns.length, resolvedLocalization)}
        </summary>
        <div class="og-grid__column-visibility-panel">
          <input
            {...getColumnVisibilitySearchInputProps(columnVisibilityQuery, resolvedLocalization)}
            class="og-grid__column-visibility-search"
            on:input={(event) => (columnVisibilityQuery = event.currentTarget.value)}
          />
          <span {...getColumnVisibilityStatusProps()} class="og-grid__column-visibility-status">
            {getColumnVisibilityStatusText(visibleColumns.length, allColumns.length, resolvedLocalization)}
          </span>
          <div {...getColumnVisibilityListProps(resolvedLocalization)} class="og-grid__column-visibility-list">
            {#if filteredVisibilityColumns.length > 0}
              {#each filteredVisibilityColumns as column (column.id)}
                {@const label = getColumnHeaderText(column)}
                {@const visible = grid.getIsColumnVisible(column.id)}
                <label class="og-grid__column-visibility-item">
                  <input
                    {...getColumnVisibilityCheckboxProps({
                      columnId: column.id,
                      label,
                      visible,
                      visibleCount: visibleColumns.length,
                    })}
                    on:change={(event) => grid.toggleColumnVisibility(column.id, event.currentTarget.checked)}
                  />
                  <span>{label}</span>
                </label>
              {/each}
            {:else}
              <span class="og-grid__column-visibility-empty">{getColumnVisibilityEmptyText(resolvedLocalization)}</span>
            {/if}
          </div>
          <button
            {...getColumnVisibilityResetButtonProps(allColumns.length - visibleColumns.length, resolvedLocalization)}
            class="og-grid__column-visibility-reset"
            on:click={() => grid.resetColumnVisibility()}
          >{getColumnVisibilityResetButtonText(resolvedLocalization)}</button>
        </div>
      </details>
    {/if}
    {#if densityControl}
      <div {...getDensityControlsProps(resolvedLocalization)} class="og-grid__density-controls">
        {#each GRID_DENSITIES as densityOption (densityOption)}
          <button
            {...getDensityButtonProps(densityOption, resolvedDensity, resolvedLocalization)}
            class="og-grid__density-button"
            on:click={() => setDensity(densityOption)}
          >{getDensityButtonText(densityOption, resolvedLocalization)}</button>
        {/each}
      </div>
    {/if}
    {#if quickFilterControl}
      <div {...getQuickFilterProps(resolvedLocalization)} class="og-grid__quick-filter">
        <input {...getQuickFilterInputProps({ value: $state.globalFilter }, resolvedLocalization)} class="og-grid__quick-filter-input" on:input={handleQuickFilterInput} />
        <button {...getQuickFilterClearButtonProps($state.globalFilter, resolvedLocalization)} class="og-grid__quick-filter-clear" on:click={() => setQuickFilter("")}>{getQuickFilterClearButtonText(resolvedLocalization)}</button>
      </div>
    {/if}
  </div>
{/if}
<div
  class={["og-grid", className].filter(Boolean).join(" ")}
  data-density={densitySizingEnabled ? resolvedDensity : undefined}
  {style}
>
  {#if groupingPanel}
    <div
      bind:this={groupingPanelElement}
      {...getGroupingPanelProps({ empty: groupingColumns.length === 0 }, resolvedLocalization)}
      class="og-grid__grouping-panel"
    >
      {#if groupingColumns.length === 0}
        <span {...getGroupingPanelPlaceholderProps()} class="og-grid__grouping-placeholder">{resolvedLocalization.groupingPanelEmpty}</span>
      {:else}
        {#each groupingColumns as column, index (column.id)}
          <span {...getGroupingPanelChipProps(column)} class="og-grid__grouping-chip">
            <span class="og-grid__grouping-chip-label">{getColumnLabel(column)}</span>
            <button
              {...getGroupingPanelMoveButtonProps(column, { direction: "left", disabled: index === 0 }, resolvedLocalization)}
              class="og-grid__grouping-move"
              on:click={() => moveGroupedColumn(grid, groupingColumns, column.id, "left")}
            >
              {"<"}
            </button>
            <button
              {...getGroupingPanelMoveButtonProps(column, { direction: "right", disabled: index === groupingColumns.length - 1 }, resolvedLocalization)}
              class="og-grid__grouping-move"
              on:click={() => moveGroupedColumn(grid, groupingColumns, column.id, "right")}
            >
              {">"}
            </button>
            <button
              {...getGroupingPanelRemoveButtonProps(column, resolvedLocalization)}
              class="og-grid__grouping-remove"
              on:click={() => grid.toggleColumnGrouping(column.id, false)}
            >
              x
            </button>
          </span>
        {/each}
      {/if}
    </div>
  {/if}
  <div {...gridProps} class="og-grid__scroller" role="grid" tabindex="0" bind:this={scrollerElement} on:keydown={handleGridKeyDown} on:scroll={syncFrame}>
    <div class="og-grid__canvas" style={getInlineSizeStyleText(totalMeasuredWidth)}>
      <div {...getGridHeaderProps()} class="og-grid__header" bind:this={headerElement}>
        {#each grid.getHeaderGroups() as headerGroup, headerRowIndex (headerGroup.id)}
          <div
            {...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: headerRowIndex })}
            class="og-grid__row og-grid__row--header"
            style={getVirtualizedInlineSizeStyleText(totalMeasuredWidth, columnVirtualOptions.enabled)}
          >
            {#if getCanUseCompactHeaderRendering(headerGroup, columnPinningControls, headerActionMenu)}
              {#each getHeaderRenderItems(headerGroup, columnRenderItems, layoutById) as item (getHeaderRenderItemKey(headerGroup.id, item))}
                {#if isHeaderRenderSpacerItem(item)}
                  <div {...getColumnSpacerProps()} class="og-grid__column-spacer" style={getInlineSizeStyleText(item.size)}></div>
                {:else}
                  {@const header = item.header}
                  {@const firstLeafId = item.leafColumnIds[0]}
                  {@const columnIndex = getColumnIndexById(firstLeafId, visibleColumns)}
                  {@const layout = layoutById.get(firstLeafId)}
                  {@const canSort = header.column.getCanSort()}
                  {@const sortDirection = grid.getColumnSortDirection(header.column.id)}
                  <div
                    {...getHeaderCellProps(grid, header.column, Math.max(0, columnIndex), { pinned: layout?.pinned ?? false })}
                    {...getHeaderCellLayoutProps({
                      colSpan: item.leafColumnIds.length,
                      rowSpan: header.rowSpan,
                      grouped: false,
                      placeholder: false,
                      pinnedEdge: layout?.pinnedEdge,
                      draggable: true,
                    })}
                    class={["og-grid__header-cell", getHeaderClassName?.({ grid, column: header.column, header })].filter(Boolean).join(" ")}
                    style={getColumnStyle(item.size, layout, $state.columnSizing)}
                    use:measureVirtualColumn={{ columnId: header.column.id, enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth }}
                    on:pointerdown={(event) => handleHeaderPointerDown(header.column, event)}
                    on:pointerenter={(event) => handleHeaderPointerEnter(header.column, event)}
                  ><button
                    {...getHeaderButtonProps({ disabled: false })}
                    class="og-grid__header-button"
                    on:click={(event) => handleHeaderClick(header.column, canSort, event)}
                    on:keydown={(event) => handleHeaderButtonKeyDown(header.column, event)}
                  ><span class="og-grid__header-label"><RenderValue value={getHeaderContent(header)} /></span><span {...getHeaderSortIndicatorProps()} class="og-grid__sort-indicator">{getHeaderSortIndicatorText(sortDirection, { visible: true })}</span></button><!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions --><span
                    {...getResizeHandleProps(header.column, layout, $state.columnSizing)}
                    class="og-grid__resize-handle"
                    role="separator"
                    tabindex="0"
                    on:keydown={(event) => handleResizeKeyDown(header.column, Math.max(0, columnIndex), event)}
                    on:pointerdown={(event) => handleResizePointerDown(header.column, Math.max(0, columnIndex), event)}
                  ></span></div>
                {/if}
              {/each}
            {:else}
            {#each getHeaderRenderItems(headerGroup, columnRenderItems, layoutById) as item (getHeaderRenderItemKey(headerGroup.id, item))}
              {#if isHeaderRenderSpacerItem(item)}
                <div {...getColumnSpacerProps()} class="og-grid__column-spacer" style={getInlineSizeStyleText(item.size)}></div>
              {:else}
              {@const header = item.header}
              {@const firstLeafId = item.leafColumnIds[0]}
              {@const columnIndex = firstLeafId ? getColumnIndexById(firstLeafId, visibleColumns) : 0}
              {@const layout = firstLeafId ? layoutById.get(firstLeafId) : undefined}
              {@const canInteract = !header.isPlaceholder && header.column.columns.length === 0}
              {@const canSort = canInteract && header.column.getCanSort()}
              {@const sortDirection = grid.getColumnSortDirection(header.column.id)}
              {@const pinningPosition = layout?.pinned ?? false}
              {@const canMoveLeft = columnIndex > 0}
              {@const canMoveRight = columnIndex >= 0 && columnIndex < visibleColumns.length - 1}
              {@const isGrouped = $state.grouping.includes(header.column.id)}
              {@const menuId = getHeaderMenuId(header.column.id)}
              {@const menuTriggerId = getHeaderActionMenuTriggerId(header.column.id)}
              {@const headerMenu = getHeaderActionMenu(header.column, sortDirection, pinningPosition, isGrouped, canMoveLeft, canMoveRight)}
              <div
                {...(header.isPlaceholder
                  ? getHeaderPlaceholderCellProps(header.column)
                  : getHeaderCellProps(grid, header.column, Math.max(0, columnIndex), { pinned: layout?.pinned ?? false }))}
                {...getHeaderCellLayoutProps({
                  colSpan: item.leafColumnIds.length,
                  rowSpan: header.rowSpan,
                  grouped: header.column.columns.length > 0,
                  placeholder: header.isPlaceholder,
                  pinnedEdge: layout?.pinnedEdge,
                  draggable: canInteract,
                })}
                class={["og-grid__header-cell", getHeaderClassName?.({ grid, column: header.column, header })].filter(Boolean).join(" ")}
                style={getColumnStyle(item.size, layout, $state.columnSizing)}
                use:measureVirtualColumn={{ columnId: header.column.id, enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth && canInteract }}
                on:pointerdown={(event) => {
                  if (canInteract) {
                    handleHeaderPointerDown(header.column, event);
                  }
                }}
                on:pointerenter={(event) => {
                  if (canInteract) {
                    handleHeaderPointerEnter(header.column, event);
                  }
                }}
              >
                {#if !header.isPlaceholder}
                  <button
                    {...getHeaderButtonProps({ disabled: !canInteract })}
                    class="og-grid__header-button"
                    on:click={(event) => handleHeaderClick(header.column, canSort, event)}
                    on:keydown={(event) => handleHeaderButtonKeyDown(header.column, event)}
                  >
                    <span class="og-grid__header-label"><RenderValue value={getHeaderContent(header)} /></span>
                    <span {...getHeaderSortIndicatorProps()} class="og-grid__sort-indicator">
                      {getHeaderSortIndicatorText(sortDirection, { visible: canInteract })}
                    </span>
                  </button>
                  {#if canInteract && columnPinningControls}
                    <span {...getColumnPinningControlsProps(header.column, resolvedLocalization)} class="og-grid__pinning-controls">
                      <button
                        {...getColumnPinningButtonProps(header.column, { position: "left", active: pinningPosition === "left" }, resolvedLocalization)}
                        class="og-grid__pinning-button"
                        on:pointerdown|stopPropagation={() => undefined}
                        on:click|stopPropagation={() => grid.pinColumn(header.column.id, "left")}
                      >
                        {getColumnPinningButtonText("left")}
                      </button>
                      <button
                        {...getColumnPinningButtonProps(header.column, { position: false, active: pinningPosition === false }, resolvedLocalization)}
                        class="og-grid__pinning-button"
                        on:pointerdown|stopPropagation={() => undefined}
                        on:click|stopPropagation={() => grid.pinColumn(header.column.id, false)}
                      >
                        {getColumnPinningButtonText(false)}
                      </button>
                      <button
                        {...getColumnPinningButtonProps(header.column, { position: "right", active: pinningPosition === "right" }, resolvedLocalization)}
                        class="og-grid__pinning-button"
                        on:pointerdown|stopPropagation={() => undefined}
                        on:click|stopPropagation={() => grid.pinColumn(header.column.id, "right")}
                      >
                        {getColumnPinningButtonText("right")}
                      </button>
                    </span>
                  {/if}
                  {#if canInteract && headerActionMenu}
                    <span class="og-grid__header-menu">
                      <button
                        {...getHeaderActionMenuTriggerProps(header.column, { expanded: headerMenuColumnId === header.column.id, controls: menuId }, resolvedLocalization)}
                        id={menuTriggerId}
                        class="og-grid__header-menu-trigger"
                        on:pointerdown|stopPropagation={() => undefined}
                        on:click|stopPropagation={() => {
                          headerMenuColumnId = headerMenuColumnId === header.column.id ? null : header.column.id;
                        }}
                        on:keydown={(event) => {
                          const focusPosition = getHeaderActionMenuTriggerFocusPosition(event);

                          if (!focusPosition) {
                            return;
                          }

                          preventDefaultAndStopPropagation(event);
                          headerMenuColumnId = header.column.id;
                          void tick().then(() => focusHeaderActionMenuItemById(document, menuId, focusPosition));
                        }}
                      >
                        {resolvedLocalization.headerActionMenuTrigger}
                      </button>
                      {#if headerMenuColumnId === header.column.id}
                        <div
                          {...getHeaderActionMenuProps(header.column, resolvedLocalization)}
                          class="og-grid__header-menu-popover"
                          id={menuId}
                          role="menu"
                          tabindex="-1"
                          on:pointerdown|stopPropagation={() => undefined}
                          on:keydown={(event) => {
                            const menuAction = getHeaderActionMenuKeyboardAction(event);

                            if (!menuAction) {
                              return;
                            }

                            if (isHeaderActionMenuCloseAction(menuAction)) {
                              preventDefaultAndStopPropagation(event);
                              headerMenuColumnId = null;
                              void tick().then(() => focusHeaderActionMenuTriggerById(document, menuTriggerId));
                            } else if (isHeaderActionMenuFocusAction(menuAction)) {
                              preventDefaultAndStopPropagation(event);
                              focusHeaderActionMenuItem(getHeaderActionMenuFocusTarget(event), menuAction.position);
                            } else if (isHeaderActionMenuTabCloseAction(menuAction)) {
                              headerMenuColumnId = null;
                            }
                          }}
                        >
                          {#each headerMenu.items as item (item.id)}
                            {#if isHeaderActionMenuActionItem(item)}
                              <button
                                {...getHeaderActionMenuItemProps({ disabled: item.disabled })}
                                on:click={() => runHeaderMenuAction(item, headerMenu.context)}
                              >
                                {item.label}
                              </button>
                            {:else if isHeaderActionMenuCustomItem(item)}
                              {@const CustomHeaderMenuItem = getHeaderActionMenuCustomComponent(item)}
                              <span {...getHeaderActionMenuCustomItemProps({ label: item.label })} class="og-grid__header-menu-custom">
                                {#if CustomHeaderMenuItem}
                                  <svelte:component this={CustomHeaderMenuItem} {...getHeaderActionMenuCustomItemUserProps(item)} context={headerMenu.context} />
                                {/if}
                              </span>
                            {:else if isHeaderActionMenuLabelItem(item)}
                              <span {...getHeaderActionMenuLabelProps()} class="og-grid__header-menu-label">{item.label}</span>
                            {:else if isHeaderActionMenuSeparatorItem(item)}
                              <span {...getHeaderActionMenuSeparatorProps({ label: item.label })} class="og-grid__header-menu-separator"></span>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </span>
                  {/if}
                  {#if canInteract}
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
                    <span
                      {...getResizeHandleProps(header.column, layout, $state.columnSizing)}
                      class="og-grid__resize-handle"
                      role="separator"
                      tabindex="0"
                      on:keydown={(event) => handleResizeKeyDown(header.column, Math.max(0, columnIndex), event)}
                      on:pointerdown={(event) => handleResizePointerDown(header.column, Math.max(0, columnIndex), event)}
                    ></span>
                  {/if}
                {/if}
              </div>
              {/if}
            {/each}
            {/if}
          </div>
        {/each}
        {#if columnFilterControls}
          <div
            {...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: grid.getHeaderGroups().length })}
            class="og-grid__row og-grid__row--filter"
            style={getVirtualizedInlineSizeStyleText(totalMeasuredWidth, columnVirtualOptions.enabled)}
          >
            {#each columnCellRenderItems as { layout, beforeSpacerSize, afterSpacerSize, column, columnIndex } (layout.id)}
              <div
                {...getColumnFilterCellProps(column, {
                  columnIndex,
                  rowIndex: grid.getHeaderGroups().length,
                  pinned: layout.pinned,
                  pinnedEdge: layout.pinnedEdge,
                })}
                class="og-grid__filter-cell"
                style={getColumnStyle(layout.size, layout, $state.columnSizing, beforeSpacerSize, afterSpacerSize)}
              >
                {#if column.getCanFilter()}
                  <input
                    {...getColumnFilterInputProps(column, {
                      label: getColumnHeaderText(column),
                      value: getColumnFilterText($state.columnFilters, column.id),
                    }, resolvedLocalization)}
                    class="og-grid__filter-input"
                    on:input={(event) => handleColumnFilterInput(column, event)}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div
        {...getGridBodyProps({ virtualized: rowVirtualOptions.enabled, columnOrder: $state.columnOrder })}
        class="og-grid__body"
        role="rowgroup"
        bind:this={bodyElement}
        style={getVirtualBodyStyleText(virtualRange)}
        on:focusin={handleSimpleBodyFocusIn}
        on:pointerdown={handleSimpleBodyPointerDown}
        on:pointerover={handleSimpleBodyPointerOver}
        on:pointerup={handleSimpleBodyPointerUp}
        on:click={handleSimpleBodyClick}
        on:dblclick={handleSimpleBodyDoubleClick}
      >
        {#if allRows.length === 0}
          <div {...getGridEmptyRowProps({ rowIndexOffset: bodyRowIndexOffset })} class="og-grid__empty">
            <div {...getGridEmptyCellProps({ rowIndexOffset: bodyRowIndexOffset, columnCount: visibleColumns.length })} class="og-grid__empty-cell" style={getInlineSizeStyleText(totalMeasuredWidth)}><RenderValue value={renderEmptyState?.(renderContext) ?? resolvedEmptyState} /></div>
          </div>
        {:else if simpleCellRendering}
          {#each visibleRowItems as { row, rowIndex, virtualItem } (row.id)}
            <div
              {...getRowProps(row, rowIndex, { selected: grid.getIsRowSelected(row.id), rowIndexOffset: bodyRowIndexOffset })}
              {...getRowLayoutProps(row, {
                expanded: grid.getIsRowExpanded(row.id),
                virtualIndex: virtualItem?.index,
                columnVirtualized: columnVirtualOptions.enabled,
              })}
              class={["og-grid__row", getRowClassName?.(row)].filter(Boolean).join(" ")}
              role="row"
              style={getVirtualRowStyleText(virtualItem)}
              use:measureVirtualRow={row.id}
            >{@html getSimpleCellsHtml(row, rowIndex, columnCellRenderItems, $state.columnSizing, bodyRowIndexOffset, getCellClassName)}</div>
          {/each}
        {:else}
          {#each visibleRowItems as { row, rowIndex, virtualItem } (row.id)}
            <!-- svelte-ignore a11y-interactive-supports-focus -->
            <div
              {...getRowProps(row, rowIndex, { selected: grid.getIsRowSelected(row.id), rowIndexOffset: bodyRowIndexOffset })}
              {...getRowLayoutProps(row, {
                expanded: grid.getIsRowExpanded(row.id),
                virtualIndex: virtualItem?.index,
                columnVirtualized: columnVirtualOptions.enabled,
              })}
              class={["og-grid__row", getRowClassName?.(row)].filter(Boolean).join(" ")}
              role="row"
              style={getVirtualRowStyleText(virtualItem)}
              use:measureVirtualRow={row.id}
              on:click={(event) => handleRowClick(row, rowIndex, event)}
            >
                {#each columnCellRenderItems as { layout, beforeSpacerSize, afterSpacerSize, column, columnIndex } (layout.id)}
                  {@const editing = grid.getIsCellEditing(row.id, column.id)}
                  {@const rangeSelected = grid.getIsCellRangeSelected(row.id, column.id)}
                  {@const groupLabelCell = getIsGroupLabelCell(row, column, visibleColumns)}
                  {@const fillHandleVisible = getFillHandleVisible(row, column, editing, rangeSelected)}
                  <div
                    {...getCellProps(row, column, rowIndex, columnIndex, { focusedCell: $state.focusedCell, editing, rangeSelected, rowIndexOffset: bodyRowIndexOffset })}
                    {...getCellLayoutProps({ invalid: Boolean(editing && editValidationMessage), pinnedEdge: layout.pinnedEdge })}
                    class={["og-grid__cell", getCellClassName?.({ grid, row, column, value: row.getValue(column.id) })].filter(Boolean).join(" ")}
                    role="gridcell"
                    tabindex={isCellCoordinateEqual($state.focusedCell, { rowId: row.id, columnId: column.id }) ? 0 : -1}
                    style={getColumnStyle(layout.size, layout, $state.columnSizing, beforeSpacerSize, afterSpacerSize)}
                    on:focus={() => grid.setFocusedCell({ rowId: row.id, columnId: column.id })}
                    on:pointerdown={(event) => handleCellPointerDown({ rowId: row.id, columnId: column.id }, event)}
                    on:pointerenter={(event) => handleCellPointerEnter({ rowId: row.id, columnId: column.id }, event)}
                    on:pointerup={handleCellPointerUp}
                    on:click={(event) => handleCellClick(row, rowIndex, column, columnIndex, event)}
                    on:dblclick={(event) => handleCellDoubleClick(row, column, event)}
                  >
                    {#if fillHandleVisible}
                      <span
                        {...getCellFillHandleProps()}
                        class="og-grid__fill-handle"
                        on:pointerdown={(event) => handleFillPointerDown({ rowId: row.id, columnId: column.id }, event)}
                      ></span>
                    {/if}
                    {#if editing}
                      {#if column.columnDef.editOptions}
                        <select
                          {...getCellEditorProps(column, { invalid: Boolean(editValidationMessage) }, resolvedLocalization)}
                          use:focusEditor
                          class="og-grid__cell-editor"
                          bind:value={editDraft}
                          on:change={() => {
                            editValidationMessage = null;
                          }}
                          on:click|stopPropagation
                          on:dblclick|stopPropagation
                          on:keydown={(event) => {
                            stopEventPropagation(event);

                            const editorAction = getCellEditorKeyboardAction(event);

                            if (!editorAction) {
                              return;
                            }

                            preventEventDefault(event);

                            if (editorAction === "commit-edit") {
                              commitCellEdit(row, column, event);
                            } else {
                              editValidationMessage = null;
                              grid.cancelCellEdit(event);
                              scheduleFocusedCellRestore();
                            }
                          }}
                          on:blur={(event) => {
                            if (grid.getIsCellEditing(row.id, column.id)) {
                              commitCellEdit(row, column, event);
                            }
                          }}
                        >
                          {#each column.columnDef.editOptions as option}
                            <option {...getCellEditorOptionProps(option)}>{getCellEditorOptionText(option)}</option>
                          {/each}
                        </select>
                      {:else}
                        <input
                          {...getCellEditorProps(column, { invalid: Boolean(editValidationMessage) }, resolvedLocalization)}
                          use:focusEditor
                          class="og-grid__cell-editor"
                          bind:value={editDraft}
                          on:input={() => {
                            editValidationMessage = null;
                          }}
                          on:click|stopPropagation
                          on:dblclick|stopPropagation
                          on:keydown={(event) => {
                            stopEventPropagation(event);

                            const editorAction = getCellEditorKeyboardAction(event);

                            if (!editorAction) {
                              return;
                            }

                            preventEventDefault(event);

                            if (editorAction === "commit-edit") {
                              commitCellEdit(row, column, event);
                            } else {
                              editValidationMessage = null;
                              grid.cancelCellEdit(event);
                              scheduleFocusedCellRestore();
                            }
                          }}
                          on:blur={(event) => {
                            if (grid.getIsCellEditing(row.id, column.id)) {
                              commitCellEdit(row, column, event);
                            }
                          }}
                        />
                      {/if}
                      {#if editValidationMessage}
                        <span {...getCellValidationMessageProps()} class="og-grid__cell-validation">{editValidationMessage}</span>
                      {/if}
                    {:else if groupLabelCell}
                      {@const groupCountText = getGroupRowCountText(row)}
                      <span class="og-grid__group-cell" style={getGroupCellIndentStyleText(row)}>
                        {#if row.getCanExpand()}
                          <button
                            {...getRowExpansionToggleProps(row, { expanded: grid.getIsRowExpanded(row.id), label: String(getGroupLabel(row, column)) }, resolvedLocalization)}
                            class="og-grid__group-toggle"
                            on:pointerdown|stopPropagation
                            on:click={(event) => {
                              preventDefaultAndStopPropagation(event);
                              grid.toggleRowExpanded(row.id);
                            }}
                          >
                            {getRowExpansionToggleText(grid.getIsRowExpanded(row.id))}
                          </button>
                        {:else}
                          <span {...getRowExpansionSpacerProps()} class="og-grid__group-toggle-spacer"></span>
                        {/if}
                        <span class="og-grid__group-label">{getGroupLabel(row, column)}</span>
                        {#if groupCountText}
                          <span class="og-grid__group-count">{groupCountText}</span>
                        {/if}
                      </span>
                    {:else}
                      <RenderValue value={getCellContent(row, column)} />
                    {/if}
                  </div>
                {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
  {#if error}
    <div {...getGridErrorOverlayProps(resolvedLocalization)} class="og-grid__status-overlay og-grid__error-overlay">
      <span class="og-grid__status-text"><RenderValue value={renderErrorState?.({ ...renderContext, retry: onRetry }) ?? resolvedErrorState} /></span>
      {#if onRetry}
        <button {...getGridErrorRetryButtonProps(resolvedLocalization)} class="og-grid__retry-button" on:click={onRetry}>{getGridErrorRetryButtonText(resolvedLocalization)}</button>
      {/if}
    </div>
  {:else if loading}
    <div {...getGridLoadingOverlayProps(resolvedLocalization)} class="og-grid__status-overlay og-grid__loading-overlay">
      <span class="og-grid__loading-spinner" aria-hidden="true"></span>
      <span class="og-grid__status-text"><RenderValue value={renderLoadingState?.(renderContext) ?? resolvedLoadingState} /></span>
    </div>
  {/if}
</div>
{#if paginationControls}
  <nav {...getPaginationProps(resolvedLocalization)} class="og-grid__pagination">
    <div class="og-grid__pagination-buttons">
      <button {...getPaginationButtonProps({ action: "first", disabled: !canPreviousPage }, resolvedLocalization)} class="og-grid__pagination-button" on:click={() => runPaginationAction(() => grid.firstPage())}>{getPaginationButtonText("first")}</button>
      <button {...getPaginationButtonProps({ action: "previous", disabled: !canPreviousPage }, resolvedLocalization)} class="og-grid__pagination-button" on:click={() => runPaginationAction(() => grid.previousPage())}>{getPaginationButtonText("previous")}</button>
      <span {...getPaginationStatusProps()} class="og-grid__pagination-status">{paginationPageText}</span>
      <button {...getPaginationButtonProps({ action: "next", disabled: !canNextPage }, resolvedLocalization)} class="og-grid__pagination-button" on:click={() => runPaginationAction(() => grid.nextPage())}>{getPaginationButtonText("next")}</button>
      <button {...getPaginationButtonProps({ action: "last", disabled: !canNextPage }, resolvedLocalization)} class="og-grid__pagination-button" on:click={() => runPaginationAction(() => grid.lastPage())}>{getPaginationButtonText("last")}</button>
    </div>
    <select {...getPaginationPageSizeSelectProps($state.pagination.pageSize, resolvedLocalization)} class="og-grid__pagination-size" on:change={handlePageSizeChange}>
      {#each resolvedPageSizeOptions as pageSize (pageSize)}
        <option value={pageSize}>{getPaginationPageSizeOptionText(pageSize, resolvedLocalization)}</option>
      {/each}
    </select>
  </nav>
{/if}
