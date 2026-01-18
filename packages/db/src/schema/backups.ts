import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Backup type enum
 * - organization: Per-tenant JSON export
 * - system: Full pg_dump (admin only)
 */
export const backupTypeEnum = pgEnum("backup_type", ["organization", "system"]);

/**
 * Backup format enum
 * - json: JSON export (org backups)
 * - pg_dump: Native PostgreSQL dump (system backups)
 */
export const backupFormatEnum = pgEnum("backup_format", ["json", "pg_dump"]);

/**
 * Backup status enum
 */
export const backupStatusEnum = pgEnum("backup_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

/**
 * Backups table for tracking backup operations
 */
export const backups = pgTable(
  "backups",
  {
    id: text("id").primaryKey(), // backup_abc123
    organizationId: text("organization_id"), // null for system backups

    // Backup metadata
    type: backupTypeEnum("type").notNull(),
    format: backupFormatEnum("format").notNull(),
    status: backupStatusEnum("status").default("pending").notNull(),

    // File storage
    filePath: text("file_path"), // Path in storage provider
    fileSize: bigint("file_size", { mode: "number" }),
    checksum: text("checksum"), // SHA-256 for integrity

    // Content tracking
    includedTables: jsonb("included_tables").$type<string[]>(),
    metadata: jsonb("metadata").$type<{
      rowCounts?: Record<string, number>;
      filesCount?: number;
      filesSize?: number;
      duration?: number;
      error?: string;
      // Encryption metadata
      isEncrypted?: boolean;
      iv?: string;
      authTag?: string;
      includesFiles?: boolean;
      // Progress tracking
      progress?: number;
      status?: string;
    }>(),

    // Lifecycle
    expiresAt: timestamp("expires_at"),

    // Audit
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    orgIdIdx: index("backups_org_id_idx").on(table.organizationId),
    statusIdx: index("backups_status_idx").on(table.status),
    typeIdx: index("backups_type_idx").on(table.type),
    expiresAtIdx: index("backups_expires_at_idx").on(table.expiresAt),
  })
);

// Type inference
export type BackupRow = typeof backups.$inferSelect;
export type NewBackupRow = typeof backups.$inferInsert;
export type BackupType = (typeof backupTypeEnum.enumValues)[number];
export type BackupFormat = (typeof backupFormatEnum.enumValues)[number];
export type BackupStatus = (typeof backupStatusEnum.enumValues)[number];
