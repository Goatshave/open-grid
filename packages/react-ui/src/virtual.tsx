import type { CellContext, Column, ColumnLayout, GridOptions, HeaderContext, Row, SortingState } from "@open-grid/core";
import {
  addPassiveScrollListener,
  createResizeObserver,
  disconnectResizeObserver,
  getCellDisplayText,
  getCanToggleRowSelection,
  getColumnHeaderText,
  getColumnLayoutTotalWidth,
  getElementOffsetBlockSize,
  getGridBodyProps,
  getGridBodyRowIndexOffset,
  getGridEmptyCellProps,
  getGridEmptyRowProps,
  getGridHeaderProps,
  getGridHeaderRowProps,
  getGridProps,
  getHeaderButtonProps,
  getHeaderCellLayoutProps,
  getHeaderCellProps,
  getHeaderSortIndicatorText,
  getInlineSizeStyle,
  getPinnedColumnOffsetStyle,
  getScrollFrameOptionsFromElement,
  getVirtualBodyStyle,
  getVirtualRowStyle,
} from "@open-grid/primitives";
import { useGrid } from "@open-grid/react";
import {
  getColumnRenderItems,
  getInitialScrollFrame,
  getScrollFrame,
  getVirtualRowItems,
  getVirtualRowRange,
  type VirtualItem,
} from "@open-grid/virtual";
import {
  reconcileColumnRenderItems,
  reconcileVirtualRowRenderKeys,
  type VirtualRowRenderKey,
} from "./virtual-render-cache";
import { createContext, memo, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

const contentVisibilityRowThreshold = 50_000;

export interface VirtualDataGridProps<TData> extends GridOptions<TData> {
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  emptyState?: ReactNode;
  rowHeight?: number;
  rowOverscan?: number;
  columnOverscan?: number;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getHeaderClassName?: (context: HeaderContext<TData, unknown>) => string | undefined;
  getCellClassName?: (context: CellContext<TData, unknown>) => string | undefined;
}

interface RenderedColumn<TData> {
  column: Column<TData, unknown>;
  columnIndex: number;
  layout: ColumnLayout;
  style: CSSProperties;
  cellProps: {
    "aria-colindex": number;
    "data-column-id": string;
    "data-pinned": false | "left" | "right" | undefined;
    "data-pinned-edge": ColumnLayout["pinnedEdge"];
    tabIndex: number;
  };
}

const RenderedColumnsContext = createContext<readonly unknown[]>([]);

export function VirtualDataGrid<TData>(props: VirtualDataGridProps<TData>) {
  const {
    ariaLabel = "Data grid",
    className,
    style,
    emptyState = "No rows",
    rowHeight = 40,
    rowOverscan = 5,
    columnOverscan = 5,
    getRowClassName,
    getHeaderClassName,
    getCellClassName,
    ...gridOptions
  } = props;
  const resolvedRowHeight = positiveNumber(rowHeight, "rowHeight");
  const resolvedRowOverscan = nonNegativeInteger(rowOverscan, "rowOverscan");
  const resolvedColumnOverscan = nonNegativeInteger(columnOverscan, "columnOverscan");
  const grid = useGrid(gridOptions);
  const rows = grid.getRowModel().rows;
  const useRowContentVisibility = grid.getCoreRowModel().flatRows.length >= contentVisibilityRowThreshold;
  const allColumns = grid.getAllLeafColumns();
  const columns = grid.getVisibleLeafColumns();
  const layout = grid.getColumnLayout();
  const pagination = grid.getState().pagination;
  const columnIndexById = useMemo(() => new Map(columns.map((column, index) => [column.id, index])), [columns]);
  const totalWidth = useMemo(() => getColumnLayoutTotalWidth(layout), [layout]);
  const bodyRowIndexOffset = useMemo(
    () => getGridBodyRowIndexOffset(grid, { headerRowCount: 1 }),
    [columns, grid, pagination],
  );
  const gridRootProps = useMemo(
    () => getGridProps(grid, { ariaLabel, headerRowCount: 1 }),
    [ariaLabel, columns, grid, gridOptions.manualPagination, rows],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [scrollFrame, setScrollFrame] = useState(getInitialScrollFrame);
  const scrollFrameRef = useRef(scrollFrame);
  const renderedColumnsRef = useRef<RenderedColumn<TData>[]>([]);
  const virtualRowRenderKeysRef = useRef<VirtualRowRenderKey[]>([]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let viewportHeight = 0;
    let viewportWidth = 0;
    let stickyTopOffset = 42;
    const syncFrame = () => {
      const nextFrame = getScrollFrame({
        scrollTop: scroller.scrollTop,
        scrollLeft: scroller.scrollLeft,
        viewportHeight,
        viewportWidth,
        stickyTopOffset,
      });
      const previousFrame = scrollFrameRef.current;
      if (nextFrame.scrollTop === previousFrame.scrollTop
        && nextFrame.scrollLeft === previousFrame.scrollLeft
        && nextFrame.viewportHeight === previousFrame.viewportHeight
        && nextFrame.viewportWidth === previousFrame.viewportWidth) {
        return;
      }
      scrollFrameRef.current = nextFrame;
      const isViewportJump = Math.abs(nextFrame.scrollTop - previousFrame.scrollTop) > Math.max(1, nextFrame.viewportHeight);
      if (isViewportJump) {
        flushSync(() => setScrollFrame(nextFrame));
      } else {
        setScrollFrame(nextFrame);
      }
    };
    const syncDimensions = () => {
      const dimensions = getScrollFrameOptionsFromElement(scroller, {
        stickyTopOffset: getElementOffsetBlockSize(headerRef.current, 42),
      });
      viewportHeight = dimensions.viewportHeight;
      viewportWidth = dimensions.viewportWidth;
      stickyTopOffset = dimensions.stickyTopOffset ?? 0;
      syncFrame();
    };
    syncDimensions();
    const cleanupScroll = addPassiveScrollListener(syncFrame, scroller);
    const observer = createResizeObserver(syncDimensions);
    observer?.observe(scroller);

    return () => {
      cleanupScroll();
      disconnectResizeObserver(observer);
    };
  }, []);

  const virtualRange = useMemo(() => getVirtualRowRange({
    count: rows.length,
    scrollFrame,
    enabled: true,
    estimateSize: resolvedRowHeight,
    overscan: resolvedRowOverscan,
  }), [resolvedRowHeight, resolvedRowOverscan, rows.length, scrollFrame.scrollTop, scrollFrame.viewportHeight]);
  const visibleRows = useMemo(
    () => getVirtualRowItems(rows, virtualRange),
    [rows, virtualRange],
  );
  const canPoolVirtualRows = useMemo(
    () => allColumns.every((column) => !column.columnDef.cell),
    [allColumns],
  );
  const virtualRowRenderKeys = useMemo(() => {
    if (!canPoolVirtualRows) {
      virtualRowRenderKeysRef.current = [];
      return [];
    }
    const nextKeys = reconcileVirtualRowRenderKeys(
      virtualRowRenderKeysRef.current,
      visibleRows.map(({ row }) => row.id),
    );
    virtualRowRenderKeysRef.current = nextKeys;
    return nextKeys;
  }, [canPoolVirtualRows, visibleRows]);
  const columnRenderItems = useMemo(() => getColumnRenderItems(layout, scrollFrame, {
    enabled: true,
    overscan: resolvedColumnOverscan,
  }), [layout, resolvedColumnOverscan, scrollFrame.scrollLeft, scrollFrame.viewportWidth]);
  const renderedColumns = useMemo(() => {
    const nextInputs: Array<Pick<RenderedColumn<TData>, "column" | "columnIndex" | "layout">> = [];
    let previousColumnIndex = -1;
    let columnOrderChanged = false;
    for (const item of columnRenderItems) {
      if (item.type === "spacer") continue;
      const columnIndex = columnIndexById.get(item.layout.id)!;
      const column = columns[columnIndex]!;
      if (columnIndex < previousColumnIndex) columnOrderChanged = true;
      previousColumnIndex = columnIndex;
      nextInputs.push({
        column,
        columnIndex,
        layout: item.layout,
      });
    }
    if (columnOrderChanged) {
      nextInputs.sort((left, right) => left.columnIndex - right.columnIndex);
    }
    const nextItems = reconcileColumnRenderItems(
      renderedColumnsRef.current,
      nextInputs,
      ({ column, columnIndex, layout: columnLayout }): RenderedColumn<TData> => ({
        column,
        columnIndex,
        layout: columnLayout,
        style: getColumnStyle(columnLayout),
        cellProps: {
          "aria-colindex": columnIndex + 1,
          "data-column-id": column.id,
          "data-pinned": column.getIsPinned() || undefined,
          "data-pinned-edge": columnLayout.pinnedEdge,
          tabIndex: -1,
        },
      }),
    );
    renderedColumnsRef.current = nextItems;
    return nextItems;
  }, [columnIndexById, columnRenderItems, columns]);
  const rootStyle = useMemo(() => ({
    ...style,
    "--og-row-height": `${resolvedRowHeight}px`,
  }) as CSSProperties, [resolvedRowHeight, style]);
  const canvasStyle = useMemo(() => getInlineSizeStyle(totalWidth), [totalWidth]);
  const bodyStyle = useMemo(() => getVirtualBodyStyle(virtualRange), [virtualRange]);
  return (
    <div className={["og-grid", "og-grid--virtual", className].filter(Boolean).join(" ")} style={rootStyle}>
      <div
        {...gridRootProps}
        className="og-grid__scroller"
        ref={scrollerRef}
      >
        <div className="og-grid__canvas" style={canvasStyle}>
          <div {...getGridHeaderProps()} className="og-grid__header" ref={headerRef}>
            <VirtualHeaderRow
              grid={grid}
              renderedColumns={renderedColumns}
              sorting={grid.getState().sorting}
              {...(getHeaderClassName ? { getHeaderClassName } : {})}
            />
          </div>
          <div
            {...getGridBodyProps({ virtualized: true })}
            data-content-visibility={useRowContentVisibility || undefined}
            className="og-grid__body"
            style={bodyStyle}
          >
            <RenderedColumnsContext.Provider value={renderedColumns}>
              {rows.length === 0 ? (
                <div {...getGridEmptyRowProps({ rowIndexOffset: bodyRowIndexOffset })} className="og-grid__empty">
                  <div {...getGridEmptyCellProps({ rowIndexOffset: bodyRowIndexOffset, columnCount: columns.length })} className="og-grid__empty-cell" style={getInlineSizeStyle(totalWidth)}>
                    {emptyState}
                  </div>
                </div>
              ) : visibleRows.map(({ row, rowIndex, virtualItem }, visibleIndex) => (
                <VirtualBodyRow
                  key={virtualRowRenderKeys[visibleIndex]?.key ?? row.id}
                  grid={grid}
                  row={row}
                  rowIndex={rowIndex}
                  rowIndexOffset={bodyRowIndexOffset}
                  virtualItem={virtualItem}
                  customCellRenderColumns={canPoolVirtualRows ? undefined : renderedColumns}
                  selected={grid.getIsRowSelected(row.id)}
                  getRowClassName={getRowClassName}
                  getCellClassName={getCellClassName}
                />
              ))}
            </RenderedColumnsContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VirtualBodyRowProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  row: Row<TData>;
  rowIndex: number;
  rowIndexOffset: number;
  customCellRenderColumns?: RenderedColumn<TData>[] | undefined;
  virtualItem: VirtualItem | null;
  selected: boolean;
  getRowClassName?: ((row: Row<TData>) => string | undefined) | undefined;
  getCellClassName?: ((context: CellContext<TData, unknown>) => string | undefined) | undefined;
}

const VirtualBodyRow = memo(function VirtualBodyRow<TData>({
  grid,
  row,
  rowIndex,
  rowIndexOffset,
  virtualItem,
  customCellRenderColumns: _customCellRenderColumns,
  selected,
  getRowClassName,
  getCellClassName,
}: VirtualBodyRowProps<TData>) {
  const rowClassName = getRowClassName?.(row);
  return (
    <div
      role="row"
      aria-rowindex={rowIndexOffset + rowIndex + 1}
      aria-selected={selected || undefined}
      data-row-id={row.id}
      data-grouped-row={row.getIsGrouped() || undefined}
      data-group-footer-row={row.getIsGroupFooter() || undefined}
      data-virtual-index={virtualItem?.index}
      data-column-virtualized="true"
      className={rowClassName ? `og-grid__row ${rowClassName}` : "og-grid__row"}
      onClick={(event) => {
        if (!getCanToggleRowSelection(event)) return;
        const rowEvent = grid.emitRowEvent({ type: "click", row, rowIndex, sourceEvent: event });
        if (getCanToggleRowSelection(rowEvent)) grid.toggleRowSelected(row.id);
      }}
      style={getVirtualRowStyle(virtualItem)}
    >
      <VirtualBodyCells
        grid={grid}
        row={row}
        getCellClassName={getCellClassName}
      />
    </div>
  );
}) as <TData>(props: VirtualBodyRowProps<TData>) => ReactNode;

interface VirtualBodyCellsProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  row: Row<TData>;
  getCellClassName?: ((context: CellContext<TData, unknown>) => string | undefined) | undefined;
}

const VirtualBodyCells = memo(function VirtualBodyCells<TData>({
  grid,
  row,
  getCellClassName,
}: VirtualBodyCellsProps<TData>) {
  const renderedColumns = useContext(RenderedColumnsContext) as RenderedColumn<TData>[];
  return renderedColumns.map((renderedColumn) => (
    <VirtualBodyCell
      key={renderedColumn.column.id}
      grid={grid}
      row={row}
      renderedColumn={renderedColumn}
      getCellClassName={getCellClassName}
    />
  ));
}, areVirtualBodyCellsPropsEqual) as <TData>(props: VirtualBodyCellsProps<TData>) => ReactNode;

function areVirtualBodyCellsPropsEqual<TData>(
  previous: VirtualBodyCellsProps<TData>,
  next: VirtualBodyCellsProps<TData>,
): boolean {
  if (
    previous.grid !== next.grid
    || previous.row !== next.row
  ) {
    return false;
  }
  if (
    previous.getCellClassName
    || next.getCellClassName
  ) {
    return false;
  }

  return true;
}

interface VirtualBodyCellProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  row: Row<TData>;
  renderedColumn: RenderedColumn<TData>;
  getCellClassName?: ((context: CellContext<TData, unknown>) => string | undefined) | undefined;
}

