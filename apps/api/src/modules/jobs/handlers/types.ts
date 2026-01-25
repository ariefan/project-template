import type { JobType } from "@workspace/contracts/jobs";
import type { JobError, JobMetadata } from "@workspace/db/schema";
import type { z } from "zod";

/**
 * Helper functions available to job handlers
 */
export interface JobHelpers {
  /** Update job progress (0-100) with optional message */
  updateProgress: (progress: number, message?: string) => Promise<void>;
  /** Update processed items count */
  updateProcessedItems: (processed: number, total?: number) => Promise<void>;
  /** Log a message without changing progress */
  log: (message: string) => Promise<void>;
}

/**
 * Context passed to job handlers
 */
export interface JobContext {
  /** Job ID */
  jobId: string;
  /** Organization ID */
  orgId: string;
  /** Job type */
  type: string;
  /** Job input parameters */
  input: Record<string, unknown>;
  /** Job metadata (references, etc.) */
  metadata: JobMetadata;
  /** Helper functions */
  helpers: JobHelpers;
}

/**
 * Result returned by job handlers
 */
export interface JobResult {
  /** Output data on success */
  output?: Record<string, unknown>;
  /** Error details on failure */
  error?: JobError;
}

/**
 * Job handler function type
 */
export type JobHandler = (context: JobContext) => Promise<JobResult>;

/**
 * Configuration for registering a job handler
 */
export interface JobHandlerConfig {
  /** Job type this handler processes */
  type: JobType | string;
  /** Handler function */
  handler: JobHandler;
  /** Zod schema for input validation */
  validationSchema?: z.ZodSchema;
  /** Number of concurrent jobs to process (default: 3) */
  concurrency?: number;
  /** Max retry attempts on failure (default: 3) */
  retryLimit?: number;
  /** Job expiration in seconds (default: 3600) */
  expireInSeconds?: number;

  // UI metadata for dynamic job type discovery
  /** Human-readable label for the job type */
  label?: string;
  /** Description of what this job does */
  description?: string;
  /** Schema description for the config/input object */
  configSchema?: string;
  /** Example configuration for the frontend */
  exampleConfig?: Record<string, unknown>;
}
