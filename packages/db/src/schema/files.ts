import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Virus scan status enum
 * - pending: File uploaded, awaiting scan
 * - scanning: Scan in progress
 * - clean: No threats detected
 * - infected: Virus/malware detected
 * - failed: Scan failed
 */
export const virusScanStatusEnum = pgEnum("virus_scan_status", [
  "pending",
  "scanning",
  "clean",
  "infected",
  "failed",
]);

/**
 * File access level enum
 * - private: Requires signed URL with auth
 * - public: Publicly accessible
 */
export const fileAccessEnum = pgEnum("file_access", ["private", "public"]);

/**
 * File kind enum
 * - image: Images (jpg, png, webp, etc)
 * - video: Videos (mp4, webm, etc)
 * - audio: Audio (mp3, wav, etc)
 * - document: Documents (pdf, docx, txt, etc)
 * - archive: Archives (zip, tar, etc)
 * - other: Everything else
 */
export const fileKindEnum = pgEnum("file_kind", [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "other",
]);

/**
 * File status enum
 * - temporary: Uploaded but not attached/persisted (cleanup candidate)
 * - persistent: Attached to a record or explicitly persisted
 */
export const fileStatusEnum = pgEnum("file_status", [
  "temporary",
  "persistent",
]);

/**
 * Files table for uploaded file metadata
 */
export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(), // file_abc123
    orgId: text("org_id").notNull(), // Multi-tenancy

    // File metadata
    filename: text("filename").notNull(), // Sanitized original filename
    size: bigint("size", { mode: "number" }).notNull(), // Size in bytes
    mimeType: text("mime_type").notNull(), // Verified MIME type
    kind: fileKindEnum("kind").notNull(), // Inferred file kind
    storagePath: text("storage_path").notNull(), // Internal storage path

    // User-provided metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Upload info
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),

    // Lifecycle
    status: fileStatusEnum("status").default("temporary").notNull(),

    // Security
    virusScanStatus:
      virusScanStatusEnum("virus_scan_status").default("pending"),
    virusScanCompletedAt: timestamp("virus_scan_completed_at"),
    access: fileAccessEnum("access").default("private"),

    // Soft delete
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by"),
  },
  (table) => ({
    orgIdIdx: index("files_org_id_idx").on(table.orgId),
    uploadedAtIdx: index("files_uploaded_at_idx").on(table.uploadedAt),
    statusIdx: index("files_status_idx").on(table.status),
    virusScanStatusIdx: index("files_virus_scan_status_idx").on(
      table.virusScanStatus
    ),
    // Composite index for common cleanup queries: expired temporary files
    cleanupIdx: index("files_cleanup_idx").on(table.status, table.uploadedAt),
  })
);

/**
 * File uploads table for pending presigned URL uploads
 * Records are created when upload is initiated, deleted when confirmed or expired
 */
export const fileUploads = pgTable("file_uploads", {
  id: text("id").primaryKey(), // upload_abc123
  orgId: text("org_id").notNull(), // Multi-tenancy

  // Upload metadata
  filename: text("filename").notNull(), // Original filename
  contentType: text("content_type").notNull(), // Expected MIME type
  size: bigint("size", { mode: "number" }).notNull(), // Expected size in bytes
  storagePath: text("storage_path").notNull(), // Target storage path

  // User-provided metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  // Audit
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Presigned URL expiration
  confirmedAt: timestamp("confirmed_at"), // When upload was confirmed
});

// Type inference
export type FileRow = typeof files.$inferSelect;
export type NewFileRow = typeof files.$inferInsert;
export type FileUploadRow = typeof fileUploads.$inferSelect;
export type NewFileUploadRow = typeof fileUploads.$inferInsert;
export type VirusScanStatus = (typeof virusScanStatusEnum.enumValues)[number];
export type FileAccess = (typeof fileAccessEnum.enumValues)[number];
export type FileKind = (typeof fileKindEnum.enumValues)[number];
export type FileStatus = (typeof fileStatusEnum.enumValues)[number];
