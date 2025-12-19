import "@typespec/http";

using TypeSpec.Http;

/**
 * Detailed error information for a specific field or validation
 */
model ErrorDetail {
  /** The field that caused the error (for validation errors) */
  field: string;

  /** Specific error code for this detail */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional metadata about the error */
  metadata?: Record<unknown>;
}

/**
 * Standard error object
 */
model Error {
  /** Machine-readable error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Array of detailed error information (e.g., validation errors) */
  details?: ErrorDetail[];

  /** Request ID for tracking and debugging */
  requestId: string;

  /** URL to documentation about this error (optional) */
  documentationUrl?: string;
}

/**
 * Standard error response envelope
 */
model ErrorResponse {
  /** The error object */
  error: Error;
}

/**
 * Common error codes used across the API
 * All codes use camelCase for consistency
 */
enum ErrorCode {
  /** Generic validation error */
  validationError: "validationError",

  /** Resource not found */
  notFound: "notFound",

  /** Unauthorized - authentication required */
  unauthorized: "unauthorized",

  /** Forbidden - insufficient permissions */
  forbidden: "forbidden",

  /** Conflict - resource already exists */
  conflict: "conflict",

  /** Rate limit exceeded */
  rateLimitExceeded: "rateLimitExceeded",

  /** Internal server error */
  internalError: "internalError",

  /** Bad request - malformed input */
  badRequest: "badRequest",

  /** Tenant not found or inactive */
  tenantNotFound: "tenantNotFound",

  /** Missing required tenant identifier */
  missingTenant: "missingTenant",

  // === File Handling Errors ===

  /** File exceeds maximum allowed size */
  fileTooLarge: "fileTooLarge",

  /** File type not allowed */
  invalidFileType: "invalidFileType",

  /** Virus detected in uploaded file */
  virusDetected: "virusDetected",

  /** Upload session expired or not found */
  uploadNotFound: "uploadNotFound",

  /** Storage quota exceeded for tenant */
  storageQuotaExceeded: "storageQuotaExceeded",

  // === Authentication Errors ===

  /** Access token has expired */
  tokenExpired: "tokenExpired",

  /** Access token is invalid or malformed */
  tokenInvalid: "tokenInvalid",

  /** Access token has been revoked */
  tokenRevoked: "tokenRevoked",

  /** No authentication token provided */
  missingToken: "missingToken",

  // === Authorization Errors ===

  /** User lacks required permissions */
  insufficientPermissions: "insufficientPermissions",

  /** User is not a member of the tenant */
  notAMember: "notAMember",

  /** Token tenant does not match request tenant */
  tenantMismatch: "tenantMismatch",

  /** Role is in use and cannot be deleted */
  roleInUse: "roleInUse",

  /** Cannot modify system role */
  systemRoleImmutable: "systemRoleImmutable",

  // === Job Errors ===

  /** Job not found or expired */
  jobNotFound: "jobNotFound",

  /** Job cannot be cancelled (already completed/failed) */
  jobNotCancellable: "jobNotCancellable",

  // === Webhook Errors ===

  /** Webhook not found */
  webhookNotFound: "webhookNotFound",

  /** Webhook URL is not reachable or returned error */
  webhookDeliveryFailed: "webhookDeliveryFailed",

  /** Webhook URL must be HTTPS */
  webhookUrlInsecure: "webhookUrlInsecure",

  /** Invalid webhook event type */
  webhookInvalidEventType: "webhookInvalidEventType",

  // === General Errors ===

  /** Service temporarily unavailable */
  serviceUnavailable: "serviceUnavailable",
}
