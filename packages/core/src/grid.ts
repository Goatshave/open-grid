import { createHeaderGroupsFromLeafColumns, resolveColumns } from "./columns";
import { createExportFile } from "./export";
import { expandRows, filterRows, groupRows, normalizePaginationPageCount, normalizePaginationPageIndex, normalizePaginationPageSize, paginateRows, sortRows } from "./pipeline";
import {
  columnOrderReducers,
  columnPinningReducers,
  columnSizingReducers,
  columnVisibilityReducers,
  expandedReducers,
  filterReducers,
  focusReducers,
  getOrderableLeafColumns,
  getRowIdsForSelectionCleanup,
  groupingReducers,
  orderLeafColumns,
  paginationReducers,
  rowSelectionReducers,
  sortingReducers,
} from "./reducers";
import { createCoreRowModel, createRowModel } from "./rows";
import { applyUpdater, mergeState, mergeStateFromBase } from "./state";
import type {
  CellCoordinate,
  CellEditEvent,
  CellEditHistoryAction,
  CellEditHistoryState,
  CellEditEventParams,
  CellEditValidationResult,
  CellEditValidationState,
  CellFillOptions,
  CellInteractionEvent,
  CellInteractionEventParams,
  CellRangeSelectionState,
  Column,
  ClipboardCellContext,
  ClipboardCopyOptions,
  ClipboardPasteOptions,
  ClipboardPasteResult,
  ClipboardPasteSkippedCell,
  ColumnResizeEvent,
  ColumnResizeEventParams,
  ColumnId,
  ColumnFiltersState,
  ColumnLayout,
  ColumnMovePosition,
  ColumnOrderState,
  ColumnPinningPosition,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  ExpandedState,
  FocusDirection,
  Grid,
  GridCacheDiagnostics,
  GridCacheKey,
  GridOptions,
  GridSelector,
  GridSelectorListener,
  GridSelectorSubscriptionOptions,
  GridState,
  ExportCellContext,
  ExportFileOptions,
  ExportTextOptions,
  ExportRowScope,
  GroupingState,
  MoveFocusOptions,
  PaginationState,
  RowModel,
  RowInteractionEvent,
  RowInteractionEventParams,
  RowId,
  Row,
  RowSelectionCleanupScope,
  RowSelectionMode,
  RowSelectionState,
  SortDirection,
  SortingState,
  Updater,
} from "./types";

