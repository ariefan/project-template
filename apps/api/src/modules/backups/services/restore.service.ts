import { db, eq } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { unzip } from "fflate";
import { storageProvider } from "../../storage/storage";
import * as backupsRepo from "../repositories/backups.repository";

// Tables to restore for org backups (same as export)
// Order matters for deletion (children first) and insertion (parents first)
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

// Reverse order for deletion (children before parents)
const ORG_SCOPED_TABLES_REVERSE = [...ORG_SCOPED_TABLES].reverse();

// Map table name to its primary key column
const TABLE_PK_MAP: Record<string, string> = {
  announcements: "id",
  announcementInteractions: "id",
  files: "id",
  fileUploads: "id",
  folders: "id",
  jobs: "id",
  scheduledJobs: "id",
  reportTemplates: "id",
  webhooks: "id",
  webhookDeliveries: "id",
  notifications: "id",
  notificationPreferences: "id",
  examplePosts: "id",
  exampleComments: "id",
  userRoleAssignments: "id",
};

// Map table name to its organization ID column
const TABLE_ORG_ID_MAP: Record<string, string> = {
  announcements: "orgId",
  announcementInteractions: "orgId",
  files: "orgId",
  fileUploads: "orgId",
  folders: "orgId",
  jobs: "orgId",
  scheduledJobs: "organizationId",
  reportTemplates: "orgId",
  webhooks: "orgId",
  webhookDeliveries: "orgId",
  notifications: "orgId",
  notificationPreferences: "orgId",
  examplePosts: "orgId",
  exampleComments: "orgId",
  userRoleAssignments: "tenantId",
};

export type RestoreStrategy = "skip" | "overwrite" | "wipe_and_replace";

export interface RestoreOptions {
  strategy: RestoreStrategy;
}

export interface RestoreResult {
  success: boolean;
  tablesRestored: number;
  rowsRestored: number;
  rowsSkipped: number;
  filesRestored: number;
  errors: string[];
}

/**
 * Restore organization data from a backup
 */
export async function restoreFromBackup(
  organizationId: string,
  backupId: string,
  options: RestoreOptions = { strategy: "skip" }
): Promise<RestoreResult> {
  const result: RestoreResult = {
    success: false,
    tablesRestored: 0,
    rowsRestored: 0,
    rowsSkipped: 0,
    filesRestored: 0,
    errors: [],
  };

  try {
    // Get backup record
    const backup = await backupsRepo.getBackupById(backupId);
    if (!backup || backup.organizationId !== organizationId) {
      throw new Error("Backup not found or access denied");
    }

    if (backup.status !== "completed" || !backup.filePath) {
      throw new Error("Backup is not completed or file is missing");
    }

    // Download and unzip
    const zipBuffer = await storageProvider.download(backup.filePath);
    const files = await unzipBuffer(zipBuffer);

    // Parse data.json
    const dataJson = files["data.json"];
    if (!dataJson) {
      throw new Error("Backup does not contain data.json");
    }

    const backupData = JSON.parse(new TextDecoder().decode(dataJson)) as Record<
      string,
      unknown[]
    >;

    // For wipe_and_replace: delete all org data first
    if (options.strategy === "wipe_and_replace") {
      await wipeOrgData(organizationId);
    }

    // Restore each table
    for (const tableName of ORG_SCOPED_TABLES) {
      const rows = backupData[tableName];
      if (!rows || rows.length === 0) continue;

      try {
        const restored = await restoreTable(tableName, rows, options.strategy);
        result.tablesRestored++;
        result.rowsRestored += restored.inserted;
        result.rowsSkipped += restored.skipped;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Table ${tableName}: ${msg}`);
      }
    }

    // Restore files
    for (const [path, content] of Object.entries(files)) {
      if (path.startsWith("files/") && content) {
        const storagePath = path.replace("files/", "");
        try {
          await storageProvider.upload(
            storagePath,
            Buffer.from(content),
            "application/octet-stream"
          );
          result.filesRestored++;
        } catch {
          result.errors.push(`Failed to restore file: ${storagePath}`);
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    return result;
  }
}

/**
 * Unzip buffer using fflate
 */
async function unzipBuffer(
  buffer: Buffer
): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Wipe all organization data (for wipe_and_replace strategy)
 * Deletes in reverse order to respect foreign key constraints
 */
async function wipeOrgData(organizationId: string): Promise<void> {
  for (const tableName of ORG_SCOPED_TABLES_REVERSE) {
    const tableSchema = schema[tableName as keyof typeof schema];
    const orgIdColumn = TABLE_ORG_ID_MAP[tableName];

    if (!(tableSchema && orgIdColumn)) {
      console.warn(
        `Skipping wipe for table ${tableName}: schema or orgId mapping not found`
      );
      continue;
    }

    try {
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic table access
      const table = tableSchema as any;
      await db.delete(table).where(eq(table[orgIdColumn], organizationId));
    } catch (error) {
      console.error(`Failed to wipe table ${tableName}:`, error);
      // Continue with other tables
    }
  }
}

/**
 * Restore a single table
 */
async function restoreTable(
  tableName: string,
  rows: unknown[],
  strategy: RestoreStrategy
): Promise<{ inserted: number; skipped: number }> {
  const tableSchema = schema[tableName as keyof typeof schema];
  const pkColumn = TABLE_PK_MAP[tableName];

  if (!(tableSchema && pkColumn)) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Dynamic table access
  const table = tableSchema as any;
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic row access
    const typedRow = row as any;
    const pkValue = typedRow[pkColumn];

    if (!pkValue) {
      skipped++;
      continue;
    }

    try {
      if (strategy === "overwrite") {
        // Upsert: try insert, on conflict update
        await db.insert(table).values(typedRow).onConflictDoUpdate({
          target: table[pkColumn],
          set: typedRow,
        });
        inserted++;
      } else {
        // Skip: try insert, on conflict do nothing
        await db.insert(table).values(typedRow).onConflictDoNothing();
        inserted++;
      }
    } catch {
      skipped++;
    }
  }

  return { inserted, skipped };
}
