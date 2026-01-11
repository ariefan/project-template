import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of legal document
 */
enum LegalDocumentType {
  /** Terms of Service */
  termsOfService: "terms_of_service",
  /** Privacy Policy */
  privacyPolicy: "privacy_policy",
  /** Cookie Policy */
  cookiePolicy: "cookie_policy",
  /** End User License Agreement */
  eula: "eula",
  /** Community Guidelines */
  communityGuidelines: "community_guidelines",
}

/**
 * Status of a legal document or version
 */
enum LegalDocumentStatus {
  /** Draft - not visible to users */
  draft: "draft",
  /** Published - active and visible */
  published: "published",
  /** Archived - no longer active, kept for records */
  archived: "archived",
}

// ============================================================================
// MODELS
// ============================================================================

/**
 * Legal document metadata (container for versions)
 */
model LegalDocument {
  /** Unique document identifier */
  @example("ldoc_abc123")
  id: string;

  /** Document type */
  type: LegalDocumentType;

  /** URL-friendly slug */
  @example("terms-of-service")
  slug: string;

  /** Locale/language code (ISO 639-1) */
  @example("en")
  locale: string;

  /** Current status */
  status: LegalDocumentStatus;

  /** Currently active version ID (if published) */
  activeVersionId?: string;

  /** User who created this document */
  createdBy: string;

  /** Creation timestamp */
  createdAt: utcDateTime;

  /** Last update timestamp */
  updatedAt: utcDateTime;

  /** Soft delete timestamp */
  deletedAt?: utcDateTime;
}

/**
 * Legal document version with content
 */
model LegalDocumentVersion {
  /** Unique version identifier */
  @example("ldver_xyz789")
  id: string;

  /** Parent document ID */
  documentId: string;

  /** Version number (semantic: 1, 2, 3...) */
  @example(1)
  version: int32;

  /** Version title */
  @example("Terms of Service v1.0")
  title: string;

  /** Full content (Markdown supported) */
  content: string;

  /** Summary of changes from previous version */
  changelog?: string;

  /** Version status */
  status: LegalDocumentStatus;

  /** When this version was published */
  publishedAt?: utcDateTime;

  /** Scheduled publish time (for future publishing) */
  scheduledAt?: utcDateTime;

  /** Whether users must re-accept when this version is published */
  requiresReAcceptance: boolean;

  /** User who created this version */
  createdBy: string;

  /** Creation timestamp */
  createdAt: utcDateTime;

  /** Last update timestamp */
  updatedAt: utcDateTime;

  /** Archive timestamp */
  archivedAt?: utcDateTime;
}

/**
 * User acceptance record for compliance tracking
 */
model LegalDocumentAcceptance {
  /** Unique acceptance identifier */
  @example("ldacc_def456")
  id: string;

  /** User who accepted */
  userId: string;

  /** Version that was accepted */
  versionId: string;

  /** Document ID (denormalized for queries) */
  documentId: string;

  /** Document type (denormalized for queries) */
  documentType: LegalDocumentType;

  /** When the user accepted */
  acceptedAt: utcDateTime;

  /** IP address at time of acceptance */
  @example("192.168.1.1")
  ipAddress?: string;

  /** User agent string at time of acceptance */
  userAgent?: string;
}

/**
 * Audit log entry for document changes
 */
