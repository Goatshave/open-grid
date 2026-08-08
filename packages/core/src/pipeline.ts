import { createRowModel } from "./rows";
import type {
  AggregationContext,
  BuiltInAggregationFn,
  Column,
  ColumnFiltersState,
  ColumnId,
  ExpandedState,
  FilterFn,
  GroupFooterMode,
  GroupingState,
  Row,
  RowId,
  RowModel,
  SortingState,
} from "./types";

const returnFalse = () => false;
const returnTrue = () => true;
const DEFAULT_FILTER_CACHE_LIMIT = 64;
const FINITE_NUMBER_RADIX_SORT_MIN_ROWS = 512;
const FINITE_NUMBER_REVERSE_SORT_MAX_ROWS = 65_536;
const FLOAT64_LOW_WORD_OFFSET = new Uint8Array(Uint32Array.of(1).buffer)[0] === 1 ? 0 : 1;
const FLOAT64_HIGH_WORD_OFFSET = 1 - FLOAT64_LOW_WORD_OFFSET;

export function filterRows<TData>(
  rowModel: RowModel<TData>,
  columns: readonly Column<TData, unknown>[],
  filters: ColumnFiltersState,
  globalFilter?: unknown,
  globalFilterFn?: FilterFn<TData, unknown>,
): RowModel<TData> {
  if (filters.length === 0 && isEmptyFilterValue(globalFilter)) {
    return rowModel;
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const filterRules = filters.flatMap((filter) => {
    const column = columnById.get(filter.id);
    return column?.getCanFilter() ? [{ column, value: filter.value, normalizedValue: normalizeFilterValue(filter.value) }] : [];
  });
  const hasGlobalFilter = !isEmptyFilterValue(globalFilter);
  const globalColumns = hasGlobalFilter ? columns.filter((column) => column.getCanGlobalFilter()) : [];
  const normalizedGlobalFilter = normalizeFilterValue(globalFilter);

  if (filterRules.length === 0 && !hasGlobalFilter) {
    return rowModel;
  }

  if (rowModel.rows === rowModel.flatRows && filterRules.length === 0 && globalFilterFn === undefined) {
    const matchesValue = createDefaultFilterMatcher(normalizedGlobalFilter);
    const rows: Row<TData>[] = [];
    for (const row of rowModel.rows) {
      if (rowMatchesDefaultGlobalFilter(row, globalColumns, matchesValue)) rows.push(row);
    }
    return createRowModel(rows, { includeSubRows: false, lazyRowsById: true });
  }

  const matches = createRowFilter(
    filterRules,
    globalColumns,
    hasGlobalFilter,
    globalFilter,
    normalizedGlobalFilter,
    globalFilterFn,
  );

  if (rowModel.rows.length === rowModel.flatRows.length) {
    const rows: Row<TData>[] = [];
    for (const row of rowModel.rows) {
      if (matches(row)) rows.push(row);
    }
    return createRowModel(rows, { includeSubRows: false, lazyRowsById: true });
  }

  const rows = rowModel.rows.flatMap((row) => {
    const filteredRow = filterRowTree(row, matches);
    return filteredRow ? [filteredRow] : [];
  });

  return createRowModel(rows);
}

export function sortRows<TData>(
  rowModel: RowModel<TData>,
  columns: readonly Column<TData, unknown>[],
  sorting: SortingState,
  previous?: { rowModel: RowModel<TData>; sorting: SortingState },
): RowModel<TData> {
  if (sorting.length === 0) {
    return rowModel;
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const rules = sorting.flatMap((rule) => {
    const column = columnById.get(rule.id);
    return column?.getCanSort() ? [{ column, direction: rule.desc ? -1 : 1 }] : [];
  });

  if (rules.length === 0) {
    return rowModel;
  }

  if (rowModel.rows === rowModel.flatRows) {
    const rows = reverseFiniteNumberSort(rowModel, rules, previous)
      ?? sortRowsByRules(rowModel.rows, rules);
    return createFlatRowModelWithSharedIndex(rows, rowModel);
  }

  return createRowModel(sortSiblingRows(rowModel.rows, rules));
}

function reverseFiniteNumberSort<TData>(
  rowModel: RowModel<TData>,
  rules: readonly ResolvedSortRule<TData>[],
  previous: { rowModel: RowModel<TData>; sorting: SortingState } | undefined,
): Row<TData>[] | undefined {
  const rule = rules.length === 1 ? rules[0] : undefined;
  const previousRule = previous?.sorting.length === 1 ? previous.sorting[0] : undefined;
  const previousRows = previous?.rowModel.rows;
  if (!rule || rule.column.columnDef.sortFn || !previousRule || previousRule.id !== rule.column.id
    || (previousRule.desc ? -1 : 1) === rule.direction || previousRows?.length !== rowModel.rows.length
    || previousRows !== previous?.rowModel.flatRows || previousRows.length > FINITE_NUMBER_REVERSE_SORT_MAX_ROWS) {
    return undefined;
  }

  const values = new Float64Array(previousRows.length);
  for (let index = 0; index < previousRows.length; index += 1) {
    const value = getSortValue(previousRows[index]!, rule.column);
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    values[index] = value;
  }

  const rows = new Array<Row<TData>>(previousRows.length);
  let end = previousRows.length;
  let writeIndex = 0;
  while (end > 0) {
    let start = end - 1;
    while (start > 0 && values[start - 1] === values[start]) start -= 1;
    for (let index = start; index < end; index += 1) rows[writeIndex++] = previousRows[index]!;
    end = start;
  }
  return rows;
}

function filterRowTree<TData>(
  row: Row<TData>,
  matches: (row: Row<TData>) => boolean,
): Row<TData> | null {
  if (row.subRows.length === 0) {
    return matches(row) ? row : null;
  }

  const subRows = row.subRows.flatMap((subRow) => {
    const filteredSubRow = filterRowTree(subRow, matches);
    return filteredSubRow ? [filteredSubRow] : [];
  });

  if (!matches(row) && subRows.length === 0) {
    return null;
  }

  return cloneRowWithSubRows(row, subRows);
}

function createFlatRowModelWithSharedIndex<TData>(
  rows: Row<TData>[],
  source: RowModel<TData>,
): RowModel<TData> {
  return {
    rows,
    flatRows: rows,
    get rowsById() {
      return source.rowsById;
    },
  };
}

function createRowFilter<TData>(
  filterRules: readonly ResolvedFilterRule<TData>[],
  globalColumns: readonly Column<TData, unknown>[],
  hasGlobalFilter: boolean,
  globalFilter: unknown,
  normalizedGlobalFilter: string,
  globalFilterFn: FilterFn<TData, unknown> | undefined,
): (row: Row<TData>) => boolean {
  if (filterRules.length === 0 && globalFilterFn === undefined) {
    const matchesValue = createDefaultFilterMatcher(normalizedGlobalFilter);
    return (row) => rowMatchesDefaultGlobalFilter(row, globalColumns, matchesValue);
  }

  if (!hasGlobalFilter) {
    if (filterRules.every((rule) => !rule.column.columnDef.filterFn)) {
      const defaultRules = filterRules.map(({ column, normalizedValue }) => ({
        column,
        matchesValue: createBoundedPrimitiveFilterMatcher(createDefaultFilterMatcher(normalizedValue)),
      }));
      return (row) => {
        for (const { column, matchesValue } of defaultRules) {
          if (!matchesValue(getRowColumnValue(row, column))) return false;
        }
        return true;
      };
    }

    return (row) => rowMatchesColumnFilters(row, filterRules);
  }

  const matchesDefaultGlobalValue = globalFilterFn === undefined
    ? createDefaultFilterMatcher(normalizedGlobalFilter)
    : undefined;
  return (row) => {
    if (!rowMatchesColumnFilters(row, filterRules)) return false;
    return rowMatchesGlobalFilter(row, globalColumns, globalFilter, matchesDefaultGlobalValue, globalFilterFn);
  };
}

function rowMatchesColumnFilters<TData>(
  row: Row<TData>,
  filterRules: readonly ResolvedFilterRule<TData>[],
): boolean {
  for (const { column, value: filterValue, normalizedValue } of filterRules) {
    const value = getRowColumnValue(row, column);

    if (column.columnDef.filterFn) {
      if (!column.columnDef.filterFn(value, filterValue, row, column)) return false;
    } else if (!defaultFilter(value, normalizedValue)) {
      return false;
    }
  }
  return true;
}

function rowMatchesDefaultGlobalFilter<TData>(
  row: Row<TData>,
  globalColumns: readonly Column<TData, unknown>[],
  matchesValue: (value: unknown) => boolean,
): boolean {
  const original = row.original;
  if (original !== undefined) {
    for (const column of globalColumns) {
      if (matchesValue(column.getValue(original, row.index))) return true;
    }
    return false;
  }

  for (const column of globalColumns) {
    if (matchesValue(row.getValue(column.id))) return true;
  }
  return false;
}

function rowMatchesGlobalFilter<TData>(
  row: Row<TData>,
  globalColumns: readonly Column<TData, unknown>[],
  globalFilter: unknown,
  matchesDefaultValue: ((value: unknown) => boolean) | undefined,
  globalFilterFn: FilterFn<TData, unknown> | undefined,
): boolean {
  for (const column of globalColumns) {
    const value = getRowColumnValue(row, column);
    if (globalFilterFn
      ? globalFilterFn(value, globalFilter, row, column)
      : matchesDefaultValue!(value)) {
      return true;
    }
  }
  return false;
}

interface ResolvedFilterRule<TData> {
  column: Column<TData, unknown>;
  value: unknown;
  normalizedValue: string;
}

function sortSiblingRows<TData>(
  rows: readonly Row<TData>[],
  rules: readonly ResolvedSortRule<TData>[],
): Row<TData>[] {
  return sortRowsByRules(rows, rules).map((row) => (
    row.subRows.length > 0 ? cloneRowWithSubRows(row, sortSiblingRows(row.subRows, rules)) : row
  ));
}

function sortRowsByRules<TData>(
  rows: readonly Row<TData>[],
  rules: readonly ResolvedSortRule<TData>[],
): Row<TData>[] {
  const singleRule = rules.length === 1 ? rules[0] : undefined;
  if (singleRule && !singleRule.column.columnDef.sortFn) {
    return sortRowsByDefaultRule(rows, singleRule);
  }
  if (rules.every((rule) => !rule.column.columnDef.sortFn)) {
    const primitiveRows = sortRowsByDefaultRules(rows, rules);
    if (primitiveRows) return primitiveRows;
  }
  return [...rows].sort((a, b) => {
      for (const { column, direction } of rules) {
        const comparison = column.columnDef.sortFn
          ? column.columnDef.sortFn(a, b, column.id)
          : defaultCompare(getSortValue(a, column), getSortValue(b, column));

        if (comparison !== 0) {
          return comparison * direction;
        }
      }

      return a.index - b.index;
    });
}

function sortRowsByDefaultRules<TData>(
  rows: readonly Row<TData>[],
  rules: readonly ResolvedSortRule<TData>[],
): Row<TData>[] | undefined {
  const valuesByRule = rules.map(({ column }) => {
    const values = new Array<unknown>(rows.length);
    for (let index = 0; index < rows.length; index += 1) {
      values[index] = getSortValue(rows[index]!, column);
    }
    return values;
  });
  return sortRowsByStringNumberRules(rows, valuesByRule, rules);
}

function sortRowsByStringNumberRules<TData>(
  rows: readonly Row<TData>[],
  valuesByRule: readonly (readonly unknown[])[],
  rules: readonly ResolvedSortRule<TData>[],
): Row<TData>[] | undefined {
  const stringValues = valuesByRule[0];
  const numberValues = valuesByRule[1];
  if (rules.length !== 2
    || !stringValues?.every((value) => typeof value === "string")
    || !numberValues?.every((value) => typeof value === "number" && Number.isFinite(value))
    || rows.some((row, index) => index > 0 && rows[index - 1]!.index > row.index)) {
    return undefined;
  }
  const numericValues = Float64Array.from(numberValues as readonly number[], (value) => value === 0 ? 0 : value);
  let order = radixSortFiniteNumberOrder(numericValues, rules[1]!.direction);
  order = stableSortStringOrder(stringValues as readonly string[], rules[0]!.direction, order);
  return Array.from(order, (index) => rows[index]!);
}

function stableSortStringOrder(
  values: readonly string[],
  direction: number,
  order: Uint32Array,
): Uint32Array {
  const uniqueValues = [...new Set(values)].sort((left, right) => defaultCompare(left, right) * direction);
  const rankByValue = new Map<string, number>();
  let rank = -1;
  for (let index = 0; index < uniqueValues.length; index += 1) {
    if (index === 0 || defaultCompare(uniqueValues[index - 1], uniqueValues[index]) !== 0) rank += 1;
    rankByValue.set(uniqueValues[index]!, rank);
  }
  const ranks = Float64Array.from(values, (value) => rankByValue.get(value)!);
  return radixSortFiniteNumberOrder(ranks, 1, order);
}

function sortRowsByDefaultRule<TData>(
  rows: readonly Row<TData>[],
  rule: ResolvedSortRule<TData>,
): Row<TData>[] {
  if (rows.length >= FINITE_NUMBER_RADIX_SORT_MIN_ROWS) {
    const firstRow = rows[0]!;
    const firstValue = getSortValue(firstRow, rule.column);
    if (typeof firstValue === "number" && Number.isFinite(firstValue)) {
      const numericValues = new Float64Array(rows.length);
      numericValues[0] = firstValue === 0 ? 0 : firstValue;
      let previousRowIndex = firstRow.index;
      let originalIndexOrder = true;

      for (let index = 1; index < rows.length; index += 1) {
        const row = rows[index]!;
        const value = getSortValue(row, rule.column);
        if (typeof value !== "number" || !Number.isFinite(value)) {
          const values = new Array<unknown>(rows.length);
          for (let copiedIndex = 0; copiedIndex < index; copiedIndex += 1) {
            values[copiedIndex] = numericValues[copiedIndex];
          }
          values[index] = value;
          for (let remainingIndex = index + 1; remainingIndex < rows.length; remainingIndex += 1) {
            values[remainingIndex] = getSortValue(rows[remainingIndex]!, rule.column);
          }
          return sortRowsByCollectedDefaultValues(rows, values, rule);
        }

        numericValues[index] = value === 0 ? 0 : value;
        if (row.index < previousRowIndex) originalIndexOrder = false;
        previousRowIndex = row.index;
      }

      return originalIndexOrder
        ? radixSortFiniteNumberRows(rows, numericValues, rule.direction)
        : sortRowsByCollectedDefaultValues(rows, numericValues, rule);
    }
  }

  const values = new Array<unknown>(rows.length);
  for (let index = 0; index < rows.length; index += 1) {
    values[index] = getSortValue(rows[index]!, rule.column);
  }
  return sortRowsByCollectedDefaultValues(rows, values, rule);
}

function sortRowsByCollectedDefaultValues<TData>(
  rows: readonly Row<TData>[],
  values: ArrayLike<unknown>,
  rule: ResolvedSortRule<TData>,
): Row<TData>[] {
  const order = new Uint32Array(rows.length);
  for (let index = 0; index < rows.length; index += 1) order[index] = index;

  order.sort((leftIndex, rightIndex) => {
    const comparison = defaultCompare(values[leftIndex], values[rightIndex]);
    return comparison === 0
      ? rows[leftIndex]!.index - rows[rightIndex]!.index
      : comparison * rule.direction;
  });

  return Array.from(order, (index) => rows[index]!);
}

function radixSortFiniteNumberRows<TData>(
  rows: readonly Row<TData>[],
  values: Float64Array,
  direction: number,
): Row<TData>[] {
  const order = radixSortFiniteNumberOrder(values, direction);
  const sortedRows = new Array<Row<TData>>(rows.length);
  for (let index = 0; index < rows.length; index += 1) sortedRows[index] = rows[order[index]!]!;
  return sortedRows;
}

function radixSortFiniteNumberOrder(
  values: Float64Array,
  direction: number,
  initialOrder?: Uint32Array,
): Uint32Array {
  const length = values.length;
  let order = initialOrder ?? new Uint32Array(length);
  let scratch: Uint32Array = new Uint32Array(length);
  const words = new Uint32Array(values.buffer, values.byteOffset, values.length * 2);

  for (let index = 0; index < length; index += 1) {
    if (!initialOrder) order[index] = index;
    const wordIndex = index * 2;
    const highWord = words[wordIndex + FLOAT64_HIGH_WORD_OFFSET]!;
    if ((highWord & 0x80000000) !== 0) {
      words[wordIndex + FLOAT64_LOW_WORD_OFFSET] = ~words[wordIndex + FLOAT64_LOW_WORD_OFFSET]!;
      words[wordIndex + FLOAT64_HIGH_WORD_OFFSET] = ~highWord;
    } else {
      words[wordIndex + FLOAT64_HIGH_WORD_OFFSET] = highWord ^ 0x80000000;
    }
  }

  const counts = new Uint32Array(256);
  const directionMask = direction < 0 ? 0xff : 0;
  for (let pass = 0; pass < 8; pass += 1) {
    counts.fill(0);
    const wordOffset = pass < 4 ? FLOAT64_LOW_WORD_OFFSET : FLOAT64_HIGH_WORD_OFFSET;
    const shift = (pass & 3) * 8;

    for (let index = 0; index < length; index += 1) {
      const rowIndex = order[index]!;
      const byte = ((words[rowIndex * 2 + wordOffset]! >>> shift) & 0xff) ^ directionMask;
      counts[byte] = counts[byte]! + 1;
    }

    let writeOffset = 0;
    for (let byte = 0; byte < counts.length; byte += 1) {
      const count = counts[byte]!;
      counts[byte] = writeOffset;
      writeOffset += count;
    }

    for (let index = 0; index < length; index += 1) {
      const rowIndex = order[index]!;
      const byte = ((words[rowIndex * 2 + wordOffset]! >>> shift) & 0xff) ^ directionMask;
      scratch[counts[byte]!] = rowIndex;
      counts[byte] = counts[byte]! + 1;
    }

    const previousOrder = order;
    order = scratch;
    scratch = previousOrder;
  }
  return order;
}

interface ResolvedSortRule<TData> {
  column: Column<TData, unknown>;
  direction: number;
}

function getSortValue<TData>(row: Row<TData>, column: Column<TData, unknown>): unknown {
  return getRowColumnValue(row, column);
}

function getRowColumnValue<TData>(row: Row<TData>, column: Column<TData, unknown>): unknown {
  return row.original === undefined ? row.getValue(column.id) : column.getValue(row.original, row.index);
}

function cloneRowWithSubRows<TData>(row: Row<TData>, subRows: Row<TData>[]): Row<TData> {
  const nextRow: Row<TData> = {
    ...row,
    subRows,
    leafRows: [],
    getCanExpand: () => nextRow.subRows.length > 0,
  };

  nextRow.leafRows = subRows.length > 0 ? subRows.flatMap((subRow) => subRow.leafRows) : [nextRow];

  return nextRow;
}

export function groupRows<TData>(
  rowModel: RowModel<TData>,
  columns: readonly Column<TData, unknown>[],
  grouping: GroupingState,
  groupFooterMode: GroupFooterMode = false,
): RowModel<TData> {
  if (grouping.length === 0 || rowModel.rows.length === 0) {
    return rowModel;
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const groupedColumnIds = new Set<ColumnId>();
  const groupableColumns = grouping.flatMap((columnId) => {
    const column = columnById.get(columnId);

    if (!column?.getCanGroup() || groupedColumnIds.has(column.id)) {
      return [];
    }

    groupedColumnIds.add(column.id);
    return [column];
  });

  if (groupableColumns.length === 0) {
    return rowModel;
  }

  return createRowModel(groupRowsByDepth(rowModel.rows, columns, groupableColumns, 0, null, groupFooterMode));
}

export function expandRows<TData>(rowModel: RowModel<TData>, expanded: ExpandedState): RowModel<TData> {
  if (rowModel.rows.length === 0 || rowModel.rows.every((row) => !row.getCanExpand())) {
    return rowModel;
  }

  const rows: Row<TData>[] = [];

  const visit = (row: Row<TData>) => {
    rows.push(row);

    if (!expanded[row.id]) {
      return;
    }

    for (const subRow of row.subRows) {
      visit(subRow);
    }

    if (row.footerRow) {
      rows.push(row.footerRow);
    }
  };

  for (const row of rowModel.rows) {
    visit(row);
  }

  return createRowModel(rows, { includeSubRows: false });
}

export function paginateRows<TData>(rowModel: RowModel<TData>, pageIndex: number, pageSize: number): RowModel<TData> {
  const resolvedPageIndex = normalizePaginationPageIndex(pageIndex);
  const resolvedPageSize = normalizePaginationPageSize(pageSize);
  const start = resolvedPageIndex * resolvedPageSize;
  if (start === 0 && resolvedPageSize >= rowModel.rows.length) {
    return rowModel;
  }
  return createRowModel(rowModel.rows.slice(start, start + resolvedPageSize), { includeSubRows: false });
}

export function normalizePaginationPageIndex(pageIndex: number): number {
  return Number.isFinite(pageIndex) ? Math.max(0, Math.floor(pageIndex)) : 0;
}

export function normalizePaginationPageSize(pageSize: number): number {
  return Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
}

export function normalizePaginationPageCount(pageCount: number): number {
  return Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1;
}

function groupRowsByDepth<TData>(
  rows: Row<TData>[],
  columns: readonly Column<TData, unknown>[],
  groupingColumns: Array<Column<TData, unknown>>,
  depth: number,
  parentId: RowId | null,
  groupFooterMode: GroupFooterMode,
): Row<TData>[] {
  const groupingColumn = groupingColumns[depth];

  if (!groupingColumn) {
    return rows.map((row) => {
      const nextRow: Row<TData> = {
        ...row,
        depth,
        parentId,
      };
      nextRow.leafRows = [nextRow];
      return nextRow;
    });
  }

  const groupedRows = new Map<string, { value: unknown; rows: Row<TData>[] }>();
  const groupOrder: string[] = [];

  for (const row of rows) {
    const value = getRowGroupingValue(row, groupingColumn);
    const key = serializeGroupingKey(value);
    const existing = groupedRows.get(key);

    if (existing) {
      existing.rows.push(row);
    } else {
      groupedRows.set(key, { value, rows: [row] });
      groupOrder.push(key);
    }
  }

  return groupOrder.map((key, index) => {
    const group = groupedRows.get(key)!;
    const id = createGroupRowId(parentId, groupingColumn.id, key);
    const subRows = groupRowsByDepth(group.rows, columns, groupingColumns, depth + 1, id, groupFooterMode);
    const leafRows = subRows.flatMap((row) => row.leafRows);
    const row: Row<TData> = {
      id,
      index,
      original: undefined,
      depth,
      parentId,
      subRows,
      leafRows,
      groupingColumnId: groupingColumn.id,
      groupingValue: group.value,
      getValue: <TValue = unknown>(columnId: ColumnId): TValue | undefined => {
        if (columnId === groupingColumn.id) {
          return group.value as TValue | undefined;
        }

        const column = columns.find((candidate) => candidate.id === columnId);

        if (!column?.columnDef.aggregationFn) {
          return undefined;
        }

        return aggregateColumnValue(column, leafRows, subRows) as TValue | undefined;
      },
      getIsGrouped: returnTrue,
      getIsGroupFooter: returnFalse,
      getCanExpand: () => subRows.length > 0,
    };

    if (groupFooterMode === "expanded") {
      row.footerRow = createGroupFooterRow(row, columns, leafRows, subRows);
    }

    return row;
  });
}

function createGroupFooterRow<TData>(
  groupRow: Row<TData>,
  columns: readonly Column<TData, unknown>[],
  leafRows: Row<TData>[],
  childRows: Row<TData>[],
): Row<TData> {
  const row: Row<TData> = {
    id: `${groupRow.id}>__footer__`,
    index: groupRow.index,
    original: undefined,
    depth: groupRow.depth + 1,
    parentId: groupRow.id,
    subRows: [],
    leafRows,
    groupFooterFor: groupRow.id,
    groupFooterLabel: `Total ${formatFooterGroupingValue(groupRow.groupingValue)}`,
    getValue: <TValue = unknown>(columnId: ColumnId): TValue | undefined => {
      const column = columns.find((candidate) => candidate.id === columnId);

      if (!column?.columnDef.aggregationFn) {
        return undefined;
      }

      return aggregateColumnValue(column, leafRows, childRows) as TValue | undefined;
    },
    getIsGrouped: returnFalse,
    getIsGroupFooter: returnTrue,
    getCanExpand: returnFalse,
  };

  if (groupRow.groupingColumnId !== undefined) {
    row.groupingColumnId = groupRow.groupingColumnId;
  }

  if (groupRow.groupingValue !== undefined) {
    row.groupingValue = groupRow.groupingValue;
  }

  return row;
}

function getRowGroupingValue<TData>(row: Row<TData>, column: Column<TData, unknown>): unknown {
  const original = row.original ?? row.leafRows[0]?.original;

  if (original && column.columnDef.groupingValue) {
    return column.columnDef.groupingValue({
      row: original,
      rowIndex: row.index,
      column,
    });
  }

  return row.getValue(column.id);
}

function aggregateColumnValue<TData>(
  column: Column<TData, unknown>,
  leafRows: Row<TData>[],
  childRows: Row<TData>[],
): unknown {
  const aggregationFn = column.columnDef.aggregationFn;

  if (!aggregationFn) {
    return undefined;
  }

  const values = leafRows.map((row) => row.getValue(column.id));
  const context: AggregationContext<TData, unknown> = {
    column,
    columnId: column.id,
    leafRows,
    childRows,
    values,
  };

  if (typeof aggregationFn === "function") {
    return aggregationFn(context);
  }

  return aggregateBuiltIn(aggregationFn, values);
}

function aggregateBuiltIn(aggregationFn: BuiltInAggregationFn, values: unknown[]): unknown {
  const definedValues = values.filter((value) => value !== undefined && value !== null);

  if (aggregationFn === "count") {
    return definedValues.length;
  }

  const numericValues = definedValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numericValues.length === 0) {
    return undefined;
  }

  if (aggregationFn === "sum") {
    return numericValues.reduce((total, value) => total + value, 0);
  }

  if (aggregationFn === "min") {
    return Math.min(...numericValues);
  }

  if (aggregationFn === "max") {
    return Math.max(...numericValues);
  }

  return numericValues.reduce((total, value) => total + value, 0) / numericValues.length;
}

function createGroupRowId(parentId: RowId | null, columnId: ColumnId, key: string): RowId {
  return `${parentId ? `${parentId}>` : "__group__"}${columnId}:${key}`;
}

function serializeGroupingKey(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? String(value);
}

function formatFooterGroupingValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "(blank)";
  }

  return String(value);
}

