CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."report_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_job_type" AS ENUM('manual', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."column_alignment" AS ENUM('left', 'center', 'right');--> statement-breakpoint
CREATE TYPE "public"."column_format" AS ENUM('text', 'number', 'currency', 'date', 'datetime', 'boolean', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('csv', 'excel', 'pdf', 'thermal', 'dotmatrix');--> statement-breakpoint
CREATE TYPE "public"."report_orientation" AS ENUM('portrait', 'landscape');--> statement-breakpoint
CREATE TYPE "public"."report_page_size" AS ENUM('a4', 'letter', 'legal', 'a3');--> statement-breakpoint
CREATE TYPE "public"."plan_billing_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."plan_visibility" AS ENUM('public', 'private', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'fixed', 'trial_extension');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('email', 'download', 'webhook', 'storage');--> statement-breakpoint
CREATE TYPE "public"."schedule_frequency" AS ENUM('once', 'daily', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TABLE "report_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text,
	"scheduled_report_id" text,
	"type" "report_job_type" NOT NULL,
	"status" "report_job_status" DEFAULT 'pending' NOT NULL,
	"format" "report_format" NOT NULL,
	"progress" integer,
	"total_rows" integer,
	"processed_rows" integer,
	"parameters" jsonb,
	"result" jsonb,
	"error" jsonb,
	"queue_job_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_completion" timestamp
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"format" "report_format" NOT NULL,
	"template_engine" text DEFAULT 'eta' NOT NULL,
	"template_content" text NOT NULL,
	"options" jsonb,
	"data_source" jsonb,
	"columns" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"billing_period" "plan_billing_period" NOT NULL,
	"trial_days" integer DEFAULT 0,
	"features" jsonb,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0,
	"visibility" "plan_visibility" DEFAULT 'public',
	"is_active" boolean DEFAULT true,
	"is_popular" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"type" "coupon_type" NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"trial_extension_days" integer,
	"is_active" boolean DEFAULT true,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0,
	"first_time_only" boolean DEFAULT false,
	"plan_ids" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"trial_starts_at" timestamp,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"coupon_id" text,
	"discount_percent" integer,
	"discount_amount_cents" integer,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"provider_subscription_id" text,
	"provider_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
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
	"delivery_method" "delivery_method" NOT NULL,
	"delivery_config" jsonb,
	"parameters" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "system_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_scheduled_report_id_scheduled_reports_id_fk" FOREIGN KEY ("scheduled_report_id") REFERENCES "public"."scheduled_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_jobs_organization_id_idx" ON "report_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_jobs_template_id_idx" ON "report_jobs" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "report_jobs_scheduled_report_id_idx" ON "report_jobs" USING btree ("scheduled_report_id");--> statement-breakpoint
CREATE INDEX "report_jobs_type_idx" ON "report_jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "report_jobs_status_idx" ON "report_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_jobs_format_idx" ON "report_jobs" USING btree ("format");--> statement-breakpoint
CREATE INDEX "report_jobs_created_by_idx" ON "report_jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "report_jobs_created_at_idx" ON "report_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_templates_organization_id_idx" ON "report_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_templates_format_idx" ON "report_templates" USING btree ("format");--> statement-breakpoint
CREATE INDEX "report_templates_created_by_idx" ON "report_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "report_templates_is_public_idx" ON "report_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "report_templates_deleted_at_idx" ON "report_templates" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_org_name_uidx" ON "report_templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_app_slug_period_uidx" ON "plans" USING btree ("application_id","slug","billing_period");--> statement-breakpoint
CREATE INDEX "plans_application_id_idx" ON "plans" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "plans_visibility_idx" ON "plans" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "plans_is_active_idx" ON "plans" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_uidx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_is_active_idx" ON "coupons" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "coupons_expires_at_idx" ON "coupons" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_app_uidx" ON "subscriptions" USING btree ("organization_id","application_id");--> statement-breakpoint
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_application_id_idx" ON "subscriptions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE INDEX "scheduled_reports_organization_id_idx" ON "scheduled_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_reports_template_id_idx" ON "scheduled_reports" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "scheduled_reports_frequency_idx" ON "scheduled_reports" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "scheduled_reports_delivery_method_idx" ON "scheduled_reports" USING btree ("delivery_method");--> statement-breakpoint
CREATE INDEX "scheduled_reports_is_active_idx" ON "scheduled_reports" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scheduled_reports_next_run_at_idx" ON "scheduled_reports" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "scheduled_reports_deleted_at_idx" ON "scheduled_reports" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "notifications_deleted_at_idx" ON "notifications" USING btree ("deleted_at");