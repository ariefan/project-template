CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TYPE "public"."announcement_priority" AS ENUM('info', 'warning', 'critical', 'success');--> statement-breakpoint
CREATE TYPE "public"."announcement_scope" AS ENUM('system', 'organization');--> statement-breakpoint
CREATE TYPE "public"."announcement_target_role" AS ENUM('all', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."backup_format" AS ENUM('json', 'pg_dump');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."backup_type" AS ENUM('organization', 'system');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."job_delivery_method" AS ENUM('email', 'download', 'webhook', 'storage', 'none');--> statement-breakpoint
CREATE TYPE "public"."schedule_frequency" AS ENUM('once', 'daily', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."example_post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."file_access" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('image', 'video', 'audio', 'document', 'archive', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('temporary', 'persistent');--> statement-breakpoint
CREATE TYPE "public"."virus_scan_status" AS ENUM('pending', 'scanning', 'clean', 'infected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."legal_document_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."legal_document_type" AS ENUM('terms_of_service', 'privacy_policy', 'cookie_policy', 'eula', 'community_guidelines');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('transactional', 'marketing', 'system', 'security');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'whatsapp', 'telegram', 'push', 'none');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'queued', 'processing', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."payment_event_status" AS ENUM('succeeded', 'pending', 'failed', 'processing');--> statement-breakpoint
CREATE TYPE "public"."payment_event_type" AS ENUM('payment.success', 'payment.failed', 'subscription.created', 'subscription.updated', 'subscription.canceled', 'invoice.created', 'invoice.paid', 'recurring.cycle.succeeded', 'recurring.cycle.failed', 'recurring.cycle.retrying');--> statement-breakpoint
CREATE TYPE "public"."column_alignment" AS ENUM('left', 'center', 'right');--> statement-breakpoint
CREATE TYPE "public"."column_format" AS ENUM('text', 'number', 'currency', 'date', 'datetime', 'boolean', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('csv', 'excel', 'pdf', 'thermal', 'dotmatrix');--> statement-breakpoint
CREATE TYPE "public"."report_orientation" AS ENUM('portrait', 'landscape');--> statement-breakpoint
CREATE TYPE "public"."report_page_size" AS ENUM('a4', 'letter', 'legal', 'a3');--> statement-breakpoint
CREATE TYPE "public"."plan_billing_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."plan_visibility" AS ENUM('public', 'private', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'fixed', 'trial_extension');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'exhausted');--> statement-breakpoint
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
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikeys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sso_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"oidc_config" text,
	"saml_config" text,
	"user_id" text,
	"provider_id" text NOT NULL,
	"organization_id" text,
	"domain" text NOT NULL,
	"domain_verified" boolean,
	CONSTRAINT "sso_providers_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"is_anonymous" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"phone_number" text,
	"phone_number_verified" boolean,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"theme" text DEFAULT 'system',
	"locale" text DEFAULT 'en',
	"timezone" text DEFAULT 'UTC',
	"appearance" text DEFAULT '{}',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit"."authorization_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"user_id" text,
	"org_id" text NOT NULL,
	"resource" text,
	"action" text,
	"actor_id" text,
	"actor_ip" text,
	"actor_user_agent" text,
	"details" json,
	"previous_hash" varchar(64),
	"record_hash" varchar(64) NOT NULL
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
CREATE TABLE "casbin_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptype" text NOT NULL,
	"v0" text,
	"v1" text,
	"v2" text,
	"v3" text,
	"v4" text,
	"v5" text,
	"v6" text
);
--> statement-breakpoint
CREATE TABLE "example_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"post_id" text NOT NULL,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "example_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"publish_date" timestamp,
	"cover_image_id" text,
	"attachment_file_id" text,
	"status" "example_post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"metadata" jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"kind" "file_kind" NOT NULL,
	"storage_path" text NOT NULL,
	"metadata" jsonb,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"status" "file_status" DEFAULT 'temporary' NOT NULL,
	"virus_scan_status" "virus_scan_status" DEFAULT 'pending',
	"virus_scan_completed_at" timestamp,
	"access" "file_access" DEFAULT 'private',
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text
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
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" text NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"progress" integer,
	"message" text,
	"total_items" integer,
	"processed_items" integer DEFAULT 0,
	"input" jsonb,
	"output" jsonb,
	"metadata" jsonb,
	"error" jsonb,
	"queue_job_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_completion" timestamp
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
CREATE TABLE "notification_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channel" "notification_channel" NOT NULL,
	"template_id" text,
	"target_audience" jsonb,
	"template_data" jsonb,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"opened_count" integer DEFAULT 0 NOT NULL,
	"clicked_count" integer DEFAULT 0 NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"telegram_enabled" boolean DEFAULT false NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"marketing_enabled" boolean DEFAULT false NOT NULL,
	"transactional_enabled" boolean DEFAULT true NOT NULL,
	"security_enabled" boolean DEFAULT true NOT NULL,
	"system_enabled" boolean DEFAULT true NOT NULL,
	"preferred_email" text,
	"preferred_phone" text,
	"telegram_chat_id" text,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channel" "notification_channel" NOT NULL,
	"category" "notification_category" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"body_html" text,
	"variables_schema" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"channel" "notification_channel" NOT NULL,
	"category" "notification_category" DEFAULT 'transactional' NOT NULL,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"recipient_telegram_id" text,
	"template_id" text,
	"subject" text,
	"body" text NOT NULL,
	"body_html" text,
	"template_data" jsonb,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"status_message" text,
	"provider" text,
	"provider_message_id" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"read_at" timestamp,
	"deleted_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp,
	"campaign_id" text,
	"batch_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
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
CREATE TABLE "user_active_context" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_application_id" text,
	"active_tenant_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"application_id" text NOT NULL,
	"tenant_id" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response_body" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 7 NOT NULL,
	"next_retry_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_interactions" ADD CONSTRAINT "announcement_interactions_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_interactions" ADD CONSTRAINT "announcement_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikeys" ADD CONSTRAINT "apikeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_comments" ADD CONSTRAINT "example_comments_post_id_example_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."example_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_post_files" ADD CONSTRAINT "example_post_files_post_id_example_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."example_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_post_files" ADD CONSTRAINT "example_post_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_posts" ADD CONSTRAINT "example_posts_cover_image_id_files_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_posts" ADD CONSTRAINT "example_posts_attachment_file_id_files_id_fk" FOREIGN KEY ("attachment_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_active_application_id_applications_id_fk" FOREIGN KEY ("active_application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_active_tenant_id_organizations_id_fk" FOREIGN KEY ("active_tenant_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "applications_slug_uidx" ON "applications" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "applications_name_idx" ON "applications" USING btree ("name");--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikeys_key_idx" ON "apikeys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikeys_userId_idx" ON "apikeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitations_organizationId_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "members_organizationId_idx" ON "members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "members_userId_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactors_secret_idx" ON "two_factors" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactors_userId_idx" ON "two_factors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_timestamp_idx" ON "audit"."authorization_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_event_type_idx" ON "audit"."authorization_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_user_id_idx" ON "audit"."authorization_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_org_id_idx" ON "audit"."authorization_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_actor_id_idx" ON "audit"."authorization_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_org_timestamp_idx" ON "audit"."authorization_logs" USING btree ("org_id","timestamp");--> statement-breakpoint
CREATE INDEX "backups_org_id_idx" ON "backups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "backups_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backups_type_idx" ON "backups" USING btree ("type");--> statement-breakpoint
CREATE INDEX "backups_expires_at_idx" ON "backups" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "casbin_rules_ptype_idx" ON "casbin_rules" USING btree ("ptype");--> statement-breakpoint
CREATE INDEX "casbin_rules_v0_idx" ON "casbin_rules" USING btree ("v0");--> statement-breakpoint
CREATE INDEX "casbin_rules_v1_idx" ON "casbin_rules" USING btree ("v1");--> statement-breakpoint
CREATE INDEX "casbin_rules_v2_idx" ON "casbin_rules" USING btree ("v2");--> statement-breakpoint
CREATE INDEX "casbin_rules_policy_idx" ON "casbin_rules" USING btree ("ptype","v0","v1","v2","v3","v4");--> statement-breakpoint
CREATE INDEX "casbin_rules_grouping_idx" ON "casbin_rules" USING btree ("ptype","v0","v2","v3");--> statement-breakpoint
CREATE INDEX "files_org_id_idx" ON "files" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "files_uploaded_at_idx" ON "files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_virus_scan_status_idx" ON "files" USING btree ("virus_scan_status");--> statement-breakpoint
CREATE INDEX "files_cleanup_idx" ON "files" USING btree ("status","uploaded_at");--> statement-breakpoint
CREATE INDEX "folders_org_id_idx" ON "folders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "jobs_org_id_idx" ON "jobs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_created_by_idx" ON "jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
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
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_channel_idx" ON "notifications" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_campaign_id_idx" ON "notifications" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "notifications_deleted_at_idx" ON "notifications" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_id_uidx" ON "payment_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_subscription_id_idx" ON "payment_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_events_event_type_idx" ON "payment_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_templates_organization_id_idx" ON "report_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_templates_format_idx" ON "report_templates" USING btree ("format");--> statement-breakpoint
CREATE INDEX "report_templates_created_by_idx" ON "report_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "report_templates_is_public_idx" ON "report_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "report_templates_deleted_at_idx" ON "report_templates" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_org_name_uidx" ON "report_templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_app_tenant_name_uidx" ON "roles" USING btree ("application_id","tenant_id","name");--> statement-breakpoint
CREATE INDEX "roles_application_id_idx" ON "roles" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "roles_tenant_id_idx" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "roles_is_system_role_idx" ON "roles" USING btree ("is_system_role");--> statement-breakpoint
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
CREATE INDEX "scheduled_jobs_organization_id_idx" ON "scheduled_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_job_type_idx" ON "scheduled_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_frequency_idx" ON "scheduled_jobs" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_delivery_method_idx" ON "scheduled_jobs" USING btree ("delivery_method");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_is_active_idx" ON "scheduled_jobs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_next_run_at_idx" ON "scheduled_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_deleted_at_idx" ON "scheduled_jobs" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_active_context_app_idx" ON "user_active_context" USING btree ("active_application_id");--> statement-breakpoint
CREATE INDEX "user_active_context_tenant_idx" ON "user_active_context" USING btree ("active_tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_assignments_uidx" ON "user_role_assignments" USING btree ("user_id","role_id","application_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_user_idx" ON "user_role_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_app_idx" ON "user_role_assignments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_tenant_idx" ON "user_role_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_user_app_tenant_idx" ON "user_role_assignments" USING btree ("user_id","application_id","tenant_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_type_idx" ON "webhook_deliveries" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_next_retry_at_idx" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "webhooks_org_id_idx" ON "webhooks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "webhooks_is_active_idx" ON "webhooks" USING btree ("is_active");