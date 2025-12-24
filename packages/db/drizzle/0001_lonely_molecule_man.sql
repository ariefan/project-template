CREATE SCHEMA "audit";
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
CREATE INDEX "audit_authz_logs_timestamp_idx" ON "audit"."authorization_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_event_type_idx" ON "audit"."authorization_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_user_id_idx" ON "audit"."authorization_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_org_id_idx" ON "audit"."authorization_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_actor_id_idx" ON "audit"."authorization_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_authz_logs_org_timestamp_idx" ON "audit"."authorization_logs" USING btree ("org_id","timestamp");
--> statement-breakpoint
-- Function to compute hash for audit records
CREATE OR REPLACE FUNCTION audit.compute_authorization_log_hash()
RETURNS TRIGGER AS $$
DECLARE
  previous_record_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get the hash of the most recent record (by id, not timestamp, for consistency)
  SELECT record_hash INTO previous_record_hash
  FROM audit.authorization_logs
  ORDER BY id DESC
  LIMIT 1;

  -- Set the previous_hash field
  NEW.previous_hash := previous_record_hash;

  -- Compute hash input from all relevant fields
  hash_input := CONCAT(
    COALESCE(NEW.timestamp::TEXT, ''),
    '|', COALESCE(NEW.event_type, ''),
    '|', COALESCE(NEW.user_id, ''),
    '|', COALESCE(NEW.org_id, ''),
    '|', COALESCE(NEW.resource, ''),
    '|', COALESCE(NEW.action, ''),
    '|', COALESCE(NEW.actor_id, ''),
    '|', COALESCE(NEW.actor_ip, ''),
    '|', COALESCE(NEW.details::TEXT, ''),
    '|', COALESCE(NEW.previous_hash, '')
  );

  -- Compute SHA-256 hash
  NEW.record_hash := encode(digest(hash_input, 'sha256'), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Trigger to automatically compute hash on insert
CREATE TRIGGER compute_authorization_log_hash_trigger
BEFORE INSERT ON audit.authorization_logs
FOR EACH ROW
EXECUTE FUNCTION audit.compute_authorization_log_hash();
--> statement-breakpoint
-- Function to prevent updates and deletes (append-only enforcement)
CREATE OR REPLACE FUNCTION audit.prevent_authorization_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Authorization audit logs are append-only and cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Triggers to enforce append-only
CREATE TRIGGER prevent_authorization_log_update
BEFORE UPDATE ON audit.authorization_logs
FOR EACH ROW
EXECUTE FUNCTION audit.prevent_authorization_log_modification();
--> statement-breakpoint
CREATE TRIGGER prevent_authorization_log_delete
BEFORE DELETE ON audit.authorization_logs
FOR EACH ROW
EXECUTE FUNCTION audit.prevent_authorization_log_modification();