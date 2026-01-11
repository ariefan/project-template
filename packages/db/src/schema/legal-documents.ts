import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of legal document
 */
export const legalDocumentTypeEnum = pgEnum("legal_document_type", [
  "terms_of_service",
  "privacy_policy",
  "cookie_policy",
  "eula",
  "community_guidelines",
]);

/**
 * Status of a legal document or version
 */
export const legalDocumentStatusEnum = pgEnum("legal_document_status", [
  "draft",
  "published",
  "archived",
]);

// ============================================================================
// LEGAL DOCUMENTS TABLE (Container for versions)
// ============================================================================

/**
 * Legal document metadata - container for versions
 * One document per type + locale combination
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: text("id").primaryKey(), // format: ldoc_{randomString}

    /** Document type (terms_of_service, privacy_policy, etc.) */
    type: legalDocumentTypeEnum("type").notNull(),

    /** URL-friendly slug */
    slug: text("slug").notNull(),

    /** Locale/language code (ISO 639-1, e.g., 'en', 'id') */
    locale: text("locale").notNull().default("en"),

    /** Current status */
    status: legalDocumentStatusEnum("status").notNull().default("draft"),

    /** Currently active version ID */
    activeVersionId: text("active_version_id"),

    /** Audit */
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("legal_documents_type_idx").on(table.type),
    index("legal_documents_type_locale_idx").on(table.type, table.locale),
    index("legal_documents_slug_idx").on(table.slug),
    index("legal_documents_status_idx").on(table.status),
    uniqueIndex("legal_documents_type_locale_unique").on(
      table.type,
      table.locale
    ),
  ]
);

// ============================================================================
// LEGAL DOCUMENT VERSIONS TABLE
// ============================================================================

/**
 * Individual versions of a legal document
 * Each version has its own content, changelog, and publish state
 */
export const legalDocumentVersions = pgTable(
  "legal_document_versions",
  {
    id: text("id").primaryKey(), // format: ldver_{randomString}

    /** Parent document ID */
    documentId: text("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),

    /** Version number (1, 2, 3...) */
    version: integer("version").notNull(),

    /** Version title */
    title: text("title").notNull(),

    /** Full content (Markdown) */
    content: text("content").notNull(),

    /** Summary of changes from previous version */
    changelog: text("changelog"),

    /** Version status */
    status: legalDocumentStatusEnum("status").notNull().default("draft"),

    /** When this version was published */
    publishedAt: timestamp("published_at", { withTimezone: true }),

    /** Scheduled publish time */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    /** Whether users must re-accept when this version is published */
    requiresReAcceptance: boolean("requires_re_acceptance")
      .notNull()
      .default(false),

    /** Audit */
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("legal_document_versions_document_id_idx").on(table.documentId),
    index("legal_document_versions_status_idx").on(table.status),
    index("legal_document_versions_published_at_idx").on(table.publishedAt),
    uniqueIndex("legal_document_versions_doc_version_unique").on(
      table.documentId,
      table.version
    ),
  ]
);

// ============================================================================
// LEGAL DOCUMENT ACCEPTANCES TABLE
// ============================================================================

/**
 * Tracks user acceptances of legal documents
 * One record per user per version for compliance tracking
 */
export const legalDocumentAcceptances = pgTable(
  "legal_document_acceptances",
  {
    id: text("id").primaryKey(), // format: ldacc_{randomString}

    /** User who accepted */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Version that was accepted */
    versionId: text("version_id")
      .notNull()
      .references(() => legalDocumentVersions.id, { onDelete: "cascade" }),

    /** Document ID (denormalized for queries) */
    documentId: text("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),

    /** Document type (denormalized for queries) */
    documentType: legalDocumentTypeEnum("document_type").notNull(),

    /** When the user accepted */
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** IP address at time of acceptance */
    ipAddress: text("ip_address"),

    /** User agent string at time of acceptance */
    userAgent: text("user_agent"),
  },
  (table) => [
    index("legal_document_acceptances_user_id_idx").on(table.userId),
    index("legal_document_acceptances_version_id_idx").on(table.versionId),
    index("legal_document_acceptances_document_id_idx").on(table.documentId),
    index("legal_document_acceptances_document_type_idx").on(
      table.documentType
    ),
    index("legal_document_acceptances_accepted_at_idx").on(table.acceptedAt),
    uniqueIndex("legal_document_acceptances_user_version_unique").on(
      table.userId,
      table.versionId
    ),
  ]
);

// ============================================================================
// LEGAL DOCUMENT AUDIT LOGS TABLE
// ============================================================================

/**
 * Audit log for document changes
 * Tracks who edited what, when
 */
export const legalDocumentAuditLogs = pgTable(
  "legal_document_audit_logs",
  {
    id: text("id").primaryKey(), // format: ldaudit_{randomString}

    /** Document ID */
    documentId: text("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),

    /** Version ID (if applicable) */
    versionId: text("version_id").references(() => legalDocumentVersions.id, {
      onDelete: "set null",
    }),

    /** Action performed (e.g., version.created, version.published) */
    action: text("action").notNull(),

    /** User who performed the action */
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    /** Actor name (denormalized for display) */
    actorName: text("actor_name"),

    /** JSON of changes made */
    changes: text("changes"),

    /** Timestamp */
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("legal_document_audit_logs_document_id_idx").on(table.documentId),
    index("legal_document_audit_logs_actor_id_idx").on(table.actorId),
    index("legal_document_audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LegalDocumentRow = typeof legalDocuments.$inferSelect;
export type NewLegalDocumentRow = typeof legalDocuments.$inferInsert;
export type LegalDocumentType =
  (typeof legalDocumentTypeEnum.enumValues)[number];
export type LegalDocumentStatus =
  (typeof legalDocumentStatusEnum.enumValues)[number];

export type LegalDocumentVersionRow = typeof legalDocumentVersions.$inferSelect;
export type NewLegalDocumentVersionRow =
  typeof legalDocumentVersions.$inferInsert;

export type LegalDocumentAcceptanceRow =
  typeof legalDocumentAcceptances.$inferSelect;
export type NewLegalDocumentAcceptanceRow =
  typeof legalDocumentAcceptances.$inferInsert;

export type LegalDocumentAuditLogRow =
  typeof legalDocumentAuditLogs.$inferSelect;
export type NewLegalDocumentAuditLogRow =
  typeof legalDocumentAuditLogs.$inferInsert;
