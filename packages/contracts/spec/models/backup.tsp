/**
 * ============================================================================
 * BACKUP MODEL - Data Backup & Restore
 * ============================================================================
 *
 * Multi-tenant backup system supporting:
 * - Organization-level JSON exports
 * - Full system pg_dump (admin only)
 * - Retention policies and auto-cleanup
 *
 * @see docs/api-guide/backups
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Backup type
 */
enum BackupType {
  /** Organization data export (JSON) */
  organization: "organization",

  /** Full system backup (pg_dump) */
  system: "system",
}

/**
 * Backup format
 */
enum BackupFormat {
  /** JSON export (for org backups) */
  json: "json",

  /** Native PostgreSQL dump */
  pgDump: "pg_dump",
}

/**
 * Backup status
 */
enum BackupStatus {
  /** Backup is queued */
  pending: "pending",

  /** Backup is being created */
  inProgress: "in_progress",

  /** Backup completed successfully */
  completed: "completed",

  /** Backup failed */
  failed: "failed",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Backup metadata
 */
model BackupMetadata {
  /** Row counts per table */
  rowCounts?: Record<int32>;

  /** Number of files included */
  filesCount?: int32;

  /** Total size of files */
  filesSize?: int64;

  /** Duration in milliseconds */
  duration?: int64;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Backup resource
 *
 * Represents a point-in-time snapshot of organization or system data.
 */
model Backup {
  /** Unique backup identifier */
  @example("backup_abc123")
  id: string;

  /** Organization ID (null for system backups) */
  @example("org_xyz789")
  organizationId?: string;

  /** Backup type */
  type: BackupType;

  /** Backup format */
  format: BackupFormat;

  /** Current status */
  status: BackupStatus;

  /** Path in storage */
  filePath?: string;

  /** File size in bytes */
  fileSize?: int64;

  /** SHA-256 checksum */
  checksum?: string;

  /** Tables included in backup */
  includedTables?: string[];

  /** Backup metadata */
  metadata?: BackupMetadata;

  /** When backup expires (for auto-cleanup) */
  expiresAt?: utcDateTime;

  /** Who created the backup */
  @example("usr_123")
  createdBy: string;

  /** When the backup was created */
  createdAt: utcDateTime;

  /** When the backup completed */
  completedAt?: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Create backup request
 */
model CreateBackupRequest {
  /** Optional description */
  description?: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single backup response
 */
model BackupResponse {
  data: Backup;
  meta: ResponseMeta;
}

/**
 * Backup list response
 */
model BackupListResponse {
  data: Backup[];
  pagination: Pagination;
  meta: ResponseMeta;
}
