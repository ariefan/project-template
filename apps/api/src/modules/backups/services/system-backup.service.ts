import { spawn } from "node:child_process";
import archiver from "archiver";
import { env } from "../../../env";
import type { JobHelpers } from "../../jobs/handlers/types";
import { storageProvider } from "../../storage/storage";
import * as backupsRepo from "../repositories/backups.repository";
import { generateBackupId } from "./backup.service";

let eventBroadcaster: import("@workspace/realtime").EventBroadcaster | null =
  null;

export function initBroadcaster(
  broadcaster: import("@workspace/realtime").EventBroadcaster
): void {
  eventBroadcaster = broadcaster;
}

/**
 * Options for system backup creation
 */
import { encryptBuffer } from "./backup-crypto";

/**
 * Options for system backup creation
 */
export interface SystemBackupOptions {
  includeFiles?: boolean;
  encrypt?: boolean;
  password?: string;
}

// encryptBuffer and decryptBuffer removed (imported)

/**
 * Create a system-wide backup record (does not start backup)
 */
export async function createSystemBackupRecord(
  createdBy: string
): Promise<string> {
  const backupId = generateBackupId();

  // Create initial record
  await backupsRepo.createBackup({
    id: backupId,
    type: "system",
    format: "pg_dump",
    status: "in_progress",
    createdBy,
    organizationId: null,
    includedTables: [],
  });

  return backupId;
}

/**
 * Process the system backup (logic extracted for job handler)
 */