const VirtualBodyCell = memo(function VirtualBodyCell<TData>({
  grid,
  row,
  renderedColumn,
  getCellClassName,
}: VirtualBodyCellProps<TData>) {
  const { column, style: columnStyle, cellProps } = renderedColumn;
  const value = row.getValue(column.id);
  return (
    <div
      role="gridcell"
      data-row-id={row.id}
      {...cellProps}
      className={["og-grid__cell", getCellClassName?.({ grid, row, column, value })].filter(Boolean).join(" ")}
      style={columnStyle}
    >
      {column.columnDef.cell ? column.columnDef.cell({ grid, row, column, value }) as ReactNode : getCellDisplayText(value)}
    </div>
  );
}, areVirtualBodyCellPropsEqual) as <TData>(props: VirtualBodyCellProps<TData>) => ReactNode;

function areVirtualBodyCellPropsEqual<TData>(
  previous: VirtualBodyCellProps<TData>,
  next: VirtualBodyCellProps<TData>,
): boolean {
  if (
    previous.grid !== next.grid
    || previous.row !== next.row
    || previous.renderedColumn !== next.renderedColumn
  ) {
    return false;
  }
  if (
    previous.getCellClassName
    || next.getCellClassName
    || previous.renderedColumn.column.columnDef.cell
    || next.renderedColumn.column.columnDef.cell
  ) {
    return false;
  }

  return true;
}

