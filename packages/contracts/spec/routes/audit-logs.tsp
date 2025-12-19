/**
 * ============================================================================
 * AUDIT LOGS ROUTES - Query Audit Trail
 * ============================================================================
 *
 * Query immutable audit logs for compliance and security.
 *
 * Note: Audit logs are append-only and cannot be modified or deleted.
 *
 * @see docs/api-guide/06-quality/01-audit-logging.md
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/audit-log.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Audit Logs API
 *
 * Query audit logs for a tenant.
 * Requires appropriate permissions (typically admin or auditor role).
 */
@route("/v1/orgs/{orgId}/audit-logs")
@tag("Audit Logs")
interface AuditLogs {
  /**
   * Query audit logs
   *
   * Search and filter audit events. Supports pagination.
   * Results are sorted by timestamp descending (newest first).
   */
  @get
  @summary("Query audit logs")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page (max: 100) */
    @query pageSize?: int32 = 50,

    // === Filters ===

    /** Filter by event type (e.g., "user.created", "user.*") */
    @query eventType?: string,

    /** Filter by actor ID */
    @query actorId?: string,

    /** Filter by actor type */
    @query actorType?: AuditActorType,

    /** Filter by resource type (e.g., "user", "invoice") */
    @query resourceType?: string,

    /** Filter by resource ID */
    @query resourceId?: string,

    /** Filter events after this timestamp */
    @query timestampAfter?: utcDateTime,

    /** Filter events before this timestamp */
    @query timestampBefore?: utcDateTime,

    /** Filter by IP address */
    @query ipAddress?: string,

    /** Filter by request ID */
    @query requestId?: string
  ): AuditLogListResponse | ErrorResponse;

  /**
   * Get a single audit log entry
   */
  @route("/{eventId}")
  @get
  @summary("Get audit log entry")
  get(
    /** Organization ID */
    @path orgId: string,

    /** Event ID */
    @path eventId: string
  ): AuditLogResponse | ErrorResponse;

  /**
   * Export audit logs
   *
   * Returns a download URL for audit logs in CSV or JSON format.
   * For large exports, returns 202 Accepted with a job ID.
   */
  @route("/export")
  @post
  @summary("Export audit logs")
  export(
    /** Organization ID */
    @path orgId: string,

    /** Export configuration */
    @body body: {
      /** Export format */
      format: "csv" | "json";

      /** Filter events after this timestamp */
      timestampAfter?: utcDateTime;

      /** Filter events before this timestamp */
      timestampBefore?: utcDateTime;

      /** Event types to include (empty = all) */
      eventTypes?: string[];
    }
  ):
    | {
        /** Direct download available */
        @statusCode statusCode: 200;
        @body body: {
          data: {
            /** Download URL (signed, expires in 1 hour) */
            downloadUrl: string;

            /** Number of events exported */
            eventCount: int32;

            /** When the URL expires */
            expiresAt: utcDateTime;
          };

          meta: ResponseMeta;
        };
      }
    | {
        /** Large export - async job created */
        @statusCode statusCode: 202;
        @body body: AsyncJobResponse;
      }
    | ErrorResponse;
}
