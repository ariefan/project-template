/**
 * Presigned URL response for uploads
 */
export interface PresignedUploadUrl {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: Date;
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  type: "local" | "s3";

  // Local provider options
  localPath?: string;

  // S3/R2 provider options
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
}

/**
 * File info for directory listings
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
  contentType?: string;
}

/**
 * Storage provider type
 * Abstracts file storage operations for different backends
 */
export interface StorageProvider {
  /** Provider name for logging */
  readonly name: string;

  /**
   * Generate a presigned URL for uploading a file
   * @param path - Storage path (e.g., "orgs/org_123/files/file_abc.pdf")
   * @param contentType - Expected MIME type
   * @param expiresIn - Expiration time in seconds (default: 1800 = 30 min)
   */
  getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresIn?: number
  ): Promise<PresignedUploadUrl>;

  /**
   * Generate a presigned URL for downloading a file
   * @param path - Storage path
   * @param expiresIn - Expiration time in seconds (default: 300 = 5 min)
   */
  getPresignedDownloadUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Upload a file directly (for small files or server-side uploads)
   * @param path - Storage path
   * @param data - File data as Buffer
   * @param contentType - MIME type
   */
  upload(path: string, data: Buffer, contentType: string): Promise<void>;

  /**
   * Download a file directly
   * @param path - Storage path
   * @returns File data as Buffer
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file
   * @param path - Storage path
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   * @param path - Storage path
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file metadata (size, content type, last modified)
   * @param path - Storage path
   */
  getMetadata(path: string): Promise<FileMetadata | null>;

  /**
   * List files in a directory
   * @param path - Directory path
   * @param recursive - If true, list all files recursively
   */
  listFiles(path: string, recursive?: boolean): Promise<FileInfo[]>;

  /**
   * Create a folder
   * @param path - Folder path
   */
  createFolder(path: string): Promise<void>;

  /**
   * Move or rename a file or folder
   * @param from - Source path
   * @param to - Destination path
   */
  moveFile(from: string, to: string): Promise<void>;

  /**
   * Copy a file or folder
   * @param from - Source path
   * @param to - Destination path
   */
  copyFile(from: string, to: string): Promise<void>;

  /**
   * Delete a folder and all its contents
   * @param path - Folder path
   */
  deleteFolder(path: string): Promise<void>;
}

/**
 * File metadata
 */
export interface FileMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
}