interface VirtualHeaderRowProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  renderedColumns: RenderedColumn<TData>[];
  sorting: SortingState;
  getHeaderClassName?: (context: HeaderContext<TData, unknown>) => string | undefined;
}

const VirtualHeaderRow = memo(function VirtualHeaderRow<TData>({
  grid,
  renderedColumns,
  getHeaderClassName,
}: VirtualHeaderRowProps<TData>) {
  return (
    <div {...getGridHeaderRowProps({ columnVirtualized: true })} className="og-grid__row og-grid__row--header">
      {renderedColumns.map((renderedColumn) => (
        <VirtualHeaderCell
          key={renderedColumn.column.id}
          grid={grid}
          renderedColumn={renderedColumn}
          sortDirection={grid.getColumnSortDirection(renderedColumn.column.id)}
          getHeaderClassName={getHeaderClassName}
        />
      ))}
    </div>
  );
}) as <TData>(props: VirtualHeaderRowProps<TData>) => ReactNode;

interface VirtualHeaderCellProps<TData> {
  grid: ReturnType<typeof useGrid<TData>>;
  renderedColumn: RenderedColumn<TData>;
  sortDirection: ReturnType<ReturnType<typeof useGrid<TData>>["getColumnSortDirection"]>;
  getHeaderClassName?: ((context: HeaderContext<TData, unknown>) => string | undefined) | undefined;
}

