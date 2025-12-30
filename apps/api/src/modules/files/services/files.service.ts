import type { FileAccess, FileRow, FileUploadRow } from "@workspace/db/schema";
import type { StorageProvider } from "@workspace/storage";
import * as filesRepository from "../repositories/files.repository";
import {
  generateStoragePath,
  sanitizeFilename,
} from "../utils/filename-sanitizer";
import { validateFileSize, validateMimeType } from "../utils/mime-validator";

// Storage provider instance (set by initFilesService)
let storageProvider: StorageProvider | null = null;

/**
 * Initialize files service with storage provider
 */
export function initFilesService(provider: StorageProvider): void {
  storageProvider = provider;
}

/**
 * Get storage provider (throws if not initialized)
 */
function getStorage(): StorageProvider {
  if (!storageProvider) {
    throw new Error(
      "Files service not initialized. Call initFilesService first."
    );
  }
  return storageProvider;
}

/**
 * Generate a file ID
 */
function generateFileId(): string {
  return `file_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * Generate an upload ID
 */
function generateUploadId(): string {
  return `upload_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export interface InitiateUploadInput {
  orgId: string;
  filename: string;
  contentType: string;
  size: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface InitiateUploadResult {
  uploadId: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: Date;
}

/**
 * Initiate a presigned upload
 */
export async function initiateUpload(
  input: InitiateUploadInput
): Promise<InitiateUploadResult> {
  const storage = getStorage();

  // Validate MIME type
  const mimeValidation = validateMimeType(input.contentType, input.filename);
  if (!mimeValidation.valid) {
    throw new Error(mimeValidation.error);
  }

  // Validate file size
  const sizeValidation = validateFileSize(input.contentType, input.size);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }

  // Generate IDs and storage path
  const uploadId = generateUploadId();
  const fileId = generateFileId();
  const sanitizedFilename = sanitizeFilename(input.filename);
  const storagePath = generateStoragePath(
    input.orgId,
    fileId,
    sanitizedFilename
  );

  // Get presigned upload URL (30 minutes expiry)
  const presigned = await storage.getPresignedUploadUrl(
    storagePath,
    input.contentType,
    1800
  );

  // Create pending upload record
  await filesRepository.createFileUpload({
    id: uploadId,
    orgId: input.orgId,
    filename: sanitizedFilename,
    contentType: input.contentType,
    size: input.size,
    storagePath,
    metadata: input.metadata,
    createdBy: input.createdBy,
    expiresAt: presigned.expiresAt,
  });

  return {
    uploadId,
    url: presigned.url,
    method: presigned.method,
    headers: presigned.headers,
    expiresAt: presigned.expiresAt,
  };
}

export interface ConfirmUploadResult {
  success: boolean;
  file?: FileRow;
  error?: string;
}

/**
 * Confirm an upload and create file record
 */
export async function confirmUpload(
  orgId: string,
  uploadId: string
): Promise<ConfirmUploadResult> {
  const storage = getStorage();

  // Get pending upload
  const upload = await filesRepository.getFileUploadById(orgId, uploadId);
  if (!upload) {
    return { success: false, error: "Upload not found or already confirmed" };
  }

  // Check if upload has expired
  if (upload.expiresAt < new Date()) {
    await filesRepository.deleteFileUpload(uploadId);
    return { success: false, error: "Upload has expired" };
  }

  // Verify file exists in storage
  const exists = await storage.exists(upload.storagePath);
  if (!exists) {
    return { success: false, error: "File not uploaded to storage" };
  }

  // Get actual file metadata from storage
  const metadata = await storage.getMetadata(upload.storagePath);
  if (!metadata) {
    return { success: false, error: "Could not retrieve file metadata" };
  }

  // Verify file size matches (with 5% tolerance for encoding differences)
  const sizeDifference = Math.abs(metadata.size - upload.size);
  const tolerance = upload.size * 0.05;
  if (sizeDifference > tolerance && sizeDifference > 1024) {
    return {
      success: false,
      error: `File size mismatch. Expected ~${upload.size} bytes, got ${metadata.size} bytes`,
    };
  }

  // Create file record with stubbed virus scan (auto-clean)
  const fileId = `file_${upload.storagePath.split("/").pop()?.split(".")[0]}`;
  const file = await filesRepository.createFile({
    id: fileId,
    orgId: upload.orgId,
    filename: upload.filename,
    size: metadata.size,
    mimeType: upload.contentType,
    storagePath: upload.storagePath,
    metadata: upload.metadata,
    uploadedBy: upload.createdBy,
    // Stubbed virus scan - auto-mark as clean
    virusScanStatus: "clean",
    virusScanCompletedAt: new Date(),
  });

  // Mark upload as confirmed
  await filesRepository.confirmFileUpload(uploadId);

  return { success: true, file };
}

export interface DirectUploadInput {
  orgId: string;
  filename: string;
  contentType: string;
  data: Buffer;
  metadata?: Record<string, unknown>;
  uploadedBy: string;
}

/**
 * Direct upload for small files (< 10MB)
 */
export async function directUpload(input: DirectUploadInput): Promise<FileRow> {
  const storage = getStorage();
  const size = input.data.length;

  // Validate MIME type
  const mimeValidation = validateMimeType(input.contentType, input.filename);
  if (!mimeValidation.valid) {
    throw new Error(mimeValidation.error);
  }

  // Validate file size
  const sizeValidation = validateFileSize(input.contentType, size);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }

  // Limit direct upload to 10MB
  const maxDirectUpload = 10 * 1024 * 1024;
  if (size > maxDirectUpload) {
    throw new Error(
      `Direct upload limited to ${maxDirectUpload / (1024 * 1024)}MB. Use presigned upload for larger files.`
    );
  }

  // Generate IDs and storage path
  const fileId = generateFileId();
  const sanitizedFilename = sanitizeFilename(input.filename);
  const storagePath = generateStoragePath(
    input.orgId,
    fileId,
    sanitizedFilename
  );

  // Upload to storage
  await storage.upload(storagePath, input.data, input.contentType);

  // Create file record with stubbed virus scan (auto-clean)
  const file = await filesRepository.createFile({
    id: fileId,
    orgId: input.orgId,
    filename: sanitizedFilename,
    size,
    mimeType: input.contentType,
    storagePath,
    metadata: input.metadata,
    uploadedBy: input.uploadedBy,
    // Stubbed virus scan - auto-mark as clean
    virusScanStatus: "clean",
    virusScanCompletedAt: new Date(),
  });

  return file;
}

