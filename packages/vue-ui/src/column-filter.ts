import { h, type VNodeChild } from "vue";
import type { Column, Grid } from "@open-grid/core";
import { getColumnFilterControls, getNextColumnFilterControlValue, getNextColumnFilters, type GridLocalization } from "@open-grid/primitives";

export function renderColumnFilter<TData>(grid: Grid<TData>, column: Column<TData, unknown>, localization: GridLocalization): VNodeChild {
  const filters = grid.getState().columnFilters;
  const active = filters.some((filter) => filter.id === column.id);
  const apply = (next: typeof filters) => grid.setState((state) => ({ ...state, columnFilters: next, pagination: { ...state.pagination, pageIndex: 0 } }));
  return h("div", { class: "og-grid__filter-controls" }, [
    ...getColumnFilterControls(column, filters, localization).map((control) => control.type === "select" ? h("select", {
      key: control.part, class: "og-grid__filter-input", multiple: true, size: 1, "data-column-id": column.id, "aria-label": control.label, "aria-invalid": control.invalid || undefined,
      onChange: (event: Event) => apply(getNextColumnFilterControlValue(filters, column, control.part, Array.from((event.target as HTMLSelectElement).selectedOptions, (option) => option.value))),
    }, control.options.map((option) => h("option", { value: option.value, selected: (control.value as readonly string[]).includes(option.value) }, option.label))) : h("input", {
      key: control.part, class: "og-grid__filter-input", type: control.type, "data-column-id": column.id, placeholder: control.type === "search" ? localization.filterPlaceholder : undefined, "aria-label": control.label, "aria-invalid": control.invalid || undefined,
      value: String(control.value), autocomplete: "off", step: control.type === "number" ? "any" : undefined,
      onInput: (event: Event) => apply(getNextColumnFilterControlValue(filters, column, control.part, (event.target as HTMLInputElement).value)),
    })),
    column.columnDef.filterType && column.columnDef.filterType !== "text" ? h("button", { type: "button", disabled: !active,
      "aria-label": localization.clearColumnFilterLabel?.(localization.filterColumnLabel(column.id)) ?? `Clear filter ${column.id}`,
      onClick: () => apply(getNextColumnFilters(filters, column.id, "")) }, localization.clear) : null,
  ]);
}
