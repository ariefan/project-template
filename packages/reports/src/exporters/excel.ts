/**
 * Excel Exporter
 *
 * Exports data to Excel format with:
 * - Multiple sheet support
 * - Auto-filter
 * - Frozen headers
 * - Column widths
 * - Cell formatting
 */

import ExcelJS from "exceljs";
import type {
  ColumnConfig,
  ExcelOptions,
  Exporter,
  ExportResult,
  ReportFormat,
} from "../types";
import { formatValue, getAccessor } from "./utils";

export class ExcelExporter<T = unknown> implements Exporter<T> {
  readonly format: ReportFormat = "excel";
  readonly mimeType =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  readonly extension = ".xlsx";

  async export(
    data: T[],
    columns: ColumnConfig[],
    options?: ExcelOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const sheetName = options?.sheetName ?? "Sheet1";
    const autoFilter = options?.autoFilter ?? true;
    const freezeHeader = options?.freezeHeader ?? true;

    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Report System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    // Configure columns
    worksheet.columns = visibleColumns.map((col) => ({
      header: col.header,
      key: col.id,
      width: col.width ? col.width / 7 : 15, // Convert pixels to Excel units
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    for (const row of data) {
      const rowData: Record<string, string> = {};
      for (const col of visibleColumns) {
        const accessor = getAccessor<T>(col);
        const rawValue = accessor(row);
        rowData[col.id] = formatValue(rawValue, col);
      }
      worksheet.addRow(rowData);
    }

    // Apply auto-filter
    if (autoFilter && data.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.length + 1, column: visibleColumns.length },
      };
    }

    // Freeze header row
    if (freezeHeader) {
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
    }

    // Apply column alignment
    for (let i = 0; i < visibleColumns.length; i++) {
      const col = visibleColumns[i];
      if (col?.align) {
        worksheet.getColumn(i + 1).alignment = { horizontal: col.align };
      }
    }

    // Generate buffer
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

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