export function createGrid<TData>(options: GridOptions<TData>): Grid<TData> {
  let currentOptions = options;
  let internalState = mergeState(options.initialState, options.state);
  let resolvedState = options.state ? mergeStateFromBase(internalState, options.state) : internalState;
  let grid: Grid<TData>;
  const cellEditUndoStack: CellEditHistoryEntry[] = [];
  const cellEditRedoStack: CellEditHistoryEntry[] = [];
  let cellEditHistoryStateSnapshot: CellEditHistoryState | undefined;
  const listeners = new Set<() => void>();
  const allColumnsCache = createCacheEntry<Column<TData, unknown>[]>("allColumns");
  const allLeafColumnsCache = createCacheEntry<Column<TData, unknown>[]>("allLeafColumns");
  const visibleLeafColumnsCache = createCacheEntry<Column<TData, unknown>[]>("visibleLeafColumns");
  const headerGroupsCache = createCacheEntry<ReturnType<typeof createHeaderGroupsFromLeafColumns<TData>>>("headerGroups");
  const columnLayoutCache = createCacheEntry<ColumnLayout[]>("columnLayout");
  const coreRowModelCache = createCacheEntry<RowModel<TData>>("coreRowModel");
  const filteredRowModelCache = createCacheEntry<RowModel<TData>>("filteredRowModel");
  const sortedRowModelCache = createCacheEntry<RowModel<TData>>("sortedRowModel");
  const groupedRowModelCache = createCacheEntry<RowModel<TData>>("groupedRowModel");
  const expandedRowModelCache = createCacheEntry<RowModel<TData>>("expandedRowModel");
  const paginatedRowModelCache = createCacheEntry<RowModel<TData>>("paginatedRowModel");
  const selectedRowModelCache = createCacheEntry<RowModel<TData>>("selectedRowModel");
  const filteredSelectedRowModelCache = createCacheEntry<RowModel<TData>>("filteredSelectedRowModel");
  const pageSelectedRowModelCache = createCacheEntry<RowModel<TData>>("pageSelectedRowModel");
  const cacheEntries = [
    allColumnsCache,
    allLeafColumnsCache,
    visibleLeafColumnsCache,
    headerGroupsCache,
    columnLayoutCache,
    coreRowModelCache,
    filteredRowModelCache,
    sortedRowModelCache,
    groupedRowModelCache,
    expandedRowModelCache,
    paginatedRowModelCache,
    selectedRowModelCache,
    filteredSelectedRowModelCache,
    pageSelectedRowModelCache,
  ] as const;

  const notifyListeners = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const updateState = (updater: Updater<GridState>) => {
    const previousResolvedState = resolvedState;
    const nextState = mergeState(applyUpdater(resolvedState, updater));
    internalState = nextState;
    resolvedState = currentOptions.state ? mergeStateFromBase(internalState, currentOptions.state) : internalState;
    currentOptions.onStateChange?.(nextState);
    if (!areGridStatesShallowEqual(previousResolvedState, resolvedState)) {
      notifyListeners();
    }
  };

  const updatePartialState = <TValue>(key: keyof GridState, updater: Updater<TValue>) => {
    updateState((previous) => ({
      ...previous,
      [key]: applyUpdater(previous[key] as TValue, updater),
    }));
  };

  const getAllColumns = (): Column<TData, unknown>[] => {
    const state = resolvedState;
    return getCached(
      allColumnsCache,
      [currentOptions.columns],
      () => resolveColumns(
        currentOptions.columns,
        state.columnVisibility,
        state.columnSizing,
        state.columnPinning,
        0,
        null,
        () => resolvedState,
      ),
    );
  };

  const getAllLeafColumns = (): Column<TData, unknown>[] => {
    const allColumns = getAllColumns();
    return getCached(allLeafColumnsCache, [allColumns, resolvedState.columnOrder], () =>
      orderLeafColumns(getOrderableLeafColumns(allColumns), resolvedState.columnOrder),
    );
  };

  const getVisibleLeafColumns = (): Column<TData, unknown>[] => {
    const leafColumns = getAllLeafColumns();
    return getCached(
      visibleLeafColumnsCache,
      [leafColumns, resolvedState.columnVisibility],
      () => leafColumns.filter((column) => column.getIsVisible()),
    );
  };

  const getHeaderGroups = () => {
    const allColumns = getAllColumns();
    const visibleLeafColumns = getVisibleLeafColumns();
    return getCached(headerGroupsCache, [allColumns, visibleLeafColumns], () =>
      createHeaderGroupsFromLeafColumns(allColumns, visibleLeafColumns),
    );
  };

  const getCore = (): RowModel<TData> => {
    const leafColumns = getAllLeafColumns();
    return getCached(coreRowModelCache, [currentOptions.data, currentOptions.columns, currentOptions.getRowId, currentOptions.getSubRows, currentOptions.getRowCanExpand], () =>
      createCoreRowModel(currentOptions.data, leafColumns, currentOptions.getRowId, currentOptions.getSubRows, currentOptions.getRowCanExpand),
    );
  };

  const getFiltered = (): RowModel<TData> => {
    const core = getCore();

    if (currentOptions.manualFiltering) {
      return getCached(filteredRowModelCache, [core, currentOptions.manualFiltering], () => core);
    }

    const leafColumns = getAllLeafColumns();
    return getCached(
      filteredRowModelCache,
      [core, currentOptions.columns, resolvedState.columnFilters, resolvedState.globalFilter, currentOptions.globalFilterFn, currentOptions.manualFiltering],
      () => filterRows(core, leafColumns, resolvedState.columnFilters, resolvedState.globalFilter, currentOptions.globalFilterFn),
    );
  };

  const getSorted = (): RowModel<TData> => {
    const filtered = getFiltered();

    if (currentOptions.manualSorting) {
      return getCached(sortedRowModelCache, [filtered, currentOptions.manualSorting], () => filtered);
    }

    const leafColumns = getAllLeafColumns();
    const sorting = resolvedState.sorting;
    const previousSort = sortedRowModelCache.deps?.[0] === filtered
      && sortedRowModelCache.deps[1] === currentOptions.columns
      && sortedRowModelCache.value
      ? { rowModel: sortedRowModelCache.value, sorting: sortedRowModelCache.deps[2] as SortingState }
      : undefined;
    return getCached(sortedRowModelCache, [filtered, currentOptions.columns, sorting, currentOptions.manualSorting], () =>
      sortRows(filtered, leafColumns, sorting, previousSort),
    );
  };

  const getGrouped = (): RowModel<TData> => {
    const sorted = getSorted();

    if (currentOptions.manualGrouping) {
      return getCached(groupedRowModelCache, [sorted, currentOptions.manualGrouping], () => sorted);
    }

    const leafColumns = getAllLeafColumns();
    return getCached(groupedRowModelCache, [sorted, currentOptions.columns, resolvedState.grouping, currentOptions.groupFooterMode, currentOptions.manualGrouping], () =>
      groupRows(sorted, leafColumns, resolvedState.grouping, currentOptions.groupFooterMode),
    );
  };

  const getExpanded = (): RowModel<TData> => {
    const grouped = getGrouped();
    const state = resolvedState;
    return getCached(expandedRowModelCache, [grouped, resolvedState.expanded], () =>
      state.grouping.length === 0 && !currentOptions.getSubRows && !currentOptions.getRowCanExpand
        ? grouped
        : expandRows(grouped, state.expanded),
    );
  };

  const getPrePagination = (): RowModel<TData> => getExpanded();

  const getPaginated = (): RowModel<TData> => {
    const prePagination = getPrePagination();

    if (currentOptions.manualPagination) {
      return getCached(paginatedRowModelCache, [prePagination, currentOptions.manualPagination], () => prePagination);
    }

    const { pageIndex, pageSize } = resolvedState.pagination;
    return getCached(paginatedRowModelCache, [prePagination, pageIndex, pageSize, currentOptions.manualPagination], () =>
      paginateRows(prePagination, pageIndex, pageSize),
    );
  };

  const getSelectedRows = (rowModel: RowModel<TData>, cache: CacheEntry<RowModel<TData>>): RowModel<TData> =>
    getCached(cache, [rowModel, resolvedState.rowSelection, resolvedState.allRowsSelected, currentOptions.rowSelectionMode], () =>
      createRowModel(
        getSelectableRowsInModel(rowModel, currentOptions.rowSelectionMode).filter((row) => getIsRowEffectivelySelected(resolvedState, row.id)),
        { includeSubRows: false },
      ),
    );

  const getRowForSelection = (rowId: RowId): Row<TData> | undefined =>
    getPaginated().rowsById[rowId] ?? getGrouped().rowsById[rowId] ?? getCore().rowsById[rowId];

  const emitRowEvent = (event: RowInteractionEventParams<TData>): RowInteractionEvent<TData> => {
    const nextEvent = createRowInteractionEvent(grid, event);
    currentOptions.onRowEvent?.(nextEvent);
    return nextEvent;
  };

  const emitCellEvent = (event: CellInteractionEventParams<TData>): CellInteractionEvent<TData> => {
    const nextEvent = createCellInteractionEvent(grid, event);
    currentOptions.onCellEvent?.(nextEvent);
    return nextEvent;
  };

  const emitCellEditEvent = (event: CellEditEventParams<TData>): CellEditEvent<TData> => {
    const nextEvent = createCellEditEvent(grid, event);
    currentOptions.onCellEdit?.(nextEvent);
    return nextEvent;
  };

  const emitColumnResizeEvent = (event: ColumnResizeEventParams<TData>): ColumnResizeEvent<TData> => {
    const nextEvent = createColumnResizeEvent(grid, event);
    currentOptions.onColumnResize?.(nextEvent);
    return nextEvent;
  };

  const trimCellEditHistory = () => {
    const limit = getCellEditHistoryLimit(currentOptions.editHistoryLimit);
    trimHistoryStack(cellEditUndoStack, limit);
    trimHistoryStack(cellEditRedoStack, limit);
  };

  const recordCellEditHistory = (events: CellEditEvent<TData>[]) => {
    const limit = getCellEditHistoryLimit(currentOptions.editHistoryLimit);

    if (limit === 0) {
      return;
    }

    const changes = events
      .filter((event) => !event.defaultPrevented && !Object.is(event.previousValue, event.value))
      .map((event) => ({
        rowId: event.row.id,
        columnId: event.column.id,
        previousValue: event.previousValue,
        value: event.value,
      }));

    if (changes.length === 0) {
      return;
    }

    cellEditUndoStack.push({ changes });
    trimHistoryStack(cellEditUndoStack, limit);
    cellEditRedoStack.length = 0;
  };

  const getEditableCellContext = (rowId: RowId, columnId: ColumnId) => {
    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();
    const rowIndex = rows.findIndex((row) => row.id === rowId);
    const columnIndex = columns.findIndex((column) => column.id === columnId);
    const row = rows[rowIndex];
    const column = columns[columnIndex];

    if (!row || !column || row.getIsGrouped() || row.getIsGroupFooter() || !column.getCanEdit()) {
      return null;
    }

    return {
      row,
      column,
      rowIndex,
      columnIndex,
      previousValue: row.getValue(column.id),
    };
  };

  const startCellEdit = (rowId: RowId, columnId: ColumnId, sourceEvent?: unknown): CellEditEvent<TData> | null => {
    const context = getEditableCellContext(rowId, columnId);

    if (!context) {
      return null;
    }

    const event = emitCellEditEvent({
      phase: "start",
      row: context.row,
      column: context.column,
      rowIndex: context.rowIndex,
      columnIndex: context.columnIndex,
      value: context.previousValue,
      previousValue: context.previousValue,
      sourceEvent,
      type: "cellEdit:start",
    });

    if (!event.defaultPrevented) {
      updateState((previous) => ({
        ...previous,
        focusedCell: { rowId, columnId },
        editingCell: { rowId, columnId },
      }));
    }

    return event;
  };

  const commitCellEdit = (value: unknown, sourceEvent?: unknown): CellEditEvent<TData> | null => {
    const editingCell = resolvedState.editingCell;

    if (!editingCell) {
      return null;
    }

    const context = getEditableCellContext(editingCell.rowId, editingCell.columnId);

    if (!context) {
      updatePartialState<CellCoordinate | null>("editingCell", () => null);
      return null;
    }

    const validation = validateCellEditValue(grid, context.row, context.column, value);
    const event = emitCellEditEvent({
      phase: "commit",
      row: context.row,
      column: context.column,
      rowIndex: context.rowIndex,
      columnIndex: context.columnIndex,
      value,
      previousValue: context.previousValue,
      validation,
      sourceEvent,
      type: "cellEdit:commit",
    });

    if (!event.defaultPrevented) {
      recordCellEditHistory([event]);
      updatePartialState<CellCoordinate | null>("editingCell", () => null);
    }

    return event;
  };

  const cancelCellEdit = (sourceEvent?: unknown): CellEditEvent<TData> | null => {
    const editingCell = resolvedState.editingCell;

    if (!editingCell) {
      return null;
    }

    const context = getEditableCellContext(editingCell.rowId, editingCell.columnId);

    if (!context) {
      updatePartialState<CellCoordinate | null>("editingCell", () => null);
      return null;
    }

    const event = emitCellEditEvent({
      phase: "cancel",
      row: context.row,
      column: context.column,
      rowIndex: context.rowIndex,
      columnIndex: context.columnIndex,
      value: context.previousValue,
      previousValue: context.previousValue,
      sourceEvent,
      type: "cellEdit:cancel",
    });

    if (!event.defaultPrevented) {
      updatePartialState<CellCoordinate | null>("editingCell", () => null);
    }

    return event;
  };

  const getIsAllRowsInModelSelected = (rowModel: RowModel<TData>): boolean => {
    const rows = getSelectableRowsInModel(rowModel, currentOptions.rowSelectionMode);
    return rows.length > 0 && rows.every((row) => getIsRowEffectivelySelected(resolvedState, row.id));
  };

  const getIsSomeRowsInModelSelected = (rowModel: RowModel<TData>): boolean =>
    getSelectableRowsInModel(rowModel, currentOptions.rowSelectionMode).some((row) => getIsRowEffectivelySelected(resolvedState, row.id)) &&
    !getIsAllRowsInModelSelected(rowModel);

  const canUseCompactAllRowsSelection = () =>
    currentOptions.rowSelectionMode !== "descendants"
    && resolvedState.grouping.length === 0
    && !currentOptions.getSubRows
    && !currentOptions.getRowCanExpand;

  const updateRowsSelected = (rowIds: readonly RowId[], selected?: boolean) => {
    updateState((previous) => {
      if (!previous.allRowsSelected) {
        return {
          ...previous,
          rowSelection: rowSelectionReducers.toggleRows(previous.rowSelection, rowIds, selected),
        };
      }

      const nextSelected = selected ?? !rowIds.every((rowId) => getIsRowEffectivelySelected(previous, rowId));
      const rowSelection = { ...previous.rowSelection };
      for (const rowId of rowIds) {
        if (nextSelected) {
          delete rowSelection[rowId];
        } else {
          rowSelection[rowId] = false;
        }
      }
      return { ...previous, rowSelection };
    });
  };

  const getColumnSortDirection = (columnId: ColumnId): SortDirection | false => {
    const rule = resolvedState.sorting.find((candidate) => candidate.id === columnId);

    if (!rule) {
      return false;
    }

    return rule.desc ? "desc" : "asc";
  };

  const getColumnLayout = (): ColumnLayout[] => {
    const columns = getVisibleLeafColumns();
    const state = resolvedState;

    return getCached(columnLayoutCache, [columns, state.columnSizing, state.columnPinning.left, state.columnPinning.right], () => {
      const hasPinnedColumns = state.columnPinning.left.length || state.columnPinning.right.length;
      const leftPinned = hasPinnedColumns ? columns.filter((column) => column.getIsPinned() === "left") : [];
      const rightPinned = hasPinnedColumns ? columns.filter((column) => column.getIsPinned() === "right") : [];
      const layoutColumns = hasPinnedColumns
        ? [...leftPinned, ...columns.filter((column) => column.getIsPinned() === false), ...rightPinned]
        : columns;
      const lastLeftPinnedId = leftPinned.at(-1)?.id;
      const firstRightPinnedId = rightPinned[0]?.id;
      let start = 0;
      let leftOffset = 0;
      let rightOffset = rightPinned.reduce((total, column) => total + column.getSize(), 0);

      return layoutColumns.map((column) => {
        const size = column.getSize();
        const pinned = column.getIsPinned();
        const layout: ColumnLayout = {
          id: column.id,
          size,
          start,
          end: start + size,
          pinned,
        };

        if (pinned === "left") {
          layout.pinnedStart = leftOffset;
          if (column.id === lastLeftPinnedId) {
            layout.pinnedEdge = "left";
          }
          leftOffset += size;
        }

        if (pinned === "right") {
          rightOffset -= size;
          layout.pinnedStart = rightOffset;
          if (column.id === firstRightPinnedId) {
            layout.pinnedEdge = "right";
          }
        }

        start += size;
        return layout;
      });
    });
  };

  const getSelectedCellCoordinates = () => {
    const range = resolvedState.cellSelectionRange;

    if (!range) {
      return [];
    }

    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();
    const startRowIndex = rows.findIndex((row) => row.id === range.start.rowId);
    const endRowIndex = rows.findIndex((row) => row.id === range.end.rowId);
    const startColumnIndex = columns.findIndex((column) => column.id === range.start.columnId);
    const endColumnIndex = columns.findIndex((column) => column.id === range.end.columnId);

    if (startRowIndex < 0 || endRowIndex < 0 || startColumnIndex < 0 || endColumnIndex < 0) {
      return [];
    }

    const minRowIndex = Math.min(startRowIndex, endRowIndex);
    const maxRowIndex = Math.max(startRowIndex, endRowIndex);
    const minColumnIndex = Math.min(startColumnIndex, endColumnIndex);
    const maxColumnIndex = Math.max(startColumnIndex, endColumnIndex);
    const coordinates: CellCoordinate[] = [];

    for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex += 1) {
      for (let columnIndex = minColumnIndex; columnIndex <= maxColumnIndex; columnIndex += 1) {
        const row = rows[rowIndex];
        const column = columns[columnIndex];

        if (row && column) {
          coordinates.push({ rowId: row.id, columnId: column.id });
        }
      }
    }

    return coordinates;
  };

  const getIsCellRangeSelected = (rowId: RowId, columnId: ColumnId): boolean =>
    getSelectedCellCoordinates().some((coordinate) => coordinate.rowId === rowId && coordinate.columnId === columnId);

  const getClipboardCellValue = (
    row: Row<TData>,
    rowIndex: number,
    column: Column<TData, unknown>,
    columnIndex: number,
  ) => {
    const value = row.getValue(column.id);
    const context: ClipboardCellContext<TData, unknown> = {
      grid,
      row,
      rowIndex,
      column,
      columnIndex,
      value,
    };

    return column.columnDef.clipboardValue?.(context) ?? currentOptions.getClipboardCellValue?.(context) ?? value;
  };

  const getClipboardText = (options: ClipboardCopyOptions = {}) => {
    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();
    const rowById = new Map(rows.map((row, index) => [row.id, { row, index }]));
    const columnById = new Map(columns.map((column, index) => [column.id, { column, index }]));
    const selectedCoordinates = getSelectedCellCoordinates();
    const focusedCell = resolvedState.focusedCell;
    const coordinates =
      selectedCoordinates.length > 0
        ? selectedCoordinates
        : focusedCell && rowById.has(focusedCell.rowId) && columnById.has(focusedCell.columnId)
          ? [focusedCell]
          : [];

    if (coordinates.length === 0) {
      return "";
    }

    const selectedRowIds = Array.from(new Set(coordinates.map((coordinate) => coordinate.rowId)));
    const selectedColumnIds = Array.from(new Set(coordinates.map((coordinate) => coordinate.columnId)));
    const body = selectedRowIds.map((rowId) => {
      const rowEntry = rowById.get(rowId);

      return selectedColumnIds.map((columnId) => {
        const columnEntry = columnById.get(columnId);

        if (!rowEntry || !columnEntry) {
          return "";
        }

        return serializeDelimitedValue(getClipboardCellValue(rowEntry.row, rowEntry.index, columnEntry.column, columnEntry.index), "\t");
      });
    });

    const clipboardRows = options.includeHeaders
      ? [
          selectedColumnIds.map((columnId) =>
            serializeDelimitedValue(getColumnHeaderValue(columnById.get(columnId)?.column), "\t"),
          ),
          ...body,
        ]
      : body;

    return clipboardRows.map((row) => row.join("\t")).join("\n");
  };

  const getExportCellValue = (
    row: Row<TData>,
    rowIndex: number,
    column: Column<TData, unknown>,
    columnIndex: number,
  ) => {
    const value = row.getValue(column.id);
    const context: ExportCellContext<TData, unknown> = {
      grid,
      row,
      rowIndex,
      column,
      columnIndex,
      value,
    };

    return (
      column.columnDef.exportValue?.(context) ??
      currentOptions.getExportCellValue?.(context) ??
      column.columnDef.clipboardValue?.(context) ??
      currentOptions.getClipboardCellValue?.(context) ??
      value
    );
  };

  const getExportRows = (scope: ExportRowScope = "page"): Row<TData>[] => {
    if (scope === "all") {
      return getCore().rows;
    }

    if (scope === "filtered") {
      return getFiltered().rows;
    }

    if (scope === "pre-pagination") {
      return getPrePagination().rows;
    }

    if (scope === "selected") {
      return getSelectedRows(getCore(), selectedRowModelCache).rows;
    }

    if (scope === "filtered-selected") {
      return getSelectedRows(getPrePagination(), filteredSelectedRowModelCache).rows;
    }

    if (scope === "page-selected") {
      return getSelectedRows(getPaginated(), pageSelectedRowModelCache).rows;
    }

    return getPaginated().rows;
  };

  const getExportColumns = (columnIds?: ColumnId[]): Column<TData, unknown>[] => {
    if (!columnIds) {
      return getVisibleLeafColumns();
    }

    const columnById = new Map(getAllLeafColumns().map((column) => [column.id, column]));
    const columns: Column<TData, unknown>[] = [];
    const seen = new Set<ColumnId>();

    for (const columnId of columnIds) {
      const column = columnById.get(columnId);

      if (column && !seen.has(column.id)) {
        columns.push(column);
        seen.add(column.id);
      }
    }

    return columns;
  };

  const getExportText = (options: ExportTextOptions = {}) => {
    const delimiter = options.delimiter ?? (options.format === "csv" ? "," : "\t");

    if (delimiter.length === 0) {
      return "";
    }

    const newline = options.newline ?? "\n";
    const rows = limitExportRows(getExportRows(options.rowScope), options.maxRows, options.maxRowsMode);
    const columns = getExportColumns(options.columnIds);

    if (rows === null || rows.length === 0 || columns.length === 0) {
      return "";
    }

    const body = rows.map((row, rowIndex) =>
      columns.map((column, columnIndex) => serializeDelimitedValue(getExportCellValue(row, rowIndex, column, columnIndex), delimiter)),
    );
    const exportRows = options.includeHeaders
      ? [columns.map((column) => serializeDelimitedValue(getColumnHeaderValue(column), delimiter)), ...body]
      : body;

    return exportRows.map((row) => row.join(delimiter)).join(newline);
  };

  const getExportFile = (options: ExportFileOptions = {}) => createExportFile(getExportText(options), options);

  const pasteClipboardText = (text: string, options: ClipboardPasteOptions = {}) => {
    const clipboardRows = parseClipboardText(text);

    if (clipboardRows.length === 0 || clipboardRows[0]?.length === 0) {
      return createEmptyClipboardPasteResult<TData>();
    }

    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();
    const target = options.target ?? getPasteStartCoordinate(rows, columns, getSelectedCellCoordinates(), resolvedState.focusedCell);
    const startRowIndex = target ? rows.findIndex((row) => row.id === target.rowId) : -1;
    const startColumnIndex = target ? columns.findIndex((column) => column.id === target.columnId) : -1;

    if (startRowIndex < 0 || startColumnIndex < 0) {
      return createEmptyClipboardPasteResult<TData>();
    }

    const selectedCoordinates = getSelectedCellCoordinates();
    const fillSelection = clipboardRows.length === 1 && clipboardRows[0]?.length === 1 && selectedCoordinates.length > 1;
    const targetCoordinates = fillSelection
      ? selectedCoordinates
      : getClipboardPasteCoordinates(rows, columns, startRowIndex, startColumnIndex, clipboardRows);
    const maxCells = typeof options.maxCells === "number" && Number.isFinite(options.maxCells) ? Math.max(0, Math.floor(options.maxCells)) : null;
    const maxCellsMode = options.maxCellsMode ?? "block";
    const attemptedCells = targetCoordinates.length;
    const result: ClipboardPasteResult<TData> = {
      attemptedCells,
      committedCells: [],
      skippedCells: [],
      validationErrors: [],
      events: [],
      blocked: false,
      truncated: false,
    };

    if (maxCells !== null && targetCoordinates.length > maxCells) {
      if (maxCellsMode === "block") {
        result.blocked = true;
        result.skippedCells = createMaxCellSkippedCells(rows, columns, targetCoordinates);
        return result;
      }

      result.truncated = true;
      result.skippedCells.push(...createMaxCellSkippedCells(rows, columns, targetCoordinates.slice(maxCells)));
    }

    const writableTargetCoordinates = maxCells !== null && maxCellsMode === "truncate" ? targetCoordinates.slice(0, maxCells) : targetCoordinates;
    const events: CellEditEvent<TData>[] = [];

    for (const coordinate of writableTargetCoordinates) {
      const rowIndex = rows.findIndex((row) => row.id === coordinate.rowId);
      const columnIndex = columns.findIndex((column) => column.id === coordinate.columnId);
      const row = rows[rowIndex];
      const column = columns[columnIndex];

      if (!row || !column || !column.getCanEdit()) {
        result.skippedCells.push({
          coordinate,
          row,
          rowIndex: row ? rowIndex : undefined,
          column,
          columnIndex: column ? columnIndex : undefined,
          reason: "readonly",
        });
        continue;
      }

      const rowOffset = rowIndex - startRowIndex;
      const columnOffset = columnIndex - startColumnIndex;
      const rawValue = fillSelection ? clipboardRows[0]?.[0] : clipboardRows[rowOffset]?.[columnOffset];

      if (rawValue === undefined) {
        result.skippedCells.push({
          coordinate,
          row,
          rowIndex,
          column,
          columnIndex,
          reason: "missing-value",
        });
        continue;
      }

      const previousValue = row.getValue(column.id);
      const value = parsePastedCellValue(grid, row, column, rawValue);
      const validation = validateCellEditValue(grid, row, column, value);
      const event = emitCellEditEvent({
        phase: "commit",
        row,
        column,
        rowIndex,
        columnIndex,
        value,
        previousValue,
        validation,
        sourceEvent: options.sourceEvent,
        type: "cellEdit:commit",
      });

      if (!event.defaultPrevented) {
        const committedCell = {
          coordinate,
          row,
          rowIndex,
          column,
          columnIndex,
          rawValue,
          value,
          previousValue,
          event,
        };
        result.committedCells.push(committedCell);
        events.push(event);
      } else if (event.validation?.valid === false) {
        const validationError = {
          coordinate,
          row,
          rowIndex,
          column,
          columnIndex,
          rawValue,
          value,
          previousValue,
          validation: event.validation,
          event,
        };
        result.validationErrors.push(validationError);
        result.skippedCells.push({
          coordinate,
          row,
          rowIndex,
          column,
          columnIndex,
          rawValue,
          value,
          previousValue,
          reason: "validation",
          validation: event.validation,
          event,
        });
      } else {
        result.skippedCells.push({
          coordinate,
          row,
          rowIndex,
          column,
          columnIndex,
          rawValue,
          value,
          previousValue,
          reason: "validation",
          event,
        });
      }
    }

    result.events = events;

    if (events.length > 0) {
      recordCellEditHistory(events);
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];

      updateState((previous) => ({
        ...previous,
        focusedCell: lastEvent ? { rowId: lastEvent.row.id, columnId: lastEvent.column.id } : previous.focusedCell,
        editingCell: null,
        cellSelectionRange:
          firstEvent && lastEvent
            ? {
                start: { rowId: firstEvent.row.id, columnId: firstEvent.column.id },
                end: { rowId: lastEvent.row.id, columnId: lastEvent.column.id },
              }
            : previous.cellSelectionRange,
      }));
    }

    return result;
  };

  const fillCellRange = (end: CellCoordinate, options: CellFillOptions = {}) => {
    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();
    const range = resolvedState.cellSelectionRange;
    const sourceBounds = range ? getCellRangeBounds(rows, columns, range) : null;
    const sourceRange = range;
    const endRowIndex = rows.findIndex((row) => row.id === end.rowId);
    const endColumnIndex = columns.findIndex((column) => column.id === end.columnId);

    if (!sourceRange || !sourceBounds || endRowIndex < 0 || endColumnIndex < 0) {
      return [];
    }

    const targetCoordinates = limitCellFillTargetCoordinates(
      getCellFillTargetCoordinates(rows, columns, sourceBounds, endRowIndex, endColumnIndex),
      options.maxCells,
      options.maxCellsMode,
    );
    const events: CellEditEvent<TData>[] = [];

    if (!targetCoordinates) {
      return [];
    }

    for (const target of targetCoordinates) {
      const targetRow = rows[target.rowIndex];
      const targetColumn = columns[target.columnIndex];
      const fillValue = targetRow && targetColumn ? getCellFillValue(grid, rows, columns, sourceBounds, target, targetRow, targetColumn, options.fillMode) : null;

      if (!targetRow || !targetColumn || !fillValue || !targetColumn.getCanEdit()) {
        continue;
      }

      const previousValue = targetRow.getValue(targetColumn.id);
      const value = fillValue.value;
      const validation = validateCellEditValue(grid, targetRow, targetColumn, value);
      const event = emitCellEditEvent({
        phase: "commit",
        row: targetRow,
        column: targetColumn,
        rowIndex: target.rowIndex,
        columnIndex: target.columnIndex,
        value,
        previousValue,
        validation,
        sourceEvent: options.sourceEvent,
        type: "cellEdit:commit",
      });

      if (!event.defaultPrevented) {
        events.push(event);
      }
    }

    if (events.length > 0) {
      recordCellEditHistory(events);
      updateState((previous) => ({
        ...previous,
        focusedCell: end,
        editingCell: null,
        cellSelectionRange: { start: sourceRange.start, end },
      }));
    }

    return events;
  };

  const moveFocus = (direction: FocusDirection, options: MoveFocusOptions = {}) => {
    const rows = getPaginated().rows;
    const columns = getVisibleLeafColumns();

    if (rows.length === 0 || columns.length === 0) {
      updateState((previous) => ({
        ...previous,
        focusedCell: focusReducers.reset(),
        cellSelectionRange: null,
      }));
      return;
    }

    const focusedCell = resolvedState.focusedCell;

    if (!focusedCell) {
      const nextCoordinate = { rowId: rows[0]?.id ?? "", columnId: columns[0]?.id ?? "" };
      updateState((previous) => ({
        ...previous,
        focusedCell: focusReducers.set(previous.focusedCell, nextCoordinate),
        cellSelectionRange: options.extendSelection ? { start: nextCoordinate, end: nextCoordinate } : null,
      }));
      return;
    }

    const currentRowIndex = Math.max(
      0,
      rows.findIndex((row) => row.id === focusedCell.rowId),
    );
    const currentColumnIndex = Math.max(
      0,
      columns.findIndex((column) => column.id === focusedCell.columnId),
    );

    let nextRowIndex = currentRowIndex;
    let nextColumnIndex = currentColumnIndex;

    const pageRowStep = Math.max(1, Math.min(rows.length - 1, resolvedState.pagination.pageSize));

    if (direction === "up") {
      nextRowIndex -= 1;
    } else if (direction === "down") {
      nextRowIndex += 1;
    } else if (direction === "left") {
      nextColumnIndex -= 1;
    } else if (direction === "right") {
      nextColumnIndex += 1;
    } else if (direction === "home") {
      nextColumnIndex = 0;
    } else if (direction === "end") {
      nextColumnIndex = columns.length - 1;
    } else if (direction === "grid-start") {
      nextRowIndex = 0;
      nextColumnIndex = 0;
    } else if (direction === "grid-end") {
      nextRowIndex = rows.length - 1;
      nextColumnIndex = columns.length - 1;
    } else if (direction === "page-up") {
      nextRowIndex -= pageRowStep;
    } else if (direction === "page-down") {
      nextRowIndex += pageRowStep;
    }

    const nextRow = rows[Math.max(0, Math.min(rows.length - 1, nextRowIndex))];
    const nextColumn = columns[Math.max(0, Math.min(columns.length - 1, nextColumnIndex))];
    const nextCoordinate = nextRow && nextColumn ? { rowId: nextRow.id, columnId: nextColumn.id } : null;

    updateState((previous) => ({
      ...previous,
      focusedCell: focusReducers.set(previous.focusedCell, nextCoordinate),
      cellSelectionRange:
        options.extendSelection && nextCoordinate
          ? {
              start: previous.cellSelectionRange?.start ?? focusedCell,
              end: nextCoordinate,
            }
          : null,
    }));
  };

  const getCellEditHistoryState = (): CellEditHistoryState => {
    const undoDepth = cellEditUndoStack.length;
    const redoDepth = cellEditRedoStack.length;
    const limit = getCellEditHistoryLimit(currentOptions.editHistoryLimit);

    if (
      cellEditHistoryStateSnapshot
      && cellEditHistoryStateSnapshot.undoDepth === undoDepth
      && cellEditHistoryStateSnapshot.redoDepth === redoDepth
      && cellEditHistoryStateSnapshot.limit === limit
    ) {
      return cellEditHistoryStateSnapshot;
    }

    cellEditHistoryStateSnapshot = { undoDepth, redoDepth, limit };
    return cellEditHistoryStateSnapshot;
  };

  const subscribeSelector = <TSelected>(
    selector: GridSelector<TData, TSelected>,
    listener: GridSelectorListener<TSelected>,
    options?: GridSelectorSubscriptionOptions<TSelected>,
  ) => {
    const equalityFn = options?.equalityFn ?? Object.is;
    let selectedValue = selector(grid);

    if (options?.fireImmediately) {
      listener(selectedValue, undefined);
    }

    const selectorListener = () => {
      const nextValue = selector(grid);
      if (equalityFn(selectedValue, nextValue)) {
        return;
      }

      const previousValue = selectedValue;
      selectedValue = nextValue;
      listener(nextValue, previousValue);
    };

    listeners.add(selectorListener);
    return () => {
      listeners.delete(selectorListener);
    };
  };

  const replayCellEditHistory = (
    action: CellEditHistoryAction,
    sourceEvent?: unknown,
  ): CellEditEvent<TData>[] => {
    const sourceStack = action === "undo" ? cellEditUndoStack : cellEditRedoStack;
    const targetStack = action === "undo" ? cellEditRedoStack : cellEditUndoStack;
    const entry = sourceStack.pop();

    if (!entry) {
      return [];
    }

    const changes = action === "undo" ? [...entry.changes].reverse() : entry.changes;
    const replayedChanges: CellEditHistoryChange[] = [];
    const events: CellEditEvent<TData>[] = [];

    for (const change of changes) {
      const context = getHistoryCellContext(grid, change.rowId, change.columnId);

      if (!context) {
        continue;
      }

      const value = action === "undo" ? change.previousValue : change.value;

      if (Object.is(context.previousValue, value)) {
        replayedChanges.push(change);
        continue;
      }

      const validation = validateCellEditValue(grid, context.row, context.column, value);
      const event = emitCellEditEvent({
        phase: "commit",
        row: context.row,
        column: context.column,
        rowIndex: context.rowIndex,
        columnIndex: context.columnIndex,
        value,
        previousValue: context.previousValue,
        historyAction: action,
        validation,
        sourceEvent,
        type: `cellEdit:${action}`,
      });

      if (!event.defaultPrevented) {
        replayedChanges.push(change);
        events.push(event);
      }
    }

    if (replayedChanges.length > 0) {
      targetStack.push({
        changes: action === "undo" ? replayedChanges.reverse() : replayedChanges,
      });
      trimHistoryStack(targetStack, getCellEditHistoryLimit(currentOptions.editHistoryLimit));
    }

    const lastEvent = events.at(-1);
    if (lastEvent) {
      updateState((previous) => ({
        ...previous,
        focusedCell: { rowId: lastEvent.row.id, columnId: lastEvent.column.id },
        editingCell: null,
        cellSelectionRange: null,
      }));
    } else {
      notifyListeners();
    }

    return events;
  };

  grid = {
    getOptions: () => currentOptions,
    setOptions: (updater, options) => {
      const previousControlledState = currentOptions.state;
      currentOptions = applyUpdater(currentOptions, updater);
      if (currentOptions.state !== previousControlledState) {
        resolvedState = currentOptions.state ? mergeStateFromBase(internalState, currentOptions.state) : internalState;
      }
      trimCellEditHistory();
      if (options?.notify !== false) {
        notifyListeners();
      }
    },
    getState: () => resolvedState,
    setState: updateState,
    getAllColumns,
    getAllLeafColumns,
    getVisibleLeafColumns,
    getHeaderGroups,
    getColumnLayout,
    getCoreRowModel: getCore,
    getFilteredRowModel: getFiltered,
    getSortedRowModel: getSorted,
    getGroupedRowModel: getGrouped,
    getExpandedRowModel: getExpanded,
    getPrePaginationRowModel: getPrePagination,
    getRowModel: getPaginated,
    emitRowEvent,
    emitCellEvent,
    emitCellEditEvent,
    emitColumnResizeEvent,
    getCacheDiagnostics: () => getCacheDiagnostics(cacheEntries),
    resetCacheDiagnostics: () => resetCacheDiagnostics(cacheEntries),
    getPageCount: () => {
      if (typeof currentOptions.pageCount === "number") {
        return normalizePaginationPageCount(currentOptions.pageCount);
      }

      return normalizePaginationPageCount(Math.ceil(getPrePagination().rows.length / normalizePaginationPageSize(resolvedState.pagination.pageSize)));
    },
    getCanPreviousPage: () => normalizePaginationPageIndex(resolvedState.pagination.pageIndex) > 0,
    getCanNextPage: () => normalizePaginationPageIndex(resolvedState.pagination.pageIndex) < grid.getPageCount() - 1,
    firstPage: () =>
      updatePartialState<PaginationState>("pagination", (previous) => paginationReducers.setPageIndex(previous, 0)),
    previousPage: () =>
      updatePartialState<PaginationState>("pagination", (previous) =>
        paginationReducers.setPageIndex(
          previous,
          Math.max(0, Math.min(grid.getPageCount() - 1, normalizePaginationPageIndex(previous.pageIndex)) - 1),
        ),
      ),
    nextPage: () =>
      updatePartialState<PaginationState>("pagination", (previous) =>
        paginationReducers.setPageIndex(
          previous,
          Math.min(grid.getPageCount() - 1, normalizePaginationPageIndex(previous.pageIndex) + 1),
        ),
      ),
    lastPage: () =>
      updatePartialState<PaginationState>("pagination", (previous) =>
        paginationReducers.setPageIndex(previous, grid.getPageCount() - 1),
      ),
    setSorting: (updater: Updater<SortingState>) =>
      updatePartialState<SortingState>("sorting", (previous) => sortingReducers.set(previous, updater)),
    getColumnSortDirection,
    toggleColumnSorting: (columnId, desc, multi = false) =>
      updatePartialState<SortingState>("sorting", (previous) => sortingReducers.toggleColumn(previous, columnId, desc, multi)),
    setColumnFilters: (updater: Updater<ColumnFiltersState>) =>
      updatePartialState<ColumnFiltersState>("columnFilters", (previous) =>
        filterReducers.setColumnFilters(previous, updater),
      ),
    setGlobalFilter: (updater: Updater<string>) =>
      updatePartialState<string>("globalFilter", (previous) =>
        filterReducers.setGlobalFilter(previous, updater),
      ),
    setGrouping: (updater: Updater<GroupingState>) =>
      updatePartialState<GroupingState>("grouping", (previous) =>
        groupingReducers.set(getAllLeafColumns(), previous, updater),
      ),
    toggleColumnGrouping: (columnId: ColumnId, grouped?: boolean) =>
      updatePartialState<GroupingState>("grouping", (previous) =>
        groupingReducers.toggleColumn(getAllLeafColumns(), previous, columnId, grouped),
      ),
    moveGroupingColumn: (columnId: ColumnId, targetColumnId: ColumnId, position: ColumnMovePosition = "before") =>
      updatePartialState<GroupingState>("grouping", (previous) =>
        groupingReducers.moveColumn(getAllLeafColumns(), previous, columnId, targetColumnId, position),
      ),
    resetGrouping: () => updatePartialState<GroupingState>("grouping", groupingReducers.reset),
    setExpanded: (updater: Updater<ExpandedState>) =>
      updatePartialState<ExpandedState>("expanded", (previous) =>
        expandedReducers.set(getGrouped().flatRows, previous, updater),
      ),
    toggleRowExpanded: (rowId: RowId, expanded?: boolean) =>
      updatePartialState<ExpandedState>("expanded", (previous) =>
        expandedReducers.toggleRow(getGrouped().flatRows, previous, rowId, expanded),
      ),
    toggleAllRowsExpanded: (expanded?: boolean) =>
      updatePartialState<ExpandedState>("expanded", (previous) =>
        expandedReducers.toggleRows(getGrouped().flatRows, previous, expanded),
      ),
    getIsRowExpanded: (rowId: RowId) => !!resolvedState.expanded[rowId],
    resetExpanded: () => updatePartialState<ExpandedState>("expanded", expandedReducers.reset),
    setPagination: (updater: Updater<PaginationState>) =>
      updatePartialState<PaginationState>("pagination", (previous) => paginationReducers.set(previous, updater)),
    setPageIndex: (pageIndex: number) =>
      updatePartialState<PaginationState>("pagination", (previous) => paginationReducers.setPageIndex(previous, pageIndex)),
    setPageSize: (pageSize: number) =>
      updatePartialState<PaginationState>("pagination", (previous) => paginationReducers.setPageSize(previous, pageSize)),
    getIsRowSelected: (rowId) => {
      const state = resolvedState;
      if (currentOptions.rowSelectionMode !== "descendants"
        && state.grouping.length === 0
        && !currentOptions.getSubRows
        && !currentOptions.getRowCanExpand) {
        return getIsRowEffectivelySelected(state, rowId);
      }
      if (!hasSelectedRows(state)) {
        return false;
      }

      const row = getRowForSelection(rowId);

      if (!row) {
        return getIsRowEffectivelySelected(state, rowId);
      }

      const rows = getSelectableRows(row, currentOptions.rowSelectionMode);
      return rows.length > 0 && rows.every((candidate) => getIsRowEffectivelySelected(state, candidate.id));
    },
    getSelectedRowModel: () => getSelectedRows(getCore(), selectedRowModelCache),
    getFilteredSelectedRowModel: () => getSelectedRows(getPrePagination(), filteredSelectedRowModelCache),
    getPageSelectedRowModel: () => getSelectedRows(getPaginated(), pageSelectedRowModelCache),
    toggleRowSelected: (rowId, selected) =>
      canUseCompactAllRowsSelection()
        ? updateRowsSelected([rowId], selected)
        : updatePartialState<RowSelectionState>("rowSelection", (previous) => {
        if (currentOptions.rowSelectionMode !== "descendants"
          && resolvedState.grouping.length === 0
          && !currentOptions.getSubRows
          && !currentOptions.getRowCanExpand) {
          return rowSelectionReducers.toggleRow(previous, rowId, selected);
        }
        const row = getRowForSelection(rowId);

        if (!row) {
          return rowSelectionReducers.toggleRow(previous, rowId, selected);
        }

        return rowSelectionReducers.toggleRows(previous, getSelectableRows(row, currentOptions.rowSelectionMode).map((candidate) => candidate.id), selected);
      }),
    toggleAllPageRowsSelected: (selected) =>
      updateRowsSelected(getSelectableRowsInModel(getPaginated(), currentOptions.rowSelectionMode).map((row) => row.id), selected),
    toggleAllFilteredRowsSelected: (selected) =>
      updateRowsSelected(getSelectableRowsInModel(getPrePagination(), currentOptions.rowSelectionMode).map((row) => row.id), selected),
    toggleAllRowsSelected: (selected) => {
      if (canUseCompactAllRowsSelection()) {
        const nextSelected = selected ?? !getIsAllRowsInModelSelected(getCore());
        updateState((previous) => ({ ...previous, rowSelection: {}, allRowsSelected: nextSelected }));
        return;
      }
      updateState((previous) => ({
        ...previous,
        rowSelection: rowSelectionReducers.toggleRows(previous.rowSelection, getSelectableRowsInModel(getCore(), currentOptions.rowSelectionMode).map((row) => row.id), selected),
        allRowsSelected: false,
      }));
    },
    pruneRowSelection: (scope: RowSelectionCleanupScope = "loaded") => {
      const rowIds = getRowIdsForSelectionCleanup(scope, {
        loaded: createRowModel(getSelectableRowsInModel(getCore(), currentOptions.rowSelectionMode), { includeSubRows: false }),
        filtered: createRowModel(getSelectableRowsInModel(getPrePagination(), currentOptions.rowSelectionMode), { includeSubRows: false }),
        page: createRowModel(getSelectableRowsInModel(getPaginated(), currentOptions.rowSelectionMode), { includeSubRows: false }),
      });
      updatePartialState<RowSelectionState>("rowSelection", (previous) =>
        resolvedState.allRowsSelected
          ? pruneSelectionExceptions(previous, rowIds)
          : rowSelectionReducers.prune(previous, rowIds),
      );
    },
    getIsAllRowsSelected: () => getIsAllRowsInModelSelected(getCore()),
    getIsSomeRowsSelected: () => getIsSomeRowsInModelSelected(getCore()),
    getIsAllFilteredRowsSelected: () => getIsAllRowsInModelSelected(getPrePagination()),
    getIsSomeFilteredRowsSelected: () => getIsSomeRowsInModelSelected(getPrePagination()),
    getIsAllPageRowsSelected: () => getIsAllRowsInModelSelected(getPaginated()),
    getIsSomePageRowsSelected: () => getIsSomeRowsInModelSelected(getPaginated()),
    resetRowSelection: () => updateState((previous) => ({ ...previous, rowSelection: {}, allRowsSelected: false })),
    getIsColumnVisible: (columnId: ColumnId) => resolvedState.columnVisibility[columnId] !== false,
    setColumnVisibility: (updater: Updater<ColumnVisibilityState>) =>
      updatePartialState<ColumnVisibilityState>("columnVisibility", (previous) =>
        columnVisibilityReducers.set(previous, updater),
      ),
    toggleColumnVisibility: (columnId: ColumnId, visible?: boolean) =>
      updatePartialState<ColumnVisibilityState>("columnVisibility", (previous) =>
        columnVisibilityReducers.toggleColumn(previous, columnId, visible),
      ),
    resetColumnVisibility: () => updatePartialState<ColumnVisibilityState>("columnVisibility", columnVisibilityReducers.reset),
    getColumnSize: (columnId: ColumnId) => getAllLeafColumns().find((column) => column.id === columnId)?.getSize(),
    setColumnSizing: (updater: Updater<ColumnSizingState>) =>
      updatePartialState<ColumnSizingState>("columnSizing", (previous) =>
        columnSizingReducers.set(getAllLeafColumns(), previous, updater),
      ),
    setColumnSize: (columnId: ColumnId, size: number) =>
      updatePartialState<ColumnSizingState>("columnSizing", (previous) =>
        columnSizingReducers.setColumnSize(getAllLeafColumns(), previous, columnId, size),
      ),
    resetColumnSizing: () => updatePartialState<ColumnSizingState>("columnSizing", columnSizingReducers.reset),
    setColumnOrder: (updater: Updater<ColumnOrderState>) =>
      updatePartialState<ColumnOrderState>("columnOrder", (previous) =>
        columnOrderReducers.set(getOrderableLeafColumns(getAllColumns()), previous, updater),
      ),
    moveColumn: (columnId: ColumnId, targetColumnId: ColumnId, position: ColumnMovePosition = "before") =>
      updatePartialState<ColumnOrderState>("columnOrder", (previous) =>
        columnOrderReducers.moveColumn(getOrderableLeafColumns(getAllColumns()), previous, columnId, targetColumnId, position),
      ),
    resetColumnOrder: () => updatePartialState<ColumnOrderState>("columnOrder", columnOrderReducers.reset),
    setColumnPinning: (updater: Updater<ColumnPinningState>) =>
      updatePartialState<ColumnPinningState>("columnPinning", (previous) => columnPinningReducers.set(previous, updater)),
    pinColumn: (columnId: ColumnId, position: ColumnPinningPosition) =>
      updatePartialState<ColumnPinningState>("columnPinning", (previous) =>
        columnPinningReducers.pinColumn(previous, columnId, position),
      ),
    resetColumnPinning: () => updatePartialState<ColumnPinningState>("columnPinning", columnPinningReducers.reset),
    setFocusedCell: (coordinate: CellCoordinate | null) =>
      updateState((previous) => ({
        ...previous,
        focusedCell: focusReducers.set(previous.focusedCell, coordinate),
        cellSelectionRange: areCellCoordinatesEqual(previous.focusedCell, coordinate) ? previous.cellSelectionRange : null,
      })),
    moveFocus,
    getCellSelectionRange: () => resolvedState.cellSelectionRange,
    setCellSelectionRange: (updater: Updater<CellRangeSelectionState>) =>
      updatePartialState<CellRangeSelectionState>("cellSelectionRange", updater),
    selectCellRange: (start: CellCoordinate, end: CellCoordinate = start) =>
      updateState((previous) => ({
        ...previous,
        focusedCell: end,
        cellSelectionRange: { start, end },
      })),
    resetCellSelectionRange: () => updatePartialState<CellRangeSelectionState>("cellSelectionRange", () => null),
    getIsCellRangeSelected,
    getSelectedCellCoordinates,
    getClipboardText,
    getExportText,
    getExportFile,
    pasteClipboardText,
    fillCellRange,
    getIsCellEditing: (rowId, columnId) => {
      const editingCell = resolvedState.editingCell;
      return editingCell?.rowId === rowId && editingCell.columnId === columnId;
    },
    startCellEdit,
    commitCellEdit,
    cancelCellEdit,
    getCellEditHistoryState,
    getCanUndoCellEdit: () => cellEditUndoStack.length > 0,
    getCanRedoCellEdit: () => cellEditRedoStack.length > 0,
    undoCellEdit: (sourceEvent) => replayCellEditHistory("undo", sourceEvent),
    redoCellEdit: (sourceEvent) => replayCellEditHistory("redo", sourceEvent),
    clearCellEditHistory: () => {
      if (cellEditUndoStack.length === 0 && cellEditRedoStack.length === 0) {
        return;
      }
      cellEditUndoStack.length = 0;
      cellEditRedoStack.length = 0;
      notifyListeners();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeSelector,
  };

  return grid;
}

