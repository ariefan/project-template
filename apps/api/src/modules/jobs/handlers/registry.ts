import type { JobType } from "@workspace/contracts/jobs";
import type { JobHandlerConfig } from "./types";

/**
 * Registry for job handlers
 * Maps job types to their handler configurations
 */
export class JobHandlerRegistry {
  private readonly handlers = new Map<JobType | string, JobHandlerConfig>();

  /**
   * Register a job handler
   */
  register(config: JobHandlerConfig): void {
    if (this.handlers.has(config.type)) {
      throw new Error(
        `Handler for job type "${config.type}" already registered`
      );
    }
    this.handlers.set(config.type, config);
  }

  /**
   * Get handler configuration for a job type
   */
  get(type: JobType | string): JobHandlerConfig | undefined {
    return this.handlers.get(type);
  }

  /**
   * Check if a handler is registered for a job type
   */
  has(type: JobType | string): boolean {
    return this.handlers.has(type);
  }

  /**
   * Get all registered job types
   */
  getTypes(): (JobType | string)[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all handler configurations
   */
  getAll(): JobHandlerConfig[] {
    return Array.from(this.handlers.values());
  }
}

/**
 * Global job handler registry instance
 */
export const jobHandlerRegistry = new JobHandlerRegistry();
