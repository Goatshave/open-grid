import type {
  CellFillOptions,
  CellContext,
  CellCoordinate,
  CellEditEvent,
  ClipboardPasteOptions,
  ClipboardPasteResult,
  Column,
  ColumnId,
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
  applyResizeObserverMeasuredSizes,
  createClickSuppressionController,
  createGridLocalization,
  createResizeObserver,
  disconnectResizeObserver,
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
  focusCellEditorElement,
  focusElement,
  focusFocusedCellInGrid,
  focusHeaderActionMenuItemById,
  focusHeaderActionMenuTriggerById,
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
  focusHeaderActionMenuItem,
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
  isMeasuredBlockRectElementTarget,
  isMeasuredInlineDatasetElementTarget,
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
  setElementDatasetId,
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
import { createColumnHelper, useGrid } from "@open-grid/vue";
import { createMeasuredSizeCache, createMeasuredSizeResolver, getColumnCellRenderItems, getColumnLayoutMeasurementSignature, getColumnRenderItems, getHeaderRenderItemKey, getHeaderRenderItems, getInitialScrollFrame, getMeasuredColumnLayoutFromCache, getScrollFrame, getSizedColumnLayout, getVirtualRowRange, getVirtualRowItems, isHeaderRenderSpacerItem, syncMeasuredColumnLayoutCache, type VirtualItem } from "@open-grid/virtual";
import { defineComponent, Fragment, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type DefineComponent, type PropType, type Ref, type VNode, type VNodeChild } from "vue";

type RenderableValue = string | number | boolean | VNode | RenderableValue[];

interface CellRangeDragHandlers {
  onPointerDown: (coordinate: CellCoordinate, event: PointerEvent) => void;
  onPointerEnter: (coordinate: CellCoordinate, event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onFillPointerDown: (coordinate: CellCoordinate, event: PointerEvent) => void;
  onClick: (event: MouseEvent) => boolean;
}

interface HeaderDragHandlers {
  onPointerDown: (columnId: string, event: PointerEvent) => void;
  onPointerEnter: (columnId: string, event: PointerEvent) => void;
  onClick: () => boolean;
}

export interface DataGridRenderContext<TData> {
  grid: Grid<TData>;
  rows: readonly Row<TData>[];
  visibleColumns: readonly Column<TData, unknown>[];
}

export interface DataGridErrorRenderContext<TData> extends DataGridRenderContext<TData> {
  retry: (() => void) | undefined;
}

export interface DataGridProps<TData> {
  ariaLabel?: string;
  localization?: GridLocalizationOverrides;
  options: GridOptions<TData>;
  emptyState?: VNodeChild;
  error?: boolean;
  errorState?: VNodeChild;
  onRetry?: () => void;
  loading?: boolean;
  loadingState?: VNodeChild;
  renderToolbar?: (context: DataGridRenderContext<TData>) => VNodeChild;
  renderEmptyState?: (context: DataGridRenderContext<TData>) => VNodeChild;
  renderLoadingState?: (context: DataGridRenderContext<TData>) => VNodeChild;
  renderErrorState?: (context: DataGridErrorRenderContext<TData>) => VNodeChild;
  renderHeader?: (context: HeaderContext<TData, unknown>) => VNodeChild;
  renderCell?: (context: CellContext<TData, unknown>) => VNodeChild;
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
  style?: unknown;
  class?: unknown;
}

export type DataGridComponent<TData> = DefineComponent<DataGridProps<TData>>;

export type GridReadyHandler<TData> = (grid: Grid<TData>) => void | (() => void);

export type RowVirtualizationOptions = RowVirtualizationPrimitiveOptions;

export type ColumnVirtualizationOptions = ColumnVirtualizationPrimitiveOptions;

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
  render: (context: HeaderActionMenuContext<TData>) => VNodeChild;
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

export const DataGrid = defineComponent({
  name: "OpenGridDataGrid",
  inheritAttrs: false,
  props: {
    ariaLabel: {
      type: String,
      default: undefined,
    },
    localization: {
      type: Object as PropType<GridLocalizationOverrides>,
      default: undefined,
    },
    options: {
      type: Object as PropType<GridOptions<unknown>>,
      required: true,
    },
    emptyState: {
      type: [String, Number, Object, Array] as PropType<VNodeChild>,
      default: undefined,
    },
    error: {
      type: Boolean,
      default: false,
    },
    errorState: {
      type: [String, Number, Object, Array] as PropType<VNodeChild>,
      default: undefined,
    },
    onRetry: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    loadingState: {
      type: [String, Number, Object, Array] as PropType<VNodeChild>,
      default: undefined,
    },
    renderToolbar: {
      type: Function as PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>,
      default: undefined,
    },
    renderEmptyState: {
      type: Function as PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>,
      default: undefined,
    },
    renderLoadingState: {
      type: Function as PropType<(context: DataGridRenderContext<unknown>) => VNodeChild>,
      default: undefined,
    },
    renderErrorState: {
      type: Function as PropType<(context: DataGridErrorRenderContext<unknown>) => VNodeChild>,
      default: undefined,
    },
    renderHeader: {
      type: Function as PropType<(context: HeaderContext<unknown, unknown>) => VNodeChild>,
      default: undefined,
    },
    renderCell: {
      type: Function as PropType<(context: CellContext<unknown, unknown>) => VNodeChild>,
      default: undefined,
    },
    onGridReady: {
      type: Function as PropType<GridReadyHandler<unknown>>,
      default: undefined,
    },
    getRowClassName: {
      type: Function as PropType<(row: Row<unknown>) => string | undefined>,
      default: undefined,
    },
    getHeaderClassName: {
      type: Function as PropType<(context: HeaderContext<unknown, unknown>) => string | undefined>,
      default: undefined,
    },
    getCellClassName: {
      type: Function as PropType<(context: CellContext<unknown, unknown>) => string | undefined>,
      default: undefined,
    },
    groupingPanel: {
      type: Boolean,
      default: false,
    },
    quickFilterControl: {
      type: Boolean,
      default: false,
    },
    rowSelectionControls: {
      type: Boolean,
      default: false,
    },
    columnVisibilityControls: {
      type: Boolean,
      default: false,
    },
    density: {
      type: String as PropType<GridDensity>,
      default: undefined,
    },
    defaultDensity: {
      type: String as PropType<GridDensity>,
      default: undefined,
    },
    densityControl: {
      type: Boolean,
      default: false,
    },
    onDensityChange: {
      type: Function as PropType<(density: GridDensity) => void>,
      default: undefined,
    },
    columnFilterControls: {
      type: Boolean,
      default: false,
    },
    paginationControls: {
      type: Boolean,
      default: false,
    },
    pageSizeOptions: {
      type: Array as PropType<readonly number[]>,
      default: undefined,
    },
    columnPinningControls: {
      type: Boolean,
      default: false,
    },
    headerActionMenu: {
      type: Boolean,
      default: false,
    },
    headerActionMenuItems: {
      type: Function as PropType<HeaderActionMenuItems<unknown>>,
      default: undefined,
    },
    rowVirtualization: {
      type: [Boolean, Object] as PropType<boolean | RowVirtualizationOptions>,
      default: false,
    },
    columnVirtualization: {
      type: [Boolean, Object] as PropType<boolean | ColumnVirtualizationOptions>,
      default: false,
    },
    cellFillOptions: {
      type: Object as PropType<Omit<CellFillOptions, "sourceEvent">>,
      default: undefined,
    },
    onClipboardPaste: {
      type: Function as PropType<(result: ClipboardPasteResult<unknown>) => void>,
      default: undefined,
    },
    clipboardPasteOptions: {
      type: Object as PropType<Omit<ClipboardPasteOptions, "sourceEvent">>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const { grid, state } = useGrid(() => props.options);
    const scrollerRef = ref<HTMLElement | null>(null);
    const headerRef = ref<HTMLElement | null>(null);
    const groupingPanelRef = ref<HTMLElement | null>(null);
    const headerMenuColumnId = ref<ColumnId | null>(null);
    const rowSizeCache = createMeasuredSizeCache();
    const rowSizeVersion = ref(rowSizeCache.version);
    const observedRowElements = new Map<string, Element>();
    let rowResizeObserver: ResizeObserver | null = null;
    const columnSizeCache = createMeasuredSizeCache();
    const columnSizeVersion = ref(columnSizeCache.version);
    const columnVisibilityQuery = ref("");
    const uncontrolledDensity = ref<GridDensity>(props.defaultDensity ?? "standard");
    const getResolvedDensity = (): GridDensity => props.density ?? uncontrolledDensity.value;
    const getDensitySizingEnabled = (): boolean => props.densityControl || props.density !== undefined || props.defaultDensity !== undefined;
    const getResolvedRowEstimate = (estimate: number): number =>
      getDensitySizingEnabled() ? getGridDensityRowHeight(getResolvedDensity()) : estimate;
    const observedColumnElements = new Map<string, Element>();
    let columnResizeObserver: ResizeObserver | null = null;
    let measuredCoreLayoutSignature = "";
    let cleanupScrollListener: (() => void) | null = null;
    let cleanupPointerListeners: (() => void) | null = null;
    let cleanupGridReady: (() => void) | null = null;
    const editDraft = ref("");
    const editValidationMessage = ref<string | null>(null);
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
    const scrollFrame = ref(getInitialScrollFrame());
    let shouldRestoreFocusedCell = false;
    let focusRestoreInProgress = false;

    const syncFrame = () => {
      const scroller = scrollerRef.value;

      if (!scroller) {
        return;
      }

      if (getShouldCancelFocusedCellRestoreOnFrameSync({ inProgress: focusRestoreInProgress })) {
        shouldRestoreFocusedCell = false;
      }

      scrollFrame.value = getScrollFrame(
        getScrollFrameOptionsFromElement(scroller, {
          stickyTopOffset: getElementOffsetBlockSize(headerRef.value, 42),
        }),
      );
    };

    const resetPaginationScroll = () => {
      const scroller = scrollerRef.value;
      if (scroller) {
        scrollElementToPosition(scroller, { scrollTop: 0, scrollLeft: scroller.scrollLeft });
        syncFrame();
      }
    };

    const runPaginationAction = (action: () => void) => {
      action();
      resetPaginationScroll();
    };

    const getCurrentMeasuredColumnLayout = (
      layout: readonly ColumnLayout[],
      visibleColumns: readonly Column<unknown, unknown>[],
      columnVirtualOptions: ReturnType<typeof resolveColumnVirtualizationOptions>,
    ) => {
      const columnById = new Map(visibleColumns.map((column) => [column.id, column]));
      const sizedLayout = getSizedColumnLayout(layout, {
        getColumnSize: (columnId) => grid.getColumnSize(columnId),
        getFallbackSize: (columnId) => columnById.get(columnId)?.getSize(),
      });
      const coreLayoutSignature = getColumnLayoutMeasurementSignature(sizedLayout);

      return getMeasuredColumnLayoutFromCache(sizedLayout, {
        cache: columnSizeCache,
        enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth && measuredCoreLayoutSignature === coreLayoutSignature,
      });
    };

    const restoreFocusedCell = async () => {
      const focusedCell = state.value.focusedCell;
      const scroller = scrollerRef.value;

      if (
        !getCanRestoreFocusedCell({
          focusedCell,
          scroller,
          shouldRestore: shouldRestoreFocusedCell,
          inProgress: focusRestoreInProgress,
        })
      ) {
        return;
      }

      if (!focusedCell || !scroller) {
        return;
      }

      focusRestoreInProgress = true;

      try {
        const rows = grid.getRowModel().rows;
        const rowVirtualOptions = resolveRowVirtualizationOptions(props.rowVirtualization);
        const columnVirtualOptions = resolveColumnVirtualizationOptions(props.columnVirtualization);
        const layout = getCurrentMeasuredColumnLayout(grid.getColumnLayout(), grid.getVisibleLeafColumns(), columnVirtualOptions);
        const resolvedRowEstimate = getResolvedRowEstimate(rowVirtualOptions.estimateRowHeight);
        const rowSizeResolver = rowVirtualOptions.measureRowHeight
          ? createMeasuredSizeResolver(rowSizeCache, (index) => rows[index]?.id ?? index, resolvedRowEstimate)
          : () => resolvedRowEstimate;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const nextScroll = getScrollForFocusedCell(
            getFocusedCellScrollOptionsFromElement(scroller, {
              focusedCell,
              layout,
              rows,
              headerHeight: getElementOffsetBlockSize(headerRef.value, 42),
              getRowSize: rowSizeResolver,
              rowVirtualOptions,
              columnVirtualOptions,
            }),
          );

          if (nextScroll) {
            scrollElementToPosition(scroller, nextScroll);
            scrollFrame.value = getScrollFrame(
              getScrollFrameOptionsFromElement(scroller, {
                scrollTop: nextScroll.scrollTop,
                scrollLeft: nextScroll.scrollLeft,
                stickyTopOffset: getElementOffsetBlockSize(headerRef.value, 42),
              }),
            );
          }

          await nextTick();

          if (focusFocusedCellInGrid(scroller)) {
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

    const moveFocusWithRestore = (direction: Parameters<typeof grid.moveFocus>[0], options?: Parameters<typeof grid.moveFocus>[1]) => {
      grid.moveFocus(direction, options);
      shouldRestoreFocusedCell = true;
    };

    onMounted(() => {
      cleanupGridReady = props.onGridReady?.(grid) ?? null;
      syncFrame();
      if (scrollerRef.value) {
        cleanupScrollListener = addPassiveScrollListener(syncFrame, scrollerRef.value);
      }
      cleanupPointerListeners = addPointerMoveUpCancelListeners({
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
          rowSizeVersion.value = rowSizeCache.version;
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
          columnSizeVersion.value = columnSizeCache.version;
        }
      });

      if (columnResizeObserver) {
        observeElements(columnResizeObserver, observedColumnElements.values());
      }
    });

    onBeforeUnmount(() => {
      cleanupGridReady?.();
      cleanupGridReady = null;
      cleanupScrollListener?.();
      cleanupScrollListener = null;
      cleanupPointerListeners?.();
      cleanupPointerListeners = null;
      disconnectResizeObserver(rowResizeObserver);
      rowResizeObserver = null;
      observedRowElements.clear();
      disconnectResizeObserver(columnResizeObserver);
      columnResizeObserver = null;
      observedColumnElements.clear();
    });

    watch(
      () => [props.density, props.defaultDensity, props.densityControl] as const,
      () => {
        if (rowSizeCache.clear()) {
          rowSizeVersion.value = rowSizeCache.version;
        }
      },
    );

    watch(
      () => {
        state.value;
        return grid.getRowModel().rows.map((row) => row.id).join("\0");
      },
      () => {
        if (!resolveRowVirtualizationOptions(props.rowVirtualization).measureRowHeight) {
          return;
        }
        if (rowSizeCache.prune(grid.getRowModel().rows.map((row) => row.id))) {
          rowSizeVersion.value = rowSizeCache.version;
        }
      },
    );

    watch(
      () => {
        state.value;
        return grid.getColumnLayout().map((column) => column.id).join("\0");
      },
      () => {
        const options = resolveColumnVirtualizationOptions(props.columnVirtualization);
        if (!options.enabled || !options.measureColumnWidth) {
          return;
        }
        if (columnSizeCache.prune(grid.getColumnLayout().map((column) => column.id))) {
          columnSizeVersion.value = columnSizeCache.version;
        }
      },
    );

    watch(
      () => {
        state.value;
        const visibleColumns = grid.getVisibleLeafColumns();
        const columnById = new Map(visibleColumns.map((column) => [column.id, column]));
        const sizedLayout = getSizedColumnLayout(grid.getColumnLayout(), {
          getColumnSize: (columnId) => grid.getColumnSize(columnId),
          getFallbackSize: (columnId) => columnById.get(columnId)?.getSize(),
        });
        const columnVirtualOptions = resolveColumnVirtualizationOptions(props.columnVirtualization);

        return {
          enabled: columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth,
          signature: getColumnLayoutMeasurementSignature(sizedLayout),
        };
      },
      ({ enabled, signature }) => {
        const syncResult = syncMeasuredColumnLayoutCache({
          cache: columnSizeCache,
          currentSignature: measuredCoreLayoutSignature,
          enabled,
          nextSignature: signature,
        });

        measuredCoreLayoutSignature = syncResult.signature;

        if (syncResult.changed) {
          columnSizeVersion.value = columnSizeCache.version;
        }
      },
      { immediate: true },
    );

    watch(
      () => [
        state.value.focusedCell?.rowId,
        state.value.focusedCell?.columnId,
        state.value.editingCell?.rowId,
        state.value.editingCell?.columnId,
        scrollFrame.value.scrollTop,
        scrollFrame.value.scrollLeft,
        rowSizeVersion.value,
        columnSizeVersion.value,
        props.rowVirtualization,
        props.columnVirtualization,
      ],
      () => {
        void restoreFocusedCell();
      },
      { flush: "post" },
    );

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
        grid.fillCellRange(fillDrag.target, { ...props.cellFillOptions, sourceEvent: event });
        cellClickSuppression.suppress();
      }

      const headerDragAction = endingHeaderDrag
        ? getHeaderDragEndAction(endingHeaderDrag, {
            event,
            groupingPanel: Boolean(props.groupingPanel),
            groupingPanelElement: groupingPanelRef.value,
            columns: grid.getAllLeafColumns(),
          })
        : null;

      if (isHeaderDragGroupAction(headerDragAction)) {
        grid.toggleColumnGrouping(headerDragAction.columnId, true);
      } else if (isHeaderDragMoveAction(headerDragAction)) {
        moveColumnToTarget(grid, headerDragAction.sourceColumnId, headerDragAction.targetColumnId);
        headerClickSuppression.suppress();
      }

      rangeDrag = null;
      fillDrag = null;
      if (endingHeaderDrag) {
        headerDrag = null;
      }
    };

    const headerDragHandlers: HeaderDragHandlers = {
      onPointerDown: (columnId, event) => {
        if (!isPrimaryPointerButton(event)) {
          return;
        }

        headerDrag = {
          sourceColumnId: columnId,
          targetColumnId: columnId,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          didDrag: false,
        };
      },
      onPointerEnter: (columnId, event) => {
        if (!getCanContinuePointerDrag(headerDrag, event)) {
          return;
        }

        headerDrag.targetColumnId = columnId;
      },
      onClick: () => {
        return headerClickSuppression.consume();
      },
    };

    const rangeDragHandlers: CellRangeDragHandlers = {
      onPointerDown: (coordinate, event) => {
        if (!getCanStartCellPointerDrag(event, state.value.editingCell)) {
          return;
        }

        rangeDrag = { anchor: coordinate, pointerId: event.pointerId, didDrag: false };
        grid.selectCellRange(coordinate);
      },
      onPointerEnter: (coordinate, event) => {
        if (getCanContinuePointerDrag(fillDrag, event)) {
          fillDrag.target = coordinate;
        }

        if (!getCanContinuePointerDrag(rangeDrag, event)) {
          return;
        }

        if (!isCellCoordinateEqual(rangeDrag.anchor, coordinate)) {
          rangeDrag.didDrag = true;
        }

        grid.selectCellRange(rangeDrag.anchor, coordinate);
      },
      onPointerUp: (event) => {
        if (!getCanEndPointerDrag(rangeDrag, event)) {
          return;
        }

        if (rangeDrag.didDrag) {
          cellClickSuppression.suppress();
        }

        rangeDrag = null;
      },
      onFillPointerDown: (coordinate, event) => {
        if (!getCanStartCellPointerDrag(event, state.value.editingCell)) {
          return;
        }

        preventDefaultAndStopPropagation(event);
        fillDrag = { pointerId: event.pointerId, target: coordinate };
      },
      onClick: (event) => {
        if (!cellClickSuppression.consume(event)) {
          return false;
        }

        return true;
      },
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGridInteractiveKeyboardEventTarget(event)) {
        return;
      }

      const shortcutAction = getGridKeyboardShortcutAction(event);
      const focusMove = getGridKeyboardFocusMove(event);
      const editAction = getGridKeyboardEditAction(event);
      const focusedCell = state.value.focusedCell;
      const editingCell = state.value.editingCell;
      const canRunShortcut = getCanRunGridKeyboardShortcut(editingCell);

      if (editAction === "start-edit" && getCanStartFocusedCellEdit(focusedCell, editingCell)) {
        preventEventDefault(event);
        shouldRestoreFocusedCell = false;
        startCellEdit(grid, focusedCell.rowId, focusedCell.columnId, event, editDraft, editValidationMessage);
      } else if (editAction === "cancel-edit" && getCanCancelCellEdit(editingCell)) {
        preventEventDefault(event);
        shouldRestoreFocusedCell = true;
        editValidationMessage.value = null;
        grid.cancelCellEdit(event);
      } else if (shortcutAction === "copy" && canRunShortcut) {
        const clipboardText = grid.getClipboardText();

        if (clipboardText) {
          preventEventDefault(event);
          void writeClipboardText(clipboardText);
        }
      } else if (shortcutAction === "paste" && canRunShortcut) {
        preventEventDefault(event);
        shouldRestoreFocusedCell = true;
        void readClipboardText().then((clipboardText) => {
          if (clipboardText) {
            const result = grid.pasteClipboardText(clipboardText, { ...props.clipboardPasteOptions, sourceEvent: event });
            props.onClipboardPaste?.(result);
          }
        });
      } else if (shortcutAction === "undo-edit" && canRunShortcut && grid.getCanUndoCellEdit()) {
        preventEventDefault(event);
        shouldRestoreFocusedCell = true;
        grid.undoCellEdit(event);
      } else if (shortcutAction === "redo-edit" && canRunShortcut && grid.getCanRedoCellEdit()) {
        preventEventDefault(event);
        shouldRestoreFocusedCell = true;
        grid.redoCellEdit(event);
      } else if (shortcutAction === "row-selection" && canRunShortcut) {
        const rows = grid.getRowModel().rows;
        const rowSelectionTarget = getFocusedRowSelectionTarget(rows, state.value.focusedCell);

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

    const measureVirtualRow = (rowId: string, element: unknown) => {
      const previous = observedRowElements.get(rowId);

      if (previous && previous !== element) {
        removeObservedElement(rowResizeObserver, observedRowElements, rowId);
      }

      if (!resolveRowVirtualizationOptions(props.rowVirtualization).measureRowHeight || !isMeasuredBlockRectElementTarget(element)) {
        return;
      }

      replaceObservedElement(rowResizeObserver, observedRowElements, rowId, element);

      if (rowSizeCache.set(rowId, getMeasuredElementBlockSizeFromRect(element))) {
        rowSizeVersion.value = rowSizeCache.version;
      }
    };

    const measureVirtualColumn = (columnId: string, element: unknown, enabled: boolean) => {
      const previous = observedColumnElements.get(columnId);

      if (previous && (previous !== element || !enabled || !isMeasuredInlineDatasetElementTarget(element))) {
        removeObservedElement(columnResizeObserver, observedColumnElements, columnId);
      }

      if (!isMeasuredInlineDatasetElementTarget(element) || !enabled) {
        return;
      }

      setElementDatasetId(element, "columnId", columnId);
      replaceObservedElement(columnResizeObserver, observedColumnElements, columnId, element);

      if (columnSizeCache.set(columnId, getMeasuredElementInlineSize(element))) {
        columnSizeVersion.value = columnSizeCache.version;
      }
    };

    return () => {
      const localization = createGridLocalization(props.localization);
      const ariaLabel = props.ariaLabel ?? localization.dataGridLabel;
      const emptyState = props.emptyState ?? localization.noRows;
      const errorState = props.errorState ?? getGridErrorText(localization);
      const loadingState = props.loadingState ?? getGridLoadingText(localization);
      state.value;
      rowSizeVersion.value;
      columnSizeVersion.value;

      const headerGroups = grid.getHeaderGroups();
      const additionalHeaderRowCount = props.columnFilterControls ? 1 : 0;
      const bodyRowIndexOffset = getGridBodyRowIndexOffset(grid, { additionalHeaderRowCount });
      const groupingColumns = state.value.grouping.flatMap((columnId) => {
        const column = getColumnById(columnId, grid.getAllLeafColumns());
        return column ? [column] : [];
      });
      const rows = grid.getRowModel().rows;
      const allColumns = grid.getAllLeafColumns();
      const visibleColumns = grid.getVisibleLeafColumns();
      const renderContext: DataGridRenderContext<unknown> = { grid, rows, visibleColumns };
      const resolvedEmptyState = props.renderEmptyState?.(renderContext) ?? emptyState;
      const resolvedLoadingState = props.renderLoadingState?.(renderContext) ?? loadingState;
      const resolvedErrorState = props.renderErrorState?.({ ...renderContext, retry: props.onRetry }) ?? errorState;
      const layout = grid.getColumnLayout();
      const columnById = new Map(visibleColumns.map((column) => [column.id, column]));
      const columnIndexById = new Map(visibleColumns.map((column, index) => [column.id, index]));
      const rowVirtualOptions = resolveRowVirtualizationOptions(props.rowVirtualization);
      const columnVirtualOptions = resolveColumnVirtualizationOptions(props.columnVirtualization);
      const measuredLayout = getCurrentMeasuredColumnLayout(layout, visibleColumns, columnVirtualOptions);
      const layoutById = getColumnLayoutById(measuredLayout);
      const totalWidth = getColumnLayoutTotalWidth(measuredLayout);
      const columnRenderItems = getColumnRenderItems(measuredLayout, scrollFrame.value, columnVirtualOptions);
      const columnCellRenderItems = getColumnCellRenderItems(columnRenderItems);
      const resolvedRowEstimate = getResolvedRowEstimate(rowVirtualOptions.estimateRowHeight);
      const rowRangeEstimate = rowVirtualOptions.measureRowHeight
        ? createMeasuredSizeResolver(rowSizeCache, (index) => rows[index]?.id ?? index, resolvedRowEstimate)
        : resolvedRowEstimate;
      const virtualRange = getVirtualRowRange({
        count: rows.length,
        scrollFrame: scrollFrame.value,
        enabled: rowVirtualOptions.enabled,
        estimateSize: rowRangeEstimate,
        overscan: rowVirtualOptions.overscan,
      });
      const visibleRowItems = getVirtualRowItems(rows, virtualRange);
      const resolvedPageSizeOptions = getPaginationPageSizeOptions(props.pageSizeOptions, state.value.pagination.pageSize);
      const densitySizingEnabled = getDensitySizingEnabled();
      const resolvedDensity = getResolvedDensity();
      const { class: rootClass, style: rootStyle, ...gridAttrs } = attrs;
      const rootProps = {
        ...(densitySizingEnabled ? getGridDensityProps(resolvedDensity) : {}),
        class: ["og-grid", rootClass],
        style: rootStyle,
      };
      const semanticGridProps = {
        ...getGridProps(grid, { additionalHeaderRowCount, ariaLabel, error: props.error, loading: props.loading }),
        ...(densitySizingEnabled ? getGridDensityProps(resolvedDensity) : {}),
        ...gridAttrs,
      };
      const setQuickFilter = (value: string) => {
        grid.setState((previous) => ({
          ...previous,
          globalFilter: value,
          pagination: { ...previous.pagination, pageIndex: 0 },
        }));
        resetPaginationScroll();
      };
      const quickFilterNode = props.quickFilterControl
        ? h("div", { ...getQuickFilterProps(localization), class: "og-grid__quick-filter" }, [
            h("input", {
              ...getQuickFilterInputProps({ value: state.value.globalFilter }, localization),
              class: "og-grid__quick-filter-input",
              onInput: (event: Event) => setQuickFilter(getCellEditorEventValue(event)),
            }),
            h(
              "button",
              {
                ...getQuickFilterClearButtonProps(state.value.globalFilter, localization),
                class: "og-grid__quick-filter-clear",
                onClick: () => setQuickFilter(""),
              },
              getQuickFilterClearButtonText(localization),
            ),
          ])
        : null;
      const allPageRowsSelected = props.rowSelectionControls ? grid.getIsAllPageRowsSelected() : false;
      const somePageRowsSelected = props.rowSelectionControls ? grid.getIsSomePageRowsSelected() : false;
      const selectedRowCount = props.rowSelectionControls ? grid.getSelectedRowModel().rows.length : 0;
      const selectionControlsNode = props.rowSelectionControls
        ? h("div", { ...getRowSelectionControlsProps(localization), class: "og-grid__selection-controls" }, [
            h("label", { class: "og-grid__selection-toggle" }, [
              h("input", {
                ...getRowSelectionCheckboxProps({
                  allSelected: allPageRowsSelected,
                  someSelected: somePageRowsSelected,
                  disabled: rows.length === 0,
                }, localization),
                ref: (element: unknown) => { setCheckboxIndeterminate(element, somePageRowsSelected); },
                onChange: () => grid.toggleAllPageRowsSelected(!allPageRowsSelected),
              }),
              h("span", getRowSelectionCheckboxText(localization)),
            ]),
            h("span", { ...getRowSelectionStatusProps(), class: "og-grid__selection-status" }, getRowSelectionStatusText(selectedRowCount, localization)),
            h(
              "button",
              {
                ...getRowSelectionClearButtonProps(selectedRowCount === 0, localization),
                class: "og-grid__selection-clear",
                onClick: () => grid.resetRowSelection(),
              },
              getRowSelectionClearButtonText(localization),
            ),
          ])
        : null;
      const filteredVisibilityColumns = getFilteredColumnVisibilityColumns(allColumns, columnVisibilityQuery.value);
      const columnVisibilityNode = props.columnVisibilityControls
        ? h("details", { ...getColumnVisibilityControlsProps(localization), class: "og-grid__column-visibility" }, [
            h(
              "summary",
              { ...getColumnVisibilitySummaryProps(visibleColumns.length, allColumns.length, localization), class: "og-grid__column-visibility-summary" },
              getColumnVisibilitySummaryText(visibleColumns.length, allColumns.length, localization),
            ),
            h("div", { class: "og-grid__column-visibility-panel" }, [
              h("input", {
                ...getColumnVisibilitySearchInputProps(columnVisibilityQuery.value, localization),
                class: "og-grid__column-visibility-search",
                onInput: (event: Event) => { columnVisibilityQuery.value = getCellEditorEventValue(event); },
              }),
              h(
                "span",
                { ...getColumnVisibilityStatusProps(), class: "og-grid__column-visibility-status" },
                getColumnVisibilityStatusText(visibleColumns.length, allColumns.length, localization),
              ),
              h(
                "div",
                { ...getColumnVisibilityListProps(localization), class: "og-grid__column-visibility-list" },
                filteredVisibilityColumns.length > 0
                  ? filteredVisibilityColumns.map((column) => {
                      const label = getColumnHeaderText(column);
                      const visible = grid.getIsColumnVisible(column.id);
                      return h("label", { class: "og-grid__column-visibility-item", key: column.id }, [
                        h("input", {
                          ...getColumnVisibilityCheckboxProps({
                            columnId: column.id,
                            label,
                            visible,
                            visibleCount: visibleColumns.length,
                          }),
                          onChange: (event: Event) => grid.toggleColumnVisibility(column.id, (event.currentTarget as HTMLInputElement).checked),
                        }),
                        h("span", label),
                      ]);
                    })
                  : [h("span", { class: "og-grid__column-visibility-empty" }, getColumnVisibilityEmptyText(localization))],
              ),
              h(
                "button",
                {
                  ...getColumnVisibilityResetButtonProps(allColumns.length - visibleColumns.length, localization),
                  class: "og-grid__column-visibility-reset",
                  onClick: () => grid.resetColumnVisibility(),
                },
                getColumnVisibilityResetButtonText(localization),
              ),
            ]),
          ])
        : null;
      const densityNode = props.densityControl
        ? h(
            "div",
            { ...getDensityControlsProps(localization), class: "og-grid__density-controls" },
            GRID_DENSITIES.map((densityOption) =>
              h(
                "button",
                {
                  ...getDensityButtonProps(densityOption, resolvedDensity, localization),
                  class: "og-grid__density-button",
                  onClick: () => {
                    if (props.density === undefined) {
                      uncontrolledDensity.value = densityOption;
                    }
                    if (rowSizeCache.clear()) {
                      rowSizeVersion.value = rowSizeCache.version;
                    }
                    props.onDensityChange?.(densityOption);
                  },
                },
                getDensityButtonText(densityOption, localization),
              ),
            ),
          )
        : null;
      const controlsNode = props.quickFilterControl || props.rowSelectionControls || props.columnVisibilityControls || props.densityControl
        ? h("div", { class: "og-grid__controls" }, [selectionControlsNode, columnVisibilityNode, densityNode, quickFilterNode])
        : null;

      const gridNode = h("div", rootProps, [
        props.groupingPanel ? renderGroupingPanel(grid, groupingColumns, groupingPanelRef, localization) : null,
        h("div", { ...semanticGridProps, class: "og-grid__scroller", onKeydown: handleKeyDown, ref: scrollerRef }, [
          h("div", { class: "og-grid__canvas", style: getInlineSizeStyleText(totalWidth) }, [
            h(
              "div",
              { ...getGridHeaderProps(), class: "og-grid__header", ref: headerRef },
              [
                ...headerGroups.map((headerGroup, headerRowIndex) =>
                  h(
                  "div",
                  {
                    key: headerGroup.id,
                    ...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: headerRowIndex }),
                    class: "og-grid__row og-grid__row--header",
                    style: getVirtualizedInlineSizeStyleText(totalWidth, columnVirtualOptions.enabled),
                  },
                  getHeaderRenderItems(headerGroup, columnRenderItems, layoutById).map((item) => {
                    if (isHeaderRenderSpacerItem(item)) {
                      return h("div", {
                        key: getHeaderRenderItemKey(headerGroup.id, item),
                        ...getColumnSpacerProps(),
                        class: "og-grid__column-spacer",
                        style: getInlineSizeStyleText(item.size),
                      });
                    }

                    const firstLeafId = item.leafColumnIds[0];
                    return renderHeader(
                      grid,
                      getHeaderRenderItemKey(headerGroup.id, item),
                      item.header,
                      firstLeafId ? layoutById.get(firstLeafId) : undefined,
                      item.size,
                      item.leafColumnIds.length,
                      firstLeafId ? columnIndexById.get(firstLeafId) ?? 0 : 0,
                      headerDragHandlers,
                      props.columnPinningControls,
                      props.headerActionMenu,
                      props.headerActionMenuItems,
                      props.getHeaderClassName,
                      headerMenuColumnId.value,
                      (columnId, element) => measureVirtualColumn(columnId, element, columnVirtualOptions.enabled && columnVirtualOptions.measureColumnWidth),
                      (columnId) => {
                        headerMenuColumnId.value = columnId;
                      },
                      (columnId) => {
                        headerMenuColumnId.value = headerMenuColumnId.value === columnId ? null : columnId;
                      },
                      () => {
                        headerMenuColumnId.value = null;
                      },
                      localization,
                      props.renderHeader,
                    );
                  }),
                  ),
                ),
                props.columnFilterControls
                  ? h(
                      "div",
                      {
                        ...getGridHeaderRowProps({ columnVirtualized: columnVirtualOptions.enabled, rowIndex: headerGroups.length }),
                        class: "og-grid__row og-grid__row--filter",
                        style: getVirtualizedInlineSizeStyleText(totalWidth, columnVirtualOptions.enabled),
                      },
                      columnCellRenderItems.flatMap((item) => {
                        const column = columnById.get(item.layout.id);

                        if (!column) {
                          return [];
                        }

                        const columnIndex = columnIndexById.get(column.id) ?? 0;
                        return [
                          h(
                            "div",
                            {
                              key: `filter:${column.id}`,
                              ...getColumnFilterCellProps(column, {
                                columnIndex,
                                rowIndex: headerGroups.length,
                                pinned: item.layout.pinned,
                                pinnedEdge: item.layout.pinnedEdge,
                              }),
                              class: "og-grid__filter-cell",
                              style: getColumnStyle(item.layout.size, item.layout, item.beforeSpacerSize, item.afterSpacerSize),
                            },
                            column.getCanFilter()
                              ? [
                                  h("input", {
                                    ...getColumnFilterInputProps(column, {
                                      label: getColumnHeaderText(column),
                                      value: getColumnFilterText(state.value.columnFilters, column.id),
                                    }, localization),
                                    class: "og-grid__filter-input",
                                    onInput: (event: Event) => {
                                      const value = getCellEditorEventValue(event);
                                      grid.setState((previous) => ({
                                        ...previous,
                                        columnFilters: getNextColumnFilters(previous.columnFilters, column.id, value),
                                        pagination: { ...previous.pagination, pageIndex: 0 },
                                      }));
                                    },
                                  }),
                                ]
                              : [],
                          ),
                        ];
                      }),
                    )
                  : null,
              ],
            ),
            h(
              "div",
              {
                ...getGridBodyProps({ virtualized: rowVirtualOptions.enabled }),
                class: "og-grid__body",
                style: getVirtualBodyStyleText(virtualRange),
              },
              rows.length === 0
                ? [
                    h("div", { ...getGridEmptyRowProps({ rowIndexOffset: bodyRowIndexOffset }), class: "og-grid__empty" }, [
                      h("div", { ...getGridEmptyCellProps({ rowIndexOffset: bodyRowIndexOffset, columnCount: visibleColumns.length }), class: "og-grid__empty-cell", style: getInlineSizeStyleText(totalWidth) }, [
                        resolvedEmptyState,
                      ]),
                    ]),
                  ]
                : visibleRowItems.map(({ row, rowIndex, virtualItem }) =>
                    h(
                      "div",
                      {
                        key: row.id,
                        ...getRowProps(row, rowIndex, { selected: grid.getIsRowSelected(row.id), rowIndexOffset: bodyRowIndexOffset }),
                        ...getRowLayoutProps(row, {
                          expanded: grid.getIsRowExpanded(row.id),
                          virtualIndex: virtualItem?.index,
                          columnVirtualized: columnVirtualOptions.enabled,
                        }),
                        class: ["og-grid__row", props.getRowClassName?.(row)],
                        ...(rowVirtualOptions.enabled && rowVirtualOptions.measureRowHeight ? { ref: (element: unknown) => measureVirtualRow(row.id, element) } : {}),
                        onClick: (event: MouseEvent) => {
                          const rowEvent = grid.emitRowEvent({ type: "click", row, rowIndex, sourceEvent: event });

                          if (getCanToggleRowSelection(rowEvent)) {
                            grid.toggleRowSelected(row.id);
                          }
                        },
                        style: getVirtualRowStyleText(virtualItem),
                      },
                      columnCellRenderItems.flatMap((item) => {
                        const column = columnById.get(item.layout.id);

                        if (!column) {
                          return [];
                        }

                        return [
                          renderCell(
                            grid,
                            row,
                            rowIndex,
                            bodyRowIndexOffset,
                            column,
                            columnIndexById.get(column.id) ?? 0,
                            item.layout,
                            item.beforeSpacerSize,
                            item.afterSpacerSize,
                            visibleColumns,
                            editDraft,
                            editValidationMessage,
                            (value, event) => {
                              const editEvent = grid.commitCellEdit(value, event);

                              if (editEvent && !editEvent.defaultPrevented) {
                                shouldRestoreFocusedCell = true;
                              }

                              return editEvent;
                            },
                            (event) => {
                              shouldRestoreFocusedCell = true;
                              grid.cancelCellEdit(event);
                            },
                            rangeDragHandlers,
                            props.getCellClassName,
                            localization,
                            props.renderCell,
                          ),
                        ];
                      }),
                    ),
                  ),
            ),
          ]),
        ]),
        props.error
          ? h("div", { ...getGridErrorOverlayProps(localization), class: "og-grid__status-overlay og-grid__error-overlay" }, [
              h("span", { class: "og-grid__status-text" }, [resolvedErrorState]),
              props.onRetry
                ? h("button", { ...getGridErrorRetryButtonProps(localization), class: "og-grid__retry-button", onClick: props.onRetry }, getGridErrorRetryButtonText(localization))
                : null,
            ])
          : props.loading
          ? h("div", { ...getGridLoadingOverlayProps(localization), class: "og-grid__status-overlay og-grid__loading-overlay" }, [
              h("span", { class: "og-grid__loading-spinner", "aria-hidden": "true" }),
              h("span", { class: "og-grid__status-text" }, [resolvedLoadingState]),
            ])
          : null,
      ]);
      const paginationNode = props.paginationControls
        ? h("nav", { ...getPaginationProps(localization), class: "og-grid__pagination" }, [
            h("div", { class: "og-grid__pagination-buttons" }, [
              h("button", { ...getPaginationButtonProps({ action: "first", disabled: !grid.getCanPreviousPage() }, localization), class: "og-grid__pagination-button", onClick: () => runPaginationAction(() => grid.firstPage()) }, getPaginationButtonText("first")),
              h("button", { ...getPaginationButtonProps({ action: "previous", disabled: !grid.getCanPreviousPage() }, localization), class: "og-grid__pagination-button", onClick: () => runPaginationAction(() => grid.previousPage()) }, getPaginationButtonText("previous")),
              h("span", { ...getPaginationStatusProps(), class: "og-grid__pagination-status" }, getPaginationPageText(grid, localization)),
              h("button", { ...getPaginationButtonProps({ action: "next", disabled: !grid.getCanNextPage() }, localization), class: "og-grid__pagination-button", onClick: () => runPaginationAction(() => grid.nextPage()) }, getPaginationButtonText("next")),
              h("button", { ...getPaginationButtonProps({ action: "last", disabled: !grid.getCanNextPage() }, localization), class: "og-grid__pagination-button", onClick: () => runPaginationAction(() => grid.lastPage()) }, getPaginationButtonText("last")),
            ]),
            h(
              "select",
              {
                ...getPaginationPageSizeSelectProps(state.value.pagination.pageSize, localization),
                class: "og-grid__pagination-size",
                onChange: (event: Event) => {
                  grid.setPageSize(Number(getCellEditorEventValue(event)));
                  resetPaginationScroll();
                },
              },
              resolvedPageSizeOptions.map((pageSize) =>
                h("option", { key: pageSize, value: pageSize }, getPaginationPageSizeOptionText(pageSize, localization)),
              ),
            ),
          ])
        : null;

      const toolbarNode = props.renderToolbar
        ? h("div", { class: "og-grid__toolbar-slot" }, [props.renderToolbar(renderContext)])
        : null;

      return h(Fragment, null, [toolbarNode, controlsNode, gridNode, paginationNode]);
    };
  },
});

export function createDataGrid<TData>(): DataGridComponent<TData> {
  return DataGrid as unknown as DataGridComponent<TData>;
}

function renderHeader<TData>(
  grid: Grid<TData>,
  renderKey: string,
  header: Header<TData>,
  layout: ColumnLayout | undefined,
  size: number,
  colSpan: number,
  columnIndex: number,
  headerDragHandlers: HeaderDragHandlers,
  columnPinningControls: boolean,
  headerActionMenu: boolean,
  headerActionMenuItems: HeaderActionMenuItems<TData> | undefined,
  getHeaderClassName: ((context: HeaderContext<TData, unknown>) => string | undefined) | undefined,
  openHeaderMenuColumnId: ColumnId | null,
  onMeasureColumn: (columnId: string, element: unknown) => void,
  onOpenHeaderMenu: (columnId: ColumnId) => void,
  onToggleHeaderMenu: (columnId: ColumnId) => void,
  onCloseHeaderMenu: () => void,
  localization: GridLocalization,
  renderHeaderProp: ((context: HeaderContext<TData, unknown>) => VNodeChild) | undefined,
): RenderableValue {
  const canSort = !header.isPlaceholder && header.column.columns.length === 0 && header.column.getCanSort();
  const canResize = !header.isPlaceholder && header.column.columns.length === 0;
  const canInteract = !header.isPlaceholder && header.column.columns.length === 0;
  const sortDirection = grid.getColumnSortDirection(header.column.id);
  const pinningPosition = header.column.getIsPinned();
  const visibleColumns = grid.getVisibleLeafColumns();
  const visibleColumnIndex = getColumnIndexById(header.column.id, visibleColumns);
  const canMoveLeft = visibleColumnIndex > 0;
  const canMoveRight = visibleColumnIndex >= 0 && visibleColumnIndex < visibleColumns.length - 1;
  const isGrouped = grid.getState().grouping.includes(header.column.id);
  const menuId = getHeaderActionMenuId(header.column.id);
  const menuTriggerId = getHeaderActionMenuTriggerId(header.column.id);
  const defaultMenuItems = getHeaderActionMenuDefaultItemDescriptors({
    sortDirection,
    pinningPosition,
    isGrouped,
    canGroup: header.column.getCanGroup(),
    canMoveLeft,
    canMoveRight,
  }, localization).map((descriptor): HeaderActionMenuActionItem<TData> => {
    if (descriptor.id === "sort-asc") {
      return { ...descriptor, onSelect: () => grid.toggleColumnSorting(header.column.id, false) };
    }
    if (descriptor.id === "sort-desc") {
      return { ...descriptor, onSelect: () => grid.toggleColumnSorting(header.column.id, true) };
    }
    if (descriptor.id === "clear-sort") {
      return { ...descriptor, onSelect: () => grid.setSorting((previous) => previous.filter((rule) => rule.id !== header.column.id)) };
    }
    if (descriptor.id === "move-left") {
      return { ...descriptor, onSelect: () => moveVisibleColumn(grid, header.column.id, "left") };
    }
    if (descriptor.id === "move-right") {
      return { ...descriptor, onSelect: () => moveVisibleColumn(grid, header.column.id, "right") };
    }
    if (descriptor.id === "pin-left") {
      return { ...descriptor, onSelect: () => grid.pinColumn(header.column.id, "left") };
    }
    if (descriptor.id === "unpin") {
      return { ...descriptor, onSelect: () => grid.pinColumn(header.column.id, false) };
    }
    if (descriptor.id === "pin-right") {
      return { ...descriptor, onSelect: () => grid.pinColumn(header.column.id, "right") };
    }

    return { ...descriptor, onSelect: () => grid.toggleColumnGrouping(header.column.id, !isGrouped) };
  });
  const menuContext: HeaderActionMenuContext<TData> = {
    grid,
    column: header.column,
    sortDirection,
    pinningPosition,
    isGrouped,
    canMoveLeft,
    canMoveRight,
    defaultItems: defaultMenuItems,
  };
  const menuItems = (headerActionMenuItems ? headerActionMenuItems(menuContext) : defaultMenuItems).filter(isHeaderActionMenuItem);
  const runMenuAction = (item: HeaderActionMenuActionItem<TData>) => {
    item.onSelect(menuContext);
    onCloseHeaderMenu();
  };
  const headerProps = header.isPlaceholder
    ? getHeaderPlaceholderCellProps(header.column)
    : getHeaderCellProps(grid, header.column, Math.max(0, columnIndex));

  return h(
    "div",
    {
      key: renderKey,
      ...headerProps,
      ...getHeaderCellLayoutProps({
        colSpan,
        rowSpan: header.rowSpan,
        grouped: header.column.columns.length > 0,
        placeholder: header.isPlaceholder,
        pinnedEdge: layout?.pinnedEdge,
        draggable: canInteract,
      }),
      class: ["og-grid__header-cell", getHeaderClassName?.({ grid, column: header.column, header })],
      ...(canInteract ? { ref: (element: unknown) => onMeasureColumn(header.column.id, element) } : {}),
      onPointerdown: canInteract ? (event: PointerEvent) => headerDragHandlers.onPointerDown(header.column.id, event) : undefined,
      onPointerenter: canInteract ? (event: PointerEvent) => headerDragHandlers.onPointerEnter(header.column.id, event) : undefined,
      style: getColumnStyle(size, layout),
    },
    header.isPlaceholder
      ? ""
      : [
          h("button", getHeaderButtonEventProps(grid, header.column, canSort, canInteract, headerDragHandlers), [
            h("span", { class: "og-grid__header-label" }, normalizeRenderable(renderHeaderProp?.({ grid, column: header.column, header }) ?? renderHeaderValue(grid, header))),
            h("span", { ...getHeaderSortIndicatorProps(), class: "og-grid__sort-indicator" }, getHeaderSortIndicatorText(sortDirection, { visible: canSort })),
          ]),
          canInteract && columnPinningControls
            ? h("span", { ...getColumnPinningControlsProps(header.column, localization), class: "og-grid__pinning-controls" }, [
                h("button", getPinningButtonProps(grid, header.column, "left", pinningPosition === "left", localization), getColumnPinningButtonText("left")),
                h("button", getPinningButtonProps(grid, header.column, false, pinningPosition === false, localization), getColumnPinningButtonText(false)),
                h("button", getPinningButtonProps(grid, header.column, "right", pinningPosition === "right", localization), getColumnPinningButtonText("right")),
              ])
            : null,
          canInteract && headerActionMenu
            ? h("span", { class: "og-grid__header-menu" }, [
                h(
                  "button",
                  {
                    ...getHeaderActionMenuTriggerProps(header.column, { expanded: openHeaderMenuColumnId === header.column.id, controls: menuId }, localization),
                    id: menuTriggerId,
                    class: "og-grid__header-menu-trigger",
                    onPointerdown: (event: PointerEvent) => stopEventPropagation(event),
                    onClick: (event: MouseEvent) => {
                      stopEventPropagation(event);
                      onToggleHeaderMenu(header.column.id);
                    },
                    onKeydown: (event: KeyboardEvent) => {
                      const focusPosition = getHeaderActionMenuTriggerFocusPosition(event);

                      if (!focusPosition) {
                        return;
                      }

                      preventDefaultAndStopPropagation(event);
                      onOpenHeaderMenu(header.column.id);
                      nextTick(() => focusHeaderActionMenuItemById(document, menuId, focusPosition));
                    },
                  },
                  localization.headerActionMenuTrigger,
                ),
                openHeaderMenuColumnId === header.column.id
                  ? h(
                      "div",
                      {
                        ...getHeaderActionMenuProps(header.column, localization),
                        class: "og-grid__header-menu-popover",
                        id: menuId,
                        onPointerdown: (event: PointerEvent) => stopEventPropagation(event),
                        onKeydown: (event: KeyboardEvent) => {
                          const menuAction = getHeaderActionMenuKeyboardAction(event);

                          if (!menuAction) {
                            return;
                          }

                          if (isHeaderActionMenuCloseAction(menuAction)) {
                            preventDefaultAndStopPropagation(event);
                            onCloseHeaderMenu();
                            nextTick(() => focusHeaderActionMenuTriggerById(document, menuTriggerId));
                          } else if (isHeaderActionMenuFocusAction(menuAction)) {
                            preventDefaultAndStopPropagation(event);
                            focusHeaderActionMenuItem(getHeaderActionMenuFocusTarget(event), menuAction.position);
                          } else if (isHeaderActionMenuTabCloseAction(menuAction)) {
                            onCloseHeaderMenu();
                          }
                        },
                      },
                      menuItems.map((item) =>
                        isHeaderActionMenuActionItem(item)
                          ? h(
                              "button",
                              {
                                key: item.id,
                                ...getHeaderActionMenuItemProps({ disabled: item.disabled }),
                                onClick: () => runMenuAction(item),
                              },
                              item.label,
                            )
                          : isHeaderActionMenuCustomItem(item)
                            ? h("span", { key: item.id, ...getHeaderActionMenuCustomItemProps({ label: item.label }), class: "og-grid__header-menu-custom" }, item.render(menuContext) ?? "")
                          : isHeaderActionMenuLabelItem(item)
                            ? h("span", { key: item.id, ...getHeaderActionMenuLabelProps(), class: "og-grid__header-menu-label" }, item.label)
                          : isHeaderActionMenuSeparatorItem(item)
                            ? h("span", { key: item.id, ...getHeaderActionMenuSeparatorProps({ label: item.label }), class: "og-grid__header-menu-separator" })
                          : null,
                      ),
                    )
                  : null,
              ])
            : null,
          canResize
            ? h("span", {
                ...getColumnResizeHandleProps(header.column, {}, localization),
                class: "og-grid__resize-handle",
                onKeydown: (event: KeyboardEvent) => handleResizeKeyDown(grid, header.column, Math.max(0, columnIndex), event),
                onPointerdown: (event: PointerEvent) => handleResizePointerDown(grid, header.column, Math.max(0, columnIndex), event),
              })
            : null,
        ],
  );
}

function getPinningButtonProps<TData>(
  grid: Grid<TData>,
  column: Column<TData, unknown>,
  position: "left" | "right" | false,
  active: boolean,
  localization: GridLocalization,
) {
  return {
    ...getColumnPinningButtonProps(column, { position, active }, localization),
    class: "og-grid__pinning-button",
    onPointerdown: (event: PointerEvent) => stopEventPropagation(event),
    onClick: (event: MouseEvent) => {
      stopEventPropagation(event);
      grid.pinColumn(column.id, position);
    },
  };
}

function getHeaderButtonEventProps<TData>(
  grid: Grid<TData>,
  column: Column<TData, unknown>,
  canSort: boolean,
  canInteract: boolean,
  headerDragHandlers: HeaderDragHandlers,
) {
  return {
    ...getHeaderButtonProps({ disabled: !canInteract }),
    class: "og-grid__header-button",
    onClick: (event: MouseEvent) => {
      if (headerDragHandlers.onClick()) {
        preventDefaultAndStopPropagation(event);
        return;
      }

      if (canSort) {
        grid.toggleColumnSorting(column.id, undefined, event.shiftKey);
      }
    },
    onKeydown: (event: KeyboardEvent) => {
      const direction = getHeaderKeyboardMoveDirection(event);

      if (!direction) {
        return;
      }

      preventDefaultAndStopPropagation(event);
      moveVisibleColumn(grid, column.id, direction);
    },
  };
}

function handleResizePointerDown<TData>(
  grid: Grid<TData>,
  column: Column<TData, unknown>,
  columnIndex: number,
  event: PointerEvent,
) {
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
}

function handleResizeKeyDown<TData>(
  grid: Grid<TData>,
  column: Column<TData, unknown>,
  columnIndex: number,
  event: KeyboardEvent,
) {
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
}

function renderCell<TData>(
  grid: Grid<TData>,
  row: Row<TData>,
  rowIndex: number,
  rowIndexOffset: number,
  column: Column<TData, unknown>,
  columnIndex: number,
  layout: ColumnLayout,
  beforeSpacerSize: number,
  afterSpacerSize: number,
  visibleColumns: readonly Column<TData, unknown>[],
  editDraft: { value: string },
  editValidationMessage: { value: string | null },
  commitCellEdit: (value: unknown, event: KeyboardEvent | FocusEvent) => CellEditEvent<TData> | null,
  cancelCellEdit: (event: KeyboardEvent) => void,
  rangeDragHandlers: CellRangeDragHandlers,
  getCellClassName: ((context: CellContext<TData, unknown>) => string | undefined) | undefined,
  localization: GridLocalization,
  renderCellProp: ((context: CellContext<TData, unknown>) => VNodeChild) | undefined,
): RenderableValue {
  const editing = grid.getIsCellEditing(row.id, column.id);
  const rangeSelected = grid.getIsCellRangeSelected(row.id, column.id);
  const groupLabelCell = getIsGroupLabelCell(row, column, visibleColumns);
  const coordinate = { rowId: row.id, columnId: column.id };
  const selectedCoordinates = grid.getSelectedCellCoordinates();
  const fillHandleCoordinate = selectedCoordinates[selectedCoordinates.length - 1] ?? null;
  const fillHandleVisible = getCellFillHandleVisible(row, column, {
    activeEditing: Boolean(grid.getState().editingCell),
    fillHandleCoordinate,
    rangeSelected,
  });

  return h(
    "div",
    {
      key: `${row.id}:${column.id}`,
      ...getCellProps(row, column, rowIndex, columnIndex, {
        focusedCell: grid.getState().focusedCell,
        editing,
        rangeSelected,
        rowIndexOffset,
      }),
      ...getCellLayoutProps({ invalid: Boolean(editValidationMessage.value && editing), pinnedEdge: layout?.pinnedEdge }),
      class: ["og-grid__cell", getCellClassName?.({ grid, row, column, value: row.getValue(column.id) })],
      onFocus: () => grid.setFocusedCell({ rowId: row.id, columnId: column.id }),
      onPointerdown: (event: PointerEvent) => rangeDragHandlers.onPointerDown(coordinate, event),
      onPointerenter: (event: PointerEvent) => rangeDragHandlers.onPointerEnter(coordinate, event),
      onPointerup: (event: PointerEvent) => rangeDragHandlers.onPointerUp(event),
      onDblclick: (event: MouseEvent) => {
        if (!getCanStartCellEdit(row, column)) {
          return;
        }

        preventDefaultAndStopPropagation(event);
        startCellEdit(grid, row.id, column.id, event, editDraft, editValidationMessage);
      },
      onClick: (event: MouseEvent) => {
        if (rangeDragHandlers.onClick(event)) {
          return;
        }

        const cellEvent = grid.emitCellEvent({ type: "click", row, rowIndex, column, columnIndex, sourceEvent: event });

        if (getShouldPreventEventDefault(cellEvent)) {
          preventEventDefault(event);
        }
      },
      style: getColumnStyle(layout.size, layout, beforeSpacerSize, afterSpacerSize),
    },
    editing
      ? [
          column.columnDef.editOptions
            ? h(
                "select",
                {
                  ...getCellEditorProps(column, { invalid: Boolean(editValidationMessage.value) }, localization),
                  class: "og-grid__cell-editor",
                  value: editDraft.value,
                  onChange: (event: Event) => {
                    editDraft.value = getCellEditorEventValue(event);
                    editValidationMessage.value = null;
                  },
                  onClick: (event: MouseEvent) => stopEventPropagation(event),
                  onDblclick: (event: MouseEvent) => stopEventPropagation(event),
                  onKeydown: (event: KeyboardEvent) => {
                    stopEventPropagation(event);

                    const editorAction = getCellEditorKeyboardAction(event);

                    if (!editorAction) {
                      return;
                    }

                    preventEventDefault(event);

                    if (editorAction === "commit-edit") {
                      const editEvent = commitCellEdit(parseCellEditValue(grid, row, column, editDraft.value), event);
                      editValidationMessage.value = getCellEditValidationMessage(editEvent);
                    } else {
                      editValidationMessage.value = null;
                      cancelCellEdit(event);
                    }
                  },
                  onBlur: (event: FocusEvent) => {
                    if (grid.getIsCellEditing(row.id, column.id)) {
                      const editEvent = commitCellEdit(parseCellEditValue(grid, row, column, editDraft.value), event);
                      editValidationMessage.value = getCellEditValidationMessage(editEvent);
                    }
                  },
                  onVnodeMounted: (vnode: VNode) => {
                    const element = vnode.el;

                    focusCellEditorElement(element instanceof HTMLSelectElement ? element : null);
                  },
                },
                column.columnDef.editOptions.map((option) => h("option", getCellEditorOptionProps(option), getCellEditorOptionText(option))),
              )
            : h("input", {
                ...getCellEditorProps(column, { invalid: Boolean(editValidationMessage.value) }, localization),
                class: "og-grid__cell-editor",
                value: editDraft.value,
                onInput: (event: Event) => {
                  editDraft.value = getCellEditorEventValue(event);
                  editValidationMessage.value = null;
                },
                onClick: (event: MouseEvent) => stopEventPropagation(event),
                onDblclick: (event: MouseEvent) => stopEventPropagation(event),
                onKeydown: (event: KeyboardEvent) => {
                  stopEventPropagation(event);

                  const editorAction = getCellEditorKeyboardAction(event);

                  if (!editorAction) {
                    return;
                  }

                  preventEventDefault(event);

                  if (editorAction === "commit-edit") {
                    const editEvent = commitCellEdit(parseCellEditValue(grid, row, column, editDraft.value), event);
                    editValidationMessage.value = getCellEditValidationMessage(editEvent);
                  } else {
                    editValidationMessage.value = null;
                    cancelCellEdit(event);
                  }
                },
                onBlur: (event: FocusEvent) => {
                  if (grid.getIsCellEditing(row.id, column.id)) {
                    const editEvent = commitCellEdit(parseCellEditValue(grid, row, column, editDraft.value), event);
                    editValidationMessage.value = getCellEditValidationMessage(editEvent);
                  }
                },
                onVnodeMounted: (vnode: VNode) => {
                  const element = vnode.el;

                  focusCellEditorElement(element instanceof HTMLInputElement ? element : null);
                },
              }),
          editValidationMessage.value ? h("span", { ...getCellValidationMessageProps(), class: "og-grid__cell-validation" }, editValidationMessage.value) : null,
        ]
      : fillHandleVisible
        ? [renderFillHandle(coordinate, rangeDragHandlers), renderCellProp?.({ grid, row, column, value: row.getValue(column.id) }) ?? renderCellValue(grid, row, column)]
        : groupLabelCell
          ? renderGroupCell(grid, row, column, localization, renderCellProp)
          : renderCellProp?.({ grid, row, column, value: row.getValue(column.id) }) ?? renderCellValue(grid, row, column),
  );
}

function renderGroupCell<TData>(
  grid: Grid<TData>,
  row: Row<TData>,
  column: Column<TData, unknown>,
  localization: GridLocalization,
  renderCellProp: ((context: CellContext<TData, unknown>) => VNodeChild) | undefined,
): VNode {
  const expanded = grid.getIsRowExpanded(row.id);
  const fallback = row.getIsGroupFooter() || row.groupingColumnId
    ? undefined
    : renderCellProp?.({ grid, row, column, value: row.getValue(column.id) }) ?? renderCellValue(grid, row, column);
  const label = getGroupRowLabel(row, column, { fallback }, localization);
  const countText = getGroupRowCountText(row);

  return h(
    "span",
    {
      class: "og-grid__group-cell",
      style: getGroupCellIndentStyleText(row),
    },
    [
      row.getCanExpand()
        ? h(
            "button",
            {
              ...getRowExpansionToggleProps(row, { expanded, label: String(label) }, localization),
              class: "og-grid__group-toggle",
              onPointerdown: (event: PointerEvent) => {
                stopEventPropagation(event);
              },
              onClick: (event: MouseEvent) => {
                preventDefaultAndStopPropagation(event);
                grid.toggleRowExpanded(row.id);
              },
            },
            getRowExpansionToggleText(expanded),
          )
        : h("span", { ...getRowExpansionSpacerProps(), class: "og-grid__group-toggle-spacer" }),
      h("span", { class: "og-grid__group-label" }, label),
      countText ? h("span", { class: "og-grid__group-count" }, countText) : null,
    ],
  );
}

function renderFillHandle(coordinate: CellCoordinate, rangeDragHandlers: CellRangeDragHandlers): VNode {
  return h("span", {
    ...getCellFillHandleProps(),
    class: "og-grid__fill-handle",
    onPointerdown: (event: PointerEvent) => rangeDragHandlers.onFillPointerDown(coordinate, event),
  });
}

function startCellEdit<TData>(
  grid: Grid<TData>,
  rowId: string,
  columnId: string,
  sourceEvent: unknown,
  editDraft: { value: string },
  editValidationMessage: { value: string | null },
) {
  const row = getRowById(rowId, grid.getRowModel().rows);
  const column = getColumnById(columnId, grid.getVisibleLeafColumns());

  if (!row || !column) {
    return;
  }

  editDraft.value = getCellEditText(row.getValue(column.id));
  editValidationMessage.value = null;
  grid.startCellEdit(rowId, columnId, sourceEvent);
}

function renderGroupingPanel<TData>(
  grid: Grid<TData>,
  groupingColumns: Array<Column<TData, unknown>>,
  panelRef: Ref<HTMLElement | null>,
  localization: GridLocalization,
): VNode {
  return h(
    "div",
    {
      ref: panelRef,
      ...getGroupingPanelProps({ empty: groupingColumns.length === 0 }, localization),
      class: "og-grid__grouping-panel",
    },
    groupingColumns.length === 0
      ? [h("span", { ...getGroupingPanelPlaceholderProps(), class: "og-grid__grouping-placeholder" }, localization.groupingPanelEmpty)]
      : groupingColumns.map((column, index) =>
          h("span", { key: column.id, ...getGroupingPanelChipProps(column), class: "og-grid__grouping-chip" }, [
            h("span", { class: "og-grid__grouping-chip-label" }, getColumnLabel(column)),
            h(
              "button",
              {
                ...getGroupingPanelMoveButtonProps(column, { direction: "left", disabled: index === 0 }, localization),
                class: "og-grid__grouping-move",
                onClick: () => moveGroupedColumn(grid, groupingColumns, column.id, "left"),
              },
              "<",
            ),
            h(
              "button",
              {
                ...getGroupingPanelMoveButtonProps(column, { direction: "right", disabled: index === groupingColumns.length - 1 }, localization),
                class: "og-grid__grouping-move",
                onClick: () => moveGroupedColumn(grid, groupingColumns, column.id, "right"),
              },
              ">",
            ),
            h(
              "button",
              {
                ...getGroupingPanelRemoveButtonProps(column, localization),
                class: "og-grid__grouping-remove",
                onClick: () => grid.toggleColumnGrouping(column.id, false),
              },
              "x",
            ),
          ]),
        ),
  );
}

function getColumnLabel<TData>(column: Column<TData, unknown>): RenderableValue {
  return normalizeRenderable(getColumnHeaderText(column));
}

function renderHeaderValue<TData>(grid: Grid<TData>, header: Header<TData>): RenderableValue {
  const value = header.column.columnDef.header;

  if (typeof value === "function") {
    return normalizeRenderable(value({ grid, column: header.column, header } as HeaderContext<TData, unknown>));
  }

  return normalizeRenderable(getColumnHeaderText(header.column));
}

function renderCellValue<TData>(grid: Grid<TData>, row: Row<TData>, column: Column<TData, unknown>): RenderableValue {
  const value = row.getValue(column.id);
  const renderer = column.columnDef.cell;

  if (renderer) {
    return normalizeRenderable(renderer({ grid, row, column, value } as CellContext<TData, unknown>));
  }

  return normalizeRenderable(getCellDisplayText(value));
}

function normalizeRenderable(value: unknown): RenderableValue {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return value as RenderableValue;
}

function getColumnStyle(size: number, layout?: ColumnLayout, beforeSpacerSize = 0, afterSpacerSize = 0): string {
  return [
    `flex: 0 0 ${size}px`,
    `width: ${size}px`,
    beforeSpacerSize > 0 ? `margin-left: ${beforeSpacerSize}px` : "",
    afterSpacerSize > 0 ? `margin-right: ${afterSpacerSize}px` : "",
    getPinnedColumnOffsetStyleText(layout),
  ].filter(Boolean).join("; ");
}

export function downloadExportFile(file: ExportFile): boolean {
  return downloadBrowserExportFile(file);
}

export { fitColumnsToWidth } from "@open-grid/core";
export { createColumnHelper, useGrid };
export {
  DEFAULT_GRID_LOCALIZATION,
  GRID_PREFERENCES_VERSION,
  createGridLocalization,
  createGridPreferences,
  getBrowserGridPreferencesStorage,
  migrateGridPreferences,
  parseGridPreferences,
  readGridPreferences,
  removeGridPreferences,
  serializeGridPreferences,
  writeGridPreferences,
} from "@open-grid/primitives";
export type { GridDensity, GridLocalization, GridLocalizationOverrides, GridPreferences, GridPreferencesMigration, GridPreferencesOptions, GridPreferencesParseOptions, GridPreferencesState, GridPreferencesStorageEnvironmentLike, GridPreferencesStorageLike } from "@open-grid/primitives";
export type {
  AccessorKey,
  AccessorColumnOptions,
  AccessorFnColumnDef,
  AccessorKeyColumnDef,
  AnyColumnDef,
  CellContext,
  CellCoordinate,
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
  CellInteractionEvent,
  CellInteractionEventParams,
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
  Column,
  ColumnDef,
  ColumnHelper,
  ColumnFilter,
  ColumnFiltersState,
  ColumnId,
  ColumnMovePosition,
  ColumnOrderState,
  ColumnPinningPosition,
  ColumnPinningState,
  ColumnResizeEvent,
  ColumnResizeEventParams,
  ColumnResizePhase,
  ColumnSizingState,
  ColumnVisibilityState,
  DisplayColumnDef,
  ExpandedState,
  ExportFile,
  ExportFileOptions,
  FitColumnsToWidthOptions,
  FilterFn,
  Grid,
  GridCacheDiagnostics,
  GridCacheDiagnosticsEntry,
  GridCacheKey,
  GridOptions,
  GridState,
  GroupingState,
  Header,
  HeaderGroup,
  GroupColumnDef,
  HeaderContext,
  MoveFocusOptions,
  PaginationState,
  Row,
  RowId,
  RowInteractionEvent,
  RowInteractionEventParams,
  RowModel,
  RowSelectionCleanupScope,
  RowSelectionState,
  SortFn,
  SortingRule,
  SortingState,
  Updater,
} from "@open-grid/core";