interface CellEditHistoryChange {
  rowId: RowId;
  columnId: ColumnId;
  previousValue: unknown;
  value: unknown;
}

interface CellEditHistoryEntry {
  changes: CellEditHistoryChange[];
}

function getCellEditHistoryLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return 0;
  }
  return Math.min(1_000, Math.floor(value));
}

function trimHistoryStack(stack: CellEditHistoryEntry[], limit: number): void {
  if (limit === 0) {
    stack.length = 0;
    return;
  }
  if (stack.length > limit) {
    stack.splice(0, stack.length - limit);
  }
}

function getHistoryCellContext<TData>(grid: Grid<TData>, rowId: RowId, columnId: ColumnId) {
  const rowModel = grid.getCoreRowModel();
  const columns = grid.getAllLeafColumns();
  const row = rowModel.rowsById[rowId];
  const columnIndex = columns.findIndex((candidate) => candidate.id === columnId);
  const column = columns[columnIndex];

  if (!row || !column || row.getIsGrouped() || row.getIsGroupFooter() || !column.getCanEdit()) {
    return null;
  }

  return {
    row,
    column,
    rowIndex: rowModel.flatRows.findIndex((candidate) => candidate.id === rowId),
    columnIndex,
    previousValue: row.getValue(column.id),
  };
}

