/**
 * CSV Streaming Export
 *
 * Memory-efficient CSV export for large datasets
 */

import { stringify } from "csv-stringify";
import { formatValue, getAccessor } from "../exporters/utils";
import type { ColumnConfig, CsvOptions, StreamOptions } from "../types";

export interface CsvStreamOptions extends CsvOptions, StreamOptions {}

export class CsvStream<T = unknown> {
  /**
   * Create a readable stream of CSV data
   */
  async *stream(
    dataSource: AsyncIterable<T[]>,
    columns: ColumnConfig[],
    options?: CsvStreamOptions
  ): AsyncGenerator<string, void, unknown> {
    const delimiter = options?.delimiter ?? ",";
    const includeHeaders = options?.includeHeaders ?? true;

    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Yield header row
    if (includeHeaders) {
      const headers = visibleColumns.map((col) => col.header);
      yield this.formatRow(headers, delimiter);
    }

    // Process chunks
    let processed = 0;
    for await (const chunk of dataSource) {
      for (const row of chunk) {
        const values = visibleColumns.map((col) => {
          const accessor = getAccessor<T>(col);
          const rawValue = accessor(row);
          return formatValue(rawValue, col);
        });

        yield this.formatRow(values, delimiter);
        processed++;
      }

      // Report progress
      options?.onProgress?.(processed);
    }
  }

  /**
   * Create a Node.js ReadableStream
   */
  createReadableStream(
    dataSource: AsyncIterable<T[]>,
    columns: ColumnConfig[],
    options?: CsvStreamOptions
  ): ReadableStream<Uint8Array> {
    const generator = this.stream(dataSource, columns, options);
    const encoder = new TextEncoder();

    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await generator.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(encoder.encode(value));
        }
      },
    });
  }

  /**
   * Export to buffer (collects all chunks)
   */
  async toBuffer(
    dataSource: AsyncIterable<T[]>,
    columns: ColumnConfig[],
    options?: CsvStreamOptions
  ): Promise<Buffer> {
    const chunks: string[] = [];

    for await (const chunk of this.stream(dataSource, columns, options)) {
      chunks.push(chunk);
    }

    return Buffer.from(chunks.join(""), "utf-8");
  }

  /**
   * Format a single row as CSV
   */
  private formatRow(values: string[], delimiter: string): string {
    const escapedValues = values.map((value) => {
      // Escape quotes and wrap in quotes if needed
      if (
        value.includes(delimiter) ||
        value.includes('"') ||
        value.includes("\n") ||
        value.includes("\r")
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });

    return `${escapedValues.join(delimiter)}\n`;
  }
}

/**
 * Create a CSV stream exporter
 */
export function createCsvStream<T = unknown>(): CsvStream<T> {
  return new CsvStream<T>();
}

/**
 * Stream CSV data using csv-stringify library
 */
export function createCsvStringifier(
  columns: ColumnConfig[],
  options?: CsvOptions
): ReturnType<typeof stringify> {
  const visibleColumns = columns.filter((col) => !col.hidden);

  return stringify({
    delimiter: options?.delimiter ?? ",",
    header: options?.includeHeaders ?? true,
    columns: visibleColumns.map((col) => ({
      key: col.id,
      header: col.header,
    })),
    quoted: true,
    quoted_empty: true,
  });
}
