"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Check,
  ClipboardCopy,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import { type ExportOptions, useDataExport } from "./use-data-export";

// ============================================================================
// Export Button
// ============================================================================

export interface DataViewExportProps {
  /** Custom class name */
  className?: string;
  /** Show selected only option (default: true) */
  showSelectedOnly?: boolean;
  /** Default export options */
  defaultOptions?: ExportOptions;
  /** Enable specific export formats */
  formats?: {
    csv?: boolean;
    excel?: boolean;
    pdf?: boolean;
    clipboard?: boolean;
  };
}

export function DataViewExport({
  className,
  showSelectedOnly = true,
  defaultOptions,
  formats = {
    csv: true,
    excel: true,
    pdf: true,
    clipboard: true,
  },
}: DataViewExportProps) {
  const { processedData, selectedRows, config } = useDataView();
  const { exportCSV, exportToClipboard, exportExcel, exportPDF } =
    useDataExport({
      data: processedData,
      selectedRows,
      columns: config.columns,
      defaultFilename: config.id ?? "data",
    });

  const hasSelection = selectedRows.length > 0;
  const [selectedOnly, setSelectedOnly] = React.useState(false);

  const handleExport = React.useCallback(
    (exportFn: (options?: ExportOptions) => void | Promise<void>) => {
      const options: ExportOptions = {
        ...defaultOptions,
        selectedOnly: showSelectedOnly && selectedOnly,
      };

      exportFn(options);
    },
    [defaultOptions, showSelectedOnly, selectedOnly]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className} size="sm" variant="outline">
          <Download className="size-4" />
          <span className="hidden md:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {formats.excel && (
          <DropdownMenuItem onClick={() => handleExport(exportExcel)}>
            <FileSpreadsheet className="mr-2 size-4" />
            Excel
          </DropdownMenuItem>
        )}

        {formats.pdf && (
          <DropdownMenuItem onClick={() => handleExport(exportPDF)}>
            <FileText className="mr-2 size-4" />
            PDF
          </DropdownMenuItem>
        )}

        {formats.csv && (
          <DropdownMenuItem onClick={() => handleExport(exportCSV)}>
            <FileText className="mr-2 size-4" />
            CSV
          </DropdownMenuItem>
        )}

        {formats.clipboard && (
          <>
            {(formats.csv || formats.excel || formats.pdf) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem onClick={() => handleExport(exportToClipboard)}>
              <ClipboardCopy className="mr-2 size-4" />
              Clipboard
            </DropdownMenuItem>
          </>
        )}

        {showSelectedOnly && hasSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedOnly(!selectedOnly)}>
              <div className="flex w-full items-center justify-between">
                <span className="text-sm">
                  Selected only ({selectedRows.length})
                </span>
                <div
                  className={`flex size-4 items-center justify-center rounded border ${selectedOnly ? "border-primary bg-primary" : "border-muted-foreground"}`}
                >
                  {selectedOnly && (
                    <Check className="size-3 text-primary-foreground" />
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
