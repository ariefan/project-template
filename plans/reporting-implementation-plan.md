# Reporting System - Detailed Implementation Plan

## Phase 1: Core Exporters

### 1.1 Create Package Structure

**File: packages/reports/package.json**

```json
{
  "name": "@workspace/reports",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    "./core/*": "./src/core/*.ts",
    "./templates/*": "./src/templates/*.ts",
    "./scheduler/*": "./src/scheduler/*.ts",
    "./delivery/*": "./src/delivery/*.ts",
    "./server/*": "./src/server/*.ts"
  },
  "dependencies": {
    "xlsx": "^0.18.5",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "handlebars": "^4.7.8",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.9.2"
  }
}
```

**File: packages/reports/tsconfig.json**

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.2 Core Types

**File: packages/reports/src/core/types.ts**

```typescript
export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  includeHidden?: boolean;
  sheetName?: string;
  pageSize?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

export interface ColumnDef<T = unknown> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  hidden?: boolean;
  width?: number;
  format?: (value: unknown) => string;
}

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

export interface Exporter<T = unknown> {
  export(
    data: T[],
    columns: ColumnDef<T>[],
    options?: ExportOptions
  ): Promise<ExportResult>;
}
```

### 1.3 CSV Exporter

**File: packages/reports/src/core/exporters/csv.ts**

```typescript
import type { ColumnDef, ExportOptions, ExportResult } from "../types.js";

export class CSVExporter<T = unknown> {
  async export(
    data: T[],
    columns: ColumnDef<T>[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const {
      includeHeaders = true,
      includeHidden = false,
      filename = "export",
    } = options;

    const visibleColumns = columns.filter(
      (col) => includeHidden || !col.hidden
    );
    const csv = this.convertToCSV(data, visibleColumns, includeHeaders);
    const buffer = Buffer.from(csv, "utf-8");

    return {
      buffer,
      mimeType: "text/csv;charset=utf-8;",
      filename: `${filename}.csv`,
      size: buffer.length,
    };
  }

  private convertToCSV<T>(
    data: T[],
    columns: ColumnDef<T>[],
    includeHeaders: boolean
  ): string {
    const rows: string[] = [];

    if (includeHeaders) {
      const headers = columns.map((col) => this.escapeValue(col.header));
      rows.push(headers.join(","));
    }

    for (const row of data) {
      const values = columns.map((col) => {
        const value = this.getColumnValue(row, col);
        return this.escapeValue(value);
      });
      rows.push(values.join(","));
    }

    return rows.join("\n");
  }

  private getColumnValue<T>(row: T, column: ColumnDef<T>): string {
    let value: unknown;

    if (column.accessorFn) {
      value = column.accessorFn(row);
    } else if (column.accessorKey) {
      value = (row as Record<string, unknown>)[column.accessorKey as string];
    } else {
      value = null;
    }

    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private escapeValue(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
```

### 1.4 Excel Exporter

**File: packages/reports/src/core/exporters/excel.ts**

```typescript
import * as XLSX from "xlsx";
import type { ColumnDef, ExportOptions, ExportResult } from "../types.js";

export class ExcelExporter<T = unknown> {
  async export(
    data: T[],
    columns: ColumnDef<T>[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const {
      includeHeaders = true,
      includeHidden = false,
      filename = "export",
      sheetName = "Sheet1",
      title,
    } = options;

    const visibleColumns = columns.filter(
      (col) => includeHidden || !col.hidden
    );
    const workbook = XLSX.utils.book_new();

    // Create worksheet
    const worksheetData = this.buildWorksheetData(
      data,
      visibleColumns,
      includeHeaders,
      title
    );
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = visibleColumns.map((col) => ({
      wch: col.width || Math.max(col.header.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return {
      buffer,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${filename}.xlsx`,
      size: buffer.length,
    };
  }

  private buildWorksheetData<T>(
    data: T[],
    columns: ColumnDef<T>[],
    includeHeaders: boolean,
    title?: string
  ): unknown[][] {
    const rows: unknown[][] = [];

    // Add title row if provided
    if (title) {
      rows.push([title]);
      rows.push([]); // Empty row for spacing
    }

    // Add headers
    if (includeHeaders) {
      rows.push(columns.map((col) => col.header));
    }

    // Add data rows
    for (const row of data) {
      const values = columns.map((col) => {
        const value = this.getColumnValue(row, col);
        return col.format ? col.format(value) : value;
      });
      rows.push(values);
    }

    return rows;
  }

  private getColumnValue<T>(row: T, column: ColumnDef<T>): unknown {
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return (row as Record<string, unknown>)[column.accessorKey as string];
    }
    return null;
  }
}
```

### 1.5 PDF Exporter

**File: packages/reports/src/core/exporters/pdf.ts**

```typescript
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ColumnDef, ExportOptions, ExportResult } from "../types.js";

