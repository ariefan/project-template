/**
 * CSV Exporter
 *
 * Exports data to CSV format with:
 * - Custom delimiter support
 * - Header row options
 * - Proper escaping (quotes, newlines)
 * - Column formatting
 */

import { stringify } from "csv-stringify/sync";
import type {
  ColumnConfig,
  CsvOptions,
  Exporter,
  ExportResult,
  ReportFormat,
} from "../types";
import { formatValue, getAccessor } from "./utils";

export class CsvExporter<T = unknown> implements Exporter<T> {
  readonly format: ReportFormat = "csv";
  readonly mimeType = "text/csv";
  readonly extension = ".csv";

  export(
    data: T[],
    columns: ColumnConfig[],
    options?: CsvOptions
  ): ExportResult {
    const startTime = Date.now();
    const delimiter = options?.delimiter ?? ",";
    const includeHeaders = options?.includeHeaders ?? true;

    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Build header row
    const headers = visibleColumns.map((col) => col.header);

    // Build data rows
    const rows = data.map((row) => {
      return visibleColumns.map((col) => {
        const accessor = getAccessor<T>(col);
        const rawValue = accessor(row);
        return formatValue(rawValue, col);
      });
    });

    // Generate CSV
    const records = includeHeaders ? [headers, ...rows] : rows;
    const csvContent = stringify(records, {
      delimiter,
      quoted: true,
      quoted_empty: true,
    });

    const buffer = Buffer.from(csvContent, "utf-8");

    return {
      success: true,
      buffer,
      mimeType: this.mimeType,
      filename: `export-${Date.now()}${this.extension}`,
      size: buffer.length,
      rowCount: data.length,
      duration: Date.now() - startTime,
    };
  }
}
