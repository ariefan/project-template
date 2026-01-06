/**
 * Printer Registry
 *
 * Manages available printers and provides unified print interface
 */

import type {
  ColumnConfig,
  ExportOptions,
  Printer,
  PrintResult,
  ReportFormat,
} from "../types";
import { DotMatrixPrinter } from "./dot-matrix";
import { ThermalPrinter } from "./thermal";

export class PrinterRegistry<T = unknown> {
  private readonly printers: Map<ReportFormat, Printer<T>>;

  constructor() {
    this.printers = new Map();
    this.register(new ThermalPrinter<T>());
    this.register(new DotMatrixPrinter<T>());
  }

  /**
   * Register a printer
   */
  register(printer: Printer<T>): void {
    this.printers.set(printer.format, printer);
  }

  /**
   * Get a printer by format
   */
  get(format: ReportFormat): Printer<T> | undefined {
    return this.printers.get(format);
  }

  /**
   * Check if a format is supported
   */
  supports(format: ReportFormat): boolean {
    return this.printers.has(format);
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): ReportFormat[] {
    return Array.from(this.printers.keys());
  }

  /**
   * Print data to the specified format
   */
  async print(
    format: ReportFormat,
    data: T[],
    columns: ColumnConfig[],
    options?: ExportOptions
  ): Promise<PrintResult> {
    const printer = this.printers.get(format);
    if (!printer) {
      throw new Error(`Unsupported printer format: ${format}`);
    }
    return await printer.print(data, columns, options);
  }
}

/**
 * Create a new printer registry with default printers
 */
export function createPrinterRegistry<T = unknown>(): PrinterRegistry<T> {
  return new PrinterRegistry<T>();
}