model LegalDocumentAuditLog {
  /** Unique log identifier */
  id: string;

  /** Document ID */
  documentId: string;

  /** Version ID (if applicable) */
  versionId?: string;

  /** Action performed */
  @example("version.published")
  action: string;

  /** User who performed the action */
  actorId: string;

  /** Actor name (denormalized) */
  actorName?: string;

  /** JSON of changes made */
  changes?: string;

  /** Timestamp */
  createdAt: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Create a new legal document
 */
model CreateLegalDocumentRequest {
  /** Document type */
  type: LegalDocumentType;

  /** URL-friendly slug (auto-generated if not provided) */
  @minLength(1)
  @maxLength(100)
  slug?: string;

  /** Locale/language code */
  @minLength(2)
  @maxLength(10)
  @example("en")
  locale?: string;

  /** Initial version title */
  @minLength(1)
  @maxLength(200)
  title: string;

  /** Initial version content */
  @minLength(1)
  content: string;
}

/**
 * Update document metadata
 */
model UpdateLegalDocumentRequest {
  /** URL-friendly slug */
  @minLength(1)
  @maxLength(100)
  slug?: string;

  /** Locale/language code */
  @minLength(2)
  @maxLength(10)
  locale?: string;
}

/**
 * Create a new version of a document
 */
model CreateLegalDocumentVersionRequest {
  /** Version title */
  @minLength(1)
  @maxLength(200)
  title: string;

  /** Full content */
  @minLength(1)
  content: string;

  /** Summary of changes */
  @maxLength(2000)
  changelog?: string;

  /** Whether users must re-accept */
  requiresReAcceptance?: boolean;
}

/**
 * Update a draft version
 */
model UpdateLegalDocumentVersionRequest {
  /** Version title */
  @minLength(1)
  @maxLength(200)
  title?: string;

  /** Full content */
  @minLength(1)
  content?: string;

  /** Summary of changes */
  @maxLength(2000)
  changelog?: string;

  /** Whether users must re-accept */
  requiresReAcceptance?: boolean;
}

/**
 * Publish a version
 */
model PublishVersionRequest {
  /** Schedule for future (optional) */
  scheduledAt?: utcDateTime;
}

/**
 * Record user acceptance
 */
model AcceptLegalDocumentRequest {
  /** Document type being accepted */
  documentType: LegalDocumentType;

  /** Version ID being accepted */
  versionId: string;
}

/**
 * Export acceptances request (for compliance)
 */
model ExportAcceptancesRequest {
  /** Document ID to export acceptances for */
  documentId?: string;

  /** Version ID to export acceptances for */
  versionId?: string;

  /** Start date filter */
  startDate?: utcDateTime;

  /** End date filter */
  endDate?: utcDateTime;

  /** Export format */
  format?: "csv" | "json";
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single legal document response
 */
model LegalDocumentResponse {
  data: LegalDocument;
  meta: ResponseMeta;
}

/**
 * Legal document with active version details
 */
model LegalDocumentWithVersion {
  ...LegalDocument;

  /** Active version details */
  activeVersion?: LegalDocumentVersion;

  /** Total version count */
  versionCount?: int32;
}

/**
 * Document with version response
 */
model LegalDocumentWithVersionResponse {
  data: LegalDocumentWithVersion;
  meta: ResponseMeta;
}

/**
 * Legal document list response
 */
model LegalDocumentListResponse {
  data: LegalDocumentWithVersion[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Single version response
 */
model LegalDocumentVersionResponse {
  data: LegalDocumentVersion;
  meta: ResponseMeta;
}

/**
 * Version list response
 */
model LegalDocumentVersionListResponse {
  data: LegalDocumentVersion[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Acceptance response
 */
model LegalDocumentAcceptanceResponse {
  data: LegalDocumentAcceptance;
  meta: ResponseMeta;
}

/**
 * Acceptance list response
 */
model LegalDocumentAcceptanceListResponse {
  data: LegalDocumentAcceptance[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Audit log list response
 */
model LegalDocumentAuditLogListResponse {
  data: LegalDocumentAuditLog[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Check for pending acceptances
 */
model PendingAcceptancesResponse {
  data: {
    /** Whether there are documents requiring acceptance */
    hasPending: boolean;

    /** List of documents requiring acceptance */
    pendingDocuments: LegalDocumentWithVersion[];
  };
  meta: ResponseMeta;
}

/**
 * User's acceptance history
 */
model MyAcceptancesResponse {
  data: {
    /** User ID */
    userId: string;

    /** List of acceptances */
    acceptances: LegalDocumentAcceptance[];
  };
  meta: ResponseMeta;
}

/**
 * Active public document response (for users)
 */
model ActiveLegalDocumentResponse {
  data: {
    /** Document ID */
    id: string;

    /** Document type */
    type: LegalDocumentType;

    /** Version ID */
    versionId: string;

    /** Version number */
    version: int32;

    /** Title */
    title: string;

    /** Content */
    content: string;

    /** When published */
    publishedAt: utcDateTime;

    /** Whether user has accepted this version */
    hasAccepted?: boolean;

    /** When user accepted (if applicable) */
    acceptedAt?: utcDateTime;
  };
  meta: ResponseMeta;
}

/**
 * List of active documents for public consumption
 */
model ActiveLegalDocumentsListResponse {
  data: {
    /** Document ID */
    id: string;

    /** Document type */
    type: LegalDocumentType;

    /** Version ID */
    versionId: string;

    /** Title */
    title: string;

    /** When published */
    publishedAt: utcDateTime;

    /** Whether user has accepted */
    hasAccepted?: boolean;
  }[];
  meta: ResponseMeta;
}
