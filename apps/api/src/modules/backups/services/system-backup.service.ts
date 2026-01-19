import { spawn } from "node:child_process";
import archiver from "archiver";
import { env } from "../../../env";
import type { JobHelpers } from "../../jobs/handlers/types";
import { storageProvider } from "../../storage/storage";
import * as backupsRepo from "../repositories/backups.repository";
import { generateBackupId } from "./backup.service";
import { encryptBuffer } from "./backup-crypto";

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
export interface SystemBackupOptions {
  includeFiles?: boolean;
  encrypt?: boolean;
  password?: string;
}

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

  const updateProgress = async (progress: number, message: string) => {
    if (helpers) {
      await helpers.updateProgress(progress, message);
    }
    await backupsRepo.updateBackupStatus(backupId, "in_progress", {
      metadata: {
        ...(options.encrypt ? { isEncrypted: true } : {}),
        ...(options.includeFiles ? { includesFiles: true } : {}),
        progress,
        status: message,
      },
    });
  };

  const startTime = Date.now();
  if (helpers) {
    await helpers.log("Starting pg_dump...");
  }

  try {
    const dumpBuffer = await runPgDump();
    await updateProgress(50, "Processing dump output...");

    let finalBuffer = dumpBuffer;
    if (includeFiles) {
      await updateProgress(60, "Zipping storage files...");
      finalBuffer = await createZipWithFiles(dumpBuffer);
    }

    let encryptionMeta: {
      iv?: string;
      authTag?: string;
      isEncrypted?: boolean;
    } = {};
    if (encrypt && password) {
      await updateProgress(80, "Encrypting backup...");
      const { encrypted, iv, authTag } = encryptBuffer(finalBuffer, password);
      finalBuffer = encrypted;
      encryptionMeta = { isEncrypted: true, iv, authTag };
    }

    await updateProgress(90, "Uploading to storage...");
    await storageProvider.upload(
      storagePath,
      finalBuffer,
      "application/octet-stream"
    );

    await backupsRepo.updateBackupStatus(backupId, "completed", {
      completedAt: new Date(),
      filePath: storagePath,
      fileSize: finalBuffer.length,
      metadata: {
        duration: Date.now() - startTime,
        includesFiles: includeFiles,
        ...encryptionMeta,
      },
    });

    if (eventBroadcaster) {
      await eventBroadcaster.broadcastToUser(createdBy, {
        type: "job:completed",
        data: { id: backupId, type: "system-backup", orgId: "system" },
        id: `system_backup_completed_${backupId}`,
      });
    }
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
    throw err;
  }
}

function runPgDump(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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
      { env: { ...process.env, PGPASSWORD: dbUrl.password } }
    );

    const chunks: Buffer[] = [];
    dump.stdout.on("data", (chunk) => chunks.push(chunk));

    const errorChunks: Buffer[] = [];
    dump.stderr.on("data", (chunk) => errorChunks.push(chunk));

    dump.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`pg_dump failed: ${Buffer.concat(errorChunks).toString()}`)
        );
      } else {
        resolve(Buffer.concat(chunks));
      }
    });
    dump.on("error", reject);
  });
}

/**
 * Create a ZIP archive containing pg_dump output and all storage files
 */
function createZipWithFiles(dumpBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => reject(err));
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    archive.append(dumpBuffer, { name: "database.dump" });

    appendStorageFiles(archive)
      .then(() => archive.finalize())
      .catch(reject);
  });
}

async function appendStorageFiles(archive: archiver.Archiver): Promise<void> {
  const files = await storageProvider.listFiles("", true);
  for (const file of files) {
    if (file.isDirectory || file.path.startsWith("backups/")) {
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
