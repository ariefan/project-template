import * as React from "react";
import { toast } from "sonner";
import type { ColumnDef } from "./types";

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = "csv" | "excel" | "pdf" | "clipboard";

export interface ExportOptions {
  /** Filename for the export (without extension) */
  filename?: string;
  /** Include only selected rows (default: false) */
  selectedOnly?: boolean;
  /** Include hidden columns (default: false) */
  includeHidden?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract a value from a row using a column definition
 */
function getColumnValue<T>(row: T, column: ColumnDef<T>): string {
  let value: unknown;

  if (column.accessorFn) {
    value = column.accessorFn(row);
  } else if (column.accessorKey) {
    value = (row as Record<string, unknown>)[column.accessorKey as string];
  } else {
    value = null;
  }

  // Convert to string for export
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert data to CSV format
 */
function convertToCSV<T>(
  data: T[],
  columns: ColumnDef<T>[],
  options: ExportOptions = {}
): string {
  const { includeHidden = false } = options;

  // Filter visible columns
  const visibleColumns = columns.filter((col) => includeHidden || !col.hidden);

  // Create header row
  const headers = visibleColumns.map((col) => escapeCsvValue(col.header));
  const csvRows = [headers.join(",")];

  // Create data rows
  for (const row of data) {
    const values = visibleColumns.map((col) => {
      const value = getColumnValue(row, col);
      return escapeCsvValue(value);
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Download text content as a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// ============================================================================
// Hook: useDataExport
// ============================================================================

interface UseDataExportProps<T> {
  /** All data rows */
  data: T[];
  /** Selected rows */
  selectedRows: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Default filename prefix */
  defaultFilename?: string;
}

export function useDataExport<T>({
  data,
  selectedRows,
  columns,
  defaultFilename = "export",
}: UseDataExportProps<T>) {
  const exportData = React.useCallback(
    async (format: ExportFormat, options: ExportOptions = {}) => {
      const {
        filename = defaultFilename,
        selectedOnly = false,
        includeHidden = false,
      } = options;

      // Determine which data to export
      const exportRows = selectedOnly ? selectedRows : data;

      if (exportRows.length === 0) {
        toast.error("No data to export");
        return;
      }

      try {
        switch (format) {
          case "csv": {
            const csv = convertToCSV(exportRows, columns, { includeHidden });
            downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
            toast.success(`Exported ${exportRows.length} rows to CSV`);
            break;
          }

          case "clipboard": {
            const csv = convertToCSV(exportRows, columns, { includeHidden });
            await copyToClipboard(csv);
            toast.success(`Copied ${exportRows.length} rows to clipboard`);
            break;
          }

          case "excel": {
            toast.error(
              "Excel export requires the 'xlsx' library. Please install it first."
            );
            break;
          }

          case "pdf": {
            toast.error(
              "PDF export requires the 'jspdf' library. Please install it first."
            );
            break;
          }

          default: {
            toast.error(`Unsupported export format: ${format}`);
          }
        }
      } catch (error) {
        console.error("Export failed:", error);
        toast.error(
          `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    [data, selectedRows, columns, defaultFilename]
  );

  const exportCSV = React.useCallback(
    (options?: ExportOptions) => exportData("csv", options),
    [exportData]
  );

  const exportToClipboard = React.useCallback(
    (options?: ExportOptions) => exportData("clipboard", options),
    [exportData]
  );

  const exportExcel = React.useCallback(
    (options?: ExportOptions) => exportData("excel", options),
    [exportData]
  );

  const exportPDF = React.useCallback(
    (options?: ExportOptions) => exportData("pdf", options),
    [exportData]
  );

  return {
    exportData,
    exportCSV,
    exportToClipboard,
    exportExcel,
    exportPDF,
  };
}
