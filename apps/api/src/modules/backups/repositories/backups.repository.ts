import { getDefaultDb } from "@workspace/db";
import {
  type BackupRow,
  type BackupStatus,
  backups,
  type NewBackupRow,
} from "@workspace/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";

/**
 * Create a new backup record
 */
export async function createBackup(data: NewBackupRow): Promise<BackupRow> {
  const db = getDefaultDb();
  const [backup] = await db.insert(backups).values(data).returning();
  if (!backup) {
    throw new Error("Failed to create backup record");
  }
  return backup;
}

/**
 * Get backup by ID
 */
export async function getBackupById(id: string): Promise<BackupRow | null> {
  const db = getDefaultDb();
  const [backup] = await db.select().from(backups).where(eq(backups.id, id));
  return backup ?? null;
}

/**
 * List backups for an organization
 */
export async function listBackups(
  organizationId: string,
  options?: { limit?: number; offset?: number }
): Promise<BackupRow[]> {
  const db = getDefaultDb();
  const { limit = 20, offset = 0 } = options ?? {};

  return await db
    .select()
    .from(backups)
    .where(eq(backups.organizationId, organizationId))
    .orderBy(desc(backups.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * List system backups (admin only)
 */
export async function listSystemBackups(options?: {
  limit?: number;
  offset?: number;
}): Promise<BackupRow[]> {
  const db = getDefaultDb();
  const { limit = 20, offset = 0 } = options ?? {};

  return await db
    .select()
    .from(backups)
    .where(eq(backups.type, "system"))
    .orderBy(desc(backups.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update backup status
 */
export async function updateBackupStatus(
  id: string,
  status: BackupStatus,
  updates?: Partial<BackupRow>
): Promise<BackupRow | null> {
  const db = getDefaultDb();
  const [backup] = await db
    .update(backups)
    .set({ status, ...updates })
    .where(eq(backups.id, id))
    .returning();
  return backup ?? null;
}

/**
 * Delete a backup
 */
export async function deleteBackup(id: string): Promise<boolean> {
  const db = getDefaultDb();
  const result = await db.delete(backups).where(eq(backups.id, id));
  return (result.rowCount ?? 0) > 0;
}

/**
 * Find expired backups for cleanup
 */
export async function findExpiredBackups(): Promise<BackupRow[]> {
  const db = getDefaultDb();
  const now = new Date();

  return await db
    .select()
    .from(backups)
    .where(and(eq(backups.status, "completed"), lt(backups.expiresAt, now)));
}

/**
 * Count backups for an organization
 */
export async function countBackups(organizationId: string): Promise<number> {
  const db = getDefaultDb();
  const result = await db
    .select()
    .from(backups)
    .where(eq(backups.organizationId, organizationId));
  return result.length;
}