function areGridStatesShallowEqual(left: GridState, right: GridState): boolean {
  for (const key of Object.keys(left) as Array<keyof GridState>) {
    if (!Object.is(left[key], right[key])) return false;
  }
  return true;
}

function getIsRowEffectivelySelected(state: Pick<GridState, "rowSelection" | "allRowsSelected">, rowId: RowId): boolean {
  return state.allRowsSelected ? state.rowSelection[rowId] !== false : !!state.rowSelection[rowId];
}

function hasSelectedRows(state: Pick<GridState, "rowSelection" | "allRowsSelected">): boolean {
  if (state.allRowsSelected) return true;
  for (const rowId in state.rowSelection) {
    if (state.rowSelection[rowId]) return true;
  }
  return false;
}

function pruneSelectionExceptions(rowSelection: RowSelectionState, rowIds: readonly RowId[]): RowSelectionState {
  const retainedRowIds = new Set(rowIds);
  const next: RowSelectionState = {};
  for (const rowId in rowSelection) {
    if (retainedRowIds.has(rowId)) next[rowId] = rowSelection[rowId] ?? false;
  }
  return next;
}

function getColumnHeaderValue<TData>(column: Column<TData, unknown> | undefined): unknown {
  if (!column) {
    return "";
  }

  return typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
}

