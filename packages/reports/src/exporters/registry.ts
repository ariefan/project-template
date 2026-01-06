/**
 * Exporter Registry
 *
 * Manages available exporters and provides unified export interface
 */

import type {
  ColumnConfig,
  Exporter,
  ExportOptions,
  ExportResult,
  ReportFormat,
} from "../types";
import { CsvExporter } from "./csv";
import { ExcelExporter } from "./excel";
import { PdfExporter } from "./pdf";

export class ExporterRegistry<T = unknown> {
  private readonly exporters: Map<ReportFormat, Exporter<T>>;

  constructor() {
    this.exporters = new Map();
    this.register(new CsvExporter<T>());
    this.register(new ExcelExporter<T>());
    this.register(new PdfExporter<T>());
  }

  /**
   * Register an exporter
   */
  register(exporter: Exporter<T>): void {
    this.exporters.set(exporter.format, exporter);
  }

  /**
   * Get an exporter by format
   */
  get(format: ReportFormat): Exporter<T> | undefined {
    return this.exporters.get(format);
  }

  /**
   * Check if a format is supported
   */
  supports(format: ReportFormat): boolean {
    return this.exporters.has(format);
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): ReportFormat[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Export data to the specified format
   */
  async export(
    format: ReportFormat,
    data: T[],
    columns: ColumnConfig[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    return await exporter.export(data, columns, options);
  }
}

/**
 * Create a new exporter registry with default exporters
 */
export function createExporterRegistry<T = unknown>(): ExporterRegistry<T> {
  return new ExporterRegistry<T>();
}
