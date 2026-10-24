import type { Column, Grid } from "@open-grid/core";
import { getColumnFilterControls, getNextColumnFilterControlValue, getNextColumnFilters, type GridLocalization } from "@open-grid/primitives";

export function ColumnFilter<TData>({ grid, column, localization }: { grid: Grid<TData>; column: Column<TData, unknown>; localization: GridLocalization }) {
  const filters = grid.getState().columnFilters;
  const active = filters.some((filter) => filter.id === column.id);
  const apply = (next: typeof filters) => grid.setState((state) => ({ ...state, columnFilters: next, pagination: { ...state.pagination, pageIndex: 0 } }));
  return <div className="og-grid__filter-controls">
    {getColumnFilterControls(column, filters, localization).map((control) => control.type === "select" ? (
      <select key={control.part} className="og-grid__filter-input" multiple size={1} data-column-id={column.id} aria-label={control.label} aria-invalid={control.invalid || undefined}
        value={control.value as string[]} onChange={(event) => apply(getNextColumnFilterControlValue(filters, column, control.part, Array.from(event.currentTarget.selectedOptions, (option) => option.value)))}>
        {control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    ) : <input key={control.part} className="og-grid__filter-input" type={control.type} data-column-id={column.id} placeholder={control.type === "search" ? localization.filterPlaceholder : undefined} aria-label={control.label}
      aria-invalid={control.invalid || undefined} value={String(control.value)} autoComplete="off" step={control.type === "number" ? "any" : undefined}
      onChange={(event) => apply(getNextColumnFilterControlValue(filters, column, control.part, event.currentTarget.value))} />)}
    {column.columnDef.filterType && column.columnDef.filterType !== "text" ? <button type="button" disabled={!active}
      aria-label={localization.clearColumnFilterLabel?.(localization.filterColumnLabel(column.id)) ?? `Clear filter ${column.id}`}
      onClick={() => apply(getNextColumnFilters(filters, column.id, ""))}>{localization.clear}</button> : null}
  </div>;
}
