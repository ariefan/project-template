/**
 * Report Service
 *
 * Main service for generating reports
 */

import { ExporterRegistry } from "../exporters/registry";
import { PrinterRegistry } from "../printers/registry";
import {
  createTemplateEngine,
  type TemplateContext,
  type TemplateEngine,
} from "../templates/engine";
import type {
  ColumnConfig,
  ExportOptions,
  ExportResult,
  PrintResult,
  ReportFormat,
} from "../types";
import type { JobService, ReportJob } from "./job-service";
import type { ReportTemplate, TemplateService } from "./template-service";

export interface ReportServiceConfig {
  /** Threshold for async export (row count) */
  asyncThreshold?: number;
  /** Default export options */
  defaultOptions?: Partial<ExportOptions>;
}

export interface GenerateReportInput<T = unknown> {
  /** Organization ID */
  organizationId: string;
  /** Template ID (optional, can export without template) */
  templateId?: string;
  /** Data to export */
  data: T[];
  /** Column configuration (required if no template) */
  columns?: ColumnConfig[];
  /** Export format (required if no template) */
  format?: ReportFormat;
  /** Export options */
  options?: ExportOptions;
  /** User ID generating the report */
  userId: string;
}

export interface ReportServiceDeps {
  templateService?: TemplateService;
  jobService?: JobService;
  config?: ReportServiceConfig;
}

export class ReportService {
  private readonly exporterRegistry: ExporterRegistry;
  private readonly printerRegistry: PrinterRegistry;
  private readonly templateEngine: TemplateEngine;
  private readonly deps: ReportServiceDeps;

  constructor(deps?: ReportServiceDeps) {
    this.exporterRegistry = new ExporterRegistry();
    this.printerRegistry = new PrinterRegistry();
    this.templateEngine = createTemplateEngine();
    this.deps = deps ?? {};
  }

  /**
   * Generate a report synchronously
   */
  async generate<T>(
    input: GenerateReportInput<T>
  ): Promise<ExportResult | PrintResult> {
    // Get template if specified
    let template: ReportTemplate | null = null;
    if (input.templateId && this.deps.templateService) {
      template = await this.deps.templateService.getTemplate(
        input.templateId,
        input.organizationId
      );
      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }
    }

    // Determine format, columns, and options
    const format = template?.format ?? input.format;
    const columns = template?.columns ?? input.columns;
    const options = {
      ...this.deps.config?.defaultOptions,
      ...template?.options,
      ...input.options,
    };

    if (!format) {
      throw new Error("Format is required when not using a template");
    }

    if (!columns || columns.length === 0) {
      throw new Error("Columns are required when not using a template");
    }

    // Process data through template if content provided
    let processedData = input.data;
    if (template?.templateContent) {
      // Get title from PDF options if available
      const pdfOptions = options as { title?: string } | undefined;
      const _context: TemplateContext<T> = {
        data: input.data,
        metadata: {
          title: pdfOptions?.title,
          generatedAt: new Date(),
          rowCount: input.data.length,
        },
      };

      // TODO: For custom template processing, render using _context
      // For now, pass data through directly
      processedData = input.data;
    }

    // Generate export based on format type
    if (format === "thermal" || format === "dotmatrix") {
      return this.printerRegistry.print(
        format,
        processedData,
        columns,
        options
      );
    }

    return this.exporterRegistry.export(
      format,
      processedData,
      columns,
      options
    );
  }

  /**
   * Generate a report asynchronously (creates a job)
   */
  async generateAsync<T>(input: GenerateReportInput<T>): Promise<ReportJob> {
    if (!this.deps.jobService) {
      throw new Error("Job service is required for async generation");
    }

    const job = await this.deps.jobService.createJob({
      organizationId: input.organizationId,
      templateId: input.templateId,
      type: "manual",
      parameters: {
        format: input.format,
        options: input.options,
        // Note: data would typically be stored or referenced, not included in params
      },
      createdBy: input.userId,
    });

    // In a real implementation, you'd queue this job with pg-boss
    // For now, we just create the job record

    return job;
  }

  /**
   * Check if export should be async based on data size
   */
  shouldUseAsync(rowCount: number): boolean {
    const threshold = this.deps.config?.asyncThreshold ?? 10_000;
    return rowCount > threshold;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): ReportFormat[] {
    const exportFormats = this.exporterRegistry.getSupportedFormats();
    const printFormats = this.printerRegistry.getSupportedFormats();
    return [...exportFormats, ...printFormats];
  }

  /**
   * Check if a format is supported
   */
  supportsFormat(format: ReportFormat): boolean {
    return (
      this.exporterRegistry.supports(format) ||
      this.printerRegistry.supports(format)
    );
  }

  /**
   * Get MIME type for a format
   */
  getMimeType(format: ReportFormat): string | undefined {
    const exporter = this.exporterRegistry.get(format);
    return exporter?.mimeType;
  }

  /**
   * Get file extension for a format
   */
  getFileExtension(format: ReportFormat): string | undefined {
    const exporter = this.exporterRegistry.get(format);
    return exporter?.extension;
  }

  /**
   * Validate template content
   */
  validateTemplate(templateContent: string) {
    return this.templateEngine.validate(templateContent);
  }

  /**
   * Get available template helpers
   */
  getTemplateHelpers(): string[] {
    return this.templateEngine.getAvailableHelpers();
  }
}

/**
 * Create a report service instance
 */
export function createReportService(deps?: ReportServiceDeps): ReportService {
  return new ReportService(deps);
}
