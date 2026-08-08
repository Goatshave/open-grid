import type { ExportFile, ExportFileOptions } from "./types";

const DEFAULT_EXPORT_BASENAME = "open-grid-export";
const UTF_8_BOM = "\uFEFF";

export function getExportFileExtension(options: Pick<ExportFileOptions, "delimiter" | "extension" | "format"> = {}): string {
  if (options.extension) {
    return normalizeExtension(options.extension);
  }

  if (options.format === "csv" || options.delimiter === ",") {
    return "csv";
  }

  if (options.format === "tsv" || options.delimiter === "\t" || options.delimiter === undefined) {
    return "tsv";
  }

  return "txt";
}

export function getExportMimeType(options: Pick<ExportFileOptions, "delimiter" | "format" | "mimeType"> = {}): string {
  if (options.mimeType) {
    return options.mimeType;
  }

  if (options.format === "csv" || options.delimiter === ",") {
    return "text/csv;charset=utf-8";
  }

  if (options.format === "tsv" || options.delimiter === "\t" || options.delimiter === undefined) {
    return "text/tab-separated-values;charset=utf-8";
  }

  return "text/plain;charset=utf-8";
}

export function createExportFile(text: string, options: ExportFileOptions = {}): ExportFile {
  const extension = getExportFileExtension(options);
  const mimeType = getExportMimeType(options);
  const filename = getExportFilename(options.filename, extension);

  return {
    filename,
    extension,
    mimeType,
    text: options.includeByteOrderMark ? `${UTF_8_BOM}${text}` : text,
  };
}

function getExportFilename(filename: string | undefined, extension: string): string {
  const basename = sanitizeFilename(filename ?? DEFAULT_EXPORT_BASENAME);

  return basename.toLowerCase().endsWith(`.${extension}`) ? basename : `${basename}.${extension}`;
}

function normalizeExtension(extension: string): string {
  const normalized = extension
    .trim()
    .replace(/^\.+/, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

  return normalized.length > 0 ? normalized : "txt";
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-")
    .replace(/\.+$/g, "")
    .trim();

  return sanitized.length > 0 ? sanitized : DEFAULT_EXPORT_BASENAME;
}
