import { z } from "zod";

/**
 * Job types Enum for consistency across the monorepo
 */
export enum JobType {
  REPORTS_GENERATE = "reports:generate",
  STORAGE_CLEANUP = "storage:cleanup",
  POKEAPI_TEST = "dev:pokeapi-test",
  ANNOUNCEMENT_PROCESS = "announcements:process",
}

/**
 * Validation schemas for each job type's input data
 */
export const JobInputSchemas = {
  [JobType.REPORTS_GENERATE]: z.object({
    templateId: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    data: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  [JobType.STORAGE_CLEANUP]: z.object({
    dryRun: z.boolean().optional(),
    olderThanDays: z.number().optional(),
  }),
  [JobType.POKEAPI_TEST]: z.object({
    pages: z.number().optional(),
    pageSize: z.number().optional(),
    source: z.enum(["pokemon", "ability", "move", "type", "berry"]).optional(),
    failAtPage: z.number().optional(),
  }),
  [JobType.ANNOUNCEMENT_PROCESS]: z.object({
    announcementId: z.string(),
    action: z.enum(["notify", "index", "archive"]).optional(),
  }),
} as const;

export type JobInputType<T extends JobType> = z.infer<(typeof JobInputSchemas)[T]>;
