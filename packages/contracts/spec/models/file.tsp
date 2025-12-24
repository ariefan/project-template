/**
 * ============================================================================
 * FILE MODEL - File Upload/Download Resource
 * ============================================================================
 *
 * File handling for B2B SaaS with security best practices:
 * - Two upload strategies: direct and presigned URL
 * - Virus scanning integration
 * - Multi-tenant isolation
 * - Signed URLs for private file access
 *
 * @see docs/api-guide/05-advanced-operations/07-file-handling.md
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Virus scan status for uploaded files
 */
enum VirusScanStatus {
  /** Scan pending */
  pending: "pending",

  /** Scan in progress */
  scanning: "scanning",

  /** File is clean */
  clean: "clean",

  /** Virus detected */
  infected: "infected",

  /** Scan failed (should retry) */
  failed: "failed",
}

/**
 * File access level
 */
enum FileAccess {
  /** Private - requires signed URL */
  private: "private",

  /** Public - accessible via CDN */
  public: "public",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * File resource model
 *
 * Represents an uploaded file with metadata, security status, and access info.
 */
model File {
  /** Unique file identifier (format: file_abc123) */
  @example("file_abc123")
  id: string;

  /** Original filename (sanitized) */
  @example("report.pdf")
  filename: string;

  /** File size in bytes */
  @example(2457600)
  size: int64;

  /** MIME type (verified via magic bytes, not client-provided) */
  @example("application/pdf")
  mimeType: string;

  /** Storage path (internal, not exposed to clients in production) */
  @example("orgs/org_abc123/files/file_abc123.pdf")
  storagePath: string;

  /** Signed URL for file access (time-limited) */
  @example("https://cdn.example.com/files/file_abc123.pdf?signature=...")
  url?: string;

  /** File metadata (user-provided) */
  metadata?: Record<string>;

  /** User ID who uploaded the file */
  @example("usr_xyz789")
  uploadedBy: string;

  /** Timestamp when the file was uploaded */
  uploadedAt: utcDateTime;

  /** Virus scan status */
  virusScanStatus: VirusScanStatus;

  /** Timestamp when virus scan completed */
  virusScanCompletedAt?: utcDateTime;

  /** Access level */
  access: FileAccess;

  /** Whether the file is soft deleted */
  isDeleted: boolean;

  /** Timestamp when the file was deleted */
  deletedAt?: utcDateTime;

  /** User ID who deleted this file */
  deletedBy?: string;
}

// ============================================================================
// PRESIGNED URL UPLOAD MODELS
// ============================================================================

/**
 * Request to initiate a presigned URL upload
 */
model InitiateUploadRequest {
  /** Original filename */
  @minLength(1)
  @maxLength(255)
  filename: string;

  /** MIME type of the file */
  @example("application/pdf")
  contentType: string;

  /** File size in bytes */
  @minValue(1)
  size: int64;

  /** Optional metadata */
  metadata?: Record<string>;
}

/**
 * Response with presigned URL for direct upload to storage
 */
model InitiateUploadResponse {
  data: {
    /** Upload ID for confirmation step */
    @example("upl_xyz789")
    uploadId: string;

    /** Presigned URL to upload to */
    @example("https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...")
    presignedUrl: string;

    /** HTTP method to use */
    method: "PUT";

    /** Required headers for the upload */
    headers: Record<string>;

    /** When the presigned URL expires */
    expiresAt: utcDateTime;

    /** Maximum allowed file size */
    maxSize: int64;
  };

  meta: ResponseMeta;
}

/**
 * Request to confirm an upload completed successfully
 */
model ConfirmUploadRequest {
  /** Optional: ETag from S3 response for verification */
  etag?: string;
}

// ============================================================================
// DIRECT UPLOAD MODELS (multipart/form-data)
// ============================================================================

/**
 * Metadata for direct file upload
 */
model DirectUploadMetadata {
  /** Optional description */
  @maxLength(1000)
  description?: string;

  /** Custom metadata key-value pairs */
  metadata?: Record<string>;

  /** Access level (default: private) */
  access?: FileAccess;
}

// ============================================================================
// UPDATE MODELS
// ============================================================================

/**
 * Request to update file properties
 */
model UpdateFileRequest {
  /** New access level */
  access: FileAccess;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single file response
 */
model FileResponse {
  data: File;
  meta: ResponseMeta;
}

/**
 * File list response with pagination
 */
model FileListResponse {
  data: File[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * File deletion response
 */
model FileDeleteResponse {
  data: {
    /** ID of the deleted file */
    id: string;

    /** When the file was deleted */
    deletedAt: utcDateTime;

    /** Who deleted the file */
    deletedBy: string;
  };

  meta: ResponseMeta;
}