/**
 * Get file by ID
 */
export function getFile(
  orgId: string,
  fileId: string
): Promise<FileRow | null> {
  return filesRepository.getFileById(orgId, fileId);
}

/**
 * List files with pagination
 */
export function listFiles(
  orgId: string,
  options: filesRepository.ListFilesOptions = {}
): Promise<filesRepository.ListFilesResult> {
  return filesRepository.listFiles(orgId, options);
}

export interface DownloadUrlResult {
  url: string;
  expiresAt: Date;
}

/**
 * Get download URL for a file
 */
export async function getDownloadUrl(
  orgId: string,
  fileId: string
): Promise<DownloadUrlResult | null> {
  const storage = getStorage();

  const file = await filesRepository.getFileById(orgId, fileId);
  if (!file) {
    return null;
  }

  // Get presigned download URL (5 minutes expiry)
  const url = await storage.getPresignedDownloadUrl(file.storagePath, 300);

  return {
    url,
    expiresAt: new Date(Date.now() + 300 * 1000),
  };
}

/**
 * Download file data directly
 */
export async function downloadFile(
  orgId: string,
  fileId: string
): Promise<{ data: Buffer; file: FileRow } | null> {
  const storage = getStorage();

  const file = await filesRepository.getFileById(orgId, fileId);
  if (!file) {
    return null;
  }

  const data = await storage.download(file.storagePath);
  return { data, file };
}

export interface SoftDeleteResult {
  success: boolean;
  file?: FileRow;
  error?: string;
}

/**
 * Soft delete a file
 */
export async function softDeleteFile(
  orgId: string,
  fileId: string,
  deletedBy: string
): Promise<SoftDeleteResult> {
  const file = await filesRepository.softDeleteFile(orgId, fileId, deletedBy);

  if (!file) {
    return { success: false, error: "File not found" };
  }

  return { success: true, file };
}

export interface HardDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently delete a file (removes from storage)
 */
export async function hardDeleteFile(
  orgId: string,
  fileId: string
): Promise<HardDeleteResult> {
  const storage = getStorage();

  // Get file first to get storage path
  const file = await filesRepository.getFileById(orgId, fileId, true);
  if (!file) {
    return { success: false, error: "File not found" };
  }

  // Delete from storage
  try {
    await storage.delete(file.storagePath);
  } catch {
    // Log but continue - file may already be deleted from storage
  }

  // Delete from database
  await filesRepository.hardDeleteFile(orgId, fileId);

  return { success: true };
}

/**
 * Update file access level
 */
export function updateFileAccess(
  orgId: string,
  fileId: string,
  access: FileAccess
): Promise<FileRow | null> {
  return filesRepository.updateFileAccess(orgId, fileId, access);
}

/**
 * Cleanup expired uploads
 */
export function cleanupExpiredUploads(): Promise<number> {
  return filesRepository.deleteExpiredUploads();
}

/**
 * Get pending upload by ID
 */
export function getUpload(
  orgId: string,
  uploadId: string
): Promise<FileUploadRow | null> {
  return filesRepository.getFileUploadById(orgId, uploadId);
}