const VirtualHeaderCell = memo(function VirtualHeaderCell<TData>({
  grid,
  renderedColumn,
  sortDirection,
  getHeaderClassName,
}: VirtualHeaderCellProps<TData>) {
  const { column, columnIndex, layout: columnLayout, style: columnStyle } = renderedColumn;
  return (
    <div
      {...getHeaderCellProps(grid, column, columnIndex, { pinned: columnLayout.pinned })}
      {...getHeaderCellLayoutProps({ pinnedEdge: columnLayout.pinnedEdge })}
      className={["og-grid__header-cell", getHeaderClassName?.({ grid, column, header: undefined })].filter(Boolean).join(" ")}
      style={columnStyle}
    >
      <button
        {...getHeaderButtonProps({ disabled: !column.getCanSort() })}
        className="og-grid__header-button"
        onClick={(event) => grid.toggleColumnSorting(column.id, undefined, event.shiftKey)}
      >
        {renderHeader(grid, column)}{sortDirection ? ` ${getHeaderSortIndicatorText(sortDirection)}` : ""}
      </button>
    </div>
  );
}, areVirtualHeaderCellPropsEqual) as <TData>(props: VirtualHeaderCellProps<TData>) => ReactNode;

function areVirtualHeaderCellPropsEqual<TData>(
  previous: VirtualHeaderCellProps<TData>,
  next: VirtualHeaderCellProps<TData>,
): boolean {
  if (
    previous.grid !== next.grid
    || previous.renderedColumn !== next.renderedColumn
    || previous.sortDirection !== next.sortDirection
  ) {
    return false;
  }
  if (
    previous.getHeaderClassName
    || next.getHeaderClassName
    || typeof previous.renderedColumn.column.columnDef.header === "function"
    || typeof next.renderedColumn.column.columnDef.header === "function"
  ) {
    return false;
  }

  return true;
}

function renderHeader<TData>(grid: ReturnType<typeof useGrid<TData>>, column: Column<TData, unknown>): ReactNode {
  const renderer = column.columnDef.header;
  return typeof renderer === "function" ? renderer({ grid, column, header: undefined }) as ReactNode : getColumnHeaderText(column);
}

function getColumnStyle(layout: ColumnLayout): CSSProperties {
  const style: CSSProperties = { width: layout.size };
  const pinnedStyle = getPinnedColumnOffsetStyle(layout);
  if (pinnedStyle) {
    Object.assign(style, pinnedStyle);
  } else {
    style.position = "absolute";
    style.left = layout.start;
  }
  return style;
}

function positiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

export { createColumnHelper } from "@open-grid/core";
export type { AnyColumnDef, GridState } from "@open-grid/core";
