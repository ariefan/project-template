import {
  buildStorageConfig,
  createStorageProvider,
  type StorageProvider,
} from "@workspace/storage";

// Re-export FileInfo type for use in routes
export type { FileInfo } from "@workspace/storage";

/**
 * Storage provider instance for the storage module
 * Automatically switches between local and S3 based on STORAGE_PROVIDER env var
 */
export const storageProvider: StorageProvider = createStorageProvider(
  buildStorageConfig()
);
