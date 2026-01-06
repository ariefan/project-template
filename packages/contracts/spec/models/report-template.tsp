import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Report output format
 */
enum ReportFormat {
  csv: "csv",
  excel: "excel",
  pdf: "pdf",
  thermal: "thermal",
  dotmatrix: "dotmatrix",
}

/**
 * Page orientation for PDF reports
 */
enum ReportOrientation {
  portrait: "portrait",
  landscape: "landscape",
}

/**
 * Page size for PDF reports
 */
enum ReportPageSize {
  a4: "a4",
  letter: "letter",
  legal: "legal",
  a3: "a3",
}

/**
 * Column alignment
 */
enum ColumnAlignment {
  left: "left",
  center: "center",
  right: "right",
}

/**
 * Column data format
 */
enum ColumnFormat {
  text: "text",
  number: "number",
  currency: "currency",
  date: "date",
  datetime: "datetime",
  boolean: "boolean",
  percentage: "percentage",
}

// ============================================================================
// NESTED MODELS
// ============================================================================

/**
 * Column configuration for reports
 */
model ReportColumnConfig {
  /** Column identifier */
  id: string;

  /** Display header text */
  header: string;

  /** Property key to access data (e.g., "user.name") */
  accessorKey?: string;

  /** Custom accessor function (JavaScript expression) */
  accessorFn?: string;

  /** Column width in pixels */
  width?: int32;

  /** Text alignment */
  align?: ColumnAlignment;

  /** Data format type */
  format?: ColumnFormat;

  /** Custom format pattern (e.g., "yyyy-MM-dd" for dates) */
  formatPattern?: string;

  /** Whether column is hidden by default */
  hidden?: boolean;
}

/**
 * Report format-specific options
 */
model ReportOptions {
  // === CSV Options ===
  /** CSV delimiter character */
  delimiter?: string;

  /** Include header row in CSV */
  includeHeaders?: boolean;

  // === Excel Options ===
  /** Excel sheet name */
  sheetName?: string;

  /** Enable auto-filter in Excel */
  autoFilter?: boolean;

  /** Freeze header row in Excel */
  freezeHeader?: boolean;

  // === PDF Options ===
  /** Page orientation for PDF */
  orientation?: ReportOrientation;

  /** Page size for PDF */
  pageSize?: ReportPageSize;

  /** Top margin in mm */
  marginTop?: int32;

  /** Right margin in mm */
  marginRight?: int32;

  /** Bottom margin in mm */
  marginBottom?: int32;

  /** Left margin in mm */
  marginLeft?: int32;

  /** Report title (displayed at top) */
  title?: string;

  /** Report subtitle */
  subtitle?: string;

  /** Watermark text */
  watermark?: string;

  /** Include page numbers */
  includePageNumbers?: boolean;

  /** Include generation timestamp */
  includeTimestamp?: boolean;

  // === Thermal Printer Options ===
  /** Printer paper width (58mm or 80mm) */
  printerWidth?: int32;

  /** Character encoding */
  encoding?: string;

  /** Cut paper after printing */
  autoCut?: boolean;
}

/**
 * Data source configuration for report templates
 */
model DataSourceConfig {
  /** Data source type */
  type: "query" | "api" | "custom";

  /** SQL query or API endpoint path */
  source?: string;

  /** Default parameters for the query/API */
  defaultParams?: Record<unknown>;
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Report Template resource model
 *
 * Defines reusable report configurations with:
 * - Multiple output formats (CSV, Excel, PDF, Thermal, Dot-Matrix)
 * - Eta template engine for custom layouts
 * - Column definitions with formatting
 * - Data source configuration
 * - Multi-tenant scoping
 */
model ReportTemplate {
  /** Unique template identifier (format: tpl_{randomString}) */
  @example("tpl_abc123xyz")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Template name */
  @example("Monthly Sales Report")
  name: string;

  /** Template description */
  @example("Summarizes sales data by product category")
  description?: string;

  /** Output format */
  format: ReportFormat;

  /** Template engine (currently only eta supported) */
  @example("eta")
  templateEngine: string;

  /** Template content (Eta template string) */
  @example("<% it.data.forEach(row => { %><%= row.name %><% }) %>")
  templateContent: string;

  /** Format-specific options */
  options?: ReportOptions;

  /** Data source configuration */
  dataSource?: DataSourceConfig;

  /** Column definitions */
  columns: ReportColumnConfig[];

  /** Whether template is visible to all org members */
  isPublic: boolean;

  /** User ID who created the template */
  @example("usr_creator123")
  createdBy: string;

  /** Timestamp when the template was created */
  createdAt: utcDateTime;

  /** Timestamp when the template was last updated */
  updatedAt: utcDateTime;

  /** Timestamp when the template was soft deleted (null if not deleted) */
  deletedAt?: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request body for creating a new report template
 */
model CreateReportTemplateRequest {
  /** Template name */
  @example("Monthly Sales Report")
  name: string;

  /** Template description */
  description?: string;

  /** Output format */
  format: ReportFormat;

  /** Template content (Eta template string) */
  @example("<% it.data.forEach(row => { %><%= row.name %><% }) %>")
  templateContent: string;

  /** Format-specific options */
  options?: ReportOptions;

  /** Data source configuration */
  dataSource?: DataSourceConfig;

  /** Column definitions */
  columns: ReportColumnConfig[];

  /** Whether template is visible to all org members (default: false) */
  isPublic?: boolean;
}

/**
 * Request body for updating a report template
 */
model UpdateReportTemplateRequest {
  /** Template name */
  name?: string;

  /** Template description */
  description?: string;

  /** Output format */
  format?: ReportFormat;

  /** Template content */
  templateContent?: string;

  /** Format-specific options */
  options?: ReportOptions;

  /** Data source configuration */
  dataSource?: DataSourceConfig;

  /** Column definitions */
  columns?: ReportColumnConfig[];

  /** Whether template is visible to all org members */
  isPublic?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single report template response
 */
model ReportTemplateResponse {
  data: ReportTemplate;
  meta: ResponseMeta;
}

/**
 * Report template collection response (page-based)
 */
model ReportTemplateListResponse {
  data: ReportTemplate[];
  pagination: Pagination;
  meta: ResponseMeta;
}
