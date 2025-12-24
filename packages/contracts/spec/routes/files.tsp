/**
 * ============================================================================
 * FILES API - File Upload/Download Endpoints
 * ============================================================================
 *
 * Implements two upload strategies:
 * 1. Presigned URL (recommended for production)
 * 2. Direct multipart upload (simple, for small files)
 *
 * Security features:
 * - Virus scanning
 * - MIME type verification
 * - Multi-tenant isolation
 * - Signed URLs for private files
 *
 * @see docs/api-guide/05-advanced-operations/07-file-handling.md
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/file.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Files API endpoints
 *
 * All endpoints are scoped to an organization (multi-tenant).
 * Files are stored in tenant-isolated paths.
 */
@route("/v1/orgs/{orgId}/files")
@tag("Files")
interface Files {
  // ==========================================================================
  // LIST & GET
  // ==========================================================================

  /**
   * List files in an organization
   *
   * Returns paginated list of files with optional filtering.
   */
  @get
  @summary("List files")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page (max: 100) */
    @query pageSize?: int32 = 50,

    /** Sort order (e.g., "-uploadedAt,filename") */
    @query orderBy?: string,

    /** Comma-separated list of fields to return */
    @query fields?: string,

    // === Filters ===

    /** Filter by MIME type */
    @query mimeType?: string,

    /** Filter by virus scan status */
    @query virusScanStatus?: VirusScanStatus,

    /** Filter by access level */
    @query access?: FileAccess,

    /** Filter files uploaded after this timestamp */
    @query uploadedAfter?: utcDateTime,

    /** Filter files uploaded before this timestamp */
    @query uploadedBefore?: utcDateTime,

    /** Filter by uploader user ID */
    @query uploadedBy?: string
  ): FileListResponse | ErrorResponse;

  /**
   * Get a single file by ID
   *
   * Returns file metadata including a fresh signed URL for download.
   */
  @route("/{fileId}")
  @get
  @summary("Get file")
  get(
    /** Organization ID */
    @path orgId: string,

    /** File ID */
    @path fileId: string,

    /** Comma-separated list of fields to return */
    @query fields?: string
  ): FileResponse | ErrorResponse;

  /**
   * Update file properties
   *
   * Currently supports changing the access level (private/public).
   */
  @route("/{fileId}")
  @patch(#{implicitOptionality: true})
  @summary("Update file")
  update(
    /** Organization ID */
    @path orgId: string,

    /** File ID */
    @path fileId: string,

    /** Update request */
    @body body: UpdateFileRequest
  ): FileResponse | ErrorResponse;

  /**
   * Download a file
   *
   * Returns a redirect to a signed URL for the file.
   * The signed URL expires in 5 minutes.
   */
  @route("/{fileId}/download")
  @get
  @summary("Download file")
  download(
    /** Organization ID */
    @path orgId: string,

    /** File ID */
    @path fileId: string
  ):
    | {
        @statusCode statusCode: 302;
        @header location: string;
      }
    | ErrorResponse;

  // ==========================================================================
  // PRESIGNED URL UPLOAD (Recommended)
  // ==========================================================================

  /**
   * Initiate a presigned URL upload
   *
   * Returns a presigned URL for direct upload to storage (S3/R2/GCS).
   * Client uploads directly to storage, then confirms with the API.
   *
   * Flow:
   * 1. POST /files/uploads - Get presigned URL
   * 2. PUT {presignedUrl} - Upload directly to storage
   * 3. POST /files/uploads/{uploadId}/confirm - Confirm upload
   */
  @route("/uploads")
  @post
  @summary("Initiate presigned URL upload")
  initiateUpload(
    /** Organization ID */
    @path orgId: string,

    /** Upload request with file metadata */
    @body body: InitiateUploadRequest
  ): InitiateUploadResponse | ErrorResponse;

  /**
   * Confirm a presigned URL upload
   *
   * Called after client successfully uploads to the presigned URL.
   * Triggers virus scanning and creates the file record.
   */
  @route("/uploads/{uploadId}/confirm")
  @post
  @summary("Confirm presigned URL upload")
  confirmUpload(
    /** Organization ID */
    @path orgId: string,

    /** Upload ID from initiate response */
    @path uploadId: string,

    /** Confirmation data */
    @body body: ConfirmUploadRequest
  ):
    | {
        @statusCode statusCode: 201;
        @header location: string;
        @body body: FileResponse;
      }
    | ErrorResponse;

  // ==========================================================================
  // DIRECT UPLOAD (Simple, for small files)
  // ==========================================================================

  /**
   * Direct file upload (multipart/form-data)
   *
   * For simple uploads of small files (< 10 MB).
   * File is uploaded directly to the API server.
   *
   * Note: For larger files or high volume, use presigned URL upload.
   */
  @post
  @summary("Direct file upload")
  directUpload(
    /** Organization ID */
    @path orgId: string

    // Note: multipart/form-data with file and metadata fields
    // TypeSpec doesn't have native multipart support, so this is
    // documented as accepting multipart/form-data in OpenAPI extensions
  ):
    | {
        @statusCode statusCode: 201;
        @header location: string;
        @body body: FileResponse;
      }
    | ErrorResponse;

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete a file (soft delete)
   *
   * File is marked as deleted but retained for audit purposes.
   * Storage is cleaned up after retention period.
   */
  @route("/{fileId}")
  @delete
  @summary("Delete file")
  delete(
    /** Organization ID */
    @path orgId: string,

    /** File ID */
    @path fileId: string
  ): FileDeleteResponse | ErrorResponse;

  /**
   * Permanently delete a file (hard delete)
   *
   * Immediately removes file from storage.
   * Use with caution - cannot be undone.
   */
  @route("/{fileId}/permanent")
  @delete
  @summary("Permanently delete file")
  deletePermanent(
    /** Organization ID */
    @path orgId: string,

    /** File ID */
    @path fileId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;
}
