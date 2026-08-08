import type {
  AnyColumnDef,
  Column,
  ColumnDef,
  ColumnId,
  Header,
  HeaderGroup,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  GridState,
} from "./types";

const defaultColumnSize = 160;
const defaultMinColumnSize = 48;
const defaultMaxColumnSize = 640;

export function resolveColumns<TData>(
  columnDefs: readonly AnyColumnDef<TData>[],
  visibility: ColumnVisibilityState,
  sizing: ColumnSizingState,
  pinning: ColumnPinningState,
  depth = 0,
  parentId: ColumnId | null = null,
  getState?: () => Pick<GridState, "columnVisibility" | "columnSizing" | "columnPinning">,
): Column<TData, unknown>[] {
  return columnDefs.map((columnDef, index) => {
    const id = resolveColumnId(columnDef, index, parentId);
    const accessorFn = columnDef.accessorFn;
    const accessorKey = columnDef.accessorKey;
    const getValue: Column<TData, unknown>["getValue"] = accessorFn
      ? (row, rowIndex) => accessorFn(row, rowIndex)
      : accessorKey
        ? (row) => row[accessorKey]
        : () => undefined;
    const childColumns = columnDef.columns
      ? resolveColumns(columnDef.columns, visibility, sizing, pinning, depth + 1, id, getState)
      : [];

    const column: Column<TData, unknown> = {
      id,
      depth,
      parentId,
      columnDef,
      columns: childColumns,
      getValue,
      getCanSort: () => columnDef.enableSorting !== false && !columnDef.columns,
      getCanFilter: () => columnDef.enableFiltering !== false && !columnDef.columns,
      getCanGlobalFilter: () => columnDef.enableGlobalFiltering !== false && columnDef.enableFiltering !== false && !columnDef.columns,
      getCanGroup: () => columnDef.enableGrouping !== false && !columnDef.columns,
      getCanEdit: () => columnDef.enableEditing === true && !columnDef.columns,
      getSize: () => clampColumnSize((getState?.().columnSizing ?? sizing)[id] ?? columnDef.size ?? defaultColumnSize, columnDef),
      getIsVisible: () => (getState?.().columnVisibility ?? visibility)[id] !== false,
      getIsPinned: () => {
        const currentPinning = getState?.().columnPinning ?? pinning;
        if (currentPinning.left.includes(id)) {
          return "left";
        }

        if (currentPinning.right.includes(id)) {
          return "right";
        }

        return false;
      },
    };

    return column;
  });
}

export function getLeafColumns<TData>(columns: readonly Column<TData, unknown>[]): Column<TData, unknown>[] {
  return columns.flatMap((column) => (column.columns.length > 0 ? getLeafColumns(column.columns) : [column]));
}

export function getVisibleColumnTree<TData>(columns: readonly Column<TData, unknown>[]): Column<TData, unknown>[] {
  return columns.flatMap((column) => {
    if (column.columns.length === 0) {
      return column.getIsVisible() ? [column] : [];
    }

    const childColumns = getVisibleColumnTree(column.columns);

    if (childColumns.length === 0) {
      return [];
    }

    return [
      {
        ...column,
        columns: childColumns,
      },
    ];
  });
}

export function createHeaderGroups<TData>(columns: readonly Column<TData, unknown>[]): HeaderGroup<TData>[] {
  const maxDepth = getMaxDepth(columns);
  const groups: Array<Header<TData>[]> = Array.from({ length: maxDepth + 1 }, () => []);

  const visit = (column: Column<TData, unknown>, depth: number, parentId: string | null) => {
    const leafColumns = getLeafColumns([column]);
    const header: Header<TData> = {
      id: parentId ? `${parentId}.${column.id}` : column.id,
      depth,
      column,
      colSpan: leafColumns.length,
      rowSpan: column.columns.length > 0 ? 1 : maxDepth - depth + 1,
      isPlaceholder: false,
      leafColumnIds: leafColumns.map((leafColumn) => leafColumn.id),
    };

    groups[depth]?.push(header);

    if (column.columns.length === 0) {
      for (let placeholderDepth = depth + 1; placeholderDepth <= maxDepth; placeholderDepth += 1) {
        groups[placeholderDepth]?.push({
          id: `${header.id}.__placeholder_${placeholderDepth}`,
          depth: placeholderDepth,
          column,
          colSpan: 1,
          rowSpan: 1,
          isPlaceholder: true,
          leafColumnIds: [column.id],
        });
      }
      return;
    }

    for (const childColumn of column.columns) {
      visit(childColumn, depth + 1, header.id);
    }
  };

  for (const column of columns) {
    visit(column, 0, null);
  }

  return groups.map((headers, depth) => ({
    id: `header_${depth}`,
    depth,
    headers,
  }));
}

