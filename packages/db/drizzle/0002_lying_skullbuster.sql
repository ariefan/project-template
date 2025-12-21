CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('transactional', 'marketing', 'system', 'security');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'whatsapp', 'telegram', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'queued', 'processing', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
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
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_channel_idx" ON "notifications" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_campaign_id_idx" ON "notifications" USING btree ("campaign_id");