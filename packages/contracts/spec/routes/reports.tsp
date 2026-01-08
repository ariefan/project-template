import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/report-template.tsp";
import "../models/job.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  // ==========================================================================
  // REPORT TEMPLATES
  // ==========================================================================

  /**
   * Report Templates API endpoints
   *
   * Manage reusable report configurations with:
   * - Multiple output formats (CSV, Excel, PDF, Thermal, Dot-Matrix)
   * - Eta template engine for custom layouts
   * - Column definitions with formatting
   * - Multi-tenant scoping
   */
  @route("/v1/orgs/{orgId}/reports/templates")
  @tag("Reports")
  interface ReportTemplates {
    /**
     * List report templates in an organization
     */
    @get
    @summary("List report templates")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100) */
      @query pageSize?: int32 = 50,

      /** Sort order (e.g., "-createdAt,name") */
      @query orderBy?: string,

      /** Filter by format */
      @query format?: ReportFormat,

      /** Filter by public templates only */
      @query isPublic?: boolean,

      /** Full-text search in name and description */
      @query search?: string,

      /** Filter templates created by specific user */
      @query createdBy?: string
    ): ReportTemplateListResponse | ErrorResponse;

    /**
     * Create a new report template
     */
    @post
    @summary("Create report template")
    create(
      /** Organization ID */
      @path orgId: string,

      /** Template data */
      @body body: CreateReportTemplateRequest
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: ReportTemplateResponse;
        }
      | ErrorResponse;

    /**
     * Get a report template by ID
     */
    @route("/{templateId}")
    @get
    @summary("Get report template")
    get(
      /** Organization ID */
      @path orgId: string,

      /** Template ID */
      @path templateId: string
    ): ReportTemplateResponse | ErrorResponse;

    /**
     * Update a report template
     */
    @route("/{templateId}")
    @patch(#{ implicitOptionality: true })
    @summary("Update report template")
    update(
      /** Organization ID */
      @path orgId: string,

      /** Template ID */
      @path templateId: string,

      /** Template update data */
      @body body: UpdateReportTemplateRequest
    ): ReportTemplateResponse | ErrorResponse;

    /**
     * Delete a report template
     */
    @route("/{templateId}")
    @delete
    @summary("Delete report template")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** Template ID */
      @path templateId: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Clone a report template
     */
    @route("/{templateId}/clone")
    @post
    @summary("Clone report template")
    clone(
      /** Organization ID */
      @path orgId: string,

      /** Template ID to clone */
      @path templateId: string,

      /** New template name */
      @body body: {
        name: string;
        description?: string;
      }
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: ReportTemplateResponse;
        }
      | ErrorResponse;
  }

  // ==========================================================================
  // SCHEDULED REPORTS
  // ==========================================================================
  // NOTE: Scheduled reports have been replaced by generic scheduled jobs.
  // See /v1/orgs/{orgId}/schedules for the new API.

  // ==========================================================================
  // REPORT EXPORTS (Direct Export)
  // ==========================================================================

  /**
   * Report Export API endpoints
   *
   * Direct export endpoints for:
   * - Synchronous exports (small datasets)
   * - Async exports (large datasets)
   * - Streaming exports
   */
  @route("/v1/orgs/{orgId}/reports")
  @tag("Reports")
  interface ReportExports {
    /**
     * Export data synchronously
     *
     * For small datasets (<10,000 rows). Returns the file directly.
     * For larger datasets, use async=true to get a job ID.
     */
    @route("/export")
    @post
    @summary("Export data")
    export(
      /** Organization ID */
      @path orgId: string,

      /** Export request */
      @body body: ExportRequest
    ):
      | {
          @statusCode statusCode: 200;
          @header contentType: string;
          @header contentDisposition: string;
          @body body: bytes;
        }
      | AsyncExportResponse
      | ErrorResponse;

    /**
     * Export data as streaming response
     *
     * For large datasets. Streams data in chunks as it's generated.
     * Only supports CSV and Excel formats.
     */
    @route("/export/stream")
    @post
    @summary("Stream export data")
    streamExport(
      /** Organization ID */
      @path orgId: string,

      /** Stream export request */
      @body body: StreamExportRequest
    ):
      | {
          @statusCode statusCode: 200;
          @header contentType: string;
          @header contentDisposition: string;
          @header transferEncoding: "chunked";
          @body body: bytes;
        }
      | ErrorResponse;

    /**
     * Preview export (first N rows)
     *
     * Useful for testing templates and verifying data before full export.
     */
    @route("/export/preview")
    @post
    @summary("Preview export")
    previewExport(
      /** Organization ID */
      @path orgId: string,

      /** Export request with limit */
      @body body: ExportRequest & {
        /** Maximum rows to preview (default: 10, max: 100) */
        limit?: int32;
      }
    ):
      | {
          data: {
            /** Preview rows */
            rows: unknown[];

            /** Total row count (if known) */
            totalCount?: int32;

            /** Column headers */
            columns: string[];
          };
          meta: ResponseMeta;
        }
      | ErrorResponse;
  }
}
