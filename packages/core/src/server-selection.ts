import type { GridState, RowId, RowSelectionState } from "./types";

export type ServerSelection<TQuery> =
  | { readonly mode: "explicit"; readonly queryKey: string; readonly query: Readonly<TQuery>; readonly ids: readonly RowId[] }
  | { readonly mode: "all-matching"; readonly queryKey: string; readonly query: Readonly<TQuery>; readonly excludedIds: readonly RowId[] };

export interface ServerSelectionController<TQuery> {
  getState: () => ServerSelection<TQuery>;
  /** Returns true when a new selection universe cleared previous selections. */
  setQuery: (query: TQuery) => boolean;
  setRowSelected: (rowId: RowId, selected: boolean) => void;
  getIsRowSelected: (rowId: RowId) => boolean;
  selectAllMatching: () => void;
  clear: () => void;
  getGridState: (loadedRowIds: readonly RowId[]) => Pick<GridState, "rowSelection" | "allRowsSelected">;
  /** Apply checkbox changes only to the loaded rows, without inferring all-matching. */
  setGridState: (loadedRowIds: readonly RowId[], state: Pick<GridState, "rowSelection" | "allRowsSelected">) => void;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
}

/** Freezes a JSON query snapshot so later product mutations cannot change a bulk request. */
function captureQuery<TQuery>(query: TQuery): Readonly<TQuery> {
  const ancestors = new Set<object>();
  const check = (value: unknown): void => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (!value || typeof value !== "object" || ancestors.has(value) ||
      !Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      throw new TypeError("server selection queries must contain finite JSON values");
    }
    ancestors.add(value);
    if (Array.isArray(value)) for (const item of value) check(item);
    else for (const item of Object.values(value)) if (item !== undefined) check(item);
    ancestors.delete(value);
  };
  check(query);
  const captured = JSON.parse(JSON.stringify(query)) as TQuery;
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
  };
  freeze(captured);
  return captured;
}

/** Separate from GridState: loaded row models never stand for all remote matches. */
export function createServerSelection<TQuery>(options: {
  query: TQuery;
  getQueryKey: (query: Readonly<TQuery>) => string;
}): ServerSelectionController<TQuery> {
  const snapshot = (query: TQuery) => {
    const captured = captureQuery(query);
    const queryKey = options.getQueryKey(captured);
    if (typeof queryKey !== "string" || !queryKey.trim()) throw new TypeError("selection query key must be non-empty");
    return { query: captured, queryKey };
  };
  let state: ServerSelection<TQuery> = Object.freeze({ mode: "explicit", ...snapshot(options.query), ids: Object.freeze([]) });
  let selected = new Set<RowId>();
  let disposed = false;
  const listeners = new Set<() => void>();
  const assertActive = () => { if (disposed) throw new Error("server selection is disposed"); };
  const publish = () => {
    state = Object.freeze(state.mode === "explicit"
      ? { mode: "explicit", query: state.query, queryKey: state.queryKey, ids: Object.freeze([...selected]) }
      : { mode: "all-matching", query: state.query, queryKey: state.queryKey, excludedIds: Object.freeze([...selected]) });
    for (const listener of listeners) listener();
  };
  const controller: ServerSelectionController<TQuery> = {
    getState: () => state,
    setQuery: (query) => {
      assertActive();
      const next = snapshot(query);
      const changed = next.queryKey !== state.queryKey;
      if (changed) { selected.clear(); state = { mode: "explicit", ...next, ids: [] }; }
      else {
        if (JSON.stringify(next.query) === JSON.stringify(state.query)) return false;
        state = { ...state, ...next };
      }
      publish(); return changed;
    },
    getIsRowSelected: (rowId) => state.mode === "explicit" ? selected.has(rowId) : !selected.has(rowId),
    setRowSelected: (rowId, checked) => {
      assertActive();
      if (typeof rowId !== "string" || !rowId) throw new TypeError("selection row IDs must be non-empty strings");
      const contained = state.mode === "explicit" ? checked : !checked;
      if (selected.has(rowId) === contained) return;
      if (contained) selected.add(rowId); else selected.delete(rowId);
      publish();
    },
    selectAllMatching: () => { assertActive(); selected.clear(); state = { mode: "all-matching", query: state.query, queryKey: state.queryKey, excludedIds: [] }; publish(); },
    clear: () => { assertActive(); selected.clear(); state = { mode: "explicit", query: state.query, queryKey: state.queryKey, ids: [] }; publish(); },
    getGridState: (ids) => {
      const rowSelection: RowSelectionState = Object.fromEntries(ids.filter(controller.getIsRowSelected).map((id) => [id, true]));
      return { rowSelection, allRowsSelected: false };
    },
    setGridState: (ids, gridState) => {
      assertActive();
      if (ids.some((id) => typeof id !== "string" || !id)) throw new TypeError("selection row IDs must be non-empty strings");
      let changed = false;
      for (const id of ids) {
        const checked = gridState.allRowsSelected ? gridState.rowSelection[id] !== false : gridState.rowSelection[id] === true;
        const contained = state.mode === "explicit" ? checked : !checked;
        if (selected.has(id) === contained) continue;
        if (contained) selected.add(id); else selected.delete(id);
        changed = true;
      }
      if (changed) publish();
    },
    subscribe: (listener) => { assertActive(); listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose: () => { disposed = true; selected.clear(); listeners.clear(); state = Object.freeze({ mode: "explicit", query: state.query, queryKey: state.queryKey, ids: Object.freeze([]) }); },
  };
  return controller;
}