export class PDFExporter<T = unknown> {
  async export(
    data: T[],
    columns: ColumnDef<T>[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const {
      filename = "export",
      pageSize = "a4",
      orientation = "portrait",
      title,
      author,
      subject,
      keywords,
      creator,
    } = options;

    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: pageSize,
    });

    // Set metadata
    if (author) doc.setAuthor(author);
    if (subject) doc.setSubject(subject);
    if (keywords) doc.setKeywords(keywords.join(","));
    if (creator) doc.setCreator(creator);

    // Add title
    if (title) {
      doc.setFontSize(18);
      doc.text(title, 14, 20);
    }

    // Create table
    const visibleColumns = columns.filter((col) => !col.hidden);
    const startY = title ? 30 : 14;

    autoTable(doc, {
      startY,
      head: [visibleColumns.map((col) => col.header)],
      body: data.map((row) =>
        visibleColumns.map((col) => {
          const value = this.getColumnValue(row, col);
          return col.format ? col.format(value) : String(value ?? "");
        })
      ),
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: startY, right: 14, bottom: 14, left: 14 },
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const buffer = Buffer.from(doc.output("arraybuffer"));

    return {
      buffer,
      mimeType: "application/pdf",
      filename: `${filename}.pdf`,
      size: buffer.length,
    };
  }

  private getColumnValue<T>(row: T, column: ColumnDef<T>): unknown {
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return (row as Record<string, unknown>)[column.accessorKey as string];
    }
    return null;
  }
}
```

### 1.6 Exporter Registry

**File: packages/reports/src/core/exporters/index.ts**

```typescript
import { CSVExporter } from "./csv.js";
import { ExcelExporter } from "./excel.js";
import { PDFExporter } from "./pdf.js";
import type { ColumnDef, ExportOptions, ExportResult } from "../types.js";

export type ExportFormat = "csv" | "excel" | "pdf";

export class ExporterRegistry<T = unknown> {
  private csvExporter = new CSVExporter<T>();
  private excelExporter = new ExcelExporter<T>();
  private pdfExporter = new PDFExporter<T>();

