/**
 * Core types for the reporting system
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ReportFormat = "csv" | "excel" | "pdf" | "thermal" | "dotmatrix";

export type ReportOrientation = "portrait" | "landscape";

export type ReportPageSize = "a4" | "letter" | "legal" | "a3";

export type ColumnAlignment = "left" | "center" | "right";

export type ColumnFormat =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "percentage";

export type ScheduleFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type DeliveryMethod = "email" | "download" | "webhook" | "storage";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type JobType = "manual" | "scheduled";

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

export interface ColumnConfig {
  /** Column identifier */
  id: string;
  /** Display header text */
  header: string;
  /** Property key to access data (e.g., "user.name") */
  accessorKey?: string;
  /** Custom accessor function expression */
  accessorFn?: string;
  /** Column width in pixels */
  width?: number;
  /** Text alignment */
  align?: ColumnAlignment;
  /** Data format type */
  format?: ColumnFormat;
  /** Custom format pattern (e.g., "yyyy-MM-dd" for dates) */
  formatPattern?: string;
  /** Whether column is hidden by default */
  hidden?: boolean;
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export interface CsvOptions {
  /** CSV delimiter character (default: ",") */
  delimiter?: string;
  /** Include header row (default: true) */
  includeHeaders?: boolean;
  /** Character encoding (default: "utf-8") */
  encoding?: string;
}

export interface ExcelOptions {
  /** Excel sheet name */
  sheetName?: string;
  /** Enable auto-filter */
  autoFilter?: boolean;
  /** Freeze header row */
  freezeHeader?: boolean;
}

export interface PdfOptions {
  /** Page orientation */
  orientation?: ReportOrientation;
  /** Page size */
  pageSize?: ReportPageSize;
  /** Top margin in mm */
  marginTop?: number;
  /** Right margin in mm */
  marginRight?: number;
  /** Bottom margin in mm */
  marginBottom?: number;
  /** Left margin in mm */
  marginLeft?: number;
  /** Report title */
  title?: string;
  /** Report subtitle */
  subtitle?: string;
  /** Watermark text */
  watermark?: string;
  /** Include page numbers */
  includePageNumbers?: boolean;
  /** Include generation timestamp */
  includeTimestamp?: boolean;
}

export interface ThermalOptions {
  /** Printer paper width (58 or 80mm) */
  printerWidth?: 58 | 80;
  /** Character encoding */
  encoding?: string;
  /** Cut paper after printing */
  autoCut?: boolean;
}

export interface DotMatrixOptions {
  /** Characters per line */
  lineWidth?: number;
  /** Use condensed mode */
  condensedMode?: boolean;
  /** Form feed after print */
  formFeed?: boolean;
}

export type ExportOptions =
  | CsvOptions
  | ExcelOptions
  | PdfOptions
  | ThermalOptions
  | DotMatrixOptions;

// ============================================================================
// DATA SOURCE
// ============================================================================

export interface DataSourceConfig {
  /** Data source type */
  type: "query" | "api" | "custom";
  /** SQL query or API endpoint path */
  source?: string;
  /** Default parameters for the query/API */
  defaultParams?: Record<string, unknown>;
}

// ============================================================================
// TEMPLATE
// ============================================================================

export interface ReportTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  format: ReportFormat;
  templateContent: string;
  options?: ExportOptions;
  dataSource?: DataSourceConfig;
  columns: ColumnConfig[];
  isPublic?: boolean;
  createdBy: string;
}

// ============================================================================
// EXPORT RESULT
// ============================================================================

export interface ExportResult {
  success: boolean;
  /** Buffer containing exported data */
  buffer: Buffer;
  /** MIME type of the exported file */
  mimeType: string;
  /** Suggested filename */
  filename: string;
  /** Size in bytes */
  size: number;
  /** Number of rows exported */
  rowCount: number;
  /** Export duration in milliseconds */
  duration: number;
}

// ============================================================================
// PRINT RESULT
// ============================================================================

export interface PrintResult {
  success: boolean;
  /** Buffer containing ESC/POS commands or plain text */
  buffer: Buffer;
  /** Character encoding used */
  encoding: string;
  /** Printer width in characters */
  printerWidth: number;
}

// ============================================================================
// JOB
// ============================================================================

export interface JobResult {
  /** Path to generated file (if stored) */
  filePath?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Download URL (if applicable) */
  downloadUrl?: string;
  /** Expiration time for download */
  expiresAt?: Date;
  /** Number of rows exported */
  rowCount?: number;
}

export interface JobError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
}

// ============================================================================
// STREAMING
// ============================================================================

export interface StreamOptions {
  /** Batch size for processing (default: 1000) */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (processed: number, total?: number) => void;
}

// ============================================================================
// EXPORTER INTERFACE
// ============================================================================

export interface Exporter<T = unknown> {
  /** Export data to the target format */
  export(
    data: T[],
    columns: ColumnConfig[],
    options?: ExportOptions
  ): ExportResult | Promise<ExportResult>;

  /** Get supported format */
  readonly format: ReportFormat;

  /** Get MIME type for the format */
  readonly mimeType: string;

  /** Get file extension for the format */
  readonly extension: string;
}

// ============================================================================
// PRINTER INTERFACE
// ============================================================================

export interface Printer<T = unknown> {
  /** Generate print output */
  print(
    data: T[],
    columns: ColumnConfig[],
    options?: ExportOptions
  ): PrintResult | Promise<PrintResult>;

  /** Get supported format */
  readonly format: ReportFormat;
}
