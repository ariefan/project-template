import { join } from "node:path";
import type { StorageConfig } from "./types";

/**
 * Build storage configuration from environment variables
 *
 * Environment variables:
 * - STORAGE_PROVIDER: "local" | "s3" (default: "local")
 *
 * For local provider:
 * - STORAGE_LOCAL_PATH: Base path for local files (default: "./uploads")
 *
 * For S3 provider:
 * - S3_ENDPOINT: Optional custom endpoint (for R2, MinIO, etc.)
 * - S3_REGION: AWS region (default: "us-east-1")
 * - S3_BUCKET: Bucket name (required)
 * - S3_ACCESS_KEY_ID: Access key (required)
 * - S3_SECRET_ACCESS_KEY: Secret key (required)
 */
export function buildStorageConfig(): StorageConfig {
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    return {
      type: "s3",
      s3Endpoint: process.env.S3_ENDPOINT,
      s3Region: process.env.S3_REGION ?? "us-east-1",
      s3Bucket: process.env.S3_BUCKET,
      s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
      s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
  }

  return {
    type: "local",
    localPath: process.env.STORAGE_LOCAL_PATH ?? join(process.cwd(), "uploads"),
  };
}