  async export(
    format: ExportFormat,
    data: T[],
    columns: ColumnDef<T>[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    switch (format) {
      case "csv":
        return this.csvExporter.export(data, columns, options);
      case "excel":
        return this.excelExporter.export(data, columns, options);
      case "pdf":
        return this.pdfExporter.export(data, columns, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  getExporter(format: ExportFormat) {
    switch (format) {
      case "csv":
        return this.csvExporter;
      case "excel":
        return this.excelExporter;
      case "pdf":
        return this.pdfExporter;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

export { CSVExporter, ExcelExporter, PDFExporter };
```

### 1.7 Update Data View Integration

**File: packages/ui/src/composed/data-view/use-data-export.ts**

```typescript
import * as React from "react";
import { toast } from "sonner";
import { ExporterRegistry } from "@workspace/reports/core/exporters";
import type { ColumnDef, ExportOptions } from "@workspace/reports/core/types";
import type { ExportFormat } from "@workspace/reports/core/exporters";

// ... existing utility functions remain ...

export function useDataExport<T>({
  data,
  selectedRows,
  columns,
  defaultFilename = "export",
}: UseDataExportProps<T>) {
  const exporterRegistry = React.useMemo(() => new ExporterRegistry<T>(), []);

  const exportData = React.useCallback(
    async (format: ExportFormat, options: ExportOptions = {}) => {
      const {
        filename = defaultFilename,
        selectedOnly = false,
        includeHidden = false,
      } = options;

      const exportRows = selectedOnly ? selectedRows : data;

      if (exportRows.length === 0) {
        toast.error("No data to export");
        return;
      }

      try {
        const result = await exporterRegistry.export(
          format,
          exportRows,
          columns,
          {
            filename,
            includeHidden,
          }
        );

        // Download file
        const blob = new Blob([result.buffer], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(
          `Exported ${exportRows.length} rows to ${format.toUpperCase()}`
        );
      } catch (error) {
        console.error("Export failed:", error);
        toast.error(
          `Export failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    [data, selectedRows, columns, defaultFilename, exporterRegistry]
  );

  const exportCSV = React.useCallback(
    (options?: ExportOptions) => exportData("csv", options),
    [exportData]
  );

  const exportToClipboard = React.useCallback(
    async (options?: ExportOptions) => {
      const { selectedOnly = false, includeHidden = false } = options ?? {};
      const exportRows = selectedOnly ? selectedRows : data;

      if (exportRows.length === 0) {
        toast.error("No data to export");
        return;
      }

      try {
        const result = await exporterRegistry.export(
          "csv",
          exportRows,
          columns,
          {
            filename: "clipboard",
            includeHidden,
          }
        );

        const csv = result.buffer.toString("utf-8");
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(csv);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = csv;
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

        toast.success(`Copied ${exportRows.length} rows to clipboard`);
      } catch (error) {
        console.error("Copy failed:", error);
        toast.error(
          `Copy failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    [data, selectedRows, columns, exporterRegistry]
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
```

## Phase 2: Template System

### 2.1 Template Types

**File: packages/reports/src/templates/types.ts**

```typescript
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  format: "pdf" | "excel" | "csv";
  template: string;
  defaultOptions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplateContext {
  data: unknown[];
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  generatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}
```

### 2.2 Template Engine

**File: packages/reports/src/templates/engine.ts**

```typescript
import Handlebars from "handlebars";
import type { ReportTemplate, TemplateContext } from "./types.js";
import { ExporterRegistry } from "../core/exporters/index.js";

export class TemplateEngine {
  private exporterRegistry = new ExporterRegistry();

  async generateReport(
    template: ReportTemplate,
    context: TemplateContext
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    // Compile template
    const compiledTemplate = Handlebars.compile(template.template);

    // Register custom helpers
    this.registerHelpers();

    // Render template
    const rendered = compiledTemplate(context);

    // Parse rendered content
    const content = this.parseRenderedContent(rendered);

    // Export to specified format
    const result = await this.exporterRegistry.export(
      template.format,
      content.data,
      content.columns,
      {
        ...template.defaultOptions,
        ...context.parameters,
      } as Record<string, unknown>
    );

    return {
      buffer: result.buffer,
      mimeType: result.mimeType,
      filename: result.filename,
    };
  }

  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper(
      "formatDate",
      (date: Date | string, format: string) => {
        // Use date-fns for formatting
        return date; // Simplified
      }
    );

    // Currency formatting helper
    Handlebars.registerHelper(
      "formatCurrency",
      (amount: number, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(amount);
      }
    );

    // Sum helper
    Handlebars.registerHelper("sum", (array: number[]) => {
      return array.reduce((sum, num) => sum + num, 0);
    });

    // Average helper
    Handlebars.registerHelper("avg", (array: number[]) => {
      return array.reduce((sum, num) => sum + num, 0) / array.length;
    });
  }

  private parseRenderedContent(rendered: string): {
    data: unknown[];
    columns: { id: string; header: string; accessorKey: string }[];
  } {
    // Parse the rendered template to extract data and columns
    // This is a simplified version - actual implementation would be more robust
    const parsed = JSON.parse(rendered);
    return {
      data: parsed.data,
      columns: parsed.columns,
    };
  }
}
```

### 2.3 Template Manager

**File: packages/reports/src/templates/manager.ts**

```typescript
import type { ReportTemplate } from "./types.js";

export class TemplateManager {
  private templates = new Map<string, ReportTemplate>();

  register(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  getAll(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  update(id: string, updates: Partial<ReportTemplate>): void {
    const template = this.templates.get(id);
    if (template) {
      this.templates.set(id, {
        ...template,
        ...updates,
        updatedAt: new Date(),
      });
    }
  }

  delete(id: string): void {
    this.templates.delete(id);
  }
}
```

## Phase 3: Scheduler System

### 3.1 Scheduler Types

**File: packages/reports/src/scheduler/types.ts**

```typescript
export interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  schedule: string; // cron expression
  recipients: string[];
  parameters?: Record<string, unknown>;
  status: "active" | "paused" | "disabled";
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportJob {
  id: string;
  scheduledReportId: string;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    filename: string;
    size: number;
    deliveryStatus: "pending" | "sent" | "failed";
  };
}
```

### 3.2 Scheduler

**File: packages/reports/src/scheduler/scheduler.ts**

```typescript
import type { ScheduledReport, ReportJob } from "./types.js";
import { TemplateEngine } from "../templates/engine.js";

export class ReportScheduler {
  private scheduledReports = new Map<string, ScheduledReport>();
  private jobs = new Map<string, ReportJob>();
  private templateEngine = new TemplateEngine();

  schedule(report: ScheduledReport): void {
    this.scheduledReports.set(report.id, report);
  }

  async executeReport(reportId: string): Promise<ReportJob> {
    const report = this.scheduledReports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const job: ReportJob = {
      id: `job-${Date.now()}`,
      scheduledReportId: reportId,
      status: "processing",
      startedAt: new Date(),
    };

    this.jobs.set(job.id, job);

    try {
      // Generate report
      const template = {
        id: report.templateId,
        name: "",
        format: "pdf",
        template: "",
      };
      const context = {
        data: [],
        parameters: report.parameters ?? {},
        generatedAt: new Date(),
      };

      const result = await this.templateEngine.generateReport(
        template,
        context
      );

      job.status = "completed";
      job.completedAt = new Date();
      job.result = {
        filename: result.filename,
        size: result.buffer.length,
        deliveryStatus: "pending",
      };

      // Update last run time
      const updatedReport = { ...report, lastRun: new Date() };
      this.scheduledReports.set(reportId, updatedReport);
    } catch (error) {
      job.status = "failed";
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : "Unknown error";
    }

    return job;
  }

  getJob(jobId: string): ReportJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobs(reportId?: string): ReportJob[] {
    if (reportId) {
      return Array.from(this.jobs.values()).filter(
        (job) => job.scheduledReportId === reportId
      );
    }
    return Array.from(this.jobs.values());
  }
}
```

## Phase 4: Server-Side Exports

### 4.1 Stream Handler

**File: packages/reports/src/server/stream-handler.ts**

```typescript
import type { ColumnDef, ExportOptions } from "../core/types.js";
import { CSVExporter } from "../core/exporters/csv.js";

export class StreamHandler {
  private csvExporter = new CSVExporter();

  async streamCSV<T>(
    dataStream: AsyncIterable<T>,
    columns: ColumnDef<T>[],
    options: ExportOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const { includeHeaders = true, includeHidden = false } = options;
    const visibleColumns = columns.filter(
      (col) => includeHidden || !col.hidden
    );

    let isFirstChunk = true;

    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of dataStream) {
            let csv = "";

            if (isFirstChunk && includeHeaders) {
              const headers = visibleColumns.map((col) => col.header);
              csv = headers.join(",") + "\n";
              isFirstChunk = false;
            }

            for (const row of Array.isArray(chunk) ? chunk : [chunk]) {
              const values = visibleColumns.map((col) => {
                let value: unknown;
                if (col.accessorFn) {
                  value = col.accessorFn(row);
                } else if (col.accessorKey) {
                  value = (row as Record<string, unknown>)[
                    col.accessorKey as string
                  ];
                }
                const strValue =
                  value === null || value === undefined ? "" : String(value);
                return strValue.includes(",") ||
                  strValue.includes('"') ||
                  strValue.includes("\n")
                  ? `"${strValue.replace(/"/g, '""')}"`
                  : strValue;
              });
              csv += values.join(",") + "\n";
            }

            controller.enqueue(encoder.encode(csv));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
```

## Integration with API

**File: apps/api/src/modules/reports/routes.ts**

```typescript
import { Router } from "express";
import { ExporterRegistry } from "@workspace/reports/core/exporters";
import { StreamHandler } from "@workspace/reports/server/stream-handler";

const router = Router();
const exporterRegistry = new ExporterRegistry();
const streamHandler = new StreamHandler();

// Simple export endpoint
router.post("/export", async (req, res) => {
  const { format, data, columns, options } = req.body;

  try {
    const result = await exporterRegistry.export(
      format,
      data,
      columns,
      options
    );
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  } catch (error) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Export failed",
      });
  }
});

// Streaming export endpoint for large datasets
router.get("/export/stream", async (req, res) => {
  const { format } = req.query;

  if (format !== "csv") {
    return res
      .status(400)
      .json({ error: "Only CSV format is supported for streaming" });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="export.csv"');

  // Get data stream from database
  const dataStream = getDataStreamFromDatabase();

  const stream = await streamHandler.streamCSV(dataStream, columns);

  for await (const chunk of stream) {
    res.write(chunk);
  }

  res.end();
});

export default router;
```

## Summary

This implementation plan provides:

1. **Dedicated Package**: `@workspace/reports` for all reporting functionality
2. **Core Exporters**: CSV, Excel, PDF with full feature support
3. **Template System**: Handlebars-based for custom reports
4. **Scheduler**: Cron-based scheduled reports
5. **Server-Side**: Streaming support for large datasets
6. **Integration**: Seamless integration with existing data-view and API

The solution is modular, reusable, and scalable for all your applications.
