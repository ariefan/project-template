import { createLocalProvider } from "./providers/local";
import { createS3Provider } from "./providers/s3";
import type { StorageConfig, StorageProvider } from "./types";

// Re-export providers
export { createLocalProvider } from "./providers/local";
export { createS3Provider } from "./providers/s3";
// Re-export types
export type {
  FileMetadata,
  PresignedUploadUrl,
  StorageConfig,
  StorageProvider,
} from "./types";

/**
 * Create a storage provider based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.type) {
    case "local": {
      if (!config.localPath) {
        throw new Error("localPath is required for local storage provider");
      }
      return createLocalProvider(config.localPath);
    }

    case "s3": {
      if (
        !(
          config.s3Region &&
          config.s3Bucket &&
          config.s3AccessKeyId &&
          config.s3SecretAccessKey
        )
      ) {
        throw new Error(
          "s3Region, s3Bucket, s3AccessKeyId, and s3SecretAccessKey are required for S3 storage provider"
        );
      }
      return createS3Provider({
        endpoint: config.s3Endpoint,
        region: config.s3Region,
        bucket: config.s3Bucket,
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      });
    }

    default:
      throw new Error(`Unknown storage provider type: ${config.type}`);
  }
}