export function createHeaderGroupsFromLeafColumns<TData>(
  columns: readonly Column<TData, unknown>[],
  leafColumns: readonly Column<TData, unknown>[],
): HeaderGroup<TData>[] {
  if (leafColumns.length === 0) {
    return [{ id: "header_0", depth: 0, headers: [] }];
  }

  const columnById = new Map(flattenColumns(columns).map((column) => [column.id, column]));
  const pathByLeafId = new Map<ColumnId, Column<TData, unknown>[]>();

  for (const leafColumn of leafColumns) {
    pathByLeafId.set(leafColumn.id, getColumnPath(leafColumn, columnById));
  }

  const maxDepth = Math.max(...Array.from(pathByLeafId.values()).map((path) => path.length - 1));
  const groups: Array<Header<TData>[]> = Array.from({ length: maxDepth + 1 }, () => []);
  const headerIdCounts = new Map<string, number>();

  const createHeaderId = (baseId: string): string => {
    const count = headerIdCounts.get(baseId) ?? 0;
    headerIdCounts.set(baseId, count + 1);
    return count === 0 ? baseId : `${baseId}.__segment_${count}`;
  };

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    let leafIndex = 0;

    while (leafIndex < leafColumns.length) {
      const leafColumn = leafColumns[leafIndex]!;
      const path = pathByLeafId.get(leafColumn.id) ?? [leafColumn];
      const column = path[depth];

      if (!column) {
        const leafHeaderId = path.map((pathColumn) => pathColumn.id).join(".");
        groups[depth]?.push({
          id: `${leafHeaderId}.__placeholder_${depth}`,
          depth,
          column: leafColumn,
          colSpan: 1,
          rowSpan: 1,
          isPlaceholder: true,
          leafColumnIds: [leafColumn.id],
        });
        leafIndex += 1;
        continue;
      }

      const headerBaseId = path.slice(0, depth + 1).map((pathColumn) => pathColumn.id).join(".");

      if (column.columns.length === 0) {
        groups[depth]?.push({
          id: createHeaderId(headerBaseId),
          depth,
          column,
          colSpan: 1,
          rowSpan: maxDepth - depth + 1,
          isPlaceholder: false,
          leafColumnIds: [column.id],
        });
        leafIndex += 1;
        continue;
      }

      const segmentLeafColumnIds: ColumnId[] = [];
      let segmentEnd = leafIndex;

      while (segmentEnd < leafColumns.length) {
        const segmentLeafColumn = leafColumns[segmentEnd]!;
        const segmentPath = pathByLeafId.get(segmentLeafColumn.id) ?? [segmentLeafColumn];

        if (segmentPath[depth]?.id !== column.id) {
          break;
        }

        segmentLeafColumnIds.push(segmentLeafColumn.id);
        segmentEnd += 1;
      }

      groups[depth]?.push({
        id: createHeaderId(headerBaseId),
        depth,
        column,
        colSpan: segmentLeafColumnIds.length,
        rowSpan: 1,
        isPlaceholder: false,
        leafColumnIds: segmentLeafColumnIds,
      });
      leafIndex = segmentEnd;
    }
  }

  return groups.map((headers, depth) => ({
    id: `header_${depth}`,
    depth,
    headers,
  }));
}

function getMaxDepth<TData>(columns: readonly Column<TData, unknown>[]): number {
  if (columns.length === 0) {
    return 0;
  }

  return Math.max(...columns.map((column) => (column.columns.length === 0 ? column.depth : getMaxDepth(column.columns))));
}

function flattenColumns<TData>(columns: readonly Column<TData, unknown>[]): Column<TData, unknown>[] {
  return columns.flatMap((column) => [column, ...flattenColumns(column.columns)]);
}

function getColumnPath<TData>(
  column: Column<TData, unknown>,
  columnById: ReadonlyMap<ColumnId, Column<TData, unknown>>,
): Column<TData, unknown>[] {
  const path: Column<TData, unknown>[] = [column];
  let parentId = column.parentId;

  while (parentId) {
    const parent = columnById.get(parentId);

    if (!parent) {
      break;
    }

    path.unshift(parent);
    parentId = parent.parentId;
  }

  return path;
}

function resolveColumnId<TData>(columnDef: AnyColumnDef<TData>, index: number, parentId: ColumnId | null): ColumnId {
  if (columnDef.id) {
    return columnDef.id;
  }

  if (columnDef.accessorKey) {
    return columnDef.accessorKey;
  }

  if (parentId) {
    return `${parentId}.${index}`;
  }

  return `column_${index}`;
}

export function clampColumnSize<TData>(size: number, columnDef: AnyColumnDef<TData>): number {
  const min = columnDef.minSize ?? defaultMinColumnSize;
  const max = columnDef.maxSize ?? defaultMaxColumnSize;
  return Math.max(min, Math.min(max, size));
}
