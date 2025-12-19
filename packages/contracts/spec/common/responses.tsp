import "@typespec/http";

using TypeSpec.Http;

// ============================================================================
// RESPONSE METADATA
// ============================================================================

/**
 * Response metadata included in all API responses
 */
model ResponseMeta {
  /** Unique request identifier for tracking and debugging */
  requestId: string;

  /** Timestamp when the response was generated */
  timestamp: utcDateTime;

  /** API version used for this request */
  apiVersion?: string;

  /** Tenant/organization ID for multi-tenant requests */
  tenantId?: string;

  /** Tenant/organization name for multi-tenant requests */
  tenantName?: string;

  /** Processing time in milliseconds */
  durationMs?: int32;
}

// ============================================================================
// WARNINGS
// ============================================================================

/**
 * Warning message included in responses for non-fatal issues
 *
 * Examples: deprecated endpoints, capped page size, rate limit approaching
 */
model Warning {
  /** Warning code (e.g., endpointDeprecated, pageSizeCapped) */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** URL to documentation about this warning (optional) */
  documentationUrl?: string;
}

// ============================================================================
// PAGINATION - PAGE-BASED (Primary)
// ============================================================================

/**
 * Pagination links for navigating through paginated results
 */
model PaginationLinks {
  /** URL for the first page */
  first: string | null;

  /** URL for the previous page (null if on first page) */
  previous: string | null;

  /** URL for the next page (null if on last page) */
  next: string | null;

  /** URL for the last page */
  last: string | null;
}

/**
 * Page-based pagination metadata for collection responses
 */
model Pagination {
  /** Current page number (1-indexed) */
  page: int32;

  /** Number of items per page */
  pageSize: int32;

  /** Total number of pages */
  totalPages: int32;

  /** Total number of items across all pages */
  totalCount: int32;

  /** Whether there is a next page */
  hasNext: boolean;

  /** Whether there is a previous page */
  hasPrevious: boolean;

  /** Navigation links for pagination */
  links?: PaginationLinks;

  /** Original requested page size (included if pageSize was capped) */
  requestedPageSize?: int32;
}

// ============================================================================
// PAGINATION - CURSOR-BASED
// ============================================================================

/**
 * Cursor-based pagination for large datasets or real-time data
 */
model CursorPagination {
  /** Maximum items returned per page */
  limit: int32;

  /** Whether there is a next page */
  hasNext: boolean;

  /** Cursor for fetching the next page (null if no more pages) */
  nextCursor: string | null;

  /** Cursor for fetching the previous page (null if on first page) */
  previousCursor: string | null;
}

// ============================================================================
// PAGINATION - OFFSET-BASED
// ============================================================================

/**
 * Offset-based pagination for simple pagination needs
 */
model OffsetPagination {
  /** Number of items to skip */
  offset: int32;

  /** Maximum items per page */
  limit: int32;

  /** Total number of items across all pages */
  totalCount: int32;

  /** Whether there is a next page */
  hasNext: boolean;
}

// ============================================================================
// RESPONSE ENVELOPES
// ============================================================================

/**
 * Standard response envelope for single resources
 */
model SingleResourceResponse<T> {
  /** The resource data */
  data: T;

  /** Non-fatal warnings (e.g., deprecation notices) */
  warnings?: Warning[];

  /** Response metadata */
  meta: ResponseMeta;
}

/**
 * Standard response envelope for resource collections (page-based)
 */
model CollectionResponse<T> {
  /** Array of resources */
  data: T[];

  /** Pagination information */
  pagination: Pagination;

  /** Non-fatal warnings (e.g., deprecation notices) */
  warnings?: Warning[];

  /** Response metadata */
  meta: ResponseMeta;
}

/**
 * Response envelope for cursor-based pagination
 */
model CursorCollectionResponse<T> {
  /** Array of resources */
  data: T[];

  /** Cursor pagination information */
  pagination: CursorPagination;

  /** Non-fatal warnings */
  warnings?: Warning[];

  /** Response metadata */
  meta: ResponseMeta;
}

// ============================================================================
// SOFT DELETE RESPONSE
// ============================================================================

/**
 * Response for soft delete operations
 *
 * Includes resource ID, deletion metadata, and restore information
 */
model SoftDeleteResponse {
  data: {
    /** ID of the deleted resource */
    id: string;

    /** Timestamp when the resource was soft deleted */
    deletedAt: utcDateTime;

    /** User ID who performed the deletion */
    deletedBy: string;

    /** Reason for deletion (optional, from request) */
    deletionReason?: string;

    /** Whether the resource can be restored */
    canRestore: boolean;

    /** Deadline for restoration (after which hard delete may occur) */
    restoreUntil?: utcDateTime;
  };

  /** Response metadata */
  meta: ResponseMeta;
}

// ============================================================================
// ASYNC JOB RESPONSE (202 Accepted)
// ============================================================================

/**
 * Response for async operations that return 202 Accepted
 */
model AsyncJobResponse {
  /** Unique job identifier */
  jobId: string;

  /** Current job status */
  status: "pending" | "processing" | "completed" | "failed";

  /** URL to check job status */
  statusUrl: string;

  /** Estimated completion time */
  estimatedCompletion?: utcDateTime;

  /** Response metadata */
  meta: ResponseMeta;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Result of a single item in a batch operation
 */
model BatchResult<T> {
  /** Index of the item in the original request array */
  index: int32;

  /** Status of the operation for this item */
  status: "success" | "error" | "skipped";

  /** The created/updated data (present if status is success) */
  data?: T;

  /** Error details (present if status is error) */
  error?: {
    /** Error code */
    code: string;

    /** Error message */
    message: string;
  };

  /** Original input (included for failed items to help with retry/debugging) */
  input?: Record<unknown>;
}

/**
 * Summary of batch operation results
 */
model BatchSummary {
  /** Total number of items in the request */
  total: int32;

  /** Number of successfully processed items */
  successful: int32;

  /** Number of failed items */
  failed: int32;

  /** Number of skipped items (e.g., duplicates) */
  skipped: int32;
}

/**
 * Options for batch operations
 */
model BatchOptions {
  /** If true, all items succeed or all fail (transactional) */
  atomic?: boolean;

  /** If true, return created/updated records in response */
  returnRecords?: boolean;

  /** If true, skip items that already exist (duplicates) */
  skipDuplicates?: boolean;

  /** If true, validate without actually creating/updating */
  validateOnly?: boolean;
}

/**
 * Generic batch response envelope
 *
 * Uses results array with status field for each item, matching documentation
 */
model BatchResponse<T> {
  /** Results for each item in the batch */
  results: BatchResult<T>[];

  /** Summary of operation results */
  summary: BatchSummary;

  /** Response metadata */
  meta: ResponseMeta;
}

/**
 * Batch delete result (soft delete)
 */
model BatchDeleteResult {
  /** Index of the item in the original request array */
  index: int32;

  /** Status of the operation for this item */
  status: "success" | "error" | "skipped";

  /** Deleted item info (present if status is success) */
  data?: {
    /** ID of the deleted item */
    id: string;

    /** Timestamp when the item was deleted */
    deletedAt: utcDateTime;
  };

  /** Error details (present if status is error) */
  error?: {
    /** Error code */
    code: string;

    /** Error message */
    message: string;
  };
}

/**
 * Batch delete response envelope
 */
model BatchDeleteResponse {
  /** Results for each item in the batch */
  results: BatchDeleteResult[];

  /** Summary of operation results */
  summary: BatchSummary;

  /** Response metadata */
  meta: ResponseMeta;
}