export async function processSystemBackup(
  backupId: string,
  createdBy: string,
  options: SystemBackupOptions = {},
  helpers?: JobHelpers
): Promise<void> {
  const { includeFiles = false, encrypt = false, password } = options;

  if (encrypt && !password) {
    throw new Error("Password is required for encrypted backups");
  }

  const ext = includeFiles ? "zip" : "dump";
  const fileName = `system-backup-${backupId}-${Date.now()}.${ext}`;
  const storagePath = `backups/system/${fileName}`;

  /* Sync progress to both Job and Backup entity */
  const updateProgress = async (progress: number, message: string) => {
    if (helpers) await helpers.updateProgress(progress, message);
    await backupsRepo.updateBackupStatus(backupId, "in_progress", {
      metadata: {
        // merge existing metadata
        ...(options.encrypt ? { isEncrypted: true } : {}),
        ...(options.includeFiles ? { includesFiles: true } : {}),
        progress, // Sync progress for UI
        status: message,
      },
    });
  };

  const startTime = Date.now();
  if (helpers) await helpers.log("Starting pg_dump...");

  return new Promise((resolve, reject) => {
    try {
      const dbUrl = new URL(env.DATABASE_URL);

      const dump = spawn(
        "pg_dump",
        [
          "-h",
          dbUrl.hostname,
          "-p",
          dbUrl.port || "5432",
          "-U",
          dbUrl.username,
          "-d",
          dbUrl.pathname.slice(1),
          "-F",
          "c",
          "--no-owner",
          "--no-acl",
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: dbUrl.password,
          },
        }
      );

      const chunks: Buffer[] = [];
      dump.stdout.on("data", (chunk) => chunks.push(chunk));

      const errorChunks: Buffer[] = [];
      dump.stderr.on("data", (chunk) => errorChunks.push(chunk));

      dump.on("close", async (code) => {
        if (code !== 0) {
          const errorMsg = Buffer.concat(errorChunks).toString();
          await backupsRepo.updateBackupStatus(backupId, "failed", {
            metadata: {
              error: `pg_dump failed with code ${code}: ${errorMsg}`,
            },
          });

          // Fallback event if helpers/job system doesn't catch it
          if (eventBroadcaster) {
            await eventBroadcaster.broadcastToUser(createdBy, {
              type: "job:failed",
              data: {
                id: backupId,
                type: "system-backup",
                orgId: "system",
                error: `pg_dump failed: ${errorMsg}`,
              },
              id: `system_backup_failed_${backupId}`,
            });
          }

          reject(new Error(`pg_dump failed: ${errorMsg}`));
          return;
        }

        try {
          await updateProgress(50, "Processing dump output...");

          let finalBuffer: Buffer;
          const dumpBuffer = Buffer.concat(chunks);

          if (includeFiles) {
            await updateProgress(60, "Zipping storage files...");
            // Create ZIP with dump + storage files
            finalBuffer = await createZipWithFiles(dumpBuffer);
          } else {
            finalBuffer = dumpBuffer;
          }

          // Encrypt if requested
          let encryptionMeta: {
            iv?: string;
            authTag?: string;
            isEncrypted?: boolean;
          } = {};
          if (encrypt && password) {
            await updateProgress(80, "Encrypting backup...");
            const { encrypted, iv, authTag } = encryptBuffer(
              finalBuffer,
              password
            );
            finalBuffer = encrypted;
            encryptionMeta = { isEncrypted: true, iv, authTag };
          }

          await updateProgress(90, "Uploading to storage...");
          const fileSize = finalBuffer.length;
          await storageProvider.upload(
            storagePath,
            finalBuffer,
            "application/octet-stream"
          );

          await backupsRepo.updateBackupStatus(backupId, "completed", {
            completedAt: new Date(),
            filePath: storagePath,
            fileSize,
            metadata: {
              duration: Date.now() - startTime,
              includesFiles: includeFiles,
              ...encryptionMeta,
            },
          });

          if (eventBroadcaster) {
            await eventBroadcaster.broadcastToUser(createdBy, {
              type: "job:completed",
              data: {
                id: backupId,
                type: "system-backup",
                orgId: "system",
              },
              id: `system_backup_completed_${backupId}`,
            });
          }

          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await backupsRepo.updateBackupStatus(backupId, "failed", {
            metadata: { error: message },
          });

          if (eventBroadcaster) {
            await eventBroadcaster.broadcastToUser(createdBy, {
              type: "job:failed",
              data: {
                id: backupId,
                type: "system-backup",
                orgId: "system",
                error: message,
              },
              id: `system_backup_failed_${backupId}`,
            });
          }
          reject(err);
        }
      });

      dump.on("error", async (err) => {
        await backupsRepo.updateBackupStatus(backupId, "failed", {
          metadata: { error: err.message },
        });

        if (eventBroadcaster) {
          await eventBroadcaster.broadcastToUser(createdBy, {
            type: "job:failed",
            data: {
              id: backupId,
              type: "system-backup",
              orgId: "system",
              error: err.message,
            },
            id: `system_backup_failed_${backupId}`,
          });
        }
        reject(err);
      });
    } catch (error) {
      console.error("System backup startup error:", error);
      reject(error);
    }
  });
}

/**
 * Deprecated: Legacy method, use createSystemBackupRecord + processSystemBackup via job queue
 * Left here for compatibility if needed, but should be avoided.
 */
export async function createSystemBackup(
  createdBy: string,
  options: SystemBackupOptions = {}
): Promise<string> {
  const id = await createSystemBackupRecord(createdBy);
  // Fire and forget
  processSystemBackup(id, createdBy, options).catch(console.error);
  return id;
}

/**
 * Create a ZIP archive containing pg_dump output and all storage files
 */
async function createZipWithFiles(dumpBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => reject(err));
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    // Add pg_dump output
    archive.append(dumpBuffer, { name: "database.dump" });

    // Add all storage files recursively
    (async () => {
      try {
        const files = await storageProvider.listFiles("", true);
        for (const file of files) {
          if (!file.isDirectory) {
            // Exclude backups folder itself to avoid recursion (the "Inception" bug)
            if (file.path.startsWith("backups/")) {
              continue;
            }

            try {
              const content = await storageProvider.download(file.path);
              archive.append(content, { name: `storage/${file.path}` });
            } catch {
              // Skip files that can't be downloaded
            }
          }
        }
        archive.finalize();
      } catch (err) {
        reject(err);
      }
    })();
  });
}