function serializeDelimitedValue(value: unknown, delimiter: string): string {
  if (value == null) {
    return "";
  }

  const text = value instanceof Date ? value.toISOString() : String(value);

  if (!text.includes(delimiter) && !/[\n\r"]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function parseClipboardText(text: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === "\t") {
      rows[rows.length - 1]?.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      rows[rows.length - 1]?.push(cell);
      cell = "";

      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      rows.push([]);
    } else {
      cell += character;
    }
  }

  rows[rows.length - 1]?.push(cell);

  if (rows.length > 1) {
    const lastRow = rows[rows.length - 1];

    if (lastRow?.length === 1 && lastRow[0] === "") {
      rows.pop();
    }
  }

  return rows.filter((row) => row.length > 0);
}

function getPasteStartCoordinate<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  selectedCoordinates: CellCoordinate[],
  focusedCell: CellCoordinate | null,
): CellCoordinate | null {
  const selectedCoordinate = selectedCoordinates[0];

  if (selectedCoordinate) {
    return selectedCoordinate;
  }

  if (
    focusedCell &&
    rows.some((row) => row.id === focusedCell.rowId) &&
    columns.some((column) => column.id === focusedCell.columnId)
  ) {
    return focusedCell;
  }

  const firstRow = rows[0];
  const firstColumn = columns[0];

  return firstRow && firstColumn ? { rowId: firstRow.id, columnId: firstColumn.id } : null;
}

