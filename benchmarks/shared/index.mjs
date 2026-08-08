export const BENCHMARK_GENERATOR_VERSION = 1;
export const BENCHMARK_DEFAULT_SEED = 0x4f50454e;

export const BENCHMARK_PROFILES = Object.freeze([
  profile("small-interactive", "Small interactive", 1_000, 20, "Editing and interaction latency"),
  profile("standard-client", "Standard client", 10_000, 20, "Initial render, sort, and filter"),
  profile("wide-client", "Wide client", 10_000, 100, "Horizontal virtualization and memory"),
  profile("large-client", "Large client", 50_000, 50, "Sustained scroll and row-model work"),
  profile("stress-client", "Stress client", 100_000, 20, "Client-side scaling boundary"),
  profile("massive-virtual", "Massive virtual", 1_000_000, 20, "Deep virtual scrolling and browser limits"),
]);

const GROUPS = Object.freeze(["Consumer", "Enterprise", "Public", "Small business"]);
const STATUSES = Object.freeze(["Backlog", "In progress", "Blocked", "Complete"]);
const OWNERS = Object.freeze(["Avery", "Jordan", "Morgan", "Riley", "Taylor", "Casey"]);
const REGIONS = Object.freeze(["Americas", "APAC", "EMEA"]);

export function getBenchmarkProfile(id) {
  const found = BENCHMARK_PROFILES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new RangeError(`Unknown benchmark profile: ${String(id)}`);
  }
  return found;
}

export function createBenchmarkColumns(columnCount) {
  assertCount("columnCount", columnCount);
  return Array.from({ length: columnCount }, (_, columnIndex) =>
    Object.freeze({
      id: `column_${columnIndex}`,
      label: columnLabel(columnIndex),
      kind: columnKind(columnIndex),
      sortable: true,
      filterable: true,
      groupable: columnIndex >= 1 && columnIndex <= 4,
    }),
  );
}

export function createBenchmarkRow(rowIndex, columnCount, seed = BENCHMARK_DEFAULT_SEED) {
  assertIndex("rowIndex", rowIndex);
  assertCount("columnCount", columnCount);
  assertSeed(seed);

  const row = { id: `row_${rowIndex}` };
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    row[`column_${columnIndex}`] = cellValue(rowIndex, columnIndex, seed);
  }
  return row;
}

export function createBenchmarkDataset({ rowCount, columnCount, seed = BENCHMARK_DEFAULT_SEED }) {
  assertCount("rowCount", rowCount);
  assertCount("columnCount", columnCount);
  assertSeed(seed);

  return {
    generatorVersion: BENCHMARK_GENERATOR_VERSION,
    seed,
    rowCount,
    columnCount,
    columns: createBenchmarkColumns(columnCount),
    rows: Array.from({ length: rowCount }, (_, rowIndex) => createBenchmarkRow(rowIndex, columnCount, seed)),
  };
}

export function createBenchmarkAllRowSelection(rowCount) {
  assertCount("rowCount", rowCount);
  const selection = {};
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    selection[`row_${rowIndex}`] = true;
  }
  return selection;
}

export function fingerprintBenchmarkDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.columns) || !Array.isArray(dataset.rows)) {
    throw new TypeError("dataset must be created by createBenchmarkDataset");
  }

  let hash = 0x811c9dc5;
  hash = hashText(hash, `v${dataset.generatorVersion}|s${dataset.seed}|r${dataset.rowCount}|c${dataset.columnCount}`);
  for (const column of dataset.columns) {
    hash = hashText(hash, `|${column.id}:${column.kind}`);
  }
  for (const row of dataset.rows) {
    hash = hashText(hash, `|${row.id}`);
    for (const column of dataset.columns) {
      hash = hashText(hash, `:${String(row[column.id])}`);
    }
  }
  return hash.toString(16).padStart(8, "0");
}

function profile(id, label, rowCount, columnCount, purpose) {
  return Object.freeze({ id, label, rowCount, columnCount, purpose });
}

function columnLabel(columnIndex) {
  const labels = ["ID", "Group", "Status", "Owner", "Region", "Amount", "Quantity", "Progress", "Created"];
  return labels[columnIndex] ?? `Metric ${columnIndex - labels.length + 1}`;
}

function columnKind(columnIndex) {
  if (columnIndex === 0) return "id";
  if (columnIndex >= 1 && columnIndex <= 4) return "category";
  if (columnIndex === 8) return "date";
  return "number";
}

function cellValue(rowIndex, columnIndex, seed) {
  const value = mix32(seed ^ Math.imul(rowIndex + 1, 0x9e3779b1) ^ Math.imul(columnIndex + 1, 0x85ebca77));
  switch (columnIndex) {
    case 0:
      return `ITEM-${String(rowIndex + 1).padStart(7, "0")}`;
    case 1:
      return GROUPS[value % GROUPS.length];
    case 2:
      return STATUSES[value % STATUSES.length];
    case 3:
      return OWNERS[value % OWNERS.length];
    case 4:
      return REGIONS[value % REGIONS.length];
    case 5:
      return (value % 10_000_000) / 100;
    case 6:
      return value % 10_000;
    case 7:
      return value % 101;
    case 8:
      return new Date(Date.UTC(2020, 0, 1) + (value % 2_557) * 86_400_000).toISOString().slice(0, 10);
    default:
      return value % 1_000_000;
  }
}

function mix32(value) {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function hashText(hash, text) {
  let next = hash;
  for (let index = 0; index < text.length; index += 1) {
    next ^= text.charCodeAt(index);
    next = Math.imul(next, 0x01000193);
  }
  return next >>> 0;
}

function assertCount(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function assertIndex(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

function assertSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("seed must be an unsigned 32-bit integer");
  }
}
