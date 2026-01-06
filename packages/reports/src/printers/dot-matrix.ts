/**
 * Dot Matrix Printer
 *
 * Generates plain text output with box drawing characters
 * for dot matrix and impact printers
 */

import { formatValue, getAccessor } from "../exporters/utils";
import type {
  ColumnConfig,
  DotMatrixOptions,
  Printer,
  PrintResult,
  ReportFormat,
} from "../types";
import { BOX_CHARS } from "./commands";

export class DotMatrixPrinter<T = unknown> implements Printer<T> {
  readonly format: ReportFormat = "dotmatrix";

  print(
    data: T[],
    columns: ColumnConfig[],
    options?: DotMatrixOptions
  ): PrintResult {
    const lineWidth = options?.lineWidth ?? 80;
    const condensedMode = options?.condensedMode ?? false;
    const formFeed = options?.formFeed ?? false;

    // Use ASCII box characters for compatibility
    const H = BOX_CHARS.ASCII_HORIZONTAL;
    const V = BOX_CHARS.ASCII_VERTICAL;
    const C = BOX_CHARS.ASCII_CORNER;

    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Calculate column widths
    const colWidths = this.calculateColumnWidths(visibleColumns, lineWidth);
    const totalWidth =
      colWidths.reduce((a, b) => a + b, 0) + colWidths.length + 1;

    // Build output
    const lines: string[] = [];

    // Top border
    lines.push(this.makeHorizontalBorder(colWidths, C, H, C, C));

    // Title
    lines.push(this.makeCenteredLine("REPORT", totalWidth, V));
    lines.push(
      this.makeCenteredLine(new Date().toLocaleString(), totalWidth, V)
    );

    // Separator after title
    lines.push(this.makeHorizontalBorder(colWidths, C, H, C, C));

    // Header row
    lines.push(
      this.makeDataRow(
        visibleColumns.map((c) => c.header),
        colWidths,
        V
      )
    );

    // Separator after header
    lines.push(this.makeHorizontalBorder(colWidths, C, H, C, C));

    // Data rows
    for (const row of data) {
      const values = visibleColumns.map((col) => {
        const accessor = getAccessor<T>(col);
        const rawValue = accessor(row);
        return formatValue(rawValue, col);
      });

      lines.push(this.makeDataRow(values, colWidths, V));
    }

    // Bottom border
    lines.push(this.makeHorizontalBorder(colWidths, C, H, C, C));

    // Summary
    lines.push("");
    lines.push(`Total rows: ${data.length}`);
    lines.push(`Generated: ${new Date().toISOString()}`);

    // Add form feed if requested
    if (formFeed) {
      lines.push("\f"); // Form feed character
    }

    // Join with appropriate line ending
    const content = lines.join("\r\n"); // CRLF for printer compatibility
    const encoding = condensedMode ? "ascii" : "utf-8";
    const buffer = Buffer.from(content, encoding);

    return {
      success: true,
      buffer,
      encoding,
      printerWidth: lineWidth,
    };
  }

  /**
   * Calculate column widths to fit line width
   */
  private calculateColumnWidths(
    columns: ColumnConfig[],
    maxWidth: number
  ): number[] {
    const numColumns = columns.length;
    const borderChars = numColumns + 1; // vertical bars
    const availableWidth = maxWidth - borderChars;

    // Calculate based on header length or specified width
    const weights = columns.map((col) => {
      if (col.width) {
        return col.width;
      }
      return Math.max(col.header.length, 10);
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Distribute width proportionally
    const widths = weights.map((w) =>
      Math.max(6, Math.floor((w / totalWeight) * availableWidth))
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
   * Make a horizontal border line
   */
  private makeHorizontalBorder(
    widths: number[],
    left: string,
    fill: string,
    separator: string,
    right: string
  ): string {
    const segments = widths.map((w) => fill.repeat(w));
    return left + segments.join(separator) + right;
  }

  /**
   * Make a data row with vertical separators
   */
  private makeDataRow(
    values: string[],
    widths: number[],
    separator: string
  ): string {
    const cells = values.map((value, i) => {
      const width = widths[i] ?? 10;
      if (value.length > width) {
        return `${value.substring(0, width - 1)}…`;
      }
      return value.padEnd(width);
    });
    return separator + cells.join(separator) + separator;
  }

  /**
   * Make a centered line within borders
   */
  private makeCenteredLine(
    text: string,
    width: number,
    border: string
  ): string {
    const innerWidth = width - 2;
    const padding = Math.max(0, innerWidth - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return border + " ".repeat(leftPad) + text + " ".repeat(rightPad) + border;
  }
}