function defaultFilter(value: unknown, normalizedFilterValue: string): boolean {
  return normalizedFilterValue.length === 0 || String(value ?? "").toLowerCase().includes(normalizedFilterValue);
}

function createDefaultFilterMatcher(normalizedFilterValue: string): (value: unknown) => boolean {
  if (normalizedFilterValue.length === 0) {
    return returnTrue;
  }

  const finiteNumberCanMatch = hasOnlyCharacters(normalizedFilterValue, "0123456789.e+-");
  const bigintCanMatch = hasOnlyCharacters(normalizedFilterValue, "0123456789-");

  return (value) => {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "string") {
      return value.toLowerCase().includes(normalizedFilterValue);
    }

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? finiteNumberCanMatch && String(value).includes(normalizedFilterValue)
        : String(value).toLowerCase().includes(normalizedFilterValue);
    }

    if (typeof value === "bigint") {
      return bigintCanMatch && String(value).includes(normalizedFilterValue);
    }

    if (typeof value === "boolean") {
      return (value ? "true" : "false").includes(normalizedFilterValue);
    }

    return String(value).toLowerCase().includes(normalizedFilterValue);
  };
}

function createBoundedPrimitiveFilterMatcher(
  matchesValue: (value: unknown) => boolean,
): (value: unknown) => boolean {
  const cache = new Map<unknown, boolean>();
  let cacheEnabled = true;

  return (value) => {
    if (!cacheEnabled || (typeof value === "object" && value !== null) || typeof value === "function") {
      return matchesValue(value);
    }

    const cached = cache.get(value);
    if (cached !== undefined) {
      return cached;
    }

    const matches = matchesValue(value);
    if (cache.size < DEFAULT_FILTER_CACHE_LIMIT) {
      cache.set(value, matches);
    } else {
      cache.clear();
      cacheEnabled = false;
    }
    return matches;
  };
}

function hasOnlyCharacters(value: string, allowedCharacters: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (!allowedCharacters.includes(value[index]!)) {
      return false;
    }
  }
  return true;
}

function normalizeFilterValue(value: unknown): string {
  return isEmptyFilterValue(value) ? "" : String(value).toLowerCase();
}

function isEmptyFilterValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }

  if (a === undefined || a === null) {
    return -1;
  }

  if (b === undefined || b === null) {
    return 1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
