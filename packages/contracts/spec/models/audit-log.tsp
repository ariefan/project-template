/**
 * ============================================================================
 * AUDIT LOG MODEL
 * ============================================================================
 *
 * Tamper-proof audit logging for compliance and security.
 *
 * Use cases:
 * - Security - Detect and investigate breaches
 * - Compliance - SOC2, HIPAA, GDPR requirements
 * - Forensics - Reconstruct what happened
 *
 * @see docs/api-guide/06-quality/01-audit-logging.md
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Actor type - who performed the action
 */
enum AuditActorType {
  /** Human user */
  user: "user",

  /** Service account / API key */
  service: "service",

  /** System automated action */
  system: "system",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Audit log entry
 *
 * Immutable record of an action in the system.
 */
model AuditLog {
  /** Unique event identifier (format: evt_abc123) */
  @example("evt_abc123")
  eventId: string;

  /** Event type (format: resource.action) */
  @example("user.updated")
  eventType: string;

  /** When the event occurred */
  timestamp: utcDateTime;

  /** Tenant where the event occurred */
  @example("org_xyz789")
  tenantId: string;

  /** Who performed the action */
  actor: AuditActor;

  /** What resource was affected */
  resource: AuditResource;

  /** Changes made (for update operations) */
  changes?: Record<AuditChange>;

  /** Full resource state before the action (for deletes, sensitive ops) */
  resourceBefore?: Record<unknown>;

  /** Full resource state after the action (for creates, sensitive ops) */
  resourceAfter?: Record<unknown>;

  /** Additional context */
  metadata?: AuditMetadata;
}

/**
 * Actor who performed the action
 */
model AuditActor {
  /** Type of actor */
  type: AuditActorType;

  /** Actor ID (user ID, service account ID, or "system") */
  @example("usr_123")
  id: string;

  /** Actor email (for users) */
  @example("admin@example.com")
  email?: string;

  /** IP address of the actor */
  @example("192.168.1.1")
  ipAddress?: string;

  /** User agent string */
  userAgent?: string;
}

/**
 * Resource affected by the action
 */
model AuditResource {
  /** Resource type */
  @example("user")
  type: string;

  /** Resource ID */
  @example("usr_456")
  id: string;

  /** API endpoint that was called */
  @example("/v1/orgs/org_xyz789/users/usr_456")
  endpoint?: string;

  /** HTTP method used */
  @example("PATCH")
  method?: string;
}

/**
 * Change record for a single field
 */
model AuditChange {
  /** Value before the change */
  old: unknown;

  /** Value after the change */
  new: unknown;
}

/**
 * Additional metadata for the audit event
 */
model AuditMetadata {
  /** Request ID for correlation */
  @example("req_7k3m9x2p4b")
  requestId?: string;

  /** Session ID */
  @example("ses_def456")
  sessionId?: string;

  /** Reason for the action (if provided) */
  reason?: string;

  /** Additional context-specific data */
  extra?: Record<unknown>;
}

// ============================================================================
// QUERY MODELS
// ============================================================================

/**
 * Audit log query filters
 */
model AuditLogFilters {
  /** Filter by event type (exact match or prefix) */
  eventType?: string;

  /** Filter by actor ID */
  actorId?: string;

  /** Filter by actor type */
  actorType?: AuditActorType;

  /** Filter by resource type */
  resourceType?: string;

  /** Filter by resource ID */
  resourceId?: string;

  /** Filter events after this timestamp */
  timestampAfter?: utcDateTime;

  /** Filter events before this timestamp */
  timestampBefore?: utcDateTime;

  /** Filter by IP address */
  ipAddress?: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single audit log response
 */
model AuditLogResponse {
  data: AuditLog;
  meta: ResponseMeta;
}

/**
 * Audit log list response
 */
model AuditLogListResponse {
  data: AuditLog[];
  pagination: Pagination;
  meta: ResponseMeta;
}
