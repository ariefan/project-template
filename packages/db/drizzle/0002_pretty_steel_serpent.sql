CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
DROP INDEX "casbin_rules_v0_v1_v2_v3_idx";--> statement-breakpoint
ALTER TABLE "casbin_rules" ADD COLUMN "v6" text;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_active_application_id_applications_id_fk" FOREIGN KEY ("active_application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_context" ADD CONSTRAINT "user_active_context_active_tenant_id_organizations_id_fk" FOREIGN KEY ("active_tenant_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_slug_uidx" ON "applications" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "applications_name_idx" ON "applications" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_app_tenant_name_uidx" ON "roles" USING btree ("application_id","tenant_id","name");--> statement-breakpoint
CREATE INDEX "roles_application_id_idx" ON "roles" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "roles_tenant_id_idx" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "roles_is_system_role_idx" ON "roles" USING btree ("is_system_role");--> statement-breakpoint
CREATE INDEX "user_active_context_app_idx" ON "user_active_context" USING btree ("active_application_id");--> statement-breakpoint
CREATE INDEX "user_active_context_tenant_idx" ON "user_active_context" USING btree ("active_tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_assignments_uidx" ON "user_role_assignments" USING btree ("user_id","role_id","application_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_user_idx" ON "user_role_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_app_idx" ON "user_role_assignments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_tenant_idx" ON "user_role_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_user_app_tenant_idx" ON "user_role_assignments" USING btree ("user_id","application_id","tenant_id");--> statement-breakpoint
CREATE INDEX "casbin_rules_v2_idx" ON "casbin_rules" USING btree ("v2");--> statement-breakpoint
CREATE INDEX "casbin_rules_policy_idx" ON "casbin_rules" USING btree ("ptype","v0","v1","v2","v3","v4");--> statement-breakpoint
CREATE INDEX "casbin_rules_grouping_idx" ON "casbin_rules" USING btree ("ptype","v0","v2","v3");