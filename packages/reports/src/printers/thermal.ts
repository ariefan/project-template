/**
 * Thermal Printer
 *
 * Generates ESC/POS commands for thermal receipt printers
 * Supports 58mm and 80mm paper widths
 */

import { formatValue, getAccessor } from "../exporters/utils";
import type {
  ColumnConfig,
  Printer,
  PrintResult,
  ReportFormat,
  ThermalOptions,
} from "../types";
import { ESC_POS } from "./commands";

export class ThermalPrinter<T = unknown> implements Printer<T> {
  readonly format: ReportFormat = "thermal";

  print(
    data: T[],
    columns: ColumnConfig[],
    options?: ThermalOptions
  ): PrintResult {
    const printerWidth = options?.printerWidth ?? 80;
    const encoding = options?.encoding ?? "utf-8";
    const autoCut = options?.autoCut ?? true;

    const charsPerLine =
      printerWidth === 58
        ? ESC_POS.CHARS_PER_LINE_58MM
        : ESC_POS.CHARS_PER_LINE_80MM;

    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Build output
    const parts: string[] = [];

    // Initialize printer
    parts.push(ESC_POS.INIT);

    // Calculate column widths (distribute evenly)
    const colWidths = this.calculateColumnWidths(visibleColumns, charsPerLine);

    // Header separator
    parts.push(this.makeSeparator("=", charsPerLine));
    parts.push(ESC_POS.FEED_LINE);

    // Header row (bold, centered)
    parts.push(ESC_POS.BOLD_ON);
    parts.push(ESC_POS.ALIGN_CENTER);
    parts.push("REPORT");
    parts.push(ESC_POS.FEED_LINE);
    parts.push(new Date().toLocaleString());
    parts.push(ESC_POS.FEED_LINE);
    parts.push(ESC_POS.ALIGN_LEFT);
    parts.push(ESC_POS.BOLD_OFF);

    parts.push(this.makeSeparator("=", charsPerLine));
    parts.push(ESC_POS.FEED_LINE);

    // Column headers
    parts.push(ESC_POS.BOLD_ON);
    const headerRow = this.makeTableRow(
      visibleColumns.map((c) => c.header),
      colWidths
    );
    parts.push(headerRow);
    parts.push(ESC_POS.FEED_LINE);
    parts.push(ESC_POS.BOLD_OFF);

    parts.push(this.makeSeparator("-", charsPerLine));
    parts.push(ESC_POS.FEED_LINE);

    // Data rows
    for (const row of data) {
      const values = visibleColumns.map((col) => {
        const accessor = getAccessor<T>(col);
        const rawValue = accessor(row);
        return formatValue(rawValue, col);
      });

      const dataRow = this.makeTableRow(values, colWidths);
      parts.push(dataRow);
      parts.push(ESC_POS.FEED_LINE);
    }

    // Footer
    parts.push(this.makeSeparator("=", charsPerLine));
    parts.push(ESC_POS.FEED_LINE);

    // Row count
    parts.push(ESC_POS.ALIGN_RIGHT);
    parts.push(`Total: ${data.length} rows`);
    parts.push(ESC_POS.FEED_LINE);
    parts.push(ESC_POS.ALIGN_LEFT);

    parts.push(this.makeSeparator("=", charsPerLine));
    parts.push(ESC_POS.FEED_LINE);

    // Feed extra lines and cut
    parts.push(ESC_POS.FEED_LINES(3));
    if (autoCut) {
      parts.push(ESC_POS.CUT_PARTIAL);
    }

    const content = parts.join("");
    const buffer = Buffer.from(content, encoding as BufferEncoding);

    return {
      success: true,
      buffer,
      encoding,
      printerWidth: charsPerLine,
    };
  }

  /**
   * Calculate column widths to fit printer width
   */
  private calculateColumnWidths(
    columns: ColumnConfig[],
    maxWidth: number
  ): number[] {
    const numColumns = columns.length;
    const separatorChars = numColumns + 1; // space between columns
    const availableWidth = maxWidth - separatorChars;

    // Calculate based on header length or specified width
    const weights = columns.map((col) => {
      if (col.width) {
        return col.width;
      }
      return Math.max(col.header.length, 8);
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Distribute width proportionally
    const widths = weights.map((w) =>
      Math.max(4, Math.floor((w / totalWeight) * availableWidth))
    );

    // Adjust for rounding errors
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const diff = availableWidth - totalWidth;
    if (diff > 0 && widths.length > 0) {
      const lastIdx = widths.length - 1;
      widths[lastIdx] = (widths[lastIdx] ?? 0) + diff;
    }

    return widths;
  }

  /**
   * Make a table row with proper column alignment
   */
  private makeTableRow(values: string[], widths: number[]): string {
    const cells = values.map((value, i) => {
      const width = widths[i] ?? 10;
      if (value.length > width) {
        return `${value.substring(0, width - 1)}…`;
      }
      return value.padEnd(width);
    });
    return cells.join(" ");
  }

  /**
   * Make a separator line
   */
  private makeSeparator(char: string, length: number): string {
    return char.repeat(length);
  }
}
