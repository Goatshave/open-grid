export type ColumnFilterType = "text" | "number-range" | "date-range" | "set";
export type ColumnFilterOptionValue = string | number | boolean | null;
export interface ColumnFilterOption { value: ColumnFilterOptionValue; label?: string; }
export interface NumberRangeFilter { type: "number-range"; min?: number; max?: number; }
export interface DateRangeFilter { type: "date-range"; from?: string; to?: string; }
export interface SetFilter { type: "set"; values: readonly ColumnFilterOptionValue[]; }
export type TypedColumnFilterValue = NumberRangeFilter | DateRangeFilter | SetFilter;

/** Calendar dates are ISO YYYY-MM-DD, independent of the host's timezone. */
export function isISOCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return month >= 1 && month <= 12 && day >= 1 && day <= days;
}

export function isTypedColumnFilterValue(value: unknown): value is TypedColumnFilterValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const filter = value as Record<string, unknown>;
  const keys = Object.keys(filter);
  if (filter.type === "number-range") return keys.every((key) => ["type", "min", "max"].includes(key)) &&
    (filter.min === undefined || typeof filter.min === "number" && Number.isFinite(filter.min)) &&
    (filter.max === undefined || typeof filter.max === "number" && Number.isFinite(filter.max)) &&
    (filter.min === undefined || filter.max === undefined || Number(filter.min) <= Number(filter.max));
  if (filter.type === "date-range") return keys.every((key) => ["type", "from", "to"].includes(key)) &&
    (filter.from === undefined || isISOCalendarDate(filter.from)) &&
    (filter.to === undefined || isISOCalendarDate(filter.to)) &&
    (filter.from === undefined || filter.to === undefined || String(filter.from) <= String(filter.to));
  return filter.type === "set" && keys.every((key) => ["type", "values"].includes(key)) && Array.isArray(filter.values) &&
    filter.values.every((item) => item === null || typeof item === "string" || typeof item === "boolean" || typeof item === "number" && Number.isFinite(item));
}

/** Compiles once per query; the same serializable contract can run on a server. */
export function createColumnFilterMatcher(filter: unknown): (value: unknown) => boolean {
  if (filter && typeof filter === "object" && "type" in filter &&
    ["number-range", "date-range", "set"].includes(String(filter.type))) {
    if (!isTypedColumnFilterValue(filter)) return () => false;
    if (filter.type === "number-range") {
      const { min, max } = filter;
      if (min === undefined && max === undefined) return () => true;
      return (value) => typeof value === "number" && Number.isFinite(value) &&
        (min === undefined || value >= min) && (max === undefined || value <= max);
    }
    if (filter.type === "date-range") {
      const { from, to } = filter;
      if (from === undefined && to === undefined) return () => true;
      return (value) => {
        const day = value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : value;
        return isISOCalendarDate(day) && (from === undefined || day >= from) && (to === undefined || day <= to);
      };
    }
    const values = new Set(filter.values);
    return values.size === 0 ? () => true : (value) => values.has((value == null ? null : value) as ColumnFilterOptionValue);
  }
  const text = filter == null ? "" : String(filter).toLowerCase();
  return (value) => !text || String(value ?? "").toLowerCase().includes(text);
}