function getSelectableRows<TData>(row: Row<TData>, selectionMode: RowSelectionMode | undefined): Row<TData>[] {
  if (row.getIsGroupFooter()) {
    return [];
  }

  if (row.getIsGrouped() || (selectionMode === "descendants" && row.getCanExpand())) {
    return row.leafRows;
  }

  return [row];
}

function getSelectableRowsInModel<TData>(rowModel: RowModel<TData>, selectionMode: RowSelectionMode | undefined): Row<TData>[] {
  const rows: Row<TData>[] = [];
  const seen = new Set<RowId>();

  for (const row of rowModel.rows) {
    for (const selectableRow of getSelectableRows(row, selectionMode)) {
      if (!seen.has(selectableRow.id)) {
        rows.push(selectableRow);
        seen.add(selectableRow.id);
      }
    }
  }

  return rows;
}

function getClipboardPasteCoordinates<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  startRowIndex: number,
  startColumnIndex: number,
  clipboardRows: string[][],
): CellCoordinate[] {
  const coordinates: CellCoordinate[] = [];

  for (let rowOffset = 0; rowOffset < clipboardRows.length; rowOffset += 1) {
    const row = rows[startRowIndex + rowOffset];
    const clipboardRow = clipboardRows[rowOffset];

    if (!row || !clipboardRow) {
      continue;
    }

    for (let columnOffset = 0; columnOffset < clipboardRow.length; columnOffset += 1) {
      const column = columns[startColumnIndex + columnOffset];

      if (column) {
        coordinates.push({ rowId: row.id, columnId: column.id });
      }
    }
  }

  return coordinates;
}

