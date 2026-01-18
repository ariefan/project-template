import crypto from "node:crypto";
import type { BackupRow } from "@workspace/db/schema";
import * as backupsRepo from "../repositories/backups.repository";

// Tables to export for org backups (filtered by organizationId)
const ORG_SCOPED_TABLES = [
  "announcements",
  "announcement_interactions",
  "files",
  "file_uploads",
  "folders",
  "jobs",
  "scheduled_jobs",
  "report_templates",
  "webhooks",
  "webhook_deliveries",
  "notifications",
  "notification_preferences",
  "example_posts",
  "example_comments",
  "user_role_assignments",
] as const;

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
  const retentionDays = { free: 7, pro: 30, enterprise: 90 };
  now.setDate(now.getDate() + retentionDays[tier]);
  return now;
}

/**
 * Export organization data to JSON
 *
 * TODO: Implement actual table queries when production-ready
 */
export function exportOrgData(_organizationId: string): {
  data: Record<string, unknown[]>;
  rowCounts: Record<string, number>;
} {
  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  // This is a simplified implementation
  // In production, you'd iterate through ORG_SCOPED_TABLES
  // and query each one with the orgId filter

  // For now, return empty structure - actual implementation
  // would use db.select().from(table).where(eq(table.orgId, organizationId))
  for (const tableName of ORG_SCOPED_TABLES) {
    data[tableName] = [];
    rowCounts[tableName] = 0;
  }

  return { data, rowCounts };
}

/**
 * Create an organization backup
 */
export async function createOrgBackup(
  organizationId: string,
  createdBy: string,
  tier: "free" | "pro" | "enterprise" = "free"
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
    free: { maxBackups: 3, retentionDays: 7 },
    pro: { maxBackups: 10, retentionDays: 30 },
    enterprise: { maxBackups: 999, retentionDays: 90 },
  };
  return limits[tier];
}
