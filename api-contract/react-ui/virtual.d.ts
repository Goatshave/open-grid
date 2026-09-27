import * as react from 'react';
import { CSSProperties, ReactNode } from 'react';
import { GridOptions, Row, HeaderContext, CellContext } from '@open-grid/core';
export { AnyColumnDef, GridState, createColumnHelper } from '@open-grid/core';
import { GridLocalizationOverrides } from '@open-grid/primitives';

interface VirtualDataGridProps<TData> extends GridOptions<TData> {
    ariaLabel?: string;
    localization?: GridLocalizationOverrides;
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
declare function VirtualDataGrid<TData>(props: VirtualDataGridProps<TData>): react.JSX.Element;

export { VirtualDataGrid, type VirtualDataGridProps };
