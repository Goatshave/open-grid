import type { AccessorKey, AnyColumnDef, ColumnDef, ColumnId } from "./types";

export type AccessorColumnOptions<TData, TValue> = Omit<
  ColumnDef<TData, TValue>,
  "accessorKey" | "accessorFn" | "columns"
>;

export type AccessorKeyColumnDef<TData, TKey extends AccessorKey<TData>> = AccessorColumnOptions<TData, TData[TKey]> & {
  accessorKey: TKey;
};

export type AccessorFnColumnDef<TData, TValue> = AccessorColumnOptions<TData, TValue> & {
  id: ColumnId;
  accessorFn: (row: TData, index: number) => TValue;
};

export type DisplayColumnDef<TData> = Omit<ColumnDef<TData, unknown>, "accessorKey" | "accessorFn" | "columns"> & {
  id: ColumnId;
};

export type GroupColumnDef<TData> = Omit<
  ColumnDef<TData, unknown>,
  "accessorKey" | "accessorFn" | "cell" | "sortFn" | "filterFn"
> & {
  id?: ColumnId;
  columns: AnyColumnDef<TData>[];
};

export interface ColumnHelper<TData> {
  accessor<TKey extends AccessorKey<TData>>(
    accessorKey: TKey,
    column?: AccessorColumnOptions<TData, TData[TKey]>,
  ): AccessorKeyColumnDef<TData, TKey>;
  accessor<TValue>(
    accessorFn: (row: TData, index: number) => TValue,
    column: AccessorColumnOptions<TData, TValue> & { id: ColumnId },
  ): AccessorFnColumnDef<TData, TValue>;
  display(column: DisplayColumnDef<TData>): DisplayColumnDef<TData>;
  group(column: GroupColumnDef<TData>): GroupColumnDef<TData>;
}

export function createColumnHelper<TData>(): ColumnHelper<TData> {
  return {
    accessor: (accessor: AccessorKey<TData> | ((row: TData, index: number) => unknown), column: Record<string, unknown> = {}) => {
      if (typeof accessor === "function") {
        return {
          ...column,
          accessorFn: accessor,
        };
      }

      return {
        ...column,
        accessorKey: accessor,
      };
    },
    display: (column) => column,
    group: (column) => column,
  } as ColumnHelper<TData>;
}
