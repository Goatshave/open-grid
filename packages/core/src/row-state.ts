import type { RowId } from "./types";

/** Row IDs are dictionary keys; inherited properties are never state flags. */
export function getOwnRowFlag(flags: Record<RowId, boolean>, rowId: RowId): boolean | undefined {
  return Object.hasOwn(flags, rowId) ? flags[rowId] : undefined;
}

/** Preserve ordinary state records while avoiding Object.prototype.__proto__. */
export function setOwnRowFlag(flags: Record<RowId, boolean>, rowId: RowId, value: boolean): void {
  if (rowId === "__proto__") {
    Object.defineProperty(flags, rowId, { value, enumerable: true, configurable: true, writable: true });
  } else {
    flags[rowId] = value;
  }
}
