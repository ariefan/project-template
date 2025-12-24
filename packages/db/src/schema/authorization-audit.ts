import {
  index,
  json,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Create a dedicated audit schema for better organization
export const auditSchema = pgSchema("audit");

/**
 * Authorization audit log table with hash chaining for tamper detection
 * This table is append-only and uses a hash chain to detect any modifications
 */
export const authorizationLogs = auditSchema.table(
  "authorization_logs",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Event information
    eventType: varchar("event_type", { length: 50 }).notNull(),
    // Event types: policy.added, policy.removed, permission.denied, permission.granted, role.assigned, role.removed

    // Context
    userId: text("user_id"), // User affected by the action
    orgId: text("org_id").notNull(), // Organization context
    resource: text("resource"), // Resource being accessed/modified
    action: text("action"), // Action being performed

    // Actor information (who performed the action)
    actorId: text("actor_id"), // May differ from userId for admin actions
    actorIp: text("actor_ip"), // IP address of actor
    actorUserAgent: text("actor_user_agent"), // User agent string

    // Additional details (flexible JSONB field)
    details: json("details").$type<Record<string, unknown>>(),

    // Hash chain for tamper detection
    previousHash: varchar("previous_hash", { length: 64 }), // SHA-256 hash of previous record
    recordHash: varchar("record_hash", { length: 64 }).notNull(), // SHA-256 hash of this record
  },
  (table) => [
    // Indexes for common queries
    index("audit_authz_logs_timestamp_idx").on(table.timestamp),
    index("audit_authz_logs_event_type_idx").on(table.eventType),
    index("audit_authz_logs_user_id_idx").on(table.userId),
    index("audit_authz_logs_org_id_idx").on(table.orgId),
    index("audit_authz_logs_actor_id_idx").on(table.actorId),
    // Composite index for organization + time-based queries
    index("audit_authz_logs_org_timestamp_idx").on(
      table.orgId,
      table.timestamp
    ),
  ]
);

export type AuthorizationLog = typeof authorizationLogs.$inferSelect;
export type NewAuthorizationLog = typeof authorizationLogs.$inferInsert;

/**
 * Event types for authorization audit logs
 */
export const AuthorizationAuditEventType = {
  POLICY_ADDED: "policy.added",
  POLICY_REMOVED: "policy.removed",
  PERMISSION_DENIED: "permission.denied",
  PERMISSION_GRANTED: "permission.granted",
  ROLE_ASSIGNED: "role.assigned",
  ROLE_REMOVED: "role.removed",
} as const;

export type AuthorizationAuditEventType =
  (typeof AuthorizationAuditEventType)[keyof typeof AuthorizationAuditEventType];
