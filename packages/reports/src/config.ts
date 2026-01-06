/**
 * Configuration for the reporting system
 */

export interface ReportSystemConfig {
  /** pg-boss queue configuration */
  queue?: {
    /** PostgreSQL connection string */
    connectionString: string;
    /** Number of concurrent workers (default: 2) */
    concurrency?: number;
    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;
  };

  /** Storage configuration for generated reports */
  storage?: {
    /** Storage type */
    type: "local" | "s3" | "gcs";
    /** Base path for local storage */
    basePath?: string;
    /** S3 bucket name */
    bucket?: string;
    /** S3 region */
    region?: string;
    /** File retention period in days (default: 7) */
    retentionDays?: number;
  };

  /** Streaming configuration */
  streaming?: {
    /** Batch size for streaming exports (default: 1000) */
    batchSize?: number;
    /** Threshold rows for async export (default: 10000) */
    asyncThreshold?: number;
  };

  /** Default export options */
  defaults?: {
    /** Default CSV delimiter */
    csvDelimiter?: string;
    /** Default PDF page size */
    pdfPageSize?: "a4" | "letter" | "legal" | "a3";
    /** Default PDF orientation */
    pdfOrientation?: "portrait" | "landscape";
    /** Default thermal printer width */
    thermalWidth?: 58 | 80;
  };
}

/**
 * Environment-based configuration builder
 */
export interface ReportEnvConfig {
  /** pg-boss connection string (REPORTS_QUEUE_URL) */
  queueUrl?: string;
  /** Queue concurrency (REPORTS_QUEUE_CONCURRENCY) */
  queueConcurrency?: number;
  /** Storage type (REPORTS_STORAGE_TYPE) */
  storageType?: "local" | "s3" | "gcs";
  /** Local storage path (REPORTS_STORAGE_PATH) */
  storagePath?: string;
  /** S3 bucket (REPORTS_S3_BUCKET) */
  s3Bucket?: string;
  /** S3 region (REPORTS_S3_REGION) */
  s3Region?: string;
  /** Streaming batch size (REPORTS_BATCH_SIZE) */
  batchSize?: number;
  /** Async threshold (REPORTS_ASYNC_THRESHOLD) */
  asyncThreshold?: number;
}

/**
 * Build service configuration from environment variables
 */
export function buildServiceConfig(env: ReportEnvConfig): ReportSystemConfig {
  const config: ReportSystemConfig = {};

  if (env.queueUrl) {
    config.queue = {
      connectionString: env.queueUrl,
      concurrency: env.queueConcurrency ?? 2,
      maxRetries: 3,
    };
  }

  if (env.storageType) {
    config.storage = {
      type: env.storageType,
      basePath: env.storagePath,
      bucket: env.s3Bucket,
      region: env.s3Region,
      retentionDays: 7,
    };
  }

  if (env.batchSize || env.asyncThreshold) {
    config.streaming = {
      batchSize: env.batchSize ?? 1000,
      asyncThreshold: env.asyncThreshold ?? 10_000,
    };
  }

  return config;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<
  Pick<ReportSystemConfig, "streaming" | "defaults">
> = {
  streaming: {
    batchSize: 1000,
    asyncThreshold: 10_000,
  },
  defaults: {
    csvDelimiter: ",",
    pdfPageSize: "a4",
    pdfOrientation: "portrait",
    thermalWidth: 80,
  },
};
