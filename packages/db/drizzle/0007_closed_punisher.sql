CREATE TYPE "public"."announcement_priority" AS ENUM('info', 'warning', 'critical', 'success');--> statement-breakpoint
CREATE TYPE "public"."announcement_scope" AS ENUM('system', 'organization');--> statement-breakpoint
CREATE TYPE "public"."announcement_target_role" AS ENUM('all', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."backup_format" AS ENUM('json', 'pg_dump');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."backup_type" AS ENUM('organization', 'system');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('image', 'video', 'audio', 'document', 'archive', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('temporary', 'persistent');--> statement-breakpoint
CREATE TYPE "public"."legal_document_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."legal_document_type" AS ENUM('terms_of_service', 'privacy_policy', 'cookie_policy', 'eula', 'community_guidelines');--> statement-breakpoint
CREATE TYPE "public"."payment_event_status" AS ENUM('succeeded', 'pending', 'failed', 'processing');--> statement-breakpoint
CREATE TYPE "public"."payment_event_type" AS ENUM('payment.success', 'payment.failed', 'subscription.created', 'subscription.updated', 'subscription.canceled', 'invoice.created', 'invoice.paid', 'recurring.cycle.succeeded', 'recurring.cycle.failed', 'recurring.cycle.retrying');--> statement-breakpoint
CREATE TYPE "public"."job_delivery_method" AS ENUM('email', 'download', 'webhook', 'storage', 'none');--> statement-breakpoint
CREATE TABLE "announcement_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"announcement_id" text NOT NULL,
	"user_id" text NOT NULL,
	"viewed_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"priority" "announcement_priority" DEFAULT 'info' NOT NULL,
	"scope" "announcement_scope" DEFAULT 'organization' NOT NULL,
	"target_roles" text[] DEFAULT '{}' NOT NULL,
	"is_dismissible" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"acknowledge_count" integer DEFAULT 0 NOT NULL,
	"dismiss_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"type" "backup_type" NOT NULL,
	"format" "backup_format" NOT NULL,
	"status" "backup_status" DEFAULT 'pending' NOT NULL,
	"file_path" text,
	"file_size" bigint,
	"checksum" text,
	"included_tables" jsonb,
	"metadata" jsonb,
	"expires_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "example_post_files" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"file_id" text NOT NULL,
	"field" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "legal_document_acceptances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version_id" text NOT NULL,
	"document_id" text NOT NULL,
	"document_type" "legal_document_type" NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "legal_document_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version_id" text,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text,
	"changes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"changelog" text,
	"status" "legal_document_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"requires_re_acceptance" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "legal_document_type" NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" "legal_document_status" DEFAULT 'draft' NOT NULL,
	"active_version_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text,
	"event_type" "payment_event_type" NOT NULL,
	"status" "payment_event_status" NOT NULL,
	"amount" integer,
	"currency" text DEFAULT 'IDR',
	"provider_cycle_id" text,
	"provider_invoice_id" text,
	"raw_payload" jsonb,
	"error_code" text,
	"error_message" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_type" text NOT NULL,
	"job_config" jsonb,
	"name" text NOT NULL,
	"description" text,
	"frequency" "schedule_frequency" NOT NULL,
	"cron_expression" text,
	"day_of_week" "day_of_week",
	"day_of_month" integer,
	"hour" integer,
	"minute" integer,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"delivery_method" "job_delivery_method" DEFAULT 'none' NOT NULL,
	"delivery_config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_job_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "report_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scheduled_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "report_jobs" CASCADE;--> statement-breakpoint
DROP TABLE "scheduled_reports" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "appearance" text DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "publish_date" timestamp;--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "cover_image_id" text;--> statement-breakpoint
ALTER TABLE "example_posts" ADD COLUMN "attachment_file_id" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "kind" "file_kind" NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "status" "file_status" DEFAULT 'temporary' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "total_items" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "processed_items" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "input" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "output" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "error" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "queue_job_id" text;--> statement-breakpoint
ALTER TABLE "announcement_interactions" ADD CONSTRAINT "announcement_interactions_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_interactions" ADD CONSTRAINT "announcement_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_post_files" ADD CONSTRAINT "example_post_files_post_id_example_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."example_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_post_files" ADD CONSTRAINT "example_post_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_acceptances" ADD CONSTRAINT "legal_document_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_acceptances" ADD CONSTRAINT "legal_document_acceptances_version_id_legal_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_acceptances" ADD CONSTRAINT "legal_document_acceptances_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_audit_logs" ADD CONSTRAINT "legal_document_audit_logs_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_audit_logs" ADD CONSTRAINT "legal_document_audit_logs_version_id_legal_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_audit_logs" ADD CONSTRAINT "legal_document_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_interactions_announcement_id_idx" ON "announcement_interactions" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_interactions_user_id_idx" ON "announcement_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcement_interactions_viewed_at_idx" ON "announcement_interactions" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "announcement_interactions_read_at_idx" ON "announcement_interactions" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "announcement_interactions_dismissed_at_idx" ON "announcement_interactions" USING btree ("dismissed_at");--> statement-breakpoint
CREATE INDEX "announcement_interactions_unique_idx" ON "announcement_interactions" USING btree ("announcement_id","user_id");--> statement-breakpoint
CREATE INDEX "announcements_org_id_idx" ON "announcements" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "announcements_priority_idx" ON "announcements" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "announcements_scope_idx" ON "announcements" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "announcements_publish_at_idx" ON "announcements" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "announcements_expires_at_idx" ON "announcements" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "announcements_is_active_idx" ON "announcements" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "backups_org_id_idx" ON "backups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "backups_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backups_type_idx" ON "backups" USING btree ("type");--> statement-breakpoint
CREATE INDEX "backups_expires_at_idx" ON "backups" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "folders_org_id_idx" ON "folders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_user_id_idx" ON "legal_document_acceptances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_version_id_idx" ON "legal_document_acceptances" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_document_id_idx" ON "legal_document_acceptances" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_document_type_idx" ON "legal_document_acceptances" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "legal_document_acceptances_accepted_at_idx" ON "legal_document_acceptances" USING btree ("accepted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_acceptances_user_version_unique" ON "legal_document_acceptances" USING btree ("user_id","version_id");--> statement-breakpoint
CREATE INDEX "legal_document_audit_logs_document_id_idx" ON "legal_document_audit_logs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "legal_document_audit_logs_actor_id_idx" ON "legal_document_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "legal_document_audit_logs_created_at_idx" ON "legal_document_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "legal_document_versions_document_id_idx" ON "legal_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "legal_document_versions_status_idx" ON "legal_document_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "legal_document_versions_published_at_idx" ON "legal_document_versions" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_doc_version_unique" ON "legal_document_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "legal_documents_type_idx" ON "legal_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "legal_documents_type_locale_idx" ON "legal_documents" USING btree ("type","locale");--> statement-breakpoint
CREATE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "legal_documents_status_idx" ON "legal_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_locale_unique" ON "legal_documents" USING btree ("type","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_id_uidx" ON "payment_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_subscription_id_idx" ON "payment_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_events_event_type_idx" ON "payment_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_organization_id_idx" ON "scheduled_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_job_type_idx" ON "scheduled_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_frequency_idx" ON "scheduled_jobs" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_delivery_method_idx" ON "scheduled_jobs" USING btree ("delivery_method");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_is_active_idx" ON "scheduled_jobs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_next_run_at_idx" ON "scheduled_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_deleted_at_idx" ON "scheduled_jobs" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "example_posts" ADD CONSTRAINT "example_posts_cover_image_id_files_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_posts" ADD CONSTRAINT "example_posts_attachment_file_id_files_id_fk" FOREIGN KEY ("attachment_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_org_id_idx" ON "files" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "files_uploaded_at_idx" ON "files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_virus_scan_status_idx" ON "files" USING btree ("virus_scan_status");--> statement-breakpoint
CREATE INDEX "files_cleanup_idx" ON "files" USING btree ("status","uploaded_at");--> statement-breakpoint
CREATE INDEX "jobs_org_id_idx" ON "jobs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_created_by_idx" ON "jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "result";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "error_code";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "error_message";--> statement-breakpoint
DROP TYPE "public"."delivery_status";--> statement-breakpoint
DROP TYPE "public"."report_job_status";--> statement-breakpoint
DROP TYPE "public"."report_job_type";--> statement-breakpoint
DROP TYPE "public"."delivery_method";