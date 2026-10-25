<script lang="ts">
  import type { Column, Grid, ColumnFiltersState } from "@open-grid/core";
  import { getColumnFilterControls, getNextColumnFilterControlValue, getNextColumnFilters, type GridLocalization } from "@open-grid/primitives";
  export let grid: Grid<unknown>;
  export let column: Column<unknown, unknown>;
  export let filters: ColumnFiltersState;
  export let localization: GridLocalization;
  $: controls = getColumnFilterControls(column, filters, localization);
  $: active = filters.some((filter) => filter.id === column.id);
  $: selectedValues = (controls.find((control) => control.part === "values")?.value ?? []) as string[];
  const apply = (next: ColumnFiltersState) => grid.setState((state) => ({ ...state, columnFilters: next, pagination: { ...state.pagination, pageIndex: 0 } }));
</script>

<div class="og-grid__filter-controls">
  {#each controls as control (control.part)}
    {#if control.type === "select"}
      <select class="og-grid__filter-input" multiple size={1} data-column-id={column.id} bind:value={selectedValues} aria-label={control.label} aria-invalid={control.invalid || undefined}
        on:change={(event) => apply(getNextColumnFilterControlValue(filters, column, control.part, Array.from(event.currentTarget.selectedOptions, (option) => option.value)))}>
        {#each control.options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <input class="og-grid__filter-input" type={control.type} data-column-id={column.id} placeholder={control.type === "search" ? localization.filterPlaceholder : undefined} aria-label={control.label} aria-invalid={control.invalid || undefined}
        value={String(control.value)} autocomplete="off" step={control.type === "number" ? "any" : undefined}
        on:input={(event) => apply(getNextColumnFilterControlValue(filters, column, control.part, event.currentTarget.value))} />
    {/if}
  {/each}
  {#if column.columnDef.filterType && column.columnDef.filterType !== "text"}
    <button type="button" disabled={!active} aria-label={localization.clearColumnFilterLabel?.(localization.filterColumnLabel(column.id)) ?? `Clear filter ${column.id}`}
      on:click={() => apply(getNextColumnFilters(filters, column.id, ""))}>{localization.clear}</button>
  {/if}
</div>
