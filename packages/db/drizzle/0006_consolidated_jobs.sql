-- Migration: Consolidate job system
-- Add new columns to jobs table for unified job system with pg-boss

-- Add new columns
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "total_items" integer;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "processed_items" integer DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "input" jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "output" jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "error" jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "queue_job_id" text;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS "jobs_org_id_idx" ON "jobs" ("org_id");
CREATE INDEX IF NOT EXISTS "jobs_type_idx" ON "jobs" ("type");
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs" ("status");
CREATE INDEX IF NOT EXISTS "jobs_created_by_idx" ON "jobs" ("created_by");
CREATE INDEX IF NOT EXISTS "jobs_created_at_idx" ON "jobs" ("created_at");