interface CellRangeBounds {
  minRowIndex: number;
  maxRowIndex: number;
  minColumnIndex: number;
  maxColumnIndex: number;
}

function getCellRangeBounds<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  range: { start: CellCoordinate; end: CellCoordinate },
): CellRangeBounds | null {
  const startRowIndex = rows.findIndex((row) => row.id === range.start.rowId);
  const endRowIndex = rows.findIndex((row) => row.id === range.end.rowId);
  const startColumnIndex = columns.findIndex((column) => column.id === range.start.columnId);
  const endColumnIndex = columns.findIndex((column) => column.id === range.end.columnId);

  if (startRowIndex < 0 || endRowIndex < 0 || startColumnIndex < 0 || endColumnIndex < 0) {
    return null;
  }

  return {
    minRowIndex: Math.min(startRowIndex, endRowIndex),
    maxRowIndex: Math.max(startRowIndex, endRowIndex),
    minColumnIndex: Math.min(startColumnIndex, endColumnIndex),
    maxColumnIndex: Math.max(startColumnIndex, endColumnIndex),
  };
}

function getCellFillValue<TData>(
  grid: Grid<TData>,
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  source: CellRangeBounds,
  target: { rowIndex: number; columnIndex: number },
  targetRow: Row<TData>,
  targetColumn: Column<TData, unknown>,
  fillMode: CellFillOptions["fillMode"],
): { value: unknown } | null {
  if (fillMode === "series") {
    const seriesValue = getSeriesCellFillValue(grid, rows, columns, source, target, targetRow, targetColumn);

    if (seriesValue) {
      return seriesValue;
    }
  }

  return getCopyCellFillValue(grid, rows, columns, source, target, targetRow, targetColumn);
}

function getCopyCellFillValue<TData>(
  grid: Grid<TData>,
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  source: CellRangeBounds,
  target: { rowIndex: number; columnIndex: number },
  targetRow: Row<TData>,
  targetColumn: Column<TData, unknown>,
): { value: unknown } | null {
  const sourceRowIndex = source.minRowIndex + mod(target.rowIndex - source.minRowIndex, source.maxRowIndex - source.minRowIndex + 1);
  const sourceColumnIndex = source.minColumnIndex + mod(target.columnIndex - source.minColumnIndex, source.maxColumnIndex - source.minColumnIndex + 1);
  const sourceRow = rows[sourceRowIndex];
  const sourceColumn = columns[sourceColumnIndex];

  if (!sourceRow || !sourceColumn) {
    return null;
  }

  const sourceValue = sourceRow.getValue(sourceColumn.id);

  return {
    value:
      sourceColumn.id === targetColumn.id
        ? sourceValue
        : parsePastedCellValue(grid, targetRow, targetColumn, sourceValue == null ? "" : String(sourceValue)),
  };
}

function getSeriesCellFillValue<TData>(
  grid: Grid<TData>,
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  source: CellRangeBounds,
  target: { rowIndex: number; columnIndex: number },
  targetRow: Row<TData>,
  targetColumn: Column<TData, unknown>,
): { value: unknown } | null {
  if (target.rowIndex < source.minRowIndex || target.rowIndex > source.maxRowIndex) {
    const sourceColumn = columns[target.columnIndex];

    if (!sourceColumn || target.columnIndex < source.minColumnIndex || target.columnIndex > source.maxColumnIndex) {
      return null;
    }

    const sourceValues = collectRowSeriesValues(rows, sourceColumn, source.minRowIndex, source.maxRowIndex);
    const direction = target.rowIndex < source.minRowIndex ? "before" : "after";
    const offset = direction === "before" ? source.minRowIndex - target.rowIndex : target.rowIndex - source.maxRowIndex;
    const value = createSeriesFillValue(sourceValues, direction, offset);

    return value === undefined
      ? null
      : {
          value:
            sourceColumn.id === targetColumn.id
              ? value
              : parsePastedCellValue(grid, targetRow, targetColumn, value == null ? "" : String(value)),
        };
  }

  if (target.columnIndex < source.minColumnIndex || target.columnIndex > source.maxColumnIndex) {
    const sourceRow = rows[target.rowIndex];

    if (!sourceRow || target.rowIndex < source.minRowIndex || target.rowIndex > source.maxRowIndex) {
      return null;
    }

    const sourceValues = collectColumnSeriesValues(columns, sourceRow, source.minColumnIndex, source.maxColumnIndex);
    const direction = target.columnIndex < source.minColumnIndex ? "before" : "after";
    const offset = direction === "before" ? source.minColumnIndex - target.columnIndex : target.columnIndex - source.maxColumnIndex;
    const value = createSeriesFillValue(sourceValues, direction, offset);

    return value === undefined
      ? null
      : {
          value: parsePastedCellValue(grid, targetRow, targetColumn, value == null ? "" : String(value)),
        };
  }

  return null;
}

function collectRowSeriesValues<TData>(rows: Row<TData>[], column: Column<TData, unknown>, minRowIndex: number, maxRowIndex: number): unknown[] {
  const values: unknown[] = [];

  for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex += 1) {
    values.push(rows[rowIndex]?.getValue(column.id));
  }

  return values;
}

function collectColumnSeriesValues<TData>(columns: Column<TData, unknown>[], row: Row<TData>, minColumnIndex: number, maxColumnIndex: number): unknown[] {
  const values: unknown[] = [];

  for (let columnIndex = minColumnIndex; columnIndex <= maxColumnIndex; columnIndex += 1) {
    const column = columns[columnIndex];
    values.push(column ? row.getValue(column.id) : undefined);
  }

  return values;
}

interface SeriesTerm {
  value: number;
  signature: string;
  format: (value: number) => unknown;
}

function createSeriesFillValue(sourceValues: unknown[], direction: "before" | "after", offset: number): unknown {
  const terms = sourceValues.map(parseSeriesTerm);

  if (terms.length === 0 || terms.some((term) => !term)) {
    return undefined;
  }

  const parsedTerms = terms as SeriesTerm[];
  const [firstTerm] = parsedTerms;
  const lastTerm = parsedTerms[parsedTerms.length - 1];

  if (!firstTerm || !lastTerm || parsedTerms.some((term) => term.signature !== firstTerm.signature)) {
    return undefined;
  }

  const step = parsedTerms.length > 1 ? lastTerm.value - parsedTerms[parsedTerms.length - 2]!.value : 1;
  const nextValue = direction === "before" ? firstTerm.value - step * offset : lastTerm.value + step * offset;

  return (direction === "before" ? firstTerm : lastTerm).format(nextValue);
}

function parseSeriesTerm(value: unknown): SeriesTerm | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? {
          value,
          signature: "number",
          format: (nextValue) => nextValue,
        }
      : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  const numericMatch = /^-?\d+(?:\.\d+)?$/.exec(trimmed);

  if (numericMatch) {
    const decimalPlaces = trimmed.includes(".") ? trimmed.length - trimmed.indexOf(".") - 1 : 0;

    return {
      value: Number(trimmed),
      signature: `numeric-string:${decimalPlaces}`,
      format: (nextValue) => (decimalPlaces > 0 ? nextValue.toFixed(decimalPlaces) : String(nextValue)),
    };
  }

  const trailingNumberMatch = /^(.*?)(-?\d+)(\D*)$/.exec(value);

  if (!trailingNumberMatch) {
    return undefined;
  }

  const [, prefix = "", numericPart = "", suffix = ""] = trailingNumberMatch;
  const unsignedPart = numericPart.startsWith("-") ? numericPart.slice(1) : numericPart;
  const width = unsignedPart.length;

  return {
    value: Number(numericPart),
    signature: `trailing-number:${prefix}:${suffix}`,
    format: (nextValue) => {
      const roundedValue = Math.round(nextValue);
      const sign = roundedValue < 0 ? "-" : "";
      const digits = String(Math.abs(roundedValue)).padStart(width, "0");

      return `${prefix}${sign}${digits}${suffix}`;
    },
  };
}

