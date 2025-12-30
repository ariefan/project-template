import { db } from "@workspace/db";
import {
  type FileAccess,
  type FileRow,
  type FileUploadRow,
  files,
  fileUploads,
  type NewFileRow,
  type NewFileUploadRow,
  type VirusScanStatus,
} from "@workspace/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

export interface ListFilesOptions {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  access?: FileAccess;
  includeDeleted?: boolean;
}

export interface ListFilesResult {
  data: FileRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Create a new file record
 */
export async function createFile(data: NewFileRow): Promise<FileRow> {
  const [file] = await db.insert(files).values(data).returning();
  if (!file) {
    throw new Error("Failed to create file record");
  }
  return file;
}

/**
 * Get a file by ID
 */
export async function getFileById(
  orgId: string,
  fileId: string,
  includeDeleted = false
): Promise<FileRow | null> {
  const conditions = [eq(files.id, fileId), eq(files.orgId, orgId)];

  if (!includeDeleted) {
    conditions.push(eq(files.isDeleted, false));
  }

  const [file] = await db
    .select()
    .from(files)
    .where(and(...conditions))
    .limit(1);

  return file ?? null;
}

/**
 * List files with pagination and filtering
 */
export async function listFiles(
  orgId: string,
  options: ListFilesOptions = {}
): Promise<ListFilesResult> {
  const {
    page = 1,
    pageSize = 50,
    mimeType,
    access,
    includeDeleted = false,
  } = options;

  // Build where conditions
  const conditions = [eq(files.orgId, orgId)];

  if (!includeDeleted) {
    conditions.push(eq(files.isDeleted, false));
  }
  if (mimeType) {
    conditions.push(eq(files.mimeType, mimeType));
  }
  if (access) {
    conditions.push(eq(files.access, access));
  }

  const whereClause = and(...conditions);

  // Get total count
  const allFiles = await db.select().from(files).where(whereClause);
  const totalCount = allFiles.length;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(files)
    .where(whereClause)
    .orderBy(desc(files.uploadedAt))
    .limit(pageSize)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Soft delete a file
 */
export async function softDeleteFile(
  orgId: string,
  fileId: string,
  deletedBy: string
): Promise<FileRow | null> {
  const [updated] = await db
    .update(files)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    })
    .where(and(eq(files.id, fileId), eq(files.orgId, orgId)))
    .returning();

  return updated ?? null;
}

/**
 * Permanently delete a file
 */
export async function hardDeleteFile(
  orgId: string,
  fileId: string
): Promise<FileRow | null> {
  const [deleted] = await db
    .delete(files)
    .where(and(eq(files.id, fileId), eq(files.orgId, orgId)))
    .returning();

  return deleted ?? null;
}

/**
 * Update file virus scan status
 */
export async function updateVirusScanStatus(
  fileId: string,
  status: VirusScanStatus
): Promise<FileRow | null> {
  const [updated] = await db
    .update(files)
    .set({
      virusScanStatus: status,
      virusScanCompletedAt: new Date(),
    })
    .where(eq(files.id, fileId))
    .returning();

  return updated ?? null;
}

/**
 * Update file access level
 */
export async function updateFileAccess(
  orgId: string,
  fileId: string,
  access: FileAccess
): Promise<FileRow | null> {
  const [updated] = await db
    .update(files)
    .set({ access })
    .where(and(eq(files.id, fileId), eq(files.orgId, orgId)))
    .returning();

  return updated ?? null;
}

// ==================== File Uploads ====================

/**
 * Create a pending file upload record
 */
export async function createFileUpload(
  data: NewFileUploadRow
): Promise<FileUploadRow> {
  const [upload] = await db.insert(fileUploads).values(data).returning();
  if (!upload) {
    throw new Error("Failed to create file upload record");
  }
  return upload;
}

/**
 * Get a pending file upload by ID
 */
export async function getFileUploadById(
  orgId: string,
  uploadId: string
): Promise<FileUploadRow | null> {
  const [upload] = await db
    .select()
    .from(fileUploads)
    .where(
      and(
        eq(fileUploads.id, uploadId),
        eq(fileUploads.orgId, orgId),
        isNull(fileUploads.confirmedAt)
      )
    )
    .limit(1);

  return upload ?? null;
}

/**
 * Mark file upload as confirmed
 */
export async function confirmFileUpload(
  uploadId: string
): Promise<FileUploadRow | null> {
  const [updated] = await db
    .update(fileUploads)
    .set({ confirmedAt: new Date() })
    .where(eq(fileUploads.id, uploadId))
    .returning();

  return updated ?? null;
}

/**
 * Delete expired unconfirmed file uploads
 */
export async function deleteExpiredUploads(): Promise<number> {
  const deleted = await db
    .delete(fileUploads)
    .where(
      and(
        isNull(fileUploads.confirmedAt),
        lt(fileUploads.expiresAt, new Date())
      )
    )
    .returning();

  return deleted.length;
}

/**
 * Delete a file upload record
 */
export async function deleteFileUpload(uploadId: string): Promise<void> {
  await db.delete(fileUploads).where(eq(fileUploads.id, uploadId));
}
