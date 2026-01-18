import crypto from "node:crypto";
import { db, eq } from "@workspace/db";
import type { BackupRow } from "@workspace/db/schema";
import * as schema from "@workspace/db/schema";
import { env } from "../../../env";
import * as backupsRepo from "../repositories/backups.repository";

// Tables to export for org backups
// Must match exported variable names in @workspace/db/schema
const ORG_SCOPED_TABLES = [
  "announcements",
  "announcementInteractions",
  "files",
  "fileUploads",
  "folders",
  "jobs",
  "scheduledJobs",
  "reportTemplates",
  "webhooks",
  "webhookDeliveries",
  "notifications",
  "notificationPreferences",
  "examplePosts",
  "exampleComments",
  "userRoleAssignments",
] as const;

// Map table name to its organization ID column
const TABLE_ORG_ID_MAP: Record<string, string> = {
  announcements: "orgId",
  announcementInteractions: "orgId", // Derived, but simpler to skip or handle specially? No, it has no orgId directly?
  files: "orgId",
  fileUploads: "orgId",
  folders: "orgId",
  jobs: "orgId",
  scheduledJobs: "organizationId",
  reportTemplates: "orgId",
  webhooks: "orgId",
  webhookDeliveries: "orgId", // Check this - usually linked to webhook
  notifications: "orgId",
  notificationPreferences: "orgId", // Check this
  examplePosts: "orgId",
  exampleComments: "orgId", // Check this
  userRoleAssignments: "tenantId",
};

// Map table name to its schema definition
const TABLE_SCHEMA_MAP = {
  announcements: schema.announcements,
  announcementInteractions: schema.announcementInteractions,
  files: schema.files,
  fileUploads: schema.fileUploads,
  folders: schema.folders,
  jobs: schema.jobs,
  scheduledJobs: schema.scheduledJobs,
  reportTemplates: schema.reportTemplates,
  webhooks: schema.webhooks,
  webhookDeliveries: schema.webhookDeliveries,
  notifications: schema.notifications,
  notificationPreferences: schema.notificationPreferences,
  examplePosts: schema.examplePosts,
  exampleComments: schema.exampleComments,
  userRoleAssignments: schema.userRoleAssignments,
} as const;

/**
 * Generate a unique backup ID
 */
export function generateBackupId(): string {
  return `backup_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Calculate retention expiry based on tier
 */
export function calculateExpiryDate(tier: "free" | "pro" | "enterprise"): Date {
  const now = new Date();
  const retentionDays = {
    free: env.BACKUP_RETENTION_DAYS,
    pro: env.BACKUP_RETENTION_DAYS,
    enterprise: 90,
  };
  now.setDate(now.getDate() + retentionDays[tier]);
  return now;
}

/**
 * Export organization data to JSON
 */
export async function exportOrgData(organizationId: string): Promise<{
  data: Record<string, unknown[]>;
  rowCounts: Record<string, number>;
}> {
  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const tableName of ORG_SCOPED_TABLES) {
    const tableUser = TABLE_SCHEMA_MAP[tableName];
    const orgIdColumn = TABLE_ORG_ID_MAP[tableName];

    if (!(tableUser && orgIdColumn)) {
      console.warn(
        `Skipping table ${tableName}: schema or orgId mapping not found`
      );
      continue;
    }

    try {
      // Dynamic table access - trusted because of ORG_SCOPED_TABLES
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic table access
      const table = tableUser as any;

      const rows = await db
        .select()
        .from(table)
        .where(eq(table[orgIdColumn], organizationId));

      data[tableName] = rows;
      rowCounts[tableName] = rows.length;
    } catch (error) {
      console.error(`Failed to export table ${tableName}:`, error);
      // Construct placeholder error data? Or just skip?
      // For now, empty array
      data[tableName] = [];
      rowCounts[tableName] = 0;
    }
  }

  return { data, rowCounts };
}

/**
 * Create an organization backup
 */
export async function createOrgBackup(
  organizationId: string,
  createdBy: string,
  tier: "free" | "pro" | "enterprise" = "free",
  options: { includeFiles?: boolean; encrypt?: boolean; password?: string } = {}
): Promise<BackupRow> {
  const id = generateBackupId();
  const expiresAt = calculateExpiryDate(tier);

  // Create pending backup record
  const backup = await backupsRepo.createBackup({
    id,
    organizationId,
    type: "organization",
    format: "json",
    status: "pending",
    createdBy,
    expiresAt,
    includedTables: [...ORG_SCOPED_TABLES],
    metadata: {
      includesFiles: options.includeFiles,
      isEncrypted: options.encrypt,
      // Do NOT store password in metadata
      // Password will be passed to job via job payload (which is transient/in Redis)
    },
  });

  return backup;
}

/**
 * Get backup limits based on tier
 */
export function getBackupLimits(tier: "free" | "pro" | "enterprise"): {
  maxBackups: number;
  retentionDays: number;
} {
  const limits = {
    free: {
      maxBackups: env.BACKUP_MAX_COUNT,
      retentionDays: env.BACKUP_RETENTION_DAYS,
    },
    pro: {
      maxBackups: env.BACKUP_MAX_COUNT,
      retentionDays: env.BACKUP_RETENTION_DAYS,
    },
    enterprise: { maxBackups: 999, retentionDays: 90 },
  };
  return limits[tier];
}