function getCellFillTargetCoordinates<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[],
  source: CellRangeBounds,
  endRowIndex: number,
  endColumnIndex: number,
): Array<{ rowIndex: number; columnIndex: number }> {
  const rowExtension =
    endRowIndex < source.minRowIndex ? endRowIndex - source.minRowIndex : Math.max(0, endRowIndex - source.maxRowIndex);
  const columnExtension =
    endColumnIndex < source.minColumnIndex
      ? endColumnIndex - source.minColumnIndex
      : Math.max(0, endColumnIndex - source.maxColumnIndex);
  const fillVertically = Math.abs(rowExtension) >= Math.abs(columnExtension);
  const coordinates: Array<{ rowIndex: number; columnIndex: number }> = [];

  if (fillVertically && rowExtension !== 0) {
    const startRowIndex = rowExtension < 0 ? endRowIndex : source.maxRowIndex + 1;
    const endFillRowIndex = rowExtension < 0 ? source.minRowIndex - 1 : endRowIndex;

    for (let rowIndex = startRowIndex; rowIndex <= endFillRowIndex; rowIndex += 1) {
      if (!rows[rowIndex]) {
        continue;
      }

      for (let columnIndex = source.minColumnIndex; columnIndex <= source.maxColumnIndex; columnIndex += 1) {
        if (columns[columnIndex]) {
          coordinates.push({ rowIndex, columnIndex });
        }
      }
    }

    return coordinates;
  }

  if (!fillVertically && columnExtension !== 0) {
    const startColumnIndex = columnExtension < 0 ? endColumnIndex : source.maxColumnIndex + 1;
    const endFillColumnIndex = columnExtension < 0 ? source.minColumnIndex - 1 : endColumnIndex;

    for (let rowIndex = source.minRowIndex; rowIndex <= source.maxRowIndex; rowIndex += 1) {
      if (!rows[rowIndex]) {
        continue;
      }

      for (let columnIndex = startColumnIndex; columnIndex <= endFillColumnIndex; columnIndex += 1) {
        if (columns[columnIndex]) {
          coordinates.push({ rowIndex, columnIndex });
        }
      }
    }
  }

  return coordinates;
}

function limitCellFillTargetCoordinates<TCoordinate>(
  coordinates: TCoordinate[],
  maxCells: number | undefined,
  maxCellsMode: CellFillOptions["maxCellsMode"],
): TCoordinate[] | null {
  if (typeof maxCells !== "number" || !Number.isFinite(maxCells)) {
    return coordinates;
  }

  const normalizedMaxCells = Math.max(0, Math.floor(maxCells));

  if (coordinates.length <= normalizedMaxCells) {
    return coordinates;
  }

  if (maxCellsMode === "truncate") {
    return coordinates.slice(0, normalizedMaxCells);
  }

  return null;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function parsePastedCellValue<TData>(
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

function createEmptyClipboardPasteResult<TData>(): ClipboardPasteResult<TData> {
  return {
    attemptedCells: 0,
    committedCells: [],
    skippedCells: [],
    validationErrors: [],
    events: [],
    blocked: false,
    truncated: false,
  };
}

function createMaxCellSkippedCells<TData>(
  rows: readonly Row<TData>[],
  columns: readonly Column<TData, unknown>[],
  coordinates: readonly CellCoordinate[],
): Array<ClipboardPasteSkippedCell<TData>> {
  return coordinates.map((coordinate) => {
    const rowIndex = rows.findIndex((row) => row.id === coordinate.rowId);
    const columnIndex = columns.findIndex((column) => column.id === coordinate.columnId);
    const row = rows[rowIndex];
    const column = columns[columnIndex];
    const skippedCell: ClipboardPasteSkippedCell<TData> = {
      coordinate,
      reason: "max-cells",
    };

    if (row) {
      skippedCell.row = row;
      skippedCell.rowIndex = rowIndex;
    }

    if (column) {
      skippedCell.column = column;
      skippedCell.columnIndex = columnIndex;
    }

    return skippedCell;
  });
}

function validateCellEditValue<TData>(
  grid: Grid<TData>,
  row: Row<TData>,
  column: Column<TData, unknown>,
  value: unknown,
): CellEditValidationState | undefined {
  const validation = column.columnDef.validateEditValue?.(value, {
    grid,
    row,
    column,
    previousValue: row.getValue(column.id),
    value,
  });

  return normalizeCellEditValidationResult(validation);
}

function normalizeCellEditValidationResult(result: CellEditValidationResult | undefined): CellEditValidationState | undefined {
  if (result === undefined || result === true) {
    return undefined;
  }

  if (result === false) {
    return { valid: false };
  }

  if (typeof result === "string") {
    return result.length > 0 ? { valid: false, message: result } : { valid: false };
  }

  if (result.valid) {
    return result.message === undefined ? { valid: true } : { valid: true, message: result.message };
  }

  return result.message === undefined ? { valid: false } : { valid: false, message: result.message };
}

function createRowInteractionEvent<TData>(
  grid: Grid<TData>,
  event: RowInteractionEventParams<TData>,
): RowInteractionEvent<TData> {
  let defaultPrevented = false;
  const nextEvent: RowInteractionEvent<TData> = {
    type: event.type,
    grid,
    row: event.row,
    rowIndex: event.rowIndex,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  if ("sourceEvent" in event) {
    nextEvent.sourceEvent = event.sourceEvent;
  }

  return nextEvent;
}

function areCellCoordinatesEqual(left: CellCoordinate | null, right: CellCoordinate | null): boolean {
  return left?.rowId === right?.rowId && left?.columnId === right?.columnId;
}

function createCellInteractionEvent<TData>(
  grid: Grid<TData>,
  event: CellInteractionEventParams<TData>,
): CellInteractionEvent<TData> {
  let defaultPrevented = false;
  const nextEvent: CellInteractionEvent<TData> = {
    type: event.type,
    grid,
    row: event.row,
    rowIndex: event.rowIndex,
    column: event.column,
    columnIndex: event.columnIndex,
    value: event.row.getValue(event.column.id),
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  if ("sourceEvent" in event) {
    nextEvent.sourceEvent = event.sourceEvent;
  }

  return nextEvent;
}

function createCellEditEvent<TData>(
  grid: Grid<TData>,
  event: CellEditEventParams<TData>,
): CellEditEvent<TData> {
  let defaultPrevented = event.validation?.valid === false;
  const nextEvent: CellEditEvent<TData> = {
    type: event.type,
    phase: event.phase,
    grid,
    row: event.row,
    rowIndex: event.rowIndex,
    column: event.column,
    columnIndex: event.columnIndex,
    value: event.value,
    previousValue: event.previousValue,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  if ("sourceEvent" in event) {
    nextEvent.sourceEvent = event.sourceEvent;
  }

  if ("validation" in event) {
    nextEvent.validation = event.validation;
  }

  if ("historyAction" in event) {
    nextEvent.historyAction = event.historyAction;
  }

  return nextEvent;
}

function createColumnResizeEvent<TData>(
  grid: Grid<TData>,
  event: ColumnResizeEventParams<TData>,
): ColumnResizeEvent<TData> {
  let defaultPrevented = false;
  const nextEvent: ColumnResizeEvent<TData> = {
    type: `columnResize:${event.phase}`,
    grid,
    phase: event.phase,
    column: event.column,
    columnIndex: event.columnIndex,
    startSize: event.startSize,
    size: event.size,
    delta: event.size - event.startSize,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  if ("sourceEvent" in event) {
    nextEvent.sourceEvent = event.sourceEvent;
  }

  return nextEvent;
}

function limitExportRows<TData>(
  rows: Row<TData>[],
  maxRows: number | undefined,
  maxRowsMode: ExportTextOptions["maxRowsMode"],
): Row<TData>[] | null {
  if (typeof maxRows !== "number" || !Number.isFinite(maxRows)) {
    return rows;
  }

  const normalizedMaxRows = Math.max(0, Math.floor(maxRows));

  if (rows.length <= normalizedMaxRows) {
    return rows;
  }

  if (maxRowsMode === "truncate") {
    return rows.slice(0, normalizedMaxRows);
  }

  return null;
}

interface CacheEntry<TValue> {
  key: GridCacheKey;
  deps?: readonly unknown[];
  value?: TValue;
  hits: number;
  misses: number;
  computes: number;
  lastDependencyCount: number;
}

function createCacheEntry<TValue>(key: GridCacheKey): CacheEntry<TValue> {
  return {
    key,
    hits: 0,
    misses: 0,
    computes: 0,
    lastDependencyCount: 0,
  };
}

function getCached<TValue>(entry: CacheEntry<TValue>, deps: readonly unknown[], compute: () => TValue): TValue {
  if (entry.deps && areDepsEqual(entry.deps, deps)) {
    entry.hits += 1;
    return entry.value as TValue;
  }

  entry.misses += 1;
  entry.computes += 1;
  entry.lastDependencyCount = deps.length;
  const value = compute();
  entry.deps = deps;
  entry.value = value;
  return value;
}

function getCacheDiagnostics(entries: readonly CacheEntry<unknown>[]): GridCacheDiagnostics {
  const diagnosticsEntries = {} as Record<GridCacheKey, GridCacheDiagnostics["entries"][GridCacheKey]>;
  let totalHits = 0;
  let totalMisses = 0;
  let totalComputes = 0;

  for (const entry of entries) {
    diagnosticsEntries[entry.key] = {
      key: entry.key,
      hits: entry.hits,
      misses: entry.misses,
      computes: entry.computes,
      initialized: !!entry.deps,
      lastDependencyCount: entry.lastDependencyCount,
    };
    totalHits += entry.hits;
    totalMisses += entry.misses;
    totalComputes += entry.computes;
  }

  return {
    entries: diagnosticsEntries,
    totalHits,
    totalMisses,
    totalComputes,
  };
}

function resetCacheDiagnostics(entries: readonly CacheEntry<unknown>[]): void {
  for (const entry of entries) {
    entry.hits = 0;
    entry.misses = 0;
    entry.computes = 0;
    entry.lastDependencyCount = entry.deps?.length ?? 0;
  }
}

function areDepsEqual(previous: readonly unknown[], next: readonly unknown[]): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((value, index) => Object.is(value, next[index]));
}
