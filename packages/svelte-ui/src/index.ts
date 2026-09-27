import type { ExportFile } from "@open-grid/core";
import { downloadBrowserExportFile } from "@open-grid/primitives";

export interface SvelteDataGridRenderer<TContext> {
  type: "open-grid:svelte-renderer";
  component: unknown;
  context: TContext;
  props?: Record<string, unknown>;
}

export type SvelteDataGridRendererFactory<TContext> = (context: TContext) => SvelteDataGridRenderer<TContext>;

export function createSvelteDataGridRenderer<TContext>(
  component: unknown,
  props?: Record<string, unknown>,
): SvelteDataGridRendererFactory<TContext> {
  return (context) => ({
    type: "open-grid:svelte-renderer",
    component,
    context,
    ...(props ? { props } : {}),
  });
}

export { default as DataGrid } from "./DataGrid.svelte";
export type {
  ColumnVirtualizationOptions,
  DataGridProps,
  DataGridErrorRenderContext,
  DataGridRenderContext,
  GridReadyHandler,
  HeaderActionMenuActionItem,
  HeaderActionMenuContext,
  HeaderActionMenuCustomItem,
  HeaderActionMenuItem,
  HeaderActionMenuItems,
  HeaderActionMenuLabelItem,
  HeaderActionMenuSeparatorItem,
  RowVirtualizationOptions,
  SvelteDataGridRenderValue,
} from "./DataGrid.svelte";
export { createColumnHelper, createGridStore, fitColumnsToWidth } from "@open-grid/svelte";
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

export function downloadExportFile(file: ExportFile): boolean {
  return downloadBrowserExportFile(file);
}

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
  ExportFile,
  ExportFileOptions,
  ExpandedState,
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
